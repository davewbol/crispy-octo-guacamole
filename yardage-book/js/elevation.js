// Elevation + plays-like distance helpers.
// Phase 1: pure formula. The Open-Elevation client comes in Phase 5.
(function () {
  const G = (window.Golf = window.Golf || {});

  // Default: 1 yard added per 1 foot of elevation gained.
  const DEFAULT_YDS_PER_FT = 1.0;

  // Compute plays-like distance.
  //   yards:    geometric distance in yards
  //   deltaFt:  target elevation - player elevation, in feet (positive = uphill)
  //   ydsPerFt: tuning constant (default 1.0)
  function playsLikeYd(yards, deltaFt, ydsPerFt) {
    const k = (typeof ydsPerFt === 'number') ? ydsPerFt : DEFAULT_YDS_PER_FT;
    return yards + (deltaFt || 0) * k;
  }

  // Decide whether to surface the plays-like adjustment in the UI.
  // We hide it when |delta| is tiny so the page doesn't get noisy.
  function isMeaningfulDelta(deltaFt) {
    return Math.abs(deltaFt || 0) >= 5;
  }

  // Symbol for an elevation arrow when displayed inline.
  function arrowFor(deltaFt) {
    if (!isMeaningfulDelta(deltaFt)) return '';
    return deltaFt > 0 ? '↑' : '↓';
  }

  // Inverse-distance-weighted interpolation of a player's elevation
  // from a list of known elevation samples. Each sample = { latlon:[lat,lon], elevationFt }.
  // Falls back to the nearest sample if the player is essentially on top of one.
  function interpolateElevationFt(playerLatLon, samples) {
    if (!samples || samples.length === 0) return null;
    if (samples.length === 1) return samples[0].elevationFt;
    let wsum = 0, vsum = 0;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      if (s.elevationFt == null) continue;
      const d = G.geo.haversineM(playerLatLon, s.latlon);
      if (d < 0.5) return s.elevationFt; // basically on the sample
      const w = 1 / (d * d);
      wsum += w;
      vsum += w * s.elevationFt;
    }
    return wsum > 0 ? vsum / wsum : null;
  }

  G.elevation = {
    DEFAULT_YDS_PER_FT,
    playsLikeYd,
    isMeaningfulDelta,
    arrowFor,
    interpolateElevationFt,
  };
})();
