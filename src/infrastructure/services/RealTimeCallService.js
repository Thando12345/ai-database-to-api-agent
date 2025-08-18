const twilio = require('twilio');

class RealTimeCallService {
    constructor() {
        this.twilioSid = process.env.TWILIO_SID;
        this.twilioToken = process.env.TWILIO_AUTH_TOKEN;
        this.twilioPhone = process.env.TWILIO_PHONE_NUMBER;
        this.baseUrl = process.env.BASE_URL || 'https://your-domain.com';
        
        this.client = (this.twilioSid && this.twilioSid.startsWith('AC')) ? twilio(this.twilioSid, this.twilioToken) : null;
        this.activeCalls = new Map();
    }

    async initiateRealCall(phoneNumber, context = {}) {
        if (!this.client) {
            throw new Error('Twilio not configured - using simulation mode');
        }

        try {
            // Create TwiML for the call
            const twimlUrl = `${this.baseUrl}/api/voice/twiml?context=${encodeURIComponent(JSON.stringify(context))}`;
            
            const call = await this.client.calls.create({
                to: phoneNumber,
                from: this.twilioPhone,
                url: twimlUrl,
                method: 'POST',
                statusCallback: `${this.baseUrl}/api/voice/status`,
                statusCallbackMethod: 'POST',
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                record: true,
                recordingStatusCallback: `${this.baseUrl}/api/voice/recording-status`
            });

            const callData = {
                id: call.sid,
                phoneNumber,
                status: 'initiated',
                twilioSid: call.sid,
                context,
                startTime: new Date(),
                conversation: []
            };

            this.activeCalls.set(call.sid, callData);

            return {
                success: true,
                callId: call.sid,
                status: 'initiated',
                message: 'Real call initiated - your phone will ring shortly',
                estimatedRingTime: '5-10 seconds'
            };

        } catch (error) {
            console.error('Twilio call error:', error);
            throw new Error(`Call failed: ${error.message}`);
        }
    }

    generateTwiML(context = {}) {
        const VoiceResponse = twilio.twiml.VoiceResponse;
        const twiml = new VoiceResponse();

        // Initial greeting
        twiml.say({
            voice: 'alice',
            language: 'en-US'
        }, 'Hello! I am your AI Database Assistant. I understand you need help designing a database system.');

        // Gather user input
        const gather = twiml.gather({
            input: 'speech',
            timeout: 10,
            speechTimeout: 'auto',
            action: `${this.baseUrl}/api/voice/process-speech`,
            method: 'POST'
        });

        gather.say({
            voice: 'alice',
            language: 'en-US'
        }, 'Please describe your database requirements. For example, tell me about the type of application you are building and what data you need to store.');

        // Fallback if no input
        twiml.say({
            voice: 'alice',
            language: 'en-US'
        }, 'I did not receive your input. Let me help you with a sample database design.');

        twiml.redirect(`${this.baseUrl}/api/voice/continue`);

        return twiml.toString();
    }

    async processSpeechInput(speechResult, callSid) {
        const call = this.activeCalls.get(callSid);
        if (!call) {
            throw new Error('Call not found');
        }

        const userInput = speechResult.SpeechResult || speechResult.speech || '';
        
        call.conversation.push({
            speaker: 'user',
            message: userInput,
            timestamp: new Date(),
            confidence: speechResult.Confidence || 0.8
        });

        // Generate AI response based on user input
        const aiResponse = await this.generateAIResponse(userInput, call.context);
        
        call.conversation.push({
            speaker: 'ai',
            message: aiResponse,
            timestamp: new Date()
        });

        // Create TwiML response
        const VoiceResponse = twilio.twiml.VoiceResponse;
        const twiml = new VoiceResponse();

        twiml.say({
            voice: 'alice',
            language: 'en-US'
        }, aiResponse);

        // Ask for confirmation or more input
        const gather = twiml.gather({
            input: 'speech',
            timeout: 8,
            speechTimeout: 'auto',
            action: `${this.baseUrl}/api/voice/confirm`,
            method: 'POST'
        });

        gather.say({
            voice: 'alice',
            language: 'en-US'
        }, 'Would you like me to generate the database schema and API for you now? Say yes to proceed or describe any changes you need.');

        return twiml.toString();
    }

    async generateAIResponse(userInput, context) {
        // Analyze user input and generate appropriate response
        const input = userInput.toLowerCase();
        
        if (input.includes('ecommerce') || input.includes('e-commerce') || input.includes('shop')) {
            return "Perfect! For an e-commerce system, I recommend creating tables for Products with fields like name, price, description, and inventory. Customers table with email, name, and shipping address. Orders table to track purchases with customer ID, total amount, and order status. And Order Items table to link products to orders with quantities. This will give you a solid foundation for your online store.";
        } else if (input.includes('blog') || input.includes('content') || input.includes('post')) {
            return "Excellent! For a blog platform, you'll need a Users table with username, email, and profile information. Posts table with title, content, author ID, and publication date. Comments table linking to posts and users. Categories table for organizing content. And Tags table for flexible content labeling. This structure will support a full-featured blogging platform.";
        } else if (input.includes('inventory') || input.includes('warehouse') || input.includes('stock')) {
            return "Great choice! For inventory management, I suggest a Products table with SKU, name, description, and category. Warehouses table for multiple locations. Stock Levels table linking products to warehouses with quantities. Suppliers table for vendor information. And Stock Movements table to track all inventory changes with timestamps and reasons.";
        } else if (input.includes('social') || input.includes('user') || input.includes('profile')) {
            return "Wonderful! For a social platform, you'll need Users table with profiles and authentication. Posts table for user content with text, images, and timestamps. Likes table linking users to posts. Follows table for user relationships. Messages table for direct communication. And Notifications table to keep users engaged.";
        } else {
            return "I understand you need a custom database solution. Based on your requirements, I can design tables with proper relationships, primary keys, foreign keys, and indexes. I'll also generate secure REST API endpoints with authentication, data validation, and full CRUD operations. The system will be optimized for performance and scalability.";
        }
    }

    async handleCallStatus(callSid, status, data) {
        const call = this.activeCalls.get(callSid);
        if (call) {
            call.status = status;
            call.lastUpdate = new Date();
            
            if (data.Duration) {
                call.duration = parseInt(data.Duration);
            }
            
            if (status === 'completed') {
                call.endTime = new Date();
                // Trigger schema generation
                setTimeout(() => {
                    this.generateSchemaFromCall(callSid);
                }, 1000);
            }
        }
        
        return { success: true, status };
    }

    async generateSchemaFromCall(callSid) {
        const call = this.activeCalls.get(callSid);
        if (!call) return;

        const userMessages = call.conversation
            .filter(msg => msg.speaker === 'user')
            .map(msg => msg.message)
            .join(' ');

        // Generate schema based on conversation
        const schema = this.createSchemaFromConversation(userMessages);
        
        call.generatedSchema = schema;
        
        // Notify frontend via WebSocket or callback
        // This would integrate with your existing WebSocket system
        return schema;
    }

    createSchemaFromConversation(conversation) {
        const input = conversation.toLowerCase();
        
        if (input.includes('ecommerce') || input.includes('shop')) {
            return {
                name: 'ecommerce_database',
                tables: [
                    {
                        name: 'products',
                        columns: ['id UUID PRIMARY KEY', 'name VARCHAR(255)', 'price DECIMAL(10,2)', 'description TEXT', 'stock_quantity INTEGER']
                    },
                    {
                        name: 'customers',
                        columns: ['id UUID PRIMARY KEY', 'email VARCHAR(255) UNIQUE', 'first_name VARCHAR(100)', 'last_name VARCHAR(100)', 'phone VARCHAR(20)']
                    },
                    {
                        name: 'orders',
                        columns: ['id UUID PRIMARY KEY', 'customer_id UUID REFERENCES customers(id)', 'total DECIMAL(10,2)', 'status VARCHAR(50)', 'created_at TIMESTAMP']
                    }
                ]
            };
        }
        
        // Default schema
        return {
            name: 'custom_database',
            tables: [
                {
                    name: 'entities',
                    columns: ['id UUID PRIMARY KEY', 'name VARCHAR(255)', 'description TEXT', 'created_at TIMESTAMP']
                }
            ]
        };
    }

    getCallStatus(callSid) {
        return this.activeCalls.get(callSid);
    }

    async endCall(callSid) {
        if (this.client) {
            try {
                await this.client.calls(callSid).update({ status: 'completed' });
            } catch (error) {
                console.error('Error ending call:', error);
            }
        }
        
        const call = this.activeCalls.get(callSid);
        if (call) {
            call.status = 'completed';
            call.endTime = new Date();
        }
        
        return { success: true };
    }
}

module.exports = RealTimeCallService;