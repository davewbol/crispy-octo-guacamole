// Geometry + geodesy helpers. All angles in degrees in the public API.
// Internal math uses radians. Distances default to yards via toYards().
(function () {
  const G = (window.Golf = window.Golf || {});

  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;
  const EARTH_R_M = 6371008.8; // mean radius in meters
  const M_PER_DEG_LAT = 111320;
  const M_PER_YD = 0.9144;

  function toRad(d) { return d * D2R; }
  function toDeg(r) { return r * R2D; }
  function toYards(m) { return m / M_PER_YD; }
  function toMeters(yd) { return yd * M_PER_YD; }

  // Haversine great-circle distance in meters.
  function haversineM(a, b) {
    const lat1 = toRad(a[0]), lat2 = toRad(b[0]);
    const dLat = lat2 - lat1;
    const dLon = toRad(b[1] - a[1]);
    const s = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_R_M * Math.asin(Math.sqrt(s));
  }

  function distanceYd(a, b) { return toYards(haversineM(a, b)); }

  // Initial bearing from a to b, in degrees clockwise from true north (0..360).
  function bearingDeg(a, b) {
    const lat1 = toRad(a[0]), lat2 = toRad(b[0]);
    const dLon = toRad(b[1] - a[1]);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const br = toDeg(Math.atan2(y, x));
    return (br + 360) % 360;
  }

  // Make a local equirectangular projector centered on (originLat, originLon),
  // with a rotation chosen so a vector pointing along bearingDeg in the world
  // ends up along the +y axis. Returns lat,lon -> [x_m, y_m] in meters,
  // where +x is "right of the line of play" and +y is "toward the bearing".
  function makeProjector(originLat, originLon, rotateBearingDeg) {
    const cosLat = Math.cos(toRad(originLat));
    const beta = toRad(rotateBearingDeg || 0);
    const cb = Math.cos(beta), sb = Math.sin(beta);
    return function project(latlon) {
      const dx = (latlon[1] - originLon) * cosLat * M_PER_DEG_LAT; // east meters
      const dy = (latlon[0] - originLat) * M_PER_DEG_LAT;         // north meters
      // For bearing β (clockwise from north), the unit-along is (sin β, cos β).
      // Decompose (dx, dy) into along-bearing (ry) and right-of-bearing (rx).
      const rx = dx * cb - dy * sb;
      const ry = dx * sb + dy * cb;
      return [rx, ry];
    };
  }

  // Centroid of a polygon ring [[lat,lon], ...]. Closed or open both fine.
  // Uses spherical-equirectangular shortcut (good for golf-scale features).
  function centroid(ring) {
    if (!ring || ring.length === 0) return null;
    if (ring.length === 1) return ring[0].slice();
    let lat = 0, lon = 0, n = 0;
    const last = ring[ring.length - 1];
    const first = ring[0];
    const closed = last[0] === first[0] && last[1] === first[1];
    const stop = closed ? ring.length - 1 : ring.length;
    for (let i = 0; i < stop; i++) {
      lat += ring[i][0];
      lon += ring[i][1];
      n++;
    }
    return [lat / n, lon / n];
  }

  // Densify a polygon ring by linearly interpolating points so adjacent
  // samples are at most maxStepM meters apart. Returns an array of [lat,lon].
  function densifyRing(ring, maxStepM) {
    if (!ring || ring.length < 2) return ring ? ring.slice() : [];
    const out = [];
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i], b = ring[i + 1];
      out.push(a);
      const segM = haversineM(a, b);
      const steps = Math.ceil(segM / maxStepM);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    out.push(ring[ring.length - 1]);
    return out;
  }

  // Min distance from a point to a sampled ring of points, in meters.
  function nearestOnRingM(pt, sampledRing) {
    let best = Infinity;
    for (let i = 0; i < sampledRing.length; i++) {
      const d = haversineM(pt, sampledRing[i]);
      if (d < best) best = d;
    }
    return best;
  }

  // Front / center / back yardage along the player→aim bearing axis,
  // computed by projecting green vertices onto the unit vector at that bearing.
  // Returns { frontYd, centerYd, backYd } where front <= center <= back.
  function frontCenterBackYd(playerLatLon, greenCenter, greenRing) {
    // Bearing from player to green center is the line of play axis.
    const proj = makeProjector(playerLatLon[0], playerLatLon[1],
                               bearingDeg(playerLatLon, greenCenter));
    // Project all green vertices into player-local meters; +y is toward green.
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < greenRing.length; i++) {
      const p = proj(greenRing[i]);
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    const centerYd = distanceYd(playerLatLon, greenCenter);
    return {
      frontYd: toYards(minY),
      centerYd: centerYd,
      backYd: toYards(maxY),
    };
  }

  G.geo = {
    EARTH_R_M, M_PER_DEG_LAT, M_PER_YD,
    toRad, toDeg, toYards, toMeters,
    haversineM, distanceYd, bearingDeg,
    makeProjector, centroid, densifyRing, nearestOnRingM,
    frontCenterBackYd,
  };
})();
