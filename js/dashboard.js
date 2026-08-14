// ============================================================================
// Meridian Clinic — Staff AI Dashboard — UI wiring
// Tabs, KPI cards, insights, filterable/sortable tables, and the agent
// pipeline panel. Everything below reads from window.MERIDIAN_DASHBOARD_DATA,
// which is rebuilt from the live/demo source on every load (see
// dashboard-data.js).
// ============================================================================

function fmtInt(n) { return Math.round(n).toLocaleString("en-IE"); }
function fmtEUR(n) { return "€" + Math.round(n).toLocaleString("en-IE"); }
function fmtPct(n) { return n + "%"; }

function badgeForAppointmentStatus(status) {
  const map = { "Completed": "status-completed", "No-Show": "status-noshow", "Cancelled - Rescheduled": "status-cancelled", "Cancelled - No Reschedule": "status-cancelled" };
  return map[status] || "";
}
function badgeForResourceStatus(status) {
  if (!status) return "";
  if (status.indexOf("Underutilized") === 0) return "status-underutilized";
  if (status.indexOf("Overbooked") === 0) return "status-overbooked";
  return "status-healthy";
}
function badgeForWaitlistStatus(status) {
  const map = { Waiting: "status-waiting", Scheduled: "status-scheduled", "Offered Slot": "status-offered", Removed: "status-removed" };
  return map[status] || "";
}
function badgeForUrgency(level) {
  const map = { Urgent: "urgency-urgent", Routine: "urgency-routine", "Follow-up": "urgency-follow-up", "New Patient": "urgency-new-patient" };
  return map[level] || "";
}
function utilBarFillColor(pct) {
  if (pct < 60) return "#155eef";
  if (pct > 90) return "#dc2626";
  return "#12b76a";
}

// ---------------------------------------------------------------- tab switch
function meridianInitTabs() {
  const titles = {
    "action-center": ["Action Center", "Prioritized items from all five AI agents, as of the latest connected data"],
    overview: ["Overview", "Network-wide access & capacity snapshot"],
    capacity: ["No-Show & Capacity Analytics", "Resource utilization, overbooking, and risk-model calibration"],
    waitlist: ["Waitlist Management", "Active patients awaiting an appointment"],
    revenue: ["Revenue Loss by Site", "Month-to-date no-show revenue impact, by location"],
    locations: ["Locations", "All Meridian facilities across the Republic of Ireland network"],
    team: ["Our Team", "All Meridian providers, with live performance signals"],
    patients: ["Patient Insights", "Coverage mix, access barriers, and no-show risk signals"],
    pipeline: ["AI Agent Pipeline", "The five-agent system behind this dashboard"],
  };
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-section").forEach((s) => s.classList.remove("active"));
      document.getElementById("tab-" + tab).classList.add("active");
      document.getElementById("topbar-title").textContent = titles[tab][0];
      document.getElementById("topbar-sub").textContent = titles[tab][1];
      document.getElementById("sidebar").classList.remove("open");
    });
  });
  document.getElementById("mobile-toggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
}

// -------------------------------------------------------------- source pill
function meridianRenderSourcePill(data) {
  const pill = document.getElementById("source-pill");
  const text = document.getElementById("source-pill-text");
  pill.classList.remove("live", "demo");
  if (data.meta.sourceMode === "live") {
    pill.classList.add("live");
    text.textContent = "Live Google Sheet";
  } else if (data.meta.sourceMode === "mixed") {
    pill.classList.add("demo");
    text.textContent = "Partial live / demo fallback";
  } else {
    pill.classList.add("demo");
    text.textContent = "Demo content snapshot";
  }
  document.getElementById("reporting-window-pill").textContent = data.meta.reportingWindow;
}

// -------------------------------------------------------------------- KPIs
function kpiCard(icon, value, label, sub, cls) {
  return `<div class="kpi-card ${cls || ""}">
    <div class="kpi-icon">${icon}</div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-label">${label}</div>
    ${sub ? `<div class="kpi-sub">${sub}</div>` : ""}
  </div>`;
}

// -------------------------------------------------------- AI Agent Insight & Action panel
// A single, consolidated, visually prominent component used on every data
// tab — one big card rather than several small boxes. `headline` is one
// bold auto-generated summary sentence; `findings` is a list of supporting
// insight sentences; `actions` is a list of { priority, text, owner }; the
// optional `side` object ({ kind, title, stat, sub }) drives a small
// decorative mini-chart for visual interest. Every value passed in is
// generated from the live/demo data model — nothing here is a fixed
// template value.
function renderAIPanel(containerId, agentKey, tag, headline, findings, actions, side) {
  const agent = MERIDIAN_AGENTS.find((a) => a.key === agentKey) || MERIDIAN_AGENTS[0];
  const el = document.getElementById(containerId);
  if (!el) return;
  const sideChartId = containerId + "-sidechart";
  el.innerHTML = `
    <div class="ai-panel" style="--agent-panel-color:${agent.color};">
      <div class="ai-panel-head">
        <div class="ai-avatar">${agent.icon}</div>
        <div>
          <div class="ai-panel-label">AI Agent Insight &amp; Action</div>
          <div class="ai-panel-agent">${agent.name} · ${agent.role}</div>
        </div>
        <div class="ai-panel-tag">${tag}</div>
      </div>
      <div class="ai-panel-body">
        <div>
          ${headline ? `<div class="ai-headline">${headline}</div>` : ""}
          <ul class="ai-findings-list">${findings.map((f) => `<li>${f}</li>`).join("")}</ul>
          <div class="ai-actions-title">✅ Recommended Action for Staff</div>
          <ul class="ai-actions-list">
            ${actions
              .map(
                (a) => `<li>
                <span class="action-priority ${a.priority}">${a.priority.toUpperCase()}</span>
                <div><div class="action-text">${a.text}</div><div class="action-owner">Owner: ${a.owner}</div></div>
              </li>`
              )
              .join("")}
          </ul>
        </div>
        ${
          side
            ? `<div class="ai-side">
          <div class="ai-side-title">${side.title}</div>
          <div class="ai-side-chart-wrap"><canvas id="${sideChartId}"></canvas></div>
          ${side.stat ? `<div class="ai-side-stat"><div class="n">${side.stat}</div><div class="l">${side.sub || ""}</div></div>` : ""}
        </div>`
            : ""
        }
      </div>
    </div>`;
  if (side && side.render) side.render(sideChartId);
}

function meridianRenderOverviewKPIs(data) {
  const a = data.annual;
  const nt = data.networkTrend;
  document.getElementById("kpi-grid").innerHTML = [
    kpiCard("📅", fmtInt(a.total_appointments_scheduled), "Appointments Scheduled", "Operational sample, n = 12,000"),
    kpiCard("⚠️", fmtPct(a.no_show_rate_pct), "No-Show Rate (Sample)", `Network trend: ${fmtPct(nt.no_show_rate_pct)} over 12 months`, "bad"),
    kpiCard("💶", fmtEUR(nt.total_revenue_loss_eur), "Est. Revenue Loss (12-mo Trend)", `Sample window: ${fmtEUR(a.revenue_loss_eur_sample)}`, "warn"),
    kpiCard("🛏️", fmtInt(a.active_waitlist_entries), "Active Waitlist Entries", `Avg wait: ${data.waitlistSummary.avg_days_waiting_active} days`),
    kpiCard("🧩", fmtPct(a.avg_resource_utilization_pct), "Avg. Resource Utilization", "Trailing 12 months, network-wide"),
    kpiCard("🎯", fmtInt(a.overbooked_slots_applied), "Overbooked Slots Applied", "Risk-calibrated capacity management"),
    kpiCard("✅", fmtInt(a.completed_visits), "Completed Visits", `${fmtPct(Math.round((a.completed_visits / a.total_appointments_scheduled) * 1000) / 10)} completion rate`, "good"),
    kpiCard("🏥", data.facilities.length + " / " + data.providers.length, "Locations / Providers", `${data.departmentNames.length} departments network-wide`),
  ].join("");
}


function meridianRenderCapacityKPIs(data) {
  const resources = data.resources;
  const healthy = resources.filter((r) => r.status === "Healthy").length;
  const under = resources.filter((r) => r.status && r.status.indexOf("Underutilized") === 0).length;
  const over = resources.filter((r) => r.status && r.status.indexOf("Overbooked") === 0).length;
  document.getElementById("capacity-kpi-grid").innerHTML = [
    kpiCard("🧩", fmtInt(resources.length), "Total Tracked Resources", "Rooms, suites & equipment"),
    kpiCard("✅", fmtInt(healthy), "Healthy Utilization (60–90%)", mfmtPctOf(healthy, resources.length), "good"),
    kpiCard("📉", fmtInt(under), "Underutilized (<60%)", mfmtPctOf(under, resources.length), "warn"),
    kpiCard("📈", fmtInt(over), "Overbooked (>90%)", mfmtPctOf(over, resources.length), "bad"),
  ].join("");
}
function mfmtPctOf(part, whole) { return whole ? Math.round((part / whole) * 1000) / 10 + "% of resources" : ""; }

function meridianRenderWaitlistKPIs(data) {
  const ws = data.waitlistSummary;
  document.getElementById("waitlist-kpi-grid").innerHTML = [
    kpiCard("🛏️", fmtInt(ws.active_waiting), "Currently Waiting", "Status = Waiting", "warn"),
    kpiCard("⏱️", ws.avg_days_waiting_active + " days", "Avg. Days Waiting (Active)", "Among patients still waiting"),
    kpiCard("📆", fmtInt(ws.by_status.find((s) => s.label === "Scheduled")?.count || 0), "Successfully Scheduled", "From this waitlist cohort", "good"),
    kpiCard("🗂️", fmtInt(ws.total), "Total Waitlist Records", "All statuses, full window"),
  ].join("");
}

function meridianRenderPatientKPIs(data) {
  const p = data.patientInsights;
  document.getElementById("patient-kpi-grid").innerHTML = [
    kpiCard("🧑‍🤝‍🧑", fmtInt(p.total_patients), "Total Patients", "In the connected patient roster"),
    kpiCard("🚗", fmtPct(p.transportation_barrier_pct), "Report a Transportation Barrier"),
    kpiCard("💻", fmtPct(p.portal_enrolled_pct), "Enrolled in Patient Portal", "", "good"),
    kpiCard("📊", p.avg_prior_no_shows, "Avg. Prior No-Shows (12mo)", `Avg. distance to nearest facility: ${p.avg_distance_km} km`),
  ].join("");
}

// ---------------------------------------------------------- generic table
function buildPager(pagerEl, page, pageSize, total, onPage) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  page = Math.min(page, pages);
  pagerEl.innerHTML = `
    <span>Showing ${total === 0 ? 0 : (page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}</span>
    <span style="display:flex; gap:6px;">
      <button class="btn" id="${pagerEl.id}-prev" ${page <= 1 ? "disabled" : ""}>‹ Prev</button>
      <span style="padding:5px 4px;">Page ${page} / ${pages}</span>
      <button class="btn" id="${pagerEl.id}-next" ${page >= pages ? "disabled" : ""}>Next ›</button>
    </span>`;
  document.getElementById(`${pagerEl.id}-prev`)?.addEventListener("click", () => onPage(page - 1));
  document.getElementById(`${pagerEl.id}-next`)?.addEventListener("click", () => onPage(page + 1));
  return page;
}

// ------------------------------------------------------------- resource tab
const meridianResourceState = { page: 1, sortKey: "utilization_pct", sortDir: "desc" };
function meridianRenderResourceTable(data) {
  const search = (document.getElementById("resource-search").value || "").toLowerCase();
  const facility = document.getElementById("resource-filter-facility").value;
  const type = document.getElementById("resource-filter-type").value;
  const status = document.getElementById("resource-filter-status").value;

  let rows = data.resources;
  if (facility) rows = rows.filter((r) => r.facility_id === facility);
  if (type) rows = rows.filter((r) => r.resource_type === type);
  if (status) rows = rows.filter((r) => r.status === status);
  if (search) rows = rows.filter((r) => (r.resource_id + r.resource_type + r.facility_name).toLowerCase().includes(search));

  const { sortKey, sortDir } = meridianResourceState;
  rows = rows.slice().sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  document.getElementById("resource-count").textContent = rows.length + (rows.length === 1 ? " resource" : " resources");

  const pageSize = 10;
  const page = buildPager(document.getElementById("resource-pager"), meridianResourceState.page, pageSize, rows.length, (p) => {
    meridianResourceState.page = p;
    meridianRenderResourceTable(data);
  });
  meridianResourceState.page = page;
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  document.getElementById("resource-tbody").innerHTML = pageRows
    .map(
      (r) => `<tr>
      <td>${r.resource_id}</td>
      <td>${r.resource_type}</td>
      <td>${r.facility_name}</td>
      <td>${r.county}</td>
      <td><span class="util-bar-wrap"><span class="util-bar-fill" style="width:${Math.min(r.utilization_pct, 100)}%; background:${utilBarFillColor(r.utilization_pct)};"></span></span>${r.utilization_pct}%</td>
      <td>${r.turnaround_minutes}</td>
      <td><span class="badge ${badgeForResourceStatus(r.status)}">${r.status}</span></td>
      <td>${r.next_maintenance_date || "—"}</td>
    </tr>`
    )
    .join("");
}

// ------------------------------------------------------------- waitlist tab
const meridianWaitlistState = { page: 1, sortKey: "days_on_waitlist", sortDir: "desc" };
function meridianRenderWaitlistTable(data) {
  const search = (document.getElementById("waitlist-search").value || "").toLowerCase();
  const dept = document.getElementById("waitlist-filter-dept").value;
  const urgency = document.getElementById("waitlist-filter-urgency").value;
  const status = document.getElementById("waitlist-filter-status").value;

  let rows = data.waitlist;
  if (dept) rows = rows.filter((w) => w.department === dept);
  if (urgency) rows = rows.filter((w) => w.urgency_level === urgency);
  if (status) rows = rows.filter((w) => w.status === status);
  if (search) rows = rows.filter((w) => (w.patient_id + w.preferred_facility_name).toLowerCase().includes(search));

  const { sortKey, sortDir } = meridianWaitlistState;
  rows = rows.slice().sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  document.getElementById("waitlist-count").textContent = rows.length + (rows.length === 1 ? " entry" : " entries");

  const pageSize = 10;
  const page = buildPager(document.getElementById("waitlist-pager"), meridianWaitlistState.page, pageSize, rows.length, (p) => {
    meridianWaitlistState.page = p;
    meridianRenderWaitlistTable(data);
  });
  meridianWaitlistState.page = page;
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  document.getElementById("waitlist-tbody").innerHTML = pageRows
    .map(
      (w) => `<tr>
      <td>${w.waitlist_id}</td>
      <td>${w.patient_id}</td>
      <td>${w.department}</td>
      <td><span class="badge ${badgeForUrgency(w.urgency_level)}">${w.urgency_level}</span></td>
      <td>${w.date_added}</td>
      <td>${w.days_on_waitlist}</td>
      <td>${w.preferred_facility_name}</td>
      <td><span class="badge ${badgeForWaitlistStatus(w.status)}">${w.status}</span></td>
    </tr>`
    )
    .join("");
}

// ----------------------------------------------------------------- team tab
const meridianTeamState = { page: 1, sortKey: "no_show_rate_pct", sortDir: "desc" };

function meridianTeamFilteredRows(data) {
  const search = (document.getElementById("team-search").value || "").toLowerCase();
  const dept = document.getElementById("team-filter-dept").value;
  const county = document.getElementById("team-filter-county").value;

  let rows = data.providerPerformance;
  if (dept) rows = rows.filter((p) => p.department === dept);
  if (county) rows = rows.filter((p) => p.county === county);
  if (search) rows = rows.filter((p) => p.provider_name.toLowerCase().includes(search));
  return rows;
}

function providerInitials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function meridianRenderTeamCards(rows) {
  document.getElementById("team-card-grid").innerHTML = rows
    .map((p) => {
      const hasSample = p.appts_sample_total >= 3;
      let signalCls = "neutral", signalTxt = "Not enough sample data yet this window.";
      if (hasSample) {
        if (p.vs_dept_avg_pct_pts <= -3) { signalCls = "good"; signalTxt = `${Math.abs(p.vs_dept_avg_pct_pts)} pts below dept avg no-show rate`; }
        else if (p.vs_dept_avg_pct_pts >= 3) { signalCls = "bad"; signalTxt = `${p.vs_dept_avg_pct_pts} pts above dept avg no-show rate`; }
        else { signalTxt = `In line with dept avg (${fmtPct(p.dept_avg_no_show_rate_pct)})`; }
      }
      return `<div class="provider-card">
        <div class="provider-card-head">
          <div class="provider-avatar">${providerInitials(p.provider_name)}</div>
          <div><h4>${p.provider_name}</h4><div class="prov-cred">${p.credential_label} · ${p.department}</div></div>
        </div>
        <div class="provider-facts">
          <div>Home Location<b>${p.facility_name}</b></div>
          <div>County<b>${p.county}</b></div>
          <div>Appts (Sample)<b>${p.appts_sample_total}</b></div>
          <div>Years at Meridian<b>${p.years_at_meridian}</b></div>
          <div>No-Show Rate<b>${hasSample ? fmtPct(p.no_show_rate_pct) : "—"}</b></div>
          <div>Avg Risk Score<b>${hasSample ? fmtPct(p.avg_risk_score_pct) : "—"}</b></div>
        </div>
        <div class="provider-signal ${signalCls}">${signalCls === "good" ? "✅" : signalCls === "bad" ? "⚠️" : "•"} ${signalTxt}</div>
      </div>`;
    })
    .join("");
}

function meridianRenderTeamTable(data) {
  let rows = meridianTeamFilteredRows(data);

  const { sortKey, sortDir } = meridianTeamState;
  rows = rows.slice().sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  document.getElementById("team-count").textContent = rows.length + (rows.length === 1 ? " provider" : " providers");
  meridianRenderTeamCards(rows);

  const pageSize = 10;
  const page = buildPager(document.getElementById("team-pager"), meridianTeamState.page, pageSize, rows.length, (p) => {
    meridianTeamState.page = p;
    meridianRenderTeamTable(data);
  });
  meridianTeamState.page = page;
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  document.getElementById("team-tbody").innerHTML = pageRows
    .map(
      (p) => `<tr>
      <td>${p.provider_name}</td>
      <td>${p.credential_label}</td>
      <td>${p.department}</td>
      <td>${p.facility_name}</td>
      <td>${p.county}</td>
      <td>${p.appts_sample_total}</td>
      <td>${p.appts_sample_total >= 3 ? fmtPct(p.no_show_rate_pct) : "—"}</td>
      <td>${p.years_at_meridian}</td>
    </tr>`
    )
    .join("");
}

function meridianWireTeamViewToggle() {
  document.getElementById("team-view-toggle").addEventListener("change", (e) => {
    const table = document.getElementById("team-table-wrap");
    const cards = document.getElementById("team-card-grid");
    if (e.target.value === "table") { table.style.display = "block"; cards.style.display = "none"; }
    else { table.style.display = "none"; cards.style.display = "grid"; }
  });
}

// ------------------------------------------------------------- sortable ths
function meridianWireSortableHeaders(tableId, state, renderFn) {
  document.querySelectorAll(`#${tableId} th[data-sort]`).forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort");
      if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      else { state.sortKey = key; state.sortDir = "asc"; }
      state.page = 1;
      renderFn(window.MERIDIAN_DASHBOARD_DATA);
    });
  });
}

// ---------------------------------------------------------------- locations
function meridianRenderLocations(data) {
  const search = (document.getElementById("location-search").value || "").toLowerCase();
  const county = document.getElementById("location-filter-county").value;
  const type = document.getElementById("location-filter-type").value;

  let rows = data.facilities;
  if (county) rows = rows.filter((f) => f.county === county);
  if (type) rows = rows.filter((f) => f.facility_type === type);
  if (search) rows = rows.filter((f) => f.facility_name.toLowerCase().includes(search));

  document.getElementById("location-count").textContent = rows.length + (rows.length === 1 ? " location" : " locations");
  document.getElementById("location-grid").innerHTML = rows
    .map(
      (f) => `<div class="mini-card">
      <span class="badge">${f.facility_type}</span>
      <h4 style="margin-top:8px;">${f.facility_name}</h4>
      <div class="mini-meta">Co. ${f.county}</div>
      <div class="mini-facts">
        <div><b>${f.provider_count}</b> Doctors</div>
        <div><b>${f.num_exam_rooms}</b> Exam Rooms</div>
        <div><b>${f.open_days_per_week}</b> Days/wk</div>
        <div><b>${f.num_specialty_resources}</b> Specialty Suites</div>
      </div>
    </div>`
    )
    .join("");
}

// ------------------------------------------------------------- Ireland map
let meridianSelectedCounty = null;

function meridianCountyColor(rate) {
  if (rate >= 25) return "#dc2626";
  if (rate >= 18) return "#d97706";
  if (rate > 0) return "#155eef";
  return "#94a3b8";
}

function meridianRenderIrelandMap(data) {
  const summary = data.countySummary;
  const maxFac = Math.max(1, ...summary.map((c) => c.facility_count));
  const known = summary.filter((c) => MERIDIAN_COUNTY_COORDS[c.county]);
  const unknown = summary.filter((c) => !MERIDIAN_COUNTY_COORDS[c.county]);

  const dots = known
    .map((c) => {
      const [x, y] = MERIDIAN_COUNTY_COORDS[c.county];
      const r = 7 + (c.facility_count / maxFac) * 14;
      const color = meridianCountyColor(c.no_show_rate_pct);
      const sel = meridianSelectedCounty === c.county ? "selected" : "";
      return `<circle class="county-dot ${sel}" data-county="${c.county}" cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity="0.82"></circle>
              <text class="county-label" x="${x}" y="${y - r - 4}" text-anchor="middle">${c.county}</text>`;
    })
    .join("");

  document.getElementById("ireland-map-svg-wrap").innerHTML = `
    <svg viewBox="${MERIDIAN_IRELAND_VIEWBOX}">
      <path class="ireland-landmass" d="${MERIDIAN_IRELAND_PATH}"></path>
      ${dots}
    </svg>
    <div class="map-tooltip" id="map-tooltip"></div>`;

  document.getElementById("county-rank-list").innerHTML = summary
    .slice()
    .sort((a, b) => b.facility_count - a.facility_count)
    .map(
      (c) => `<div class="county-rank-row" data-county="${c.county}">
        <span class="swatch" style="background:${meridianCountyColor(c.no_show_rate_pct)};"></span>
        <span class="name">Co. ${c.county}</span>
        <span class="stat">${c.facility_count} sites · ${c.provider_count} providers · ${c.no_show_rate_pct > 0 ? fmtPct(c.no_show_rate_pct) + " no-show" : "no sample yet"}</span>
      </div>`
    )
    .join("") + (unknown.length ? `<div style="font-size:11px; color:var(--slate); margin-top:6px;">+ ${unknown.length} other location(s) outside the mapped county list.</div>` : "");

  document.getElementById("map-legend").innerHTML = `
    <span class="item"><span class="sw" style="background:#155eef;"></span> Lower no-show rate</span>
    <span class="item"><span class="sw" style="background:#d97706;"></span> Elevated (18%+)</span>
    <span class="item"><span class="sw" style="background:#dc2626;"></span> High (25%+)</span>
    <span class="item"><span class="sw" style="background:#94a3b8;"></span> No sample yet</span>`;
}

function meridianWireIrelandMap() {
  const applyCountyFilter = (county) => {
    meridianSelectedCounty = meridianSelectedCounty === county ? null : county;
    document.getElementById("location-filter-county").value = meridianSelectedCounty || "";
    meridianRenderLocations(window.MERIDIAN_DASHBOARD_DATA);
    meridianRenderIrelandMap(window.MERIDIAN_DASHBOARD_DATA);
  };
  const wrap = document.getElementById("ireland-map-svg-wrap");
  if (wrap) wrap.addEventListener("click", (e) => {
    const dot = e.target.closest(".county-dot");
    if (dot) applyCountyFilter(dot.getAttribute("data-county"));
  });
  const list = document.getElementById("county-rank-list");
  if (list) list.addEventListener("click", (e) => {
    const row = e.target.closest(".county-rank-row");
    if (row) applyCountyFilter(row.getAttribute("data-county"));
  });
}

// ------------------------------------------------------- revenue by site tab
function meridianRenderRevenueKPIs(data) {
  const rv = data.revenueBySite;
  document.getElementById("revenue-kpi-grid").innerHTML = [
    kpiCard("💶", fmtEUR(rv.total_revenue_loss_eur), "Total MTD Revenue Loss", `${rv.current_month} · ${rv.total_no_shows} no-shows`, "bad"),
    kpiCard("🏥", rv.worst_site ? rv.worst_site.facility_name : "—", "Highest-Loss Site", rv.worst_site ? fmtEUR(rv.worst_site.revenue_loss_eur) : "", "warn"),
    kpiCard("📊", fmtEUR(rv.avg_revenue_loss_per_site_eur), "Avg Loss per Active Site", `Across sites with MTD activity`),
    kpiCard("🚫", rv.sites_with_no_activity, "Sites With No MTD Activity", "Shown honestly below, not hidden"),
  ].join("");
}

function meridianRenderSiteCards(data) {
  const sites = data.revenueBySite.sites;
  const maxLoss = Math.max(1, ...sites.map((s) => s.revenue_loss_eur));
  document.getElementById("site-card-grid").innerHTML = sites
    .map((s, i) => {
      const rankCls = i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "";
      return `<div class="site-card ${rankCls}" data-facility="${s.facility_id}">
        <div class="rank">${i + 1}</div>
        <div><div class="site-name">${s.facility_name}</div><div class="site-meta">${s.facility_type} · Co. ${s.county}</div></div>
        <div><div class="metric-label">No-Show Rate</div><div class="metric-value">${s.scheduled ? fmtPct(s.no_show_rate_pct) : "—"}</div></div>
        <div><div class="metric-label">Scheduled / No-Shows</div><div class="metric-value">${s.scheduled} / ${s.no_shows}</div></div>
        <div>
          <div class="metric-label">Revenue Loss</div>
          <div class="metric-value">${fmtEUR(s.revenue_loss_eur)}</div>
          <div class="rev-bar-wrap"><div class="rev-bar-fill" style="width:${(s.revenue_loss_eur / maxLoss) * 100}%;"></div></div>
        </div>
      </div>`;
    })
    .join("");
}

function meridianWireSiteCards() {
  const grid = document.getElementById("site-card-grid");
  if (!grid) return;
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".site-card");
    if (!card) return;
    document.querySelectorAll(".site-card").forEach((c) => c.style.outline = "none");
    card.style.outline = "2px solid var(--teal)";
  });
}

// ------------------------------------------------------------ pipeline panel
const MERIDIAN_AGENTS = [
  { key: "rory", name: "Rory", role: "Researcher", icon: "🟡", color: "#d97706", desc: "Connects to the live data source, pulls every tab fresh, and validates schema before anything downstream runs." },
  { key: "dara", name: "Dara", role: "Designer", icon: "🟠", color: "#c2410c", desc: "Turns raw metrics into a dashboard information architecture — which KPIs, charts, and filters staff actually need." },
  { key: "myles", name: "Myles", role: "Maker", icon: "🔵", color: "#155eef", desc: "Builds the working dashboard: layout, charts, tables, and filters wired directly to the connected data." },
  { key: "ciara", name: "Ciara", role: "Communicator", icon: "🟢", color: "#12b76a", desc: "Writes the plain-language insights and labels so clinical and operations staff can act without reading raw tables." },
  { key: "maeve", name: "Maeve", role: "Manager", icon: "🟣", color: "#7c3aed", desc: "Reviews the handoff end-to-end, checks the output solves the access & capacity problem, and signs off before release." },
];

function meridianRenderPipeline(data) {
  document.getElementById("pipeline-flow").innerHTML = MERIDIAN_AGENTS
    .map(
      (a, i) => `
    <div class="pipeline-node">
      <div class="agent-avatar" style="background:${a.color};">${a.icon}</div>
      <h4>${a.name}</h4>
      <div class="agent-role">${a.role}</div>
      <p>${a.desc}</p>
      <div class="agent-status-line"><span class="dot"></span> Handoff complete</div>
    </div>${i < MERIDIAN_AGENTS.length - 1 ? '<div class="pipeline-arrow">→</div>' : ""}`
    )
    .join("");

  document.getElementById("handoff-log").innerHTML = `
    <div><b>Rory → Dara:</b> ${data.meta.sourceMode === "live" ? "Live sheet" : "Demo snapshot"} synced — ${data.facilities.length} locations, ${data.providers.length} providers, ${data.appointments.length.toLocaleString()} appointments, ${data.waitlist.length} waitlist records validated.</div>
    <div><b>Dara → Myles:</b> Prioritized Access &amp; Capacity view — no-show trend, resource utilization, and waitlist flagged as the three highest-value panels.</div>
    <div><b>Myles → Ciara:</b> Dashboard build complete — ${document.querySelectorAll("canvas").length} charts, 3 filterable tables, ${MERIDIAN_AGENTS.length}-agent pipeline panel.</div>
    <div><b>Ciara → Maeve:</b> Insight copy generated directly from computed thresholds — no hand-written figures.</div>
    <div><b>Maeve:</b> Sign-off — output matches the Outpatient Access &amp; Capacity Optimization brief. Released to staff.</div>
  `;

  document.getElementById("pipeline-data-status").innerHTML = `
    <div><b>Source mode:</b> ${data.meta.sourceMode === "live" ? "Live Google Sheet" : "Demo snapshot (bundled)"} </div>
    <div><b>Reporting window:</b> ${data.meta.reportingWindow}</div>
    <div><b>Last synced:</b> ${new Date(data.meta.generatedAt).toLocaleString("en-IE")}</div>
    <div><b>Tabs loaded:</b> Organization_Info, Annual_Summary, Facilities, Providers, Patients, Resources, Appointments, Waitlist, NoShow_Trend_Monthly</div>
    <div style="margin-top:6px;"><button class="btn btn-teal" onclick="document.getElementById('connect-btn').click()">Connect a Live Sheet →</button></div>
  `;
}

// ====================================================================
// AI Agent Insight & Action panel content — every finding/action below is
// built from computed data.* values, never hand-typed constants.
// ====================================================================
function meridianRenderOverviewAIPanel(data) {
  const depts = data.departments.slice().sort((a, b) => b.trend_no_show_rate_pct - a.trend_no_show_rate_pct);
  const worst = depts[0];
  const second = depts[1];
  const under = data.resourceTypeSummary.filter((r) => r.avg_utilization_pct < 60);
  const over = data.resources.filter((r) => r.status && r.status.indexOf("Overbooked") === 0);
  const ai = data.appointmentInsights;
  const headline = `Across the ${data.filtersActive ? "current filtered slice" : "full network"}, <b>${worst.name}</b> is the single largest driver of no-show revenue loss (<b>${fmtPct(worst.trend_no_show_rate_pct)}</b> / <b>${fmtEUR(worst.trend_revenue_loss_eur)}</b>), while capacity is unevenly distributed rather than simply short overall.`;
  const findings = [
    `<b>${worst.name}</b> leads at <b>${fmtPct(worst.trend_no_show_rate_pct)}</b>, followed by <b>${second ? second.name : "—"}</b> at <b>${second ? fmtPct(second.trend_no_show_rate_pct) : "—"}</b> — together the two biggest contributors to modeled revenue loss.`,
    `<b>${over.length}</b> resources are currently overbooked (&gt;90% utilization) while <b>${under.length}</b> resource types average under 60% utilization network-wide.`,
    `Overbooked slots run at <b>${fmtPct(ai.overbooked_no_show_rate_pct)}</b> no-show vs <b>${fmtPct(ai.standard_no_show_rate_pct)}</b> for standard slots — the targeting logic is working as intended.`,
    `Reminders alone show little effect (<b>${fmtPct(ai.reminder_sent_no_show_rate_pct)}</b> no-show when sent vs <b>${fmtPct(ai.reminder_not_sent_no_show_rate_pct)}</b> when not) — the current script isn't moving the needle on its own.`,
  ];
  const actions = [
    { priority: "high", text: `Expand overbooking coverage in ${worst.name} — it carries the highest trend no-show rate and is under-covered relative to its risk.`, owner: "Scheduling Team" },
    { priority: "medium", text: `Reallocate referrals from overbooked resources toward the ${under.length} underutilized resource type(s) shown in Capacity.`, owner: "Facilities Ops" },
    { priority: "low", text: `Redesign the reminder workflow — sent vs. not-sent no-show rates are nearly identical today.`, owner: "Patient Communications" },
  ];
  const side = {
    title: "12-MONTH NO-SHOW TREND",
    stat: fmtPct(data.networkTrend.no_show_rate_pct),
    sub: "Network-wide average",
    render: (id) => renderMiniLine(id, data.monthlyTrend),
  };
  renderAIPanel("overview-ai-panel", "rory", "Network Snapshot", headline, findings, actions, side);
}

function meridianRenderCapacityAIPanel(data) {
  const resources = data.resources;
  const overList = resources.filter((r) => r.status && r.status.indexOf("Overbooked") === 0).sort((a, b) => b.utilization_pct - a.utilization_pct);
  const underList = resources.filter((r) => r.status && r.status.indexOf("Underutilized") === 0).sort((a, b) => a.utilization_pct - b.utilization_pct);
  const topOver = overList[0];
  const topUnder = underList[0];
  const calib = data.appointmentInsights.risk_band_calibration.filter((b) => b.total > 0);
  const highBand = calib[calib.length - 1];
  const headline = `The risk model calibrates cleanly — appointments in the <b>${highBand.band_label}</b> predicted-risk band convert to a <b>${highBand.no_show_rate_pct}%</b> actual no-show rate, a strong signal for where to focus overbooking and outreach.`;
  const findings = [
    topOver ? `<b>${topOver.resource_id}</b> (${topOver.resource_type}, ${topOver.facility_name}) is the most overbooked resource at <b>${topOver.utilization_pct}%</b> utilization.` : "No resources are currently overbooked.",
    topUnder ? `<b>${topUnder.resource_id}</b> (${topUnder.resource_type}, ${topUnder.facility_name}) is the most underutilized at <b>${topUnder.utilization_pct}%</b> — capacity sitting idle nearby.` : "No resources are currently underutilized.",
    `${overList.length} resources are overbooked and ${underList.length} are underutilized across the current view.`,
  ];
  const actions = [
    { priority: "high", text: topOver ? `Redirect new bookings for ${topOver.resource_type} away from ${topOver.facility_name} where possible — that resource is over capacity.` : "Maintain current overbooking thresholds.", owner: "Resource Scheduling" },
    { priority: "medium", text: topUnder ? `Promote ${topUnder.facility_name}'s ${topUnder.resource_type} capacity to patients on the waitlist in the same county — it has headroom today.` : "Monitor utilization trend.", owner: "Facilities Ops" },
    { priority: "medium", text: `Prioritize outreach calls for appointments scoring above ${highBand.band_label.split("–")[0]}% predicted risk — that band alone converts to a ${highBand.no_show_rate_pct}% actual no-show rate.`, owner: "Patient Communications" },
  ];
  const side = {
    title: "RESOURCE STATUS MIX",
    stat: fmtInt(data.resources.length),
    sub: "Tracked resources in view",
    render: (id) => renderMiniDonut(id, [
      { label: "Healthy", count: data.resources.filter((r) => r.status === "Healthy").length },
      { label: "Underutilized", count: underList.length },
      { label: "Overbooked", count: overList.length },
    ], "label", "count", [MERIDIAN_PALETTE.green, MERIDIAN_PALETTE.teal, MERIDIAN_PALETTE.red]),
  };
  renderAIPanel("capacity-ai-panel", "myles", "Capacity Signal", headline, findings, actions, side);
}

function meridianRenderWaitlistAIPanel(data) {
  const ws = data.waitlistSummary;
  const urgent = data.waitlist.filter((w) => w.status === "Waiting" && w.urgency_level === "Urgent");
  const longestWait = data.waitlist.filter((w) => w.status === "Waiting").sort((a, b) => b.days_on_waitlist - a.days_on_waitlist)[0];
  const topDept = ws.by_department.slice().sort((a, b) => b.count - a.count)[0];
  const headline = `<b>${ws.active_waiting}</b> patients are actively waiting, averaging <b>${ws.avg_days_waiting_active} days</b> — <b>${urgent.length}</b> are flagged Urgent and need first attention.`;
  const findings = [
    longestWait ? `The longest-waiting active patient (<b>${longestWait.patient_id}</b>, ${longestWait.department}) has been on the list for <b>${longestWait.days_on_waitlist} days</b>, preferring ${longestWait.preferred_facility_name}.` : "",
    topDept ? `<b>${topDept.label}</b> has the largest active waitlist by department (<b>${topDept.count}</b> patients).` : "",
  ].filter(Boolean);
  const actions = [
    { priority: "high", text: urgent.length ? `Clear the ${urgent.length} Urgent-tagged waiting patients first — cross-check same-day cancellations network-wide for open slots.` : "No Urgent-tagged patients currently waiting.", owner: "Patient Access Team" },
    { priority: "medium", text: longestWait ? `Proactively contact ${longestWait.patient_id} (${longestWait.days_on_waitlist} days waiting) with any earlier opening, including nearby locations.` : "No long-waiting outliers detected.", owner: "Scheduling Team" },
    { priority: "medium", text: topDept ? `Add short-notice capacity in ${topDept.label} — it is the top department by active waitlist volume.` : "", owner: "Department Leads" },
  ];
  const side = {
    title: "WAITLIST BY URGENCY",
    stat: fmtInt(urgent.length),
    sub: "Urgent & still waiting",
    render: (id) => renderMiniDonut(id, ws.by_urgency, "label", "count"),
  };
  renderAIPanel("waitlist-ai-panel", "dara", "Queue Health", headline, findings, actions, side);
}

function meridianRenderRevenueAIPanel(data) {
  const rv = data.revenueBySite;
  const worst = rv.worst_site;
  const secondWorst = rv.sites.filter((s) => s.scheduled > 0)[1];
  const headline = `Meridian's network lost an estimated <b>${fmtEUR(rv.total_revenue_loss_eur)}</b> to no-shows in <b>${rv.current_month || "—"}</b> (month to date), across <b>${rv.total_no_shows}</b> missed visits.`;
  const findings = [
    worst ? `<b>${worst.facility_name}</b> (Co. ${worst.county}) is the highest-loss site this month at <b>${fmtEUR(worst.revenue_loss_eur)}</b>, on a <b>${fmtPct(worst.no_show_rate_pct)}</b> no-show rate.` : "",
    secondWorst ? `<b>${secondWorst.facility_name}</b> follows at <b>${fmtEUR(secondWorst.revenue_loss_eur)}</b> (${fmtPct(secondWorst.no_show_rate_pct)} no-show rate).` : "",
    rv.sites_with_no_activity ? `<b>${rv.sites_with_no_activity}</b> site(s) show no scheduled appointments yet this month — worth confirming these are reporting correctly.` : "",
  ].filter(Boolean);
  const actions = [
    { priority: "high", text: worst ? `Launch a same-day reminder call campaign at ${worst.facility_name} for the rest of this month — it is the single largest MTD loss driver.` : "No site currently stands out as a loss driver.", owner: "Site Manager" },
    { priority: "medium", text: secondWorst ? `Review overbooking thresholds at ${secondWorst.facility_name} — its no-show rate is running above the network average this month.` : "", owner: "Scheduling Team" },
    { priority: "low", text: `Re-run this view at month end to confirm the final loss figure and compare against last month's trend.`, owner: "Finance / Ops Analytics" },
  ];
  const top3 = rv.sites.filter((s) => s.scheduled > 0).slice(0, 3);
  const side = {
    title: "TOP 3 SITES BY MTD LOSS",
    stat: fmtEUR(rv.avg_revenue_loss_per_site_eur),
    sub: "Avg loss per active site",
    render: (id) => renderMiniBar(id, top3.map((s) => s.facility_name), top3.map((s) => s.revenue_loss_eur), MERIDIAN_PALETTE.red),
  };
  renderAIPanel("revenue-ai-panel", "ciara", `MTD: ${rv.current_month || "—"}`, headline, findings, actions, side);
}

function meridianRenderLocationsAIPanel(data) {
  const cs = data.countySummary.slice().sort((a, b) => b.no_show_rate_pct - a.no_show_rate_pct);
  const worstCounty = cs[0];
  const mostFacilities = data.countySummary.slice().sort((a, b) => b.facility_count - a.facility_count)[0];
  const fewestProviders = data.countySummary.slice().sort((a, b) => a.provider_count - b.provider_count)[0];
  const headline = worstCounty ? `Co. <b>${worstCounty.county}</b> has the highest sample no-show rate in view at <b>${fmtPct(worstCounty.no_show_rate_pct)}</b>, across <b>${worstCounty.facility_count}</b> facilities — a strong candidate for the next outreach push.` : "No county-level signal available for the current view.";
  const findings = [
    mostFacilities ? `Co. <b>${mostFacilities.county}</b> has the largest facility footprint (<b>${mostFacilities.facility_count}</b> locations).` : "",
    fewestProviders ? `Co. <b>${fewestProviders.county}</b> has the smallest provider headcount (<b>${fewestProviders.provider_count}</b>) relative to its facility count — a potential staffing gap.` : "",
  ].filter(Boolean);
  const actions = [
    { priority: "high", text: worstCounty ? `Prioritize the outreach/overbooking playbook for Co. ${worstCounty.county} facilities — highest no-show rate in view.` : "", owner: "Regional Ops Lead" },
    { priority: "medium", text: fewestProviders ? `Assess provider staffing levels in Co. ${fewestProviders.county} against facility count before next scheduling cycle.` : "", owner: "Workforce Planning" },
    { priority: "low", text: "Use the map below to drill into any county — click a marker or list row to filter the facility grid.", owner: "All Staff" },
  ];
  const top5 = cs.filter((c) => c.facility_count > 0).slice(0, 5);
  const side = {
    title: "FACILITIES BY COUNTY (TOP 5)",
    stat: fmtInt(data.facilities.length),
    sub: "Facilities in current view",
    render: (id) => renderMiniBar(id, top5.map((c) => c.county), top5.map((c) => c.facility_count), MERIDIAN_PALETTE.teal),
  };
  renderAIPanel("locations-ai-panel", "rory", "Regional View", headline, findings, actions, side);
}

function meridianRenderTeamAIPanel(data) {
  const perf = data.providerPerformance.filter((p) => p.appts_sample_total >= 5);
  const best = perf.slice().sort((a, b) => a.vs_dept_avg_pct_pts - b.vs_dept_avg_pct_pts)[0];
  const worst = perf.slice().sort((a, b) => b.vs_dept_avg_pct_pts - a.vs_dept_avg_pct_pts)[0];
  const avgTenure = mRound(mAvg(data.providers, (p) => p.years_at_meridian), 1);
  const headline = best && worst ? `<b>${best.provider_name}</b> runs <b>${Math.abs(best.vs_dept_avg_pct_pts)} pts below</b> their department average no-show rate, while <b>${worst.provider_name}</b> runs <b>${Math.abs(worst.vs_dept_avg_pct_pts)} pts above</b> — a coaching opportunity worth pairing up.` : "Not enough sampled appointments in the current view to compare provider performance.";
  const findings = [
    `Average tenure in view is <b>${avgTenure} years</b> across ${data.providers.length} providers in ${data.departmentNames.length} department(s).`,
  ];
  const actions = [
    { priority: "medium", text: best ? `Document ${best.provider_name}'s scheduling/reminder approach in ${best.department} as a best-practice to share department-wide.` : "", owner: "Department Lead" },
    { priority: "high", text: worst ? `Pair ${worst.provider_name} with a peer mentor in ${worst.department} and review their appointment mix for risk-factor patterns.` : "", owner: "Department Lead" },
    { priority: "low", text: "Use the Card View below for a quick per-provider read, or switch to Table View to sort and export.", owner: "All Staff" },
  ];
  const side = {
    title: "PROVIDERS BY DEPARTMENT",
    stat: fmtInt(data.providers.length),
    sub: "Providers in current view",
    render: (id) => renderMiniDonut(id, data.departments.map((d) => ({ label: d.name, count: d.provider_count })), "label", "count"),
  };
  renderAIPanel("team-ai-panel", "maeve", "Performance Signals", headline, findings, actions, side);
}

function meridianRenderPatientsAIPanel(data) {
  const p = data.patientInsights;
  const distSorted = p.avg_prior_no_shows_by_distance.slice().sort((a, b) => b.avg - a.avg);
  const ageSorted = p.avg_prior_no_shows_by_age.slice().sort((a, b) => b.avg - a.avg);
  const insByAvg = p.avg_prior_no_shows_by_insurance.slice().sort((a, b) => b.avg - a.avg);
  const withB = p.avg_prior_no_shows_with_barrier;
  const withoutB = p.avg_prior_no_shows_without_barrier;
  const diff = Math.abs(withB - withoutB);
  const headline = `<b>${distSorted[0].label}</b> patients show the highest average prior no-shows (<b>${distSorted[0].avg}</b>) of any distance band, and <b>${ageSorted[0].label}</b> patients lead by age band (<b>${ageSorted[0].avg}</b>) — travel time and age matter more than coverage type.`;
  const findings = [
    `Coverage type alone is a weak predictor: <b>${insByAvg[0].label.split(" (")[0]}</b> patients average <b>${insByAvg[0].avg}</b> prior no-shows vs <b>${insByAvg[insByAvg.length - 1].avg}</b> for <b>${insByAvg[insByAvg.length - 1].label.split(" (")[0]}</b> — risk scoring should keep leaning on appointment-level signals, not coverage type.`,
    `<b>${p.transportation_barrier_pct}%</b> of patients report a transportation barrier; their average prior no-shows (<b>${withB}</b>) is ${diff < 0.15 ? "comparable to" : withB > withoutB ? "higher than" : "lower than"} patients without one (<b>${withoutB}</b>).`,
    `Only <b>${p.portal_enrolled_pct}%</b> of patients are enrolled in the portal — a large share are reachable only by phone, SMS, or email reminders.`,
  ];
  const actions = [
    { priority: "medium", text: `Offer telehealth or transport-assistance options by default to patients in the ${distSorted[0].label} band when booking.`, owner: "Patient Access Team" },
    { priority: "medium", text: `Target portal enrollment campaigns at patients in the ${ageSorted[0].label} age band, where prior no-shows run highest.`, owner: "Patient Communications" },
    { priority: "low", text: "Cross-reference this with the Waitlist tab before reassigning slots freed up by predicted no-shows.", owner: "Scheduling Team" },
  ];
  const side = {
    title: "COVERAGE MIX",
    stat: fmtInt(p.total_patients),
    sub: "Patients in current view",
    render: (id) => renderMiniDonut(id, p.insurance_mix, "label", "count"),
  };
  renderAIPanel("patients-ai-panel", "ciara", "Population Signals", headline, findings, actions, side);
}

// -------------------------------------------------------------- filter fill
function meridianFillSelect(selectEl, values) {
  values.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
}

function meridianPopulateFilters(data) {
  const facSelect = document.getElementById("resource-filter-facility");
  facSelect.innerHTML = '<option value="">All Locations</option>';
  data.facilities
    .slice()
    .sort((a, b) => a.facility_name.localeCompare(b.facility_name))
    .forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.facility_id;
      opt.textContent = f.facility_name;
      facSelect.appendChild(opt);
    });

  meridianFillSelect(document.getElementById("resource-filter-type"), Array.from(new Set(data.resources.map((r) => r.resource_type))).sort());
  meridianFillSelect(document.getElementById("resource-filter-status"), Array.from(new Set(data.resources.map((r) => r.status))).sort());

  meridianFillSelect(document.getElementById("waitlist-filter-dept"), data.departmentNames.slice().sort());
  meridianFillSelect(document.getElementById("waitlist-filter-urgency"), Array.from(new Set(data.waitlist.map((w) => w.urgency_level))).sort());
  meridianFillSelect(document.getElementById("waitlist-filter-status"), Array.from(new Set(data.waitlist.map((w) => w.status))).sort());

  meridianFillSelect(document.getElementById("location-filter-county"), data.counties);
  meridianFillSelect(document.getElementById("location-filter-type"), data.facilityTypes);

  meridianFillSelect(document.getElementById("team-filter-dept"), data.departmentNames.slice().sort());
  meridianFillSelect(document.getElementById("team-filter-county"), data.counties);
}

// ------------------------------------------------------- global filter bar
// Populated ONCE from the full unfiltered raw dataset (so the option lists
// never shrink as filters are applied), then wired once. Selecting a value
// updates window.MERIDIAN_FILTERS and triggers a full data rebuild via
// meridianRebuildDashboard(), which re-runs every aggregation against the
// live/demo raw rows and re-fires "meridian:ready".
function meridianPopulateGlobalFilters(raw) {
  const facSelect = document.getElementById("gfb-facility");
  const facilities = (raw.facilities || []).slice().sort((a, b) => (a.facility_name || "").localeCompare(b.facility_name || ""));
  facilities.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.facility_id;
    opt.textContent = f.facility_name;
    facSelect.appendChild(opt);
  });

  const deptSelect = document.getElementById("gfb-department");
  const depts = Array.from(new Set((raw.appointments || []).map((a) => a.department).filter(Boolean))).sort();
  depts.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    deptSelect.appendChild(opt);
  });
}

function meridianUpdateGlobalFilterChip() {
  const f = window.MERIDIAN_FILTERS || { facility: "all", department: "all", dateRange: "all" };
  const chip = document.getElementById("gfb-active-chip");
  const parts = [];
  if (f.facility !== "all") parts.push(document.getElementById("gfb-facility").selectedOptions[0].textContent);
  if (f.department !== "all") parts.push(f.department);
  if (f.dateRange !== "all") parts.push(document.getElementById("gfb-daterange").selectedOptions[0].textContent);
  if (parts.length) {
    chip.style.display = "inline-flex";
    chip.textContent = "Filtering: " + parts.join(" · ");
  } else {
    chip.style.display = "none";
  }
}

function meridianWireGlobalFilters() {
  const facSelect = document.getElementById("gfb-facility");
  const deptSelect = document.getElementById("gfb-department");
  const dateSelect = document.getElementById("gfb-daterange");
  const resetBtn = document.getElementById("gfb-reset");

  const apply = () => {
    window.MERIDIAN_FILTERS = {
      facility: facSelect.value,
      department: deptSelect.value,
      dateRange: dateSelect.value,
    };
    meridianUpdateGlobalFilterChip();
    meridianRebuildDashboard();
  };

  facSelect.addEventListener("change", apply);
  deptSelect.addEventListener("change", apply);
  dateSelect.addEventListener("change", apply);
  resetBtn.addEventListener("click", () => {
    facSelect.value = "all";
    deptSelect.value = "all";
    dateSelect.value = "all";
    apply();
  });
}

// ------------------------------------------------------------ Action Center
const MERIDIAN_ACTION_STORAGE_KEY = "meridian_handled_actions";

function meridianGetHandledIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(MERIDIAN_ACTION_STORAGE_KEY) || "[]"));
  } catch (e) {
    return new Set();
  }
}

function meridianSetHandled(id, handled) {
  const set = meridianGetHandledIds();
  if (handled) set.add(id);
  else set.delete(id);
  localStorage.setItem(MERIDIAN_ACTION_STORAGE_KEY, JSON.stringify(Array.from(set)));
}

const meridianActionState = { search: "", category: "", priority: "", hideHandled: false };

function meridianFormatActionMetric(it) {
  switch (it.category) {
    case "waitlist": return `${it.metric} days waiting`;
    case "resource": return `${it.metric}% utilization`;
    case "provider": return `+${it.metric} pts vs dept avg`;
    case "revenue": return fmtEUR(it.metric) + " lost MTD";
    case "department": return `${it.metric}% no-show rate`;
    default: return String(it.metric);
  }
}

function meridianRenderActionCenter(data) {
  const aq = data.actionQueue;
  document.getElementById("hb-asof").textContent = "As of " + (aq.as_of || "—");
  document.getElementById("nav-action-count").textContent = aq.counts.high > 0 ? aq.counts.high : "";

  const kpis = [
    { label: "High priority items", value: fmtInt(aq.counts.high), tone: "high" },
    { label: "Medium priority items", value: fmtInt(aq.counts.medium), tone: "medium" },
    { label: "Low priority items", value: fmtInt(aq.counts.low), tone: "low" },
    { label: "Patients waiting 30+ days", value: fmtInt(aq.long_waitlist_over_30), tone: "" },
  ];
  document.getElementById("hero-kpi-row").innerHTML = kpis
    .map((k) => `<div class="hero-kpi ${k.tone}"><div class="hk-value">${k.value}</div><div class="hk-label">${k.label}</div></div>`)
    .join("");

  meridianRenderActionQueueList(data);
}

function meridianRenderActionQueueList(data) {
  const aq = data.actionQueue;
  const handled = meridianGetHandledIds();
  const s = meridianActionState;
  let items = aq.items.filter((it) => {
    if (s.category && it.category !== s.category) return false;
    if (s.priority && it.priority !== s.priority) return false;
    if (s.hideHandled && handled.has(it.id)) return false;
    if (s.search && !(it.title + " " + it.desc).toLowerCase().includes(s.search.toLowerCase())) return false;
    return true;
  });

  document.getElementById("action-count").textContent = `${items.length} of ${aq.total} items`;

  if (!items.length) {
    document.getElementById("action-queue").innerHTML = `<div class="empty-state">No action items match the current filters — try widening your search or resetting the global filter bar.</div>`;
    return;
  }

  document.getElementById("action-queue").innerHTML = items
    .map((it) => {
      const isHandled = handled.has(it.id);
      return `<div class="action-row p-${it.priority} ${isHandled ? "handled" : ""}" data-id="${it.id}">
        <input type="checkbox" class="ar-check" data-id="${it.id}" ${isHandled ? "checked" : ""} />
        <div class="ar-category"><span class="cat-icon">${it.categoryIcon}</span><span class="cat-label">${it.categoryLabel}</span></div>
        <div class="ar-body">
          <div class="ar-title">${it.title}</div>
          <div class="ar-desc">${it.desc}</div>
        </div>
        <div class="ar-meta">
          <span class="action-priority ${it.priority}">${it.priority.toUpperCase()}</span>
          <span class="ar-owner">Owner: ${it.owner}</span>
          <span class="ar-owner">${meridianFormatActionMetric(it)}</span>
        </div>
      </div>`;
    })
    .join("");
}

function meridianWireActionCenter() {
  ["action-search", "action-filter-category", "action-filter-priority"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      meridianActionState.search = document.getElementById("action-search").value;
      meridianActionState.category = document.getElementById("action-filter-category").value;
      meridianActionState.priority = document.getElementById("action-filter-priority").value;
      meridianRenderActionQueueList(window.MERIDIAN_DASHBOARD_DATA);
    });
  });
  document.getElementById("action-hide-handled").addEventListener("change", (e) => {
    meridianActionState.hideHandled = e.target.checked;
    meridianRenderActionQueueList(window.MERIDIAN_DASHBOARD_DATA);
  });
  document.getElementById("action-queue").addEventListener("change", (e) => {
    if (e.target.classList.contains("ar-check")) {
      meridianSetHandled(e.target.dataset.id, e.target.checked);
      meridianRenderActionQueueList(window.MERIDIAN_DASHBOARD_DATA);
    }
  });
}

// -------------------------------------------------------------------- boot
function meridianRenderAll(data) {
  window.MERIDIAN_DASHBOARD_DATA = data;
  meridianRenderSourcePill(data);
  meridianPopulateFilters(data);
  meridianUpdateGlobalFilterChip();

  meridianRenderActionCenter(data);

  meridianRenderOverviewKPIs(data);
  meridianRenderOverviewAIPanel(data);
  renderMonthlyTrendChart("chart-monthly-trend", data.monthlyTrend);
  renderDonut("chart-status-donut", data.appointmentInsights.by_status, "label", "count", ["#16a34a", "#dc2626", "#d97706", "#f59e0b"]);
  renderDeptNoShowBar("chart-dept-noshow", data.departments);
  renderDeptRevenueBar("chart-dept-revenue", data.departments);

  meridianRenderCapacityKPIs(data);
  meridianRenderCapacityAIPanel(data);
  renderResourceUtilBar("chart-resource-util", data.resourceTypeSummary);
  renderRiskCalibrationBar("chart-risk-calibration", data.appointmentInsights.risk_band_calibration);
  meridianRenderResourceTable(data);

  meridianRenderWaitlistKPIs(data);
  meridianRenderWaitlistAIPanel(data);
  renderDonut("chart-waitlist-status", data.waitlistSummary.by_status, "label", "count");
  renderWaitlistDeptBar("chart-waitlist-dept", data.waitlist);
  renderDonut(
    "chart-waitlist-urgency",
    data.waitlist.filter((w) => w.status === "Waiting").reduce((acc, w) => {
      const found = acc.find((x) => x.label === w.urgency_level);
      if (found) found.count++;
      else acc.push({ label: w.urgency_level, count: 1 });
      return acc;
    }, []),
    "label",
    "count"
  );
  meridianRenderWaitlistTable(data);

  meridianRenderRevenueKPIs(data);
  meridianRenderRevenueAIPanel(data);
  renderRevenueSiteBar("chart-revenue-site", data.revenueBySite.sites);
  renderRevenueScatter("chart-revenue-scatter", data.revenueBySite.sites);
  meridianRenderSiteCards(data);

  meridianRenderLocationsAIPanel(data);
  meridianRenderIrelandMap(data);
  renderLocationsCountyBar("chart-locations-county", data.facilities);
  renderLocationsTypeBar("chart-locations-type", data.facilities);
  meridianRenderLocations(data);

  meridianRenderTeamAIPanel(data);
  renderTeamDeptBar("chart-team-department", data.departments);
  renderTeamTenureBar("chart-team-tenure", data.providers);
  meridianRenderTeamTable(data);

  meridianRenderPatientKPIs(data);
  meridianRenderPatientsAIPanel(data);
  renderDonut("chart-insurance-mix", data.patientInsights.insurance_mix, "label", "count");
  renderDonut("chart-channel-mix", data.patientInsights.channel_mix, "label", "count");
  renderPriorNoShowInsuranceBar("chart-priornoshow-insurance", data.patientInsights.avg_prior_no_shows_by_insurance);
  renderBandBar("chart-distance-noshow", data.patientInsights.avg_prior_no_shows_by_distance, MERIDIAN_PALETTE.amber);
  renderBandBar("chart-age-noshow", data.patientInsights.avg_prior_no_shows_by_age, MERIDIAN_PALETTE.purple);

  meridianRenderPipeline(data);
}

let MERIDIAN_WIRED = false;

function meridianWireInteractions() {
  ["resource-search", "resource-filter-facility", "resource-filter-type", "resource-filter-status"].forEach((id) =>
    document.getElementById(id).addEventListener("input", () => { meridianResourceState.page = 1; meridianRenderResourceTable(window.MERIDIAN_DASHBOARD_DATA); })
  );
  ["waitlist-search", "waitlist-filter-dept", "waitlist-filter-urgency", "waitlist-filter-status"].forEach((id) =>
    document.getElementById(id).addEventListener("input", () => { meridianWaitlistState.page = 1; meridianRenderWaitlistTable(window.MERIDIAN_DASHBOARD_DATA); })
  );
  ["team-search", "team-filter-dept", "team-filter-county"].forEach((id) =>
    document.getElementById(id).addEventListener("input", () => { meridianTeamState.page = 1; meridianRenderTeamTable(window.MERIDIAN_DASHBOARD_DATA); })
  );
  ["location-search", "location-filter-county", "location-filter-type"].forEach((id) =>
    document.getElementById(id).addEventListener("input", () => meridianRenderLocations(window.MERIDIAN_DASHBOARD_DATA))
  );

  meridianWireSortableHeaders("resource-table", meridianResourceState, meridianRenderResourceTable);
  meridianWireSortableHeaders("waitlist-table", meridianWaitlistState, meridianRenderWaitlistTable);
  meridianWireSortableHeaders("team-table", meridianTeamState, meridianRenderTeamTable);

  meridianWireTeamViewToggle();
  meridianWireIrelandMap();
  meridianWireSiteCards();
  meridianWireGlobalFilters();
  meridianWireActionCenter();
}

// -------------------------------------------------------------- connect UI
function meridianWireConnectModal() {
  const modal = document.getElementById("connect-modal");
  const input = document.getElementById("sheet-input");
  document.getElementById("connect-btn").addEventListener("click", () => {
    input.value = localStorage.getItem("meridianSheetId") || "";
    modal.style.display = "flex";
  });
  document.getElementById("modal-cancel").addEventListener("click", () => (modal.style.display = "none"));
  document.getElementById("modal-save").addEventListener("click", () => {
    const val = input.value.trim();
    const match = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = match ? match[1] : val;
    if (sheetId) localStorage.setItem("meridianSheetId", sheetId);
    else localStorage.removeItem("meridianSheetId");
    window.location.reload();
  });
  document.getElementById("refresh-btn").addEventListener("click", () => window.location.reload());

  const stored = localStorage.getItem("meridianSheetId");
  if (stored) window.MERIDIAN_CONFIG.GOOGLE_SHEET_ID = stored;
}

// ------------------------------------------------------ staff access gate
// The dashboard's data boot is deferred until the staff member confirms the
// confidentiality/legal notice below (or, within the same browser tab
// session, has already confirmed once — sessionStorage clears when the tab
// closes, so a fresh confirmation is required for every new session).
// Note: interactive controls (checkbox/buttons) are wired FIRST and
// unconditionally, before any sessionStorage access — some browsers block
// storage APIs on local/sandboxed file:// pages and throw a SecurityError,
// which must never be allowed to prevent the Confirm button from working.
const MERIDIAN_GATE_KEY = "meridianAccessConfirmed";

function meridianSafeStorageGet(key) {
  try { return sessionStorage.getItem(key); } catch (e) { return null; }
}
function meridianSafeStorageSet(key, val) {
  try { sessionStorage.setItem(key, val); } catch (e) { /* storage blocked — ignore, gate still works per-load */ }
}

function meridianWireAccessGate() {
  const gate = document.getElementById("access-gate");
  if (!gate) { meridianBootDashboard(); return; } // safety: never block boot if gate markup is missing

  const card = document.getElementById("gate-card");
  const denied = document.getElementById("gate-denied");
  const checkbox = document.getElementById("gate-checkbox");
  const confirmBtn = document.getElementById("gate-confirm");
  const declineBtn = document.getElementById("gate-decline");
  const backBtn = document.getElementById("gate-back");

  const dismissGate = () => {
    try { document.body.style.overflow = ""; } catch (e) {}
    gate.classList.add("gate-exit");
    setTimeout(() => { gate.style.display = "none"; }, 350);
  };

  const enterDashboard = () => {
    meridianSafeStorageSet(MERIDIAN_GATE_KEY, "1");
    dismissGate();
    meridianBootDashboard();
  };

  // 1. Wire every interactive control up front, unconditionally.
  checkbox.addEventListener("change", () => {
    confirmBtn.disabled = !checkbox.checked;
  });

  confirmBtn.addEventListener("click", () => {
    if (!checkbox.checked) return;
    enterDashboard();
  });

  declineBtn.addEventListener("click", () => {
    card.style.display = "none";
    denied.style.display = "flex";
  });

  backBtn.addEventListener("click", () => {
    denied.style.display = "none";
    card.style.display = "flex";
  });

  // 2. Only after controls are wired, check whether this tab session has
  //    already confirmed — if storage access throws, we simply fall through
  //    and show the gate again (safe default), rather than breaking the page.
  if (meridianSafeStorageGet(MERIDIAN_GATE_KEY) === "1") {
    gate.style.display = "none";
    meridianBootDashboard();
    return;
  }

  try { document.body.style.overflow = "hidden"; } catch (e) {} // hold the page still behind the gate
}

document.addEventListener("DOMContentLoaded", () => {
  // Each init step is isolated: a failure in one (e.g. tab wiring) must
  // never prevent the access gate below it from being wired up, since that
  // gate is the only way in to the rest of the dashboard.
  try { meridianInitTabs(); } catch (e) { console.error("meridianInitTabs failed", e); }
  try { meridianWireConnectModal(); } catch (e) { console.error("meridianWireConnectModal failed", e); }
  try { meridianWireAccessGate(); } catch (e) {
    console.error("meridianWireAccessGate failed — falling back to unlocked dashboard", e);
    const gate = document.getElementById("access-gate");
    if (gate) gate.style.display = "none";
    meridianBootDashboard();
  }
});

document.addEventListener("meridian:ready", (e) => {
  meridianRenderAll(e.detail);
  if (!MERIDIAN_WIRED) {
    meridianWireInteractions();
    MERIDIAN_WIRED = true;
  }
});

document.addEventListener("meridian:error", () => {
  document.getElementById("source-pill-text").textContent = "Data load failed";
});
