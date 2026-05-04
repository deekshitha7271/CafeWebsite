const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  itemId: { type: String, unique: true, sparse: true },
  itemName: { type: String, required: true },
  name: { type: String }, // Keep for compatibility
  itemOnlinePrice: { type: Number, required: true },
  price: { type: Number }, // Keep for compatibility
  categoryName: { type: String }, // For direct reference during ingestion
  itemOnlineDisplayName: { type: String },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  rankOrder: { type: Number, default: 0 },
  allowVariation: { type: Boolean, default: false },
  dietaryTag: { type: String, default: '' },
  image: { type: String, default: '' },
  description: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  originalPrice: { type: Number },
  includedItems: [{ type: String }],
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

// Middleware to sync name/price for backward compatibility
menuItemSchema.pre('save', function (next) {
  if (this.itemName && !this.name) this.name = this.itemName;
  if (this.itemOnlinePrice && !this.price) this.price = this.itemOnlinePrice;
  next();
});

// Indices for production performance
menuItemSchema.index({ categoryId: 1 });
menuItemSchema.index({ rankOrder: 1 });
menuItemSchema.index({ isAvailable: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
