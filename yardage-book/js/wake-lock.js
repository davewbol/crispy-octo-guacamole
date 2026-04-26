// Best-effort screen Wake Lock with auto-reacquire on visibility change.
(function () {
  const G = (window.Golf = window.Golf || {});

  let sentinel = null;
  let wanted = false;

  async function acquire() {
    wanted = true;
    if (!('wakeLock' in navigator)) return false;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => { sentinel = null; });
      return true;
    } catch (e) {
      console.warn('Wake Lock failed', e);
      return false;
    }
  }

  async function release() {
    wanted = false;
    if (sentinel) {
      try { await sentinel.release(); } catch {}
      sentinel = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible' && !sentinel) {
      acquire();
    }
  });

  G.wakeLock = { acquire, release };
})();
