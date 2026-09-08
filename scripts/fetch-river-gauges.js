// Fetches current river/lake gauge status from Xweather and writes a filtered snapshot
// to data/river-gauges-cache.json. Run hourly by .github/workflows/update-river-gauges.yml
// so the credentials and the request itself stay server-side — the live dashboard just
// reads the resulting static JSON file, no API key ever reaches the browser.
 
const fs = require('fs');
const path = require('path');
 
const CLIENT_ID = process.env.XWEATHER_CLIENT_ID;
const CLIENT_SECRET = process.env.XWEATHER_CLIENT_SECRET;
const RIVER_FLOOD_STATUSES = ['action', 'minor', 'moderate', 'major'];
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'river-gauges-cache.json');
 
async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Missing XWEATHER_CLIENT_ID / XWEATHER_CLIENT_SECRET environment variables.');
    process.exit(1);
  }
 
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    format: 'json'
  });
  const url = `https://data.api.xweather.com/rivers/search?${params}`;
 
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Xweather API HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  if (!data.success) {
    throw new Error((data.error && data.error.description) || 'Xweather API returned an error');
  }
 
  const events = [];
  (data.response || []).forEach(gauge => {
    const status = gauge.ob && gauge.ob.status;
    const isLow = status === 'low_threshold';
    const isFlood = RIVER_FLOOD_STATUSES.includes(status);
    if (!isLow && !isFlood) return; // skip normal, out-of-service, or undefined-threshold gauges
 
    const ob = gauge.ob;
    const level = ob.heightFT != null ? `${ob.heightFT} ft` : (ob.flowCFS != null ? `${ob.flowCFS} cfs` : 'n/a');
    const label = (gauge.profile && gauge.profile.waterbody) || (gauge.place && gauge.place.name) || gauge.id;
 
    events.push({
      id: gauge.id,
      title: `${label} - ${status.replace('_', ' ')} (${level})`,
      lat: gauge.loc.lat,
      lon: gauge.loc.long,
      time: ob.dateTimeISO || null,
      severity: isFlood ? 'critical' : 'warning',
      mag: ob.flowCFS || ob.heightFT || 0
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
