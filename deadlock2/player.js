/* hero mini icons: img/heroes/<lowercase_name>.png, e.g. lady_geist.png. Missing file -> placeholder */
const heroSlug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const ico = n => `<img class="hero-ico" src="img/heroes/${heroSlug(n)}.png" alt="${n}" title="${n}" loading="lazy">`;
/* missing mini icon -> fall back to the hero's portrait card (cropped round), then to a "?" */
document.addEventListener('error', e => {
  const t = e.target;
  if (t.tagName !== 'IMG' || !t.classList.contains('hero-ico')) return;
  if (!t.dataset.fb) {
    t.dataset.fb = '1';
    t.classList.add('card-fb');
    t.src = `img/${t.alt.replace(/ /g, '_')}_card.png`;
  } else {
    t.replaceWith(Object.assign(document.createElement('span'), { className: 'ph round hero-ico', textContent: '?', title: t.alt }));
  }
}, true);
const MATCH_HEROES = ['Violet', 'Violet', 'Lash', 'Celeste'];   // placeholder until matches come from the API

const params = new URLSearchParams(location.search);
const name = params.get('name') || PLAYER.name;
const signed = localStorage.getItem('signedIn') === '1';
document.title = name + ' · Deadlock Tracker';
document.getElementById('pname').textContent = name;

const claim = document.getElementById('claim');
claim.textContent = signed ? 'Profile claimed' : 'Claim profile?';
claim.disabled = signed;
claim.onclick = () => { localStorage.setItem('signedIn','1'); location.reload(); };

const cmp = document.getElementById('compare-btn');
cmp.disabled = !signed;
document.getElementById('compare-note').textContent = signed ? '' : 'Claim your profile or log in to compare.';
cmp.onclick = () => {
  const on = document.body.classList.toggle('comparing');
  cmp.textContent = on ? 'Stop comparing' : 'Compare with my profile';
};

const items = b => b.map(i => `<div class="item" data-item="${i}">${ITEMS[i].img ? `<img src="${ITEMS[i].img}" alt="${ITEMS[i].name}" loading="lazy">` : ''}</div>`).join('');
const matchHTML = (m, i) => `<div class="match ${m.win?'':'loss'}">
  <div><div class="res ${m.win?'win':'loss'}">${m.win?'Victory':'Defeat'}</div><small>${m.mode}</small><small>${m.ago} · ${m.dur}</small></div>
  ${ico(m.hero || MATCH_HEROES[i % MATCH_HEROES.length])}
  <div><div class="kda">${m.kda}</div><small>${m.ratio}</small><small>${m.cs}</small></div>
  <div class="items">${items(m.build)}</div>
  <div class="names">${NAMES.map(n=>`<span>${n}</span>`).join('')}</div>
  <div class="you-build"><span>Your build</span><div class="items">${items(YOU_BUILD)}</div></div>
</div>`;
const heroRow = h => `<div class="hero-row">${ico(h[0])}
  <div>${h[0]}<br><small>${h[2]}</small></div><div>${h[1]} KDA</div><div class="${parseInt(h[3])>=50?'good':'bad'}">${h[3]}<br><small>${h[4]} played</small></div></div>`;
const $ = id => document.getElementById(id);

$('overview-card').innerHTML = '<h3>Overview</h3>' +
  OVERVIEW.map(o => `<div class="rank-row"><span>${o[0]}</span><span>${o[1]} <small>${o[2]}</small></span></div>`).join('') +
  '<div class="mode-tabs"><button class="active">Normal</button><button>Ranked</button><button>Street Brawl</button></div>' + HEROES.map(heroRow).join('');
$('top-heroes').innerHTML = HEROES.slice().sort((a, b) => b[4] - a[4]).slice(0, 3).map(h => ico(h[0])).join('');
$('hero-filter').innerHTML = '<option>All heroes</option>' + HEROES.map(h => `<option>${h[0]}</option>`).join('');
$('matches-overview').innerHTML = MATCHES.map(matchHTML).join('');
$('matches-all').innerHTML = MATCHES.concat(MATCHES).map(matchHTML).join('');
$('heroes-all').innerHTML = '<div class="panel"><table><tr><th>Hero</th><th>KDA</th><th>K / D / A</th><th>Win rate</th><th>Games</th></tr>' +
  HEROES.map(h => `<tr><td><span class="hero-cell">${ico(h[0])}${h[0]}</span></td><td>${h[1]}</td><td>${h[2]}</td><td>${h[3]}</td><td>${h[4]}</td></tr>`).join('') + '</table></div>';
$('compare-bar').innerHTML = [['Win rate','wr'],['KDA','kda'],['CS / min','cs']].map(([l,k]) =>
  `<div>${l}<b>${YOU_STATS[k]} <span>you</span> vs ${THEM_STATS[k]} <span>them</span></b></div>`).join('');

document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
  document.querySelectorAll('[data-view]').forEach(v => v.hidden = v.dataset.view !== t.dataset.tab);
});

/* username + Steam avatar from the Deadlock API (through your Express server).
   Search accepts a Steam32 account id, a Steam64 id, or ?id=... in the URL. */
const toAccountId = v => !/^\d+$/.test(v) ? null : (v.length >= 16 ? String(BigInt(v) - 76561197960265728n) : v);
const accountId = params.get('id') || toAccountId(name);
(async function loadProfile() {
  if (!accountId) return;                       // a plain name can't be looked up yet: keep the placeholders
  try {
    const res = await fetch(`${API_BASE}/api/players/${accountId}/steam`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const p = Array.isArray(data) ? data[0] : data;
    if (!p) return;
    if (p.personaname) { $('pname').textContent = p.personaname; document.title = p.personaname + ' · Deadlock Tracker'; }
    const url = p.avatarfull || p.avatarmedium || p.avatar;
    if (url) { const av = $('avatar'); av.className = 'avatar'; av.innerHTML = `<img src="${url}" alt="">`; }
  } catch (err) { /* API offline: placeholders stay */ }
})();
