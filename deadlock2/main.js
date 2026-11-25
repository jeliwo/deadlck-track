/* shared: sidebar, home search, item tooltip */
(function(){
  const page = location.pathname.split('/').pop() || 'index.html';
  const signed = localStorage.getItem('signedIn') === '1';
  const svg = p => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const ICONS = {
    "Characters":'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    "Items":'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
    "Ranks":'<path d="M6 20V10M12 20V4M18 20v-7"/>',
    "account":'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18c1.5-2.2 3.2-3 5.5-3s4 .8 5.5 3"/>'
  };
  document.getElementById('sidebar').innerHTML =
    '<a class="logo" href="index.html"><img class="mark" src="img/Deadlock_Logo.png" alt=""><span class="label">DEADLOCK<br>TRACKER</span></a><nav>' +
    NAV.map(([n,h]) => `<a href="${h}" class="${h===page?'active':''}">${svg(ICONS[n])}<span class="label">${n}</span></a>`).join('') +
    `</nav><a class="account" href="#" id="account">${svg(ICONS.account)}<span class="label">${signed?'My profile (log out)':'Log in / profile'}</span></a>`;
  document.getElementById('account').onclick = e => {
    e.preventDefault();
    localStorage.setItem('signedIn', signed ? '0' : '1'); location.reload();
  };
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
