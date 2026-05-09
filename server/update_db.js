require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cafe')
    .then(async () => {
        try {
            const settings = await mongoose.connection.collection('cafesettings').updateOne({}, { $set: { cafeName: 'Cá Phê Bistro', aboutDescription: 'Cá Phê Bistro was born from a love of Vietnamese coffee culture.', heroHeadline: 'Cá Phê Bistro.' } });
            console.log('Update result:', settings);
        } catch (e) { console.log(e); }
        mongoose.disconnect();
    })
    .catch(console.error);
