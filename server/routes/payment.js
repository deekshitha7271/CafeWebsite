const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');

// Create checkout session
router.post('/checkout', async (req, res) => {
  try {
    const { items, table, total, orderId, orderType, customerName, customerPhone } = req.body;
    let targetOrder;

    if (orderId) {
      targetOrder = await Order.findById(orderId);
      if (!targetOrder) return res.status(404).json({ error: 'Order not found' });
    } else {
      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items in order' });
      }

      // Save new order to DB
      targetOrder = new Order({
        table,
        orderType: orderType || 'dinein-web',
        customerName,
        customerPhone,
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
      }
    } catch (err) {
      console.error('Error updating order on webhook:', err);
    }
  }

  res.status(200).end();
});

module.exports = router;
