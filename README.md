# COO Mail Forge

> Internal operations tool for Enphase Energy COO & DOO teams — generates precise ownership transfer correspondence, tracks case analytics, and scans Enlighten site data in real time.

![Python](https://img.shields.io/badge/Python-3.10%2B-blue) ![Flask](https://img.shields.io/badge/Flask-3.0-orange) ![SQLite](https://img.shields.io/badge/Database-SQLite-green) ![Waitress](https://img.shields.io/badge/Server-Waitress-purple)

---

## Features

- **Scenario-based email composer** — 18 built-in COO/DOO/Admin templates, fully auto-populated
- **Enlighten Site Scanner** — scan any site ID to auto-fill installer, maintainer, phone, alarms
- **Custom template builder** — create reusable templates with `[[Placeholder]]` syntax
- **Regional support numbers** — auto-switches Enphase support phone by region (US, DE, UK, FR…)
- **Operations dashboard** — analytics charts, case logging, daily/weekly/monthly timelines
- **Export to CSV** — one-click export of all logged cases, opens in Excel
- **Download charts as PNG** — save any analytics chart as an image
- **SQLite database** — concurrent-safe, multi-user, single file
- **Production-ready** — Waitress WSGI server, handles 100+ concurrent users on LAN

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+, Flask 3.0 |
| Database | SQLite (via `sqlite3` stdlib) |
| Production server | Waitress |
| Scraper | httpx, BeautifulSoup4, Selenium |
| Frontend | Vanilla JS (IIFE), Chart.js 4 |
| Styling | CSS custom properties, Plus Jakarta Sans |

---

## Project Structure

```
email-coo-automation/
├── START SERVER.bat          ← double-click to launch (production)
├── serve.py                  ← Waitress production server entry point
├── app.py                    ← Flask app — all API routes
├── enlighten_scraper.py      ← Enlighten site scanner (httpx + BS4 + Selenium)
├── enphase_client.py         ← Enphase public API client
├── requirements.txt          ← pip dependencies
├── custom_templates.json     ← persisted custom email templates
│
├── templates/
│   └── coo.html              ← single-page app shell (Jinja2)
│
├── static/
│   ├── app.js                ← all frontend logic (~1300 lines)
│   ├── styles.css            ← design system + component styles
│   ├── logo.svg              ← sidebar logo
│   ├── favicon.svg           ← browser tab icon
│   └── favicon.ico           ← desktop shortcut icon
│
└── data/
    └── mailforge.db          ← SQLite database (gitignored — never commit)
```

---

## Installation (Server / IT Admin)

### 1. Prerequisites
- Python 3.10 or higher — https://www.python.org/downloads/
- Git (optional, for cloning)

### 2. Clone the repository
```bash
git clone https://github.com/thayeeb9211/coomailforge.git
cd coomailforge
```

### 3. Create a virtual environment (recommended)
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

### 5. Start the production server

**Windows — easiest way:**
```
Double-click  →  START SERVER.bat
```

**Command line:**
```bash
python serve.py
```

The terminal will print:
```
  Local:    http://localhost:5001
  Network:  http://192.168.x.x:5001   ← share this with your team
```

Share the **Network** URL with all COO agents and the manager. Anyone on the same office network can open it in their browser — no installation needed on agent machines.

---

## Multi-User / Intranet Deployment

This tool is designed to run on **one always-on office PC or server**. All agents connect via browser over the LAN.

```
[Agent 1 PC]  ─┐
[Agent 2 PC]  ─┤──► http://192.168.x.x:5001 ──► Server PC ──► mailforge.db
[Agent 3 PC]  ─┤                                              (all data central)
[Manager PC]  ─┘
```

**Requirements for the server PC:**
- Windows 10/11 (or Windows Server)
- Python installed
- Always powered on during office hours
- Accessible on the same network (no firewall blocking port 5001)

**To allow port 5001 through Windows Firewall:**
```
Windows Defender Firewall → Advanced Settings → Inbound Rules → New Rule
→ Port → TCP → 5001 → Allow → Name: "COO Mail Forge"
```

---

## Environment & Secrets

The following files are **gitignored** and must **never be committed**:

| File | Contents |
|---|---|
| `config.json` | Enphase API `client_id`, `client_secret`, `api_key` |
| `enlighten_session.json` | Enlighten browser session cookies |
| `data/mailforge.db` | All logged case data |

These files are created automatically on first run or first login.

---

## API Routes Reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Main application UI |
| `GET` | `/api/regions` | List of supported regions |
| `POST` | `/api/cases` | Log a new case |
| `POST` | `/api/cases/clear` | Delete all case data |
| `GET` | `/api/analytics` | Full analytics payload |
| `GET` | `/api/analytics/export` | Download cases as CSV |
| `GET` | `/api/custom-templates` | List custom templates |
| `POST` | `/api/custom-templates` | Create custom template |
| `DELETE` | `/api/custom-templates/<id>` | Delete custom template |
| `GET` | `/api/enlighten/check-session` | Check Enlighten login status |
| `GET` | `/api/enlighten/fetch-site` | Scan a site by ID |

---

## Updating the Application

When a new version is released:
```bash
git pull origin main
pip install -r requirements.txt   # if dependencies changed
# Restart the server
```

The `data/mailforge.db` is **not affected** by updates — your case history is preserved.

---

## License

Internal use only — Enphase Energy Operations Team.
