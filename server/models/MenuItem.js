const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  image: { type: String, default: '' },
  description: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  originalPrice: { type: Number },
  includedItems: [{ type: String }],
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
