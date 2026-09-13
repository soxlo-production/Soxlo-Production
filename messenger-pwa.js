(() => {
  window.addEventListener('load', async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      sessionStorage.setItem('soxlo_ui_cache_reset_v13','1');
    } catch (err) {
      console.warn('SOXLO Messenger cache reset unavailable', err);
    }
  });
})();
