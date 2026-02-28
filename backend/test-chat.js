const axios = require('axios');

async function testChat() {
    try {
        // Need to login first to get a token, or we can just mock it if we bypass auth.
        // Wait, the chat endpoint requires authentication! 
        // Let's login first.
        const login = await axios.post('http://localhost:4000/api/auth/login', {
            email: 'test@gmail.com',
            password: 'test'
        });
        
        const token = login.data.accessToken;
        
        console.log('Got token. Testing chat endpoint...');
        const res = await axios.post('http://localhost:4000/api/ai/chat', {
            message: 'Hello'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Success!', res.data);
    } catch (err) {
        if (err.response) {
            console.error('Server responded with error:', err.response.status, err.response.data);
        } else {
            console.error('Network error:', err.message);
        }
    }
}

testChat();
