const jwt = require('jsonwebtoken');

const SECRET = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set in .env');
  return process.env.JWT_SECRET;
};

const signToken = user => jwt.sign({ sub: String(user._id) }, SECRET(), { expiresIn: '7d' });

// Reads "Authorization: Bearer <token>" and sets req.userId
function requireAuth(req, res, next) {
  const m = /^Bearer (.+)$/.exec(req.get('Authorization') || '');
  if (!m) return res.status(401).json({ error: 'Login required' });
  try {
    req.userId = jwt.verify(m[1], SECRET()).sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { signToken, requireAuth };
