const http = require('http');

http.get('http://localhost:5000/api/menu', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Headers:', res.headers);
        console.log('Body:', data);
    });
}).on('error', (err) => {
    console.log('Error:', err.message);
});

http.get('http://localhost:5000/api/auth/me', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Auth Status:', res.statusCode);
        console.log('Auth Headers:', res.headers);
        console.log('Auth Body:', data);
    });
}).on('error', (err) => {
    console.log('Auth Error:', err.message);
});
