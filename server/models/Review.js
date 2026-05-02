const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    customerEmail: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    category: { type: String, enum: ['Food', 'Service', 'Ambience'], default: 'Food' },
    comment: { type: String, required: true },
    replied: { type: Boolean, default: false },
    replyText: { type: String },
    flagged: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
