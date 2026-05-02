const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'worker', 'customer'], default: 'customer' },
  phone: { type: String },
  shift: { type: String, default: '9AM - 6PM' },
  salary: { type: Number, default: 0 },
  status: { type: String, enum: ['present', 'absent'], default: 'present' },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('User', userSchema);
