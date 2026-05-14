const Razorpay = require('razorpay');
require('dotenv').config({ override: true });

async function test() {
    console.log('--- Razorpay Standalone Test ---');
    const key_id = process.env.RAZORPAY_KEY_ID?.trim();
    const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (!key_id || !key_secret) {
        console.error('❌ Keys missing in .env!');
        process.exit(1);
    }

    const rzp = new Razorpay({ key_id, key_secret });

    console.log('Testing with ID:', key_id.slice(0, 8) + '...' + key_id.slice(-4));

    try {
        const orders = await rzp.orders.all({ count: 1 });
        console.log('✅ SUCCESS! API key is valid.');
        console.log('Fetched:', orders.items ? orders.items.length : 'N/A', 'orders');
    } catch (error) {
        console.error('❌ API ERROR!');
        console.log('Code:', error.statusCode);
        console.log('Message:', error.message);
        console.log('Description:', error.description);
        // Print full error for debugging
        if (error.statusCode === 401) {
            console.log('Reason: The Key ID or Secret is definitely wrong.');
        }
    }
}

test().catch(err => {
    console.error('🔥 CRITICAL SCRIPT ERROR:', err);
});
