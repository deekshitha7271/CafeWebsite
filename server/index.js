require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Clean up the CLIENT_URL to handle accidental trailing slashes or spaces
const clientUrl = process.env.CLIENT_URL?.trim().replace(/\/$/, "");
const allowedOrigins = [clientUrl, "http://localhost:5173", "http://localhost:3000"].filter(Boolean);

console.log("🔒 Trusted Origins:", allowedOrigins);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Webhook requires raw body. We'll set it up in payment routes.
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Pass io instance to app
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join:order', (orderId) => {
    socket.join(`order:${orderId}`);
    console.log(`Socket joined room order:${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Import Routes
const categoryRoutes = require('./routes/categories');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payment');

app.use('/api/categories', categoryRoutes);
app.use('/api/menu-items', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', paymentRoutes);

// Public combined API
const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');

app.get('/api/menu', async (req, res) => {
  try {
    const categories = await Category.find();
    const items = await MenuItem.find({ isAvailable: true });
    res.json({ categories, items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalOrders = await Order.countDocuments({ timestamp: { $gte: today } });
    
    // Most ordered items aggregation
    const popularItems = await Order.aggregate([
      { $match: { timestamp: { $gte: today } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.name", count: { $sum: "$items.quantity" } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    res.json({ totalOrdersToday: totalOrders, popularItems });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
