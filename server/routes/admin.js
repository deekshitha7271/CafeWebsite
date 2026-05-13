const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const CafeSettings = require('../models/CafeSettings');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for local storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `img-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp|avif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Only images are allowed'));
    }
});

// ============================================================
// DASHBOARD ANALYTICS
// ============================================================
router.get('/dashboard', async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
        const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);

        // Today's stats
        const [todayStats] = await Order.aggregate([
            { $match: { timestamp: { $gte: startOfToday } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } },
                    totalOrders: { $sum: 1 },
                    cancelledOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] } }
                }
            }
        ]);

        // Monthly revenue (Current month)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [monthStats] = await Order.aggregate([
            { $match: { timestamp: { $gte: startOfMonth }, paymentStatus: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
        ]);

        // Monthly Historical Revenue (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const monthlyHistorical = await Order.aggregate([
            { $match: { timestamp: { $gte: sixMonthsAgo }, paymentStatus: 'paid' } },
            {
                $group: {
                    _id: { year: { $year: '$timestamp' }, month: { $month: '$timestamp' } },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Yesterday revenue for growth comparison
        const [yesterdayStats] = await Order.aggregate([
            { $match: { timestamp: { $gte: startOfYesterday, $lt: startOfToday }, paymentStatus: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
        ]);

        // Active orders (not completed/cancelled)
        const activeOrders = await Order.countDocuments({ orderStatus: { $in: ['placed', 'preparing', 'ready'] } });

        // Customers today (unique users/names)
        const customersToday = await Order.distinct('customerName', { timestamp: { $gte: startOfToday }, customerName: { $ne: null } });

        // Weekly revenue (last 7 days grouped by IST date)
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +5:30 in ms
        const weeklyRevenue = await Order.aggregate([
            { $match: { timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, paymentStatus: 'paid' } },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$timestamp',
                            timezone: '+05:30'
                        }
                    },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Peak hours today
        const peakHours = await Order.aggregate([
            { $match: { timestamp: { $gte: startOfToday } } },
            { $group: { _id: { $hour: '$timestamp' }, orders: { $sum: 1 } } },
            { $sort: { '_id': 1 } }
        ]);

        // Top selling items (last 30 days)
        const topItems = await Order.aggregate([
            { $match: { timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, paymentStatus: 'paid' } },
            { $unwind: '$items' },
            { $group: { _id: '$items.name', value: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
            { $sort: { value: -1 } },
            { $limit: 5 }
        ]);

        // Order status counts
        const statusCounts = await Order.aggregate([
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
        ]);

        // Recent activity (last 20 orders)
        const recentActivity = await Order.find()
            .sort({ timestamp: -1 })
            .limit(20)
            .select('customerName orderStatus paymentStatus total timestamp orderType billNumber');

        // Inventory alerts
        const lowStockItems = await Inventory.find().then(items =>
            items.filter(i => i.stock <= i.minStock)
        );

        const currentRevenue = todayStats?.totalRevenue || 0;
        const prevRevenue = yesterdayStats?.totalRevenue || 0;
        let growth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : currentRevenue > 0 ? 100 : 0;

        res.json({
            kpis: {
                totalRevenue: currentRevenue,
                monthlyRevenue: monthStats?.totalRevenue || 0,
                totalOrders: todayStats?.totalOrders || 0,
                activeOrders,
                customersToday: customersToday.length,
                cancelledOrders: todayStats?.cancelledOrders || 0,
                revenueGrowth: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`
            },
            weeklyRevenue: weeklyRevenue.map(d => {
                const [year, month, day] = d._id.split('-').map(Number);
                return {
                    day: `${day} ${monthNames[month - 1]}`,
                    revenue: d.revenue,
                    orders: d.orders
                };
            }),
            monthlyTrend: monthlyHistorical.map(m => ({
                month: monthNames[m._id.month - 1],
                revenue: m.revenue,
                orders: m.orders
            })),
            peakHours: peakHours.map(h => ({ hour: `${h._id}:00`, orders: h.orders })),
            topItems: topItems.map((item, i) => ({
                name: item._id,
                value: item.value,
                revenue: item.revenue,
                color: ['#F59E0B', '#FBBF24', '#D97706', '#92400E', '#78350F'][i]
            })),
            statusCounts: statusCounts.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
            recentActivity,
            lowStockAlerts: lowStockItems.length
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// CUSTOMERS
// ============================================================
router.get('/customers', async (req, res) => {
    try {
        const users = await User.find({ role: 'customer' }).sort({ createdAt: -1 });
        const customerData = await Promise.all(users.map(async (u) => {
            const stats = await Order.aggregate([
                { $match: { user: u._id } },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalSpent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } },
                        lastOrder: { $max: '$timestamp' }
                    }
                }
            ]);
            const s = stats[0] || { totalOrders: 0, totalSpent: 0, lastOrder: null };
            return {
                _id: u._id,
                name: u.name,
                email: u.email,
                phone: u.phone || '',
                orders: s.totalOrders,
                spent: s.totalSpent,
                last: s.lastOrder ? new Date(s.lastOrder).toLocaleDateString() : 'Never',
                points: Math.floor(s.totalSpent / 20), // 1 point per ₹20
                tag: s.totalSpent > 15000 ? 'Platinum' : s.totalSpent > 8000 ? 'VIP' : s.totalOrders > 5 ? 'Regular' : 'New'
            };
        }));
        res.json(customerData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// INVENTORY
// ============================================================
router.get('/inventory', async (req, res) => {
    try {
        const items = await Inventory.find().sort({ updatedAt: -1 });
        const enriched = items.map(item => ({
            ...item.toObject(),
            status: item.stock <= item.minStock * 0.5 ? 'critical' : item.stock <= item.minStock ? 'warning' : 'good',
            lastRestocked: item.lastRestocked ? new Date(item.lastRestocked).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Never'
        }));
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/inventory', async (req, res) => {
    try {
        const item = new Inventory(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/inventory/:id', async (req, res) => {
    try {
        const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(item);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/inventory/:id/restock', async (req, res) => {
    try {
        const { quantity } = req.body;
        const item = await Inventory.findByIdAndUpdate(
            req.params.id,
            { $inc: { stock: quantity }, lastRestocked: new Date() },
            { new: true }
        );
        res.json(item);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/inventory/:id', async (req, res) => {
    try {
        await Inventory.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ============================================================
// ANALYTICS
// ============================================================
router.get('/analytics', async (req, res) => {
    try {
        // Monthly revenue (last 7 months)
        const monthlyStats = await Order.aggregate([
            { $match: { timestamp: { $gte: new Date(Date.now() - 7 * 30 * 24 * 60 * 60 * 1000) }, paymentStatus: 'paid' } },
            {
                $group: {
                    _id: { year: { $year: '$timestamp' }, month: { $month: '$timestamp' } },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                    profit: { $sum: { $multiply: ['$total', 0.38] } }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Platform breakdown (based on orderType)
        const platformData = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: '$orderType', orders: { $sum: 1 }, revenue: { $sum: '$total' } } }
        ]);

        // Top items (all time)
        const topItems = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $unwind: '$items' },
            { $group: { _id: '$items.name', orders: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
            { $sort: { revenue: -1 } },
            { $limit: 5 }
        ]);

        // Overall KPIs
        const [overall] = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalOrders: { $sum: 1 } } }
        ]);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        res.json({
            kpis: {
                totalRevenue: overall?.totalRevenue || 0,
                totalOrders: overall?.totalOrders || 0,
                netProfit: (overall?.totalRevenue || 0) * 0.38,
                onlineOrders: platformData.filter(p => p._id !== 'dinein-qr').reduce((a, p) => a + p.orders, 0)
            },
            monthlyData: monthlyStats.map(m => ({
                month: monthNames[m._id.month - 1],
                revenue: m.revenue,
                orders: m.orders,
                profit: Math.round(m.profit)
            })),
            platformData: platformData.map(p => ({
                platform: p._id === 'dinein-qr' ? 'Dine-In QR' : p._id === 'dinein-web' ? 'Website' : 'Takeaway',
                orders: p.orders,
                revenue: p.revenue
            })),
            topItems: topItems.map((item, i) => ({
                name: item._id,
                orders: item.orders,
                revenue: item.revenue,
                growth: '+' + (10 + i * 5) + '%'
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// PAYMENTS
// ============================================================
router.get('/payments', async (req, res) => {
    try {
        const orders = await Order.find({ paymentStatus: { $in: ['paid', 'pending', 'failed'] } })
            .sort({ timestamp: -1 })
            .limit(100)
            .populate('user', 'name');

        const transactions = orders.map(o => ({
            _id: o._id,
            orderId: o.billNumber || `#${o._id.toString().slice(-4).toUpperCase()}`,
            customer: o.customerName || o.user?.name || 'Walk-in',
            phone: o.customerPhone || '',
            amount: o.total,
            method: 'Online', // Always Online as we only use Stripe for this setup
            status: o.paymentStatus,
            orderType: o.orderType || 'dinein-web',
            items: o.items || [],
            time: new Date(o.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }),
            gst: parseFloat((o.total * 0.05).toFixed(2))
        }));

        const totalRevenue = orders.filter(o => o.paymentStatus === 'paid').reduce((a, o) => a + o.total, 0);
        const totalGST = totalRevenue * 0.05;

        res.json({ transactions, totalRevenue, totalGST });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// STAFF (admin users from the User collection)
// ============================================================
router.get('/staff', async (req, res) => {
    try {
        const staff = await User.find({ role: { $in: ['admin', 'worker'] } }).sort({ createdAt: -1 });
        res.json(staff.map(s => ({
            _id: s._id,
            name: s.name,
            email: s.email,
            role: s.role === 'admin' ? 'Manager' : 'Worker',
            phone: s.phone || '',
            shift: s.shift || '9AM - 6PM',
            salary: s.salary || 0,
            status: s.status || 'present',
            joined: new Date(s.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
            avatar: s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/staff', async (req, res) => {
    try {
        const { name, email, password, role, phone, shift, salary, status } = req.body;
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: 'Email already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password || 'password123', salt);

        const user = new User({
            name, email, password: hashedPassword, role: role === 'Manager' ? 'admin' : 'worker', phone, shift, salary, status
        });
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/staff/:id', async (req, res) => {
    try {
        if (req.body.role) {
            req.body.role = req.body.role === 'Manager' ? 'admin' : 'worker';
        }
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            req.body.password = await bcrypt.hash(req.body.password, salt);
        } else {
            delete req.body.password;
        }
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/staff/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ============================================================
// NOTIFICATIONS
// ============================================================
router.get('/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/notifications/read-all', async (req, res) => {
    try {
        await Notification.updateMany({ read: false }, { read: true });
        res.json({ message: 'All marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/notifications/:id', async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ============================================================
// COUPONS
// ============================================================
router.get('/coupons', async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json(coupons);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/coupons', async (req, res) => {
    try {
        const coupon = new Coupon(req.body);
        await coupon.save();
        res.status(201).json(coupon);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/coupons/:id', async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(coupon);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/coupons/:id', async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ============================================================
// REVIEWS
// ============================================================
router.get('/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/reviews', async (req, res) => {
    try {
        const review = new Review(req.body);
        await review.save();
        res.status(201).json(review);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/reviews/:id', async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(review);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ============================================================
// SETTINGS
// ============================================================
router.get('/settings', async (req, res) => {
    try {
        let settings = await CafeSettings.findOne();
        if (!settings) {
            settings = new CafeSettings();
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/settings', async (req, res) => {
    try {
        let settings = await CafeSettings.findOne();
        if (!settings) {
            settings = new CafeSettings(req.body);
        } else {
            Object.assign(settings, req.body);
        }
        await settings.save();
        res.json(settings);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const url = `${baseUrl}/uploads/${req.file.filename}`;
        res.json({ url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// CUSTOMER REVIEWS
// ============================================================
router.get('/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
