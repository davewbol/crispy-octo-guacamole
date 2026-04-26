// One hand-crafted Par 4 to exercise the page renderer and distance math
// before the Course Builder exists. Coordinates are anchored to a fictional
// tee at [40.0000, -75.0000]; features are placed in (yds-from-tee, lateral-yds)
// space and then converted to lat/lon at fixture-load time.
(function () {
  const G = (window.Golf = window.Golf || {});

  const TEE = [40.0000, -75.0000];
  const BEARING_DEG = 8;                       // tee → green bearing (slightly NE)
  const M_PER_YD = 0.9144;
  const M_PER_DEG_LAT = 111320;
  const COS_LAT = Math.cos(40 * Math.PI / 180);
  const BR_RAD = BEARING_DEG * Math.PI / 180;
  const SIN_BR = Math.sin(BR_RAD);
  const COS_BR = Math.cos(BR_RAD);

  // Convert a (yards-along-line-of-play, yards-lateral) pair (lateral +ve = right of line)
  // into a [lat, lon] world coordinate.
  function pt(alongYds, lateralYds) {
    const along = alongYds * M_PER_YD;
    const lat = lateralYds * M_PER_YD;
    const dxEast  = along * SIN_BR + lat * COS_BR;
    const dyNorth = along * COS_BR - lat * SIN_BR;
    return [
      TEE[0] + dyNorth / M_PER_DEG_LAT,
      TEE[1] + dxEast  / (M_PER_DEG_LAT * COS_LAT),
    ];
  }

  // Build a closed polygon ring from an array of (along, lateral) pairs.
  function ring(pts) {
    const r = pts.map(([a, l]) => pt(a, l));
    // Close the ring.
    const first = r[0], last = r[r.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) r.push(first.slice());
    return r;
  }

  // A rounded blob used for organic bunker / tree shapes.
  function blob(centerAlong, centerLat, radiusAlong, radiusLat, n, jitter) {
    n = n || 10;
    jitter = jitter || 0.2;
    const out = [];
    let seed = (centerAlong * 31 + centerLat * 17 + radiusAlong) | 0;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI;
      const j = 1 + (rnd() - 0.5) * jitter;
      out.push([
        centerAlong + Math.cos(a) * radiusAlong * j,
        centerLat   + Math.sin(a) * radiusLat   * j,
      ]);
    }
    return ring(out);
  }

  const greenRing = ring([
    [375, -5], [380, -10], [385, -13], [389, -13],
    [395, -11], [402,  -6], [403,   0], [402,   6],
    [395,  11], [389,  13], [385,  13], [380,  10], [375, 5],
  ]);

  const fairwayRing = ring([
    // left edge from tee to green
    [  5, -10], [ 50, -14], [120, -16], [180, -17], [240, -17],
    [285, -19], [320, -19], [350, -16], [370, -12],
    // around the front of the green and back down the right
    [375,  -7],
    [375,   7],
    [370,  12], [350,  16], [320,  19], [285,  19],
    [240,  17], [180,  17], [120,  16], [ 50,  14], [  5,  10],
  ]);

  const hazards = [
    // Right fairway bunker complex
    { type: 'bunker', geom: blob(285, 23, 7, 4, 12), label: 'R fwy' },
    { type: 'bunker', geom: blob(295, 27, 6, 3, 12) },
    // Left long-carry bunker
    { type: 'bunker', geom: blob(318, -17, 8, 4, 12), label: 'L carry' },
    // Front greenside bunkers
    { type: 'bunker', geom: blob(377, -14, 7, 4, 12), label: 'GS L' },
    { type: 'bunker', geom: blob(377,  14, 7, 4, 12), label: 'GS R' },
    // Long water carry along left side
    { type: 'water',  geom: ring([
        [200, -22], [225, -24], [260, -25], [300, -26],
        [340, -27], [368, -29], [378, -33], [395, -38], [410, -45],
        [410, -60], [200, -60],
      ]), label: 'water L' },
  ];

  const treeClusters = [
    { geom: blob(150, -28, 8, 8, 12, 0.15) },
    { geom: blob(110,  26, 9, 9, 12, 0.15) },
    { geom: blob(290,  32, 7, 7, 12, 0.15) },
    { geom: blob(355,  24, 6, 6, 12, 0.15) },
  ];

  const greenCenter = pt(389, 0);

  const hole = {
    num: 2,
    par: 4,
    hcp: 7,
    totalYards: 389,
    tees: [
      { name: 'black', point: pt(-21, -2), elevationFt: 102 },
      { name: 'blue',  point: pt(-10,  0), elevationFt: 100 },
      { name: 'white', point: pt(  0,  1), elevationFt:  98 },
      { name: 'red',   point: pt( 50,  3), elevationFt:  92 },
    ],
    tee: pt(0, 1),
    green: greenRing,
    greenCenter,
    greenElevationFt: 92, // green sits ~6 ft below the white tee
    fairway: fairwayRing,
    treeClusters,
    hazards,
    elevationMarks: [
      { latlon: pt(100, 0), deltaFt:  0 },
      { latlon: pt(200, 0), deltaFt: -2 },
      { latlon: pt(300, 0), deltaFt: -3 },
      { latlon: pt(370, 0), deltaFt: -6 },
    ],
    layupLines: [],
    line: [pt(0, 1), greenCenter],
    annotations: { aimPoints: [], avoidZones: [], greenNotes: '', slopeArrows: [] },
  };

  const course = {
    id: 'fixture-test-course',
    name: 'Test Course',
    source: 'manual',
    bbox: null,
    boundary: null,
    holes: [hole],
  };

  // Convenience: a few simulated player positions you can paste into the console.
  const debugPositions = {
    onTee:        pt(0, 0),
    drive:        pt(240, -3),   // good drive in the fairway
    layup150:     pt(239, 0),    // 150 to pin
    bunker:       pt(287, 22),   // right-fairway bunker
    nearGreen:    pt(360, 4),    // approach
    onGreen:      pt(389, 0),
  };

  G.fixtures = G.fixtures || {};
  G.fixtures.testCourse = course;
  G.fixtures.testPositions = debugPositions;
})();
