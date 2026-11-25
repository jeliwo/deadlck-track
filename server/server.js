require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Cache = require('./models/Cache');
const { errorHandler } = require('./middleware/helpers');
require('./models/MatchSnapshot');

const app = express();
app.set('trust proxy', 1);   // behind Render/Railway's proxy: req.ip is the real visitor, not the proxy
const DEADLOCK_API = process.env.DEADLOCK_API || 'https://api.deadlock-api.com';

// CORS_ORIGIN in .env = comma-separated frontend URLs (Live Server, Vercel). Empty = allow all (local dev only).
const origins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors(origins.length ? { origin: origins } : {}));
app.use(express.json({ limit: '50kb' }));

/* ---------- raw API proxy with Mongo cache (used by player.js today) ---------- */
// Cache-through: Mongo first, deadlock-api.com only on a miss.
async function cached(path) {
  const hit = await Cache.findOne({ key: path });
  if (hit) return { data: hit.data, cached: true };

  const res = await fetch(DEADLOCK_API + path);
  if (!res.ok) throw Object.assign(new Error('Deadlock API error'), { status: res.status });
  const data = await res.json();

  await Cache.findOneAndUpdate({ key: path }, { data, createdAt: new Date() }, { upsert: true });
  return { data, cached: false };
}

const proxy = build => async (req, res) => {
  try {
    const { data, cached: wasCached } = await cached(build(req));
    res.set('X-Cache', wasCached ? 'HIT' : 'MISS').json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// only allow numeric account ids so nobody can inject other API paths
app.param('id', (req, res, next, id) => /^\d{1,20}$/.test(id) ? next() : res.status(400).json({ error: 'Invalid account id' }));

// accountId = Steam32 id (the short number, not the 7656... Steam64 id)
app.get('/api/players/:id/steam',         proxy(r => `/v1/players/steam?account_ids=${r.params.id}`));
app.get('/api/players/:id/match-history', proxy(r => `/v1/players/${r.params.id}/match-history`));
app.get('/api/players/:id/rank',          proxy(r => `/v1/players/${r.params.id}/rank`));
app.get('/api/players/:id/hero-stats',    proxy(r => `/v1/players/hero-stats?account_ids=${r.params.id}`));
// rank distribution (upstream limit is 5 requests/minute, the Mongo cache keeps us far under it)
app.get('/api/ranks/distribution',        proxy(() => '/v1/players/rank/distribution'));

/* ---------- hero id -> name (for the frontend). Trimmed, kept in memory for 6h ---------- */
let heroCache = { at: 0, data: null };
app.get('/api/assets/heroes', async (_req, res) => {
  try {
    if (!heroCache.data || Date.now() - heroCache.at > 6 * 3600 * 1000) {
      const r = await fetch(`${DEADLOCK_API}/v1/assets/heroes?only_active=false`);
      if (!r.ok) throw Object.assign(new Error('Deadlock API error'), { status: 502 });
      heroCache = { at: Date.now(), data: (await r.json()).map(h => ({ id: h.id, name: h.name })) };
    }
    res.json(heroCache.data);
  } catch (err) {
    if (heroCache.data) return res.json(heroCache.data);   // serve old list if the API is down
    res.status(err.status || 500).json({ error: err.message });
  }
});

/* ---------- app routes (users, favorites, builds, snapshots, compare) ---------- */
const authLimit = require('./middleware/rateLimit')({ max: 20 });   // 20 login/register tries per 15 min per IP
app.use('/api/auth/login', authLimit);
app.use('/api/auth/register', authLimit);
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/players',   require('./routes/players'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/builds',    require('./routes/builds'));
app.use('/api/compare',   require('./routes/compare'));
app.use('/api/matches',   require('./routes/matches'));

// item id -> name / slot / icon url (kept in memory for 6h by services/assets.js)
app.get('/api/assets/items', async (_req, res) => {
  try { res.json((await require('./services/assets').getItemAssets()).items); }
  catch (err) { res.status(502).json({ error: 'Could not load items: ' + err.message }); }
});
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

for (const k of ['MONGODB_URI', 'JWT_SECRET']) if (!process.env[k]) { console.error(`Missing ${k} in .env (copy .env.example to .env)`); process.exit(1); }

mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(process.env.PORT || 3000, () => console.log('API running on port ' + (process.env.PORT || 3000))))
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
