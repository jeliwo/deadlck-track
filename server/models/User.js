const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  username: {
    type: String, required: true, unique: true, trim: true,
    minlength: 3, maxlength: 20, match: /^[A-Za-z0-9_]+$/
  },
  email: {
    type: String, required: true, unique: true, lowercase: true, trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  passwordHash: { type: String, required: true },          // bcrypt hash only, never the raw password
  accountId: {                                              // the player's own Deadlock/Steam32 id
    type: Number,
    validate: { validator: v => v == null || (Number.isInteger(v) && v > 0), message: 'accountId must be a positive integer' }
  },
  createdAt: { type: Date, default: Date.now }
});

// never leak the hash when a user is sent as JSON
schema.set('toJSON', { transform: (_doc, ret) => { delete ret.passwordHash; delete ret.__v; return ret; } });

module.exports = mongoose.model('User', schema);
