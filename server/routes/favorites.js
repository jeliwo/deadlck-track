const router = require('express').Router();
const Favorite = require('../models/Favorite');
const { requireAuth } = require('../middleware/auth');
const { wrap, toAccountId, validObjectId } = require('../middleware/helpers');

router.use(requireAuth);
router.param('id', validObjectId);

// POST /api/favorites  { accountId, nickname?, notes? }
router.post('/', wrap(async (req, res) => {
  const { accountId, nickname, notes } = req.body || {};
  const fav = await Favorite.create({ userId: req.userId, accountId: toAccountId(accountId), nickname, notes });
  res.status(201).json(fav);
}));

// GET /api/favorites   -> only the logged-in user's favorites
router.get('/', wrap(async (req, res) => {
  res.json(await Favorite.find({ userId: req.userId }).sort({ createdAt: -1 }));
}));

// PUT /api/favorites/:id   updates nickname and/or notes only
router.put('/:id', wrap(async (req, res) => {
  const update = {};
  for (const k of ['nickname', 'notes']) if (req.body && k in req.body) update[k] = req.body[k];
  const fav = await Favorite.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, update, { new: true, runValidators: true });
  if (!fav) return res.status(404).json({ error: 'Favorite not found' });
  res.json(fav);
}));

// DELETE /api/favorites/:id
router.delete('/:id', wrap(async (req, res) => {
  const fav = await Favorite.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!fav) return res.status(404).json({ error: 'Favorite not found' });
  res.status(204).end();
}));

module.exports = router;
