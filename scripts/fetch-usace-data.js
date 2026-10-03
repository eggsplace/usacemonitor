// scripts/fetch-usace-data.js
// Fetches USACE Civil Works dams & USAspending MILCON awards server-side (Zero CORS, Zero Browser Limitations)

const fs = require('fs');
const path = require('path');

// Reference coordinates for major DoD / USACE installations
const BASE_COORDINATES = {
  "FORT LIBERTY": [35.14, -79.00],
  "FORT BRAGG": [35.14, -79.00],
  "FORT CAVAZOS": [31.13, -97.77],
  "FORT HOOD": [31.13, -97.77],
  "FORT BLISS": [31.81, -106.42],
  "FORT CAMPBELL": [36.65, -87.48],
  "FORT CARSON": [38.74, -104.79],
  "FORT STEWART": [31.87, -81.61],
  "FORT DRUM": [44.05, -75.76],
  "FORT RILEY": [39.11, -96.82],
  "FORT LEONARD WOOD": [37.71, -92.16],
  "FORT EISENHOWER": [33.37, -82.14],
  "FORT GORDON": [33.37, -82.14],
  "FORT MOORE": [32.36, -84.95],
  "FORT BENNING": [32.36, -84.95],
  "JOINT BASE LEWIS-MCCHORD": [47.11, -122.58],
  "JBLM": [47.11, -122.58],
  "NELLIS": [36.24, -115.05],
  "EGLIN": [30.46, -86.55],
  "TYNDALL": [30.07, -85.58],
  "WRIGHT-PATTERSON": [39.82, -84.05],
  "NORFOLK": [36.95, -76.30],
  "REDSTONE ARSENAL": [34.68, -86.65],
  "ABERDEEN PROVING GROUND": [39.47, -76.13],
  "YUMA PROVING GROUND": [32.84, -114.39],
  "SCHOFIELD BARRACKS": [21.50, -158.06],
  "CAMP HUMPHREYS": [36.96, 127.03],
  "KADENA": [26.35, 127.77],
  "ANDERSEN": [13.58, 144.92],
  "GUAM": [13.44, 144.79]
};

const STATE_CENTROIDS = {
  "AL": [32.80, -86.79], "AK": [61.37, -152.40], "AZ": [33.72, -111.43], "AR": [34.96, -92.37],
  "CA": [36.11, -119.68], "CO": [39.05, -105.31], "CT": [41.59, -72.75], "DE": [39.31, -75.50],
  "FL": [27.76, -81.68], "GA": [33.04, -83.64], "HI": [21.09, -157.49], "ID": [44.24, -114.47],
  "IL": [40.34, -88.98], "IN": [39.84, -86.25], "IA": [42.01, -93.21], "KS": [38.52, -96.72],
  "KY": [37.66, -84.67], "LA": [31.16, -91.86], "ME": [44.69, -69.38], "MD": [39.06, -76.80],
  "MA": [42.23, -71.53], "MI": [43.32, -84.53], "MN": [45.69, -93.90], "MS": [32.74, -89.67],
  "MO": [38.45, -92.28], "MT": [46.92, -110.45], "NE": [41.12, -98.26], "NV": [38.31, -117.05],
  "NH": [43.45, -71.56], "NJ": [40.29, -74.52], "NM": [34.84, -106.24], "NY": [42.16, -74.94],
  "NC": [35.63, -79.80], "ND": [47.52, -99.78], "OH": [40.38, -82.76], "OK": [35.56, -96.92],
  "OR": [44.57, -122.07], "PA": [40.59, -77.20], "RI": [41.68, -71.51], "SC": [33.85, -80.94],
  "SD": [44.29, -99.43], "TN": [35.74, -86.69], "TX": [31.05, -97.56], "UT": [40.15, -111.86],
  "VT": [44.04, -72.71], "VA": [37.76, -78.16], "WA": [47.40, -121.49], "WV": [38.49, -80.95],
  "WI": [44.26, -89.61], "WY": [42.75, -107.30], "PR": [18.22, -66.59], "GU": [13.44, 144.79]
};

function resolveCoords(description, stateCode) {
  const desc = (description || '').toUpperCase();
  for (const [name, coords] of Object.entries(BASE_COORDINATES)) {
    if (desc.includes(name)) {
      // Add slight jitter so overlapping projects at the same base separate cleanly
      return [coords[0] + (Math.random() - 0.5) * 0.04, coords[1] + (Math.random() - 0.5) * 0.04];
    }
  }
  if (stateCode && STATE_CENTROIDS[stateCode]) {
    const c = STATE_CENTROIDS[stateCode];
    return [c[0] + (Math.random() - 0.5) * 0.6, c[1] + (Math.random() - 0.5) * 0.6];
  }
  return null;
}

// 1. Fetch USAspending MILCON Awards for USACE (Subtier Agency 2113)
async function fetchMilcon() {
  console.log('Fetching USAspending MILCON awards for USACE (2113)...');
  const payload = {
    filters: {
      time_period: [{ start_date: "2023-10-01", end_date: "2026-09-30" }],
      agencies: [
        {
          type: "awarding",
          tier: "subtier",
          name: "U.S. Army Corps of Engineers"
        }
      ],
      psc_codes: ["Y111", "Y1AZ", "Y1JZ", "Y1FA", "Y1EZ", "Y1AA", "Y1PZ", "C111", "C1AZ", "C211"],
      award_type_codes: ["A", "B", "C", "D"]
    },
    fields: [
      "Award ID",
      "Recipient Name",
      "Award Amount",
      "Description",
      "Place of Performance State Code",
      "Place of Performance City Name"
    ],
    limit: 100,
    page: 1,
    sort: "Award Amount",
    order: "desc"
  };

  try {
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();

    const items = (data.results || []).map((award, i) => {
      const amount = award["Award Amount"] || 0;
      const desc = award["Description"] || "Military Construction Project";
      const state = award["Place of Performance State Code"];
      const coords = resolveCoords(desc, state);

      return {
        id: award["Award ID"] || `mil-${i}`,
        type: 'programs',
        topCategory: 'contingency',
        title: `MILCON: $${(amount / 1000000).toFixed(1)}M - ${award["Recipient Name"] || 'Prime Contractor'}`,
        subcategory: `${award["Place of Performance City Name"] || ''}, ${state || ''} | ${desc.slice(0, 80)}`,
        coords: coords,
        time: '',
        severity: amount > 50000000 ? 'critical' : 'warning',
        cost: amount,
        mag: Math.min(46, Math.max(18, Math.round(Math.log10(amount + 1) * 4.2))),
        link: `https://www.usaspending.gov/search`
      };
    }).filter(e => e.coords !== null);

    console.log(`Successfully parsed ${items.length} geocoded MILCON projects.`);
    return items;
  } catch (err) {
    console.error('USAspending fetch failed:', err);
    return [];
  }
}

// 2. Fetch USACE Civil Works Infrastructure (Major Dams, Locks & Reservoirs)
async function fetchCivilWorks() {
  console.log('Fetching USACE Civil Works features from public ArcGIS infrastructure...');
  const params = new URLSearchParams({
    where: "PRIMARY_OWNER_TYPE = 'Federal' OR FED_CONSTRUCTION = 'Yes' OR 1=1",
    outFields: 'NAME,NIDID,HAZARD_POTENTIAL,RIVER,STATE,PURPOSES',
    outSR: '4326',
    f: 'json',
    resultRecordCount: '600'
  });

  const url = `https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Dams/FeatureServer/0/query?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const items = (data.features || []).map((f, i) => {
      const p = f.attributes || {};
      const geom = f.geometry || {};
      if (!geom.y || !geom.x) return null;

      const hazard = p.HAZARD_POTENTIAL || p.HAZARD || 'Moderate';
      const severity = hazard.toLowerCase().includes('high') ? 'critical' : (hazard.toLowerCase().includes('significant') ? 'warning' : 'good');

      return {
        id: p.NIDID || `cw-${i}`,
        type: 'civil-works',
        topCategory: 'contingency',
        title: p.NAME ? `${p.NAME} Dam / Reservoir` : 'USACE Civil Works Project',
        subcategory: `Hazard: ${hazard} | River: ${p.RIVER || 'N/A'} (${p.STATE || ''})`,
        coords: [geom.y, geom.x],
        time: '',
        severity: severity,
        mag: 5,
        link: p.NIDID ? `https://nid.sec.usace.army.mil/#/dams/system/${p.NIDID}/summary` : 'https://nid.sec.usace.army.mil'
      };
    }).filter(Boolean);

    console.log(`Successfully parsed ${items.length} Civil Works facilities.`);
    return items;
  } catch (err) {
    console.error('Civil Works query failed:', err);
    return [];
  }
}

async function run() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const milcon = await fetchMilcon();
  fs.writeFileSync(path.join(dataDir, 'milcon-cache.json'), JSON.stringify({ updated: new Date().toISOString(), events: milcon }, null, 2));

  const civilWorks = await fetchCivilWorks();
  fs.writeFileSync(path.join(dataDir, 'civil-works-cache.json'), JSON.stringify({ updated: new Date().toISOString(), events: civilWorks }, null, 2));

  console.log('Cache files saved successfully in /data/');
}

run();
