"""
Enlighten Admin Scraper
=======================
Step 1: Selenium opens a real Chrome window — user completes MFA/SSO login.
Step 2: Session cookies are saved to disk.
Step 3: httpx reuses those cookies to fetch Enlighten admin pages.
Step 4: BeautifulSoup parses the HTML to extract site data.
"""
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


def start_login():
    """Launch Selenium in a background thread so Flask doesn't block."""
    global _login_status, _last_error
    with _login_lock:
        if _login_status == "waiting":
            return
        _login_status = "waiting"
        _last_error = ""
    t = threading.Thread(target=_login_worker, daemon=True)
    t.start()


def _open_browser():
    """Try Edge first (common on corporate Windows), then Chrome. Returns driver."""
    from selenium import webdriver

    # Selenium 4.6+ includes Selenium Manager which auto-locates the installed
    # browser driver without any external download — no webdriver-manager needed.

    # ── Try Microsoft Edge ────────────────────────────────────────
    edge_err = ""
    try:
        opts = webdriver.EdgeOptions()
        opts.add_argument("--start-maximized")
        opts.add_experimental_option("excludeSwitches", ["enable-automation"])
        driver = webdriver.Edge(options=opts)
        return driver, "edge"
    except Exception as exc:
        edge_err = str(exc)

    # ── Fall back to Chrome ───────────────────────────────────────
    chrome_err = ""
    try:
        opts = webdriver.ChromeOptions()
        opts.add_argument("--start-maximized")
        opts.add_experimental_option("excludeSwitches", ["enable-automation"])
        driver = webdriver.Chrome(options=opts)
        return driver, "chrome"
    except Exception as exc:
        chrome_err = str(exc)

    raise RuntimeError(
        f"Edge failed: {edge_err} | Chrome failed: {chrome_err}. "
        "Make sure Edge or Chrome is installed. Connect to GlobalProtect VPN if on home network."
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
                          sfdc_details, standing_alarms — all at once.
    Stage 3 (parallel):   installer + maintainer company pages — if IDs found.

    Reduces ~8 sequential round-trips to 3 staged bursts.
    """
    t0 = time.time()

    cookies = _load_session()
    if not cookies:
        raise ValueError("No saved session. Please log in to Enlighten first.")

    cookie_dict = _as_dict(cookies)
    base = f"{ENLIGHTEN_BASE}/admin/sites/{site_id}"

    # ── Stage 1: main page (must be first — session validation + CSRF) ──────
    try:
        r_main = httpx.get(base, cookies=cookie_dict, headers=_HEADERS,
                           follow_redirects=True, timeout=12)
    except httpx.TimeoutException:
        raise ValueError("Request timed out. Check your VPN/connection.")

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

    ajax_headers = {
        **_HEADERS,
        "X-Requested-With": "XMLHttpRequest",
        "Accept":           "text/html, */*; q=0.01",
        "Referer":          base,
    }
    if csrf_tok:
        ajax_headers["X-CSRF-Token"] = csrf_tok

    data = {
        "site_id":               str(site_id),
        "system_name":           h1.get_text(strip=True) if h1 else f"Site {site_id}",
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

    def _ajax_get(endpoint, timeout=8):
        try:
            r = httpx.get(f"{base}/{endpoint}", cookies=cookie_dict,
                          headers=ajax_headers, follow_redirects=True, timeout=timeout)
            return r.text if r.status_code == 200 else ""
        except Exception:
            return ""

    def _page_get(path, timeout=8):
        try:
            r = httpx.get(f"{ENLIGHTEN_BASE}{path}", cookies=cookie_dict,
                          headers=_HEADERS, follow_redirects=True, timeout=timeout)
            return r.text if r.status_code == 200 else ""
        except Exception:
            return ""

    # ── Stage 2: fire all sub-endpoints simultaneously ───────────────────────
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        f_addr   = pool.submit(_ajax_get, "address_details")
        f_acc_aj = pool.submit(_ajax_get, "access_details")
        f_acc_pg = pool.submit(_page_get, f"/admin/sites/{site_id}/access")
        f_sfdc   = pool.submit(_ajax_get, "sfdc_details")
        f_alarms = pool.submit(_ajax_get, "standing_alarms")

        addr_html     = f_addr.result()
        acc_ajax_html = f_acc_aj.result()
        acc_page_html = f_acc_pg.result()
        sfdc_html     = f_sfdc.result()
        alarms_text   = f_alarms.result()

    # Parse stage-2 results
    if addr_html:
        data.update({k: v for k, v in _parse_address_details(addr_html).items() if v})
    if acc_ajax_html:
        data.update({k: v for k, v in _parse_access_details(acc_ajax_html).items() if v})
    if acc_page_html:
        for k, v in _parse_access_page(acc_page_html).items():
            if v:
                data[k] = v
    if sfdc_html:
        data.update({k: v for k, v in _parse_sfdc_status(sfdc_html).items()
                     if v or k == "has_issues"})
    if alarms_text and alarms_text.strip():
        al = _parse_standing_alarms_csv(alarms_text)
        data["alarms"]      = al.get("alarms", [])
        data["alarm_count"] = al.get("alarm_count", 0)
        if al.get("alarm_count", 0) > 0:
            data["has_issues"] = True

    # ── Stage 3: company pages in parallel (only if IDs were discovered) ─────
    inst_cid  = data.get("installer_company_id", "")
    maint_cid = data.get("maintainer_company_id", "")

    if inst_cid or maint_cid:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            f_inst  = pool.submit(_page_get, f"/admin/companies/{inst_cid}")  if inst_cid  else None
            f_maint = pool.submit(_page_get, f"/admin/companies/{maint_cid}") if maint_cid else None

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

    print(f"[scraper] Site {site_id} fetched in {time.time() - t0:.1f}s")
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
      <div><label>PV Installer</label>:</div>
      <div><span>ALLAIRE DU TEMPS</span></div>          -- plain text
      OR
      <div><span><a href="/admin/companies/687852">SARL Ailhaud Michel</a></span></div>  -- with link
    """
    soup = BeautifulSoup(html, "html.parser")
    out  = {
        "installer_name":       "",
        "installer_phone":      "",
        "installer_company_id": "",
        "maintainer_name":      "",
        "maintainer_phone":     "",
    }

    INSTALLER_KEYS  = {"pv installer", "installer", "installateur",
                       "installationsbetrieb", "empresa instaladora"}
    MAINTAINER_KEYS = {"o&m", "o & m", "maintainer", "maintenance",
                       "mainteneur", "operation & maintenance", "mantenedor"}

    for lbl in soup.find_all("label"):
        key        = lbl.get_text(strip=True).lower()
        parent_div = lbl.parent
        if not parent_div:
            continue
        val_div = parent_div.find_next_sibling("div")
        if not val_div:
            continue

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
        if not value or len(value) < 2:
            continue

        if any(k in key for k in INSTALLER_KEYS):
            out["installer_name"] = value
        elif any(k in key for k in MAINTAINER_KEYS):
            out["maintainer_name"] = value

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
