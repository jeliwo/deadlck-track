/* hero mini icons: img/heroes/<lowercase_name>.png, e.g. lady_geist.png. Missing file -> placeholder */
const heroSlug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const ico = n => `<img class="hero-ico" src="img/heroes/${heroSlug(n)}.png" alt="${n}" title="${n}" loading="lazy">`;
/* missing mini icon -> fall back to the hero's portrait card (cropped round), then to a "?" */
document.addEventListener('error', e => {
  const t = e.target;
  if (t.tagName === 'IMG' && t.dataset.fallback) { const f = t.dataset.fallback; delete t.dataset.fallback; t.src = f; return; }   // missing local item icon -> API image
  if (t.tagName === 'IMG' && (t.closest('.m-hero') || t.classList.contains('mm-hero'))) { t.replaceWith(Object.assign(document.createElement('span'), { className: 'ph', textContent: '?' })); return; }
  if (t.tagName !== 'IMG' || !t.classList.contains('hero-ico')) return;
  if (!t.dataset.fb) {
    t.dataset.fb = '1';
    t.classList.add('card-fb');
    t.src = `img/${t.alt.replace(/ /g, '_')}_card.png`;
  } else {
    t.replaceWith(Object.assign(document.createElement('span'), { className: 'ph round hero-ico', textContent: '?', title: t.alt }));
  }
}, true);
const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- page header / buttons (unchanged behaviour) ---------- */
const params = new URLSearchParams(location.search);
const name = params.get('name') || PLAYER.name;
document.title = name + ' · Deadlock Tracker';
$('pname').textContent = name;

const claim = $('claim'), cmp = $('compare-btn'), cmpNote = $('compare-note');

/* a small status line under the player name */
const statusEl = Object.assign(document.createElement('small'), { id: 'status' });
$('pname').after(statusEl);
const setStatus = (t, bad) => { statusEl.textContent = t; statusEl.style.color = bad ? 'var(--bad, #e5484d)' : ''; };

/* ---------- helpers ---------- */
const items = b => b.map(i => `<div class="item" data-item="${i}">${ITEMS[i].img ? `<img src="${ITEMS[i].img}" alt="${ITEMS[i].name}" loading="lazy">` : ''}</div>`).join('');
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const ago = unix => {
  const d = Math.floor((Date.now() / 1000 - unix) / 86400);
  if (d < 1) { const h = Math.floor((Date.now() / 1000 - unix) / 3600); return h < 1 ? 'just now' : `${h}h ago`; }
  return d === 1 ? '1 day ago' : `${d} days ago`;
};
const ratio = (k, d, a) => ((k + a) / Math.max(1, d)).toFixed(2);

/* game_mode / match_mode numbers are the enum positions listed in the API spec:
   game_mode 1 = Normal, 4 = Street Brawl.  match_mode 1 = Unranked, 4 = Ranked. */
const modeName = m => m.game_mode === 4 ? 'Street Brawl' : m.match_mode === 4 ? 'Ranked' : 'Normal';

/* ---------- renderers (work for both demo data and real data) ---------- */
/* match = { id, win, mode, ago, dur, kda, hero, badge, build? }. Real matches get their 12 item slots filled
   afterwards by hydrateRows() (one /api/matches/:id call each, cached on the server). */
const cardSrc = n => encodeURI(`img/${String(n).replace(/ /g, '_')}_card.png`);
const tierOfBadge = b => Math.floor((Number(b) || 0) / 10);
const badgeImg = t => `img/Rank_${RANK_NAMES[t]}_Badge.png`;
function itemSlots(ids, assets) {
  const cells = [];
  for (let i = 0; i < 12; i++) cells.push(ids[i] != null ? itemIcon(ids[i], assets) : '<span class="it empty"></span>');
  return cells.join('');
}
/* demo rows only: placeholder items from data.js */
const demoSlots = b => Array.from({ length: 12 }, (_, i) => b[i] != null && ITEMS[b[i]]?.img
  ? `<span class="it" title="${esc(ITEMS[b[i]].name)}"><img src="${ITEMS[b[i]].img}" alt=""></span>` : '<span class="it empty"></span>').join('');
const matchHTML = m => `<div class="mrow ${m.win ? 'win' : 'loss'}" ${m.id ? `data-match="${m.id}" tabindex="0" role="button" aria-label="Open match details"` : ''}>
  <div class="m-info"><div class="m-time">${m.ago} // ${m.dur}</div><div class="m-mode">${m.mode}</div><div class="m-kda">${m.kda}</div></div>
  <div class="m-hero"><img src="${cardSrc(m.hero)}" alt="${esc(m.hero)}" loading="lazy"></div>
  <div class="m-badge">${tierOfBadge(m.badge) ? `<img src="${badgeImg(tierOfBadge(m.badge))}" alt="" loading="lazy">` : ''}</div>
  <div class="m-items">${m.build ? demoSlots(m.build) : itemSlots([], null)}</div>
</div>`;
const heroRow = h => `<div class="hero-row">${ico(h[0])}
  <div>${esc(h[0])}<br><small>${h[2]}</small></div><div>${h[1]} KDA</div><div class="${parseInt(h[3]) >= 50 ? 'good' : 'bad'}">${h[3]}<br><small>${h[4]} played</small></div></div>`;

let CURRENT = null;
let PROFILE_ID = null;           // account id of the profile being viewed
let CURRENT_HEROES = {};         // hero id -> name   // { overview, heroes, matches }
function render(data) {
  CURRENT = data;
  const { overview, heroes, matches, summary } = data;
  if (summary) { $('sum-wr').textContent = summary.wr; $('sum-kda').textContent = 'KDA ' + summary.kda; }
  $('overview-card').innerHTML = '<h3>Overview</h3>' +
    overview.map(o => `<div class="rank-row"><span>${o[0]}</span><span>${o[1]} <small>${o[2]}</small></span></div>`).join('') +
    '<div class="mode-tabs"><button class="active">All time</button></div>' + (heroes.slice(0, 7).map(heroRow).join('') || '<small>No hero data</small>');
  $('top-heroes').innerHTML = heroes.slice().sort((a, b) => b[4] - a[4]).slice(0, 3).map(h => ico(h[0])).join('');
  $('hero-filter').innerHTML = '<option value="">All heroes</option>' + [...new Set(matches.map(m => m.hero))].sort().map(h => `<option>${esc(h)}</option>`).join('');
  drawMatches();
  $('heroes-all').innerHTML = '<div class="panel"><table><tr><th>Hero</th><th>KDA</th><th>K / D / A</th><th>Win rate</th><th>Games</th></tr>' +
    heroes.map(h => `<tr><td><span class="hero-cell">${ico(h[0])}${esc(h[0])}</span></td><td>${h[1]}</td><td>${h[2]}</td><td>${h[3]}</td><td>${h[4]}</td></tr>`).join('') + '</table></div>';
}
let shownAll = 25;
function drawMatches() {
  const f = $('hero-filter').value;
  const md = $('mode-filter').value;
  const list = CURRENT.matches.filter(m => (!f || m.hero === f) && (!md || md === 'All modes' || m.mode === md));
  $('matches-overview').innerHTML = list.slice(0, 10).map(matchHTML).join('') || '<small>No matches</small>';
  $('matches-all').innerHTML = list.slice(0, shownAll).map(matchHTML).join('') || '<small>No matches</small>';
  if (list.length > shownAll) {
    $('matches-all').insertAdjacentHTML('beforeend', `<button class="btn more" id="more-matches">Show more (${list.length - shownAll} left)</button>`);
    $('more-matches').onclick = () => { shownAll += 25; drawMatches(); };
  }
  hydrateRows(document.querySelectorAll('.mrow[data-match]'));
}
$('hero-filter').onchange = drawMatches;
$('mode-filter').onchange = drawMatches;

document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
  document.querySelectorAll('[data-view]').forEach(v => v.hidden = v.dataset.view !== t.dataset.tab);
});

/* ---------- claim a profile + compare ----------
   Claiming saves a player's account id on YOUR user (PUT /api/auth/me). Compare then shows that claimed
   profile next to whoever you are viewing (GET /api/compare). Any account id can be claimed. */
async function setupClaim(viewedId) {
  claim.onclick = cmp.onclick = null;
  document.body.classList.remove('comparing');
  cmp.textContent = 'Compare with my profile';
  const lockCmp = msg => { cmp.disabled = true; cmpNote.textContent = msg; };

  if (!viewedId) { claim.textContent = 'Claim profile?'; claim.disabled = true; return lockCmp('Search for a real player to claim or compare.'); }

  if (!Auth.token) {
    claim.textContent = 'Log in to claim'; claim.disabled = false;
    claim.onclick = () => { location.href = 'login.html?next=' + encodeURIComponent('player.html' + location.search); };
    return lockCmp('Log in and claim a profile to compare.');
  }
  try { Auth.setUser((await Auth.api('/api/auth/me')).user); }                 // fresh copy of your account
  catch (ex) { if (ex.status === 401) return setupClaim(viewedId); }           // token expired: now logged out
  const claimed = Auth.user?.accountId ? String(Auth.user.accountId) : null;

  if (claimed === String(viewedId)) {
    claim.textContent = 'Your claimed profile'; claim.disabled = true;
    return lockCmp('This is your claimed profile. Open another player to compare.');
  }
  claim.disabled = false;
  claim.textContent = claimed ? 'Claim this instead' : 'Claim as my profile';
  claim.onclick = async () => {
    claim.disabled = true;
    try { Auth.setUser((await Auth.api('/api/auth/me', { method: 'PUT', body: { accountId: viewedId } })).user); location.reload(); }
    catch (ex) { claim.disabled = false; cmpNote.textContent = ex.message; }
  };

  if (!claimed) return lockCmp('Claim a profile first, then you can compare others to it.');
  cmp.disabled = false; cmpNote.textContent = '';
  let loaded = false;
  cmp.onclick = async () => {
    const on = document.body.classList.toggle('comparing');
    cmp.textContent = on ? 'Stop comparing' : 'Compare with my profile';
    if (on && !loaded) { loaded = await loadCompare(claimed, viewedId); }
  };
}

async function loadCompare(meId, themId) {
  const panel = $('cmp-panel');
  panel.innerHTML = '<div class="cmp-note">Loading comparison…</div>';
  try {
    const [c, mine] = await Promise.all([
      get(`/api/compare?me=${meId}&them=${themId}`),
      get(`/api/players/${meId}/steam`).catch(() => null)
    ]);
    const youName = [].concat(mine || [])[0]?.personaname || `Account ${meId}`;
    const themName = $('pname').textContent;
    const rows = [   // [label, you, them, "higher" | "lower" | null  = which side is better]
      ['Win rate', c.me.winRate, c.them.winRate, 'higher', v => v + '%'],
      ['KDA', c.me.kda, c.them.kda, 'higher'],
      ['Kills / match', c.me.killsPerMatch, c.them.killsPerMatch, 'higher'],
      ['Deaths / match', c.me.deathsPerMatch, c.them.deathsPerMatch, 'lower'],
      ['Assists / match', c.me.assistsPerMatch, c.them.assistsPerMatch, 'higher'],
      ['Matches', c.me.stats.matches, c.them.stats.matches, null, v => v.toLocaleString()],
      ['Hours played', c.me.stats.hoursPlayed, c.them.stats.hoursPlayed, null, v => v.toLocaleString()]
    ];
    const cell = (v, other, rule, fmt) => `<span class="${rule && (rule === 'higher' ? v > other : v < other) ? 'lead' : ''}">${(fmt || String)(v)}</span>`;
    panel.innerHTML = `<div class="cmp-row"><span></span><span>${esc(youName)} (you)</span><span>${esc(themName)}</span></div>` +
      rows.map(([l, a, b, rule, fmt]) => `<div class="cmp-row"><span>${l}</span>${cell(a, b, rule, fmt)}${cell(b, a, rule, fmt)}</div>`).join('') +
      '<div class="cmp-note">Normal-mode stats, all time. Green = better.</div>';
    return true;
  } catch (ex) {
    panel.innerHTML = `<div class="cmp-note">Could not compare: ${esc(ex.message)}</div>`;
    return false;
  }
}

/* ---------- items + match data (from the Express server) ---------- */
const slug = n => String(n).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const SLOT_CLASS = t => /weapon/.test(t) ? 'weapon' : /armor|vital/.test(t) ? 'vitality' : /tech|spirit/.test(t) ? 'spirit' : '';
let itemAssets = null;
function loadItemAssets() {
  return itemAssets || (itemAssets = get('/api/assets/items').then(list => new Map(list.map(i => [i.id, i]))).catch(() => new Map()));
}
/* icon: your local artwork first, the API's image if you don't have that item, else a text tile */
function itemIcon(id, assets) {
  const it = assets?.get(id);
  if (!it) return `<span class="it unknown" title="Item ${id}">?</span>`;
  const local = ITEM_IMG[slug(it.name)];
  const src = local || it.img;
  return `<span class="it ${SLOT_CLASS(it.slot)} t${it.tier}" title="${esc(it.name)}">${src
    ? `<img src="${esc(src)}" alt="${esc(it.name)}" loading="lazy" ${local && it.img ? `data-fallback="${esc(it.img)}"` : ''}>`
    : esc(it.name.slice(0, 2))}</span>`;
}

const matchCache = new Map();
const getMatch = id => { if (!matchCache.has(id)) matchCache.set(id, get(`/api/matches/${id}`).catch(e => { matchCache.delete(id); throw e; })); return matchCache.get(id); };

/* fill the 12 item slots of the visible rows, 4 requests at a time */
let queue = [], running = 0;
function hydrateRows(rows) {
  [...rows].forEach(r => { if (!r.dataset.built) { r.dataset.built = '1'; queue.push(r); } });
  pump();
}
async function pump() {
  while (running < 4 && queue.length) {
    const row = queue.shift(); running++;
    (async () => {
      try {
        const [m, assets] = await Promise.all([getMatch(Number(row.dataset.match)), loadItemAssets()]);
        const me = m.players.find(p => String(p.accountId) === String(PROFILE_ID));
        if (me && row.isConnected) row.querySelector('.m-items').innerHTML = itemSlots(me.items, assets);
      } catch { row.classList.add('no-build'); row.title = 'Build unavailable for this match'; }
      finally { running--; pump(); }
    })();
  }
}

/* ---------- match detail modal ---------- */
const kfmt = n => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(Math.round(n));
const pct = v => v == null ? '--' : v.toFixed(1) + '%';
const accClass = v => v == null ? '' : v >= 50 ? 'a-hi' : v >= 40 ? 'a-mid' : 'a-lo';
const hsClass = v => v == null ? '' : v >= 20 ? 'h-hi' : v >= 10 ? 'h-mid' : 'h-lo';
const TEAM_COLOR = ['#e8a33d', '#4aa3ff'];

const modal = document.createElement('div');
modal.id = 'match-modal'; modal.hidden = true;
document.body.appendChild(modal);
function closeMatch() {
  modal.hidden = true; document.body.classList.remove('modal-open');
  const u = new URL(location.href); u.searchParams.delete('match'); history.replaceState(null, '', u);
}
modal.addEventListener('click', e => { if (e.target === modal) closeMatch(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeMatch(); });

let openMatchId = null;
async function openMatch(id) {
  openMatchId = id;
  modal.hidden = false; document.body.classList.add('modal-open');
  modal.innerHTML = '<div class="mm"><div class="mm-msg">Loading match…</div></div>';
  const u = new URL(location.href); u.searchParams.set('match', id); history.replaceState(null, '', u);
  try {
    const m = await getMatch(id);
    const [assets, people] = await Promise.all([
      loadItemAssets(),
      get(`/api/players/lookup?ids=${m.players.map(p => p.accountId).join(',')}`).catch(() => [])
    ]);
    modal.innerHTML = matchModalHTML(m, assets, new Map(people.map(x => [x.accountId, x])), id);
    modal.querySelector('.mm-close').onclick = closeMatch;
    modal.querySelector('.mm-copy').onclick = e => {
      navigator.clipboard?.writeText(shareLink(id)); e.currentTarget.lastChild.textContent = ' Copied!';
    };
    modal.querySelector('.mm-open').onclick = () => window.open(shareLink(id), '_blank');
  } catch (err) {
    modal.innerHTML = `<div class="mm"><div class="mm-msg">Could not load this match (${esc(err.message)}).<br><small>Valve limits how many new matches can be downloaded, so try again in a bit.</small><br><button class="btn mm-close">Close</button></div></div>`;
    modal.querySelector('.mm-close').onclick = closeMatch;
  }
}
const shareLink = id => `${location.origin}${location.pathname}?id=${PROFILE_ID || ''}&match=${id}`;

function matchModalHTML(m, assets, people, id) {
  const modeLabel = m.gameMode === 4 ? 'Street Brawl' : m.matchMode === 4 ? 'Ranked' : 'Normal';
  const w = m.winningTeam;
  const when = m.startTime ? new Date(m.startTime * 1000).toLocaleString('en-US', { year: '2-digit', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(',', ' //') : '';
  const myTeam = (m.players.find(p => String(p.accountId) === String(PROFILE_ID)) || { team: 0 }).team;
  const teams = [myTeam, 1 - myTeam];                       // the profile's own team is listed first
  const head = '<div class="mm-cols"><span></span><span>Rank</span><span>K</span><span>D</span><span>A</span><span>Souls</span><span>Souls/Min</span><span>Damage</span><span>Obj. Dmg</span><span>Healing</span><span>Items</span><span>KP%</span><span>Accuracy</span><span>HS%</span></div>';
  const row = p => {
    const who = people.get(p.accountId) || {};
    const hero = (CURRENT_HEROES[p.heroId] || `Hero ${p.heroId}`);
    const tier = tierOfBadge(who.badge);
    return `<div class="mm-row ${String(p.accountId) === String(PROFILE_ID) ? 'me' : ''}">
      <span class="mm-player"><img class="mm-hero" src="${cardSrc(hero)}" alt="${esc(hero)}"><b title="${esc(who.name || 'Account ' + p.accountId)}">${esc(who.name || 'Account ' + p.accountId)}</b>${p.items.length ? `<button class="mm-save" type="button" data-acct="${p.accountId}" title="Save this build to your builds">Save build</button>` : ''}</span>
      <span>${tier ? `<img class="mm-rank" src="${badgeImg(tier)}" alt="${RANK_NAMES[tier]}" title="${RANK_NAMES[tier]} ${who.subrank || ''}">` : ''}</span>
      <span>${p.kills}</span><span>${p.deaths}</span><span>${p.assists}</span>
      <span>${kfmt(p.souls)}</span><span>${kfmt(p.soulsPerMin)}</span><span>${kfmt(p.damage)}</span><span>${kfmt(p.objDamage)}</span><span>${kfmt(p.healing)}</span>
      <span class="mm-items">${p.items.map(i => itemIcon(i, assets)).join('')}</span>
      <span>${pct(p.killParticipation)}</span><span class="${accClass(p.accuracy)}">${pct(p.accuracy)}</span><span class="${hsClass(p.headshotPct)}">${pct(p.headshotPct)}</span>
    </div>`;
  };
  return `<div class="mm">
    <div class="mm-top">
      <div><small>${modeLabel}</small>
        <h2 style="color:${w == null ? 'var(--text)' : TEAM_COLOR[w]}">${w == null ? 'Match details' : `${m.teamNames[w]} Victory`}</h2></div>
      <div class="mm-meta"><small>${when}</small><b>${mmss(m.durationS).replace(/^(\d+):(\d+)$/, '$1m $2s')}</b></div>
      <div class="mm-actions">
        <button class="mm-open" type="button">Open in New Tab</button>
        <button class="mm-copy" type="button">Copy Share Link<span></span></button>
        <button class="mm-close" type="button" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="mm-scroll">${teams.map(t => `
      <div class="mm-team"><div class="mm-teamname" style="color:${TEAM_COLOR[t]}">${m.teamNames[t]}</div>${head}
      ${m.players.filter(p => p.team === t).sort((a, b) => b.souls - a.souls).map(row).join('')}</div>`).join('')}
    </div>
  </div>`;
}

/* ---------- save a player's build from the scoreboard ---------- */
function toast(html) {
  const t = Object.assign(document.createElement('div'), { className: 'toast', innerHTML: html });
  document.body.appendChild(t); setTimeout(() => t.remove(), 4500);
}
modal.addEventListener('click', async e => {
  const btn = e.target.closest('.mm-save'); if (!btn) return;
  if (!Auth.token) { location.href = 'login.html?next=' + encodeURIComponent('player.html' + location.search); return; }
  const m = await getMatch(openMatchId), p = m.players.find(x => String(x.accountId) === btn.dataset.acct);
  const hero = CURRENT_HEROES[p.heroId] || `Hero ${p.heroId}`;
  const name = (prompt('Name this build:', `${hero} build`) || '').trim().slice(0, 50);
  if (!name) return;
  const assets = await loadItemAssets();
  btn.disabled = true;
  try {
    await Auth.api('/api/builds', { method: 'POST', body: { name, heroId: p.heroId, isPublic: false,
      items: p.items.map(id => ({ itemId: id, slot: SLOT_CLASS(assets.get(id)?.slot || '') || 'other' })) } });
    btn.textContent = 'Saved ✓'; toast('Saved to your builds. <a href="builds.html">Open builds</a>');
  } catch (ex) { btn.disabled = false; toast(esc(ex.message)); }
});

/* click (or Enter) on a match row opens its detail */
document.addEventListener('click', e => { const r = e.target.closest('.mrow[data-match]'); if (r) openMatch(Number(r.dataset.match)); });
document.addEventListener('keydown', e => { if (e.key === 'Enter') { const r = e.target.closest?.('.mrow[data-match]'); if (r) openMatch(Number(r.dataset.match)); } });

/* ---------- demo data (shown only when the page is opened with no ?name= / ?id=) ---------- */
const MATCH_HEROES = ['Violet', 'Violet', 'Lash', 'Celeste'];
function demoData() {
  return {
    overview: OVERVIEW,
    summary: { wr: '54%', kda: '5.3' },
    heroes: HEROES,
    matches: MATCHES.map((m, i) => ({ ...m, hero: MATCH_HEROES[i % MATCH_HEROES.length], names: NAMES }))
  };
}

/* ---------- real data from the Express server ---------- */
const toAccountId = v => !/^\d+$/.test(v) ? null : (v.length >= 16 ? String(BigInt(v) - 76561197960265728n) : v);
const get = async path => { const r = await fetch(API_BASE + path); if (!r.ok) throw Object.assign(new Error(r.status), { status: r.status }); return r.json(); };

async function resolveAccountId() {
  const id = params.get('id') || toAccountId(name);
  if (id) return id;
  if (!params.get('name')) return null;                               // no search at all: demo mode
  const results = await get(`/api/players/search?q=${encodeURIComponent(name)}`);   // look the player up by name
  if (!results.length) return undefined;                              // searched, nobody found
  const exact = results.find(r => (r.name || '').toLowerCase() === name.toLowerCase());
  return String((exact || results[0]).accountId);
}

async function loadPlayer() {
  let id;
  try { id = await resolveAccountId(); }
  catch { setStatus('Could not reach the server. Showing demo data.', true); setupClaim(null); return render(demoData()); }
  if (id === null) { setStatus('Demo data: search for a player to see real stats.'); setupClaim(null); return render(demoData()); }
  if (id === undefined) { setStatus(`No player found named "${name}".`, true); setupClaim(null); return render({ overview: [], heroes: [], matches: [], summary: { wr: '--', kda: '--' } }); }

  setStatus('Loading…');
  setupClaim(id);
  const [snap, heroStats, history, rank, steam, heroList] = await Promise.allSettled([
    get(`/api/players/${id}`), get(`/api/players/${id}/hero-stats`), get(`/api/players/${id}/match-history`),
    get(`/api/players/${id}/rank`), get(`/api/players/${id}/steam`), get('/api/assets/heroes')
  ]);
  const val = r => r.status === 'fulfilled' ? r.value : null;

  /* profile: name + avatar */
  const p = [].concat(val(steam) || [])[0];
  if (p?.personaname) { $('pname').textContent = p.personaname; document.title = p.personaname + ' · Deadlock Tracker'; }
  const avatar = p && (p.avatarfull || p.avatarmedium || p.avatar);
  const av = $('avatar');
  if (avatar && av) { av.className = 'avatar'; av.innerHTML = `<img src="${esc(avatar)}" alt="">`; }

  const heroName = {};
  (val(heroList) || []).forEach(h => heroName[h.id] = h.name);
  CURRENT_HEROES = heroName; PROFILE_ID = id;
  const hn = id => heroName[id] || `Hero ${id}`;

  /* matches */
  const matches = (val(history) || []).slice().sort((a, b) => b.start_time - a.start_time).map(m => {
    const mins = Math.max(1, m.match_duration_s / 60);
    return {
      id: m.match_id, badge: m.ranked_display_badge, win: m.player_match_outcome === 1, mode: modeName(m), ago: ago(m.start_time), dur: mmss(m.match_duration_s),
      kda: `${m.player_kills} / ${m.player_deaths} / ${m.player_assists}`, ratio: `${ratio(m.player_kills, m.player_deaths, m.player_assists)} KDA`,
      cs: `${m.last_hits} CS (${(m.last_hits / mins).toFixed(1)}/m)`, hero: hn(m.hero_id), _mode: modeName(m)
    };
  });

  /* overview rows: rank + W/L per mode (from the matches we received) */
  const overview = [];
  const r = val(rank);
  if (r) overview.push(['Rank', r.rank ? `${RANK_NAMES[r.rank] || 'Tier ' + r.rank} ${r.subrank || ''}`.trim() : 'Unranked', '']);
  const s = val(snap);
  if (s) overview.push(['All matches', `${s.stats.wins}W ${s.stats.matches - s.stats.wins}L`, `${s.winRate}%`], ['KDA', String(s.kda), `${s.stats.hoursPlayed}h played`]);
  for (const mode of ['Ranked', 'Normal', 'Street Brawl']) {
    const ms = matches.filter(m => m._mode === mode && m.win !== undefined);
    if (!ms.length) continue;
    const w = ms.filter(m => m.win).length;
    overview.push([mode + ' (recent)', `${w}W ${ms.length - w}L`, `${(w / ms.length * 100).toFixed(1)}%`]);
  }

  /* heroes table: [name, "kda:1", "K / D / A" per match, "win%", games] */
  const heroes = (val(heroStats) || []).filter(h => h.matches_played > 0).map(h => {
    const g = h.matches_played;
    return [hn(h.hero_id), `${ratio(h.kills, h.deaths, h.assists)}:1`,
      `${(h.kills / g).toFixed(1)} / ${(h.deaths / g).toFixed(1)} / ${(h.assists / g).toFixed(1)}`,
      `${Math.round(h.wins / g * 100)}%`, g];
  }).sort((a, b) => b[4] - a[4]);

  if (!s && !matches.length && !heroes.length) { setStatus('No Deadlock data found for this account.', true); return render({ overview, heroes, matches, summary: { wr: '--', kda: '--' } }); }
  setStatus(`Account ${id}` + (s ? ` · updated ${ago(new Date(s.fetchedAt).getTime() / 1000)}` : ''));
  if (params.get('match')) setTimeout(() => openMatch(Number(params.get('match'))), 0);
  render({ overview, heroes, matches, summary: s ? { wr: s.winRate + '%', kda: s.kda } : { wr: '--', kda: '--' } });
}
loadPlayer().catch(err => {
  console.error('loadPlayer failed:', err); setStatus('Something went wrong loading this player.', true); render(demoData()); });
