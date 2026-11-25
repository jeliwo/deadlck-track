const mongoose = require('mongoose');

// A finished match never changes, so the trimmed result is stored once and kept forever (no TTL).
const schema = new mongoose.Schema({
  matchId: { type: Number, required: true, unique: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  fetchedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MatchSnapshot', schema);
