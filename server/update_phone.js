const mongoose = require('mongoose');
require('dotenv').config();
const CafeSettings = require('./models/CafeSettings');

async function update() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const result = await CafeSettings.updateOne({}, { $set: { phone: '+91 79811 44753' } });
        console.log('Update result:', result);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

update();
