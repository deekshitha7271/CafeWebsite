const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');

// Validate a coupon code
router.post('/validate', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Code is required' });

        const coupon = await Coupon.findOne({ 
            code: code.toUpperCase(), 
            active: true,
            expiry: { $gt: new Date() }
        });

        if (!coupon) {
            return res.status(404).json({ error: 'Invalid or expired coupon code' });
        }

        if (coupon.uses >= coupon.maxUses) {
            return res.status(400).json({ error: 'Coupon usage limit reached' });
        }

        res.json({
            success: true,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            description: coupon.description
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
