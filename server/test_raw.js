const https = require('https');
require('dotenv').config({ override: true });

function testRaw() {
    console.log('--- Raw Razorpay API Test (HTTPS) ---');
    const id = process.env.RAZORPAY_KEY_ID?.trim();
    const secret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (!id || !secret) {
        console.log('Missing keys!');
        return;
    }

    const auth = Buffer.from(`${id}:${secret}`).toString('base64');

    const options = {
        hostname: 'api.razorpay.com',
        port: 443,
        path: '/v1/orders?count=1',
        method: 'GET',
        headers: {
            'Authorization': `Basic ${auth}`
        }
    };

    const req = https.request(options, (res) => {
        console.log('Status Code:', res.statusCode);
        console.log('Headers:', JSON.stringify(res.headers, null, 2));

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Response Body:', data);
        });
    });

    req.on('error', (error) => {
        console.error('HTTPS Error:', error);
    });

    req.end();
}

testRaw();
