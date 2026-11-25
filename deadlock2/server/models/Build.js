const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemId: { type: Number, required: true },
  slot: { type: String, required: true, trim: true }
}, { _id: false });

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
  heroId: {
    type: Number, required: true,
    validate: { validator: v => Number.isInteger(v) && v > 0, message: 'heroId must be a positive integer' }
  },
  items: {
    type: [itemSchema], required: true,
    validate: { validator: a => Array.isArray(a) && a.length >= 1 && a.length <= 12, message: 'items must have 1-12 entries' }
  },
  isPublic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Build', schema);
