// Wraps watchPosition with accuracy filtering, simple EMA smoothing,
// and a debug.setPosition hook so you can drive the app from DevTools
// without simulating GPS at the browser level.
(function () {
  const G = (window.Golf = window.Golf || {});

  const ACCURACY_LIMIT_M = 25; // discard fixes worse than this
  const EMA_ALPHA = 0.4;       // smoothing factor

  let listeners = [];
  let smoothed = null;     // [lat, lon]
  let watchId = null;
  let debugMode = false;

  function emit(pos) {
    smoothed = smoothLatLon(smoothed, [pos.lat, pos.lon]);
    const out = {
      lat: smoothed[0],
      lon: smoothed[1],
      accuracy: pos.accuracy,
      altitude: pos.altitude,
      altitudeAccuracy: pos.altitudeAccuracy,
      ts: pos.ts,
      source: pos.source || 'gps',
    };
    for (const fn of listeners) {
      try { fn(out); } catch (e) { console.error('geolocation listener', e); }
    }
  }

  function smoothLatLon(prev, next) {
    if (!prev) return next.slice();
    return [
      prev[0] + EMA_ALPHA * (next[0] - prev[0]),
      prev[1] + EMA_ALPHA * (next[1] - prev[1]),
    ];
  }

  function start() {
    if (watchId != null || debugMode) return;
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported');
      return;
    }
    watchId = navigator.geolocation.watchPosition(
      (p) => {
        if (p.coords.accuracy != null && p.coords.accuracy > ACCURACY_LIMIT_M) return;
        emit({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          accuracy: p.coords.accuracy,
          altitude: p.coords.altitude,
          altitudeAccuracy: p.coords.altitudeAccuracy,
          ts: p.timestamp,
        });
      },
      (err) => console.warn('Geolocation error', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  }

  function stop() {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter((x) => x !== fn); };
  }

  // Debug hook: drives the app from the JS console without involving the GPS.
  // Usage from DevTools:
  //   Golf.debug.setPosition(40.0010, -75.0000)
  //   Golf.debug.walk([40.0010, -75.0000], [40.00315, -74.99928], 30) // 30 steps
  function setPosition(lat, lon) {
    if (!debugMode) {
      stop();
      debugMode = true;
    }
    // Bypass EMA so debug calls land exactly where requested.
    smoothed = null;
    emit({ lat, lon, accuracy: 5, altitude: null, altitudeAccuracy: null, ts: Date.now(), source: 'debug' });
  }

  function walk(from, to, steps, intervalMs) {
    steps = steps || 20;
    intervalMs = intervalMs || 250;
    let i = 0;
    const id = setInterval(() => {
      const t = i / (steps - 1);
      const lat = from[0] + (to[0] - from[0]) * t;
      const lon = from[1] + (to[1] - from[1]) * t;
      setPosition(lat, lon);
      i++;
      if (i >= steps) clearInterval(id);
    }, intervalMs);
    return id;
  }

  G.geolocation = { start, stop, subscribe };
  G.debug = G.debug || {};
  G.debug.setPosition = setPosition;
  G.debug.walk = walk;
})();
