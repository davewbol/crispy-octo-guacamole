// Renders a Course hole as an illustrated yardage-book page (SVG).
// Returns a controller you can call setPlayer() / setPin() on.
(function () {
  const G = (window.Golf = window.Golf || {});
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const PAGE_W = 360;
  const PAGE_H = 640;
  const MARGIN_L = 36;
  const MARGIN_R = 36;
  const MARGIN_T = 14;
  const MARGIN_B = 14;
  const CONTENT_PAD_M = 18;       // extra meters of bbox padding
  const ARC_YARDS = [50, 75, 100, 125, 150, 175, 200, 250];
  const TICK_EVERY_YD = 25;

  function el(tag, attrs, parent) {
    const n = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (const k in attrs) {
        if (attrs[k] != null) n.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(n);
    return n;
  }

  function ringToPath(ring, toPage) {
    let d = '';
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = toPage(ring[i]);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
    }
    return d + 'Z';
  }

  function renderHole(container, course, holeIdx, opts) {
    opts = opts || {};
    const hole = course.holes[holeIdx];
    if (!hole) throw new Error('Hole ' + holeIdx + ' not found');
    if (!hole.tee || !hole.greenCenter) throw new Error('Hole missing tee or greenCenter');

    // Frame: project the world so +y points along the line of play.
    const bearing = G.geo.bearingDeg(hole.tee, hole.greenCenter);
    const midLat = (hole.tee[0] + hole.greenCenter[0]) / 2;
    const midLon = (hole.tee[1] + hole.greenCenter[1]) / 2;
    const project = G.geo.makeProjector(midLat, midLon, bearing);
    const M_PER_YD = G.geo.M_PER_YD;

    const teeProj = project(hole.tee);
    const greenCProj = project(hole.greenCenter);
    const pinLatLon = opts.pin || hole.greenCenter;
    const pinProj = project(pinLatLon);

    const greenProj = (hole.green || []).map(project);
    const fairwayProj = (hole.fairway || []).map(project);
    const hazardsProj = (hole.hazards || []).map((h) => ({
      type: h.type,
      label: h.label,
      ringProj: h.geom.map(project),
      worldCentroid: G.geo.centroid(h.geom),
      centroidProj: project(G.geo.centroid(h.geom)),
    }));
    const treesProj = (hole.treeClusters || []).map((t) => ({
      ringProj: t.geom.map(project),
    }));
    const elevMarksProj = (hole.elevationMarks || []).map((e) => ({
      deltaFt: e.deltaFt,
      proj: project(e.latlon),
    }));
    const teesProj = (hole.tees || []).map((t) => ({
      name: t.name,
      elevationFt: t.elevationFt,
      proj: project(t.point),
    }));

    // BBox of all features (in projected meters).
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    function expand(p) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    expand(teeProj); expand(greenCProj);
    greenProj.forEach(expand);
    fairwayProj.forEach(expand);
    hazardsProj.forEach((h) => h.ringProj.forEach(expand));
    treesProj.forEach((t) => t.ringProj.forEach(expand));

    minX -= CONTENT_PAD_M; maxX += CONTENT_PAD_M;
    minY -= CONTENT_PAD_M; maxY += CONTENT_PAD_M;

    const contentW = PAGE_W - MARGIN_L - MARGIN_R;
    const contentH = PAGE_H - MARGIN_T - MARGIN_B;
    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    const scale = Math.min(contentW / bboxW, contentH / bboxH);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    function toPage(p) {
      return [
        PAGE_W / 2 + (p[0] - cx) * scale,
        PAGE_H / 2 - (p[1] - cy) * scale,
      ];
    }
    const ydToPage = M_PER_YD * scale; // page units per yard

    // -- Build SVG ----------------------------------------------------------
    container.replaceChildren();
    const svg = el('svg', {
      class: 'yb-page',
      viewBox: `0 0 ${PAGE_W} ${PAGE_H}`,
      preserveAspectRatio: 'xMidYMid meet',
    }, container);

    // Bunker hatch pattern
    const defs = el('defs', null, svg);
    const pat = el('pattern', {
      id: 'yb-bunker-hatch', patternUnits: 'userSpaceOnUse', width: 4, height: 4,
      patternTransform: 'rotate(45)',
    }, defs);
    el('rect', { width: 4, height: 4, fill: 'transparent' }, pat);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 4, stroke: '#b89c5d', 'stroke-width': 0.6, opacity: 0.5 }, pat);

    // Layer groups (drawn bottom-up).
    const gFairway   = el('g', { 'data-layer': 'fairway' }, svg);
    const gTrees     = el('g', { 'data-layer': 'trees' }, svg);
    const gWater     = el('g', { 'data-layer': 'water' }, svg);
    const gBunkers   = el('g', { 'data-layer': 'bunkers' }, svg);
    const gGreen     = el('g', { 'data-layer': 'green' }, svg);
    const gLine      = el('g', { 'data-layer': 'line' }, svg);
    const gArcs      = el('g', { 'data-layer': 'arcs' }, svg);
    const gScale     = el('g', { 'data-layer': 'scale' }, svg);
    const gElev      = el('g', { 'data-layer': 'elev' }, svg);
    const gLabels    = el('g', { 'data-layer': 'labels' }, svg);
    const gPin       = el('g', { 'data-layer': 'pin' }, svg);
    const gPlayer    = el('g', { 'data-layer': 'player' }, svg);
    const gInsets    = el('g', { 'data-layer': 'insets' }, svg);
    const gBadge     = el('g', { 'data-layer': 'badge' }, svg);

    // Fairway
    if (fairwayProj.length) {
      el('path', { class: 'yb-fairway', d: ringToPath(fairwayProj, toPage) }, gFairway);
    }
    // Trees (filled blobs)
    treesProj.forEach((t) => {
      el('path', { class: 'yb-tree', d: ringToPath(t.ringProj, toPage) }, gTrees);
    });
    // Water + Bunkers
    hazardsProj.forEach((h) => {
      if (h.type === 'water') {
        el('path', { class: 'yb-water', d: ringToPath(h.ringProj, toPage) }, gWater);
      } else if (h.type === 'bunker') {
        const d = ringToPath(h.ringProj, toPage);
        el('path', { class: 'yb-bunker', d }, gBunkers);
        el('path', { d, fill: 'url(#yb-bunker-hatch)', stroke: 'none' }, gBunkers);
      }
    });
    // Green
    if (greenProj.length) {
      el('path', { class: 'yb-green', d: ringToPath(greenProj, toPage) }, gGreen);
    }

    // Line of play (dashed, tee → green center).
    {
      const [x1, y1] = toPage(teeProj);
      const [x2, y2] = toPage(greenCProj);
      el('line', { class: 'yb-line-of-play', x1, y1, x2, y2 }, gLine);
    }

    // Distance arcs (concentric, around the pin).
    {
      const [px, py] = toPage(pinProj);
      ARC_YARDS.forEach((yd) => {
        el('circle', { class: 'yb-arc', cx: px, cy: py, r: yd * ydToPage }, gArcs);
      });
    }

    // Edge yardage scale (left = from tee, right = to pin).
    {
      const totalYd = G.geo.distanceYd(hole.tee, pinLatLon);
      const teePageY = toPage(teeProj)[1];
      const pinPageY = toPage(pinProj)[1];
      const startYd = 0;
      const endYd = Math.ceil(totalYd / TICK_EVERY_YD) * TICK_EVERY_YD;
      const xLeft = MARGIN_L - 4;
      const xRight = PAGE_W - MARGIN_R + 4;
      for (let yd = startYd; yd <= endYd; yd += TICK_EVERY_YD) {
        // y on the line of play: along-meters from tee toward green.
        // teeProj.y is at the bottom of the line, pinProj.y at the top.
        // We linearly interpolate by yd / totalYd.
        if (totalYd <= 0) break;
        const t = yd / totalYd;
        const py = teePageY + (pinPageY - teePageY) * t;
        // Left tick (from tee)
        el('line', {
          class: yd % 100 === 0 ? 'yb-tick-major' : 'yb-tick',
          x1: xLeft, y1: py, x2: xLeft + 6, y2: py,
        }, gScale);
        if (yd > 0) {
          el('text', {
            class: 'yb-scale-from',
            x: xLeft - 2, y: py + 3, 'text-anchor': 'end',
          }, gScale).textContent = String(yd);
        }
        // Right tick (to pin)
        const ydToPin = totalYd - yd;
        el('line', {
          class: ydToPin % 100 === 0 ? 'yb-tick-major' : 'yb-tick',
          x1: xRight - 6, y1: py, x2: xRight, y2: py,
        }, gScale);
        if (ydToPin > 0 && ydToPin < totalYd) {
          el('text', {
            class: 'yb-scale-to',
            x: xRight + 2, y: py + 3, 'text-anchor': 'start',
          }, gScale).textContent = String(Math.round(ydToPin));
        }
      }
    }

    // Elevation marks along the centerline.
    elevMarksProj.forEach((e) => {
      if (e.deltaFt == null) return;
      const [x, y] = toPage(e.proj);
      const sign = e.deltaFt > 0 ? '+' : '';
      el('text', {
        class: 'yb-scale-from',
        x: x + 4, y: y + 3,
      }, gElev).textContent = sign + e.deltaFt;
    });

    // Hazard labels (dual: black yds-from-tee / orange yds-to-pin).
    hazardsProj.forEach((h) => {
      const fromTeeYd = G.geo.distanceYd(hole.tee, h.worldCentroid);
      const toPinYd   = G.geo.distanceYd(h.worldCentroid, pinLatLon);
      const [x, y] = toPage(h.centroidProj);
      // Pull the label outward from the centerline a bit so it doesn't sit on top.
      const lateralPush = (h.centroidProj[0] >= 0 ? 1 : -1) * 8;
      const lx = x + lateralPush;
      const anchor = lateralPush >= 0 ? 'start' : 'end';
      const dot = el('circle', { class: 'yb-label-dot', cx: x, cy: y, r: 1.4 }, gLabels);
      el('line', {
        stroke: '#1a1a1a', 'stroke-width': 0.5, opacity: 0.5,
        x1: x, y1: y, x2: lx, y2: y,
      }, gLabels);
      el('text', {
        class: 'yb-label-from', x: lx, y: y - 1, 'text-anchor': anchor,
      }, gLabels).textContent = String(Math.round(fromTeeYd));
      el('text', {
        class: 'yb-label-to', x: lx, y: y + 9, 'text-anchor': anchor,
      }, gLabels).textContent = String(Math.round(toPinYd));
    });

    // Pin marker + "P" reference.
    {
      const [px, py] = toPage(pinProj);
      el('circle', { class: 'yb-pin', cx: px, cy: py, r: 3.2 }, gPin);
      el('text', {
        class: 'yb-pin-ref', x: px + 5, y: py + 3,
      }, gPin).textContent = 'P';
    }

    // Player dot (created hidden until first position arrives).
    const playerDot = el('circle', {
      class: 'yb-player', cx: -100, cy: -100, r: 4.2,
      style: 'display:none',
    }, gPlayer);

    // Compass-rose inset (bottom-left). Page is rotated by -bearing relative to world,
    // so true north on the page sits at -bearing relative to page-up.
    {
      const cxC = MARGIN_L + 8, cyC = PAGE_H - MARGIN_B - 36;
      el('circle', { class: 'yb-compass', cx: cxC, cy: cyC, r: 14 }, gInsets);
      const rose = el('g', {
        transform: `translate(${cxC} ${cyC}) rotate(${-bearing})`,
      }, gInsets);
      // North arrow (orange) pointing up in world space.
      el('path', {
        class: 'yb-compass-n',
        d: 'M0,-12 L3,0 L0,-3 L-3,0 Z',
      }, rose);
      el('line', { x1: 0, y1: 0, x2: 0, y2: 10, stroke: '#1a1a1a', 'stroke-width': 0.8 }, rose);
      el('text', { class: 'yb-compass-txt', x: 0, y: -14, 'text-anchor': 'middle' }, rose).textContent = 'N';
    }

    // Tee-shot inset (above compass): list each tee box with its elevation delta from the standard tee.
    if (teesProj.length) {
      const standard = teesProj.find((t) => t.name === 'white') || teesProj[0];
      const baseFt = standard.elevationFt || 0;
      const x0 = MARGIN_L + 28, y0 = PAGE_H - MARGIN_B - 78;
      const w = 86, h = 60;
      el('rect', { class: 'yb-tee-inset', x: x0, y: y0, width: w, height: h, rx: 4 }, gInsets);
      el('text', {
        class: 'yb-tee-row yb-tee-row-name', x: x0 + 6, y: y0 + 12,
      }, gInsets).textContent = 'TEE SHOT';
      teesProj.forEach((t, i) => {
        const ty = y0 + 24 + i * 10;
        el('text', {
          class: 'yb-tee-row yb-tee-row-name', x: x0 + 6, y: ty,
        }, gInsets).textContent = t.name;
        const delta = (t.elevationFt || 0) - baseFt;
        const txt = (delta > 0 ? '+' : '') + delta;
        el('text', {
          class: 'yb-tee-row', x: x0 + w - 6, y: ty, 'text-anchor': 'end',
        }, gInsets).textContent = txt;
      });
    }

    // Hole-number badge (bottom-right).
    {
      const bx = PAGE_W - MARGIN_R - 6, by = PAGE_H - MARGIN_B - 4;
      el('text', {
        class: 'yb-badge-num', x: bx, y: by, 'text-anchor': 'end',
      }, gBadge).textContent = String(hole.num);
      el('text', {
        class: 'yb-badge-meta', x: bx, y: by - 60, 'text-anchor': 'end',
      }, gBadge).textContent = 'PAR ' + hole.par;
      el('text', {
        class: 'yb-badge-meta', x: bx, y: by - 48, 'text-anchor': 'end',
      }, gBadge).textContent = (hole.totalYards || Math.round(G.geo.distanceYd(hole.tee, hole.greenCenter))) + ' YD';
    }

    // -- Controller ---------------------------------------------------------
    return {
      svg,
      hole,
      pinLatLon,
      bearing,
      setPlayer(latlon) {
        if (!latlon) return;
        const p = project(latlon);
        const [x, y] = toPage(p);
        playerDot.setAttribute('cx', x);
        playerDot.setAttribute('cy', y);
        playerDot.style.display = '';
      },
      project,
      toPage,
      ydToPage,
    };
  }

  G.page = { renderHole };
})();
