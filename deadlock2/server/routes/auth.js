const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken, requireAuth } = require('../middleware/auth');
const { wrap, toAccountId } = require('../middleware/helpers');

const str = v => (typeof v === 'string' ? v : '');

// POST /api/auth/register  { username, email, password, accountId? }
router.post('/register', wrap(async (req, res) => {
  const { username, email, password, accountId } = req.body || {};
  if (str(password).length < 8 || str(password).length > 72)
    return res.status(400).json({ error: 'Password must be 8-72 characters' });   // 72 = bcrypt's limit

  let acct;
  if (accountId != null && accountId !== '') {
    acct = toAccountId(accountId);
    if (!acct) return res.status(400).json({ error: 'accountId must be a positive integer' });
  }

  const user = await User.create({
    username: str(username), email: str(email), accountId: acct,
    passwordHash: await bcrypt.hash(password, 10)
  });
  res.status(201).json({ token: signToken(user), user });
}));

// POST /api/auth/login  { email, password }   (not in the spec table but needed so the favorites/builds routes can be used)
router.post('/login', wrap(async (req, res) => {
  const user = await User.findOne({ email: str(req.body?.email).toLowerCase().trim() });
  const ok = user && await bcrypt.compare(str(req.body?.password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Wrong email or password' });
  res.json({ token: signToken(user), user });
}));

// GET /api/auth/me
router.get('/me', requireAuth, wrap(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'User no longer exists' });
  res.json({ user });
}));

module.exports = router;
