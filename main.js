/* shared: login state, sidebar, home search, item tooltip */
const Auth = {
  get token() { return localStorage.getItem('dl_token'); },
  get user() { try { return JSON.parse(localStorage.getItem('dl_user')); } catch { return null; } },
  set(token, user) { localStorage.setItem('dl_token', token); localStorage.setItem('dl_user', JSON.stringify(user)); },
  setUser(user) { localStorage.setItem('dl_user', JSON.stringify(user)); },
  clear() { localStorage.removeItem('dl_token'); localStorage.removeItem('dl_user'); },
  /* fetch against the Express server, adds the login token, throws Error(message) on failure */
  async api(path, { method = 'GET', body } = {}) {
    const res = await fetch(API_BASE + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(Auth.token ? { Authorization: 'Bearer ' + Auth.token } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = res.status === 204 ? null : await res.json().catch(() => ({}));
    if (res.status === 401 && Auth.token) Auth.clear();            // token expired / user deleted
    if (!res.ok) throw Object.assign(new Error(data?.error || `Request failed (${res.status})`), { status: res.status, details: data?.details });
    return data;
  }
};

(function(){
  const page = location.pathname.split('/').pop() || 'index.html';
  const me = Auth.token ? Auth.user : null;
  const svg = p => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const ICONS = {
    "Characters":'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    "Items":'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
    "Builds":'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z"/>',
    "Ranks":'<path d="M6 20V10M12 20V4M18 20v-7"/>',
    "account":'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18c1.5-2.2 3.2-3 5.5-3s4 .8 5.5 3"/>'
  };
  document.getElementById('sidebar').innerHTML =
    '<a class="logo" href="index.html"><img class="mark" src="img/Deadlock_Logo.png" alt=""><span class="label">DEADLOCK<br>TRACKER</span></a><nav>' +
    NAV.map(([n,h]) => `<a href="${h}" class="${h===page?'active':''}">${svg(ICONS[n])}<span class="label">${n}</span></a>`).join('') +
    `</nav><a class="account" href="login.html" id="account">${svg(ICONS.account)}<span class="label">${me ? me.username : 'Log in / register'}</span></a>`;
  const form = document.getElementById('search-form');
  if (form) form.onsubmit = e => {
    e.preventDefault();
    const v = form.q.value.trim();
    if (v) location.href = 'player.html?name=' + encodeURIComponent(v);
  };
})();

/* tooltip: any element with data-item="<index into ITEMS>" */
const tip = document.createElement('div'); tip.id = 'tooltip'; document.body.appendChild(tip);
document.addEventListener('mouseover', e => {
  const el = e.target.closest('[data-item]'); if (!el) return;
  const i = +el.dataset.item, it = ITEMS[i];
  const own = document.body.classList.contains('comparing')
    ? `<div class="own">${YOU_BUILD.includes(i) ? 'Also in your build' : 'Not in your build'}</div>` : '';
  tip.innerHTML = `<div class="t-head"><b>${it.name}</b>${it.cost.toLocaleString()} souls</div>
    <div class="t-body">${it.stats.join('<br>')}<p>${it.desc}${it.cd?' ('+it.cd+' cooldown)':''}</p>${own}</div>`;
  tip.style.display = 'block';
});
document.addEventListener('mousemove', e => {
  tip.style.left = Math.min(e.clientX + 16, innerWidth - 300) + 'px';
  tip.style.top = Math.min(e.clientY + 16, innerHeight - tip.offsetHeight - 10) + 'px';
});
document.addEventListener('mouseout', e => { if (e.target.closest('[data-item]')) tip.style.display = 'none'; });
