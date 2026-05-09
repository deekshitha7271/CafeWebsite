const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: false }, // Used as login identifier for customers
  email: { type: String, required: false, sparse: true, lowercase: true, trim: true }, // Optional; kept for admin accounts
  password: { type: String, required: false }, // Only required for admin/worker accounts
  role: { type: String, enum: ['admin', 'worker', 'customer'], default: 'customer' },
  shift: { type: String, default: '9AM - 6PM' },
  salary: { type: Number, default: 0 },
  status: { type: String, enum: ['present', 'absent'], default: 'present' },
  cart: { type: Array, default: [] },
  activeOrders: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

// Sparse unique index on phone (allows multiple docs with no phone)
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
// Sparse unique index on email (allows multiple docs with no email)
userSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
