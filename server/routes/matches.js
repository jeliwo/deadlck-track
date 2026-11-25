const router = require('express').Router();
const { getMatch, getRaw } = require('../services/matches');
const { wrap, toPosInt } = require('../middleware/helpers');

// GET /api/matches/:matchId        -> trimmed scoreboard (players, stats, final builds), cached forever
// GET /api/matches/:matchId?raw=1  -> the untouched upstream JSON, for checking field names while developing
router.get('/:matchId', wrap(async (req, res) => {
  const id = toPosInt(req.params.matchId);
  if (!id) return res.status(400).json({ error: 'Invalid match id' });
  if (req.query.raw === '1') return res.json(await getRaw(id));
  res.json(await getMatch(id));
}));

module.exports = router;
