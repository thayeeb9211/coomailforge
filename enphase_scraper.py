"""
Enphase Data Scraper - Standalone CLI Script
============================================
Reads credentials from config.json and pulls system data from the Enphase API v4.

Usage:
    python enphase_scraper.py --system_id 2564252
    python enphase_scraper.py --system_id 2564252 --endpoints all
    python enphase_scraper.py --list_systems
    python enphase_scraper.py --system_id 2564252 --endpoints details summary devices energy
"""

import argparse
import json
import sys
import os

import enphase_client

SEPARATOR = "=" * 70

ENDPOINT_MAP = {
    "details":     lambda sid: enphase_client.get_system(sid),
    "summary":     lambda sid: enphase_client.get_system_summary(sid),
    "devices":     lambda sid: enphase_client.get_system_devices(sid),
    "energy":      lambda sid: enphase_client.get_system_energy_lifetime(sid),
    "production":  lambda sid: enphase_client.get_system_production_micro(sid),
    "consumption": lambda sid: enphase_client.get_system_consumption(sid),
    "inverters":   lambda sid: enphase_client.get_system_inverters_summary(sid),
}

ALL_ENDPOINTS = list(ENDPOINT_MAP.keys())


def print_section(title, data):
    print(f"\n{SEPARATOR}")
    print(f"  {title}")
    print(SEPARATOR)
    if isinstance(data, (dict, list)):
        print(json.dumps(data, indent=2))
    else:
        print(data)


def scrape_system(system_id: str, endpoints: list):
    print(f"\nScraping Enphase system ID: {system_id}")
    print(f"Endpoints: {', '.join(endpoints)}")

    for ep in endpoints:
        fn = ENDPOINT_MAP.get(ep)
        if not fn:
            print(f"  [SKIP] Unknown endpoint '{ep}'")
            continue

        try:
            resp = fn(system_id)
            if resp.status_code == 200:
                print_section(
                    f"{ep.upper()}  —  /api/v4/systems/{system_id}{_ep_suffix(ep)}",
                    resp.json()
                )
            elif resp.status_code == 422:
                print(f"\n  [{ep.upper()}] HTTP 422 – endpoint not available for this system (likely no consumption meter).")
            elif resp.status_code == 403:
                print(f"\n  [{ep.upper()}] HTTP 403 – access denied. Check API scope / system ownership.")
            elif resp.status_code == 404:
                print(f"\n  [{ep.upper()}] HTTP 404 – system {system_id} not found or you don't have access.")
            else:
                print(f"\n  [{ep.upper()}] HTTP {resp.status_code}: {resp.text[:300]}")
        except ValueError as e:
            print(f"\n  [{ep.upper()}] Configuration error: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"\n  [{ep.upper()}] Unexpected error: {e}")


def _ep_suffix(ep):
    suffixes = {
        "details": "",
        "summary": "/summary",
        "devices": "/devices",
        "energy": "/energy_lifetime",
        "production": "/telemetry/production_micro",
        "consumption": "/telemetry/consumption_micro",
        "inverters": "/inverters_summary_by_envoy_or_site",
    }
    return suffixes.get(ep, "")


def list_systems():
    print("\nFetching all accessible systems from /api/v4/systems …")
    try:
        resp = enphase_client.get_systems()
    except ValueError as e:
        print(f"Configuration error: {e}")
        sys.exit(1)

    if resp.status_code == 200:
        data = resp.json()
        systems = data.get("systems", data if isinstance(data, list) else [])
        if not systems:
            print("\nNo systems returned. As an Enphase employee, your account may not")
            print("own any systems. Try querying a specific system ID directly:")
            print("  python enphase_scraper.py --system_id 2564252")
        else:
            print(f"\nFound {len(systems)} system(s):\n")
            fmt = "  {:<12} {:<35} {:<12} {}"
            print(fmt.format("System ID", "Name", "Status", "Location"))
            print("  " + "-" * 70)
            for s in systems:
                loc = f"{s.get('city','')}, {s.get('state','')}".strip(", ")
                print(fmt.format(
                    str(s.get("system_id", "—")),
                    str(s.get("name", "—"))[:34],
                    str(s.get("status", "—")),
                    loc or "—"
                ))
        print_section("RAW /api/v4/systems RESPONSE", data)
    elif resp.status_code == 403:
        print("HTTP 403 – check your API key scope and OAuth token.")
    else:
        print(f"HTTP {resp.status_code}: {resp.text[:400]}")


def check_credentials():
    cfg = enphase_client.load_config()
    missing = [k for k in ("client_id", "client_secret", "api_key") if not cfg.get(k)]
    if missing:
        print(f"Missing credentials in config.json: {', '.join(missing)}")
        sys.exit(1)
    if not cfg.get("access_token"):
        print("No OAuth access token found.")
        print("Run the web app first (python app.py) and complete OAuth authorization.")
        print("Then re-run this script.")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Enphase API Data Scraper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument("--system_id", type=str, help="Enphase system ID to query (e.g. 2564252)")
    parser.add_argument(
        "--endpoints", nargs="+",
        choices=ALL_ENDPOINTS + ["all"],
        default=["details", "summary"],
        help="Endpoints to fetch. Use 'all' for everything."
    )
    parser.add_argument("--list_systems", action="store_true", help="List all systems accessible by your token")
    args = parser.parse_args()

    check_credentials()

    if args.list_systems:
        list_systems()
    elif args.system_id:
        endpoints = ALL_ENDPOINTS if "all" in args.endpoints else args.endpoints
        scrape_system(args.system_id, endpoints)
    else:
        parser.print_help()
        print("\nExamples:")
        print("  python enphase_scraper.py --list_systems")
        print("  python enphase_scraper.py --system_id 2564252")
        print("  python enphase_scraper.py --system_id 2564252 --endpoints all")


if __name__ == "__main__":
    main()
