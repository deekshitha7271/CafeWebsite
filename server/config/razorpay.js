const Razorpay = require('razorpay');

const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

if (!RZP_KEY_ID || !RZP_KEY_SECRET) {
    console.error('❌ RAZORPAY ERROR: Keys missing in .env');
}

const razorpay = new Razorpay({
    key_id: RZP_KEY_ID,
    key_secret: RZP_KEY_SECRET,
});

const serverBirthmark = Math.random().toString(36).substring(7).toUpperCase();

console.log(`🚀 [SERVER-${serverBirthmark}] Startup Successful`);
console.log(`💳 RAZORPAY INIT: ${RZP_KEY_ID?.startsWith('rzp_test') ? 'TEST' : 'LIVE'} mode`);
console.log(`   - ID: ...${RZP_KEY_ID?.slice(-4)}`);
if (RZP_KEY_SECRET?.length < 15) {
    console.warn('⚠️  WARNING: Your RAZORPAY_KEY_SECRET looks too short! Is it the API Secret or a Webhook Secret?');
}

// Fail-Fast: Verify keys on startup
razorpay.orders.all({ count: 1 }).then(() => {
    console.log('✅ RAZORPAY PING: Credentials verified and active.');
}).catch((err) => {
    console.error('❌ RAZORPAY PING FAILED: Your API keys are EXPIRED or INVALID.');
    console.error(`   Error details: ${err.message || 'Check your Dashboard'}`);
});

module.exports = { razorpay, RZP_KEY_ID, serverBirthmark };
