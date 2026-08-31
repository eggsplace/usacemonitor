# USACE Operations Monitor

A real-time operational dashboard for U.S. Army Corps of Engineers emergency response and operations management.

## Structure

The dashboard is organized into five top-level categories, selected via tabs in the sidebar:

- **Contingency Ops** — live, automated data feeds (no manual entry needed)
- **Civil Works** — manually entered via the admin panel
- **Military Programs** — manually entered via the admin panel
- **Support Units** — manually entered via the admin panel

### Contingency Ops (live feeds)

- **Seismic Events**: Live earthquake data from USGS (M4.5+, US-focused)
- **River Gauges**: Real-time streamflow and water level data from USGS Water Services API
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
| River Gauges      | USGS Water Services   | waterservices.usgs.gov   | Every 15 min (transmitted hourly)  |
| Weather Alerts    | NOAA                   | api.weather.gov          | Real-time                          |
| Disasters         | ReliefWeb              | reliefweb.int             | Real-time                          |
| Weather Radar     | RainViewer             | rainviewer.com            | Every 5 minutes                    |
| Satellite Imagery | NASA GIBS               | gibs.earthdata.nasa.gov   | Daily                              |

---

## CORS Solutions

### River Gauge Data (USGS Water Services)

The USGS Water Services API has CORS restrictions that prevent direct browser requests. The current implementation uses a **free CORS proxy** (`allorigins.win`) to bypass this:

```
const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(usgsUrl)}`;
const res = await fetch(corsProxyUrl);
```

**Pros**: Free, no authentication required
**Cons**: Relies on third-party proxy service, slight latency overhead

### Alternative: Backend Proxy (Production Recommended)

For production USACE deployments, set up a dedicated backend proxy (Node.js/Python):

```
// Replace proxy URL with your own backend
const res = await fetch('/api/usgs-gauges');
```

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
├── admin.html           # Entry form for Civil Works / Military Ops / Support Units / Programs
├── radar.js             # RainViewer radar overlay module
├── data/
│   ├── civil-works.json
│   ├── military-programs.json
│   └── support-units.json
└── README.md            # This file
```

---

## Support & Documentation

- **USGS Water Services**: <https://waterservices.usgs.gov/docs/>
- **USGS Earthquake API**: <https://earthquake.usgs.gov/fdsnws/event/1/>
- **NOAA Weather Alerts**: <https://www.weather.gov/documentation/services-web-api>
- **ReliefWeb API**: <https://reliefweb.int/help/api>
- **Leaflet.js Docs**: <https://leafletjs.com/>
- **NASA GIBS**: <https://wiki.earthdata.nasa.gov/display/GIBS/>

---

**Last Updated**: 2026-08-30
**Status**: Beta (Production Ready)
