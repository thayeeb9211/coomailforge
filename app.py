import os
import sys
import json
import webbrowser
import subprocess
import threading
import time
from datetime import datetime, timezone
from flask import Flask, request, jsonify, render_template, redirect, url_for
import enphase_client

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

try:
    import enlighten_scraper
    SCRAPER_AVAILABLE = True
except ImportError:
    SCRAPER_AVAILABLE = False

REGIONS = [
    "US / NA",
    "Germany", "Austria", "Switzerland", "Netherlands", "Belgium",
    "France", "Luxembourg", "UK", "Spain", "Other / Unspecified"
]

app = Flask(__name__, template_folder='templates', static_folder='static')

@app.route('/')
def index():
    return render_template('coo.html')

@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    if request.method == 'GET':
        config = enphase_client.load_config()
        # Do not expose sensitive secret values fully
        return jsonify({
            "client_id": config.get("client_id", ""),
            "client_secret": "********" if config.get("client_secret") else "",
            "api_key": config.get("api_key", ""),
            "redirect_uri": config.get("redirect_uri", "http://localhost:5000/api/enphase/callback"),
            "has_tokens": bool(config.get("access_token"))
        })
    else:
        new_data = request.json
        current = enphase_client.load_config()
        
        # Preserve existing secret if not updated
        if new_data.get("client_secret") == "********":
            new_data["client_secret"] = current.get("client_secret", "")
            
        enphase_client.save_config({
            "client_id": new_data.get("client_id", "").strip(),
            "client_secret": new_data.get("client_secret", "").strip(),
            "api_key": new_data.get("api_key", "").strip(),
            "redirect_uri": new_data.get("redirect_uri", "").strip()
        })
        return jsonify({"status": "success", "message": "Configuration saved successfully."})

@app.route('/api/enphase/auth-url')
def get_auth_url():
    try:
        url = enphase_client.get_auth_url()
        return jsonify({"status": "success", "url": url})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/api/enphase/callback')
def oauth_callback():
    code = request.args.get("code")
    if not code:
        return "Authorization failed: No authorization code received from Enphase.", 400
        
    try:
        success, details = enphase_client.exchange_auth_code(code)
        if success:
            return redirect('/?auth=success')
        else:
            return f"Failed to exchange token: {details}", 500
    except Exception as e:
        return f"Authentication error occurred: {str(e)}", 500

def _api_response(response):
    """Wrap an Enphase API response into a standard JSON reply."""
    if response.status_code == 200:
        return jsonify({"status": "success", "data": response.json()})
    return jsonify({
        "status": "error",
        "message": f"Enphase API returned HTTP {response.status_code}",
        "details": response.text
    }), response.status_code


@app.route('/api/enphase/systems')
def list_systems():
    """GET /api/v4/systems — all systems accessible by the OAuth token."""
    try:
        page = int(request.args.get("page", 1))
        size = int(request.args.get("size", 100))
        return _api_response(enphase_client.get_systems(page=page, size=size))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/enphase/system-data')
def get_system_data():
    """GET /api/v4/systems/{system_id} — full details for one system."""
    system_id = request.args.get("system_id", "").strip()
    if not system_id:
        return jsonify({"status": "error", "message": "System ID is required."}), 400
    try:
        return _api_response(enphase_client.get_system(system_id))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/enphase/system-summary')
def get_system_summary():
    """GET /api/v4/systems/{system_id}/summary — current power + lifetime energy."""
    system_id = request.args.get("system_id", "").strip()
    if not system_id:
        return jsonify({"status": "error", "message": "System ID is required."}), 400
    try:
        return _api_response(enphase_client.get_system_summary(system_id))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/enphase/system-devices')
def get_system_devices():
    """GET /api/v4/systems/{system_id}/devices — microinverter inventory."""
    system_id = request.args.get("system_id", "").strip()
    if not system_id:
        return jsonify({"status": "error", "message": "System ID is required."}), 400
    try:
        return _api_response(enphase_client.get_system_devices(system_id))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/enphase/energy-lifetime')
def get_energy_lifetime():
    """GET /api/v4/systems/{system_id}/energy_lifetime — daily production history."""
    system_id = request.args.get("system_id", "").strip()
    if not system_id:
        return jsonify({"status": "error", "message": "System ID is required."}), 400
    try:
        return _api_response(enphase_client.get_system_energy_lifetime(system_id))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/enphase/production-telemetry')
def get_production_telemetry():
    """GET /api/v4/systems/{system_id}/telemetry/production_micro."""
    system_id = request.args.get("system_id", "").strip()
    granularity = request.args.get("granularity", "day")
    start_at = request.args.get("start_at", None)
    if not system_id:
        return jsonify({"status": "error", "message": "System ID is required."}), 400
    try:
        return _api_response(enphase_client.get_system_production_micro(system_id, start_at, granularity))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/enphase/consumption-telemetry')
def get_consumption_telemetry():
    """GET /api/v4/systems/{system_id}/telemetry/consumption_micro."""
    system_id = request.args.get("system_id", "").strip()
    granularity = request.args.get("granularity", "day")
    start_at = request.args.get("start_at", None)
    if not system_id:
        return jsonify({"status": "error", "message": "System ID is required."}), 400
    try:
        return _api_response(enphase_client.get_system_consumption(system_id, start_at, granularity))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/enphase/inverters-summary')
def get_inverters_summary():
    """GET /api/v4/systems/{system_id}/inverters_summary_by_envoy_or_site."""
    system_id = request.args.get("system_id", "").strip()
    if not system_id:
        return jsonify({"status": "error", "message": "System ID is required."}), 400
    try:
        return _api_response(enphase_client.get_system_inverters_summary(system_id))
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Enlighten Scraper Routes ──────────────────────────────────────

@app.route('/api/enlighten/login', methods=['POST'])
def enlighten_login():
    if not SCRAPER_AVAILABLE:
        return jsonify({"status": "error", "message": "Scraper dependencies not installed."}), 503
    enlighten_scraper.start_login()
    return jsonify({"status": "started", "message": "Browser opened. Please complete login."})


@app.route('/api/enlighten/login-status')
def enlighten_login_status():
    if not SCRAPER_AVAILABLE:
        return jsonify({"status": "unavailable", "detail": ""})
    return jsonify(enlighten_scraper.get_status())


@app.route('/api/enlighten/check-session')
def enlighten_check_session():
    if not SCRAPER_AVAILABLE:
        return jsonify({"status": "unavailable", "valid": False})
    valid = enlighten_scraper.validate_session()
    return jsonify({
        "status": "active" if valid else "inactive",
        "valid":  valid,
        "has_file": enlighten_scraper.has_session()
    })


@app.route('/api/enlighten/auto-detect')
def enlighten_auto_detect():
    """
    Reactive session probe: checks saved session, then tries to steal
    cookies from the running Chrome/Edge browser. Called on page load.
    """
    if not SCRAPER_AVAILABLE:
        return jsonify({"status": "unavailable"})
    result = enlighten_scraper.auto_detect_session()
    return jsonify({"status": result})


@app.route('/api/enlighten/fetch-site')
def enlighten_fetch_site():
    if not SCRAPER_AVAILABLE:
        return jsonify({"status": "error", "message": "Scraper not available on this server."}), 503
    site_id = request.args.get("site_id", "").strip()
    if not site_id:
        return jsonify({"status": "error", "message": "site_id is required."}), 400
    try:
        data = enlighten_scraper.fetch_site(site_id)
        return jsonify({"status": "success", "data": data})
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/enlighten/debug-html')
def enlighten_debug_html():
    """Fetch the raw admin page HTML and save to enlighten_debug.html for selector inspection."""
    if not SCRAPER_AVAILABLE:
        return jsonify({"status": "error", "message": "Scraper not available."}), 503
    site_id = request.args.get("site_id", "").strip()
    if not site_id:
        return jsonify({"status": "error", "message": "site_id is required."}), 400
    try:
        html = enlighten_scraper.fetch_raw_html(site_id)
        debug_path = os.path.join(os.path.dirname(__file__), "enlighten_debug.html")
        with open(debug_path, "w", encoding="utf-8") as f:
            f.write(html)
        return jsonify({"status": "success", "saved_to": debug_path, "size": len(html)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/enlighten/clear-session', methods=['POST'])
def enlighten_clear_session():
    if SCRAPER_AVAILABLE:
        enlighten_scraper.clear_session()
    return jsonify({"status": "success"})


@app.route('/api/salesforce/check-session')
def salesforce_check_session():
    if not SCRAPER_AVAILABLE:
        return jsonify({"status": "error", "message": "Scraper not available"}), 503
    return jsonify({"status": "success", "has_session": enlighten_scraper.has_salesforce_session()})


@app.route('/api/salesforce/login-status')
def salesforce_login_status():
    if not SCRAPER_AVAILABLE:
        return jsonify({"status": "error", "message": "Scraper not available"}), 503
    return jsonify(enlighten_scraper.get_salesforce_status())


@app.route('/api/salesforce/start-login', methods=['POST'])
def salesforce_start_login():
    if not SCRAPER_AVAILABLE:
        return jsonify({"status": "error", "message": "Scraper not available"}), 503
    enlighten_scraper.start_salesforce_login()
    return jsonify({"status": "success"})


@app.route('/api/salesforce/clear-session', methods=['POST'])
def salesforce_clear_session():
    if SCRAPER_AVAILABLE:
        enlighten_scraper.clear_salesforce_session()
    return jsonify({"status": "success"})


@app.route('/api/salesforce/fetch-case')
def salesforce_fetch_case():
    if not SCRAPER_AVAILABLE:
        return jsonify({"status": "error", "message": "Scraper not available on this server."}), 503
    case_number = request.args.get("case_number", "").strip()
    if not case_number:
        return jsonify({"status": "error", "message": "case_number is required."}), 400
    try:
        data = enlighten_scraper.fetch_salesforce_case(case_number)
        return jsonify({"status": "success", "data": data})
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Custom Template Routes ────────────────────────────────────────

@app.route('/api/custom-templates', methods=['GET'])
def get_custom_templates():
    return jsonify(_load_templates())


@app.route('/api/custom-templates', methods=['POST'])
def create_custom_template():
    data = request.json or {}
    if not data.get("label") or not data.get("body_template"):
        return jsonify({"status": "error", "message": "label and body_template are required."}), 400
    new_tpl = {
        "id": str(uuid.uuid4()),
        "label": data["label"].strip(),
        "to_template": data.get("to_template", "Recipient").strip(),
        "cc": data.get("cc", ""),
        "subject_template": data.get("subject_template", "").strip(),
        "body_template": data["body_template"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": data.get("created_by", "")
    }
    templates = _load_templates()
    templates.append(new_tpl)
    _save_templates(templates)
    return jsonify({"status": "success", "template": new_tpl})


@app.route('/api/custom-templates/<template_id>', methods=['PUT'])
def update_custom_template(template_id):
    data = request.json or {}
    if not data.get("label") or not data.get("body_template"):
        return jsonify({"status": "error", "message": "label and body_template are required."}), 400
    updated = {
        "id": template_id,
        "label": data["label"].strip(),
        "to_template": data.get("to_template", "Recipient").strip(),
        "cc": data.get("cc", ""),
        "subject_template": data.get("subject_template", "").strip(),
        "body_template": data["body_template"],
        "created_at": data.get("created_at", datetime.now(timezone.utc).isoformat()),
        "created_by": data.get("created_by", "")
    }
    templates = _load_templates()
    templates = [t if t["id"] != template_id else updated for t in templates]
    _save_templates(templates)
    return jsonify({"status": "success", "template": updated})


@app.route('/api/custom-templates/<template_id>', methods=['DELETE'])
def delete_custom_template(template_id):
    templates = [t for t in _load_templates() if t["id"] != template_id]
    _save_templates(templates)
    return jsonify({"status": "success"})


@app.route('/api/regions')
def get_regions():
    return jsonify(REGIONS)


# ── Git Auto-Update ───────────────────────────────────────────────

_update_status = {"last_checked": None, "status": "idle", "message": "Not checked yet"}
_update_lock   = threading.Lock()
UPDATE_INTERVAL = 3600

def check_git_updates():
    global _update_status
    repo_dir = BASE_DIR
    try:
        subprocess.run(["git", "fetch"], cwd=repo_dir, capture_output=True, timeout=30)
        local  = subprocess.run(["git", "rev-parse", "HEAD"],          cwd=repo_dir, capture_output=True, text=True).stdout.strip()
        remote = subprocess.run(["git", "rev-parse", "@{u}"],          cwd=repo_dir, capture_output=True, text=True).stdout.strip()
        with _update_lock:
            _update_status["last_checked"] = datetime.utcnow().isoformat() + "Z"
        if local != remote:
            subprocess.run(["git", "pull"], cwd=repo_dir, capture_output=True, timeout=60)
            with _update_lock:
                _update_status["status"]  = "updated"
                _update_status["message"] = "Update applied, restarting…"
            time.sleep(1)
            os._exit(0)
        else:
            with _update_lock:
                _update_status["status"]  = "up_to_date"
                _update_status["message"] = "Already up to date"
    except Exception as e:
        with _update_lock:
            _update_status["status"]  = "error"
            _update_status["message"] = str(e)

def _auto_update_worker():
    while True:
        time.sleep(UPDATE_INTERVAL)
        check_git_updates()

def start_auto_update():
    t = threading.Thread(target=_auto_update_worker, daemon=True)
    t.start()

@app.route('/api/update/check', methods=['POST'])
def api_update_check():
    threading.Thread(target=check_git_updates, daemon=True).start()
    time.sleep(0.5)
    with _update_lock:
        return jsonify(dict(_update_status))

@app.route('/api/update/status')
def api_update_status():
    with _update_lock:
        return jsonify(dict(_update_status))


if __name__ == '__main__':
    start_auto_update()
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        webbrowser.open("http://localhost:5001")
    app.run(port=5001, debug=True)
