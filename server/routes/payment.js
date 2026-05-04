const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Notification = require('../models/Notification');

const User = require('../models/User');

const Coupon = require('../models/Coupon');

// Create checkout session
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
      targetOrder = await Order.findById(orderId);
      if (!targetOrder) return res.status(404).json({ error: 'Order not found' });
    } else {
      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items in order' });
      }

      let parsedArrivalTime;
      if (arrivalTime) {
        if (arrivalTime.includes(':') && arrivalTime.length <= 5) {
          const today = new Date();
          const [hours, minutes] = arrivalTime.split(':');
          today.setHours(parseInt(hours, 10) || 0, parseInt(minutes, 10) || 0, 0, 0);
          parsedArrivalTime = today;
        } else {
          parsedArrivalTime = new Date(arrivalTime);
        }
      }

      // Save new order to DB
      targetOrder = new Order({
        table,
        user: req.session?.userId,
        orderType: orderType || 'dinein-web',
        customerName,
        customerPhone,
        arrivalTime: parsedArrivalTime,
        items: items.map(i => ({
          menuItemId: i._id || i.menuItemId,
          name: i.name,
          price: i.price,
          quantity: i.quantity
        })),
        total,
        paymentStatus: 'pending',
        orderStatus: 'placed'
      });
      await targetOrder.save();

      // IMPORTANT: Clear the user's persistent cart in the database
      if (req.session?.userId) {
        await User.findByIdAndUpdate(req.session.userId, { $set: { cart: [] } });
      }
    }

    // Map items for Stripe using the order's items
    const line_items = targetOrder.items.map(item => ({
      price_data: {
        currency: 'inr',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100), // Stripe expects cents/paise
      },
      quantity: item.quantity,
    }));

    // Apply Discount if valid
    if (appliedCoupon) {
      const rawTotal = targetOrder.total;
      if (appliedCoupon.type === 'percent') {
        discountAmount = rawTotal * (appliedCoupon.value / 100);
      } else if (appliedCoupon.type === 'flat') {
        discountAmount = Math.min(appliedCoupon.value, rawTotal);
      }

      if (discountAmount > 0) {
        line_items.push({
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Discount (${appliedCoupon.code})`,
            },
            unit_amount: -Math.round(discountAmount * 100),
          },
          quantity: 1,
        });
        
        // Update order total in DB
        targetOrder.total = rawTotal - discountAmount;
        await targetOrder.save();

        // Increment usage
        await Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { uses: 1 } });
      }
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/track/${targetOrder._id}?success=true`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/track/${targetOrder._id}?canceled=true`,
      metadata: {
        orderId: targetOrder._id.toString()
      }
    });

    // Update order with session id
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

// Verify payment for local dev when Stripe webhooks aren't forwarded
router.get('/verify-session/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.paymentStatus === 'paid') {
      return res.json({ paid: true });
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

        // Create system notification
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

// Stripe webhook handler (defined in index.js for raw body parsing)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // If you add a webhook secret in .env, verify it here.
    // For now we trust the webhook payload locally or bypass verification if no secret is set.
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(req.body.toString()); // Raw body parsing fallback
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.orderId;

    try {
      const order = await Order.findById(orderId);
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        await order.save();

        // Emit socket event to admins
        const io = req.app.get('io');
        if (io) {
          io.emit('order:new', order);
        }

        // Create system notification
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

module.exports = router;
