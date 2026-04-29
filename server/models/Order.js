const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 }
});

const orderSchema = new mongoose.Schema({
  table: { type: Number },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderType: {
    type: String,
    enum: ['dinein-qr', 'dinein-web', 'takeaway'],
    default: 'dinein-qr'
  },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  orderStatus: { type: String, enum: ['placed', 'preparing', 'ready', 'completed'], default: 'placed' },
  estimatedReadyTime: { type: Date },
  arrivalTime: { type: Date },
  customerName: { type: String },
  customerPhone: { type: String },
  stripeSessionId: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
