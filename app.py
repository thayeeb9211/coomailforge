import os
import sys
import json
import uuid
import webbrowser
from datetime import datetime, timezone, timedelta
import csv, io, sqlite3
from flask import Flask, request, jsonify, render_template, redirect, url_for, make_response
import enphase_client

try:
    import enlighten_scraper
    SCRAPER_AVAILABLE = True
except ImportError:
    SCRAPER_AVAILABLE = False

CUSTOM_TEMPLATES_FILE = os.path.join(os.path.dirname(__file__), "custom_templates.json")

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH  = os.path.join(DATA_DIR, "mailforge.db")
os.makedirs(DATA_DIR, exist_ok=True)

def _get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def _init_db():
    with _get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cases (
                id       TEXT PRIMARY KEY,
                scenario TEXT NOT NULL,
                region   TEXT NOT NULL DEFAULT 'Other / Unspecified',
                category TEXT NOT NULL DEFAULT 'Other',
                at       TEXT NOT NULL
            )
        """)
        conn.commit()
    # One-time migration from cases.json if it exists
    _legacy = os.path.join(DATA_DIR, "cases.json")
    if os.path.exists(_legacy):
        try:
            with open(_legacy, "r") as _f:
                _old = json.load(_f)
            if _old:
                with _get_db() as conn:
                    for c in _old:
                        conn.execute(
                            "INSERT OR IGNORE INTO cases (id,scenario,region,category,at) VALUES (?,?,?,?,?)",
                            (c.get('id', str(uuid.uuid4())), c.get('scenario',''),
                             c.get('region','Other / Unspecified'), c.get('category','Other'),
                             c.get('at',''))
                        )
                    conn.commit()
        except Exception:
            pass
        os.rename(_legacy, _legacy + ".migrated")

_init_db()

REGIONS = [
    "US / NA",
    "Germany", "Austria", "Switzerland", "Netherlands", "Belgium",
    "France", "Luxembourg", "UK", "Spain", "Other / Unspecified"
]

def _read_cases():
    try:
        with _get_db() as conn:
            rows = conn.execute(
                "SELECT id,scenario,region,category,at FROM cases ORDER BY at"
            ).fetchall()
            return [dict(r) for r in rows]
    except Exception:
        return []

def _load_custom_templates():
    if os.path.exists(CUSTOM_TEMPLATES_FILE):
        try:
            with open(CUSTOM_TEMPLATES_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def _save_custom_templates(templates):
    with open(CUSTOM_TEMPLATES_FILE, "w") as f:
        json.dump(templates, f, indent=2)

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


# ── Custom Template Routes ────────────────────────────────────────

@app.route('/api/custom-templates', methods=['GET'])
def get_custom_templates():
    return jsonify(_load_custom_templates())


@app.route('/api/custom-templates', methods=['POST'])
def create_custom_template():
    data = request.json or {}
    if not data.get("label") or not data.get("body_template"):
        return jsonify({"status": "error", "message": "label and body_template are required."}), 400
    templates = _load_custom_templates()
    new_tpl = {
        "id": str(uuid.uuid4()),
        "label": data["label"].strip(),
        "to_template": data.get("to_template", "Customer \u2014 {{customer_name}}").strip(),
        "subject_template": data.get("subject_template", "").strip(),
        "body_template": data["body_template"],
        "fields": data.get("fields", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": data.get("created_by", "")
    }
    templates.append(new_tpl)
    _save_custom_templates(templates)
    return jsonify({"status": "success", "template": new_tpl})


@app.route('/api/custom-templates/<template_id>', methods=['DELETE'])
def delete_custom_template(template_id):
    templates = _load_custom_templates()
    templates = [t for t in templates if t["id"] != template_id]
    _save_custom_templates(templates)
    return jsonify({"status": "success"})


# ── Analytics / Cases Routes ─────────────────────────────────────

@app.route('/api/regions')
def get_regions():
    return jsonify(REGIONS)


@app.route('/api/cases', methods=['POST'])
def log_case():
    data = request.get_json() or {}
    scenario = data.get('scenario')
    if not scenario:
        return jsonify({'error': 'scenario is required'}), 400
    region   = data.get('region', 'Other / Unspecified')
    category = data.get('category', 'Other')
    if region not in REGIONS:
        region = 'Other / Unspecified'
    entry = {
        'id':       str(uuid.uuid4()),
        'scenario': scenario,
        'region':   region,
        'category': category,
        'at':       datetime.utcnow().isoformat() + 'Z'
    }
    with _get_db() as conn:
        conn.execute(
            "INSERT INTO cases (id,scenario,region,category,at) VALUES (?,?,?,?,?)",
            (entry['id'], entry['scenario'], entry['region'], entry['category'], entry['at'])
        )
        conn.commit()
    return jsonify(entry), 201


@app.route('/api/cases/clear', methods=['POST'])
def clear_cases():
    with _get_db() as conn:
        conn.execute("DELETE FROM cases")
        conn.commit()
    return jsonify({'status': 'success', 'message': 'All analytics data cleared.'})


def _bucket_key(dt_str, gran):
    if dt_str.endswith('Z'):
        dt_str = dt_str[:-1]
    try:
        dt = datetime.fromisoformat(dt_str)
    except Exception:
        return dt_str[:10]
    if gran == 'day':   return dt.strftime('%Y-%m-%d')
    if gran == 'month': return dt.strftime('%Y-%m')
    year, week, _ = dt.isocalendar()
    return f"{year}-W{week:02d}"


@app.route('/api/analytics')
def get_analytics():
    cases = _read_cases()
    by_region   = {r: 0 for r in REGIONS}
    by_category = {'COO': 0, 'DOO': 0, 'Other': 0}
    by_scenario = {}
    for c in cases:
        cat = c.get('category', 'Other')
        by_category[cat] = by_category.get(cat, 0) + 1
        reg = c.get('region', 'Other / Unspecified')
        by_region[reg]   = by_region.get(reg, 0) + 1
        scen = c.get('scenario', 'unknown')
        by_scenario[scen] = by_scenario.get(scen, 0) + 1
    now = datetime.utcnow()
    daily   = []
    for i in range(29, -1, -1):
        d = now - timedelta(days=i)
        k = d.strftime('%Y-%m-%d')
        daily.append({'period': k, 'count': sum(1 for c in cases if _bucket_key(c['at'],'day') == k)})
    weekly  = []
    for i in range(11, -1, -1):
        d = now - timedelta(weeks=i)
        year, week, _ = d.isocalendar()
        k = f"{year}-W{week:02d}"
        weekly.append({'period': k, 'count': sum(1 for c in cases if _bucket_key(c['at'],'week') == k)})
    monthly = []
    for i in range(11, -1, -1):
        year, month = now.year, now.month - i
        while month <= 0: month += 12; year -= 1
        k = f"{year}-{month:02d}"
        monthly.append({'period': k, 'count': sum(1 for c in cases if _bucket_key(c['at'],'month') == k)})
    return jsonify({
        'total':      len(cases),
        'byRegion':   [{'region': k,   'count': v} for k, v in by_region.items()],
        'byCategory': [{'category': k, 'count': v} for k, v in by_category.items()],
        'byScenario': [{'scenario': k, 'count': v} for k, v in by_scenario.items()],
        'daily': daily, 'weekly': weekly, 'monthly': monthly
    })


@app.route('/api/analytics/export')
def export_analytics_csv():
    cases = _read_cases()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Scenario', 'Category', 'Region', 'Logged At (UTC)'])
    for c in cases:
        writer.writerow([
            c.get('id',''), c.get('scenario',''), c.get('category',''),
            c.get('region',''), c.get('at','')
        ])
    filename = f"mailforge_cases_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    resp = make_response(output.getvalue())
    resp.headers['Content-Type']        = 'text/csv'
    resp.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp


if __name__ == '__main__':
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        webbrowser.open("http://localhost:5001")
    app.run(port=5001, debug=True)
