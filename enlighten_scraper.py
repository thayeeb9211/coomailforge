"""
Enlighten Admin Scraper
=======================
Step 1: Selenium opens a real Chrome window — user completes MFA/SSO login.
Step 2: Session cookies are saved to disk.
Step 3: httpx reuses those cookies to fetch Enlighten admin pages.
Step 4: BeautifulSoup parses the HTML to extract site data.
"""
import base64
import concurrent.futures
import csv
import io
import json
import os
import re
import time
import threading

import httpx
from bs4 import BeautifulSoup

ENLIGHTEN_BASE = "https://enlighten.enphaseenergy.com"
SESSION_FILE = os.path.join(os.path.dirname(__file__), "enlighten_session.json")

_driver = None
_login_status = "idle"   # idle | waiting | success | timeout | error:<msg>
_login_lock = threading.Lock()
_last_error = ""   # human-readable detail exposed via /api/enlighten/login-status

_sf_driver = None
_sf_login_status = "idle"
_sf_login_lock = threading.Lock()
_sf_last_error = ""

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


# ── Login flow ────────────────────────────────────────────────────

def get_status():
    return {"status": _login_status, "detail": _last_error}

def get_salesforce_status():
    return {"status": _sf_login_status, "detail": _sf_last_error}


def steal_browser_cookies():
    """
    Read Enlighten cookies directly from the running Chrome/Edge browser
    cookie store — no Selenium, no new browser window, instant.
    Returns a list of cookie dicts (same shape as Selenium get_cookies())
    or None if unavailable.
    """
    try:
        import browser_cookie3
    except ImportError:
        return None

    DOMAIN = ".enphaseenergy.com"
    loaders = []
    try:
        loaders.append(("edge",   browser_cookie3.edge))
    except Exception:
        pass
    try:
        loaders.append(("chrome", browser_cookie3.chrome))
    except Exception:
        pass

    for name, loader in loaders:
        try:
            cj = loader(domain_name=DOMAIN)
            cookies = [
                {
                    "name":   c.name,
                    "value":  c.value,
                    "domain": c.domain,
                    "path":   c.path,
                    "secure": c.secure,
                }
                for c in cj
                if c.value
            ]
            if cookies:
                print(f"[scraper] ✔ Stole {len(cookies)} Enlighten cookies from {name}")
                return cookies
        except Exception as e:
            print(f"[scraper]   Cookie steal ({name}): {e}")

    return None


def auto_detect_session():
    """
    Called on page load. Priority order:
      1. Saved session still valid  → return 'active'
      2. Steal from open browser   → save + validate → return 'stolen'
      3. Nothing worked            → return 'inactive'
    Updates _login_status so the polling endpoint reflects reality.
    """
    global _login_status, _last_error

    # 1. Saved session still valid
    if validate_session():
        _login_status = "success"
        return "active"

    # 2. Try reading cookies from the running browser
    cookies = steal_browser_cookies()
    if cookies:
        _save_session(cookies)
        if validate_session():
            _login_status = "success"
            return "stolen"

    _login_status = "idle"
    return "inactive"


def start_login():
    """
    Try to steal cookies from the open browser first (instant).
    Only launch Selenium if that fails.
    """
    global _login_status, _last_error

    # Fast path — steal from already-running browser
    cookies = steal_browser_cookies()
    if cookies:
        _save_session(cookies)
        if validate_session():
            _login_status = "success"
            _last_error   = ""
            print("[scraper] ✔ Session activated via browser cookie steal — no Selenium needed.")
            return

    # Slow path — open a new Selenium browser window
    with _login_lock:
        if _login_status == "waiting":
            return
        _login_status = "waiting"
        _last_error = ""
    t = threading.Thread(target=_login_worker, daemon=True)
    t.start()


def start_salesforce_login():
    """Launch Selenium for Salesforce login in a background thread."""
    global _sf_login_status, _sf_last_error
    with _sf_login_lock:
        if _sf_login_status == "waiting":
            return
        _sf_login_status = "waiting"
        _sf_last_error = ""
    t = threading.Thread(target=_sf_login_worker, daemon=True)
    t.start()


def _find_local_driver(browser="edge"):
    """Find a locally installed WebDriver without downloading anything.
    Searches PATH, common install locations, and Selenium Manager cache."""
    import glob, shutil
    if browser == "edge":
        names = ["msedgedriver.exe", "msedgedriver"]
        search_roots = [
            os.path.expanduser(r"~\.wdm\drivers\edgedriver"),
            os.path.expanduser(r"~\.cache\selenium\msedgedriver"),
            r"C:\Program Files (x86)\Microsoft\Edge\Application",
            r"C:\Program Files\Microsoft\Edge\Application",
            os.path.expanduser(r"~\AppData\Local\Microsoft\Edge\Application"),
        ]
    else:
        names = ["chromedriver.exe", "chromedriver"]
        search_roots = [
            os.path.expanduser(r"~\.wdm\drivers\chromedriver"),
            os.path.expanduser(r"~\.cache\selenium\chromedriver"),
            r"C:\Program Files\Google\Chrome\Application",
            r"C:\Program Files (x86)\Google\Chrome\Application",
            os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application"),
        ]

    for name in names:
        found = shutil.which(name)
        if found:
            return found

    for root in search_roots:
        if not os.path.isdir(root):
            continue
        for name in names:
            for match in glob.glob(os.path.join(root, "**", name), recursive=True):
                if os.path.isfile(match) and os.path.getsize(match) > 100_000:
                    return match
    return None


def _open_browser():
    """Try Edge then Chrome using locally installed drivers only.
    No internet download needed — works on corporate VPN."""
    from selenium import webdriver

    _SUPPRESS_ARGS = [
        "--disable-background-networking",
        "--disable-component-update",
        "--log-level=3",
        "--silent",
        "--no-sandbox",
        "--disable-dev-shm-usage",
    ]

    # ── Try Microsoft Edge (local driver) ─────────────────────────
    edge_err = ""
    try:
        from selenium.webdriver.edge.service import Service as EdgeService
        opts = webdriver.EdgeOptions()
        opts.add_argument("--start-maximized")
        opts.add_experimental_option("excludeSwitches", ["enable-automation"])
        for a in _SUPPRESS_ARGS:
            opts.add_argument(a)
        driver_path = _find_local_driver("edge")
        service = EdgeService(driver_path) if driver_path else None
        driver = webdriver.Edge(service=service, options=opts) if service else webdriver.Edge(options=opts)
        return driver, "edge"
    except Exception as exc:
        edge_err = str(exc)

    # ── Fall back to Chrome (local driver) ────────────────────────
    chrome_err = ""
    try:
        from selenium.webdriver.chrome.service import Service as ChromeService
        opts = webdriver.ChromeOptions()
        opts.add_argument("--start-maximized")
        opts.add_experimental_option("excludeSwitches", ["enable-automation"])
        for a in _SUPPRESS_ARGS:
            opts.add_argument(a)
        driver_path = _find_local_driver("chrome")
        service = ChromeService(driver_path) if driver_path else None
        driver = webdriver.Chrome(service=service, options=opts) if service else webdriver.Chrome(options=opts)
        return driver, "chrome"
    except Exception as exc:
        chrome_err = str(exc)

    raise RuntimeError(
        f"Edge failed: {edge_err} | Chrome failed: {chrome_err}. "
        "Make sure Edge or Chrome is installed and you are on the Enphase VPN."
    )


def _login_worker():
    global _driver, _login_status, _last_error
    try:
        _driver, browser = _open_browser()
        _driver.get(f"{ENLIGHTEN_BASE}/login")

        deadline = time.time() + 300   # 5-minute window for user to log in
        while time.time() < deadline:
            time.sleep(2)
            try:
                url = _driver.current_url
            except Exception:
                break
            # Once past all login/auth pages the dashboard URL won't contain these
            if not any(x in url for x in ["login", "signin", "auth", "oauth", "accounts"]):
                cookies = _driver.get_cookies()
                _save_session(cookies)
                _login_status = "success"
                try:
                    _driver.quit()
                except Exception:
                    pass
                _driver = None
                return

        _login_status = "timeout"
        _last_error = "5-minute window expired without a successful login."

    except Exception as exc:
        _login_status = "error"
        _last_error = str(exc)
    finally:
        if _driver:
            try:
                _driver.quit()
            except Exception:
                pass
            _driver = None


def _sf_login_worker():
    global _sf_driver, _sf_login_status, _sf_last_error
    try:
        _sf_driver, browser = _open_browser()
        _sf_driver.get("https://enphase.lightning.force.com/")

        deadline = time.time() + 300   # 5-minute window for user to log in
        while time.time() < deadline:
            time.sleep(2)
            try:
                url = _sf_driver.current_url
            except Exception:
                break
            # Once past all login/auth pages the dashboard URL won't contain these
            if not any(x in url for x in ["login", "signin", "auth", "oauth", "accounts"]):
                cookies = _sf_driver.get_cookies()
                _save_salesforce_session(cookies)
                _sf_login_status = "success"
                try:
                    _sf_driver.quit()
                except Exception:
                    pass
                _sf_driver = None
                return

        _sf_login_status = "timeout"
        _sf_last_error = "5-minute window expired without a successful login."

    except Exception as exc:
        _sf_login_status = "error"
        _sf_last_error = str(exc)
    finally:
        if _sf_driver:
            try:
                _sf_driver.quit()
            except Exception:
                pass
            _sf_driver = None


# ── Session helpers ───────────────────────────────────────────────

def _save_session(cookies):
    with open(SESSION_FILE, "w") as f:
        json.dump(cookies, f, indent=2)


def _load_session():
    if not os.path.exists(SESSION_FILE):
        return None
    try:
        with open(SESSION_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return None


def _as_dict(cookies):
    return {c["name"]: c["value"] for c in cookies}


def has_session():
    return os.path.exists(SESSION_FILE)


def validate_session():
    """Lightweight check — does the saved session still work?"""
    cookies = _load_session()
    if not cookies:
        return False
    try:
        r = httpx.get(
            f"{ENLIGHTEN_BASE}/",
            cookies=_as_dict(cookies),
            headers=_HEADERS,
            follow_redirects=False,
            timeout=8,
        )
        location = r.headers.get("location", "")
        # Valid if 200, or redirect NOT pointing to login
        return r.status_code == 200 or (r.status_code < 400 and "login" not in location)
    except Exception:
        return False


def clear_session():
    if os.path.exists(SESSION_FILE):
        os.remove(SESSION_FILE)


# ── Data fetching ─────────────────────────────────────────────────

def fetch_site(site_id):
    """
    Fetch site details via Enlighten's AJAX sub-endpoints — parallelised.

    Stage 1 (sequential): main admin page — session check + CSRF token.
    Stage 2 (parallel):   address_details, access_details, access page,
                          standing_alarms — all at once.
    Stage 3 (parallel):   installer + maintainer company pages — if IDs found.

    A shared httpx.Client reuses the TCP/TLS connection across all requests.
    """
    t0 = time.time()

    cookies = _load_session()
    if not cookies:
        raise ValueError("No saved session. Please log in to Enlighten first.")

    cookie_dict = _as_dict(cookies)
    base = f"{ENLIGHTEN_BASE}/admin/sites/{site_id}"

    # Shared client — one TLS handshake, connection pool reused across threads
    client = httpx.Client(
        cookies=cookie_dict,
        headers=_HEADERS,
        follow_redirects=True,
        timeout=12,
    )

    def _timed_get(label, url, extra_headers=None):
        """GET with per-request timing printed to server console."""
        t = time.time()
        try:
            hdrs = {**_HEADERS, **(extra_headers or {})}
            r = client.get(url, headers=hdrs)
            elapsed = time.time() - t
            print(f"[scraper]   {label:<22} {elapsed:.1f}s  HTTP {r.status_code}")
            return r.text if r.status_code == 200 else ""
        except Exception as exc:
            elapsed = time.time() - t
            print(f"[scraper]   {label:<22} {elapsed:.1f}s  ERROR: {exc}")
            return ""

    try:
        # ── Stage 1: main page (session check + CSRF) ────────────────────────
        print(f"[scraper] ── Site {site_id} ──────────────────────────────")
        t1 = time.time()
        try:
            r_main = client.get(base)
        except httpx.TimeoutException:
            raise ValueError("Request timed out. Check your VPN/connection.")
        print(f"[scraper]   {'main page':<22} {time.time()-t1:.1f}s  HTTP {r_main.status_code}")

        if "login" in str(r_main.url) or r_main.status_code in (401, 403):
            raise ValueError("Session expired. Please log in again.")
        if r_main.status_code == 404:
            raise ValueError(f"Site {site_id} not found or no access.")
        if r_main.status_code != 200:
            raise ValueError(f"HTTP {r_main.status_code} fetching site {site_id}.")

        main_soup = BeautifulSoup(r_main.text, "html.parser")
        csrf_el   = main_soup.find("meta", {"name": "csrf-token"})
        csrf_tok  = csrf_el["content"] if csrf_el else ""
        h1        = main_soup.find("h1")


        ajax_hdrs = {
            "X-Requested-With": "XMLHttpRequest",
            "Accept":           "text/html, */*; q=0.01",
            "Referer":          base,
        }
        if csrf_tok:
            ajax_hdrs["X-CSRF-Token"] = csrf_tok

        data = {
            "site_id":               str(site_id),
            "system_name":           h1.get_text(strip=True) if h1 else f"Site {site_id}",
            "owner_name":            "",
            "owner_email":           "",
            "address":               "",
            "installer_name":        "",
            "installer_phone":       "",
            "installer_email":       "",
            "installer_website":     "",
            "installer_company_id":  "",
            "maintainer_name":       "",
            "maintainer_phone":      "",
            "maintainer_email":      "",
            "maintainer_company_id": "",
            "company_support_phone": "",
            "company_support_email": "",
            "company_website":       "",
            "pv_type":               "",
            "device_types":          "",
            "stage":                 "",
            "system_date":           "",
            "local_time":            "",
            "gateway_status":        "",
            "has_issues":            False,
            "alarm_count":           0,
            "alarms":                [],
        }

        # ── Stage 2: all sub-endpoints in parallel ───────────────────────────
        t2 = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            f_addr   = pool.submit(_timed_get, "address_details",
                                   f"{base}/address_details", ajax_hdrs)
            f_acc_aj = pool.submit(_timed_get, "access_details",
                                   f"{base}/access_details",  ajax_hdrs)
            f_acc_pg = pool.submit(_timed_get, "access page",
                                   f"{ENLIGHTEN_BASE}/admin/sites/{site_id}/access")
            f_alarms = pool.submit(_timed_get, "standing_alarms",
                                   f"{base}/standing_alarms", ajax_hdrs)

            addr_html     = f_addr.result()
            acc_ajax_html = f_acc_aj.result()
            acc_page_html = f_acc_pg.result()
            alarms_text   = f_alarms.result()

        print(f"[scraper]   {'→ Stage 2 total':<22} {time.time()-t2:.1f}s  (parallel)")

        # Parse stage-2 results
        if addr_html:
            data.update({k: v for k, v in _parse_address_details(addr_html).items() if v})
        if acc_ajax_html:
            data.update({k: v for k, v in _parse_access_details(acc_ajax_html).items() if v})
        if acc_page_html:
            for k, v in _parse_access_page(acc_page_html).items():
                if v:
                    data[k] = v
        if alarms_text and alarms_text.strip():
            al = _parse_standing_alarms_csv(alarms_text)
            data["alarms"]      = al.get("alarms", [])
            data["alarm_count"] = al.get("alarm_count", 0)
            if al.get("alarm_count", 0) > 0:
                data["has_issues"] = True

        # ── Stage 3: company pages + owner user page in parallel ─────────────
        inst_cid     = data.get("installer_company_id", "")
        maint_cid    = data.get("maintainer_company_id", "")
        owner_uid    = data.get("owner_user_id", "")

        if inst_cid or maint_cid or owner_uid:
            t3 = time.time()
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
                f_inst  = (pool.submit(_timed_get, "installer company",
                                       f"{ENLIGHTEN_BASE}/admin/companies/{inst_cid}")
                           if inst_cid else None)
                f_maint = (pool.submit(_timed_get, "maintainer company",
                                       f"{ENLIGHTEN_BASE}/admin/companies/{maint_cid}")
                           if maint_cid else None)
                f_user  = (pool.submit(_timed_get, "owner user page",
                                       f"{ENLIGHTEN_BASE}/admin/users/{owner_uid}")
                           if owner_uid else None)

                if f_inst:
                    cp = _parse_company_page(f_inst.result())
                    if cp.get("company_support_phone") and not data["installer_phone"]:
                        data["installer_phone"] = cp["company_support_phone"]
                    if cp.get("company_support_email") and not data["installer_email"]:
                        data["installer_email"] = cp["company_support_email"]
                    if cp.get("company_website") and not data["installer_website"]:
                        data["installer_website"] = cp["company_website"]
                    data["company_support_phone"] = cp.get("company_support_phone", "")
                    data["company_support_email"] = cp.get("company_support_email", "")
                    data["company_website"]       = cp.get("company_website", "")

                if f_maint:
                    cp = _parse_company_page(f_maint.result())
                    if cp.get("company_support_phone") and not data["maintainer_phone"]:
                        data["maintainer_phone"] = cp["company_support_phone"]
                    if cp.get("company_support_email") and not data["maintainer_email"]:
                        data["maintainer_email"] = cp["company_support_email"]
                    if cp.get("company_website") and not data["company_website"]:
                        data["company_website"] = cp["company_website"]
                if f_user:
                    ud = _parse_user_page(f_user.result())
                    if ud.get("owner_email") and not data["owner_email"]:
                        data["owner_email"] = ud["owner_email"]
                    if ud.get("owner_name") and not data["owner_name"]:
                        data["owner_name"] = ud["owner_name"]

            print(f"[scraper]   {'→ Stage 3 total':<22} {time.time()-t3:.1f}s  (parallel)")

    finally:
        client.close()

    total = time.time() - t0
    print(f"[scraper] ── TOTAL: {total:.1f}s ─────────────────────────────")
    return data


def fetch_raw_html(site_id):
    """Return raw HTML of the main admin page (for debugging)."""
    cookies = _load_session()
    if not cookies:
        raise ValueError("No saved session. Please log in to Enlighten first.")
    url = f"{ENLIGHTEN_BASE}/admin/sites/{site_id}"
    r = httpx.get(url, cookies=_as_dict(cookies), headers=_HEADERS,
                  follow_redirects=True, timeout=15)
    if "login" in str(r.url) or r.status_code in (401, 403):
        raise ValueError("Session expired. Please log in again.")
    return r.text


# ── Sub-page parsers (structures confirmed from live debug dumps) ──

def _parse_address_details(html):
    """
    address_details structure:
      <h2 class="title">Location</h2>
      <p>
        <div>1 Le Passage de Bissac</div>
        <div>16320 Gurat</div>
        <div>France</div>
      </p>
      <p><label>PV type:</label> <span>...</span></p>
      <p><label>Device types:</label> <span>...</span></p>
    """
    soup = BeautifulSoup(html, "html.parser")
    out  = {"address": "", "pv_type": "", "device_types": ""}

    h2 = soup.find(lambda t: t.name == "h2" and "location" in t.get_text(strip=True).lower())
    if h2:
        for p in h2.find_all_next("p"):
            divs = p.find_all("div", recursive=False)
            if divs:
                lines = [d.get_text(strip=True) for d in divs if d.get_text(strip=True)]
                skip = ("lat:", "long:", "tz:", "view", "settings", "activation")
                if lines and not any(s in lines[0].lower() for s in skip):
                    out["address"] = "\n".join(lines)
                    break

    for lbl in soup.find_all("label"):
        txt  = lbl.get_text(strip=True).lower().rstrip(":")
        span = lbl.find_next_sibling("span")
        if not span:
            continue
        val = span.get_text(strip=True)
        if "pv type" in txt:
            out["pv_type"] = val
        elif "device type" in txt:
            out["device_types"] = val

    return out


def _parse_access_details(html):
    """
    access_details structure:
      <div><label>Owner</label>:</div>
      <div><span><a href="/admin/users/5593878">KORINE BLONDEL</a></span></div>
      <div><label>PV Installer</label>:</div>
      <div><span>ALLAIRE DU TEMPS</span></div>          -- plain text
      OR
      <div><span><a href="/admin/companies/687852">SARL Ailhaud Michel</a></span></div>  -- with link
    """
    soup = BeautifulSoup(html, "html.parser")
    out  = {
        "owner_name":           "",
        "owner_user_id":        "",
        "installer_name":       "",
        "installer_phone":      "",
        "installer_company_id": "",
        "maintainer_name":      "",
        "maintainer_phone":     "",
    }

    OWNER_KEYS      = {"owner"}
    INSTALLER_KEYS  = {"pv installer", "installer", "installateur",
                       "installationsbetrieb", "empresa instaladora"}
    MAINTAINER_KEYS = {"o&m", "o & m", "maintainer", "maintenance",
                       "mainteneur", "operation & maintenance", "mantenedor"}

    for lbl in soup.find_all("label"):
        key        = lbl.get_text(strip=True).lower().rstrip(":")
        parent_div = lbl.parent
        if not parent_div:
            continue
        val_div = parent_div.find_next_sibling("div")
        if not val_div:
            continue

        # Extract user ID if value links to /admin/users/
        user_a = val_div.find("a", href=lambda h: h and "/admin/users/" in h)
        if user_a and key in OWNER_KEYS:
            href = user_a.get("href", "")
            uid  = href.split("/admin/users/")[-1].split("/")[0].split("?")[0]
            if uid.isdigit():
                out["owner_user_id"] = uid

        # Extract company ID if the value is a link to /admin/companies/
        company_a = val_div.find("a", href=lambda h: h and "/admin/companies/" in h)
        if company_a:
            href = company_a.get("href", "")
            cid  = href.split("/admin/companies/")[-1].split("/")[0].split("?")[0]
            if cid.isdigit() and any(k in key for k in INSTALLER_KEYS):
                out["installer_company_id"] = cid

        val_span = val_div.find("span")
        value = (val_span.get_text(strip=True) if val_span
                 else val_div.get_text(strip=True))
        value = value.split("(")[0].strip()
        if not value or len(value) < 2:
            continue

        if key in OWNER_KEYS:
            out["owner_name"] = value
        elif any(k in key for k in INSTALLER_KEYS):
            out["installer_name"] = value
        elif any(k in key for k in MAINTAINER_KEYS):
            out["maintainer_name"] = value

    return out


def _parse_user_page(html):
    """
    User admin page (/admin/users/{id}) structure:
      <label>Email</label>
      <div>korine.blondel@example.com</div>
      <label>Name</label> / <h1> — full name of the owner
    Extracts owner_email and owner_name.
    """
    soup = BeautifulSoup(html, "html.parser")
    out  = {"owner_email": "", "owner_name": ""}

    for lbl in soup.find_all("label"):
        key    = lbl.get_text(strip=True).lower().rstrip(":")
        parent = lbl.parent
        if not parent:
            continue
        val_div = parent.find("div") or lbl.find_next_sibling("div")
        if not val_div:
            continue
        val = val_div.get_text(strip=True)
        if not val:
            continue
        if key in ("email", "e-mail", "email address"):
            out["owner_email"] = val
        elif key in ("name", "full name", "user name"):
            out["owner_name"]  = val

    # Fallback: grab email from any mailto link
    if not out["owner_email"]:
        mailto = soup.find("a", href=lambda h: h and h.startswith("mailto:"))
        if mailto:
            out["owner_email"] = mailto.get("href", "").replace("mailto:", "").strip()

    return out


def _parse_company_page(html):
    """
    Company admin page structure (confirmed from debug_company_687852.html):
      <p><label>Customer Support Phone</label>
      <div>0650889752</div></p>
      <p><label>Customer Support Email</label>
      <div>vandam@entreprise-ailhaudmichel.fr</div></p>
      <p><label>Website URL</label>
      <a target="_blank" href="http://...">http://...</a></p>
    """
    soup = BeautifulSoup(html, "html.parser")
    out  = {
        "company_support_phone": "",
        "company_support_email": "",
        "company_website":       "",
    }

    for lbl in soup.find_all("label"):
        key = lbl.get_text(strip=True).lower()
        # Value is in the next <div> sibling (phone/email) or <a> (website URL)
        parent = lbl.parent  # usually <p>
        if not parent:
            continue

        # Next sibling <div> for text values
        val_div = parent.find("div")
        # Next sibling or child <a> for URLs
        val_a   = parent.find("a", href=True)

        if "customer support phone" in key:
            if val_div:
                out["company_support_phone"] = val_div.get_text(strip=True)
        elif "customer support email" in key:
            if val_div:
                out["company_support_email"] = val_div.get_text(strip=True)
        elif "website" in key:
            if val_a:
                out["company_website"] = val_a.get("href", "").strip() or val_a.get_text(strip=True)

    return out


# ── Access page parser ────────────────────────────────────────────

def _parse_access_page(html):
    """
    Full access page (/admin/sites/{id}/access) structure:
      <h3>Companies</h3>
      <a href="/admin/companies/687852">SARL Ailhaud Michel</a> (PV Installer) ...

    Extracts installer and maintainer company IDs + names by role text.
    """
    soup = BeautifulSoup(html, "html.parser")
    out  = {
        "installer_name":        "",
        "installer_company_id":  "",
        "maintainer_name":       "",
        "maintainer_company_id": "",
    }

    INST_ROLES  = {"pv installer", "installer"}
    MAINT_ROLES = {"pv system maintainer", "maintainer", "o&m", "operation"}

    for a in soup.find_all("a", href=lambda h: h and "/admin/companies/" in h):
        href = a.get("href", "")
        cid  = href.split("/admin/companies/")[-1].split("/")[0].split("?")[0]
        if not cid.isdigit():
            continue
        name = a.get_text(strip=True)
        # Role is typically in parentheses in the surrounding text
        parent_text = (a.parent or a).get_text(strip=True).lower()

        if any(r in parent_text for r in INST_ROLES) and not out["installer_name"]:
            out["installer_name"]       = name
            out["installer_company_id"] = cid

        if any(r in parent_text for r in MAINT_ROLES) and not out["maintainer_name"]:
            out["maintainer_name"]       = name
            out["maintainer_company_id"] = cid

    return out


# ── Status/date parser (sfdc_details AJAX endpoint) ───────────────

def _parse_sfdc_status(html):
    """
    sfdc_details AJAX response contains Stage, System Date, Local Time,
    and gateway reporting status as text snippets.
    """
    out  = {
        "stage":          "",
        "system_date":    "",
        "local_time":     "",
        "gateway_status": "",
        "has_issues":     False,
    }
    text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)

    m = re.search(r'Stage[:\s]+(\d+\s*[-\u2013]\s*[A-Za-z ]+)', text)
    if m:
        out["stage"] = m.group(1).strip()

    m = re.search(r'System Date[:\s]+([\d/]+)', text)
    if m:
        out["system_date"] = m.group(1).strip()

    m = re.search(r'Local Time[:\s]+([\d:]+\s*[-+]?\d*\s*\([A-Z]+\))', text)
    if m:
        out["local_time"] = m.group(1).strip()

    low = text.lower()
    if "not reporting" in low or "gateway not" in low:
        out["gateway_status"] = "Not Reporting"
        out["has_issues"]     = True
    elif "reporting" in low:
        out["gateway_status"] = "Reporting"

    return out


# ── Alarms parser (standing_alarms CSV endpoint) ─────────────────

def _parse_standing_alarms_csv(text):
    """
    standing_alarms endpoint returns CSV (confirmed format):
      Device Type,Serial Number,Event Type,Started
      Gateway,122334048541,Gateway not reporting,2026/06/29 09:00:01 +0200 (CEST)
    """
    out = {"alarms": [], "alarm_count": 0}
    try:
        reader = csv.DictReader(io.StringIO(text.strip()))
        for row in reader:
            device_type = row.get("Device Type",  "").strip()
            serial      = row.get("Serial Number", "").strip()
            event_type  = row.get("Event Type",   "").strip()
            started     = row.get("Started",       "").strip()
            if event_type:
                out["alarms"].append({
                    "impact":     device_type,
                    "device":     f"{device_type} {serial}".strip(),
                    "event_type": event_type,
                    "started":    started,
                })
    except Exception:
        pass
    out["alarm_count"] = len(out["alarms"])
    return out


# ── Salesforce Case Scraper ─────────────────────────────────────

SALESFORCE_SESSION_FILE = os.path.join(os.path.dirname(__file__), "salesforce_session.json")

def _load_salesforce_session():
    if not os.path.exists(SALESFORCE_SESSION_FILE):
        return None
    try:
        with open(SALESFORCE_SESSION_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return None

def _save_salesforce_session(cookies):
    with open(SALESFORCE_SESSION_FILE, "w") as f:
        json.dump(cookies, f, indent=2)

def has_salesforce_session():
    return os.path.exists(SALESFORCE_SESSION_FILE)

def clear_salesforce_session():
    if os.path.exists(SALESFORCE_SESSION_FILE):
        os.remove(SALESFORCE_SESSION_FILE)

def fetch_salesforce_case(case_number):
    """
    Fetch Salesforce case details using the case number.
    This requires the user to be logged into Salesforce.
    Returns case data including contact name, contact email, and site ID.
    """
    cookies = _load_salesforce_session()
    if not cookies:
        raise ValueError("No saved Salesforce session. Please log in to Salesforce first.")

    cookie_dict = _as_dict(cookies)
    
    # Build the Salesforce search URL
    to_encode = {
        "componentDef": "forceSearch:searchPageDesktop",
        "attributes": {
            "term": case_number,
            "scopeMap": {
                "nameField": "Name",
                "name": "Case",
                "id": "Case",
                "label": "Cases",
                "fields": "CaseNumber"
            }
        },
        "state": {}
    }
    
    encoded_hash = base64.b64encode(json.dumps(to_encode).encode()).decode()
    search_url = f"https://enphase.lightning.force.com/one/one.app#{encoded_hash}"
    
    client = httpx.Client(
        cookies=cookie_dict,
        headers=_HEADERS,
        follow_redirects=True,
        timeout=15,
    )
    
    try:
        # Fetch the case page
        r = client.get(search_url)
        if r.status_code != 200:
            raise ValueError(f"HTTP {r.status_code} fetching Salesforce case")
        
        soup = BeautifulSoup(r.text, "html.parser")
        
        # Extract case details from the page
        data = {
            "case_number": case_number,
            "contact_name": "",
            "contact_email": "",
            "site_id": "",
            "customer_name": "",
        }
        
        # Try to find contact name
        for label in soup.find_all("label"):
            label_text = label.get_text(strip=True).lower()
            if "contact" in label_text and "name" in label_text:
                parent = label.parent
                if parent:
                    val_div = parent.find_next_sibling("div")
                    if val_div:
                        data["contact_name"] = val_div.get_text(strip=True)
                        break
        
        # Try to find contact email
        for label in soup.find_all("label"):
            label_text = label.get_text(strip=True).lower()
            if "contact" in label_text and "email" in label_text:
                parent = label.parent
                if parent:
                    val_div = parent.find_next_sibling("div")
                    if val_div:
                        data["contact_email"] = val_div.get_text(strip=True)
                        break
        
        # Try to find site ID
        for label in soup.find_all("label"):
            label_text = label.get_text(strip=True).lower()
            if "site" in label_text and "id" in label_text:
                parent = label.parent
                if parent:
                    val_div = parent.find_next_sibling("div")
                    if val_div:
                        site_text = val_div.get_text(strip=True)
                        # Extract numeric site ID
                        site_match = re.search(r'\d+', site_text)
                        if site_match:
                            data["site_id"] = site_match.group()
                        break
        
        # Map contact name to customer name
        if data["contact_name"]:
            data["customer_name"] = data["contact_name"]
        
        return data
        
    finally:
        client.close()
