const mongoose = require('mongoose');

const cafeSettingsSchema = new mongoose.Schema({
    cafeName: { type: String, default: 'Cá Phê Bistro' },
    tagline: { type: String, default: 'Sip, Savour & Stay' },
    gstNumber: { type: String, default: '' },
    phone: { type: String, default: '+91 79811 44753' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    weekdayHours: { type: String, default: '8:30 AM – 11:00 PM' },
    weekendHours: { type: String, default: '8:30 AM – 11:30 PM' },
    instagram: { type: String, default: '' },
    website: { type: String, default: '' },
    googleMaps: { type: String, default: '' },
    gstRate: { type: Number, default: 5 },
    serviceCharge: { type: Number, default: 0 },
    invoicePrefix: { type: String, default: 'CPB-' },
    // CMS Content
    heroHeadline: { type: String, default: 'Cá Phê Bistro.' },
    heroSubheadline: { type: String, default: 'Signature Blends & Artisan Perfection' },
    heroCta: { type: String, default: 'Start Your Order' },
    aboutTitle: { type: String, default: 'Beyond The Daily Grind.' },
    aboutDescription: { type: String, default: "At Cá Phê Bistro, every cup tells a story. From bold Vietnamese phin coffee to refreshing cold brews and handcrafted classics, we serve rich flavors in a calm, welcoming space." },
    offerBannerText: { type: String, default: '☕ Happy Hours: 15% off from 3PM – 6PM' },
    offerBannerActive: { type: Boolean, default: true },
    // Ordering & Timings Controls
    isOrderingEnabled: { type: Boolean, default: true },
    openingTime: { type: String, default: '08:30' },
    closingTime: { type: String, default: '23:00' },
    // Notification Preferences
    notifNewOrder: { type: Boolean, default: true },
    notifLowStock: { type: Boolean, default: true },
    notifPayment: { type: Boolean, default: true },
    notifStaffCheckin: { type: Boolean, default: false },
    notifReview: { type: Boolean, default: true },
    // Gallery
    gallery: [
        {
            url: { type: String, default: 'https://res.cloudinary.com/dqxhjnhrt/image/upload/v1777901349/images_1_1.jpg_sit3hj.jpg' },
            caption: { type: String, default: 'The Golden Hour' },
            category: { type: String, default: 'Ambience' }
        },
        { url: { type: String, default: 'https://res.cloudinary.com/dqxhjnhrt/image/upload/v1777901349/image_2.avif' }, caption: { type: String, default: 'Brewing perfection' }, category: { type: String, default: 'Rituals' } },
        { url: { type: String, default: 'https://res.cloudinary.com/dqxhjnhrt/image/upload/v1777901349/image_3.webp' }, caption: { type: String, default: 'Freshly Baked' }, category: { type: String, default: 'Treats' } },
        { url: { type: String, default: 'https://res.cloudinary.com/dqxhjnhrt/image/upload/v1777901349/image_4.jpeg' }, caption: { type: String, default: 'Cozy Corners' }, category: { type: String, default: 'Ambience' } }
    ]
}, { timestamps: true });

module.exports = mongoose.model('CafeSettings', cafeSettingsSchema);
