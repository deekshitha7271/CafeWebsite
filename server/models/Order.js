const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 }
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderType: {
    type: String,
    enum: ['dinein-web', 'takeaway'],
    default: 'takeaway'
  },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  orderStatus: { type: String, enum: ['placed', 'preparing', 'ready', 'completed'], default: 'placed' },
  estimatedReadyTime: { type: Date },
  arrivalTime: { type: Date },
  arrivalMinutes: { type: Number }, // Original picker value: 10, 20, or 30
  customerName: { type: String },
  customerPhone: { type: String },
  billNumber: { type: String },
  stripeSessionId: { type: String },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  timestamp: { type: Date, default: Date.now }

});

// Indices for production performance
orderSchema.index({ user: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ timestamp: -1 });
orderSchema.index({ stripeSessionId: 1 });

module.exports = mongoose.model('Order', orderSchema);
