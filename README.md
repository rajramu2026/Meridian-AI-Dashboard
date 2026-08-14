# Meridian Health Network — Staff AI Dashboard + ORLA Chatbot

A single-page internal staff dashboard for Meridian Health Network (Dublin,
Ireland), with an embedded AI assistant, **ORLA**, built into the corner of
the page. Both the dashboard's charts/tables and ORLA's answers are driven
by the **same live Google Sheet** — nothing about Meridian's operational
data is hardcoded anywhere in this codebase.

---

## What you need to do before publishing (2 things only)

Open **`js/config.js`** in a text editor. There are exactly two fields to
touch:

### 1. Google Sheet (already set for you)

```js
GOOGLE_SHEET_ID: "1khEKcDuUsM9H_gcNaA2Z3bCGiiv2qlhhCduHrqKWFiQ",
```

This is already pointed at your live sheet. You only need to revisit this if
you switch to a different sheet later. Two requirements for it to work:

- Sharing must be set to **"Anyone with the link — Viewer"**.
- It must contain exactly these 9 tab names (case-sensitive):
  `Organization_Info`, `Annual_Summary`, `Facilities`, `Providers`,
  `Patients`, `Resources`, `Appointments`, `Waitlist`,
  `NoShow_Trend_Monthly`.

If a tab name doesn't match, or the sheet fails to load, that tab silently
falls back to the bundled demo snapshot in `data/demo/` — the dashboard
never crashes, it just quietly uses demo data for whichever piece didn't
connect. Check the "Live" / "Demo" indicator in the top bar of the running
dashboard to see which mode is active.

### 2. Groq API key — **this is the one field you must fill in yourself**

```js
GROQ_API_KEY: "", // <-- paste your Groq API key here
```

1. Go to **https://console.groq.com/keys** and sign in (Google/GitHub login
   works, no credit card needed).
2. Click **Create API Key**, copy it.
3. Paste it between the quotes:
   ```js
   GROQ_API_KEY: "gsk_your_real_key_here",
   ```
4. Save the file.

Until this is filled in, ORLA will show one polite line — *"I'm having a
little trouble responding right now..."* — for every question. That's
expected, and it's the only thing standing between you and a fully working
chatbot.

Everything else in `config.js` (model name, API endpoint, tab names, demo
CSV paths) is already set correctly — leave it as is.

---

## How to publish this to GitHub Pages

1. **Create a new GitHub repository** (or use an existing one) — public or
   private both work with GitHub Pages, but note that Pages sites are
   publicly reachable by URL regardless of the repo's visibility setting
   unless you're on a paid plan with Pages access control. This dashboard
   has its own staff-only confirmation gate on entry, but treat the URL
   itself as "unlisted, not truly private."

2. **Upload every file in this package to the repository root**, keeping
   the folder structure exactly as-is:
   ```
   your-repo/
     index.html
     css/dashboard.css
     js/config.js
     js/departments.js
     js/ireland-map.js
     js/csv.js
     js/aggregate.js
     js/dashboard-data.js
     js/charts.js
     js/dashboard.js
     js/chatbot.js
     data/demo/*.csv   (9 files)
   ```
   Easiest way: on GitHub, use **Add file → Upload files**, drag the whole
   unzipped folder's contents in, and commit. (Do this *after* editing
   `js/config.js` locally with your Groq key — or edit it directly in
   GitHub's web editor after uploading, whichever is easier for you.)

3. **Enable GitHub Pages**: repo → **Settings → Pages** → under "Build and
   deployment", set **Source: Deploy from a branch**, branch **main**,
   folder **/ (root)** → **Save**.

4. Wait ~1 minute, then refresh that Pages settings page — it will show your
   live URL, something like:
   ```
   https://<your-github-username>.github.io/<your-repo-name>/
   ```

5. Open that URL. You should see the staff access gate first — tick the
   checkbox and click **Confirm & Enter Dashboard**. The dashboard loads,
   and ORLA's chat bubble is in the bottom-right corner.

That's it — no build step, no server, no dependencies to install. It's a
static site; GitHub Pages serves the files exactly as uploaded.

---

## If something doesn't look right after publishing

- **Top bar shows "Demo" instead of "Live":** your sheet either isn't
  shared as "Anyone with the link — Viewer" yet, or a tab name doesn't
  match exactly. Double-check both.
- **ORLA still shows the generic "having trouble" message after you added a
  key:** open your browser's DevTools Console (F12 → Console tab) and ask
  ORLA something — the real error (bad key, rate limit, etc.) is always
  logged there, even though the chat bubble itself only ever shows one
  generic line by design.
- **You previously used the dashboard's "Connect" button to test a
  different sheet in your own browser:** that stores an override in your
  browser's local storage on that device only. Click **Connect** in the
  sidebar, clear the field, and save — or just test in a private/incognito
  window — to make sure you're seeing the `config.js` default, not a
  locally cached override.

---

## Architecture notes (for your own reference / write-up)

- `js/csv.js` fetches all 9 sheet tabs fresh, every page load, using
  Google's public `gviz` CSV export — no API key needed for the sheet
  itself, only "Anyone with the link" sharing.
- `js/dashboard-data.js` runs the same aggregation pipeline for both the
  dashboard's charts/tables and ORLA's data context — they are always
  looking at identical numbers.
- `js/chatbot.js` (ORLA) rebuilds that data context **fresh, from scratch,
  on every single question** — nothing is cached between messages — then
  sends it to a real Groq LLM call. There is no local keyword-matching
  logic anywhere; every question, on-topic or not, goes to the real model.
- If Groq ever fails or isn't configured, ORLA shows one single generic
  notice — never a raw technical error — by design.
