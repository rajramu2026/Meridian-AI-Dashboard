// ============================================================================
// Meridian Clinic — Staff AI Dashboard — configuration
//
// To go live: paste your Google Sheet ID below (the long ID in the sheet's
// URL between /d/ and /edit) and make sure sharing is set to
// "Anyone with the link — Viewer". Every tab name below must match a sheet
// (tab) name in that spreadsheet exactly. Leave GOOGLE_SHEET_ID blank to run
// on the bundled demo snapshot instead.
// ============================================================================

window.MERIDIAN_CONFIG = {
  GOOGLE_SHEET_ID: "1khEKcDuUsM9H_gcNaA2Z3bCGiiv2qlhhCduHrqKWFiQ", // live Meridian data source (both dashboard + ORLA read from this)

  TABS: {
    organizationInfo: "Organization_Info",
    annualSummary: "Annual_Summary",
    facilities: "Facilities",
    providers: "Providers",
    patients: "Patients",
    resources: "Resources",
    appointments: "Appointments",
    waitlist: "Waitlist",
    noShowTrend: "NoShow_Trend_Monthly",
  },

  // Local fallback snapshot, used whenever GOOGLE_SHEET_ID is blank or a live
  // fetch fails. Exported directly from the source workbook — never hand-typed.
  DEMO_CSV_PATHS: {
    organizationInfo: "data/demo/Organization_Info.csv",
    annualSummary: "data/demo/Annual_Summary.csv",
    facilities: "data/demo/Facilities.csv",
    providers: "data/demo/Providers.csv",
    patients: "data/demo/Patients.csv",
    resources: "data/demo/Resources.csv",
    appointments: "data/demo/Appointments.csv",
    waitlist: "data/demo/Waitlist.csv",
    noShowTrend: "data/demo/NoShow_Trend_Monthly.csv",
  },

  // ---------------------------------------------------------------------
  // ORLA (the in-dashboard AI assistant) — Groq LLM connection
  // ---------------------------------------------------------------------
  // ORLA is a genuine chat AI — every question is answered by a real Groq
  // LLM call, grounded on a fresh data snapshot rebuilt at the moment of
  // each question from whichever sheet/tab is connected above. There is
  // no keyword-matching fallback logic: paste your Groq API key below and
  // she works immediately; leave it blank and she shows one short, polite
  // "having trouble" notice until a key is added — nothing else to change.
  GROQ_API_KEY: "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", // <-- paste your Groq API key here
  // NOTE: llama-3.1-8b-instant and llama-3.3-70b-versatile are both being
  // retired by Groq on 2026-08-16 (Groq deprecation notice). Using their
  // recommended, currently-supported replacement instead:
  GROQ_MODEL: "openai/gpt-oss-120b",
  GROQ_API_URL: "https://api.groq.com/openai/v1/chat/completions",
};
