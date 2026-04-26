const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, default: '' },
  description: { type: String, default: '' },
  mood: { type: String, enum: ['none', 'spark', 'indulge'], default: 'none' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Category', categorySchema);
