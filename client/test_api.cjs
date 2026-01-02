const axios = require('axios');

async function test() {
    try {
        console.log('Testing Mock Login...');
        const loginRes = await axios.post('http://localhost:3001/api/auth/mock-login', {
            email: 'test@example.com',
            name: 'Test User'
        });
        console.log('Login:', loginRes.data);
        
        console.log('Testing Stock Quote...');
        const quoteRes = await axios.get('http://localhost:3001/api/stock/AAPL');
        console.log('Quote:', quoteRes.data);

    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}

test();
