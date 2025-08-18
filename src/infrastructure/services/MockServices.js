// Mock services for testing without paid APIs

class MockAnthropicService {
  async convertToSQL(query, tableSchemas) {
    // Simulate Claude SQL generation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockResponses = {
      'products': 'SELECT * FROM products WHERE price > 100',
      'customers': 'SELECT * FROM customers WHERE created_at > NOW() - INTERVAL \'30 days\'',
      'orders': 'SELECT o.*, c.name FROM orders o JOIN customers c ON o.customer_id = c.id'
    };
    
    const sql = mockResponses[Object.keys(mockResponses)[0]] || 'SELECT * FROM table_name';
    
    return {
      sql,
      explanation: `Mock SQL query for: ${query}`,
      tables_used: ['products'],
      complexity: 'low'
    };
  }
}

class MockAzureSpeechService {
  async transcribe(audioBuffer) {
    // Simulate speech-to-text
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockTranscripts = [
      'I need a database for an e-commerce system with products, customers, and orders',
      'Create a blog database with users, posts, and comments',
      'Design a inventory management system with warehouses and stock items'
    ];
    
    return mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
  }

  async synthesize(text) {
    // Simulate text-to-speech
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock audio buffer
    return Buffer.from('mock_audio_data_' + text.substring(0, 10));
  }
}

class MockTwilioService {
  async initiateCall(phoneNumber, context) {
    // Simulate call initiation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      callId: `mock_call_${Date.now()}`,
      status: 'initiated',
      message: 'Mock call initiated - real Twilio integration requires payment'
    };
  }

  generateTwiMLResponse(transcript) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Mock response: I understand you need help with database design. This is a simulation.</Say>
    <Gather input="speech" action="/api/voice/process">
        <Say>Please describe your database requirements.</Say>
    </Gather>
</Response>`;
  }
}

module.exports = {
  MockAnthropicService,
  MockAzureSpeechService,
  MockTwilioService
};