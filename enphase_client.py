import os
import json
import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "https://api.enphaseenergy.com"
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_config(config_data):
    current = load_config()
    current.update(config_data)
    with open(CONFIG_FILE, 'w') as f:
        json.dump(current, f, indent=4)

def get_auth_url():
    config = load_config()
    client_id = config.get("client_id")
    redirect_uri = config.get("redirect_uri")
    if not client_id or not redirect_uri:
        raise ValueError("Client ID and Redirect URI must be configured first.")
    return (
        f"{BASE_URL}/oauth/authorize"
        f"?response_type=code"
        f"&client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
    )

def exchange_auth_code(code):
    config = load_config()
    client_id = config.get("client_id")
    client_secret = config.get("client_secret")
    redirect_uri = config.get("redirect_uri")

    if not all([client_id, client_secret, redirect_uri]):
        raise ValueError("API Credentials are not fully configured in config.json")

    url = f"{BASE_URL}/oauth/token"
    payload = {
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
        "code": code
    }
    response = requests.post(url, data=payload, auth=HTTPBasicAuth(client_id, client_secret))
    if response.status_code == 200:
        data = response.json()
        save_config({
            "access_token": data.get("access_token"),
            "refresh_token": data.get("refresh_token")
        })
        return True, data
    else:
        return False, response.text

def refresh_access_token():
    config = load_config()
    client_id = config.get("client_id")
    client_secret = config.get("client_secret")
    refresh_token = config.get("refresh_token")

    if not all([client_id, client_secret, refresh_token]):
        raise ValueError("Credentials or refresh token missing.")

    url = f"{BASE_URL}/oauth/token"
    payload = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token
    }
    response = requests.post(url, data=payload, auth=HTTPBasicAuth(client_id, client_secret))
    if response.status_code == 200:
        data = response.json()
        save_config({
            "access_token": data.get("access_token"),
            "refresh_token": data.get("refresh_token")
        })
        return True, data.get("access_token")
    else:
        return False, response.text

def _build_headers():
    """Return Authorization header using the stored access token."""
    config = load_config()
    access_token = config.get("access_token")
    if not access_token:
        raise ValueError("No access token found. Authorize the application first.")
    return {"Authorization": f"Bearer {access_token}"}

def query_enphase_api(endpoint, params=None):
    """
    Make an authenticated GET request to the Enphase API.
    - api_key is passed as a URL query parameter (?key=...) — NOT as a header.
    - Bearer token goes in the Authorization header.
    """
    config = load_config()
    api_key = config.get("api_key")

    if not api_key:
        raise ValueError("API Key is required. Save your credentials first.")

    headers = _build_headers()
    url = f"{BASE_URL}{endpoint}"

    merged_params = {"key": api_key}
    if params:
        merged_params.update(params)

    response = requests.get(url, headers=headers, params=merged_params)

    if response.status_code == 401:
        success, new_token = refresh_access_token()
        if success:
            headers["Authorization"] = f"Bearer {new_token}"
            response = requests.get(url, headers=headers, params=merged_params)

    return response

# ──────────────────────────────────────────────
# Named helpers for every supported v4 endpoint
# ──────────────────────────────────────────────

def get_systems(page=1, size=100):
    """GET /api/v4/systems — list all systems the token has access to."""
    return query_enphase_api("/api/v4/systems", {"page": page, "size": size})

def get_system(system_id):
    """GET /api/v4/systems/{system_id} — details for one system."""
    return query_enphase_api(f"/api/v4/systems/{system_id}")

def get_system_summary(system_id):
    """GET /api/v4/systems/{system_id}/summary — lifetime energy & current power."""
    return query_enphase_api(f"/api/v4/systems/{system_id}/summary")

def get_system_devices(system_id):
    """GET /api/v4/systems/{system_id}/devices — microinverter list."""
    return query_enphase_api(f"/api/v4/systems/{system_id}/devices")

def get_system_energy_lifetime(system_id):
    """GET /api/v4/systems/{system_id}/energy_lifetime — daily production history."""
    return query_enphase_api(f"/api/v4/systems/{system_id}/energy_lifetime")

def get_system_production_micro(system_id, start_at=None, granularity="day"):
    """GET /api/v4/systems/{system_id}/telemetry/production_micro."""
    params = {"granularity": granularity}
    if start_at:
        params["start_at"] = start_at
    return query_enphase_api(f"/api/v4/systems/{system_id}/telemetry/production_micro", params)

def get_system_consumption(system_id, start_at=None, granularity="day"):
    """GET /api/v4/systems/{system_id}/telemetry/consumption_micro."""
    params = {"granularity": granularity}
    if start_at:
        params["start_at"] = start_at
    return query_enphase_api(f"/api/v4/systems/{system_id}/telemetry/consumption_micro", params)

def get_system_inverters_summary(system_id):
    """GET /api/v4/systems/{system_id}/inverters_summary_by_envoy_or_site."""
    return query_enphase_api(f"/api/v4/systems/{system_id}/inverters_summary_by_envoy_or_site")
