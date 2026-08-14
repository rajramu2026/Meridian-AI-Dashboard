// ============================================================================
// Meridian Clinic — Staff AI Dashboard — live/demo CSV loader
//
// Rory (the Researcher agent) owns this connection: at page load, every tab
// is fetched fresh — either from the live Google Sheet (gviz CSV export, no
// API key required for a link-shared sheet) or, if no sheet is configured or
// the fetch fails, from the bundled demo snapshot. Either way, data is parsed
// at the moment of use — nothing here is typed in as a constant.
// ============================================================================

function meridianGvizUrl(sheetId, tabName) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
}

async function meridianFetchCsvRows(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
  return parsed.data;
}

/**
 * Loads every configured tab. Tries the live Google Sheet first (if a sheet
 * ID is configured); falls back to the bundled demo CSV per-tab on failure.
 * Returns { raw: {tabKey: rows[]}, sourceMode: "live" | "demo" | "mixed" }.
 */
async function meridianLoadAllTabs() {
  const cfg = window.MERIDIAN_CONFIG;
  const tabKeys = Object.keys(cfg.TABS);
  const raw = {};
  let liveCount = 0;
  let demoCount = 0;

  await Promise.all(
    tabKeys.map(async (key) => {
      const tabName = cfg.TABS[key];
      const demoPath = cfg.DEMO_CSV_PATHS[key];

      if (cfg.GOOGLE_SHEET_ID) {
        try {
          raw[key] = await meridianFetchCsvRows(meridianGvizUrl(cfg.GOOGLE_SHEET_ID, tabName));
          liveCount++;
          return;
        } catch (err) {
          console.warn(`Live fetch failed for tab "${tabName}", falling back to demo snapshot.`, err);
        }
      }
      raw[key] = await meridianFetchCsvRows(demoPath);
      demoCount++;
    })
  );

  let sourceMode = "demo";
  if (liveCount > 0 && demoCount === 0) sourceMode = "live";
  else if (liveCount > 0 && demoCount > 0) sourceMode = "mixed";

  return { raw, sourceMode };
}
