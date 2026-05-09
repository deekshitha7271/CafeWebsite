const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Order = require('../models/Order');
const router = express.Router();

/**
 * ─── STAFF LOGIN ─────────────────────────────────────────────────────────────
 * Exclusive to Admin/Worker roles using Email + Password.
 * Customer phone-based login has been removed.
 */
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

    // Role check to ensure only staff can log in
    if (user.role !== 'admin' && user.role !== 'worker') {
      return res.status(403).json({ error: 'Unauthorized. Staff portal only.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    req.session.userId = user._id;
    res.json({ 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('Auth login error:', error);
    res.status(500).json({ error: 'Failed to log in.' });
  }
});

/**
 * ─── GET CURRENT STAFF SESSION ───────────────────────────────────────────────
 */
router.get('/me', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.json({ user: null });
    }

    const user = await User.findById(req.session.userId).select('name email role');
    if (!user || (user.role !== 'admin' && user.role !== 'worker')) {
      req.session.destroy();
      return res.json({ user: null });
    }

    res.json({ user });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Failed to fetch staff session.' });
  }
});

/**
 * ─── LOGOUT ──────────────────────────────────────────────────────────────────
 */
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

/**
 * ─── STAFF REGISTRATION (Internal/Admin only) ────────────────────────────────
 * Note: Customers cannot register. This route is for setting up new staff.
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      name, 
      email: email.toLowerCase().trim(), 
      password: hashedPassword,
      role: role || 'worker' 
    });
    
    await user.save();
    res.status(201).json({ success: true, message: 'Staff account created.' });
  } catch (error) {
    console.error('Staff register error:', error);
    res.status(500).json({ error: 'Failed to create staff account.' });
  }
});

module.exports = router;
