(() => {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./messenger-sw.js', { scope: './' });
      await reg.update();
    } catch (err) {
      console.warn('SOXLO Messenger service worker unavailable', err);
    }
  });
})();
