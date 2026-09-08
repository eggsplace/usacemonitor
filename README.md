# USACE Operations Monitor

A real-time operational dashboard for U.S. Army Corps of Engineers emergency response and operations management.

## Structure

The dashboard is organized into five top-level categories, selected via tabs in the sidebar:

- **Contingency Ops** — live, automated data feeds (no manual entry needed)
- **Civil Works** — manually entered via the admin panel
- **Military Programs** — manually entered via the admin panel
- **Support Units** — manually entered via the admin panel

### Contingency Ops (live feeds)

- **Seismic Events**: Live earthquake data from USGS (M2.5+, last 24 hrs — covers CONUS, Alaska, Hawaii, and Puerto Rico)
- **River Gauges**: Gauges currently in low-water or flood-stage status, per NOAA's AHPS via the Xweather Rivers API (fetched hourly server-side — see "River Gauge Data Pipeline" below)
- **Weather Alerts**: Active NOAA severe weather alerts
- **Disasters**: Current disasters from ReliefWeb
- **Weather Radar**: Integrated RainViewer radar overlay for precipitation tracking
- **Satellite Imagery**: NASA GIBS (VIIRS) for thermal anomaly and fire detection
- **Day/Night Terminator**: Solar terminator overlay

### Civil Works

Subcategories: major civil works project updates, project study terminations (CCIR to ASA(CW)), contracts/expense tracking.

### Military Programs

Longer-duration, multi-project efforts:

- TF Castle support to TF Sentinel
- Southwest Border support
- Major recovery (e.g. Tinian, Sinlaku)

### Support Units

Units that do work for USACE, tracked by location/deployment status and project planning/route reconnaissance:

- Forward Engineer Support Team – Advance (FEST-A)
- Forward Engineer Support Team – Main (FEST-M), when necessary
- Contingency Response Unit (CRU)
- 249th Prime Power Battalion

---

## Adding Data: Civil Works / Military Programs / Support Units

These three categories have no public API — they're internal USACE status updates entered by hand.

1. Open `admin.html` (linked as **+ ADD ENTRY** in the top-right of the dashboard).
2. Select the category tab, fill out the entry (title, subcategory/unit, status, date, optional coordinates, details, optional reference link), and click **Save Entry**.
3. Entries are saved to your browser's local storage as you work — repeat for as many entries as needed.
4. When ready, click **Export `<category>.json`** to download the file.
5. Commit that file into `/data/` in this repo, replacing the existing file of the same name. This is what pushes the update to the live site for everyone — the admin panel itself only saves locally.

To resume editing a category later (or to add to entries someone else already exported), use **Import JSON** in the admin panel to load the current `/data/<category>.json` back in before making changes.

**Coordinates are optional.** An entry without `lat`/`lon` still appears in the sidebar list for its category — it just won't get a map marker. Use this for things like contract/expense tracking that aren't tied to a single location.

**Note on scale:** this is a local-then-commit workflow, not shared multi-user editing. If entry volume grows or multiple people need to add data concurrently, the next step would be a small backend (e.g. Netlify Forms + a serverless function) so entries save centrally instead of per-browser.

---

## API Data Sources

| Data              | Source              | Endpoint                | Update Frequency                  |
| ----------------- | -------------------- | ------------------------ | ---------------------------------- |
| Earthquakes       | USGS GeoJSON          | earthquake.usgs.gov      | Real-time (2 min sync)             |
| River Gauges      | Xweather Rivers API    | data.api.xweather.com    | Hourly (fetched server-side)       |
| Weather Alerts    | NOAA                   | api.weather.gov          | Real-time                          |
| Disasters         | ReliefWeb              | reliefweb.int             | Real-time                          |
| Weather Radar     | RainViewer             | rainviewer.com            | Every 5 minutes                    |
| Satellite Imagery | NASA GIBS               | gibs.earthdata.nasa.gov   | Daily                              |

---

## River Gauge Data Pipeline

River gauge data is **not** fetched from the browser. Instead, a GitHub Actions workflow
(`.github/workflows/update-river-gauges.yml`) runs a script (`scripts/fetch-river-gauges.js`)
once an hour that:

1. Calls the Xweather Rivers API server-side, using credentials stored as encrypted repo secrets
2. Filters the results down to only gauges in `low_threshold` (low water) or `action`/`minor`/`moderate`/`major` (flood stage) status
3. Writes the filtered result to `data/river-gauges-cache.json`
4. Commits that file back to the repo automatically

`index.html` just fetches `data/river-gauges-cache.json` like a normal static file — the same
pattern used for Civil Works, Support Units, and Military Programs. This means:

- Your Xweather `client_id`/`client_secret` are **never sent to visitors' browsers** — they only
  ever live in GitHub's encrypted secrets and the Actions runner.
- Every site visitor's page load costs **zero** Xweather API requests — only the hourly scheduled
  run does, so traffic to the dashboard has no effect on your API quota.

### One-time setup

1. Sign up for a free Xweather account at [xweather.com](https://www.xweather.com) and get a `client_id`/`client_secret` pair.
2. In this repo, go to **Settings → Secrets and variables → Actions → New repository secret** and add two secrets: `XWEATHER_CLIENT_ID` and `XWEATHER_CLIENT_SECRET`.
3. Go to **Settings → Actions → General → Workflow permissions** and set it to **Read and write permissions** (needed so the workflow can commit the updated cache file back to the repo).
4. Trigger the first run manually: go to the **Actions** tab → **Update River Gauge Cache** → **Run workflow**. After that, it runs automatically every hour.

Until the first successful run, `data/river-gauges-cache.json` is just an empty placeholder and the River Gauges layer will show no entries — that's expected, not a bug.

---

## Future Enhancements

1. Nest FEST-A/FEST-M under a broader Military Ops umbrella if the taxonomy evolves that way
2. Real-time alerts: email/SMS notifications for critical events
3. User authentication for restricted USACE operations data
4. Export/reporting: generate operational summaries from current entries
5. Shared backend for Civil Works/Military Programs/Support Units entries (replacing the local-then-commit admin workflow) if multiple editors are needed

---

## Installation & Deployment

### Local Development

```
git clone <repo-url>
python -m http.server 8000
# or
npx http-server
```

### Netlify Deployment

```
npm install -g netlify-cli
netlify deploy --prod
```

---

## File Structure

```
.
├── index.html          # Main UI and event rendering logic
├── admin.html           # Entry form for Civil Works / Military Programs / Support Units
├── radar.js             # RainViewer radar overlay module
├── .github/
│   └── workflows/
│       └── update-river-gauges.yml   # Hourly job that refreshes the river gauge cache
├── scripts/
│   └── fetch-river-gauges.js         # Script the workflow runs (Xweather → filtered JSON)
├── data/
│   ├── civil-works.json
│   ├── military-programs.json
│   ├── support-units.json
│   └── river-gauges-cache.json       # Auto-generated hourly — don't hand-edit
└── README.md            # This file
```

---

## Support & Documentation

- **Xweather Rivers API**: <https://www.xweather.com/docs/weather-api/endpoints/rivers>
- **USGS Earthquake API**: <https://earthquake.usgs.gov/fdsnws/event/1/>
- **NOAA Weather Alerts**: <https://www.weather.gov/documentation/services-web-api>
- **ReliefWeb API**: <https://reliefweb.int/help/api>
- **Leaflet.js Docs**: <https://leafletjs.com/>
- **NASA GIBS**: <https://wiki.earthdata.nasa.gov/display/GIBS/>

---

**Last Updated**: 2026-08-30
**Status**: Beta (Production Ready)
