import os
import sys
import webbrowser
from flask import Flask, request, jsonify, render_template, redirect, url_for
import enphase_client

app = Flask(__name__, template_folder='templates')

@app.route('/')
def index():
    return render_template('coo.html')

@app.route('/api-portal')
def api_portal():
    return render_template('index.html')

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


if __name__ == '__main__':
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        webbrowser.open("http://localhost:5000")
    app.run(port=5000, debug=True)
