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
    ownerName:       { label: "New Owner — Name",            placeholder: "John Smith" },
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
      fields: ["customerName","siteId","caseNumber","systemName","ownerEmail","ownerAddress","maintainerName","maintainerPhone","installerName","installerPhone"],
      emails: [{
        title: "Transfer Confirmation (Normal)", to: "Homeowner", cc: "",
        subject: f => `Enphase Update: Ownership Transfer (Site ID: ${v(f.siteId,"siteId")})`,
        body: (f, agent) => `Dear ${v(f.customerName,"customerName")},

Thank you for contacting Enphase.

This is regarding Site ID: ${v(f.siteId,"siteId")} with the system name "${v(f.systemName,"systemName")}". Ownership of the system has been successfully transferred to the new owner listed below.

New Owner Details:
Name: ${v(f.customerName,"customerName")}
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
      fields: ["customerName","siteId","caseNumber","systemName","ownerEmail","ownerAddress","issue","maintainerName","maintainerPhone","installerName","installerPhone"],
      emails: [{
        title: "Transfer Confirmation (Has Issue)", to: "Homeowner", cc: "",
        subject: f => `Enphase Update: Ownership Transfer (Site ID: ${v(f.siteId,"siteId")})`,
        body: (f, agent) => `Dear ${v(f.customerName,"customerName")},

Thank you for contacting Enphase.

This is regarding Site ID: ${v(f.siteId,"siteId")}, with the system name "${v(f.systemName,"systemName")}." The ownership has been successfully transferred to the new owner listed below.

New Owner Details:
Name: ${v(f.customerName,"customerName")}
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
      id: "doo-lease-a-to-b", group: "Declaration of Ownership (DOO)", category: "DOO",
      label: "Lease A to Lease B",
      desc: "Transfer between two leasing companies. Requires DOO form from Lease B owner.",
      fields: ["siteId","caseNumber","systemName"],
      emails: [
        {
          title: "1. Email to Lease B Company", to: "Leasing Company (Lease B)", cc: "",
          subject: f => `Site ID: ${v(f.siteId,"siteId")} → DOO Form Completion Required`,
          body: (f, agent) => `Hi Team,

This email is regarding to Case ID: ${v(f.caseNumber,"caseNumber")}
System/Site name: ${v(f.systemName,"systemName")}
Site ID: ${v(f.siteId,"siteId")}

I've attached the Enphase Document of Declaration (DOO) Form for your convenience. We kindly ask you to:

1. Review the form carefully
2. Fill in the required details manually
3. Sign the form by hand (please do not type your signature)

You may either print and sign it physically, or
Use your saved DocuSign signature template

4. Reply to this email with the signed DOO copy alongside your Lease completion document as an attachment.

Once I get the requested document, I will reach out to the change of ownership team and provide you an update through emails about the estimated time of completion as I receive.

If you have any questions or need help at any point, please don't hesitate to reach out—I am happy to assist. You may reply back to this email.

Thank you for your time and cooperation.

Warm regards,
${agent}
Enphase Support Team`
        },
        {
          title: "2. Email to Monisha R", to: "Monisha R", cc: "Raghavendra",
          subject: f => `Site ID: ${v(f.siteId,"siteId")} → DOO Request – Lease A to Lease B`,
          body: (f, agent) => `Hi Monisha,

This email is regarding to Site ID: ${v(f.siteId,"siteId")}
Case ID: ${v(f.caseNumber,"caseNumber")}

Type: Lease A to Lease B
Email of the Lease B to be on ENL: 

The Declaration of Ownership form has been updated by the Lease B owner and attached to this email for your reference.

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
      fields: ["customerName","siteId","caseNumber","systemName"],
      emails: [
        {
          title: "1. Email to Homeowner", to: "Homeowner", cc: "",
          subject: f => `Site ID: ${v(f.siteId,"siteId")} → Documents Needed to Complete Your Enphase Ownership Verification`,
          body: (f, agent) => `Dear ${v(f.customerName,"customerName")},
I hope you are doing well.

This email is regarding to Case ID: ${v(f.caseNumber,"caseNumber")}
System/Site name: ${v(f.systemName,"systemName")}
Site ID: ${v(f.siteId,"siteId")}

I am reaching out to request your support in completing the ownership verification for your Enphase system. This step helps us ensure your account details are accurate and up to date.

Step 1:
Please share the Lease completion document / certificate

Step 2:
I've attached the Enphase Document of Declaration (DOO) Form for your convenience. We kindly ask you to:

1. Review the form carefully
2. Fill in the required details manually
- You can ignore the first row: System Owner Company Name.
>> Enter your name as Signatory Name.
>> Enter "Homeowner" as your Signatory Title.
>> Enter your complete & correct address.
>> Enter your Phone Number, Email, Date.
3. Sign the form by hand (please do not type your signature)
You may either print and sign it physically, or
Use your saved DocuSign signature template.
- Same details to be entered on the 2nd page (Exhibit A: Systems Information) as well.

4. Reply to this email with the signed DOO copy as an attachment.

Once I get the requested documents, I will reach out to the change of ownership team and provide you an update through emails about the estimated time of completion as I receive.

If you have any questions or need help at any point, please don't hesitate to reach out—I am happy to assist. You may reply back to this email.

Thank you for your time and cooperation.

Warm regards,
${agent}
Enphase Support Team`
        },
        {
          title: "2. Email to Monisha R", to: "Monisha R", cc: "Raghavendra",
          subject: f => `Site ID: ${v(f.siteId,"siteId")} → Documents Attached – Lease to Residential`,
          body: (f, agent) => `Hi Monisha,

This email is regarding to Site ID: ${v(f.siteId,"siteId")}
Case ID: ${v(f.caseNumber,"caseNumber")}

Type: Lease to Residential
Email of the HO to be on ENL: 

The Homeowner has completed the lease for his solar system.
The Lease Completion document has been provided by the Homeowner.
The Declaration of Ownership (DOO) form has been completed.

Kindly please review the attached documents for the Change of Ownership (COO) update.
Please let me know the ETA for this case.

Thank you,
${agent}`
        }
      ]
    },
    {
      id: "doo-misconfig-resi-lease", group: "Declaration of Ownership (DOO)", category: "DOO",
      label: "Misconfig: Resi tagged as Lease",
      desc: "Residential system incorrectly marked as Lease. Collect cash proof + DOO form.",
      fields: ["customerName","siteId","caseNumber","systemName"],
      emails: [
        {
          title: "1. Email to Homeowner", to: "Homeowner", cc: "",
          subject: f => `Misconfigured Site Correction Needs Solar Purchase Proof & Updated DOO Form`,
          body: (f, agent) => `Dear ${v(f.customerName,"customerName")},
I hope you are doing well.

This email is regarding to Case ID: ${v(f.caseNumber,"caseNumber")}
System/Site name: ${v(f.systemName,"systemName")}
Site ID: ${v(f.siteId,"siteId")}

The site appears to be a Residential installation; however, it is currently tagged as a Lease site. To proceed with the correction, we kindly request your assistance with the following:

Step 1:
Please share the solar purchase proof document confirming the system was purchased via cash.

Step 2:
I've attached the Enphase Declaration of Ownership (DOO) form for your convenience. Kindly:

Review the form carefully
Fill in all required details manually
Sign the form by hand (typed signatures are not accepted)

You may either print and sign the document physically or use your saved DocuSign signature template.

Once completed, please reply to this email with:
1. The signed DOO Copy
2. The lease completion document

Once I get the requested documents, I will reach out to the change of ownership team and provide you an update through emails about the estimated time of completion as I receive.

If you have any questions or need help at any point, please don't hesitate to reach out—I am happy to assist. You may reply back to this email.

Thank you for your time and cooperation.

Warm regards,
${agent}
Enphase Support Team`
        },
        {
          title: "2. Email to Raghavendra Kumar S", to: "Raghavendra Kumar S", cc: "Your Supervisor",
          subject: f => `Site ID: ${v(f.siteId,"siteId")} → Misconfigured Site Correction - Documents Received – Request for COO Update`,
          body: (f, agent) => `Hello Raghavendra,

This email is regarding to case ID: ${v(f.caseNumber,"caseNumber")}
Site ID: ${v(f.siteId,"siteId")}
System/Site Name: ${v(f.systemName,"systemName")}

Type: Site Misconfigured as Lease
We have received the required documents from the Homeowner for site correction.

Documents received:
    1. Solar purchase proof (cash purchase confirmation)
    2. Signed DOO form

As the site is currently tagged incorrectly, we request you to kindly review the attached documents and proceed with the Change of Ownership (COO) update.

Please let me know if any additional information is required from our end.
Thank you,
${agent}`
        }
      ]
    },
    {
      id: "doo-misconfig-lease-resi", group: "Declaration of Ownership (DOO)", category: "DOO",
      label: "Misconfig: Lease tagged as Resi",
      desc: "Lease system incorrectly marked as Residential. Collect lease agreement + DOO form.",
      fields: ["customerName","siteId","caseNumber","systemName"],
      emails: [
        {
          title: "1. Email to Leasing Company / System Host", to: "Leasing Company / System Host", cc: "",
          subject: f => `Misconfigured Site Correction Needs Lease Document & Updated DOO Form`,
          body: (f, agent) => `Dear ${v(f.customerName,"customerName")},
I hope you are doing well.

This email is regarding to Case ID: ${v(f.caseNumber,"caseNumber")}
System/Site name: ${v(f.systemName,"systemName")}
Site ID: ${v(f.siteId,"siteId")}

The site appears to be a Lease installation; however, it is currently tagged as Residential. To proceed with the correction, we kindly request your assistance with the following documents:

Step 1:
    Please share the lease agreement between the system host and the lease company.

Step 2:
    I have attached the Enphase Declaration of Ownership (DOO) form for your convenience. Kindly:

Review the form carefully
Complete all required details manually
Sign the form by hand (typed signatures are not accepted)

You may either print and sign the document physically or use your saved DocuSign signature template.
Once completed, please reply to this email with:

The signed DOO form
The lease agreement document

Once I get the requested documents, I will reach out to the change of ownership team and provide you an update through emails about the estimated time of completion as I receive.

If you have any questions or need help at any point, please don't hesitate to reach out—I am happy to assist. You may reply back to this email.

Thank you for your time and cooperation.

Warm regards,
${agent}
Enphase Support Team`
        },
        {
          title: "2. Email to Monisha R", to: "Monisha R", cc: "Your Supervisor",
          subject: f => `Site ID: ${v(f.siteId,"siteId")} → Misconfigured Site Correction - Documents Received – Request for COO Update`,
          body: (f, agent) => `Hi Monisha,

This email is regarding to case ID: ${v(f.caseNumber,"caseNumber")}
Site ID: ${v(f.siteId,"siteId")}
System/Site Name: ${v(f.systemName,"systemName")}

Type: Site Misconfigured as Residential
We have received the required documents from the system-host/lease company for site correction.

Documents received:
    1. Lease Document between system host and the Leasing Company
    2. Signed DOO form

As the site is currently tagged incorrectly, we request you to kindly review the attached documents and let us know the ETA for the Change of Ownership (COO) update.

Please let me know if any additional information is required from our end.
Thank you,
${agent}`
        }
      ]
    },
    {
      id: "doo-exceptions", group: "Declaration of Ownership (DOO)", category: "DOO",
      label: "Exception Case (Death / Divorce / Family)",
      desc: "Exception cases where COO fees are waived due to special circumstances.",
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
${agent}`
      }]
    },
    {
      id: "doo-standard-steps", group: "Declaration of Ownership (DOO)", category: "DOO",
      label: "Standard transfer next steps",
      desc: "Guide the customer through the self-service ownership transfer page.",
      fields: ["customerName","siteId","caseNumber"],
      emails: [{
        title: "Self-Service Steps", to: "Homeowner", cc: "",
        subject: f => `Enphase System Ownership Transfer – Next Steps`,
        body: (f, agent) => `Dear ${v(f.customerName,"customerName")},

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
  ];

  /* ============================================================
     State & Persistence
     ============================================================ */
  const STORAGE_KEY = "mailforge-state-v2";

  let state = loadState();
  let currentScenarioId = state._lastScenario || SCENARIOS[0].id;
  let isBackendOnline = true;
  let _enlPoll = null;
  let _sfPoll = null;
  let lastScanData = null;
  let currentRole = localStorage.getItem("mailforge-role") || null;

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      return { _lastScenario: s._lastScenario };
    } catch { return {}; }
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
    if (url === "/api/regions") return ["US / NA","Germany","Austria","Switzerland","Netherlands","Belgium","France","Luxembourg","UK","Spain","Other / Unspecified"];
    return {};
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
    const loginBtn = document.getElementById("enl-login-btn");
    if (loginBtn) {
      loginBtn.style.display = state === "ok" ? "none" : "";
      loginBtn.disabled = state === "wait";
      loginBtn.textContent = state === "wait" ? "Opening…" : "Login";
    }
  }

  function setSfStatus(state, label) {
    const dot = document.getElementById("sf-dot");
    const lbl = document.getElementById("sf-session-label");
    if (!dot || !lbl) return;
    dot.className = "enl-dot" + (state==="ok"?" ok":state==="wait"?" wait":" no");
    lbl.textContent = label;
    const loginBtn = document.getElementById("sf-login-btn");
    if (loginBtn) {
      loginBtn.style.display = state === "ok" ? "none" : "";
      loginBtn.disabled = state === "wait";
      loginBtn.textContent = state === "wait" ? "Opening…" : "Login";
    }
  }

  async function startEnlightenLogin(fromWall) {
    const btn   = document.getElementById("enl-login-btn");
    const lwBtn = document.getElementById("lw-login-btn");
    const setLoading = (t) => { if(btn) { btn.disabled=true; btn.textContent=t; } if(lwBtn) { lwBtn.disabled=true; lwBtn.textContent=t; } };
    const setReady = () => { if(btn) { btn.disabled=false; btn.textContent="Login"; } if(lwBtn) { lwBtn.disabled=false; lwBtn.textContent="Login to Enlighten"; } };
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

  async function startSalesforceLogin() {
    const btn = document.getElementById("sf-login-btn");
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = "Opening browser…";
    setSfStatus("wait", "Waiting for login…");
    try {
      await fetch("/api/salesforce/start-login", { method: "POST" });
      _sfPoll = setInterval(async () => {
        try {
          const d = await (await fetch("/api/salesforce/login-status")).json();
          if (d.status === "success") {
            clearInterval(_sfPoll);
            setSfStatus("ok", "Session active");
            btn.disabled = false;
            btn.textContent = "Login to Salesforce";
          } else if (d.status === "timeout" || d.status === "error") {
            clearInterval(_sfPoll);
            const msg = d.detail || "Login failed — try again";
            setSfStatus("no", msg.length > 60 ? msg.slice(0,60)+"…" : msg);
            alert("Salesforce login error:\n\n" + (d.detail || "Unknown error."));
            btn.disabled = false;
            btn.textContent = "Login to Salesforce";
          }
        } catch {}
      }, 2500);
    } catch {
      setSfStatus("no", "Error starting browser");
      btn.disabled = false;
      btn.textContent = "Login to Salesforce";
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
        // Auto-select "system has issues" scenario if alarms detected
        if (d.data.has_issues || (d.data.alarms && d.data.alarms.length > 0)) {
          selectScenario("coo-not-normal");
          showToast("Site has issues - selected 'system has issue' scenario", "info");
        }
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

  async function fetchFromSalesforce() {
    const globalField  = document.getElementById("global-case-number");
    const sidebarField = document.getElementById("enl-case-number");
    const caseNumber   = ((globalField && globalField.value) || (sidebarField && sidebarField.value) || "").trim();
    if (!caseNumber) { showToast("Enter a Case Number first", "error"); return; }
    // Keep both fields in sync
    if (globalField)  globalField.value  = caseNumber;
    if (sidebarField) sidebarField.value = caseNumber;
    const btns = [document.getElementById("enl-fetch-case-btn"), document.getElementById("sf-case-fetch-btn")];
    btns.forEach(b => { if (b) { b.disabled = true; b.textContent = "Fetching…"; } });
    try {
      const d = await (await fetch("/api/salesforce/fetch-case?case_number=" + encodeURIComponent(caseNumber))).json();
      if (d.status === "success") {
        autoFillSalesforceFields(d.data);
        showToast("Case fetched — contact details auto-filled", "success");
      } else {
        showToast("Error: " + d.message, "error");
      }
    } catch (e) {
      showToast("Network error: " + e.message, "error");
    } finally {
      btns.forEach(b => { if (b) { b.disabled = false; b.textContent = b.id === "sf-case-fetch-btn" ? "⚡ SF Fetch" : "Fetch Case"; } });
    }
  }

  function autoFillSalesforceFields(data) {
    // Populate the global case number field
    const globalField = document.getElementById("global-case-number");
    if (globalField && data.case_number) {
      globalField.value = data.case_number;
      syncGlobalCaseNumber(data.case_number);
    }
    const MAP = {
      "field-customerName":  data.customer_name || data.contact_name || "",
      "field-ownerName":     data.contact_name  || "",
      "field-ownerEmail":    data.contact_email || "",
      "field-siteId":        data.site_id       || "",
      "field-caseNumber":    data.case_number   || "",
      "field-Case Number":   data.case_number   || "",
    };
    Object.entries(MAP).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val) { el.value = val; el.dispatchEvent(new Event("input")); }
    });
    // If site ID was found, auto-trigger Enlighten scan
    if (data.site_id) {
      const enlField = document.getElementById("enl-site-id");
      if (enlField) enlField.value = data.site_id;
      fetchFromEnlighten();
    }
  }

  function syncGlobalCaseNumber(value) {
    const sidebar  = document.getElementById("enl-case-number");
    if (sidebar) sidebar.value = value;
    // Built-in scenarios use camelCase key → id="field-caseNumber"
    const dynCamel = document.getElementById("field-caseNumber");
    if (dynCamel) { dynCamel.value = value; dynCamel.dispatchEvent(new Event("input")); }
    // My Templates use "Case Number" (space) → id="field-Case Number"
    const dynSpace = document.getElementById("field-Case Number");
    if (dynSpace) { dynSpace.value = value; dynSpace.dispatchEvent(new Event("input")); }
    // Persist to current scenario state (handles both key formats)
    const scen = SCENARIOS.find(s => s.id === currentScenarioId);
    if (scen && scen.fields) {
      const fields = getFields(currentScenarioId);
      if (scen.fields.includes("caseNumber"))    { fields.caseNumber         = value; saveState(); }
      if (scen.fields.includes("Case Number"))   { fields["Case Number"]     = value; saveState(); }
    }
    // Update the active-case quick-text badge
    const badge   = document.getElementById("active-case-badge");
    const display = document.getElementById("active-case-display");
    if (badge && display) {
      if (value.trim()) {
        display.textContent = value.trim();
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
        display.textContent = "—";
      }
    }
  }

  function clearCaseNumber() {
    const globalField  = document.getElementById("global-case-number");
    const sidebarField = document.getElementById("enl-case-number");
    if (globalField)  globalField.value  = "";
    if (sidebarField) sidebarField.value = "";
    syncGlobalCaseNumber("");
    // Also clear caseNumber from current scenario state
    const fields = getFields(currentScenarioId);
    if ("caseNumber" in fields) { fields.caseNumber = ""; saveState(); }
    const scen = SCENARIOS.find(s => s.id === currentScenarioId);
    if (scen) updatePreview(scen, getFields(currentScenarioId));
  }

  function autoFillFields(data) {
    const instName  = data.installer_name || data.maintainer_name || "";
    const instPhone = data.installer_phone || data.company_support_phone || data.maintainer_phone || "";
    const instEmail = data.installer_email || data.company_support_email || "";
    const maintName  = data.maintainer_name || data.installer_name || "";
    const maintPhone = data.maintainer_phone || data.installer_phone || "";

    const MAP = {
      "field-siteId":          data.site_id     || "",
      "field-customerName":    data.owner_name  || "",
      "field-ownerName":       data.owner_name  || "",
      "field-ownerEmail":      data.owner_email || "",
      "field-ownerAddress":    data.address     || "",
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

  function _startupShow(dotClass, text, showLogin) {
    const spinner   = document.getElementById("startup-spinner");
    const statusRow = document.getElementById("startup-status-row");
    const dot       = document.getElementById("startup-status-dot");
    const label     = document.getElementById("startup-status-text");
    const loginArea = document.getElementById("startup-login-area");
    const sub       = document.getElementById("startup-sub");
    if (spinner)   spinner.style.display   = "none";
    if (statusRow) statusRow.style.display = "flex";
    if (dot)       dot.className           = "startup-status-dot " + dotClass;
    if (label)     label.textContent       = text;
    if (sub)       sub.textContent         = text;
    if (loginArea) loginArea.style.display = showLogin ? "block" : "none";
  }

  function _startupDismiss() {
    const overlay = document.getElementById("startup-overlay");
    if (!overlay) return;
    overlay.classList.add("fade-out");
    setTimeout(() => overlay.classList.add("hidden"), 420);
  }

  async function checkSessionOnLoad() {
    // Reactive auto-detect: checks saved session, then steals from open browser
    try {
      setEnlStatus("wait", "Detecting session…");
      const d = await (await fetch("/api/enlighten/auto-detect")).json();
      if (d.status === "active" || d.status === "stolen") {
        const msg = d.status === "stolen" ? "Session captured from browser" : "Session active";
        setEnlStatus("ok", msg);
        _startupShow("ok", "Enlighten session active — loading app…", false);
        dismissLoginWall();
        setTimeout(_startupDismiss, 1200);
      } else if (d.status === "unavailable") {
        setEnlStatus("no", "Scanner not available");
        _startupShow("no", "Scanner not available on this server", false);
        setTimeout(_startupDismiss, 2000);
      } else {
        setEnlStatus("no", "Not logged in");
        _startupShow("no", "Enlighten session not found", true);
      }
    } catch {
      setEnlStatus("no", "Session check failed");
      _startupShow("no", "Could not reach server", true);
    }

    // Check Salesforce session
    try {
      const sf = await (await fetch("/api/salesforce/check-session")).json();
      if (sf.status === "success" && sf.has_session) {
        setSfStatus("ok", "Session active");
      } else {
        setSfStatus("no", "Not logged in");
      }
    } catch {
      setSfStatus("no", "Session check failed");
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
      siteId:          d.site_id     || "",
      systemName:      d.system_name || "",
      customerName:    d.owner_name  || "",
      ownerName:       d.owner_name  || "",
      ownerEmail:      d.owner_email || "",
      ownerAddress:    d.address     || "",
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
    const isSopOnly = scenario.emails.length === 0 && !!scenario.guidelines;
    const workspaceGrid = document.querySelector(".workspace-grid");
    if (workspaceGrid) workspaceGrid.classList.toggle("sop-mode", isSopOnly);
    const values = getFields(id);
    const regionSel = document.getElementById("region-select");
    if (regionSel && regionSel.options.length) regionSel.value = values._region || regionSel.options[0].value;
    formFieldsEl.innerHTML = "";
    if (isSopOnly) {
      updatePreview(scenario, values);
      return;
    }
    scenario.fields.forEach(key => {
      if (key === "caseNumber") return; // already rendered as static global-case-number field
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
      input.setAttribute("autocomplete", "off");
      input.setAttribute("autocorrect", "off");
      input.setAttribute("spellcheck", "false");
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
    // Push the global case number into the newly rendered field(s)
    const globalCaseVal = (document.getElementById("global-case-number") || {}).value || "";
    if (globalCaseVal) syncGlobalCaseNumber(globalCaseVal);
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
    const bodyText  = email ? email.body(dummyF, "Enphase Support Team") : "";
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
      card.innerHTML = `<div class="guide-steps-header">Guidance & SOPs</div><pre class="guide-steps">${scenario.guidelines}</pre>`;
      draftsEl.appendChild(card);
      return;
    }
    scenario.emails.forEach((emailDef, idx) => {
      const subject = emailDef.subject(values);
      const body    = emailDef.body(values, "Enphase Support Team");
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
          <button class="btn btn-secondary btn-clear-fields">Clear Fields</button>
          ${!scenario._isCustom ? `<button class="btn btn-secondary btn-customize" title="Save as editable custom template">✏ Customize</button>` : ""}
        </div>`;
      card.querySelector(".btn-copy-body").addEventListener("click", async e => {
        const success = await copyToClipboard(body);
        if (success) flashBtn(e.target,"✓ Copied!");
        else showToast("Copy failed - try manual select", "error");
      });
      card.querySelector(".btn-copy-full").addEventListener("click", async e => {
        const fullEmail = `Subject: ${subject}\n\n${body}`;
        const success = await copyToClipboard(fullEmail);
        if (success) flashBtn(e.target,"✓ Email Copied!");
        else showToast("Copy failed - try manual select", "error");
      });
      card.querySelector(".btn-download").addEventListener("click", () => {
        const blob = new Blob([`To: ${emailDef.to}\n${emailDef.cc?`Cc: ${emailDef.cc}\n`:""}Subject: ${subject}\n\n${body}`], {type:"text/plain;charset=utf-8"});
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${scenario.id}-${idx+1}.txt`; a.click(); URL.revokeObjectURL(a.href);
        showToast("Downloaded","success");
      });
      card.querySelector(".btn-clear-fields").addEventListener("click", () => {
        state[scenario.id] = {};
        lastScanData = null;
        saveState();
        const cnEl = document.getElementById("enl-case-number");
        if (cnEl) { cnEl.value = ""; cnEl.dispatchEvent(new Event("input")); }
        selectScenario(scenario.id);
        showToast("Fields cleared","info");
      });
      const custBtn = card.querySelector(".btn-customize");
      if (custBtn) custBtn.addEventListener("click", () => _customizeScenarioAsTemplate(scenario));
      draftsEl.appendChild(card);
    });
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn("Clipboard API failed, falling back:", err);
    }
    // Fallback: use textarea method
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch (err) {
      document.body.removeChild(textarea);
      console.error("Copy fallback failed:", err);
      return false;
    }
  }

  function flashBtn(btn, text) {
    const orig = btn.textContent;
    btn.textContent = text; btn.style.color = "var(--doo-color)";
    setTimeout(() => { btn.textContent = orig; btn.style.color = ""; }, 1500);
    showToast(text.replace("✓ ",""),"success");
  }

  /* ============================================================
     Role Management
     ============================================================ */
  const ROLE_SCENARIO_MAP = {
    normal: ["doo-", "admin-"],
    team:   ["coo-"]
  };

  function selectRole(role) {
    currentRole = role;
    localStorage.setItem("mailforge-role", role);
    applyRoleToUI(role);
    // Pick first visible scenario for the role
    const first = SCENARIOS.find(s => isScenarioForRole(s.id, role) && !s._isCustom);
    if (first) selectScenario(first.id);
    document.getElementById("role-overlay").classList.add("hidden");
  }

  function showRoleSelector() {
    document.getElementById("role-overlay").classList.remove("hidden");
  }

  function isScenarioForRole(scenarioId, role) {
    if (!role) return true;
    if (scenarioId.startsWith("custom-")) return true;
    const prefixes = ROLE_SCENARIO_MAP[role] || [];
    return prefixes.some(p => scenarioId.startsWith(p));
  }

  function applyRoleToUI(role) {
    // Update role indicator
    const indicator = document.getElementById("role-indicator");
    const dot = document.getElementById("role-dot");
    const label = document.getElementById("role-indicator-label");
    if (indicator) indicator.style.display = "block";
    if (dot) { dot.className = "role-dot" + (role === "team" ? " team" : ""); }
    if (label) label.textContent = role === "team" ? "COO Team Member" : "Normal COO / DOO User";

    // Show/hide optgroups based on role
    const sel = document.getElementById("scenario-select");
    if (!sel) return;
    sel.querySelectorAll("optgroup[data-role]").forEach(grp => {
      grp.style.display = grp.dataset.role === role ? "" : "none";
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
    { key: "Customer Name",       hint: "The customer's full name" },
    { key: "Site ID",             hint: "Enlighten site ID number" },
    { key: "Case Number",         hint: "Salesforce case number" },
    { key: "System Name",         hint: "Name of the solar system" },
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
      if (k && !seen.includes(k)) seen.push(k);
    }
    return seen;
  }

  function renderCustomBody(tmpl, fields, agent) {
    return (tmpl || "").replace(/\[\[([^\]]+)\]\]/g, (_, key) => {
      const k = key.trim();
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
        subject: (f)         => renderCustomBody(tpl.subject_template, f, "Enphase Support Team"),
        body:    (f, agent)  => renderCustomBody(tpl.body_template,    f, agent),
      }]
    };
  }

  const CUSTOM_STORE_KEY = "mailforge-custom-tpls";

  function _loadLocalTemplates() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_STORE_KEY)) || []; } catch { return []; }
  }

  function _saveLocalTemplates(tpls) {
    localStorage.setItem(CUSTOM_STORE_KEY, JSON.stringify(tpls));
  }

  function loadAndInjectCustomTemplates() {
    const templates = _loadLocalTemplates();
    _customTemplates = templates;
    const firstCustomIdx = SCENARIOS.findIndex(s => s._isCustom);
    if (firstCustomIdx !== -1) SCENARIOS.splice(firstCustomIdx);
    templates.forEach(tpl => SCENARIOS.push(customScenarioFromTemplate(tpl)));
    refreshCustomDropdownGroup();
    renderCustomTemplateList(templates);
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
    const isEdit = !!_editingTemplateId;
    try {
      let templates = _loadLocalTemplates();
      if (isEdit) {
        templates = templates.map(t => t.id === _editingTemplateId
          ? { id: _editingTemplateId, label, to_template: to || "Recipient", cc, subject_template: subject, body_template: body, created_by: "Enphase Support Team" }
          : t);
      } else {
        const newId = Date.now().toString(36) + Math.random().toString(36).slice(2);
        templates.push({ id: newId, label, to_template: to || "Recipient", cc, subject_template: subject, body_template: body, created_by: "Enphase Support Team" });
      }
      _saveLocalTemplates(templates);
      closeTemplateModal();
      showToast(isEdit ? `Template "${label}" updated` : `Template "${label}" saved`, "success");
      loadAndInjectCustomTemplates();
      if (isEdit) selectScenario(CUSTOM_PREFIX + _editingTemplateId);
    } catch { showToast("Failed to save template", "error"); }
  }

  function deleteCustomTemplate(id, label) {
    if (!confirm(`Delete template "${label}"? This cannot be undone.`)) return;
    _saveLocalTemplates(_loadLocalTemplates().filter(t => t.id !== id));
    showToast(`Deleted "${label}"`, "info");
    if (currentScenarioId === CUSTOM_PREFIX + id) selectScenario(SCENARIOS[0].id);
    loadAndInjectCustomTemplates();
  }

  function openFeatureRequestModal() {
    const nameEl = document.getElementById("fr-name");
    if (nameEl) nameEl.value = "Enphase Support Team";
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

    if (scenarioSelect) scenarioSelect.addEventListener("change", e => selectScenario(e.target.value));

    // Global case number — sync to sidebar and any visible dynamic field
    const globalCaseEl = document.getElementById("global-case-number");
    if (globalCaseEl) {
      globalCaseEl.addEventListener("input", () => syncGlobalCaseNumber(globalCaseEl.value));
    }

    loadAndInjectCustomTemplates();

    // Show role selector if no role chosen yet, otherwise apply saved role
    if (!currentRole) {
      document.getElementById("role-overlay").classList.remove("hidden");
    } else {
      document.getElementById("role-overlay").classList.add("hidden");
      applyRoleToUI(currentRole);
      // Pick a valid scenario for the role
      const savedOk = isScenarioForRole(currentScenarioId, currentRole);
      selectScenario(savedOk ? currentScenarioId : (SCENARIOS.find(s => isScenarioForRole(s.id, currentRole) && !s._isCustom) || SCENARIOS[0]).id);
    }

    checkSessionOnLoad();
    renderPlaceholderChips();
    const _ts = document.getElementById("ctpl-subject");
    const _tb = document.getElementById("ctpl-body");
    if (_ts) _ts.addEventListener("focus", () => { _lastFocusedTplField = "ctpl-subject"; });
    if (_tb) _tb.addEventListener("focus", () => { _lastFocusedTplField = "ctpl-body"; });
  }

  document.addEventListener("DOMContentLoaded", initialize);

  /* ============================================================
     Git Auto-Update Check
     ============================================================ */
  async function checkForUpdates() {
    showToast("Checking for updates…", "info");
    try {
      const res = await fetch("/api/update/check", { method: "POST" });
      const data = await res.json();
      if (data.updated) {
        showToast("Update applied — server is restarting…", "success");
      } else if (data.status === "up_to_date") {
        showToast("Already up to date", "success");
      } else {
        showToast(data.message || "Update check complete", "info");
      }
    } catch {
      showToast("Could not reach server for update check", "error");
    }
  }

  window.startEnlightenLogin      = startEnlightenLogin;
  window.fetchFromEnlighten        = fetchFromEnlighten;
  window.fetchFromSalesforce       = fetchFromSalesforce;
  window.startSalesforceLogin      = startSalesforceLogin;
  window.dismissLoginWall          = dismissLoginWall;
  window.selectRole                = selectRole;
  window.showRoleSelector          = showRoleSelector;
  window.clearCaseNumber           = clearCaseNumber;
  window.openNewTemplateModal      = openNewTemplateModal;
  window.openEditTemplateModal     = openEditTemplateModal;
  window.closeTemplateModal        = closeTemplateModal;
  window.submitCustomTemplate      = submitCustomTemplate;
  window.customizeCurrentScenario  = customizeCurrentScenario;
  window.openFeatureRequestModal   = openFeatureRequestModal;
  window.closeFeatureRequestModal  = closeFeatureRequestModal;
  window.submitFeatureRequest      = submitFeatureRequest;
  window.checkForUpdates           = checkForUpdates;

})();
