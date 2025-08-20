// Test script for call functionality
const fetch = require('node-fetch');

async function testCallEndpoint() {
    console.log('🧪 Testing call functionality...\n');
    
    try {
        const response = await fetch('http://localhost:3000/api/request-call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber: '+1234567890',
                purpose: 'Test call',
                sessionId: 'test_session'
            })
        });
        
        const result = await response.json();
        
        console.log('📞 Call Request Response:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('\n✅ Call functionality is working!');
            console.log(`📞 Call Type: ${result.type}`);
            console.log(`⏱️  Estimated Time: ${result.estimatedCallTime}`);
        } else {
            console.log('\n❌ Call request failed');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n💡 Make sure the server is running: npm start');
    }
}

async function testHealthEndpoint() {
    try {
        const response = await fetch('http://localhost:3000/health');
        const health = await response.json();
        
        console.log('\n🏥 Health Check:');
        console.log(JSON.stringify(health, null, 2));
        
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
    }
}

// Run tests
async function runTests() {
    await testHealthEndpoint();
    await testCallEndpoint();
}

runTests();