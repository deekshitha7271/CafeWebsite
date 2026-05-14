const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const DailyCounter = require('../models/DailyCounter');
const CafeSettings = require('../models/CafeSettings');

// Lazy Razorpay initializer — avoids crash on startup when env vars are not yet set
let _razorpay = null;
const getRazorpay = () => {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured in .env');
    }
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID?.trim(),
      key_secret: process.env.RAZORPAY_KEY_SECRET?.trim(),
    });

    const kid = process.env.RAZORPAY_KEY_ID?.trim() || '';
    const ksec = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
    const isTest = kid.startsWith('rzp_test_');

    console.log(`💳 Razorpay: ${isTest ? 'TEST' : 'LIVE'} mode | ID Len: ${kid.length} | Secret Len: ${ksec.length}`);
    if (kid.length > 0) {
      console.log(`   - ID Prefix: ${kid.slice(0, 12)}...`);
    }
  }
  return _razorpay;
};

// ─── HELPER: Calculate billing fees ───────────────────────────────────────────
const calculateFees = (items, orderType) => {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalItemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  let feeAmount = 0;

  if (orderType === 'dinein-web') {
    feeAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% service charge
  } else if (orderType === 'takeaway') {
    feeAmount = totalItemCount * 10; // ₹10 per item
  }

  return { feeAmount, subtotal };
};

// ─── RAZORPAY: CREATE ORDER ───────────────────────────────────────────────────
router.post('/razorpay/create-order', async (req, res) => {
  try {
    const { items, table, orderType, customerName, customerPhone, arrivalTime, couponCode } = req.body;
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      appliedCoupon = await Coupon.findOne({ code: couponCode.toUpperCase(), active: true });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in order' });
    }

    // ─── VALIDATION: Ensure all items are in stock ───────────────────────────
    const MenuItem = require('../models/MenuItem');
    const dbItems = await MenuItem.find({ _id: { $in: items.map(i => i._id || i.menuItemId) } });

    for (const item of items) {
      const dbItem = dbItems.find(dbi => dbi._id.toString() === (item._id || item.menuItemId).toString());
      if (!dbItem) {
        return res.status(400).json({ error: `Item "${item.name}" not found in menu.` });
      }
      if (!dbItem.isAvailable) {
        return res.status(400).json({ error: `"${item.name}" is currently out of stock. Please remove it from your bag.` });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Parse arrival time
    let parsedArrivalTime;
    if (arrivalTime) {
      const mins = parseInt(arrivalTime, 10);
      if (!isNaN(mins) && mins > 0) {
        parsedArrivalTime = new Date(Date.now() + mins * 60000);
      }
    }

    if (!parsedArrivalTime) {
      return res.status(400).json({ error: 'Arrival time is required for new orders.' });
    }

    // Generate Daily Sequential Bill Number
    const dateStr = new Date().toISOString().split('T')[0];
    const counter = await DailyCounter.findOneAndUpdate(
      { date: dateStr },
      { $inc: { count: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const billNumber = `B-${counter.count}`;

    // Calculate fees
    const resolvedOrderType = orderType || 'dinein-web';
    const { feeAmount, subtotal } = calculateFees(items, resolvedOrderType);
    let grandTotal = subtotal + feeAmount;

    // Apply coupon
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percent') {
        discountAmount = grandTotal * (Number(appliedCoupon.value) / 100);
      } else if (appliedCoupon.type === 'flat') {
        discountAmount = Math.min(Number(appliedCoupon.value), grandTotal);
      }
      grandTotal = Math.max(0, grandTotal - discountAmount);
    }

    // Add GST
    const settings = await CafeSettings.findOne() || {};
    const gstRate = settings.gstRate ?? 5;
    const gstAmount = (grandTotal * gstRate) / 100;
    grandTotal += gstAmount;

    // Save new order to DB
    const arrivalMins = arrivalTime ? parseInt(arrivalTime, 10) : null;
    const targetOrder = new Order({
      table,
      user: req.session?.userId,
      orderType: resolvedOrderType,
      customerName,
      customerPhone,
      billNumber,
      arrivalTime: parsedArrivalTime,
      arrivalMinutes: arrivalMins && !isNaN(arrivalMins) ? arrivalMins : undefined,
      items: items.map(i => ({
        menuItemId: i._id || i.menuItemId,
        name: i.name,
        price: i.price,
        quantity: i.quantity
      })),
      total: grandTotal,
      gstRate: gstRate,
      gstAmount: gstAmount,
      paymentStatus: 'pending',
      orderStatus: 'placed'
    });

    if (appliedCoupon && discountAmount > 0) {
      targetOrder.discountAmount = discountAmount;
      targetOrder.appliedCouponCode = appliedCoupon.code;
    }

    await targetOrder.save();

    // Create Razorpay order
    const options = {
      amount: Math.round(grandTotal * 100), // amount in paise
      currency: 'INR',
      receipt: targetOrder._id.toString(),
      payment_capture: 1, // auto-capture on payment success
    };

    if (options.amount < 100) {
      return res.status(400).json({ error: 'Amount must be at least 100 paise' });
    }

    console.log('📦 Creating Razorpay order:', options);
    const rzpOrder = await getRazorpay().orders.create(options);
    console.log('✅ Razorpay order created:', rzpOrder.id, '| status:', rzpOrder.status);

    targetOrder.razorpayOrderId = rzpOrder.id;
    await targetOrder.save();

    // Clear user cart
    if (req.session?.userId) {
      await User.findByIdAndUpdate(req.session.userId, { $set: { cart: [] } });
    }

    console.log('🔑 Sending key to client:', process.env.RAZORPAY_KEY_ID?.slice(0, 12) + '...');
    res.json({
      orderId: targetOrder._id,
      razorpayOrderId: rzpOrder.id,
      amount: options.amount,
      currency: options.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('🔥 RAZORPAY ORDER ERROR:', {
      message: error.message,
      statusCode: error.statusCode,
      description: error.description,
      metadata: error.metadata
    });

    if (error.statusCode === 401 || error.description?.includes('authenticat')) {
      return res.status(401).json({
        error: 'Razorpay authentication failed',
        details: 'Invalid Razorpay Key ID or Secret. Please check your server .env file.'
      });
    }
    res.status(500).json({ error: 'Failed to create Razorpay order', details: error.message });
  }
});

// ─── VERIFY PAYMENT STATUS ───────────────────────────────────────────────────
// This is used by the frontend Success page to check if the order is marked as paid
router.get('/verify-session/:orderId', async (req, res) => {
  try {
    console.log(`🔍 Checking payment status for order: ${req.params.orderId}`);
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      console.warn(`❌ Order NOT FOUND in database: ${req.params.orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }
    console.log(`✅ Order status found: ${order.paymentStatus}`);

    res.json({
      paid: order.paymentStatus === 'paid',
      order: order
    });
  } catch (error) {
    console.error('🔥 VERIFY STATUS ERROR:', error);
    res.status(500).json({ error: 'Failed to verify order status' });
  }
});

// ─── RAZORPAY: VERIFY PAYMENT ─────────────────────────────────────────────────
router.post('/razorpay/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({ error: 'Missing required fields for verification' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      if (order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.razorpayPaymentId = razorpay_payment_id;
        await order.save();

        // Socket notifications
        const io = req.app.get('io');
        if (io) {
          io.emit('order:new', order);
          io.emit('order:update', order);
        }

        try {
          await new Notification({
            type: 'payment',
            title: 'Payment Received (Razorpay)',
            body: `Online payment of ₹${order.total} verified for order #${order._id.toString().slice(-6)}.`,
          }).save();
        } catch (nErr) {
          console.warn('Notification failed:', nErr.message);
        }

        // Update coupon uses if applicable
        if (order.appliedCouponCode) {
          await Coupon.findOneAndUpdate({ code: order.appliedCouponCode }, { $inc: { uses: 1 } });
        }
      }

      res.json({ success: true, order });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('🔥 RAZORPAY VERIFY ERROR:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;
