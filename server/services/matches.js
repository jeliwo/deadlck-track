const MatchSnapshot = require('../models/MatchSnapshot');
const { getItemAssets } = require('./assets');

const API = () => process.env.DEADLOCK_API || 'https://api.deadlock-api.com';
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const first = (...vals) => vals.find(v => v !== undefined && v !== null);

/* Team names: team 0 = Amber (Hidden King), team 1 = Sapphire (Archmother). Swap here if they show up reversed. */
const TEAM_NAMES = ['Hidden King', 'Archmother'];

const teamOf = t => {
  if (typeof t === 'string') return /1|sapphire|archmother/i.test(t) ? 1 : 0;
  const n = num(t);
  return n >= 2 ? n - 2 : n;           // tolerate 2/3 style ids
};

/* ============================================================================
   FIELD MAPPING for GET /v1/matches/{id}/metadata. The docs only say "protobuf CMsgMatchMetaData", so each
   value accepts a few likely names. If something shows 0 or is missing, open
   http://localhost:3000/api/matches/<id>?raw=1 , look at one entry of players[] and fix the key names here.
   ========================================================================== */
function normalizePlayer(p, durationS, components) {
  const last = Array.isArray(p.stats) && p.stats.length ? p.stats[p.stats.length - 1] : {};
  const g = (...keys) => num(first(...keys.flatMap(k => [last[k], p[k]])));

  const hit = g('shots_hit', 'hero_bullets_hit'), miss = g('shots_missed', 'hero_bullets_missed');
  const crit = g('hero_bullets_hit_crit', 'crit_shots_hit');
  const souls = num(first(p.net_worth, last.net_worth));

  // final build: items that were never sold, de-duplicated, in the order bought
  const seen = new Set();
  let owned = (Array.isArray(p.items) ? p.items : [])
    .filter(i => i && i.item_id && !(num(i.sold_time_s) > 0))
    .sort((a, b) => num(a.game_time_s) - num(b.game_time_s))
    .map(i => i.item_id)
    .filter(id => !seen.has(id) && seen.add(id));
  if (components) {                                   // drop parts that were merged into a bigger upgrade you own
    const consumed = new Set();
    for (const id of owned) for (const c of components.get(id) || []) consumed.add(c);
    owned = owned.filter(id => !consumed.has(id));
  }

  return {
    accountId: num(p.account_id),
    team: teamOf(first(p.team, p.team_number)),
    heroId: num(p.hero_id),
    kills: num(first(p.kills, last.kills)), deaths: num(first(p.deaths, last.deaths)), assists: num(first(p.assists, last.assists)),
    souls, soulsPerMin: durationS ? Math.round(souls / (durationS / 60)) : 0,
    damage: g('player_damage', 'hero_damage'),
    objDamage: g('boss_damage', 'objective_damage'),
    healing: g('player_healing', 'hero_healing'),
    accuracy: hit + miss ? +(hit / (hit + miss) * 100).toFixed(1) : null,
    headshotPct: hit ? +(crit / hit * 100).toFixed(1) : null,
    items: owned.slice(0, 12)
  };
}

function normalizeMatch(raw, matchId, components) {
  const info = raw?.match_info || raw || {};
  const durationS = num(first(info.duration_s, info.match_duration_s));
  const players = (Array.isArray(info.players) ? info.players : []).map(p => normalizePlayer(p, durationS, components));
  if (!players.length) return null;

  const teamKills = [0, 0];
  players.forEach(p => { teamKills[p.team] = (teamKills[p.team] || 0) + p.kills; });
  players.forEach(p => { p.killParticipation = teamKills[p.team] ? +((p.kills + p.assists) / teamKills[p.team] * 100).toFixed(1) : 0; });

  const w = first(info.winning_team, info.match_outcome_team);
  return {
    matchId, durationS,
    startTime: num(info.start_time),
    gameMode: num(info.game_mode), matchMode: num(info.match_mode),
    winningTeam: w === undefined || w === null ? null : teamOf(w),
    teamNames: TEAM_NAMES,
    players
  };
}

/** Cached forever in Mongo once fetched. Throws an Error with .status for the route to pass on. */
async function getMatch(matchId) {
  const hit = await MatchSnapshot.findOne({ matchId });
  if (hit) return hit.data;

  const res = await fetch(`${API()}/v1/matches/${matchId}/metadata`);
  if (!res.ok) throw Object.assign(new Error(res.status === 404 ? 'Match not found' : res.status === 429 ? 'Rate limited by the Deadlock API, try again later' : `Deadlock API error (${res.status})`), { status: res.status === 404 ? 404 : res.status === 429 ? 429 : 502 });
  const raw = await res.json();

  let components = null;
  try { components = (await getItemAssets()).comps; } catch { /* items list unavailable: skip the merge cleanup */ }
  const data = normalizeMatch(raw, matchId, components);
  if (!data) throw Object.assign(new Error('Match data had no players (field mapping may need adjusting, see ?raw=1)'), { status: 502 });

  await MatchSnapshot.findOneAndUpdate({ matchId }, { data, fetchedAt: new Date() }, { upsert: true });
  return data;
}

module.exports = { getMatch, normalizeMatch, getRaw: async id => (await fetch(`${API()}/v1/matches/${id}/metadata`)).json() };
