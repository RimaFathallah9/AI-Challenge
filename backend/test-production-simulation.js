const axios = require('axios');

async function testProductionSimulation() {
    try {
        // Login first
        console.log('Logging in...');
        const login = await axios.post('http://localhost:4000/api/auth/login', {
            email: 'test@gmail.com',
            password: 'test'
        });
        
        const token = login.data.accessToken;
        console.log('✓ Got token');
        
        // Get all machines first
        console.log('\nGetting machines...');
        const machinesRes = await axios.get('http://localhost:4000/api/machines', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const machines = machinesRes.data;
        console.log('Machines response:', JSON.stringify(machines, null, 2));
        console.log(`✓ Found ${machines.length || 0} machines`);
        
        if (machines.length === 0) {
            console.log('⚠️ No machines found. Cannot test production simulation.');
            return;
        }
        
        const firstMachine = machines[0];
        console.log(`Testing with machine: ${firstMachine.name} (ID: ${firstMachine.id})`);
        
        // Test production simulation
        console.log('\nTesting production simulation...');
        const simRes = await axios.post(
            `http://localhost:4000/api/digital-twin/machines/${firstMachine.id}/simulate-production`,
            {
                operationHours: 24,
                targetProduction: 1000,
                materialType: 'steel',
                materialQuantity: 500
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        
        console.log('✓ Production simulation succeeded!');
        console.log('\nResponse:');
        console.log(JSON.stringify(simRes.data, null, 2));
        
    } catch (err) {
        if (err.response) {
            console.error('❌ Server responded with error:');
            console.error(`Status: ${err.response.status}`);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('❌ Network error:', err.message);
        }
    }
}

testProductionSimulation();
