require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const session = require('express-session');
const { Server } = require('socket.io');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const { protect, authorize } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Clean up the CLIENT_URL to handle accidental trailing slashes or spaces
const clientUrl = process.env.CLIENT_URL?.trim().replace(/\/$/, "");
const allowedOrigins = [clientUrl, "http://localhost:5173", "http://localhost:3000"].filter(Boolean);

// 1. CORS MUST BE FIRST
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn("🚫 CORS BLOCKED origin:", origin);
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// 2. Production Security & Performance
app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow resources to be loaded across origins
}));
app.use(compression()); // Gzip compression for all responses

// 3. Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Stricter limiter for sensitive routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 requests per window
  message: 'Too many auth attempts, please try again after an hour'
});
app.use('/api/auth/', authLimiter);
app.use('/api/payment/checkout', authLimiter);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn("🚫 CORS BLOCKED origin:", origin);
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Webhook requires raw body. We'll set it up in payment routes.
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const MongoStore = require('connect-mongo').default;

app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'cafe-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24
  }
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
const adminRoutes = require('./routes/admin');
const couponRoutes = require('./routes/coupons');

// Models for Public combined API
const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');

app.use('/api/auth', authRoutes);

// Public combined API - MUST BE ABOVE PROTECTED ROUTES
app.get('/api/menu', async (req, res) => {
  try {
    const categories = await Category.find();
    const items = await MenuItem.find({ isAvailable: true });
    res.json({ categories, items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

const CafeSettings = require('./models/CafeSettings');
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await CafeSettings.findOne();
    if (!settings) {
      settings = new CafeSettings();
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Category and Menu items have internal protection for mutation routes
app.use('/api/categories', categoryRoutes);
app.use('/api/menu-items', menuRoutes);
app.use('/api/coupons', couponRoutes);

// Protected routes
app.use('/api/orders', protect, orderRoutes);
app.use('/api/payment', protect, paymentRoutes);
app.use('/api/admin', protect, authorize('admin', 'worker'), adminRoutes);

app.get('/api/analytics', protect, authorize('admin', 'worker'), async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setHours(yesterday.getHours() - 24);
    const dayBefore = new Date(yesterday);
    dayBefore.setHours(dayBefore.getHours() - 24);

    // 1. Current Stats (Last 24h)
    const stats = await Order.aggregate([
      { $match: { timestamp: { $gte: yesterday }, paymentStatus: 'paid' } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ["$total", 0] } }
        }
      }
    ]);

    // 2. Previous Stats (24h-48h ago for Growth)
    const prevStats = await Order.aggregate([
      { $match: { timestamp: { $gte: dayBefore, $lt: yesterday }, paymentStatus: 'paid' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ["$total", 0] } }
        }
      }
    ]);

    // 3. Active Tables (Any order not yet completed)
    const activeTablesData = await Order.distinct('table', {
      orderStatus: { $ne: 'completed' },
      table: { $ne: null }
    });

    const currentRevenue = stats.length > 0 ? stats[0].totalRevenue : 0;
    const prevRevenue = prevStats.length > 0 ? prevStats[0].totalRevenue : 0;
    const totalOrdersToday = stats.length > 0 ? stats[0].totalOrders : 0;

    // Calculate Growth %
    let growth = 0;
    if (prevRevenue > 0) {
      growth = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
    } else if (currentRevenue > 0) {
      growth = 100; // First sales!
    }

    console.log(`📈 Analytics Pulse | Today: ₹${currentRevenue}, Yesterday: ₹${prevRevenue}, Growth: ${growth.toFixed(1)}%`);

    // Popular items
    const popularItems = await Order.aggregate([
      { $match: { timestamp: { $gte: yesterday }, paymentStatus: 'paid' } },
      { $unwind: "$items" },
      { $group: { _id: "$items.name", count: { $sum: "$items.quantity" } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      totalOrdersToday,
      revenue: parseFloat(currentRevenue || 0).toFixed(2),
      activeTables: activeTablesData.length,
      growth: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
      popularItems
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`));

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
