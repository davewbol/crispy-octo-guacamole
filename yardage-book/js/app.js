// Phase 1 boot: render the hard-coded test hole, wire the live distance HUD
// to geolocation, and request a screen wake lock while the hole is open.
(function () {
  const G = (window.Golf = window.Golf || {});

  const settings = {
    units: 'yards',
    showPlaysLike: true,
    playsLikeYdsPerFt: G.elevation.DEFAULT_YDS_PER_FT,
    keepAwake: true,
  };

  function $(sel) { return document.querySelector(sel); }
  function bindText(name, value) {
    const els = document.querySelectorAll(`[data-bind="${name}"]`);
    els.forEach((e) => { e.textContent = value; });
  }

  let pageController = null;
  let currentHole = null;
  let currentPin = null;

  function openHole(course, holeIdx) {
    const hole = course.holes[holeIdx];
    if (!hole) return;
    currentHole = hole;
    currentPin = hole.greenCenter;

    bindText('hole-num', String(hole.num));
    bindText('hole-par', 'PAR ' + hole.par + ' · ' + (hole.totalYards || '') + ' YD');

    const frame = $('#page-frame');
    pageController = G.page.renderHole(frame, course, holeIdx, { pin: currentPin });

    document.getElementById('hole-screen').classList.add('is-active');
  }

  function updateHud(playerLatLon) {
    if (!currentHole || !playerLatLon) return;
    const fcb = G.geo.frontCenterBackYd(playerLatLon, currentHole.greenCenter, currentHole.green);
    const pinYd = G.geo.distanceYd(playerLatLon, currentPin);

    bindText('dist-pin',    Math.round(pinYd));
    bindText('dist-front',  Math.round(fcb.frontYd));
    bindText('dist-center', Math.round(fcb.centerYd));
    bindText('dist-back',   Math.round(fcb.backYd));

    // Plays-like adjustment using known fixture elevations.
    const samples = collectElevationSamples(currentHole);
    const playerElevFt = G.elevation.interpolateElevationFt(playerLatLon, samples);
    const targetElevFt = (currentHole.greenElevationFt != null) ? currentHole.greenElevationFt : null;
    const row = document.querySelector('[data-bind="dist-playslike-row"]');
    if (settings.showPlaysLike && playerElevFt != null && targetElevFt != null) {
      const deltaFt = targetElevFt - playerElevFt;
      const playsLike = G.elevation.playsLikeYd(pinYd, deltaFt, settings.playsLikeYdsPerFt);
      bindText('dist-playslike', Math.round(playsLike));
      bindText('dist-playslike-arrow', G.elevation.arrowFor(deltaFt));
      row.hidden = !G.elevation.isMeaningfulDelta(deltaFt);
    } else {
      row.hidden = true;
    }
  }

  function collectElevationSamples(hole) {
    const samples = [];
    (hole.tees || []).forEach((t) => {
      if (t.elevationFt != null) samples.push({ latlon: t.point, elevationFt: t.elevationFt });
    });
    if (hole.greenElevationFt != null && hole.greenCenter) {
      samples.push({ latlon: hole.greenCenter, elevationFt: hole.greenElevationFt });
    }
    return samples;
  }

  function wireNavButtons(course) {
    let idx = 0;
    document.getElementById('btn-prev-hole').addEventListener('click', () => {
      idx = (idx - 1 + course.holes.length) % course.holes.length;
      openHole(course, idx);
    });
    document.getElementById('btn-next-hole').addEventListener('click', () => {
      idx = (idx + 1) % course.holes.length;
      openHole(course, idx);
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch((e) => {
      console.warn('SW registration failed', e);
    });
  }

  function boot() {
    const course = G.fixtures.testCourse;
    wireNavButtons(course);
    openHole(course, 0);

    G.geolocation.subscribe((pos) => {
      const ll = [pos.lat, pos.lon];
      pageController && pageController.setPlayer(ll);
      updateHud(ll);
    });
    G.geolocation.start();

    if (settings.keepAwake) G.wakeLock.acquire();

    registerSW();

    // Convenience: jump the player to a few canonical positions from the console.
    G.debug = G.debug || {};
    G.debug.openHole = (n) => openHole(course, n);
    G.debug.testCourse = course;
    console.info('My Yardage Book — try Golf.debug.setPosition(lat, lon) or Golf.debug.walk(from, to, steps).');
    console.info('Sample positions:', G.fixtures.testPositions);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
