class VoiceCallSimulator {
  constructor() {
    this.activeCalls = new Map();
    this.speechSynthesis = window.speechSynthesis || null;
  }

  async initiateCall(phoneNumber, context) {
    const callId = `call_${Date.now()}`;
    
    // Simulate call setup
    const call = {
      id: callId,
      phoneNumber,
      status: 'connecting',
      context,
      startTime: new Date(),
      conversation: []
    };
    
    this.activeCalls.set(callId, call);
    
    // Simulate connection delay
    setTimeout(() => {
      call.status = 'connected';
      this.startConversation(callId);
    }, 2000);
    
    return {
      callId,
      status: 'initiated',
      message: 'AI agent is calling you now...',
      estimatedWaitTime: '2-3 seconds'
    };
  }

  async startConversation(callId) {
    const call = this.activeCalls.get(callId);
    if (!call) return;
    
    const greeting = "Hello! I'm your AI Database Assistant. I understand you need help designing a database system. Can you tell me about your project?";
    
    call.conversation.push({
      speaker: 'ai',
      message: greeting,
      timestamp: new Date()
    });
    
    // Simulate AI speaking
    this.speakText(greeting);
    
    // Simulate user response after 5 seconds
    setTimeout(() => {
      this.simulateUserResponse(callId);
    }, 6000);
  }

  async simulateUserResponse(callId) {
    const call = this.activeCalls.get(callId);
    if (!call) return;
    
    const userResponses = [
      "I need a database for an e-commerce website with products, customers, and orders",
      "I'm building a blog platform and need tables for users, posts, and comments",
      "I want to create an inventory management system for my warehouse"
    ];
    
    const userResponse = userResponses[Math.floor(Math.random() * userResponses.length)];
    
    call.conversation.push({
      speaker: 'user',
      message: userResponse,
      timestamp: new Date()
    });
    
    // AI processes and responds
    setTimeout(() => {
      this.generateAIResponse(callId, userResponse);
    }, 2000);
  }

  async generateAIResponse(callId, userInput) {
    const call = this.activeCalls.get(callId);
    if (!call) return;
    
    let aiResponse = "";
    
    if (userInput.toLowerCase().includes('ecommerce') || userInput.toLowerCase().includes('e-commerce')) {
      aiResponse = "Perfect! For an e-commerce system, I recommend these core tables: Products with fields like name, price, description, and stock quantity. Customers with email, name, and address information. Orders to track purchases with customer ID, total amount, and order date. And Order Items to link products to orders. Would you like me to generate this schema and create the API endpoints for you?";
    } else if (userInput.toLowerCase().includes('blog')) {
      aiResponse = "Great choice! For a blog platform, you'll need: A Users table with username, email, and profile information. Posts table with title, content, author ID, and publication date. Comments table linking to posts and users with the comment text and timestamp. Categories table for organizing posts. I can create this complete database schema and generate REST API endpoints. Shall I proceed?";
    } else if (userInput.toLowerCase().includes('inventory')) {
      aiResponse = "Excellent! For inventory management, I suggest: Products table with SKU, name, description, and category. Warehouses table for multiple location support. Stock table linking products to warehouses with quantity and location details. Suppliers table for vendor management. Stock Movements table to track all inventory changes. I can build this entire system with real-time stock tracking APIs. Ready to generate it?";
    } else {
      aiResponse = "I understand you need a custom database solution. Based on your requirements, I can design the optimal schema structure and generate secure REST APIs with full CRUD operations. I'll also include authentication, data validation, and real-time capabilities. Would you like me to start creating your database schema now?";
    }
    
    call.conversation.push({
      speaker: 'ai',
      message: aiResponse,
      timestamp: new Date()
    });
    
    this.speakText(aiResponse);
    
    // End call after AI response
    setTimeout(() => {
      this.endCall(callId);
    }, aiResponse.length * 100); // Adjust timing based on response length
  }

  speakText(text) {
    if (!this.speechSynthesis) {
      console.log('Speech synthesis not supported');
      return;
    }
    
    // Cancel any ongoing speech
    this.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    // Try to use a more natural voice
    const voices = this.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || 
      voice.name.includes('Microsoft') ||
      voice.lang.startsWith('en')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    this.speechSynthesis.speak(utterance);
  }

  endCall(callId) {
    const call = this.activeCalls.get(callId);
    if (!call) return;
    
    call.status = 'completed';
    call.endTime = new Date();
    call.duration = call.endTime - call.startTime;
    
    const summary = "Thank you for using our AI Database Assistant! I'll now generate your database schema and API endpoints. You'll receive the complete solution in your dashboard shortly.";
    
    call.conversation.push({
      speaker: 'ai',
      message: summary,
      timestamp: new Date()
    });
    
    this.speakText(summary);
    
    return call;
  }

  getCallStatus(callId) {
    return this.activeCalls.get(callId);
  }

  getAllCalls() {
    return Array.from(this.activeCalls.values());
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceCallSimulator;
}