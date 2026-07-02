import os
import sys
import json
import uuid
import webbrowser
from datetime import datetime, timezone, timedelta
import csv, io
from flask import Flask, request, jsonify, render_template, redirect, url_for, make_response
import enphase_client
import db_layer

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH  = os.path.join(DATA_DIR, "mailforge.db")
os.makedirs(DATA_DIR, exist_ok=True)

db_layer.init(DB_PATH)
CLOUD_MODE = db_layer.is_cloud()

try:
    import enlighten_scraper
    SCRAPER_AVAILABLE = True and not CLOUD_MODE
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
    return jsonify(db_layer.read_templates())


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
    db_layer.save_template(new_tpl)
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
    db_layer.save_template(updated)
    return jsonify({"status": "success", "template": updated})


@app.route('/api/custom-templates/<template_id>', methods=['DELETE'])
def delete_custom_template(template_id):
    db_layer.delete_template(template_id)
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
    db_layer.insert_case(entry)
    return jsonify(entry), 201


@app.route('/api/cases/clear', methods=['POST'])
def clear_cases():
    db_layer.clear_cases()
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
    cases = db_layer.read_cases()
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
    cases = db_layer.read_cases()
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


@app.route('/admin')
def admin_dashboard():
    cases   = db_layer.read_cases()
    db_size = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0
    custom  = db_layer.read_templates()
    mode    = "☁️ Firebase Firestore (Cloud)" if CLOUD_MODE else "🗄️ SQLite (Local)"
    recent  = list(reversed(cases))[:100]
    rows_html = ""
    for c in recent:
        cat_color = {"COO":"#3b82f6","DOO":"#10b981"}.get(c.get("category",""), "#64748b")
        rows_html += f"""
        <tr>
          <td style="font-family:monospace;font-size:11px;color:#94a3b8">{c.get('id','')[:8]}…</td>
          <td>{c.get('scenario','')}</td>
          <td><span style="background:{cat_color};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">{c.get('category','')}</span></td>
          <td>{c.get('region','')}</td>
          <td style="font-family:monospace;font-size:12px">{c.get('at','')[:19].replace('T',' ')}</td>
        </tr>"""
    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>COO Mail Forge — Admin DB Viewer</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;color:#1e293b;padding:32px}}
h1{{font-size:22px;font-weight:800;color:#1e293b;margin-bottom:4px}}
.sub{{font-size:13px;color:#64748b;margin-bottom:28px}}
.cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:28px}}
.card{{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px}}
.card .n{{font-size:32px;font-weight:800;color:#f47920}}
.card .l{{font-size:12px;color:#64748b;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}}
table{{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0}}
th{{background:#f8fafc;padding:10px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:1px solid #e2e8f0}}
td{{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px}}
tr:last-child td{{border-bottom:none}}
tr:hover td{{background:#fafbff}}
.actions{{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center}}
.btn{{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;border:1px solid #e2e8f0;background:#fff;color:#1e293b}}
.btn-red{{background:#fef2f2;border-color:#fecaca;color:#dc2626}}
.btn:hover{{border-color:#f47920;color:#f47920}}
.dbpath{{font-family:monospace;font-size:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 12px;color:#475569;word-break:break-all}}
</style></head><body>
<h1>🗄️ COO Mail Forge — Admin DB Viewer</h1>
<p class="sub">Live view of <span class="dbpath">{DB_PATH}</span></p>
<div class="cards">
  <div class="card"><div class="n">{len(cases)}</div><div class="l">Total Cases</div></div>
  <div class="card"><div class="n">{sum(1 for c in cases if c.get('category')=='COO')}</div><div class="l">COO Cases</div></div>
  <div class="card"><div class="n">{sum(1 for c in cases if c.get('category')=='DOO')}</div><div class="l">DOO Cases</div></div>
  <div class="card"><div class="n">{len(custom)}</div><div class="l">Custom Templates</div></div>
  <div class="card"><div class="n">{db_size//1024} KB</div><div class="l">DB File Size</div></div>
</div>
<div class="actions">
  <a href="/api/analytics/export" class="btn">⬇ Export All as CSV</a>
  <a href="/" class="btn">← Back to App</a>
  <form method="post" action="/api/cases/clear" onsubmit="return confirm('Delete ALL case data? Cannot be undone.');" style="margin:0">
    <button type="submit" class="btn btn-red">🗑 Clear All Cases</button>
  </form>
  <span style="font-size:12px;color:#94a3b8">Showing last {len(recent)} of {len(cases)} records</span>
</div>
<table>
<thead><tr><th>ID</th><th>Scenario</th><th>Category</th><th>Region</th><th>Logged At (UTC)</th></tr></thead>
<tbody>{rows_html if rows_html else '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:32px">No cases logged yet.</td></tr>'}</tbody>
</table>
<p style="margin-top:16px;font-size:12px;color:#94a3b8">Tip: bookmark <strong>http://localhost:5001/admin</strong> for quick access. Refresh the page to see latest data.</p>
</body></html>"""
    return html


if __name__ == '__main__':
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        webbrowser.open("http://localhost:5001")
    app.run(port=5001, debug=True)
