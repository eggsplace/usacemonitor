# USACE Operations Monitor

A real-time operational dashboard for U.S. Army Corps of Engineers emergency response and operations management.

## Features

### Data Feeds
- **Seismic Events**: Live earthquake data from USGS (M4.5+, US-focused)
- **River Gauges**: Real-time streamflow and water level data from USGS Water Services API
- **Weather Radar**: Integrated RainViewer radar overlay for precipitation tracking
- **Satellite Imagery**: NASA GIBS (VIIRS) for thermal anomaly and fire detection

### Operational Filtering
- **Contingency Ops**: Earthquakes, flooding, storm tracking, and disaster response
- **Environmental Monitoring**: River gauge status, flow rates, and water level alerts
- **All Events**: Unified view across all data sources

### Map Features
- Interactive Leaflet.js map (centered on USA)
- Real-time marker updates with severity indicators
- Clickable event cards for detail navigation
- Tactical dark theme UI optimized for operations centers

---

## API Data Sources

| Data | Source | Endpoint | Update Frequency |
|------|--------|----------|------------------|
| Earthquakes | USGS GeoJSON | earthquake.usgs.gov | Real-time (2 min sync) |
| River Gauges | USGS Water Services | waterservices.usgs.gov | Every 15 min (transmitted hourly) |
| Weather Radar | RainViewer | rainviewer.com | Every 5 minutes |
| Satellite Imagery | NASA GIBS | gibs.earthdata.nasa.gov | Daily |

---

## Customization Guide

### Adding New Data Feeds

To add a new data feed (e.g., NOAA hurricane data), create a new async function following this pattern:

```javascript
async function fetchYourData() {
  try {
    const res = await fetch('YOUR_API_ENDPOINT');
    const data = await res.json();
    
    return data.features.map(f => ({
      id: f.id,
      type: 'your-feed-type',       // e.g., 'hurricane', 'fire'
      title: `Event: ${f.name}`,
      coords: [latitude, longitude],
      time: new Date(f.timestamp).toISOString().slice(0, 19) + ' UTC',
      severity: 'critical' | 'warning' | 'info',
      mag: numeric_value_for_marker_size
    }));
  } catch (err) {
    console.error("Feed error:", err);
    return [];
  }
}
```

Then add it to the `init()` function:

```javascript
async function init() {
  const [seismic, riverGauges, yourNewFeed] = await Promise.all([
    fetchSeismicData(),
    fetchRiverGaugeData(),
    fetchYourData()
  ]);
  
  allEvents = [...seismic, ...riverGauges, ...yourNewFeed];
  renderEvents(allEvents);
  // ...
}
```

### Configuring Severity Thresholds

Thresholds are currently hardcoded in each fetch function. To modify:

**River Gauge Thresholds** (in `fetchRiverGaugeData`):
- **Warning**: Flow rate < 1000 cfs (low water)
- **Critical**: Flow rate > 50000 cfs (flood risk)

**Earthquake Thresholds** (in `fetchSeismicData`):
- **Warning**: Magnitude < 6.0
- **Critical**: Magnitude ≥ 6.0

### Modifying Filter Categories

Filter buttons in the sidebar are defined in `index.html` (around line 239):

```html
<button class="filter-btn active" onclick="filterEvents('all', this)">ALL</button>
<button class="filter-btn" onclick="filterEvents('contingency', this)">CONTINGENCY</button>
<button class="filter-btn" onclick="filterEvents('environmental', this)">ENV</button>
```

Add new buttons and update the `filterEvents()` function in the script section to define which feed types are included in each category.

### Color Scheme & Styling

Edit the CSS variables in the `<style>` section:

```css
:root {
    --bg-base: #0a0c10;              /* Main background */
    --accent-cyan: #00f0ff;          /* Active/selected elements */
    --accent-red: #ff3344;           /* Critical events */
    --accent-amber: #ffaa00;         /* Warning events */
    --accent-green: #00ff66;         /* Active/online status */
}
```

---

## Future Enhancements

1. **Internal USACE Data Integration**: Connect to USACE-specific APIs for:
   - Civil Works project status
   - MILCON project tracking
   - FEST deployment locations
   - Long Duration Project updates

2. **Advanced Filtering**: Expand filter tabs to match USACE categories:
   - Contingency Ops (PRT, Wildfires, River Gauges, Storms, Disasters)
   - Civil Works (Project Updates, Study Terminations, Contract Tracking)
   - Military Ops (MILCON Projects, Requirements, Contracts)
   - FEST (Deployments, Route Reconnaissance)
   - Long Duration Projects (TF Castle, SW Border, Recovery Ops)

3. **Real-time Alerts**: Email/SMS notifications for critical events

4. **User Authentication**: Login system for restricted USACE operations data

5. **Export/Reporting**: Generate operational summaries and event reports

---

## Installation & Deployment

### Local Development
```bash
# Clone repository
git clone <repo-url>

# Serve locally (any HTTP server)
python -m http.server 8000
# or
npx http-server
```

### Netlify Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

---

## File Structure

```
.
├── index.html          # Main UI and event rendering logic
├── radar.js            # RainViewer radar overlay module
└── README.md           # This file
```

---

## Support & Documentation

- **USGS Water Services**: https://waterservices.usgs.gov/docs/
- **USGS Earthquake API**: https://earthquake.usgs.gov/fdsnws/event/1/
- **Leaflet.js Docs**: https://leafletjs.com/
- **NASA GIBS**: https://wiki.earthdata.nasa.gov/display/GIBS/

---

**Last Updated**: 2026-08-29  
**Status**: Beta (Production Ready)
