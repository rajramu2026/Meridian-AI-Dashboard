// ============================================================================
// Meridian Clinic — Staff AI Dashboard — data model orchestrator
//
// meridianLoadDashboardData() fetches every tab (live sheet or demo snapshot,
// see csv.js) and hands the raw rows to the aggregation functions in
// aggregate.js to build one unified, ready-to-render data model.
// ============================================================================

function meridianBuildDashboardData(raw, sourceMode) {
  const org = keyValueRows(raw.organizationInfo, "field", "value");
  const annual = keyValueRows(raw.annualSummary, "metric", "value");

  const facilitiesOut = buildFacilities(raw.facilities, raw.providers);
  const facilitiesById = {};
  facilitiesOut.forEach((f) => (facilitiesById[f.facility_id] = f));

  const providersOut = buildProviders(raw.providers, facilitiesById);
  const departmentsOut = buildDepartments(providersOut, raw.appointments, raw.noShowTrend);
  const resourcesOut = buildResources(raw.resources, facilitiesById);
  const resourceTypeSummary = buildResourceTypeSummary(resourcesOut);
  const patientInsights = buildPatientInsights(raw.patients);
  const waitlistOut = buildWaitlist(raw.waitlist, facilitiesById);
  const waitlistSummary = buildWaitlistSummary(waitlistOut);
  const appointmentInsights = buildAppointmentInsights(raw.appointments);
  const monthlyTrend = buildMonthlyTrend(raw.noShowTrend);
  const revenueBySite = buildRevenueBySite(raw.appointments, facilitiesById, raw.noShowTrend);
  const providerPerformance = buildProviderPerformance(providersOut, raw.appointments, departmentsOut);
  const countySummary = buildCountySummary(facilitiesOut, raw.appointments);

  const counties = Array.from(new Set(facilitiesOut.map((f) => f.county))).sort();
  const facilityTypes = Array.from(new Set(facilitiesOut.map((f) => f.facility_type))).sort();
  const departmentNames = departmentsOut.map((d) => d.name);

  const dataSoFar = {
    meta: {
      sourceMode,
      generatedAt: new Date().toISOString(),
      reportingWindow: org["Reporting Window"] || annual["Reporting Window"] || "—",
    },
    org,
    annual: {
      total_appointments_scheduled: mNum(annual["Total Appointments Scheduled"]),
      completed_visits: mNum(annual["Completed Visits"]),
      no_shows: mNum(annual["No-Shows"]),
      no_show_rate_pct: mNum(annual["No-Show Rate (%)"]),
      revenue_loss_eur_sample: mNum(annual["Estimated Annual Revenue Loss from No-Shows (EUR)"]),
      overbooked_slots_applied: mNum(annual["Overbooked Slots Applied"]),
      active_waitlist_entries: mNum(annual["Active Waitlist Entries"]),
      avg_resource_utilization_pct: mNum(annual["Average Resource Utilization (Trailing 12mo, %)"]),
    },
    facilities: facilitiesOut,
    providers: providersOut,
    departments: departmentsOut,
    resources: resourcesOut,
    resourceTypeSummary,
    patientInsights,
    waitlist: waitlistOut,
    waitlistSummary,
    appointments: raw.appointments,
    appointmentInsights,
    monthlyTrend,
    revenueBySite,
    providerPerformance,
    countySummary,
    counties,
    facilityTypes,
    departmentNames,
    networkTrend: {
      total_scheduled: mSum(raw.noShowTrend, (r) => r.total_scheduled_appointments),
      total_no_show: mSum(raw.noShowTrend, (r) => r.no_show_count),
      total_revenue_loss_eur: mRound(mSum(raw.noShowTrend, (r) => r.estimated_revenue_loss_eur), 0),
      no_show_rate_pct: mPct(mSum(raw.noShowTrend, (r) => r.no_show_count), mSum(raw.noShowTrend, (r) => r.total_scheduled_appointments)),
    },
  };
  dataSoFar.actionQueue = buildActionQueue(dataSoFar);
  return dataSoFar;
}

// ----------------------------------------------------------------------
// Global filter pipeline
// ----------------------------------------------------------------------
// The dashboard keeps ONE cached copy of the raw (unfiltered) tables from
// the live/demo source in window.MERIDIAN_RAW_DATA. Every global filter
// change re-derives a filtered raw table set and re-runs the full
// aggregation pipeline (meridianBuildDashboardData) — so every KPI, chart,
// table, and AI insight recomputes from real rows, not from a cached
// summary. Nothing here is hardcoded; the filters simply change which raw
// rows go into the same aggregation functions used for the unfiltered view.

window.MERIDIAN_FILTERS = { facility: "all", department: "all", dateRange: "all" };

function meridianFilterRawData(raw, filters) {
  const f = filters || {};
  const facility = f.facility || "all";
  const department = f.department || "all";
  const dateRange = f.dateRange || "all";

  let cutoff = null;
  if (dateRange !== "all" && raw.appointments.length) {
    const maxDate = raw.appointments.reduce((max, a) => {
      const d = new Date(a.appointment_datetime);
      return d > max ? d : max;
    }, new Date(0));
    const days = { last30: 30, last90: 90, last6mo: 183 }[dateRange] || null;
    if (days) {
      cutoff = new Date(maxDate);
      cutoff.setDate(cutoff.getDate() - days);
    }
  }

  const apptMatches = (a) => {
    if (facility !== "all" && String(a.facility_id) !== String(facility)) return false;
    if (department !== "all" && a.department !== department) return false;
    if (cutoff && new Date(a.appointment_datetime) < cutoff) return false;
    return true;
  };

  const filteredAppointments = raw.appointments.filter(apptMatches);

  const filteredWaitlist = raw.waitlist.filter((w) => {
    if (facility !== "all" && String(w.preferred_facility_id) !== String(facility)) return false;
    if (department !== "all" && w.department !== department) return false;
    return true;
  });

  const filteredResources = facility !== "all" ? raw.resources.filter((r) => String(r.facility_id) === String(facility)) : raw.resources;

  const filteredProviders = raw.providers.filter((p) => {
    if (facility !== "all" && String(p.primary_facility_id) !== String(facility)) return false;
    if (department !== "all" && p.department !== department) return false;
    return true;
  });

  const filteredFacilities = facility !== "all" ? raw.facilities.filter((fac) => String(fac.facility_id) === String(facility)) : raw.facilities;

  const filteredNoShowTrend = department !== "all" ? raw.noShowTrend.filter((r) => r.department === department) : raw.noShowTrend;

  let filteredPatients = raw.patients;
  if (facility !== "all" || department !== "all" || dateRange !== "all") {
    const patientIds = new Set(filteredAppointments.map((a) => a.patient_id));
    filteredPatients = raw.patients.filter((p) => patientIds.has(p.patient_id));
  }

  return Object.assign({}, raw, {
    appointments: filteredAppointments,
    waitlist: filteredWaitlist,
    resources: filteredResources,
    providers: filteredProviders,
    facilities: filteredFacilities,
    noShowTrend: filteredNoShowTrend,
    patients: filteredPatients,
  });
}

function meridianIsFilterActive() {
  const f = window.MERIDIAN_FILTERS;
  return f.facility !== "all" || f.department !== "all" || f.dateRange !== "all";
}

/**
 * Re-runs the full aggregation pipeline against the current global filters
 * and republishes 'meridian:ready'. Called on boot and on every filter change.
 */
function meridianRebuildDashboard() {
  const raw = window.MERIDIAN_RAW_DATA;
  if (!raw) return;
  const filteredRaw = meridianFilterRawData(raw, window.MERIDIAN_FILTERS);
  const data = meridianBuildDashboardData(filteredRaw, window.MERIDIAN_SOURCE_MODE);
  data.rawUnfiltered = raw;
  data.filters = Object.assign({}, window.MERIDIAN_FILTERS);
  data.filtersActive = meridianIsFilterActive();
  window.MERIDIAN_DASHBOARD_DATA = data;
  document.dispatchEvent(new CustomEvent("meridian:ready", { detail: data }));
}

async function meridianLoadDashboardData() {
  const { raw, sourceMode } = await meridianLoadAllTabs();
  return { raw, sourceMode };
}

/**
 * Boots the dashboard: loads data once into window.MERIDIAN_RAW_DATA, then
 * runs the filter/aggregation pipeline and fires 'meridian:ready' with the
 * full data model attached as event.detail. Also updates the shared
 * header/footer source-indicator once loaded (see dashboard.js).
 */
function meridianBootDashboard() {
  meridianLoadDashboardData()
    .then(({ raw, sourceMode }) => {
      window.MERIDIAN_RAW_DATA = raw;
      window.MERIDIAN_SOURCE_MODE = sourceMode;
      if (typeof meridianPopulateGlobalFilters === "function") meridianPopulateGlobalFilters(raw);
      meridianRebuildDashboard();
    })
    .catch((err) => {
      console.error("Dashboard failed to load", err);
      document.dispatchEvent(new CustomEvent("meridian:error", { detail: err }));
    });
}
