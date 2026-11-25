const router = require('express').Router();
const Build = require('../models/Build');
const { requireAuth } = require('../middleware/auth');
const { wrap, validObjectId } = require('../middleware/helpers');

router.use(requireAuth);
router.param('id', validObjectId);

const pick = body => {
  const out = {};
  for (const k of ['name', 'heroId', 'items', 'isPublic']) if (body && k in body) out[k] = body[k];
  return out;
};

// POST /api/builds  { name, heroId, items:[{itemId,slot}], isPublic? }
router.post('/', wrap(async (req, res) => {
  res.status(201).json(await Build.create({ ...pick(req.body), userId: req.userId }));
}));

// GET /api/builds            -> your builds
// GET /api/builds?public=1   -> everyone's public builds (optionally ?heroId=)
router.get('/', wrap(async (req, res) => {
  const filter = req.query.public === '1' ? { isPublic: true } : { userId: req.userId };
  if (req.query.heroId && /^\d+$/.test(req.query.heroId)) filter.heroId = Number(req.query.heroId);
  if (req.query.public !== '1') return res.json(await Build.find(filter).sort({ createdAt: -1 }).limit(100));

  // public list: also say who made each build
  const rows = await Build.find(filter).sort({ createdAt: -1 }).limit(100).populate('userId', 'username');
  res.json(rows.map(b => ({ ...b.toJSON(), author: b.userId?.username || 'unknown', userId: b.userId?._id, mine: String(b.userId?._id) === req.userId })));
}));

// GET /api/builds/:id   your build, or any public build
router.get('/:id', wrap(async (req, res) => {
  const b = await Build.findOne({ _id: req.params.id, $or: [{ userId: req.userId }, { isPublic: true }] });
  if (!b) return res.status(404).json({ error: 'Build not found' });
  res.json(b);
}));

// PUT /api/builds/:id   owner only
router.put('/:id', wrap(async (req, res) => {
  const b = await Build.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, pick(req.body), { new: true, runValidators: true });
  if (!b) return res.status(404).json({ error: 'Build not found' });
  res.json(b);
}));

// DELETE /api/builds/:id   owner only
router.delete('/:id', wrap(async (req, res) => {
  const b = await Build.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!b) return res.status(404).json({ error: 'Build not found' });
  res.status(204).end();
}));

module.exports = router;
