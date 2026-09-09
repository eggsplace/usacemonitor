// Fetches current river gauge status directly from NOAA's National Water Prediction
// Service (NWPS) API — the free, public, no-key-required source that Xweather and
// AccuWeather's river gauge products both ultimately resell. Writes a filtered snapshot
// to data/river-gauges-cache.json. Run hourly by .github/workflows/update-river-gauges.yml.
//
// NWPS API reference: https://api.water.noaa.gov/nwps/v1/docs/
// NOAA's own notes: "This API is not supported 24/7 and may be modified without advance
// notice." Acceptable here since this dashboard is a nice-to-have, not a critical system —
// a failed hourly refresh just means the cache keeps showing the last known-good data.

const fs = require('fs');
const path = require('path');

const RIVER_FLOOD_STATUSES = ['action', 'minor', 'moderate', 'major'];
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'river-gauges-cache.json');

// Same regions used for the earthquake feed in index.html — NWPS covers CONUS, Alaska,
// Hawaii, and Puerto Rico, so we query each bounding box separately and merge results
// (the API doesn't support an antimeridian-crossing single box for Alaska's Aleutians).
const REGIONS = {
  conus:      { xmin: -125,   ymin: 24.5, xmax: -66.9, ymax: 49.4 },
  alaska_w:   { xmin: -180,   ymin: 51,   xmax: -129,  ymax: 72 },
  alaska_e:   { xmin: 165,    ymin: 51,   xmax: 180,   ymax: 72 }, // Aleutians east of the antimeridian
  hawaii:     { xmin: -161,   ymin: 18,   xmax: -154,  ymax: 23 },
  puerto_rico:{ xmin: -68,    ymin: 17,   xmax: -64,   ymax: 19 }
};

async function fetchRegion(name, box) {
  const params = new URLSearchParams({
    'bbox.xmin': box.xmin,
    'bbox.ymin': box.ymin,
    'bbox.xmax': box.xmax,
    'bbox.ymax': box.ymax,
    'srid': 'EPSG_4326'
  });
  const url = `https://api.water.noaa.gov/nwps/v1/gauges?${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'usacemonitor (github.com/eggsplace/usacemonitor)' } });
  if (!res.ok) {
    console.warn(`NWPS request failed for region "${name}": HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.gauges || [];
}

async function main() {
  const regionResults = await Promise.all(
    Object.entries(REGIONS).map(([name, box]) => fetchRegion(name, box))
  );
  const allGauges = regionResults.flat();

  // Dedupe by lid — a gauge near a region boundary could be returned by more than one query.
  const seen = new Set();
  const events = [];

  allGauges.forEach(gauge => {
    if (!gauge.lid || seen.has(gauge.lid)) return;
    seen.add(gauge.lid);

    const observed = gauge.status && gauge.status.observed;
    const status = observed && observed.floodCategory;
    const isLow = status === 'low_threshold';
    const isFlood = RIVER_FLOOD_STATUSES.includes(status);
    if (!isLow && !isFlood) return; // skip normal, out-of-service, or undefined-threshold gauges
    if (gauge.latitude == null || gauge.longitude == null) return;

    const level = observed.primary != null ? `${observed.primary} ${observed.primaryUnit || ''}`.trim() : 'n/a';
    const label = gauge.name || gauge.lid;

    events.push({
      id: gauge.lid,
      title: `${label} - ${status.replace('_', ' ')} (${level})`,
      lat: gauge.latitude,
      lon: gauge.longitude,
      time: observed.validTime || null,
      severity: isFlood ? 'critical' : 'warning',
      mag: observed.primary || 0
    });
  });

  const output = {
    generatedAt: new Date().toISOString(),
    count: events.length,
    events
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${events.length} gauge events to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
