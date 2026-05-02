const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    unit: { type: String, required: true, default: 'kg' },
    stock: { type: Number, required: true, default: 0 },
    minStock: { type: Number, required: true, default: 5 },
    maxStock: { type: Number, required: true, default: 100 },
    costPerUnit: { type: Number, required: true, default: 0 },
    lastRestocked: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
