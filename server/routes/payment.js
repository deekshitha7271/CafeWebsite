const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');

// Create checkout session
router.post('/checkout', async (req, res) => {
  try {
    const { items, table, total } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in order' });
    }

    // Save preliminary order to DB
    const newOrder = new Order({
      table,
      items: items.map(i => ({
        menuItemId: i._id,
        name: i.name,
        price: i.price,
        quantity: i.quantity
      })),
      total,
      paymentStatus: 'pending',
      orderStatus: 'placed'
    });
    
    await newOrder.save();

    // Map items for Stripe
    const line_items = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(item.price * 100), // Stripe expects cents
      },
      quantity: item.quantity,
    }));

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${newOrder._id}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/?table=${table}`,
      metadata: {
        orderId: newOrder._id.toString()
      }
    });

    // Update order with session id
    newOrder.stripeSessionId = session.id;
    await newOrder.save();

    res.json({ url: session.url, sessionId: session.id, orderId: newOrder._id });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
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
