const router = require('express').Router();
const { getSnapshot, rates, DEADLOCK } = require('../services/snapshots');
const { wrap, toAccountId } = require('../middleware/helpers');

// GET /api/players/search?q=name   -> [{ accountId, name, avatar, country, matchesLast30d }]
// (must stay above /:accountId). A numeric q is looked up as an account id by the upstream API too.
router.get('/search', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2 || q.length > 50) return res.status(400).json({ error: 'q must be 2-50 characters' });
  const r = await fetch(`${DEADLOCK()}/v1/players/steam-search?search_query=${encodeURIComponent(q)}&limit=10`);
  if (!r.ok) return res.status(502).json({ error: `Deadlock API error (${r.status})` });
  const rows = await r.json();
  res.json(rows.map(p => ({ accountId: p.account_id, name: p.personaname, avatar: p.avatarmedium || p.avatar, country: p.countrycode, matchesLast30d: p.matches_played_last_30d })));
}));

// GET /api/players/lookup?ids=1,2,3   (max 12) -> [{ accountId, name, avatar, badge, rank, subrank }]
router.get('/lookup', wrap(async (req, res) => {
  const ids = String(req.query.ids || '').split(',').map(toAccountId).filter(Boolean);
  const unique = [...new Set(ids)].slice(0, 12);
  if (!unique.length) return res.status(400).json({ error: 'ids must be a comma-separated list of account ids' });
  const q = unique.join(',');
  const [steam, rank] = await Promise.all([
    fetch(`${DEADLOCK()}/v1/players/steam?account_ids=${q}`).then(r => (r.ok ? r.json() : [])).catch(() => []),
    fetch(`${DEADLOCK()}/v1/players/rank?account_ids=${q}`).then(r => (r.ok ? r.json() : [])).catch(() => [])
  ]);
  const byId = (arr, k = 'account_id') => new Map((Array.isArray(arr) ? arr : []).map(x => [Number(x[k]), x]));
  const S = byId(steam), R = byId(rank);
  res.json(unique.map(id => ({
    accountId: id, name: S.get(id)?.personaname || null, avatar: S.get(id)?.avatarmedium || S.get(id)?.avatar || null,
    badge: R.get(id)?.badge ?? 0, rank: R.get(id)?.rank ?? 0, subrank: R.get(id)?.subrank ?? 0
  })));
}));

// GET /api/players/:accountId   -> cached snapshot, or fresh from the Deadlock API when stale (>1h)
//   ?refresh=1 forces a re-fetch. Accepts a Steam32 id or a Steam64 id.
router.get('/:accountId', wrap(async (req, res) => {
  const accountId = toAccountId(req.params.accountId);
  if (!accountId) return res.status(400).json({ error: 'Invalid account id' });
  const { snapshot, source } = await getSnapshot(accountId, { force: req.query.refresh === '1' });
  res.set('X-Source', source).json({ ...snapshot.toJSON(), ...rates(snapshot.stats), source });
}));

module.exports = router;
