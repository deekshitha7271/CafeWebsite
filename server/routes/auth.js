const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Order = require('../models/Order');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email: email.toLowerCase().trim(), password: hashedPassword });
    await user.save();

    req.session.userId = user._id;

    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, cart: user.cart, activeOrders: user.activeOrders } });
  } catch (error) {
    console.error('Auth register error:', error);
    res.status(500).json({ error: 'Failed to register user.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    req.session.userId = user._id;
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, cart: user.cart, activeOrders: user.activeOrders } });
  } catch (error) {
    console.error('Auth login error:', error);
    res.status(500).json({ error: 'Failed to log in.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.json({ user: null });
    }

    const user = await User.findById(req.session.userId).select('name email role cart activeOrders');
    if (!user) {
      return res.json({ user: null });
    }

    res.json({ user });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Failed to fetch user session.' });
  }
});

router.put('/cart', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    const { cart } = req.body;
    const user = await User.findByIdAndUpdate(req.session.userId, { cart }, { new: true });
    res.json({ success: true, cart: user.cart });
  } catch (error) {
    console.error('Save cart error:', error);
    res.status(500).json({ error: 'Failed to save cart.' });
  }
});

router.put('/active-orders', async (req, res) => {
  try {
    if (!req.session?.userId) return res.status(401).json({ error: 'Not authorized' });
    const { activeOrders } = req.body;
    const user = await User.findByIdAndUpdate(req.session.userId, { activeOrders }, { new: true });
    res.json({ success: true, activeOrders: user.activeOrders });
  } catch (error) {
    console.error('Save active orders error:', error);
    res.status(500).json({ error: 'Failed to save active orders.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to log out.' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

router.get('/session-summary', async (req, res) => {
  try {
    if (!req.session?.userId) return res.status(401).json({ error: 'Not authorized' });

    // Define session as orders placed in the last 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const orders = await Order.find({
      user: req.session.userId,
      timestamp: { $gte: yesterday },
      paymentStatus: 'paid'
    }).sort({ timestamp: -1 });

    const paidTotal = orders.reduce((sum, order) => sum + order.total, 0);
    
    res.json({
      orders,
      paidTotal,
      sessionTotal: paidTotal // For now same, but could include pending in future
    });
  } catch (error) {
    console.error('Session summary error:', error);
    res.status(500).json({ error: 'Failed to fetch session summary.' });
  }
});

module.exports = router;
