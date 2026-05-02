const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Order = require('./models/Order');
    
    // Find orders where the ID ends with 028d7b
    const orders = await Order.find({}).lean();
    const targetOrder = orders.find(o => o._id.toString().endsWith('028d7b'));
    
    if (targetOrder) {
        console.log('ORDER FOUND:');
        console.log(JSON.stringify(targetOrder, null, 2));
    } else {
        console.log('ORDER NOT FOUND. Listing last 5 orders:');
        const lastOrders = await Order.find().sort({ timestamp: -1 }).limit(5).lean();
        console.log(JSON.stringify(lastOrders, null, 2));
    }
    process.exit(0);
}
check();
