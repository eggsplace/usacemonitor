// radar.js — RainViewer radar overlay (no API key)
// Expects a global `map` variable already initialized in the page.

let radarLayer = null;
let radarTimestamp = null; // track current timestamp so we only update when it changes

async function addWeatherRadar() {
  try {
    // { cache: 'no-store' } forces a genuinely fresh request every time. Without it, the
    // browser's normal HTTP caching can silently reuse an old cached response to this same
    // URL — which is exactly what was happening: tile requests were being built from a
    // metadata response cached months earlier, producing a frame timestamp RainViewer had
    // long since purged (their frames only live ~2 hours), which is why those tiles came
    // back 410 Gone.
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Defensive checks
    if (!data || !data.radar || !data.radar.past || data.radar.past.length === 0) {
      console.warn('RainViewer: no radar frames available');
      if (radarLayer) { map.removeLayer(radarLayer); radarLayer = null; radarTimestamp = null; }
      return;
    }

    const latestFrame = data.radar.past[data.radar.past.length - 1];
    const latestTime = String(latestFrame.time);
    const host = data.host || 'https://tilecache.rainviewer.com';

    // Tile pattern used by RainViewer
    const tileUrl = `${host}/v2/radar/${latestTime}/256/{z}/{x}/{y}/2/1_1.png`;

    // If we already have a layer, update URL (so browser re-requests new tiles)
    if (radarLayer) {
      if (radarTimestamp === latestTime) {
        // no change
        return;
      }
      radarLayer.setUrl(tileUrl);
      radarTimestamp = latestTime;
      console.log('RainViewer: radar overlay updated to', latestTime);
    } else {
      // create the layer once
      radarLayer = L.tileLayer(tileUrl, {
        opacity: 0.65,
        zIndex: 500,
        attribution: 'Radar © RainViewer',
        maxNativeZoom: 7 // RainViewer's documented max zoom for these tiles
      }).addTo(map);
      radarTimestamp = latestTime;
      console.log('RainViewer: radar overlay added', latestTime);
    }
  } catch (err) {
    console.error('Failed to load RainViewer radar layer:', err);
    // optional: remove stale layer on error
    // if (radarLayer) { map.removeLayer(radarLayer); radarLayer = null; radarTimestamp = null; }
  }
}

function removeWeatherRadar() {
  if (radarLayer) {
    map.removeLayer(radarLayer);
    radarLayer = null;
    radarTimestamp = null;
  }
}

function toggleWeatherRadar() {
  if (radarLayer) removeWeatherRadar();
  else addWeatherRadar();
}

// auto-refresh helper: refresh radar frames (but don't set too low — 5 min is reasonable)
function startRadarAutoRefresh(intervalMs = 300000) {
  // Run once immediately; caller can also call addWeatherRadar() when ready
  addWeatherRadar();
  return setInterval(addWeatherRadar, intervalMs);
}

// Expose functions for console/use elsewhere
window.addWeatherRadar = addWeatherRadar;
window.removeWeatherRadar = removeWeatherRadar;
window.toggleWeatherRadar = toggleWeatherRadar;
window.startRadarAutoRefresh = startRadarAutoRefresh;
