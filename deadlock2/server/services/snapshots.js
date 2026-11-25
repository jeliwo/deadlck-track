const PlayerSnapshot = require('../models/PlayerSnapshot');

const DEADLOCK_API = () => process.env.DEADLOCK_API || 'https://api.deadlock-api.com';
const MAX_AGE_MS = () => (Number(process.env.SNAPSHOT_MAX_AGE_SECONDS) || 3600) * 1000;   // "stale" = older than 1 hour

const num = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
const pickFirst = (o, keys) => { for (const k of keys) if (o?.[k] != null) return o[k]; return 0; };

/* Field names confirmed against the Deadlock API spec (GET /v1/players/hero-stats -> HeroStats[]).
   time_played has no unit in the spec; it is treated as SECONDS. If hours look 60x or 3600x off, change SECONDS_PER_UNIT. */
const SECONDS_PER_UNIT = 1;
const F = {
  heroId: ['hero_id'], matches: ['matches_played'], wins: ['wins'],
  kills: ['kills'], deaths: ['deaths'], assists: ['assists'], seconds: ['time_played']
};

function normalize(raw) {
  const rows = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  const heroStats = rows.map(r => ({
    heroId: num(pickFirst(r, F.heroId)),
    matches: num(pickFirst(r, F.matches)),
    wins: num(pickFirst(r, F.wins)),
    hoursPlayed: Math.round(num(pickFirst(r, F.seconds)) * SECONDS_PER_UNIT / 36) / 100          // seconds -> hours, 2 decimals
  })).filter(h => h.heroId > 0);

  const sum = k => rows.reduce((t, r) => t + num(pickFirst(r, F[k])), 0);
  const stats = {
    matches: sum('matches'), wins: sum('wins'),
    kills: sum('kills'), deaths: sum('deaths'), assists: sum('assists'),
    hoursPlayed: Math.round(sum('seconds') * SECONDS_PER_UNIT / 36) / 100
  };
  return { stats, heroStats };
}

async function fetchFromApi(accountId) {
  const res = await fetch(`${DEADLOCK_API()}/v1/players/hero-stats?account_ids=${accountId}`);
  if (!res.ok) throw Object.assign(new Error(`Deadlock API error (${res.status})`), { status: res.status === 404 ? 404 : 502 });
  return normalize(await res.json());
}

/** Returns { snapshot, source: 'cache' | 'api' | 'stale-cache' } */
async function getSnapshot(accountId, { force = false } = {}) {
  const existing = await PlayerSnapshot.findOne({ accountId });
  const fresh = existing && Date.now() - existing.fetchedAt.getTime() < MAX_AGE_MS();
  if (fresh && !force) return { snapshot: existing, source: 'cache' };

  try {
    const { stats, heroStats } = await fetchFromApi(accountId);
    if (!stats.matches) throw Object.assign(new Error('No Deadlock stats found for that account id'), { status: 404 });
    const snapshot = await PlayerSnapshot.findOneAndUpdate(
      { accountId },
      { stats, heroStats, fetchedAt: new Date() },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return { snapshot, source: 'api' };
  } catch (err) {
    if (existing && err.status !== 404) return { snapshot: existing, source: 'stale-cache' };   // API down: serve old data rather than fail
    throw err;
  }
}

const rates = s => ({
  winRate: s.matches ? +(s.wins / s.matches * 100).toFixed(1) : 0,
  kda: +((s.kills + s.assists) / Math.max(1, s.deaths)).toFixed(2),
  killsPerMatch: s.matches ? +(s.kills / s.matches).toFixed(2) : 0,
  deathsPerMatch: s.matches ? +(s.deaths / s.matches).toFixed(2) : 0,
  assistsPerMatch: s.matches ? +(s.assists / s.matches).toFixed(2) : 0
});

const DEADLOCK = DEADLOCK_API;
module.exports = { getSnapshot, rates, normalize, DEADLOCK };
