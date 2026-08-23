(() => {
  const style = document.createElement('style');
  style.textContent = `
    .soxlo-like-row{display:flex;align-items:center;gap:10px;margin-top:14px}
    .soxlo-like{display:inline-flex;align-items:center;gap:8px;border:1px solid #d9b45a;background:linear-gradient(110deg,#5c3d0d,#9b6b1f,#6f4a12);color:#fff0b3;padding:9px 13px;border-radius:999px;font:700 12px Inter,Arial,sans-serif;cursor:pointer;transition:transform .15s ease,filter .15s ease}
    .soxlo-like:hover{filter:brightness(1.15);transform:translateY(-1px)}
    .soxlo-like.liked{background:linear-gradient(110deg,#7b1d2b,#c1455a,#7b1d2b);border-color:#f38ca0;color:#fff}
    .soxlo-like:disabled{opacity:.55;cursor:default;transform:none}
    .soxlo-like-count{font:600 12px Inter,Arial,sans-serif;color:#d7bd7a}
  `;
  document.head.appendChild(style);

  const slugify = value => value.toLowerCase().trim().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const voterKey = 'soxlo-like-voter-id';
  let voterId = localStorage.getItem(voterKey);
  if (!voterId) {
    voterId = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(voterKey, voterId);
  }
  const likedKey = 'soxlo-liked-songs';
  const likedSongs = new Set(JSON.parse(localStorage.getItem(likedKey) || '[]'));
  const saveLiked = () => localStorage.setItem(likedKey, JSON.stringify([...likedSongs]));

  const cards = [...document.querySelectorAll('.video-card')];
  const controls = cards.map(card => {
    const title = card.querySelector('h3')?.textContent?.trim();
    const info = card.querySelector('.video-info');
    if (!title || !info) return null;
    const songId = slugify(title);
    const row = document.createElement('div');
    row.className = 'soxlo-like-row';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'soxlo-like';
    button.dataset.songId = songId;
    button.innerHTML = likedSongs.has(songId) ? '♥ Liked' : '♡ Like';
    if (likedSongs.has(songId)) button.classList.add('liked');
    const count = document.createElement('span');
    count.className = 'soxlo-like-count';
    count.textContent = '— likes';
    row.append(button, count);
    info.appendChild(row);
    return {songId, button, count};
  }).filter(Boolean);

  const setUnavailable = () => controls.forEach(({button,count}) => {
    button.disabled = true;
    button.title = 'Like counter is being connected';
    count.textContent = 'likes connecting';
  });

  fetch('supabase-config.json', {cache:'no-store'})
    .then(r => r.ok ? r.json() : Promise.reject(new Error('Missing config')))
    .then(config => {
      const url = String(config.url || '').replace(/\/$/, '');
      const anonKey = String(config.anonKey || '');
      if (!url || !anonKey) throw new Error('Supabase config is incomplete');
      const headers = {apikey: anonKey, Authorization: `Bearer ${anonKey}`};

      const loadCount = async control => {
        try {
          const response = await fetch(`${url}/rest/v1/song_likes?song_id=eq.${encodeURIComponent(control.songId)}&select=song_id`, {
            method:'HEAD',
            headers:{...headers, Prefer:'count=exact'}
          });
          if (!response.ok) throw new Error(`Count failed ${response.status}`);
          const range = response.headers.get('content-range') || '';
          const total = Number(range.split('/')[1]);
          control.count.textContent = `${Number.isFinite(total) ? total : 0} ${total === 1 ? 'like' : 'likes'}`;
        } catch (error) {
          control.count.textContent = 'likes unavailable';
        }
      };

      controls.forEach(control => {
        loadCount(control);
        control.button.addEventListener('click', async () => {
          if (likedSongs.has(control.songId)) return;
          control.button.disabled = true;
          const old = control.button.innerHTML;
          control.button.innerHTML = '♡ Liking…';
          try {
            const response = await fetch(`${url}/rest/v1/song_likes`, {
              method:'POST',
              headers:{...headers,'Content-Type':'application/json',Prefer:'return=minimal'},
              body:JSON.stringify({song_id:control.songId,voter_id:voterId})
            });
            if (!response.ok && response.status !== 409) throw new Error(`Like failed ${response.status}`);
            likedSongs.add(control.songId);
            saveLiked();
            control.button.classList.add('liked');
            control.button.innerHTML = '♥ Liked';
            await loadCount(control);
          } catch (error) {
            control.button.innerHTML = old;
            control.count.textContent = 'try again';
          } finally {
            control.button.disabled = likedSongs.has(control.songId);
          }
        });
        if (likedSongs.has(control.songId)) control.button.disabled = true;
      });
    })
    .catch(setUnavailable);
})();
