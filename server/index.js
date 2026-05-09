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

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Clean up the CLIENT_URL to handle accidental trailing slashes or spaces
const clientUrl = process.env.CLIENT_URL?.trim().replace(/\/$/, "");
const allowedOrigins = [clientUrl, "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"].filter(Boolean);

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

// Stricter limiter for sensitive routes (Relaxed for development/testing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Allow 100 attempts per 15 mins (400 per hour)
  message: 'Too many login attempts, please try again after 15 minutes'
});
app.use('/api/auth/', authLimiter);
app.use('/api/payment/checkout', authLimiter);

const serverPort = process.env.PORT || 5000;
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow: no origin (server-to-server), known frontend origins, the
      // server's own origin (sent by Node.js socket.io-client), or any
      // kitchen bridge connection identified by its clientType query param.
      // Note: We cannot read handshake.query here (not available in CORS fn),
      // so we trust no-origin + server-origin connections as internal clients.
      if (
        !origin ||
        allowedOrigins.indexOf(origin) !== -1 ||
        origin === `http://localhost:${serverPort}` ||
        origin === `https://localhost:${serverPort}`
      ) {
        callback(null, true);
      } else {
        console.warn("🚫 Socket.io CORS BLOCKED origin:", origin);
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

// ─── KOT Print Bridge — Track the local print client connection ──────────────
let kitchenBridgeSocketId = null;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // ── Identify the Kitchen Print Bridge ──────────────────────────────────────
  if (socket.handshake.query.clientType === 'kitchen_bridge') {
    kitchenBridgeSocketId = socket.id;
    console.log('🖨️  Kitchen Bridge connected:', socket.id);
    // Broadcast to all admin clients that the printer is online
    io.emit('printer_status', { online: true });

    socket.on('disconnect', () => {
      console.log('🖨️  Kitchen Bridge disconnected:', socket.id);
      if (kitchenBridgeSocketId === socket.id) {
        kitchenBridgeSocketId = null;
      }
      // Broadcast to all admin clients that the printer is offline
      io.emit('printer_status', { online: false });
    });

    return; // Skip generic handlers for the bridge socket
  }

  // ── Generic client (admin dashboard, customer app) ────────────────────────
  socket.on('join:order', (orderId) => {
    socket.join(`order:${orderId}`);
    console.log(`Socket joined room order:${orderId}`);
  });

  // ── Admin requests a reprint — forward to the kitchen bridge ─────────────
  socket.on('admin_reprint_order', (order) => {
    if (kitchenBridgeSocketId) {
      console.log(`🔁 Reprint forwarded to bridge ${kitchenBridgeSocketId} for order ${order._id || order.billNumber}`);
      io.to(kitchenBridgeSocketId).emit('admin_reprint_order', order);
    } else {
      console.warn('⚠️  Reprint requested but Kitchen Bridge is not connected.');
    }
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

// Public order status check (for guest tracking - no auth needed)
app.get('/api/orders/status/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select('orderStatus paymentStatus _id');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ _id: order._id, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public full order detail (for guest tracking - returns all fields, no auth)
app.get('/api/orders/public/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected routes
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', protect, orderRoutes);
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

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.stack);
  
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred' 
    : err.message;

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`));

// ── Graceful Shutdown ────────────────────────────────────────────────────────
// io.close() must be called FIRST — socket.io keeps persistent WebSocket
// connections alive, which prevents server.close() from ever completing.
// The isShuttingDown guard prevents multiple Ctrl+C presses from stacking.
let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${signal} received — shutting down gracefully …`);

  // Hard-exit after 5 s in case something hangs
  const forceExit = setTimeout(() => {
    console.error('⚠️  Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 5000);
  forceExit.unref(); // Don't let this timer itself keep the process alive

  // 1. Close all socket.io connections so server.close() can complete
  io.close(() => {
    console.log('Socket.io connections closed.');

    // 2. Stop accepting new HTTP connections
    server.close(() => {
      console.log('HTTP server closed.');

      // 3. Close MongoDB
      mongoose.connection.close().then(() => {
        console.log('MongoDB connection closed.');
        clearTimeout(forceExit);
        process.exit(0);
      }).catch((err) => {
        console.error('MongoDB close error:', err.message);
        process.exit(1);
      });
    });
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

