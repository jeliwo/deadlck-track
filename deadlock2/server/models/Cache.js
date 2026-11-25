const mongoose = require('mongoose');

// One document per cached API response. MongoDB deletes it automatically
// once "createdAt" is older than expires (set from CACHE_SECONDS).
const schema = new mongoose.Schema({
  key:  { type: String, required: true, unique: true },   // e.g. "/v1/players/123/match-history"
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, expires: Number(process.env.CACHE_SECONDS) || 600 }
});

module.exports = mongoose.model('Cache', schema);
