const mongoose = require('mongoose');

// wrap async handlers so thrown errors reach the error middleware
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// positive integer from a string/number, or null
const toPosInt = v => {
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) return v;
  return typeof v === 'string' && /^[1-9]\d{0,15}$/.test(v) ? Number(v) : null;
};

// Steam64 (7656119...) -> Steam32 account id; anything else positive-integer passes through
const toAccountId = v => {
  const s = String(v ?? '');
  if (!/^\d{1,20}$/.test(s)) return null;
  const n = s.length >= 16 ? BigInt(s) - 76561197960265728n : BigInt(s);
  return n > 0n && n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : null;
};

// :id params that must be Mongo ObjectIds
const validObjectId = (req, res, next, id) =>
  mongoose.isValidObjectId(id) ? next() : res.status(400).json({ error: 'Invalid id' });

// turns Mongoose validation / duplicate-key errors into clean 400/409 responses
function errorHandler(err, _req, res, _next) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: Object.fromEntries(Object.entries(err.errors).map(([k, e]) => [k, e.message])) });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {}).filter(k => k !== 'userId')[0] || 'value';
    return res.status(409).json({ error: `${field} already exists` });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
}

module.exports = { wrap, toPosInt, toAccountId, validObjectId, errorHandler };
