/* Builds page: create / edit / delete your builds, browse public ones. Talks to /api/builds through Auth.api */
const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = n => String(n).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cat = t => /weapon/.test(t) ? 'weapon' : /armor|vital/.test(t) ? 'vitality' : /tech|spirit/.test(t) ? 'spirit' : '';
const cardSrc = n => encodeURI(`img/${String(n).replace(/ /g, '_')}_card.png`);

let heroes = [], heroName = {}, items = new Map(), mode = 'mine', builds = [];
let editing = null;     // { id|null, items: [itemId...] }
let catFilter = '';

/* same icon rule as the player page: your local artwork, else the API image, else text */
function tile(id) {
  const it = items.get(id);
  if (!it) return `<span class="it unknown" title="Item ${id}">?</span>`;
  const local = ITEM_IMG[slug(it.name)], src = local || it.img;
  return `<span class="it ${cat(it.slot)}" title="${esc(it.name)}">${src ? `<img src="${esc(src)}" alt="${esc(it.name)}" loading="lazy" ${local && it.img ? `data-fallback="${esc(it.img)}"` : ''}>` : esc(it.name.slice(0, 2))}</span>`;
}
document.addEventListener('error', e => {
  const t = e.target;
  if (t.tagName !== 'IMG') return;
  if (t.dataset.fallback) { const f = t.dataset.fallback; delete t.dataset.fallback; t.src = f; }
  else if (t.classList.contains('b-hero')) t.replaceWith(Object.assign(document.createElement('span'), { className: 'ph', textContent: '?' }));
}, true);

/* ---------- list ---------- */
async function loadList() {
  $('list').innerHTML = '<p class="sub">Loading…</p>';
  try { builds = await Auth.api(mode === 'public' ? '/api/builds?public=1' : '/api/builds'); }
  catch (ex) { if (ex.status === 401) return start(); $('list').innerHTML = `<p class="form-error">${esc(ex.message)}</p>`; return; }
  drawList();
}
function drawList() {
  const h = $('hero-filter').value;
  const rows = builds.filter(b => !h || String(b.heroId) === h);
  if (!rows.length) { $('list').innerHTML = `<p class="sub">${mode === 'mine' ? 'No builds yet. Press “+ New build” to make your first one.' : 'No public builds yet.'}</p>`; return; }
  $('list').innerHTML = rows.map(b => {
    const hero = heroName[b.heroId] || `Hero ${b.heroId}`;
    const slots = Array.from({ length: 12 }, (_, i) => b.items[i] ? tile(b.items[i].itemId) : '<span class="it empty"></span>').join('');
    const mine = mode === 'mine' || b.mine;
    return `<article class="bcard" data-id="${b._id}">
      <div class="bc-hero"><img class="b-hero" src="${cardSrc(hero)}" alt="${esc(hero)}" loading="lazy"></div>
      <div class="bc-info"><h3>${esc(b.name)}</h3><small>${esc(hero)}${mode === 'public' ? ` · by ${esc(b.author)}` : ''}</small>
        <span class="badge ${b.isPublic ? 'pub' : ''}">${b.isPublic ? 'Public' : 'Private'}</span></div>
      <div class="bc-items">${slots}</div>
      <div class="bc-actions">${mine
        ? '<button class="btn ghost" data-act="edit" type="button">Edit</button><button class="btn ghost danger" data-act="delete" type="button">Delete</button>'
        : '<button class="btn ghost" data-act="copy" type="button">Copy to my builds</button>'}</div>
    </article>`;
  }).join('');
}
$('list').addEventListener('click', async e => {
  const btn = e.target.closest('[data-act]'); if (!btn) return;
  const b = builds.find(x => x._id === btn.closest('.bcard').dataset.id);
  if (btn.dataset.act === 'edit') openEditor(b);
  if (btn.dataset.act === 'delete' && confirm(`Delete “${b.name}”?`)) {
    try { await Auth.api('/api/builds/' + b._id, { method: 'DELETE' }); builds = builds.filter(x => x !== b); drawList(); }
    catch (ex) { alert(ex.message); }
  }
  if (btn.dataset.act === 'copy') {
    btn.disabled = true;
    try {
      await Auth.api('/api/builds', { method: 'POST', body: { name: b.name.slice(0, 50), heroId: b.heroId, items: b.items, isPublic: false } });
      btn.textContent = 'Copied ✓';
    } catch (ex) { btn.disabled = false; alert(ex.message); }
  }
});
document.querySelectorAll('[data-list]').forEach(t => t.onclick = () => {
  mode = t.dataset.list;
  document.querySelectorAll('[data-list]').forEach(x => x.classList.toggle('active', x === t));
  closeEditor(); loadList();
});
$('hero-filter').onchange = drawList;

/* ---------- editor ---------- */
function openEditor(b) {
  editing = { id: b?._id || null, items: b ? b.items.map(i => i.itemId) : [] };
  $('editor-title').textContent = b ? 'Edit build' : 'New build';
  $('b-name').value = b?.name || ''; $('b-hero').value = b ? String(b.heroId) : ''; $('b-public').checked = !!b?.isPublic;
  $('b-error').textContent = '';
  $('editor').hidden = false; drawSlots(); drawPicker();
  $('editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function closeEditor() { editing = null; $('editor').hidden = true; }
$('new-build').onclick = () => openEditor(null);
$('cancel').onclick = closeEditor;

function drawSlots() {
  $('count').textContent = `${editing.items.length} / 12`;
  $('slots').innerHTML = Array.from({ length: 12 }, (_, i) => editing.items[i] != null
    ? `<button class="slot" data-i="${i}" type="button" title="Remove">${tile(editing.items[i])}</button>` : '<span class="it empty"></span>').join('');
}
$('slots').onclick = e => { const s = e.target.closest('.slot'); if (!s) return; editing.items.splice(Number(s.dataset.i), 1); drawSlots(); drawPicker(); };

function drawPicker() {
  const q = $('item-search').value.trim().toLowerCase();
  const list = [...items.values()].filter(i => i.shop && (!catFilter || cat(i.slot) === catFilter) && (!q || i.name.toLowerCase().includes(q)))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  $('picker').innerHTML = list.map(i => `<button class="pick ${editing.items.includes(i.id) ? 'used' : ''}" data-id="${i.id}" type="button" title="${esc(i.name)} (tier ${i.tier})">${tile(i.id)}</button>`).join('') || '<small>No items match.</small>';
}
$('picker').onclick = e => {
  const p = e.target.closest('.pick'); if (!p || !editing) return;
  const id = Number(p.dataset.id);
  if (editing.items.includes(id)) return;
  if (editing.items.length >= 12) { $('b-error').textContent = 'A build holds at most 12 items. Remove one first.'; return; }
  $('b-error').textContent = ''; editing.items.push(id); drawSlots(); drawPicker();
};
$('cat-tabs').onclick = e => { const t = e.target.closest('[data-cat]'); if (!t) return; catFilter = t.dataset.cat; document.querySelectorAll('#cat-tabs .tab').forEach(x => x.classList.toggle('active', x === t)); drawPicker(); };
$('item-search').oninput = drawPicker;

$('save').onclick = async () => {
  const err = $('b-error'); err.textContent = '';
  const name = $('b-name').value.trim(), heroId = Number($('b-hero').value);
  if (!name) return err.textContent = 'Give the build a name.';
  if (!heroId) return err.textContent = 'Choose a hero.';
  if (!editing.items.length) return err.textContent = 'Add at least one item.';
  const body = { name, heroId, isPublic: $('b-public').checked, items: editing.items.map(id => ({ itemId: id, slot: cat(items.get(id)?.slot || '') || 'other' })) };
  $('save').disabled = true;
  try {
    await Auth.api(editing.id ? '/api/builds/' + editing.id : '/api/builds', { method: editing.id ? 'PUT' : 'POST', body });
    closeEditor(); mode = 'mine';
    document.querySelectorAll('[data-list]').forEach(x => x.classList.toggle('active', x.dataset.list === 'mine'));
    await loadList();
  } catch (ex) { err.textContent = ex.details ? Object.values(ex.details).join(' · ') : ex.message; }
  finally { $('save').disabled = false; }
};

/* ---------- start ---------- */
async function start() {
  if (!Auth.token) { $('need-login').hidden = false; $('builds-app').hidden = true; return; }
  $('need-login').hidden = true; $('builds-app').hidden = false;
  try {
    const [h, it] = await Promise.all([Auth.api('/api/assets/heroes'), Auth.api('/api/assets/items')]);
    heroes = h.slice().sort((a, b) => a.name.localeCompare(b.name));
    heroes.forEach(x => heroName[x.id] = x.name);
    items = new Map(it.map(i => [i.id, i]));
  } catch { $('list').innerHTML = '<p class="form-error">Could not reach the server.</p>'; return; }
  const opts = heroes.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
  $('hero-filter').innerHTML = '<option value="">All heroes</option>' + opts;
  $('b-hero').innerHTML = '<option value="">Choose a hero…</option>' + opts;
  loadList();
}
start();
