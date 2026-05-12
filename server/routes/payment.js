const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const DailyCounter = require('../models/DailyCounter');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


// ─── HELPER: Calculate billing fees ───────────────────────────────────────────
// Returns the fee amount and a descriptor for Stripe line items
const calculateFees = (items, orderType) => {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalItemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  let feeAmount = 0;
  let feeLabel = '';
  let feeDescription = '';

  if (orderType === 'dinein-web') {
    feeAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% service charge
    feeLabel = 'Service Charge (5%)';
    feeDescription = 'Dine-in service charge';
  } else if (orderType === 'takeaway') {
    feeAmount = totalItemCount * 10; // ₹10 per item
    feeLabel = `Takeaway Handling (₹10 × ${totalItemCount} items)`;
    feeDescription = 'Takeaway packaging and handling fee';
  }

  return { feeAmount, feeLabel, feeDescription, subtotal };
};

// ─── CREATE CHECKOUT SESSION ───────────────────────────────────────────────────
router.post('/checkout', async (req, res) => {
  try {
    const { items, table, total, orderId, orderType, customerName, customerPhone, arrivalTime, couponCode } = req.body;
    let targetOrder;
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      appliedCoupon = await Coupon.findOne({ code: couponCode.toUpperCase(), active: true });
    }

    if (orderId) {
      // Re-paying an existing order
      targetOrder = await Order.findById(orderId);
      if (!targetOrder) return res.status(404).json({ error: 'Order not found' });
    } else {
      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items in order' });
      }

      // Parse arrival time from minutes offset (e.g. "10", "20", "30")
      let parsedArrivalTime;
      if (arrivalTime) {
        const mins = parseInt(arrivalTime, 10);
        if (!isNaN(mins) && mins > 0) {
          parsedArrivalTime = new Date(Date.now() + mins * 60000);
        }
      }

      if (!parsedArrivalTime && !orderId) {
        return res.status(400).json({ error: 'Arrival time is required for new orders.' });
      }

      // Generate Daily Sequential Bill Number
      const dateStr = new Date().toISOString().split('T')[0];
      const counter = await DailyCounter.findOneAndUpdate(
        { date: dateStr },
        { $inc: { count: 1 } },
        { new: true, upsert: true }
      );
      const billNumber = `B-${counter.count}`;

      // ── Calculate fees ────────────────────────────────────────────────────
      const resolvedOrderType = orderType || 'dinein-web';
      const { feeAmount, subtotal } = calculateFees(items, resolvedOrderType);
      const grandTotal = subtotal + feeAmount;

      // Parse arrivalMinutes for display on admin cards
      const arrivalMins = arrivalTime ? parseInt(arrivalTime, 10) : null;

      // Save new order to DB with the final computed total (including fees)
      targetOrder = new Order({
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
        paymentStatus: 'pending',
        orderStatus: 'placed'
      });
      await targetOrder.save();

      // Clear the user's persistent cart in the database
      if (req.session?.userId) {
        await User.findByIdAndUpdate(req.session.userId, { $set: { cart: [] } });
      }
    }

    // ── Build Stripe line items ───────────────────────────────────────────────
    const line_items = targetOrder.items.map(item => ({
      price_data: {
        currency: 'inr',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // Add fee line item to Stripe
    const { feeAmount, feeLabel, feeDescription } = calculateFees(targetOrder.items, targetOrder.orderType);
    if (feeAmount > 0) {
      line_items.push({
        price_data: {
          currency: 'inr',
          product_data: { name: feeLabel, description: feeDescription },
          unit_amount: Math.round(feeAmount * 100),
        },
        quantity: 1,
      });
    }

    // ── Apply coupon discount ─────────────────────────────────────────────────
    if (appliedCoupon) {
      const rawTotal = targetOrder.total;
      if (appliedCoupon.type === 'percent') {
        discountAmount = rawTotal * (Number(appliedCoupon.value) / 100);
      } else if (appliedCoupon.type === 'flat') {
        discountAmount = Math.min(Number(appliedCoupon.value), rawTotal);
      }
    }

    let stripeCouponId = null;
    if (appliedCoupon && discountAmount > 0) {
      try {
        const stripeCoupon = await stripe.coupons.create({
          amount_off: Math.round(discountAmount * 100),
          currency: 'inr',
          duration: 'once',
          name: `Discount: ${appliedCoupon.code}`
        });
        stripeCouponId = stripeCoupon.id;

        const rawTotal = targetOrder.total;
        targetOrder.total = Math.max(0, rawTotal - discountAmount);
        await targetOrder.save();

        await Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { uses: 1 } });
      } catch (couponErr) {
        console.error('Stripe Coupon Creation Failed:', couponErr);
      }
    }

    const clientBase = process.env.CLIENT_URL || 'http://localhost:5173';

    // ── Create Stripe session ─────────────────────────────────────────────────
    // success → public PaymentSuccessPage that verifies & then redirects to orders
    // cancel  → back to menu/cart with canceled param
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : [],
      mode: 'payment',
      success_url: `${clientBase}/payment/success?orderId=${targetOrder._id}`,
      cancel_url: `${clientBase}/?canceled=true&orderId=${targetOrder._id}`,
      metadata: {
        orderId: targetOrder._id.toString()
      }
    });

    targetOrder.stripeSessionId = session.id;
    await targetOrder.save();

    res.json({ url: session.url, sessionId: session.id, orderId: targetOrder._id });
  } catch (error) {
    console.error('🔥 CRITICAL STRIPE ERROR:', error.message);
    console.error('Detailed Debug Info:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: error.message
    });
  }
});

// ─── VERIFY PAYMENT SESSION ────────────────────────────────────────────────────
// Public endpoint — no auth required (called from PaymentSuccessPage)
router.get('/verify-session/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.paymentStatus === 'paid') {
      return res.json({ paid: true, order });
    }

    if (order.stripeSessionId) {
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      if (session.payment_status === 'paid') {
        order.paymentStatus = 'paid';
        await order.save();

        const io = req.app.get('io');
        if (io) {
          io.emit('order:new', order);
          io.emit('order:update', order);
        }

        try {
          await new Notification({
            type: 'payment',
            title: 'Payment Received',
            body: `Online payment of ₹${order.total} received for order #${order._id.toString().slice(-6)}.`,
          }).save();
        } catch (nErr) {
          console.warn('Notification failed:', nErr.message);
        }
        return res.json({ paid: true, order });
      }
    }

    res.json({ paid: false, order });
  } catch (error) {
    console.error('Session verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ─── STRIPE WEBHOOK ────────────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.orderId;

    try {
      const order = await Order.findById(orderId);
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        await order.save();

        const io = req.app.get('io');
        if (io) {
          io.emit('order:new', order);
        }

        try {
          await new Notification({
            type: 'payment',
            title: 'Payment Received (Webhook)',
            body: `Online payment of ₹${order.total} verified for order #${order._id.toString().slice(-6)}.`,
          }).save();
        } catch (nErr) {
          console.warn('Notification failed:', nErr.message);
        }
      }
    } catch (err) {
      console.error('Error updating order on webhook:', err);
    }
  }

  res.status(200).end();
});

// ─── RAZORPAY: CREATE ORDER ───────────────────────────────────────────────────
router.post('/razorpay/create-order', async (req, res) => {
  try {
    const { items, table, orderType, customerName, customerPhone, arrivalTime, couponCode } = req.body;
    let targetOrder;
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      appliedCoupon = await Coupon.findOne({ code: couponCode.toUpperCase(), active: true });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in order' });
    }

    // Parse arrival time
    let parsedArrivalTime;
    if (arrivalTime) {
      const mins = parseInt(arrivalTime, 10);
      if (!isNaN(mins) && mins > 0) {
        parsedArrivalTime = new Date(Date.now() + mins * 60000);
      }
    }

    // Generate Daily Sequential Bill Number
    const dateStr = new Date().toISOString().split('T')[0];
    const counter = await DailyCounter.findOneAndUpdate(
      { date: dateStr },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
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

    // Save new order to DB
    const arrivalMins = arrivalTime ? parseInt(arrivalTime, 10) : null;
    targetOrder = new Order({
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
      currency: "INR",
      receipt: targetOrder._id.toString(),
    };

    const rzpOrder = await razorpay.orders.create(options);

    targetOrder.razorpayOrderId = rzpOrder.id;
    await targetOrder.save();

    // Clear user cart
    if (req.session?.userId) {
      await User.findByIdAndUpdate(req.session.userId, { $set: { cart: [] } });
    }

    res.json({
      orderId: targetOrder._id,
      razorpayOrderId: rzpOrder.id,
      amount: options.amount,
      currency: options.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('🔥 RAZORPAY ORDER ERROR:', error);
    res.status(500).json({ error: 'Failed to create Razorpay order', details: error.message });
  }
});

// ─── RAZORPAY: VERIFY PAYMENT ─────────────────────────────────────────────────
router.post('/razorpay/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
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

