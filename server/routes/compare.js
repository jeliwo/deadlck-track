const router = require('express').Router();
const { getSnapshot, rates } = require('../services/snapshots');
const { wrap, toAccountId } = require('../middleware/helpers');

// GET /api/compare?me=<accountId>&them=<accountId>
router.get('/', wrap(async (req, res) => {
  const me = toAccountId(req.query.me), them = toAccountId(req.query.them);
  if (!me || !them) return res.status(400).json({ error: 'Both ?me= and ?them= must be valid account ids' });

  const [a, b] = await Promise.all([getSnapshot(me), getSnapshot(them)]);
  const ra = rates(a.snapshot.stats), rb = rates(b.snapshot.stats);
  const diff = Object.fromEntries(Object.keys(ra).map(k => [k, +(ra[k] - rb[k]).toFixed(2)]));   // positive = you are ahead

  res.json({
    me:   { accountId: me,   stats: a.snapshot.stats, ...ra, fetchedAt: a.snapshot.fetchedAt },
    them: { accountId: them, stats: b.snapshot.stats, ...rb, fetchedAt: b.snapshot.fetchedAt },
    diff
  });
}));

module.exports = router;
