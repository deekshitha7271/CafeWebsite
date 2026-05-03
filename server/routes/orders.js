const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Create new order (for Cash/Pay Later)
router.post('/cash', async (req, res) => {
  try {
    const { items, total, orderType, customerName, customerPhone, arrivalTime } = req.body;

    const newOrder = new Order({
      user: req.session?.userId,
      orderType: orderType || 'takeaway',
      items,
      total,
      customerName,
      customerPhone,
      arrivalTime: arrivalTime ? new Date(arrivalTime) : undefined,
      paymentStatus: 'pending',
      orderStatus: 'placed'
    });

    const savedOrder = await newOrder.save();

    // Emit socket event for admin dashboard
    const io = req.app.get('io');
    if (io) {
      io.emit('order:new', savedOrder);
    }

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('❌ ORDER CREATION ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get all orders (for admin)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ timestamp: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order (for tracking)
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get related orders in the session chain
router.get('/related/:id', async (req, res) => {
  try {
    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) return res.status(404).json({ error: 'Order not found' });

    // Find all orders that share the same "root" order or are part of the chain
    // If current order has a relatedOrderId, fetch its parent and siblings
    // If current order is a parent, fetch its children
    const chainRootId = currentOrder.relatedOrderId || currentOrder._id;
    
    const relatedOrders = await Order.find({
      $or: [
        { _id: chainRootId },
        { relatedOrderId: chainRootId },
        { relatedOrderId: currentOrder.relatedOrderId } // Siblings
      ]
    }).sort({ timestamp: 1 });

    res.json(relatedOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (Admin)
router.put('/:id/status', async (req, res) => {
  try {
    const { orderStatus, paymentStatus, estimatedReadyTime } = req.body;
    const update = {};
    if (orderStatus) update.orderStatus = orderStatus;
    if (paymentStatus) update.paymentStatus = paymentStatus;
    if (estimatedReadyTime) update.estimatedReadyTime = estimatedReadyTime;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Emit socket event to the specific order tracking room
    const io = req.app.get('io');
    if (io) {
      console.log(`📡 Emitting statusUpdate to order:${order._id} | Status: ${order.orderStatus} | Time: ${order.estimatedReadyTime}`);
      io.to(`order:${order._id}`).emit('order:statusUpdate', {
        orderId: order._id,
        status: order.orderStatus,
        estimatedReadyTime: order.estimatedReadyTime
      });
      // Also emit to all admins if we have a general admin room, for now 'order:update'
      io.emit('order:update', order);
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
