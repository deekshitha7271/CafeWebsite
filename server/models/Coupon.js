const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    type: { type: String, enum: ['percent', 'flat', 'bogo', 'item'], default: 'percent' },
    value: { type: Number, required: true, default: 10 },
    description: { type: String, required: true },
    category: { type: String, default: 'General' },
    maxUses: { type: Number, default: 100 },
    uses: { type: Number, default: 0 },
    expiry: { type: Date, required: true },
    active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
