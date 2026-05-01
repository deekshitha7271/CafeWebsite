const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cafe-website');
    const MenuItem = require('./models/MenuItem');
    const count = await MenuItem.countDocuments();
    console.log(`TOTAL_ITEMS: ${count}`);
    const sample = await MenuItem.findOne().lean();
    console.log('SAMPLE:', JSON.stringify(sample));
    process.exit(0);
}
check();
