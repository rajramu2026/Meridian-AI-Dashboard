// ============================================================================
// Meridian Clinic — Staff AI Dashboard — pure aggregation functions
//
// Every function below takes the raw rows fetched at runtime (live sheet or
// demo snapshot — see csv.js/config.js) and derives dashboard content from
// them. No figure is ever hand-typed here; if the connected sheet changes,
// every number recomputes on the next load.
// ============================================================================

const MERIDIAN_CREDENTIAL_LABELS = {
  MD: "Medical Doctor (MD)",
  DO: "Doctor of Osteopathic Medicine (DO)",
  NP: "Nurse Practitioner (NP)",
  PA: "Physician Associate (PA)",
  "PhD (Psych)": "Doctor of Psychology (PhD)",
};

function mNum(v, fallback) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? (fallback === undefined ? 0 : fallback) : n;
}
function mRound(v, dp) {
  const f = Math.pow(10, dp === undefined ? 1 : dp);
  return Math.round(v * f) / f;
}
function mPct(part, whole) {
  return whole > 0 ? mRound((part / whole) * 100, 1) : 0;
}
function mSum(arr, fn) {
  return arr.reduce((acc, x) => acc + mNum(fn(x)), 0);
}
function mAvg(arr, fn) {
  return arr.length ? mSum(arr, fn) / arr.length : 0;
}

// ---------------------------------------------------------------- key/value
function keyValueRows(rows, keyCol, valCol) {
  const out = {};
  rows.forEach((r) => (out[r[keyCol]] = r[valCol]));
  return out;
}

// ------------------------------------------------------------------ facilities
function buildFacilities(facilities, providers) {
  const providerCountByFacility = {};
  providers.forEach((p) => {
    providerCountByFacility[p.primary_facility_id] = (providerCountByFacility[p.primary_facility_id] || 0) + 1;
  });
  return facilities.map((f) => ({
    facility_id: f.facility_id,
    facility_name: f.facility_name,
    facility_type: f.facility_type,
    county: f.county,
    num_exam_rooms: mNum(f.num_exam_rooms),
    num_specialty_resources: mNum(f.num_specialty_resources),
    open_days_per_week: mNum(f.open_days_per_week),
    provider_count: providerCountByFacility[f.facility_id] || 0,
  }));
}

// ------------------------------------------------------------------ providers
function buildProviders(providers, facilitiesById) {
  return providers.map((p) => {
    const fac = facilitiesById[p.primary_facility_id] || {};
    return {
      provider_id: p.provider_id,
      provider_name: p.provider_name,
      department: p.department,
      credential: p.credential,
      credential_label: MERIDIAN_CREDENTIAL_LABELS[p.credential] || p.credential,
      facility_id: p.primary_facility_id,
      facility_name: fac.facility_name || "Unassigned",
      county: fac.county || "—",
      max_daily_patients: mNum(p.max_daily_patients),
      years_at_meridian: mRound(mNum(p.years_at_meridian), 1),
      credential_expiration: p.credential_expiration,
    };
  });
}

// ------------------------------------------------------------------ departments
function buildDepartments(providersOut, appointments, noShowTrendRows) {
  const deptNames = Array.from(new Set(providersOut.map((p) => p.department))).sort();

  const providerCountByDept = {};
  const facilitySetByDept = {};
  providersOut.forEach((p) => {
    providerCountByDept[p.department] = (providerCountByDept[p.department] || 0) + 1;
    facilitySetByDept[p.department] = facilitySetByDept[p.department] || new Set();
    facilitySetByDept[p.department].add(p.facility_id);
  });

  // Sample rollup, straight from Appointments (n = appointments.length)
  const sampleByDept = {};
  appointments.forEach((a) => {
    const d = a.department;
    if (!sampleByDept[d]) {
      sampleByDept[d] = { total: 0, completed: 0, noShow: 0, cancelledResched: 0, cancelledNoResched: 0, overbooked: 0, riskSum: 0, leadSum: 0 };
    }
    const s = sampleByDept[d];
    s.total++;
    if (a.appointment_status === "Completed") s.completed++;
    else if (a.appointment_status === "No-Show") s.noShow++;
    else if (a.appointment_status === "Cancelled - Rescheduled") s.cancelledResched++;
    else if (a.appointment_status === "Cancelled - No Reschedule") s.cancelledNoResched++;
    if (mNum(a.overbooked_slot_flag) === 1) s.overbooked++;
    s.riskSum += mNum(a.no_show_risk_score_pct);
    s.leadSum += mNum(a.lead_time_days);
  });

  // Network-trend rollup, summed across all 12 months per department
  const trendByDept = {};
  noShowTrendRows.forEach((r) => {
    const d = r.department;
    if (!trendByDept[d]) trendByDept[d] = { total: 0, noShow: 0, revenueLoss: 0 };
    trendByDept[d].total += mNum(r.total_scheduled_appointments);
    trendByDept[d].noShow += mNum(r.no_show_count);
    trendByDept[d].revenueLoss += mNum(r.estimated_revenue_loss_eur);
  });

  return deptNames.map((name) => {
    const meta = window.MERIDIAN_DEPARTMENTS[name] || { icon: "🏥", summary: "" };
    const s = sampleByDept[name] || { total: 0, completed: 0, noShow: 0, cancelledResched: 0, cancelledNoResched: 0, overbooked: 0, riskSum: 0, leadSum: 0 };
    const t = trendByDept[name] || { total: 0, noShow: 0, revenueLoss: 0 };
    return {
      name,
      icon: meta.icon,
      summary: meta.summary,
      provider_count: providerCountByDept[name] || 0,
      facility_count: facilitySetByDept[name] ? facilitySetByDept[name].size : 0,
      sample_total: s.total,
      sample_completed: s.completed,
      sample_no_show: s.noShow,
      sample_cancelled_resched: s.cancelledResched,
      sample_cancelled_no_resched: s.cancelledNoResched,
      sample_overbooked: s.overbooked,
      sample_no_show_rate_pct: mPct(s.noShow, s.total),
      sample_avg_risk_pct: s.total ? mRound(s.riskSum / s.total, 1) : 0,
      sample_avg_lead_days: s.total ? mRound(s.leadSum / s.total, 1) : 0,
      trend_total_scheduled: t.total,
      trend_no_show: t.noShow,
      trend_no_show_rate_pct: mPct(t.noShow, t.total),
      trend_revenue_loss_eur: mRound(t.revenueLoss, 0),
    };
  });
}

// ------------------------------------------------------------------ resources
function buildResources(resources, facilitiesById) {
  return resources.map((r) => {
    const fac = facilitiesById[r.facility_id] || {};
    return {
      resource_id: r.resource_id,
      facility_id: r.facility_id,
      facility_name: fac.facility_name || "Unassigned",
      county: fac.county || "—",
      resource_type: r.resource_type,
      turnaround_minutes: mNum(r.turnaround_minutes),
      next_maintenance_date: r.next_maintenance_date,
      utilization_pct: mRound(mNum(r.utilization_pct_trailing_12mo), 1),
      status: r.status,
    };
  });
}

function buildResourceTypeSummary(resourcesOut) {
  const byType = {};
  resourcesOut.forEach((r) => {
    if (!byType[r.resource_type]) byType[r.resource_type] = { count: 0, utilSum: 0, healthy: 0, under: 0, over: 0 };
    const b = byType[r.resource_type];
    b.count++;
    b.utilSum += r.utilization_pct;
    if (r.status && r.status.indexOf("Underutilized") === 0) b.under++;
    else if (r.status && r.status.indexOf("Overbooked") === 0) b.over++;
    else b.healthy++;
  });
  return Object.keys(byType)
    .sort()
    .map((type) => ({
      resource_type: type,
      count: byType[type].count,
      avg_utilization_pct: mRound(byType[type].utilSum / byType[type].count, 1),
      healthy: byType[type].healthy,
      underutilized: byType[type].under,
      overbooked: byType[type].over,
    }));
}

// ------------------------------------------------------------------ patients
function buildPatientInsights(patients) {
  const total = patients.length;
  const byInsurance = {};
  const byChannel = {};
  let transportBarrier = 0;
  let portalEnrolled = 0;
  let priorNoShowSum = 0;
  let leadTimeSum = 0;
  let distanceSum = 0;

  const priorNoShowByTransport = { withBarrier: [], withoutBarrier: [] };
  const priorNoShowByInsurance = {};
  const distanceBands = [[0, 10, "0–10 km"], [10, 20, "10–20 km"], [20, 30, "20–30 km"], [30, 100000, "30+ km"]];
  const ageBands = [[0, 30, "Under 30"], [30, 45, "30–44"], [45, 60, "45–59"], [60, 200, "60+"]];
  const priorNoShowByDistanceBand = distanceBands.map(() => []);
  const priorNoShowByAgeBand = ageBands.map(() => []);

  patients.forEach((p) => {
    const ins = p.insurance_type;
    byInsurance[ins] = (byInsurance[ins] || 0) + 1;
    const ch = p.preferred_communication_channel;
    byChannel[ch] = (byChannel[ch] || 0) + 1;
    const barrier = mNum(p.has_transportation_barrier_flag) === 1;
    if (barrier) transportBarrier++;
    if (mNum(p.portal_enrolled) === 1) portalEnrolled++;
    const priorNoShow = mNum(p.prior_no_shows_last_12mo);
    priorNoShowSum += priorNoShow;
    leadTimeSum += mNum(p.avg_appointment_lead_time_days_hist);
    const dist = mNum(p.distance_to_nearest_facility_km);
    distanceSum += dist;
    const age = mNum(p.age);

    (barrier ? priorNoShowByTransport.withBarrier : priorNoShowByTransport.withoutBarrier).push(priorNoShow);
    if (!priorNoShowByInsurance[ins]) priorNoShowByInsurance[ins] = [];
    priorNoShowByInsurance[ins].push(priorNoShow);

    for (let i = 0; i < distanceBands.length; i++) {
      if (dist >= distanceBands[i][0] && dist < distanceBands[i][1]) { priorNoShowByDistanceBand[i].push(priorNoShow); break; }
    }
    for (let i = 0; i < ageBands.length; i++) {
      if (age >= ageBands[i][0] && age < ageBands[i][1]) { priorNoShowByAgeBand[i].push(priorNoShow); break; }
    }
  });

  const avgArr = (arr) => (arr.length ? mRound(arr.reduce((a, b) => a + b, 0) / arr.length, 2) : 0);

  return {
    total_patients: total,
    insurance_mix: Object.keys(byInsurance)
      .sort()
      .map((k) => ({ label: k, count: byInsurance[k], pct: mPct(byInsurance[k], total) })),
    channel_mix: Object.keys(byChannel)
      .sort()
      .map((k) => ({ label: k, count: byChannel[k], pct: mPct(byChannel[k], total) })),
    transportation_barrier_pct: mPct(transportBarrier, total),
    portal_enrolled_pct: mPct(portalEnrolled, total),
    avg_prior_no_shows: mRound(priorNoShowSum / total, 2),
    avg_lead_time_days: mRound(leadTimeSum / total, 1),
    avg_distance_km: mRound(distanceSum / total, 1),
    avg_prior_no_shows_with_barrier: avgArr(priorNoShowByTransport.withBarrier),
    avg_prior_no_shows_without_barrier: avgArr(priorNoShowByTransport.withoutBarrier),
    avg_prior_no_shows_by_insurance: Object.keys(priorNoShowByInsurance)
      .sort()
      .map((k) => ({ label: k, avg: avgArr(priorNoShowByInsurance[k]) })),
    avg_prior_no_shows_by_distance: distanceBands.map((b, i) => ({ label: b[2], avg: avgArr(priorNoShowByDistanceBand[i]), count: priorNoShowByDistanceBand[i].length })),
    avg_prior_no_shows_by_age: ageBands.map((b, i) => ({ label: b[2], avg: avgArr(priorNoShowByAgeBand[i]), count: priorNoShowByAgeBand[i].length })),
  };
}

// ------------------------------------------------------------------ waitlist
function buildWaitlist(waitlist, facilitiesById) {
  return waitlist.map((w) => {
    const fac = facilitiesById[w.preferred_facility_id] || {};
    return {
      waitlist_id: w.waitlist_id,
      patient_id: w.patient_id,
      department: w.department,
      urgency_level: w.urgency_level,
      date_added: w.date_added,
      days_on_waitlist: mNum(w.days_on_waitlist),
      preferred_facility_id: w.preferred_facility_id,
      preferred_facility_name: fac.facility_name || "Any Location",
      status: w.status,
    };
  });
}

function buildWaitlistSummary(waitlistOut) {
  const byStatus = {};
  const byDept = {};
  const byUrgency = {};
  let activeDaysSum = 0;
  let activeCount = 0;

  waitlistOut.forEach((w) => {
    byStatus[w.status] = (byStatus[w.status] || 0) + 1;
    byDept[w.department] = (byDept[w.department] || 0) + 1;
    byUrgency[w.urgency_level] = (byUrgency[w.urgency_level] || 0) + 1;
    if (w.status === "Waiting") {
      activeDaysSum += w.days_on_waitlist;
      activeCount++;
    }
  });

  return {
    total: waitlistOut.length,
    active_waiting: byStatus["Waiting"] || 0,
    avg_days_waiting_active: activeCount ? mRound(activeDaysSum / activeCount, 1) : 0,
    by_status: Object.keys(byStatus)
      .sort()
      .map((k) => ({ label: k, count: byStatus[k] })),
    by_department: Object.keys(byDept)
      .sort()
      .map((k) => ({ label: k, count: byDept[k] })),
    by_urgency: Object.keys(byUrgency)
      .sort()
      .map((k) => ({ label: k, count: byUrgency[k] })),
  };
}

// ------------------------------------------------------------------ appointments (sample-wide)
function buildAppointmentInsights(appointments) {
  const total = appointments.length;
  const byStatus = {};
  const byUrgency = {};
  const byVisitType = {};
  const riskBands = [
    [0, 10], [10, 20], [20, 30], [30, 40], [40, 50],
    [50, 60], [60, 70], [70, 80], [80, 90], [90, 100.001],
  ];
  const riskBandCounts = riskBands.map(() => ({ total: 0, noShow: 0 }));

  let reminderYesTotal = 0, reminderYesNoShow = 0;
  let reminderNoTotal = 0, reminderNoNoShow = 0;
  let overbookedTotal = 0, overbookedNoShow = 0;
  let standardTotal = 0, standardNoShow = 0;

  appointments.forEach((a) => {
    byStatus[a.appointment_status] = (byStatus[a.appointment_status] || 0) + 1;
    byUrgency[a.urgency_level] = (byUrgency[a.urgency_level] || 0) + 1;
    byVisitType[a.visit_type] = (byVisitType[a.visit_type] || 0) + 1;

    const risk = mNum(a.no_show_risk_score_pct);
    const isNoShow = a.appointment_status === "No-Show";
    for (let i = 0; i < riskBands.length; i++) {
      if (risk >= riskBands[i][0] && risk < riskBands[i][1]) {
        riskBandCounts[i].total++;
        if (isNoShow) riskBandCounts[i].noShow++;
        break;
      }
    }

    if (mNum(a.reminder_sent_flag) === 1) {
      reminderYesTotal++;
      if (isNoShow) reminderYesNoShow++;
    } else {
      reminderNoTotal++;
      if (isNoShow) reminderNoNoShow++;
    }
    if (mNum(a.overbooked_slot_flag) === 1) {
      overbookedTotal++;
      if (isNoShow) overbookedNoShow++;
    } else {
      standardTotal++;
      if (isNoShow) standardNoShow++;
    }
  });

  return {
    total,
    by_status: Object.keys(byStatus)
      .sort()
      .map((k) => ({ label: k, count: byStatus[k], pct: mPct(byStatus[k], total) })),
    by_urgency: Object.keys(byUrgency)
      .sort()
      .map((k) => ({ label: k, count: byUrgency[k], pct: mPct(byUrgency[k], total) })),
    by_visit_type: Object.keys(byVisitType)
      .sort()
      .map((k) => ({ label: k, count: byVisitType[k], pct: mPct(byVisitType[k], total) })),
    risk_band_calibration: riskBands.map((band, i) => ({
      band_label: `${band[0]}–${band[1] > 100 ? 100 : band[1]}%`,
      total: riskBandCounts[i].total,
      no_show_rate_pct: mPct(riskBandCounts[i].noShow, riskBandCounts[i].total),
    })),
    reminder_sent_no_show_rate_pct: mPct(reminderYesNoShow, reminderYesTotal),
    reminder_not_sent_no_show_rate_pct: mPct(reminderNoNoShow, reminderNoTotal),
    overbooked_no_show_rate_pct: mPct(overbookedNoShow, overbookedTotal),
    standard_no_show_rate_pct: mPct(standardNoShow, standardTotal),
    overbooked_count: overbookedTotal,
  };
}

// ------------------------------------------------------------------ revenue loss by site (month-to-date)
// "Month to date" = the most recent month present in the Appointments data
// (never hardcoded — recomputed from whatever the connected sheet contains).
// Per-department EUR-per-no-show rates are derived from NoShow_Trend_Monthly
// (12-month sum of revenue loss / 12-month sum of no-shows, per department),
// then applied to each no-show appointment in the current month, grouped by
// facility. Nothing here is a fixed/typed number.
function buildRevenueBySite(appointments, facilitiesById, noShowTrendRows) {
  const deptRevenuePerNoShow = {};
  const deptTotals = {};
  noShowTrendRows.forEach((r) => {
    const d = r.department;
    if (!deptTotals[d]) deptTotals[d] = { revenueLoss: 0, noShow: 0 };
    deptTotals[d].revenueLoss += mNum(r.estimated_revenue_loss_eur);
    deptTotals[d].noShow += mNum(r.no_show_count);
  });
  Object.keys(deptTotals).forEach((d) => {
    deptRevenuePerNoShow[d] = deptTotals[d].noShow > 0 ? deptTotals[d].revenueLoss / deptTotals[d].noShow : 0;
  });

  const months = Array.from(new Set(appointments.map((a) => a.appointment_month))).sort();
  const currentMonth = months[months.length - 1] || null;
  const mtdAppointments = currentMonth ? appointments.filter((a) => a.appointment_month === currentMonth) : [];

  const bySite = {};
  mtdAppointments.forEach((a) => {
    const fid = a.facility_id;
    if (!bySite[fid]) bySite[fid] = { scheduled: 0, completed: 0, noShows: 0, revenueLoss: 0 };
    const b = bySite[fid];
    b.scheduled++;
    if (a.appointment_status === "Completed") b.completed++;
    if (a.appointment_status === "No-Show") {
      b.noShows++;
      b.revenueLoss += deptRevenuePerNoShow[a.department] || 0;
    }
  });

  const sites = Object.keys(facilitiesById)
    .map((fid) => {
      const fac = facilitiesById[fid];
      const b = bySite[fid] || { scheduled: 0, completed: 0, noShows: 0, revenueLoss: 0 };
      return {
        facility_id: fid,
        facility_name: fac.facility_name,
        facility_type: fac.facility_type,
        county: fac.county,
        scheduled: b.scheduled,
        completed: b.completed,
        no_shows: b.noShows,
        no_show_rate_pct: mPct(b.noShows, b.scheduled),
        revenue_loss_eur: mRound(b.revenueLoss, 0),
      };
    })
    .sort((a, b) => b.revenue_loss_eur - a.revenue_loss_eur);

  const totalRevenueLoss = mRound(mSum(sites, (s) => s.revenue_loss_eur), 0);
  const sitesWithActivity = sites.filter((s) => s.scheduled > 0);
  const worst = sitesWithActivity[0] || null;

  return {
    current_month: currentMonth,
    generated_on: new Date().toISOString().slice(0, 10),
    total_revenue_loss_eur: totalRevenueLoss,
    total_no_shows: mSum(sites, (s) => s.no_shows),
    total_scheduled: mSum(sites, (s) => s.scheduled),
    avg_revenue_loss_per_site_eur: sitesWithActivity.length ? mRound(totalRevenueLoss / sitesWithActivity.length, 0) : 0,
    worst_site: worst,
    sites_with_no_activity: sites.filter((s) => s.scheduled === 0).length,
    sites,
  };
}

// ------------------------------------------------------------------ provider performance (grounded in Appointments)
function buildProviderPerformance(providersOut, appointments, departmentsOut) {
  const deptAvgNoShow = {};
  departmentsOut.forEach((d) => (deptAvgNoShow[d.name] = d.sample_no_show_rate_pct));

  const byProvider = {};
  appointments.forEach((a) => {
    const pid = a.provider_id;
    if (!byProvider[pid]) byProvider[pid] = { total: 0, completed: 0, noShow: 0, riskSum: 0 };
    const b = byProvider[pid];
    b.total++;
    if (a.appointment_status === "Completed") b.completed++;
    if (a.appointment_status === "No-Show") b.noShow++;
    b.riskSum += mNum(a.no_show_risk_score_pct);
  });

  return providersOut.map((p) => {
    const b = byProvider[p.provider_id] || { total: 0, completed: 0, noShow: 0, riskSum: 0 };
    const noShowRate = mPct(b.noShow, b.total);
    const deptAvg = deptAvgNoShow[p.department] || 0;
    return {
      ...p,
      appts_sample_total: b.total,
      appts_sample_completed: b.completed,
      appts_sample_no_show: b.noShow,
      no_show_rate_pct: noShowRate,
      avg_risk_score_pct: b.total ? mRound(b.riskSum / b.total, 1) : 0,
      dept_avg_no_show_rate_pct: deptAvg,
      vs_dept_avg_pct_pts: b.total ? mRound(noShowRate - deptAvg, 1) : 0,
    };
  });
}

// ------------------------------------------------------------------ county rollup (for the Locations map)
function buildCountySummary(facilitiesOut, appointments) {
  const facilityToCounty = {};
  const countyFacilityCount = {};
  facilitiesOut.forEach((f) => {
    facilityToCounty[f.facility_id] = f.county;
    countyFacilityCount[f.county] = (countyFacilityCount[f.county] || 0) + 1;
  });

  const byCounty = {};
  appointments.forEach((a) => {
    const county = facilityToCounty[a.facility_id];
    if (!county) return;
    if (!byCounty[county]) byCounty[county] = { total: 0, noShow: 0 };
    byCounty[county].total++;
    if (a.appointment_status === "No-Show") byCounty[county].noShow++;
  });

  return Object.keys(countyFacilityCount)
    .sort()
    .map((county) => {
      const b = byCounty[county] || { total: 0, noShow: 0 };
      return {
        county,
        facility_count: countyFacilityCount[county],
        provider_count: mSum(facilitiesOut.filter((f) => f.county === county), (f) => f.provider_count),
        sample_total: b.total,
        sample_no_show: b.noShow,
        no_show_rate_pct: mPct(b.noShow, b.total),
      };
    });
}

// ------------------------------------------------------------------ monthly trend (network-wide)
function buildMonthlyTrend(noShowTrendRows) {
  const byMonth = {};
  noShowTrendRows.forEach((r) => {
    const m = r.month;
    if (!byMonth[m]) byMonth[m] = { total: 0, noShow: 0, revenueLoss: 0 };
    byMonth[m].total += mNum(r.total_scheduled_appointments);
    byMonth[m].noShow += mNum(r.no_show_count);
    byMonth[m].revenueLoss += mNum(r.estimated_revenue_loss_eur);
  });
  return Object.keys(byMonth)
    .sort()
    .map((m) => ({
      month: m,
      total_scheduled: byMonth[m].total,
      no_show: byMonth[m].noShow,
      no_show_rate_pct: mPct(byMonth[m].noShow, byMonth[m].total),
      revenue_loss_eur: mRound(byMonth[m].revenueLoss, 0),
    }));
}

// ------------------------------------------------------------------ Action Center
// Every item below is derived directly from the already-computed data model
// (waitlist, resources, provider performance, revenue-by-site, department
// trend) — nothing here is hand-typed. Because this data model is a
// historical *outcomes* sample rather than a live future schedule, items are
// framed honestly as "as of the latest data in the connected sheet", not as
// a live minute-by-minute feed.
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function buildActionQueue(data) {
  const items = [];

  // 1) Waitlist — longest-waiting + urgent patients still waiting
  const waiting = data.waitlist.filter((w) => w.status === "Waiting").sort((a, b) => b.days_on_waitlist - a.days_on_waitlist);
  waiting.slice(0, 6).forEach((w) => {
    const priority = w.urgency_level === "Urgent" || w.days_on_waitlist >= 45 ? "high" : w.days_on_waitlist >= 21 ? "medium" : "low";
    items.push({
      id: `waitlist-${w.waitlist_id}`,
      category: "waitlist",
      categoryIcon: "🛏️",
      categoryLabel: "Waitlist",
      priority,
      title: `${w.patient_id} has been waiting ${w.days_on_waitlist} days for ${w.department}`,
      desc: `Urgency: ${w.urgency_level} · Preferred location: ${w.preferred_facility_name} · Added ${w.date_added}.`,
      owner: "Patient Access Team",
      metric: w.days_on_waitlist,
    });
  });

  // 2) Overbooked resources — currently over 90% utilization
  data.resources
    .filter((r) => r.status && r.status.indexOf("Overbooked") === 0)
    .sort((a, b) => b.utilization_pct - a.utilization_pct)
    .slice(0, 5)
    .forEach((r) => {
      items.push({
        id: `resource-over-${r.resource_id}`,
        category: "resource",
        categoryIcon: "🧩",
        categoryLabel: "Capacity",
        priority: r.utilization_pct >= 97 ? "high" : "medium",
        title: `${r.resource_id} (${r.resource_type}) is overbooked at ${r.utilization_pct}%`,
        desc: `${r.facility_name}, Co. ${r.county} — redirect new bookings elsewhere where possible.`,
        owner: "Resource Scheduling",
        metric: r.utilization_pct,
      });
    });

  // 3) Underutilized resource types — network-wide headroom staff can use
  data.resourceTypeSummary
    .filter((t) => t.avg_utilization_pct < 60)
    .sort((a, b) => a.avg_utilization_pct - b.avg_utilization_pct)
    .slice(0, 3)
    .forEach((t) => {
      items.push({
        id: `restype-under-${t.resource_type}`,
        category: "resource",
        categoryIcon: "📉",
        categoryLabel: "Capacity",
        priority: "low",
        title: `${t.resource_type} is averaging only ${t.avg_utilization_pct}% utilization network-wide`,
        desc: `${t.underutilized} of ${t.count} tracked ${t.resource_type} resources are underutilized — good candidates for waitlist offers.`,
        owner: "Facilities Ops",
        metric: t.avg_utilization_pct,
      });
    });

  // 4) Providers running materially above their department's no-show average
  data.providerPerformance
    .filter((p) => p.appts_sample_total >= 5 && p.vs_dept_avg_pct_pts >= 5)
    .sort((a, b) => b.vs_dept_avg_pct_pts - a.vs_dept_avg_pct_pts)
    .slice(0, 4)
    .forEach((p) => {
      items.push({
        id: `provider-${p.provider_id}-perf`,
        category: "provider",
        categoryIcon: "🩺",
        categoryLabel: "Team",
        priority: p.vs_dept_avg_pct_pts >= 10 ? "high" : "medium",
        title: `${p.provider_name} runs ${p.vs_dept_avg_pct_pts} pts above the ${p.department} average no-show rate`,
        desc: `${fmtPctLocal(p.no_show_rate_pct)} vs ${fmtPctLocal(p.dept_avg_no_show_rate_pct)} department average, across ${p.appts_sample_total} sampled appointments.`,
        owner: "Department Lead",
        metric: p.vs_dept_avg_pct_pts,
      });
    });

  // 5) Highest month-to-date revenue-loss sites
  data.revenueBySite.sites
    .filter((s) => s.revenue_loss_eur > 0)
    .slice(0, 3)
    .forEach((s, i) => {
      items.push({
        id: `site-${s.facility_id}-revenue`,
        category: "revenue",
        categoryIcon: "💶",
        categoryLabel: "Revenue",
        priority: i === 0 ? "high" : "medium",
        title: `${s.facility_name} lost €${Math.round(s.revenue_loss_eur).toLocaleString("en-IE")} to no-shows this month`,
        desc: `${s.no_shows} no-shows on a ${s.no_show_rate_pct}% rate, MTD (${data.revenueBySite.current_month || "—"}).`,
        owner: "Site Manager",
        metric: s.revenue_loss_eur,
      });
    });

  // 6) Departments with the highest trailing-12mo no-show trend
  data.departments
    .slice()
    .sort((a, b) => b.trend_no_show_rate_pct - a.trend_no_show_rate_pct)
    .slice(0, 2)
    .forEach((d) => {
      items.push({
        id: `dept-${d.name}-trend`,
        category: "department",
        categoryIcon: d.icon || "🏥",
        categoryLabel: "Department",
        priority: "medium",
        title: `${d.name} has the highest trailing 12-month no-show rate (${d.trend_no_show_rate_pct}%)`,
        desc: `€${Math.round(d.trend_revenue_loss_eur).toLocaleString("en-IE")} in modeled revenue loss over the last 12 months — consider expanded overbooking coverage.`,
        owner: "Scheduling Team",
        metric: d.trend_no_show_rate_pct,
      });
    });

  items.sort((a, b) => (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) || (b.metric - a.metric));

  const counts = { high: 0, medium: 0, low: 0 };
  items.forEach((it) => counts[it.priority]++);

  let asOfDate = null;
  data.appointments.forEach((a) => {
    const d = new Date(a.appointment_datetime);
    if (!asOfDate || d > asOfDate) asOfDate = d;
  });

  return {
    items,
    counts,
    total: items.length,
    as_of: asOfDate ? asOfDate.toISOString().slice(0, 10) : "—",
    long_waitlist_over_30: data.waitlist.filter((w) => w.status === "Waiting" && w.days_on_waitlist > 30).length,
  };
}

function fmtPctLocal(n) { return n + "%"; }
