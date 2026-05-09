const mongoose = require('mongoose');

const cafeSettingsSchema = new mongoose.Schema({
    cafeName: { type: String, default: 'Ca Phe Bistro' },
    tagline: { type: String, default: 'Sip, Savour & Stay' },
    gstNumber: { type: String, default: '' },
    phone: { type: String, default: '' },
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
    heroHeadline: { type: String, default: 'Sip, Savour & Stay' },
    heroSubheadline: { type: String, default: 'Your neighbourhood café in Financial District' },
    heroCta: { type: String, default: 'Order Now' },
    aboutTitle: { type: String, default: 'Our Story' },
    aboutDescription: { type: String, default: 'Ca Phe Bistro was born from a love of Vietnamese coffee culture.' },
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
    notifReview: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('CafeSettings', cafeSettingsSchema);
