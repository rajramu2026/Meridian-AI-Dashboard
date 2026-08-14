// ============================================================================
// Meridian Clinic — Staff AI Dashboard — chart rendering (Chart.js)
// ============================================================================

const MERIDIAN_PALETTE = {
  teal: "#155eef",
  navy: "#0b1f3a",
  navy2: "#155eef",
  amber: "#d97706",
  red: "#dc2626",
  green: "#12b76a",
  purple: "#7c3aed",
  slate: "#64748b",
  categorical: ["#155eef", "#12b76a", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#0b1f3a", "#c2410c", "#2f7bff", "#be185d"],
};

window.MERIDIAN_CHARTS = window.MERIDIAN_CHARTS || {};

function meridianDestroyChart(id) {
  if (window.MERIDIAN_CHARTS[id]) {
    window.MERIDIAN_CHARTS[id].destroy();
    delete window.MERIDIAN_CHARTS[id];
  }
}

function meridianBaseOptions(overrides) {
  return Object.assign(
    {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { padding: 10, titleFont: { size: 12.5 }, bodyFont: { size: 12.5 } },
      },
      scales: {},
    },
    overrides || {}
  );
}

function utilColor(pct) {
  if (pct < 60) return MERIDIAN_PALETTE.navy2;
  if (pct > 90) return MERIDIAN_PALETTE.red;
  return MERIDIAN_PALETTE.green;
}

// ------------------------------------------------------------- monthly trend
function renderMonthlyTrendChart(canvasId, monthlyTrend) {
  meridianDestroyChart(canvasId);
  const ctx = document.getElementById(canvasId).getContext("2d");
  window.MERIDIAN_CHARTS[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: monthlyTrend.map((m) => m.month),
      datasets: [
        {
          label: "No-Show Rate (%)",
          data: monthlyTrend.map((m) => m.no_show_rate_pct),
          borderColor: MERIDIAN_PALETTE.teal,
          backgroundColor: "rgba(15,155,142,0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: MERIDIAN_PALETTE.teal,
        },
      ],
    },
    options: meridianBaseOptions({
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => v + "%" }, grid: { color: "#eef1f3" } },
        x: { grid: { display: false } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => {
              const row = monthlyTrend[item.dataIndex];
              return [`No-show rate: ${row.no_show_rate_pct}%`, `Scheduled: ${row.total_scheduled.toLocaleString()}`, `Revenue loss: €${row.revenue_loss_eur.toLocaleString()}`];
            },
          },
        },
      },
    }),
  });
}

// ------------------------------------------------------------ status donut
function renderDonut(canvasId, rows, labelKey, valueKey, colors) {
  meridianDestroyChart(canvasId);
  const ctx = document.getElementById(canvasId).getContext("2d");
  window.MERIDIAN_CHARTS[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: rows.map((r) => r[labelKey]),
      datasets: [
        {
          data: rows.map((r) => r[valueKey]),
          backgroundColor: colors || MERIDIAN_PALETTE.categorical,
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: meridianBaseOptions({
      cutout: "62%",
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (item) => `${item.label}: ${item.raw.toLocaleString()}`,
          },
        },
      },
    }),
  });
}

// -------------------------------------------------------------- generic bar
function renderBar(canvasId, labels, values, options) {
  options = options || {};
  meridianDestroyChart(canvasId);
  const ctx = document.getElementById(canvasId).getContext("2d");
  const colors = options.perBarColor ? values.map(options.perBarColor) : options.color || MERIDIAN_PALETTE.teal;
  window.MERIDIAN_CHARTS[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: options.label || "",
          data: values,
          backgroundColor: colors,
          borderRadius: 5,
          maxBarThickness: options.horizontal ? 16 : 34,
        },
      ],
    },
    options: meridianBaseOptions({
      indexAxis: options.horizontal ? "y" : "x",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => options.tooltipFormat ? options.tooltipFormat(item) : `${item.formattedValue}${options.suffix || ""}`,
          },
        },
      },
      scales: {
        x: options.horizontal
          ? { beginAtZero: true, grid: { color: "#eef1f3" }, ticks: { callback: (v) => v + (options.suffix || "") } }
          : { grid: { display: false }, ticks: { autoSkip: false, font: { size: 10.5 } } },
        y: options.horizontal
          ? { grid: { display: false }, ticks: { font: { size: 10.5 } } }
          : { beginAtZero: true, grid: { color: "#eef1f3" }, ticks: { callback: (v) => v + (options.suffix || "") } },
      },
    }),
  });
}

// ------------------------------------------------------------ dept no-show
function renderDeptNoShowBar(canvasId, departments) {
  const sorted = departments.slice().sort((a, b) => b.trend_no_show_rate_pct - a.trend_no_show_rate_pct);
  renderBar(canvasId, sorted.map((d) => d.name), sorted.map((d) => d.trend_no_show_rate_pct), {
    horizontal: true,
    suffix: "%",
    perBarColor: (v) => (v >= 25 ? MERIDIAN_PALETTE.red : v >= 18 ? MERIDIAN_PALETTE.amber : MERIDIAN_PALETTE.teal),
  });
}

function renderDeptRevenueBar(canvasId, departments) {
  const sorted = departments.slice().sort((a, b) => b.trend_revenue_loss_eur - a.trend_revenue_loss_eur);
  renderBar(canvasId, sorted.map((d) => d.name), sorted.map((d) => d.trend_revenue_loss_eur), {
    horizontal: true,
    color: MERIDIAN_PALETTE.navy2,
    tooltipFormat: (item) => `€${item.raw.toLocaleString()}`,
  });
}

function renderResourceUtilBar(canvasId, resourceTypeSummary) {
  const sorted = resourceTypeSummary.slice().sort((a, b) => a.avg_utilization_pct - b.avg_utilization_pct);
  renderBar(canvasId, sorted.map((r) => r.resource_type), sorted.map((r) => r.avg_utilization_pct), {
    suffix: "%",
    perBarColor: (v) => utilColor(v),
  });
}

function renderRiskCalibrationBar(canvasId, riskBandCalibration) {
  const rows = riskBandCalibration.filter((r) => r.total > 0);
  renderBar(canvasId, rows.map((r) => r.band_label), rows.map((r) => r.no_show_rate_pct), {
    suffix: "%",
    color: MERIDIAN_PALETTE.purple,
    tooltipFormat: (item) => `${rows[item.dataIndex].no_show_rate_pct}% no-show rate (n=${rows[item.dataIndex].total})`,
  });
}

function renderWaitlistDeptBar(canvasId, waitlistOut) {
  const waiting = waitlistOut.filter((w) => w.status === "Waiting");
  const byDept = {};
  waiting.forEach((w) => (byDept[w.department] = (byDept[w.department] || 0) + 1));
  const labels = Object.keys(byDept).sort((a, b) => byDept[b] - byDept[a]);
  renderBar(canvasId, labels, labels.map((l) => byDept[l]), { horizontal: true, color: MERIDIAN_PALETTE.amber });
}

function renderLocationsCountyBar(canvasId, facilities) {
  const byCounty = {};
  facilities.forEach((f) => (byCounty[f.county] = (byCounty[f.county] || 0) + 1));
  const labels = Object.keys(byCounty).sort((a, b) => byCounty[b] - byCounty[a]);
  renderBar(canvasId, labels, labels.map((l) => byCounty[l]), { color: MERIDIAN_PALETTE.teal });
}

function renderLocationsTypeBar(canvasId, facilities) {
  const byType = {};
  facilities.forEach((f) => (byType[f.facility_type] = (byType[f.facility_type] || 0) + 1));
  const labels = Object.keys(byType).sort((a, b) => byType[b] - byType[a]);
  renderBar(canvasId, labels, labels.map((l) => byType[l]), { horizontal: true, color: MERIDIAN_PALETTE.navy2 });
}

function renderTeamDeptBar(canvasId, departments) {
  const sorted = departments.slice().sort((a, b) => b.provider_count - a.provider_count);
  renderBar(canvasId, sorted.map((d) => d.name), sorted.map((d) => d.provider_count), { horizontal: true, color: MERIDIAN_PALETTE.teal });
}

function renderTeamTenureBar(canvasId, providers) {
  const byDept = {};
  providers.forEach((p) => {
    if (!byDept[p.department]) byDept[p.department] = { sum: 0, count: 0 };
    byDept[p.department].sum += p.years_at_meridian;
    byDept[p.department].count++;
  });
  const labels = Object.keys(byDept).sort();
  const values = labels.map((l) => Math.round((byDept[l].sum / byDept[l].count) * 10) / 10);
  renderBar(canvasId, labels, values, { suffix: " yrs", color: MERIDIAN_PALETTE.navy });
}

function renderPriorNoShowInsuranceBar(canvasId, avgByInsurance) {
  renderBar(canvasId, avgByInsurance.map((r) => r.label), avgByInsurance.map((r) => r.avg), { color: MERIDIAN_PALETTE.red });
}

function renderBandBar(canvasId, bandRows, color) {
  renderBar(canvasId, bandRows.map((r) => r.label), bandRows.map((r) => r.avg), {
    color: color || MERIDIAN_PALETTE.navy2,
    tooltipFormat: (item) => `${bandRows[item.dataIndex].avg} avg prior no-shows (n=${bandRows[item.dataIndex].count})`,
  });
}

// -------------------------------------------------------- revenue by site
function renderRevenueSiteBar(canvasId, sites) {
  const rows = sites.filter((s) => s.scheduled > 0).slice(0, 12);
  meridianDestroyChart(canvasId);
  const ctx = document.getElementById(canvasId).getContext("2d");
  window.MERIDIAN_CHARTS[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: rows.map((s) => s.facility_name),
      datasets: [
        {
          label: "Revenue Loss (EUR)",
          data: rows.map((s) => s.revenue_loss_eur),
          backgroundColor: rows.map((s) => (s.no_show_rate_pct >= 30 ? MERIDIAN_PALETTE.red : s.no_show_rate_pct >= 18 ? MERIDIAN_PALETTE.amber : MERIDIAN_PALETTE.teal)),
          borderRadius: 5,
          maxBarThickness: 16,
        },
      ],
    },
    options: meridianBaseOptions({
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (item) => [`€${item.raw.toLocaleString()} lost`, `${rows[item.dataIndex].no_show_rate_pct}% no-show rate`, `${rows[item.dataIndex].scheduled} scheduled this month`] } },
      },
      scales: {
        x: { beginAtZero: true, grid: { color: "#eef1f3" }, ticks: { callback: (v) => "€" + v.toLocaleString() } },
        y: { grid: { display: false }, ticks: { font: { size: 10.5 } } },
      },
    }),
  });
}

function renderRevenueScatter(canvasId, sites) {
  const rows = sites.filter((s) => s.scheduled > 0);
  meridianDestroyChart(canvasId);
  const ctx = document.getElementById(canvasId).getContext("2d");
  window.MERIDIAN_CHARTS[canvasId] = new Chart(ctx, {
    type: "bubble",
    data: {
      datasets: [
        {
          label: "Sites",
          data: rows.map((s) => ({ x: s.no_show_rate_pct, y: s.revenue_loss_eur, r: Math.max(5, Math.sqrt(s.scheduled) * 2.2) })),
          backgroundColor: rows.map((s) => (s.no_show_rate_pct >= 30 ? "rgba(220,38,38,0.55)" : s.no_show_rate_pct >= 18 ? "rgba(217,119,6,0.55)" : "rgba(15,155,142,0.55)")),
          borderColor: rows.map((s) => (s.no_show_rate_pct >= 30 ? MERIDIAN_PALETTE.red : s.no_show_rate_pct >= 18 ? MERIDIAN_PALETTE.amber : MERIDIAN_PALETTE.teal)),
        },
      ],
    },
    options: meridianBaseOptions({
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (item) => [rows[item.dataIndex].facility_name, `${rows[item.dataIndex].no_show_rate_pct}% no-show rate`, `€${rows[item.dataIndex].revenue_loss_eur.toLocaleString()} lost`, `${rows[item.dataIndex].scheduled} scheduled`] } },
      },
      scales: {
        x: { title: { display: true, text: "No-Show Rate (%)", font: { size: 11 } }, grid: { color: "#eef1f3" } },
        y: { title: { display: true, text: "Revenue Loss (EUR)", font: { size: 11 } }, grid: { color: "#eef1f3" }, ticks: { callback: (v) => "€" + v.toLocaleString() } },
      },
    }),
  });
}

// ================================================================
// Compact "mini" chart variants used inside the consolidated AI
// Agent Insight & Action panel side-column — small footprint, no
// axis clutter, purely a visual accent next to the written insight.
// ================================================================
function renderMiniLine(canvasId, monthlyTrend) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  meridianDestroyChart(canvasId);
  const ctx = el.getContext("2d");
  window.MERIDIAN_CHARTS[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: monthlyTrend.map((m) => m.month),
      datasets: [
        {
          data: monthlyTrend.map((m) => m.no_show_rate_pct),
          borderColor: MERIDIAN_PALETTE.purple,
          backgroundColor: "rgba(124,58,237,0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    },
    options: meridianBaseOptions({
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
    }),
  });
}

function renderMiniDonut(canvasId, rows, labelKey, valueKey, colors) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  meridianDestroyChart(canvasId);
  const ctx = el.getContext("2d");
  window.MERIDIAN_CHARTS[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: rows.map((r) => r[labelKey]),
      datasets: [{ data: rows.map((r) => r[valueKey]), backgroundColor: colors || MERIDIAN_PALETTE.categorical, borderWidth: 2, borderColor: "#fff" }],
    },
    options: meridianBaseOptions({
      cutout: "58%",
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (item) => `${item.label}: ${item.raw.toLocaleString()}` } },
      },
    }),
  });
}

function renderMiniBar(canvasId, labels, values, color) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  meridianDestroyChart(canvasId);
  const ctx = el.getContext("2d");
  window.MERIDIAN_CHARTS[canvasId] = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: color || MERIDIAN_PALETTE.teal, borderRadius: 5, maxBarThickness: 20 }] },
    options: meridianBaseOptions({
      indexAxis: "y",
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: { display: false },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } },
      },
    }),
  });
}
