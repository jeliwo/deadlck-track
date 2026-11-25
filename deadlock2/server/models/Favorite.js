const mongoose = require('mongoose');
const User = require('./User');

const schema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true,
    validate: { validator: async id => !!(await User.exists({ _id: id })), message: 'userId must reference an existing user' }
  },
  accountId: {
    type: Number, required: true,
    validate: { validator: v => Number.isInteger(v) && v > 0, message: 'accountId must be a positive integer' }
  },
  nickname: { type: String, trim: true, maxlength: 30 },
  notes: { type: String, trim: true, maxlength: 280 },
  createdAt: { type: Date, default: Date.now }
});

// a user can only track the same player once
schema.index({ userId: 1, accountId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', schema);
