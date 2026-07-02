# COO Mail Forge — Agent Quick-Start Guide

> This guide is for COO / DOO support agents. No installation required — just open a browser.

---

## Step 1 — Open the Tool

Ask your IT admin or team lead for the URL. It will look like:

```
http://192.168.x.x:5001
```

Open it in **Chrome** or **Edge**. Bookmark it for quick access.

---

## Step 2 — Set Your Name

On the left sidebar, find **Agent Signature** and type your name.

> Your name is automatically added to every email you generate. You only need to do this once — it is saved in your browser.

---

## Step 3 — Pick a Scenario

Use the **"Active Scenario Workflow"** dropdown at the top to choose what type of email you need:

| Group | When to use |
|---|---|
| **COO Complete — System Normal** | Ownership transferred, system is healthy |
| **COO Complete — System Has Issue** | Ownership transferred, but there's an active alarm |
| **Document Request — Name Mismatch** | Name on form doesn't match ownership document |
| **Document Request — Address Mismatch** | Address doesn't match |
| **DOO — Lease A to Lease B** | Declaration of ownership, lease type change |
| *(and more…)* | See the dropdown for all scenarios |

---

## Step 4 — Scan the Site (optional but recommended)

If you have the **Site ID** from Enlighten:

1. Enter it in the **Enlighten Scanner** box on the left sidebar
2. Click **Scan Site**
3. The form fields will **auto-fill** with the installer name, phone, maintainer, and any active alarms
4. Switching scenarios after a scan keeps the data filled in — no need to scan again

> **First time?** You may be asked to log in to Enlighten. Click **Login to Enlighten**, complete the login in the popup window, then come back.

---

## Step 5 — Fill in Required Details

The **Required Details** form on the left side of the workspace shows the fields needed for the selected scenario.

- Fields marked with placeholder text (e.g. `[[Customer Name]]`) must be filled before the email looks right
- The **Draft Preview** on the right updates live as you type

**Select your Region** — this automatically sets the correct Enphase support phone number for the country.

---

## Step 6 — Review the Draft Preview

The **Draft Preview** panel on the right shows the exact email that will be sent. Check:

- ✅ Customer name is correct
- ✅ Site ID is correct
- ✅ Installer / maintainer details are populated
- ✅ No `[[Placeholder]]` text remains highlighted in orange — those need to be filled

---

## Step 7 — Copy and Send

Below the email preview:

| Button | What it does |
|---|---|
| **Copy** | Copies the full email to clipboard — paste into Outlook/Gmail |
| **Download** | Saves as a `.txt` file |
| **Log Case** | Records this case in the analytics dashboard |

> **Always click Log Case** after sending — this helps the manager see team workload and trends.

---

## Creating Custom Templates

If you have a recurring email type not in the built-in list:

1. Click **+ NEW** in the "My Templates" sidebar card
2. Enter a template name, subject, and body
3. Use `[[Customer Name]]`, `[[Site ID]]`, or any `[[Your Field]]` as placeholders — they become fillable form fields automatically
4. Click **Save Template**

Your template appears in the dropdown and the sidebar list. Click the name to use it instantly.

---

## Analytics (Manager / Team Lead)

Switch to the **Analytics** tab to see:

- Total cases logged by the team
- COO vs DOO breakdown
- Region-based distribution
- Daily / weekly / monthly volume charts

**Export to CSV** — downloads all case data as an Excel-compatible file.

**Download Chart** — click the download icon (↓) on any chart to save it as a PNG image.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Page won't load | Check with IT that the server PC is on and reachable |
| "Scan Site" button does nothing | Log in to Enlighten first using the sidebar button |
| Session expired | Click "Login to Enlighten" again in the sidebar |
| Fields are empty after scanning | Make sure the Site ID is correct and you're logged in |
| Email has `[[orange text]]` | Those fields are unfilled — complete the form before copying |

---

*For technical issues, contact your IT admin or the tool maintainer.*
