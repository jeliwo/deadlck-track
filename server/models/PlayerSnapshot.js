const mongoose = require('mongoose');

const n0 = { type: Number, min: 0, default: 0 };

// Cache of Deadlock API results so we don't call the API on every page load.
// A snapshot older than SNAPSHOT_MAX_AGE_SECONDS (default 1h) counts as stale (see routes/players.js).
const schema = new mongoose.Schema({
  accountId: {
    type: Number, required: true, unique: true,
    validate: { validator: v => Number.isInteger(v) && v > 0, message: 'accountId must be a positive integer' }
  },
  stats: {
    type: new mongoose.Schema({ matches: n0, wins: n0, kills: n0, deaths: n0, assists: n0, hoursPlayed: n0 }, { _id: false }),
    required: true
  },
  heroStats: [new mongoose.Schema({ heroId: Number, matches: n0, wins: n0, hoursPlayed: n0 }, { _id: false })],
  fetchedAt: { type: Date, required: true, default: Date.now }
});

module.exports = mongoose.model('PlayerSnapshot', schema);
