(function () {
  'use strict';

  /* ============================================================
     Regional Enphase Support Phone Numbers
     ============================================================ */
  const REGION_SUPPORT_PHONES = {
    "US / NA":             "(877) 797-4743",
    "Germany":             "+49 (0) 89 38037726",
    "Austria":             "+43 (0) 720 115456",
    "Switzerland":         "+41 (0) 43 5880565",
    "Netherlands":         "+31 (0) 85 2082305",
    "Belgium":             "+32 (0) 78 482728",
    "France":              "+33 (0) 970 731076",
    "Luxembourg":          "80085850",
    "UK":                  "+44 (0) 330 8088522",
    "Spain":               "+34 518 880277",
    "Other / Unspecified": "(877) 797-4743",
  };

  function getSupportPhone() {
    const sel = document.getElementById("region-select");
    const region = sel ? sel.value : "US / NA";
    return REGION_SUPPORT_PHONES[region] || "(877) 797-4743";
  }

  /* ============================================================
     Field Definitions
     ============================================================ */
  const FIELD_DEFS = {
    customerName:    { label: "Customer Name",              placeholder: "Jane Doe" },
    siteId:          { label: "Site ID",                    placeholder: "6330594" },
    systemName:      { label: "System Name",                placeholder: "Doe Residence Solar" },
    ownerName:       { label: "New Owner — Name",           placeholder: "John Smith" },
    ownerEmail:      { label: "New Owner — Email",          placeholder: "john.smith@example.com" },
    ownerAddress:    { label: "New Owner — Address",        placeholder: "12 Maple St, Springfield, IL, 62704" },
    maintainerName:  { label: "Maintainer — Name",          placeholder: "GreenTech Maintenance" },
    maintainerPhone: { label: "Maintainer — Phone",         placeholder: "+1 555-010-1234" },
    installerName:   { label: "Installer — Name",           placeholder: "SunPeak Installers" },
    installerPhone:  { label: "Installer — Phone",          placeholder: "+1 555-010-5678" },
    issue:           { label: "Issue (from health scan)",   placeholder: "e.g. Gateway not reporting" },
    caseNumber:      { label: "Case Number",                placeholder: "CS-00012345" },
    leaseOwner:      { label: "Lease holder / lessor name", placeholder: "SolarLease Finance Co." },
    refundAmount:    { label: "Refund Amount",              placeholder: "$450.00" },
  };

  function v(value, key) {
    if (value && value.trim() !== "") return value.trim();
    return `[[${FIELD_DEFS[key] ? FIELD_DEFS[key].label : key}]]`;
  }

  function docRequestBody(f, discrepancyPhrase) {
    return `Dear ${v(f.customerName, "customerName")},

Thank you for contacting Enphase.

We have received the Change of Ownership request for Site ID: ${v(f.siteId, "siteId")} and Case Number: ${v(f.caseNumber, "caseNumber")}. Upon review, we noticed ${discrepancyPhrase}.

To proceed with the change of ownership, we kindly request that you share a valid document that clearly matches your name and the system address.

Please provide one of the following documents for verification:
- Recent utility bill
- Bank statement
- Mortgage statement
- Property tax receipt
- Voter registration card
- Insurance card
- Driver's license

Kindly reply to this email with the updated document. If you have any questions or need further assistance, please feel free to reach out.

Warm regards,
Enphase Support Team`;
  }

  /* ============================================================
     Scenario Configurations
     ============================================================ */
  const SCENARIOS = [
    {
      id: "coo-normal", group: "Change of Ownership (COO)", category: "COO",
      label: "Transfer complete — system normal",
      desc: "Send once the COO is finished and today's health scan shows the system operating normally.",
      fields: ["customerName","siteId","systemName","ownerName","ownerEmail","ownerAddress","maintainerName","maintainerPhone","installerName","installerPhone"],
      emails: [{
        title: "Transfer Confirmation (Normal)", to: "Homeowner", cc: "",
        subject: f => `Enphase Update: Ownership Transfer (Site ID: ${v(f.siteId,"siteId")})`,
        body: (f, agent) => `Dear ${v(f.customerName,"customerName")},

Thank you for contacting Enphase.

This is regarding Site ID: ${v(f.siteId,"siteId")} with the system name "${v(f.systemName,"systemName")}". Ownership of the system has been successfully transferred to the new owner listed below.

New Owner Details:
Name: ${v(f.ownerName,"ownerName")}
Email: ${v(f.ownerEmail,"ownerEmail")}
Address: ${v(f.ownerAddress,"ownerAddress")}

You may update the system name via Menu > Account > My Information > System Name.

Access your system:
Enphase App: https://enphase.com/en-in/homeowners/enphase-app
Enlighten Web Portal: https://enlighten.enphaseenergy.com/
How-to Video: https://www.youtube.com/watch?v=ZAkoKI5rGvY

A health scan performed today confirms your system is fully operational. For future assistance contact your Maintainer (${v(f.maintainerName,"maintainerName")} at ${v(f.maintainerPhone,"maintainerPhone")}), Installer (${v(f.installerName,"installerName")} at ${v(f.installerPhone,"installerPhone")}), or Enphase Support at ${getSupportPhone()}.

Thank you for choosing Enphase.

Warm regards,
Enphase Support Team`
      }]
    },
    {
      id: "coo-not-normal", group: "Change of Ownership (COO)", category: "COO",
      label: "Transfer complete — system has an issue",
      desc: "Send when ownership has transferred but today's health scan flagged a problem.",
      fields: ["customerName","siteId","systemName","ownerName","ownerEmail","ownerAddress","issue","maintainerName","maintainerPhone","installerName","installerPhone"],
      emails: [{
        title: "Transfer Confirmation (Has Issue)", to: "Homeowner", cc: "",
        subject: f => `Enphase Update: Ownership Transfer (Site ID: ${v(f.siteId,"siteId")})`,
        body: (f, agent) => `Dear ${v(f.customerName,"customerName")},

Thank you for contacting Enphase.

This is regarding Site ID: ${v(f.siteId,"siteId")}, with the system name "${v(f.systemName,"systemName")}." The ownership has been successfully transferred to the new owner listed below.

New Owner Details:
Name: ${v(f.ownerName,"ownerName")}
Email: ${v(f.ownerEmail,"ownerEmail")}
Address: ${v(f.ownerAddress,"ownerAddress")}

During the ownership update, a health scan indicated the system requires troubleshooting for the ${v(f.issue,"issue")} issue. Please contact your Maintainer (${v(f.maintainerName,"maintainerName")} at ${v(f.maintainerPhone,"maintainerPhone")}) or Installer (${v(f.installerName,"installerName")} at ${v(f.installerPhone,"installerPhone")}). Alternatively, reach Enphase Support at ${getSupportPhone()}.

Warm regards,
Enphase Support Team`
      }]
    },
    {
      id: "coo-name-mismatch", group: "Change of Ownership (COO)", category: "COO",
      label: "Document request — name mismatch",
      desc: "The name on the request doesn't match the supporting ownership document.",
      fields: ["customerName","siteId","caseNumber"],
      emails: [{
        title: "Name Mismatch Email", to: "Homeowner", cc: "",
        subject: f => `Enphase Change of Ownership – Document Required (Site ID: ${v(f.siteId,"siteId")})`,
        body: (f, agent) => docRequestBody(f, "a discrepancy between the name provided in the request and the supporting ownership document")
      }]
    },
    {
      id: "coo-address-mismatch", group: "Change of Ownership (COO)", category: "COO",
      label: "Document request — address mismatch",
      desc: "The address on the request doesn't match the supporting ownership document.",
      fields: ["customerName","siteId","caseNumber"],
      emails: [{
        title: "Address Mismatch Email", to: "Homeowner", cc: "",
        subject: f => `Enphase Change of Ownership – Document Required (Site ID: ${v(f.siteId,"siteId")})`,
        body: (f, agent) => docRequestBody(f, "a discrepancy between the Address provided in the request and the supporting ownership document")
      }]
    },
    {
      id: "coo-name-address-mismatch", group: "Change of Ownership (COO)", category: "COO",
      label: "Document request — name & address mismatch",
      desc: "Both the name and address on the request don't match.",
      fields: ["customerName","siteId","caseNumber"],
      emails: [{
        title: "Name & Address Mismatch Email", to: "Homeowner", cc: "",
        subject: f => `Enphase Change of Ownership – Document Required (Site ID: ${v(f.siteId,"siteId")})`,
        body: (f, agent) => docRequestBody(f, "a discrepancy between the Name along with Address provided in the request and the supporting ownership document")
      }]
    },
    {
      id: "coo-docs-missing", group: "Change of Ownership (COO)", category: "COO",
      label: "Document request — documents not attached",
      desc: "The COO request came in without any supporting documents attached.",
      fields: ["customerName","siteId","caseNumber"],
      emails: [{
        title: "Missing Documents Email", to: "Homeowner", cc: "",
        subject: f => `Enphase Change of Ownership – Document Required (Site ID: ${v(f.siteId,"siteId")})`,
        body: (f, agent) => `Dear ${v(f.customerName,"customerName")},

Thank you for contacting Enphase.

We have received the Change of Ownership request for Site ID: ${v(f.siteId,"siteId")} as well as Case Number: ${v(f.caseNumber,"caseNumber")}. To proceed, please provide a valid document that matches your name and the system address.

Please provide one of the following:
- Recent utility bill
- Bank statement
- Mortgage statement
- Property tax receipt
- Voter registration card
- Insurance card
- Driver's license

Kindly reply to this email with the updated document.

Warm regards,
Enphase Support Team`
      }]
    },
    {
      id: "coo-lease-denial", group: "Change of Ownership (COO)", category: "COO",
      label: "Document request — lease site denial",
      desc: "The system is recorded as under an active lease.",
      fields: ["customerName","siteId","caseNumber","leaseOwner","refundAmount"],
      emails: [{
        title: "Lease Status Verification", to: "Homeowner", cc: "",
        subject: f => `Enphase Change of Ownership – Lease Status Verification (Site ID: ${v(f.siteId,"siteId")})`,
        body: (f, agent) => `Dear ${v(f.customerName,"customerName")},

Thank you for contacting Enphase.

We have received the Change of Ownership request for Site ID: ${v(f.siteId,"siteId")} and Case Number: ${v(f.caseNumber,"caseNumber")}. Our records indicate the system is currently under lease with ${v(f.leaseOwner,"leaseOwner")}.

If the system is still under an active lease, please contact your lease owner for any further changes. Based on your confirmation, we will initiate a refund of ${v(f.refundAmount,"refundAmount")} within 5–7 business days.

If the lease has been fully paid off, kindly share the lease completion or termination document so we may proceed.

Warm regards,
Enphase Support Team`
      }]
    },
    {
      id: "coo-existing-owner", group: "Change of Ownership (COO)", category: "COO",
      label: "Document request — requester already owner",
      desc: "The person requesting the transfer is already the owner on record.",
      fields: ["customerName","siteId","caseNumber"],
      emails: [{
        title: "Refund Notice Email", to: "Homeowner", cc: "",
        subject: f => `Enphase Change of Ownership – Refund Notice (Site ID: ${v(f.siteId,"siteId")})`,
        body: (f, agent) => `Dear ${v(f.customerName,"customerName")},

Thank you for contacting Enphase.

We have received the Change of Ownership request for Site ID: ${v(f.siteId,"siteId")} and Case Number: ${v(f.caseNumber,"caseNumber")}. As per our records, you are already the owner of this system. Therefore, no ownership transfer is needed.

We will initiate a refund for the amount paid, which should be credited to your account within 5–7 business days.

Warm regards,
Enphase Support Team`
      }]
    },
    {
      id: "coo-exceptions", group: "Change of Ownership (COO)", category: "COO",
      label: "Exceptions (Death / Divorce / Family)",
      desc: "Exception cases where fees are waived.",
      fields: ["siteId","caseNumber"],
      emails: [{
        title: "Exception Escalation to Monisha R", to: "Monisha R", cc: "Raghavendra",
        subject: f => `Site ID: ${v(f.siteId,"siteId")} → Exception Case (Death/Divorce)`,
        body: (f, agent) => `Hi Monisha,

This is an exception case.

Site ID: ${v(f.siteId,"siteId")}
Case ID: ${v(f.caseNumber,"caseNumber")}

Details:
- Ownership change due to death/divorce.
- Legal documents provided.

Kindly review and process without fee.

Thanks,
${agent}
Enphase Support Team`
      }]
    },
    {
      id: "coo-standard-steps", group: "Change of Ownership (COO)", category: "COO",
      label: "Standard transfer next steps",
      desc: "Guide the customer through the self-service ownership transfer page.",
      fields: ["customerName","siteId","caseNumber"],
      emails: [{
        title: "Self-Service Steps", to: "Homeowner", cc: "",
        subject: f => `Enphase System Ownership Transfer – Next Steps`,
        body: (f, agent) => `Dear Customer,

Thank you for contacting Enphase Energy. I hope this message finds you well.

Case Number: ${v(f.caseNumber,"caseNumber")}
Site ID: ${v(f.siteId,"siteId")}

To proceed with the change of ownership, please follow the steps below:

Step 1: Register with Enphase
https://enlighten.enphaseenergy.com/manager/registration

Step 2: Initiate the Ownership Transfer
https://enlighten.enphaseenergy.com/ownership_transfer
(Enter System ID or Gateway Serial Number)

Step 3: Provide Personal Details and Proof of Ownership
Upload a document verifying you are the new homeowner (e.g., property deed, utility bill, closing statement).

Step 4: Complete the Payment
A credit card payment is required. Once processed, the ownership change completes within 24–48 hours.

If you need assistance, please reply to this email.

Warm regards,
${agent}
Enphase Support Team`
      }]
    },
    {
      id: "doo-lease-a-to-b", group: "Declaration of Ownership (DOO)", category: "DOO",
      label: "Lease A to Lease B",
      desc: "Transfer between two leasing companies. Requires DOO form from Lease B owner.",
      fields: ["siteId","caseNumber"],
      emails: [
        {
          title: "1. Email to Lease B Company", to: "Leasing Company (Lease B)", cc: "",
          subject: f => `Site ID: ${v(f.siteId,"siteId")} → DOO Form Completion Required`,
          body: (f, agent) => `Hi Team,

This email is regarding Case ID: ${v(f.caseNumber,"caseNumber")}
Site ID: ${v(f.siteId,"siteId")}

I've attached the Enphase Document of Declaration (DOO) Form. We kindly ask you to:
1. Review the form carefully
2. Fill in the required details manually
3. Sign the form by hand (please do not type your signature)
4. Reply with the signed DOO copy and your Lease completion document.

Thank you for your time and cooperation.

Warm regards,
${agent}
Enphase Support Team`
        },
        {
          title: "2. Email to Monisha R", to: "Monisha R", cc: "Raghavendra",
          subject: f => `Site ID: ${v(f.siteId,"siteId")} → DOO Request – Lease A to Lease B`,
          body: (f, agent) => `Hi Monisha,

Site ID: ${v(f.siteId,"siteId")}
Case ID: ${v(f.caseNumber,"caseNumber")}
Type: Lease A to Lease B
Email of the Lease B to be on ENL: 

The DOO form has been updated by the Lease B owner and is attached.

Please let me know the ETA for this case.

Thank you,
${agent}`
        }
      ]
    },
    {
      id: "doo-lease-to-resi", group: "Declaration of Ownership (DOO)", category: "DOO",
      label: "Lease/PPA to Residential",
      desc: "Lease buyout scenario. Collect lease completion document and DOO form.",
      fields: ["customerName","siteId","caseNumber"],
      emails: [
        {
          title: "1. Email to Homeowner", to: "Homeowner", cc: "",
          subject: f => `Site ID: ${v(f.siteId,"siteId")} → Documents Needed to Complete Your Enphase Ownership Verification`,
          body: (f, agent) => `Dear ${v(f.customerName,"customerName")},

Case ID: ${v(f.caseNumber,"caseNumber")}
Site ID: ${v(f.siteId,"siteId")}

Step 1: Please share the Lease completion document / certificate.

Step 2: I've attached the Enphase DOO Form. Please:
1. Fill in required details manually
2. Sign by hand (no typed signatures)
3. Reply with the signed DOO copy.

Once received, I'll reach out to the COO team and keep you updated.

Warm regards,
${agent}
Enphase Support Team`
        },
        {
          title: "2. Email to Monisha R", to: "Monisha R", cc: "Raghavendra",
          subject: f => `Site ID: ${v(f.siteId,"siteId")} → Documents Attached – Lease to Residential`,
          body: (f, agent) => `Hi Monisha,

Site ID: ${v(f.siteId,"siteId")}
Case ID: ${v(f.caseNumber,"caseNumber")}
Type: Lease to Residential
Email of the HO to be on ENL: 

Homeowner has completed the lease. Lease completion + DOO form are attached.
Please let me know the ETA.

Thank you,
${agent}`
        }
      ]
    },
    {
      id: "doo-misconfig-resi-lease", group: "Declaration of Ownership (DOO)", category: "DOO",
      label: "Misconfig: Resi tagged as Lease",
      desc: "Residential system incorrectly marked as Lease. Collect cash proof + DOO form.",
      fields: ["customerName","siteId","caseNumber"],
      emails: [
        {
          title: "1. Email to Homeowner", to: "Homeowner", cc: "",
          subject: f => `Misconfigured Site Correction Needs Solar Purchase Proof & Updated DOO Form`,
          body: (f, agent) => `Dear ${v(f.customerName,"customerName")},

Case ID: ${v(f.caseNumber,"caseNumber")}
Site ID: ${v(f.siteId,"siteId")}

The site appears to be Residential but is currently tagged as Lease. To proceed:

Step 1: Share the solar purchase proof (cash purchase confirmation).
Step 2: Complete the attached DOO form (fill, sign by hand, reply with signed copy).

Once received, I'll coordinate with the COO team and update you.

Warm regards,
${agent}
Enphase Support Team`
        },
        {
          title: "2. Email to Raghavendra Kumar S", to: "Raghavendra Kumar S", cc: "Supervisor",
          subject: f => `Site ID: ${v(f.siteId,"siteId")} → Misconfigured Site Correction – Documents Received`,
          body: (f, agent) => `Hello Raghavendra,

Case ID: ${v(f.caseNumber,"caseNumber")}
Site ID: ${v(f.siteId,"siteId")}
Type: Site Misconfigured as Lease

Documents received:
1. Solar purchase proof (cash)
2. Signed DOO form

Please review and proceed with the COO update.

Thank you,
${agent}`
        }
      ]
    },
    {
      id: "doo-misconfig-lease-resi", group: "Declaration of Ownership (DOO)", category: "DOO",
      label: "Misconfig: Lease tagged as Resi",
      desc: "Lease system incorrectly marked as Residential. Collect lease agreement + DOO form.",
      fields: ["customerName","siteId","caseNumber"],
      emails: [
        {
          title: "1. Email to Leasing Company/Host", to: "Leasing Company / System Host", cc: "",
          subject: f => `Misconfigured Site Correction Needs Lease Document & Updated DOO Form`,
          body: (f, agent) => `Dear ${v(f.customerName,"customerName")},

Case ID: ${v(f.caseNumber,"caseNumber")}
Site ID: ${v(f.siteId,"siteId")}

The site appears to be Lease but is currently tagged as Residential. To proceed:

Step 1: Share the lease agreement between the system host and the lease company.
Step 2: Complete the attached DOO form (fill, sign by hand, reply with signed copy + lease agreement).

Warm regards,
${agent}
Enphase Support Team`
        },
        {
          title: "2. Email to Monisha R", to: "Monisha R", cc: "Supervisor",
          subject: f => `Site ID: ${v(f.siteId,"siteId")} → Misconfigured Site – Documents Received`,
          body: (f, agent) => `Hi Monisha,

Case ID: ${v(f.caseNumber,"caseNumber")}
Site ID: ${v(f.siteId,"siteId")}
Type: Site Misconfigured as Residential

Documents received:
1. Lease Document
2. Signed DOO form

Please review and let me know the ETA.

Thank you,
${agent}`
        }
      ]
    },
    {
      id: "admin-sold-remove", group: "Administrative / Guidelines", category: "Other",
      label: "Sold system — remove owner",
      desc: "Remove owner from site when system is sold. Guidelines only.",
      fields: ["siteId"], emails: [],
      guidelines: `SOLD SYSTEM / REMOVE OWNER CHECKLIST:

Step 1: Verify Owner Identity
- Confirm you are speaking with the listed Site Owner.
- Ask them to verify the registered email on file.

Step 2: Collect New Owner Details
- Record Name, Phone, Email in the Salesforce case.

Step 3: Check for Final Reports
- Ask if they need historical reports before proceeding.

Step 4: Remove Owner (Enlighten Admin)
1. Go to Enlighten Admin → Access / Edit.
2. Scroll to System Roles → set Owner to "None".
3. Click 'Update System Roles'.
4. Click the trash icon next to the user's name.
5. Refresh to confirm changes.

Note: DO NOT add the new owner yourself. They must follow the COO registration process.`
    },
    {
      id: "admin-payment-issues", group: "Administrative / Guidelines", category: "Other",
      label: "Payment issues (COO/DOO)",
      desc: "Escalate double charges, refunds, or payment gateway failures.",
      fields: ["siteId","caseNumber"],
      emails: [{
        title: "Escalation to Anubhava P C", to: "Anubhava P C", cc: "Supervisor",
        subject: f => `Site ID: ${v(f.siteId,"siteId")} → Payment Issue (COO/DOO)`,
        body: (f, agent) => `Hi Anubhava,

Site ID: ${v(f.siteId,"siteId")}
Case ID: ${v(f.caseNumber,"caseNumber")}

Issue: Double charge / refund problem / transaction failure during COO/DOO.
Transaction details are attached.

Kindly review and let me know if additional documents are required.

Thank you,
${agent}
Enphase Support Team`
      }]
    },
    {
      id: "admin-other-scenarios", group: "Administrative / Guidelines", category: "Other",
      label: "Other scenarios (Host, Builders, etc.)",
      desc: "Reference guidelines for special scenarios.",
      fields: ["siteId","caseNumber"], emails: [],
      guidelines: `SPECIAL SCENARIOS REFERENCE GUIDE:

1. Host Change (Lease Site):
- Only system/lease owner can request changes.
- If request from host → refer to lease company.

2. Lease Site (1st → 2nd Owner):
- 2nd owner pays $199 for ownership transfer.
- Submit via Enphase App / Web / Store.

3. Lease Company Out of Business:
- Escalate to Raghavendra Kumar S via Salesforce.

4. Payment Failed (Residential COO):
- Collect transaction proof.
- Send details to Monisha R via Salesforce.

5. Third-Party Installer Takeover:
- Collect DOO form from new installer.
- Send to Monisha R (TAT: 7 working days).

6. Builder Ownership Transfer:
- First owner: No charge, builder submits DOO → Monisha R.
- Second owner: Standard COO process ($199 fee).`
    }
  ];

  /* ============================================================
     State & Persistence
     ============================================================ */
  const STORAGE_KEY = "mailforge-state-v2";
  const LOCAL_DB_KEY = "mailforge-local-cases";

  let state = loadState();
  let currentScenarioId = state._lastScenario || SCENARIOS[0].id;
  let agentUsername = localStorage.getItem("mailforge-username") || "Support Agent";
  let isBackendOnline = true;
  let _enlPoll = null;
  let lastScanData = null;

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }
  function getFields(id) {
    if (!state[id]) state[id] = {};
    return state[id];
  }

  /* ============================================================
     Toast Notifications
     ============================================================ */
  function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "✓" : type === "error" ? "✗" : "ℹ";
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(20px)";
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  /* ============================================================
     Backend API — Hybrid (server or localStorage fallback)
     ============================================================ */
  async function apiFetch(url, options = {}) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(url, { ...options, signal: ctrl.signal });
      clearTimeout(tid);
      if (!res.ok) throw new Error("Server error");
      isBackendOnline = true;
      updateStatusUI(true);
      return await res.json();
    } catch {
      isBackendOnline = false;
      updateStatusUI(false);
      return localFallback(url, options);
    }
  }

  function updateStatusUI(online) {
    const dot  = document.getElementById("status-dot");
    const txt  = document.getElementById("status-text");
    if (!dot || !txt) return;
    dot.className = online ? "status-dot online" : "status-dot offline";
    txt.textContent = online ? "Server Online" : "Local Storage Mode";
  }

  function localFallback(url, options = {}) {
    let cases = [];
    try { cases = JSON.parse(localStorage.getItem(LOCAL_DB_KEY)) || []; } catch {}
    if (url === "/api/cases" && options.method === "POST") {
      const d = JSON.parse(options.body);
      const entry = { id: Math.random().toString(36).slice(2), scenario: d.scenario, region: d.region || "Other / Unspecified", category: d.category || "Other", at: new Date().toISOString() };
      cases.push(entry);
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(cases));
      return entry;
    }
    if (url === "/api/regions") return ["US / NA","Germany","Austria","Switzerland","Netherlands","Belgium","France","Luxembourg","UK","Spain","Other / Unspecified"];
    if (url === "/api/analytics") return computeLocalAnalytics(cases);
    if (url === "/api/cases/clear" && options.method === "POST") { localStorage.removeItem(LOCAL_DB_KEY); return { status: "success" }; }
    return {};
  }

  function computeLocalAnalytics(cases) {
    const regions = ["US / NA","Germany","Austria","Switzerland","Netherlands","Belgium","France","Luxembourg","UK","Spain","Other / Unspecified"];
    const byRegion = {}; regions.forEach(r => byRegion[r] = 0);
    const byCategory = { COO:0, DOO:0, Other:0 };
    const byScenario = {};
    cases.forEach(c => {
      byCategory[c.category || "Other"] = (byCategory[c.category || "Other"] || 0) + 1;
      byRegion[c.region || "Other / Unspecified"] = (byRegion[c.region || "Other / Unspecified"] || 0) + 1;
      byScenario[c.scenario || "unknown"] = (byScenario[c.scenario || "unknown"] || 0) + 1;
    });
    const getBucket = (str, gran) => {
      const d = new Date(str);
      if (gran === "day") return d.toISOString().slice(0,10);
      if (gran === "month") return d.toISOString().slice(0,7);
      const t = new Date(d); t.setDate(t.getDate() - ((t.getDay()+6)%7)+3);
      const y = t.getFullYear(); const ft = new Date(y,0,4);
      const wk = 1 + Math.round(((t-ft)/86400000-3+((ft.getDay()+6)%7))/7);
      return `${y}-W${String(wk).padStart(2,"0")}`;
    };
    const mkSeries = (gran, count) => {
      const buckets = {};
      cases.forEach(c => { const k = getBucket(c.at, gran); buckets[k] = (buckets[k]||0)+1; });
      const out = []; const now = new Date();
      for (let i = count-1; i >= 0; i--) {
        const d = new Date(now);
        if (gran==="day") d.setDate(now.getDate()-i);
        else if (gran==="week") d.setDate(now.getDate()-i*7);
        else { d.setDate(1); d.setMonth(now.getMonth()-i); }
        const k = getBucket(d.toISOString(), gran);
        out.push({ period: k, count: buckets[k]||0 });
      }
      return out;
    };
    return { total: cases.length, byRegion: Object.entries(byRegion).map(([region,count])=>({region,count})), byCategory: Object.entries(byCategory).map(([category,count])=>({category,count})), byScenario: Object.entries(byScenario).map(([scenario,count])=>({scenario,count})), daily: mkSeries("day",30), weekly: mkSeries("week",12), monthly: mkSeries("month",12) };
  }

  /* ============================================================
     Enlighten Scraper Integration
     ============================================================ */
  function setEnlStatus(state, label) {
    const dot = document.getElementById("enl-dot");
    const lbl = document.getElementById("enl-session-label");
    if (!dot || !lbl) return;
    dot.className = "enl-dot" + (state==="ok"?" ok":state==="wait"?" wait":" no");
    lbl.textContent = label;
  }

  async function startEnlightenLogin(fromWall) {
    const btn   = document.getElementById("enl-login-btn");
    const lwBtn = document.getElementById("lw-login-btn");
    const setLoading = (t) => { if(btn) { btn.disabled=true; btn.textContent=t; } if(lwBtn) { lwBtn.disabled=true; lwBtn.textContent=t; } };
    const setReady = () => { if(btn) { btn.disabled=false; btn.textContent="Login to Enlighten"; } if(lwBtn) { lwBtn.disabled=false; lwBtn.textContent="Login to Enlighten"; } };
    setLoading("Opening browser…");
    setEnlStatus("wait","Waiting for login…");
    try {
      await fetch("/api/enlighten/login", { method: "POST" });
      _enlPoll = setInterval(async () => {
        try {
          const d = await (await fetch("/api/enlighten/login-status")).json();
          if (d.status === "success") {
            clearInterval(_enlPoll);
            setEnlStatus("ok","Session active");
            setReady();
            if (fromWall) dismissLoginWall();
          } else if (d.status === "timeout" || d.status === "error") {
            clearInterval(_enlPoll);
            const msg = d.detail || "Login failed — try again";
            setEnlStatus("no", msg.length > 60 ? msg.slice(0,60)+"…" : msg);
            alert("Login error:\n\n" + (d.detail || "Unknown error."));
            setReady();
          }
        } catch {}
      }, 2500);
    } catch {
      setEnlStatus("no","Error starting browser");
      setReady();
    }
  }

  async function fetchFromEnlighten() {
    const siteId = (document.getElementById("enl-site-id").value || "").trim();
    if (!siteId) { showToast("Enter a Site ID first", "error"); return; }
    const btn  = document.getElementById("enl-fetch-btn");
    btn.disabled = true; btn.textContent = "Scanning…";
    const dash = document.getElementById("site-health-dashboard");
    if (dash) dash.style.display = "none";
    try {
      const d = await (await fetch("/api/enlighten/fetch-site?site_id=" + encodeURIComponent(siteId))).json();
      if (d.status === "success") {
        lastScanData = d.data;
        autoFillFields(d.data);
        renderHealthDashboard(d.data);
        setEnlStatus("ok","Session active — site scanned");
        showToast("Site scanned successfully", "success");
      } else {
        showToast("Error: " + d.message, "error");
      }
    } catch (e) {
      showToast("Network error: " + e.message, "error");
    } finally {
      btn.disabled = false; btn.textContent = "Scan Site";
    }
  }

  function autoFillFields(data) {
    const instName  = data.installer_name || data.maintainer_name || "";
    const instPhone = data.installer_phone || data.company_support_phone || data.maintainer_phone || "";
    const instEmail = data.installer_email || data.company_support_email || "";
    const maintName  = data.maintainer_name || data.installer_name || "";
    const maintPhone = data.maintainer_phone || data.installer_phone || "";

    const MAP = {
      "field-systemName":      data.system_name || "",
      "field-installerName":   instName,
      "field-installerPhone":  instPhone,
      "field-maintainerName":  maintName,
      "field-maintainerPhone": maintPhone,
    };
    Object.entries(MAP).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val) { el.value = val; el.dispatchEvent(new Event("input")); }
    });
    if (data.alarms && data.alarms.length > 0) {
      const el = document.getElementById("field-issue");
      if (el && !el.value) { el.value = data.alarms[0].event_type; el.dispatchEvent(new Event("input")); }
    }
  }

  function renderHealthDashboard(data) {
    const dash = document.getElementById("site-health-dashboard");
    if (!dash) return;

    const hasIssues  = data.has_issues;
    const alarms     = data.alarms || [];
    const alarmCount = data.alarm_count || 0;
    const statusCls  = hasIssues ? "issues" : "normal";
    const statusTxt  = hasIssues ? "⚠ Has Issues" : "✓ Normal";

    let contactsHtml = "";
    const buildContact = (role, name, phone, email, website) => {
      if (!name) return "";
      return `<div class="health-contact-block">
        <div class="health-contact-role">${role}</div>
        <div class="health-contact-name">${name}</div>
        ${phone ? `<div class="health-contact-line">📞 <a href="tel:${phone}">${phone}</a></div>` : ""}
        ${email ? `<div class="health-contact-line">✉ <a href="mailto:${email}">${email}</a></div>` : ""}
        ${website ? `<div class="health-contact-line">🌐 <a href="${website}" target="_blank" rel="noopener">${website.replace(/^https?:\/\//,"")}</a></div>` : ""}
      </div>`;
    };
    const instBlock  = buildContact("PV Installer",  data.installer_name,  data.installer_phone  || data.company_support_phone, data.installer_email  || data.company_support_email, data.installer_website || data.company_website);
    const maintBlock = buildContact("Maintainer",    data.maintainer_name, data.maintainer_phone, data.maintainer_email, "");
    if (instBlock || maintBlock)
      contactsHtml = `<div class="health-contacts">${instBlock}${maintBlock || "<div class='health-contact-block'><div class='health-cell-value muted'>No maintainer on record</div></div>"}</div>`;

    let alarmsHtml = "";
    if (alarmCount === 0) {
      alarmsHtml = `<div class="alarm-no-alarms">✓ No standing alarms</div>`;
    } else {
      const rows = alarms.map(a => {
        const cls = (a.impact||"").toLowerCase().includes("gateway") ? "alarm-type-gateway" : "alarm-type-micro";
        return `<tr>
          <td class="${cls}">${a.impact || "—"}</td>
          <td>${a.device || "—"}</td>
          <td>${a.event_type || "—"}</td>
          <td>${a.started || "—"}</td>
        </tr>`;
      }).join("");
      alarmsHtml = `<table class="alarms-table">
        <thead><tr><th>Type</th><th>Device</th><th>Event</th><th>Since</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    dash.innerHTML = `
      <div class="health-dashboard-header">
        <div>
          <div class="health-title">Site Health — ${data.system_name || data.site_id}</div>
          <div class="health-site-meta">ID: ${data.site_id} &nbsp;·&nbsp; ${data.address ? data.address.split("\n")[0] : ""}</div>
        </div>
        <span class="status-badge ${statusCls}">${statusTxt}</span>
      </div>
      <div class="health-grid">
        <div class="health-cell"><div class="health-cell-label">PV Modules</div><div class="health-cell-value">${data.pv_type || "—"}</div></div>
        <div class="health-cell"><div class="health-cell-label">Devices</div><div class="health-cell-value">${data.device_types || "—"}</div></div>
        <div class="health-cell"><div class="health-cell-label">Gateway</div><div class="health-cell-value">${data.gateway_status || "—"}</div></div>
        <div class="health-cell"><div class="health-cell-label">Alarms</div><div class="health-cell-value">${alarmCount > 0 ? alarmCount+" standing alarm(s)" : "None"}</div></div>
      </div>
      ${contactsHtml}
      <div class="health-alarms">
        <div class="alarms-header">
          Standing Alarms
          <span class="alarm-count-badge ${alarmCount===0?"ok":""}">${alarmCount===0?"Clear":alarmCount+" alarm"+(alarmCount>1?"s":"")}</span>
        </div>
        ${alarmsHtml}
      </div>
    `;
    dash.style.display = "block";
  }

  function dismissLoginWall() {
    const wall = document.getElementById("login-wall");
    if (wall) wall.classList.add("hidden");
  }

  async function checkSessionOnLoad() {
    try {
      const d = await (await fetch("/api/enlighten/check-session")).json();
      if (d.status === "active") {
        setEnlStatus("ok", "Session active");
        dismissLoginWall();
      } else if (d.status === "unavailable") {
        setEnlStatus("no", "Scanner not available");
      } else {
        setEnlStatus("no", "Not logged in");
        if (!d.has_file) {
          setTimeout(() => startEnlightenLogin(true), 1000);
        }
      }
    } catch {
      setEnlStatus("no", "Session check failed");
    }
  }

  /* ============================================================
     Compose UI
     ============================================================ */
  const scenarioSelect  = document.getElementById("scenario-select");
  const scenarioBadgeEl = document.getElementById("scenario-badge");
  const scenarioDescEl  = document.getElementById("scenario-desc");
  const formFieldsEl    = document.getElementById("dynamic-form-fields");
  const draftsEl        = document.getElementById("email-drafts-container");

  function applyLastScanToFields(scenarioFields, values, scenario) {
    if (!lastScanData) return;
    const d = lastScanData;
    const SCAN_MAP = {
      siteId:          d.site_id || "",
      systemName:      d.system_name || "",
      installerName:   d.installer_name || d.maintainer_name || "",
      installerPhone:  d.installer_phone || d.company_support_phone || d.maintainer_phone || "",
      maintainerName:  d.maintainer_name || d.installer_name || "",
      maintainerPhone: d.maintainer_phone || d.installer_phone || "",
      issue:           (d.alarms && d.alarms.length > 0 ? d.alarms[0].event_type : "") || "",
    };
    scenarioFields.forEach(key => {
      if (!SCAN_MAP[key]) return;
      const el = document.getElementById(`field-${key}`);
      if (el && !el.value) {
        el.value = SCAN_MAP[key];
        el.dispatchEvent(new Event("input"));
      }
    });
  }

  function selectScenario(id) {
    currentScenarioId = id;
    state._lastScenario = id;
    saveState();
    if (scenarioSelect && scenarioSelect.value !== id) scenarioSelect.value = id;
    const scenario = SCENARIOS.find(s => s.id === id);
    if (!scenario) return;
    scenarioDescEl.textContent = scenario.desc;
    scenarioBadgeEl.textContent = scenario.group;
    scenarioBadgeEl.className = `badge ${scenario.category.toLowerCase()}`;
    const values = getFields(id);
    const regionSel = document.getElementById("region-select");
    if (regionSel && regionSel.options.length) regionSel.value = values._region || regionSel.options[0].value;
    formFieldsEl.innerHTML = "";
    scenario.fields.forEach(key => {
      const def = FIELD_DEFS[key] || { label: key, placeholder: `Enter ${key}` };
      const group = document.createElement("div");
      group.className = "form-group";
      const label = document.createElement("label");
      label.textContent = def.label;
      label.setAttribute("for", `field-${key}`);
      group.appendChild(label);
      const isLong = key === "ownerAddress" || key === "issue";
      const input = document.createElement(isLong ? "textarea" : "input");
      input.id = `field-${key}`;
      input.className = "form-control";
      input.placeholder = def.placeholder;
      input.value = values[key] || "";
      if (isLong) input.rows = 3;
      input.addEventListener("input", () => { values[key] = input.value; saveState(); updatePreview(scenario, values); });
      if (key === "siteId") {
        const wrap = document.createElement("div");
        wrap.className = "site-id-input-wrapper";
        wrap.appendChild(input);
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "btn-lookup";
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Open`;
        btn.addEventListener("click", () => {
          const id = input.value.trim();
          if (!id) { showToast("Enter a Site ID first","error"); return; }
          window.open(`https://enlighten.enphaseenergy.com/admin/sites/${encodeURIComponent(id)}`,"_blank","noopener");
        });
        wrap.appendChild(btn);
        group.appendChild(wrap);
      } else {
        group.appendChild(input);
      }
      formFieldsEl.appendChild(group);
    });
    applyLastScanToFields(scenario.fields, values, scenario);
    updatePreview(scenario, values);
    const custBtn = document.getElementById("btn-customize-scenario");
    if (custBtn) custBtn.innerHTML = scenario._isCustom ? "&#9998; Edit Template" : "&#9998; Customize";
  }

  function highlightPlaceholders(text) {
    if (!text) return "";
    return text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
               .replace(/\[\[([^\]]+)\]\]/g,'<span class="placeholder-tag">[$1]</span>');
  }

  function customizeCurrentScenario() {
    const scenario = SCENARIOS.find(s => s.id === currentScenarioId);
    if (!scenario) return;
    if (scenario._isCustom) {
      const tpl = _customTemplates.find(t => t.id === scenario._templateId);
      if (tpl) openEditTemplateModal(tpl);
    } else {
      _customizeScenarioAsTemplate(scenario);
    }
  }

  function _customizeScenarioAsTemplate(scenario) {
    const email = scenario.emails && scenario.emails[0];
    const dummyF = {};
    scenario.fields && scenario.fields.forEach(k => { dummyF[k] = `[[${FIELD_DEFS[k]?FIELD_DEFS[k].label:k}]]`; });
    const bodyText  = email ? email.body(dummyF, "[[Agent Name]]") : "";
    const subjText  = email ? email.subject(dummyF) : scenario.label;
    openNewTemplateModal({
      label:            `${scenario.label} (custom)`,
      to_template:      email ? email.to : "Recipient",
      cc:               email ? (email.cc || "") : "",
      subject_template: subjText,
      body_template:    bodyText
    });
  }

  function updatePreview(scenario, values) {
    draftsEl.innerHTML = "";
    if (scenario.emails.length === 0 && scenario.guidelines) {
      const card = document.createElement("div");
      card.className = "card guidelines-card";
      card.innerHTML = `<div class="guide-steps-header">Guidance & SOPs</div><pre class="guide-steps">${scenario.guidelines}</pre><div class="email-actions" style="border-top:1px solid var(--border-color);margin-top:16px;padding:12px 0 0"><button class="btn btn-primary" id="btn-log-guide">Log Case Completion</button></div>`;
      card.querySelector("#btn-log-guide").addEventListener("click", () => logCase(scenario.id, scenario.category));
      draftsEl.appendChild(card);
      return;
    }
    scenario.emails.forEach((emailDef, idx) => {
      const subject = emailDef.subject(values);
      const body    = emailDef.body(values, agentUsername);
      const card = document.createElement("div");
      card.className = "email-card";
      card.innerHTML = `
        <div class="email-card-header">
          <div class="email-recipient-meta"><span class="email-meta-label">TO:</span><span class="email-meta-value">${emailDef.to}</span></div>
          ${emailDef.cc ? `<div class="email-recipient-meta"><span class="email-meta-label">CC:</span><span class="email-meta-value">${emailDef.cc}</span></div>` : ""}
          <div class="email-subject-line"><span class="email-meta-label">SUB:</span><span class="email-subject-val">${highlightPlaceholders(subject)}</span></div>
        </div>
        <div class="email-body-text">${highlightPlaceholders(body)}</div>
        <div class="email-actions">
          <button class="btn btn-secondary btn-copy-body">Copy Body</button>
          <button class="btn btn-secondary btn-copy-full">Copy Full Email</button>
          <button class="btn btn-secondary btn-download">Download .txt</button>
          <button class="btn btn-success btn-log-case">Log This Case</button>
          <button class="btn btn-secondary btn-clear-fields">Clear Fields</button>
          ${!scenario._isCustom ? `<button class="btn btn-secondary btn-customize" title="Save as editable custom template">✏ Customize</button>` : ""}
        </div>`;
      card.querySelector(".btn-copy-body").addEventListener("click", e => { navigator.clipboard.writeText(body).then(() => flashBtn(e.target,"✓ Copied!")); });
      card.querySelector(".btn-copy-full").addEventListener("click", e => { navigator.clipboard.writeText(`To: ${emailDef.to}\n${emailDef.cc?`Cc: ${emailDef.cc}\n`:""}Subject: ${subject}\n\n${body}`).then(() => flashBtn(e.target,"✓ Email Copied!")); });
      card.querySelector(".btn-download").addEventListener("click", () => {
        const blob = new Blob([`To: ${emailDef.to}\n${emailDef.cc?`Cc: ${emailDef.cc}\n`:""}Subject: ${subject}\n\n${body}`], {type:"text/plain;charset=utf-8"});
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${scenario.id}-${idx+1}.txt`; a.click(); URL.revokeObjectURL(a.href);
        showToast("Downloaded","success");
      });
      card.querySelector(".btn-log-case").addEventListener("click", () => logCase(scenario.id, scenario.category));
      card.querySelector(".btn-clear-fields").addEventListener("click", () => { state[scenario.id] = {}; saveState(); selectScenario(scenario.id); showToast("Fields cleared","info"); });
      const custBtn = card.querySelector(".btn-customize");
      if (custBtn) custBtn.addEventListener("click", () => _customizeScenarioAsTemplate(scenario));
      draftsEl.appendChild(card);
    });
  }

  function flashBtn(btn, text) {
    const orig = btn.textContent;
    btn.textContent = text; btn.style.color = "var(--doo-color)";
    setTimeout(() => { btn.textContent = orig; btn.style.color = ""; }, 1500);
    showToast(text.replace("✓ ",""),"success");
  }

  async function logCase(scenarioId, category) {
    const regionSel = document.getElementById("region-select");
    const payload = { scenario: scenarioId, category, region: regionSel ? regionSel.value : "Other / Unspecified" };
    try {
      await apiFetch("/api/cases", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      showToast("Case logged"+(isBackendOnline?" to server":" locally"),"success");
    } catch { showToast("Could not log case","error"); }
  }

  /* ============================================================
     Analytics Tab
     ============================================================ */
  let activeGranularity = "day";
  let activeCharts = {};

  document.querySelectorAll(".timeline-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".timeline-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeGranularity = tab.dataset.granularity;
      loadAnalytics();
    });
  });

  async function loadAnalytics() {
    try {
      const data = await apiFetch("/api/analytics");
      document.getElementById("metric-total").textContent = data.total;
      document.getElementById("metric-coo").textContent = (data.byCategory.find(c=>c.category==="COO")||{count:0}).count;
      document.getElementById("metric-doo").textContent = (data.byCategory.find(c=>c.category==="DOO")||{count:0}).count;
      renderTimelineChart(data);
      renderRegionChart(data);
      renderCategoryChart(data);
      renderStatsTable(data);
    } catch { showToast("Error loading analytics","error"); }
  }

  function renderTimelineChart(data) {
    const canvas = document.getElementById("chart-timeline");
    if (!canvas) return;
    if (activeCharts.timeline) activeCharts.timeline.destroy();
    const src = activeGranularity==="day" ? data.daily : activeGranularity==="week" ? data.weekly : data.monthly;
    activeCharts.timeline = new Chart(canvas, {
      type:"bar", data:{ labels: src.map(d=>activeGranularity==="day"?d.period.slice(5):d.period), datasets:[{ label:"Logged Cases", data:src.map(d=>d.count), backgroundColor:"#F97316", borderRadius:6, maxBarThickness:32 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,grid:{color:"#F1F5F9"},ticks:{precision:0,color:"#64748B"}}, x:{grid:{display:false},ticks:{color:"#64748B"}} } }
    });
  }

  function renderRegionChart(data) {
    const canvas = document.getElementById("chart-region");
    if (!canvas) return;
    if (activeCharts.region) activeCharts.region.destroy();
    const filtered = data.byRegion.filter(r=>r.count>0);
    const COLORS = ["#F97316","#3B82F6","#10B981","#EC4899","#8B5CF6","#F59E0B","#14B8A6","#EF4444","#64748B","#6B7280"];
    activeCharts.region = new Chart(canvas, {
      type:"doughnut", data:{ labels:filtered.length?filtered.map(r=>r.region):["No Data"], datasets:[{data:filtered.length?filtered.map(r=>r.count):[1],backgroundColor:filtered.length?COLORS:["#E2E8F0"],borderWidth:2,borderColor:"#FFF"}] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:"right",labels:{boxWidth:12,font:{size:11,weight:600},color:"#64748B"}}}, cutout:"65%" }
    });
  }

  function renderCategoryChart(data) {
    const canvas = document.getElementById("chart-category");
    if (!canvas) return;
    if (activeCharts.category) activeCharts.category.destroy();
    const coo = (data.byCategory.find(c=>c.category==="COO")||{count:0}).count;
    const doo = (data.byCategory.find(c=>c.category==="DOO")||{count:0}).count;
    const oth = (data.byCategory.find(c=>c.category==="Other")||{count:0}).count;
    const hasData = data.total > 0;
    activeCharts.category = new Chart(canvas, {
      type:"doughnut", data:{ labels:["COO","DOO","Administrative"], datasets:[{data:hasData?[coo,doo,oth]:[1],backgroundColor:hasData?["#3B82F6","#10B981","#64748B"]:["#E2E8F0"],borderWidth:2,borderColor:"#FFF"}] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:"right",labels:{boxWidth:12,font:{size:11,weight:600},color:"#64748B"}}}, cutout:"65%" }
    });
  }

  function renderStatsTable(data) {
    const tbody = document.getElementById("scenario-stats-table");
    if (!tbody) return;
    tbody.innerHTML = "";
    const counts = {};
    data.byScenario.forEach(s => counts[s.scenario] = s.count);
    [...SCENARIOS].sort((a,b)=>(counts[b.id]||0)-(counts[a.id]||0)).forEach(scen => {
      const row = document.createElement("tr");
      const cls = scen.category==="COO"?"badge coo":scen.category==="DOO"?"badge doo":"badge other";
      row.innerHTML = `<td><strong>${scen.label}</strong></td><td><span class="${cls}">${scen.category}</span></td><td class="text-right"><strong>${counts[scen.id]||0}</strong></td>`;
      tbody.appendChild(row);
    });
  }

  /* ============================================================
     Custom Email Templates
     ============================================================ */
  const CUSTOM_PREFIX = "custom-";
  let _customTemplates = [];
  let _editingTemplateId = null;
  let _lastFocusedTplField = "ctpl-body";

  const AVAILABLE_PLACEHOLDERS = [
    { key: "Agent Name",          hint: "Your name — auto-filled from sidebar" },
    { key: "Customer Name",       hint: "The customer's full name" },
    { key: "Site ID",             hint: "Enlighten site ID number" },
    { key: "System Name",         hint: "Name of the solar system" },
    { key: "New Owner \u2014 Name",    hint: "New owner's full name" },
    { key: "New Owner \u2014 Email",   hint: "New owner's email address" },
    { key: "New Owner \u2014 Address", hint: "New owner's street address" },
    { key: "Installer \u2014 Name",   hint: "Installer company or contact name" },
    { key: "Installer \u2014 Phone",  hint: "Installer phone number" },
    { key: "Maintainer \u2014 Name",  hint: "Maintainer company or contact name" },
    { key: "Maintainer \u2014 Phone", hint: "Maintainer phone number" },
    { key: "Issue",               hint: "Description of the issue or alarm" },
    { key: "Support Phone",       hint: "Enphase regional support number" },
  ];

  function renderPlaceholderChips() {
    const c = document.getElementById("tpl-ph-chips");
    if (!c || c.children.length) return;
    AVAILABLE_PLACEHOLDERS.forEach(ph => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = ph.hint;
      btn.textContent = ph.key;
      btn.style.cssText = "display:inline-flex;align-items:center;padding:3px 9px;border:1px solid #e2e8f0;border-radius:20px;background:#f8fafc;font-size:11px;font-weight:600;color:#475569;cursor:pointer;font-family:var(--font-sans);white-space:nowrap;transition:background .1s,border-color .1s,color .1s";
      btn.addEventListener("mousedown", e => e.preventDefault());
      btn.addEventListener("mouseenter", () => { btn.style.background="#fff7ed"; btn.style.borderColor="var(--primary)"; btn.style.color="var(--primary)"; });
      btn.addEventListener("mouseleave", () => { btn.style.background="#f8fafc"; btn.style.borderColor="#e2e8f0"; btn.style.color="#475569"; });
      btn.addEventListener("click", () => {
        const el = document.getElementById(_lastFocusedTplField);
        if (!el) return;
        const tag = `[[${ph.key}]]`;
        const s = el.selectionStart ?? el.value.length;
        const e2 = el.selectionEnd ?? el.value.length;
        el.value = el.value.slice(0, s) + tag + el.value.slice(e2);
        el.selectionStart = el.selectionEnd = s + tag.length;
        el.focus();
      });
      c.appendChild(btn);
    });
  }

  function parsePlaceholders(text) {
    const seen = [], re = /\[\[([^\]]+)\]\]/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const k = m[1].trim();
      if (k && k !== "Agent Name" && !seen.includes(k)) seen.push(k);
    }
    return seen;
  }

  function renderCustomBody(tmpl, fields, agent) {
    return (tmpl || "").replace(/\[\[([^\]]+)\]\]/g, (_, key) => {
      const k = key.trim();
      if (k === "Agent Name") return agent;
      return fields[k] || `[[${k}]]`;
    });
  }

  function customScenarioFromTemplate(tpl) {
    const allFields = parsePlaceholders((tpl.subject_template || "") + " " + (tpl.body_template || ""));
    return {
      id:          CUSTOM_PREFIX + tpl.id,
      group:       "My Custom Templates",
      category:    "Other",
      label:       tpl.label,
      desc:        `Custom template — ${tpl.label}`,
      _isCustom:   true,
      _templateId: tpl.id,
      fields:      allFields,
      emails: [{
        title:   tpl.label,
        to:      tpl.to_template || "Recipient",
        cc:      tpl.cc || "",
        subject: (f)         => renderCustomBody(tpl.subject_template, f, agentUsername),
        body:    (f, agent)  => renderCustomBody(tpl.body_template,    f, agent),
      }]
    };
  }

  async function loadAndInjectCustomTemplates() {
    try {
      const templates = await fetch("/api/custom-templates").then(r => r.json());
      _customTemplates = templates;
      const firstCustomIdx = SCENARIOS.findIndex(s => s._isCustom);
      if (firstCustomIdx !== -1) SCENARIOS.splice(firstCustomIdx);
      templates.forEach(tpl => SCENARIOS.push(customScenarioFromTemplate(tpl)));
      refreshCustomDropdownGroup();
      renderCustomTemplateList(templates);
    } catch {}
  }

  function refreshCustomDropdownGroup() {
    const sel = document.getElementById("scenario-select");
    if (!sel) return;
    const existing = sel.querySelector("optgroup[label='My Custom Templates']");
    if (existing) existing.remove();
    if (_customTemplates.length === 0) return;
    const grp = document.createElement("optgroup");
    grp.label = "My Custom Templates";
    _customTemplates.forEach(tpl => {
      const opt = document.createElement("option");
      opt.value = CUSTOM_PREFIX + tpl.id;
      opt.textContent = tpl.label;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  }

  function renderCustomTemplateList(templates) {
    const listEl = document.getElementById("custom-tpl-list");
    if (!listEl) return;
    listEl.innerHTML = "";
    if (templates.length === 0) {
      listEl.innerHTML = `<p style="font-size:11.5px;color:var(--text-light);font-style:italic">No custom templates yet — click + NEW to create one.</p>`;
      return;
    }
    templates.forEach(tpl => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px;padding:7px 0;border-bottom:1px solid var(--border-color)";
      row.innerHTML = `
        <button style="flex:1;background:none;border:none;cursor:pointer;font-size:12.5px;font-weight:600;color:var(--text-main);text-align:left;padding:0;font-family:var(--font-sans)" data-id="${CUSTOM_PREFIX + tpl.id}">${tpl.label}</button>
        <button style="background:none;border:none;cursor:pointer;color:#64748b;font-size:13px;padding:2px 5px;border-radius:4px;line-height:1;border:1px solid #e2e8f0;flex-shrink:0" title="Edit template" data-edit-id="${tpl.id}">✏</button>
        <button style="background:none;border:none;cursor:pointer;color:#dc2626;font-size:18px;padding:0;line-height:1;flex-shrink:0" title="Delete" data-del="${tpl.id}" data-label="${tpl.label}">&times;</button>
      `;
      row.querySelector("[data-id]").addEventListener("click", e => {
        document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-view").forEach(v => v.classList.remove("active"));
        document.querySelector(".nav-tab[data-tab='compose']").classList.add("active");
        document.getElementById("view-compose").classList.add("active");
        selectScenario(e.target.dataset.id);
      });
      row.querySelector("[data-edit-id]").addEventListener("click", () => openEditTemplateModal(tpl));
      row.querySelector("[data-del]").addEventListener("click", e => {
        deleteCustomTemplate(e.currentTarget.dataset.del, e.currentTarget.dataset.label);
      });
      listEl.appendChild(row);
    });
  }

  function openNewTemplateModal(prefill) {
    _editingTemplateId = null;
    const titleEl = document.getElementById("ctpl-modal-title");
    if (titleEl) titleEl.textContent = "New Email Template";
    ["ctpl-label","ctpl-to","ctpl-cc","ctpl-subject","ctpl-body"].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = "";
    });
    if (prefill) {
      const s = typeof prefill === "string" ? prefill : null;
      if (prefill.label)            { const e = document.getElementById("ctpl-label");   if(e) e.value = prefill.label; }
      if (prefill.to_template)      { const e = document.getElementById("ctpl-to");     if(e) e.value = prefill.to_template; }
      if (prefill.cc)               { const e = document.getElementById("ctpl-cc");     if(e) e.value = prefill.cc; }
      if (prefill.subject_template) { const e = document.getElementById("ctpl-subject"); if(e) e.value = prefill.subject_template; }
      if (prefill.body_template)    { const e = document.getElementById("ctpl-body");   if(e) e.value = prefill.body_template; }
    }
    document.getElementById("custom-tpl-modal").classList.remove("hidden");
  }

  function openEditTemplateModal(tpl) {
    _editingTemplateId = tpl.id;
    const titleEl = document.getElementById("ctpl-modal-title");
    if (titleEl) titleEl.textContent = `Edit Template`;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
    set("ctpl-label",   tpl.label);
    set("ctpl-to",      tpl.to_template);
    set("ctpl-cc",      tpl.cc);
    set("ctpl-subject", tpl.subject_template);
    set("ctpl-body",    tpl.body_template);
    document.getElementById("custom-tpl-modal").classList.remove("hidden");
  }

  function closeTemplateModal() {
    _editingTemplateId = null;
    document.getElementById("custom-tpl-modal").classList.add("hidden");
  }

  async function submitCustomTemplate() {
    const label   = (document.getElementById("ctpl-label")?.value   || "").trim();
    const to      = (document.getElementById("ctpl-to")?.value      || "").trim();
    const cc      = (document.getElementById("ctpl-cc")?.value      || "").trim();
    const subject = (document.getElementById("ctpl-subject")?.value || "").trim();
    const body    = (document.getElementById("ctpl-body")?.value    || "").trim();
    if (!label)   { showToast("Template name is required", "error"); return; }
    if (!subject) { showToast("Subject line is required", "error");  return; }
    if (!body)    { showToast("Email body is required", "error");    return; }
    const payload = { label, to_template: to || "Recipient", cc, subject_template: subject, body_template: body, created_by: agentUsername };
    try {
      const isEdit = !!_editingTemplateId;
      const url    = isEdit ? `/api/custom-templates/${_editingTemplateId}` : "/api/custom-templates";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      closeTemplateModal();
      showToast(isEdit ? `Template "${label}" updated` : `Template "${label}" saved`, "success");
      await loadAndInjectCustomTemplates();
      if (isEdit) selectScenario(CUSTOM_PREFIX + _editingTemplateId);
    } catch { showToast("Failed to save template", "error"); }
  }

  async function deleteCustomTemplate(id, label) {
    if (!confirm(`Delete template "${label}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/custom-templates/${id}`, { method: "DELETE" });
      showToast(`Deleted "${label}"`, "info");
      if (currentScenarioId === CUSTOM_PREFIX + id) selectScenario(SCENARIOS[0].id);
      await loadAndInjectCustomTemplates();
    } catch { showToast("Failed to delete template", "error"); }
  }

  function openFeatureRequestModal() {
    const nameEl = document.getElementById("fr-name");
    if (nameEl) nameEl.value = agentUsername || "";
    document.getElementById("feature-req-modal").classList.remove("hidden");
  }

  function closeFeatureRequestModal() {
    document.getElementById("feature-req-modal").classList.add("hidden");
  }

  function submitFeatureRequest() {
    const name = (document.getElementById("fr-name")?.value || "").trim();
    const type = document.getElementById("fr-type")?.value || "Other";
    const desc = (document.getElementById("fr-body")?.value || "").trim();
    if (!desc) { showToast("Please describe your request", "error"); return; }
    const subject = encodeURIComponent(`COO Mail Forge \u2014 ${type}`);
    const bodyEnc = encodeURIComponent(`Feature Request\nFrom: ${name || "COO Agent"}\nType: ${type}\n\n${desc}\n\n---\nSent via COO Mail Forge`);
    const to = "mshariff@enphaseenergy.com";
    const cc = encodeURIComponent("mohammadmaaz@enphaseenergy.com,jbenya@enphaseenergy.com");
    window.open(`mailto:${to}?cc=${cc}&subject=${subject}&body=${bodyEnc}`, "_self");
    closeFeatureRequestModal();
    showToast("Opening Outlook\u2026", "success");
  }

  function downloadChart(chartKey, filename) {
    const chart = activeCharts[chartKey];
    if (!chart) { showToast("Chart not loaded yet", "error"); return; }
    const a = document.createElement("a");
    a.href = chart.toBase64Image("image/png", 1);
    a.download = `mailforge_${filename}_${new Date().toISOString().slice(0,10)}.png`;
    a.click();
  }

  async function clearAllData() {
    if (!confirm("Clear ALL logged analytics data? This cannot be undone.")) return;
    try {
      await apiFetch("/api/cases/clear", { method:"POST" });
      showToast("All data cleared","success");
      loadAnalytics();
    } catch { showToast("Failed to clear data","error"); }
  }

  /* ============================================================
     Navigation
     ============================================================ */
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab").forEach(t=>t.classList.remove("active"));
      document.querySelectorAll(".tab-view").forEach(v=>v.classList.remove("active"));
      tab.classList.add("active");
      const view = document.getElementById(`view-${tab.dataset.tab}`);
      if (view) view.classList.add("active");
      if (tab.dataset.tab === "analytics") loadAnalytics();
    });
  });

  /* ============================================================
     Init
     ============================================================ */
  async function initialize() {
    const regionSel = document.getElementById("region-select");
    apiFetch("/api/regions").then(regions => {
      if (regionSel) {
        regionSel.innerHTML = regions.map(r=>`<option value="${r}">${r}</option>`).join("");
        const vals = getFields(currentScenarioId);
        if (vals._region) regionSel.value = vals._region;
        else { vals._region = regionSel.value; saveState(); }
        regionSel.addEventListener("change", () => {
          getFields(currentScenarioId)._region = regionSel.value;
          saveState();
          const scen = SCENARIOS.find(s => s.id === currentScenarioId);
          if (scen) updatePreview(scen, getFields(currentScenarioId));
        });
      }
    });

    const usernameInput = document.getElementById("sidebar-username-input");
    if (usernameInput) {
      usernameInput.value = agentUsername;
      usernameInput.addEventListener("input", e => {
        agentUsername = e.target.value.trim() || "Support Agent";
        localStorage.setItem("mailforge-username", agentUsername);
        const scen = SCENARIOS.find(s=>s.id===currentScenarioId);
        if (scen) updatePreview(scen, getFields(currentScenarioId));
      });
    }

    if (scenarioSelect) scenarioSelect.addEventListener("change", e => selectScenario(e.target.value));

    const clearBtn = document.getElementById("btn-clear-all-data");
    if (clearBtn) clearBtn.addEventListener("click", clearAllData);

    await loadAndInjectCustomTemplates();
    selectScenario(currentScenarioId);
    checkSessionOnLoad();
    renderPlaceholderChips();
    const _ts = document.getElementById("ctpl-subject");
    const _tb = document.getElementById("ctpl-body");
    if (_ts) _ts.addEventListener("focus", () => { _lastFocusedTplField = "ctpl-subject"; });
    if (_tb) _tb.addEventListener("focus", () => { _lastFocusedTplField = "ctpl-body"; });
  }

  document.addEventListener("DOMContentLoaded", initialize);

  window.startEnlightenLogin      = startEnlightenLogin;
  window.fetchFromEnlighten        = fetchFromEnlighten;
  window.dismissLoginWall          = dismissLoginWall;
  window.openNewTemplateModal      = openNewTemplateModal;
  window.openEditTemplateModal     = openEditTemplateModal;
  window.closeTemplateModal        = closeTemplateModal;
  window.submitCustomTemplate      = submitCustomTemplate;
  window.downloadChart             = downloadChart;
  window.customizeCurrentScenario  = customizeCurrentScenario;
  window.openFeatureRequestModal   = openFeatureRequestModal;
  window.closeFeatureRequestModal  = closeFeatureRequestModal;
  window.submitFeatureRequest      = submitFeatureRequest;

  /* inject btn-chart-dl style */
  const _s = document.createElement("style");
  _s.textContent = `.btn-chart-dl{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid var(--border-color);background:var(--bg);border-radius:6px;cursor:pointer;color:var(--text-muted);font-size:11px;font-weight:600;transition:all .15s}.btn-chart-dl:hover{border-color:var(--primary);color:var(--primary);background:var(--primary-soft)}`;
  document.head.appendChild(_s);

})();
