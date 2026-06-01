/**
 * Warm offline caches for iOS PWA / Safari: app shell assets only.
 * Runs after the Flutter service worker is active (safe to call multiple times).
 */
(function () {
  if (!('serviceWorker' in navigator)) return;

  function postToSw(reg) {
    var sw = reg.active || reg.waiting || reg.installing;
    if (!sw) return;
    try {
      sw.postMessage('downloadOffline');
    } catch (e) {
      console.warn('pwa-offline-bootstrap:', e);
    }
  }

  function bootstrap() {
    navigator.serviceWorker.ready.then(postToSw).catch(function () {});
  }

  if (document.readyState === 'complete') {
    bootstrap();
  } else {
    window.addEventListener('load', bootstrap);
  }

  // Re-warm when returning online (e.g. after driving through dead zones).
  window.addEventListener('online', function () {
    setTimeout(bootstrap, 500);
  });
})();
