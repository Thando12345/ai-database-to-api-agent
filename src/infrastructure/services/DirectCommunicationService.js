const twilio = require('twilio');

class DirectCommunicationService {
    constructor() {
        this.twilioSid = process.env.TWILIO_SID;
        this.twilioToken = process.env.TWILIO_AUTH_TOKEN;
        this.twilioPhone = process.env.TWILIO_PHONE_NUMBER;
        this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        
        this.client = (this.twilioSid && this.twilioSid.startsWith('AC')) ? twilio(this.twilioSid, this.twilioToken) : null;
        this.activeConnections = new Map();
        this.chatSessions = new Map();
    }

    // Initiate video call
    async initiateVideoCall(phoneNumber, userContext = {}) {
        if (!this.client) {
            return this.mockVideoCall(phoneNumber);
        }

        try {
            // Create video room
            const room = await this.client.video.rooms.create({
                uniqueName: `database-consultation-${Date.now()}`,
                type: 'peer-to-peer',
                maxParticipants: 2
            });

            // Send SMS with video link
            await this.client.messages.create({
                body: `Join your AI Database Consultation: ${this.baseUrl}/video/${room.sid}`,
                from: this.twilioPhone,
                to: phoneNumber
            });

            const connectionData = {
                id: room.sid,
                type: 'video',
                phoneNumber,
                roomSid: room.sid,
                status: 'initiated',
                context: userContext,
                startTime: new Date()
            };

            this.activeConnections.set(room.sid, connectionData);

            return {
                success: true,
                connectionId: room.sid,
                roomSid: room.sid,
                videoUrl: `${this.baseUrl}/video/${room.sid}`,
                message: 'Video call initiated - check your SMS for the link',
                type: 'video'
            };

        } catch (error) {
            console.error('Video call error:', error);
            return this.mockVideoCall(phoneNumber);
        }
    }

    // Start instant chat session
    async startChatSession(userId, context = {}) {
        const sessionId = `chat_${Date.now()}_${userId}`;
        
        const chatSession = {
            id: sessionId,
            userId,
            type: 'chat',
            status: 'active',
            context,
            messages: [],
            startTime: new Date()
        };

        this.chatSessions.set(sessionId, chatSession);

        // Send welcome message
        const welcomeMessage = await this.generateWelcomeMessage(context);
        chatSession.messages.push({
            id: Date.now(),
            sender: 'ai',
            message: welcomeMessage,
            timestamp: new Date()
        });

        return {
            success: true,
            sessionId,
            welcomeMessage,
            type: 'chat'
        };
    }

    // Process chat message
    async processChatMessage(sessionId, userMessage) {
        const session = this.chatSessions.get(sessionId);
        if (!session) {
            throw new Error('Chat session not found');
        }

        // Add user message
        session.messages.push({
            id: Date.now(),
            sender: 'user',
            message: userMessage,
            timestamp: new Date()
        });

        // Generate AI response
        const aiResponse = await this.generateAIResponse(userMessage, session.context);
        
        session.messages.push({
            id: Date.now() + 1,
            sender: 'ai',
            message: aiResponse,
            timestamp: new Date()
        });

        return {
            success: true,
            response: aiResponse,
            sessionId
        };
    }

    // Generate access token for video
    generateVideoToken(roomSid, identity) {
        if (!this.client) {
            return null;
        }

        const AccessToken = twilio.jwt.AccessToken;
        const VideoGrant = AccessToken.VideoGrant;

        const token = new AccessToken(
            this.twilioSid,
            process.env.TWILIO_API_KEY || 'your_api_key',
            process.env.TWILIO_API_SECRET || 'your_api_secret'
        );

        token.identity = identity;
        const grant = new VideoGrant({ room: roomSid });
        token.addGrant(grant);

        return token.toJwt();
    }

    async generateWelcomeMessage(context) {
        const messages = [
            "Hello! I'm your AI Database Assistant. I'm here to help you design and build your database system. What kind of application are you working on?",
            "Hi there! I specialize in transforming your ideas into working database schemas and APIs. Tell me about your project - what data do you need to manage?",
            "Welcome! I can help you create a complete database solution from scratch. Whether it's e-commerce, social media, or any custom application - let's get started!"
        ];

        return messages[Math.floor(Math.random() * messages.length)];
    }

    async generateAIResponse(userMessage, context) {
        const input = userMessage.toLowerCase();
        
        // Database-specific responses
        if (input.includes('ecommerce') || input.includes('shop') || input.includes('store')) {
            return "Perfect! For an e-commerce platform, I recommend these core tables: **Products** (id, name, price, description, category), **Customers** (id, email, name, address), **Orders** (id, customer_id, total, status), and **Order_Items** (id, order_id, product_id, quantity). Would you like me to generate the complete schema with relationships?";
        }
        
        if (input.includes('blog') || input.includes('content') || input.includes('post')) {
            return "Excellent choice! For a blog platform, you'll need: **Users** (id, username, email, profile), **Posts** (id, title, content, author_id, published_at), **Comments** (id, post_id, user_id, content), and **Categories** (id, name, description). I can also add tags and media management. Shall I create this schema for you?";
        }
        
        if (input.includes('social') || input.includes('network') || input.includes('friend')) {
            return "Great! For a social network, the key tables are: **Users** (id, username, email, bio, avatar), **Posts** (id, user_id, content, media_url), **Likes** (id, user_id, post_id), **Follows** (id, follower_id, following_id), and **Messages** (id, sender_id, receiver_id, content). Want me to build this with real-time features?";
        }
        
        if (input.includes('inventory') || input.includes('warehouse') || input.includes('stock')) {
            return "Perfect for inventory management! You'll need: **Products** (id, sku, name, description), **Warehouses** (id, name, location), **Stock_Levels** (id, product_id, warehouse_id, quantity), **Suppliers** (id, name, contact), and **Stock_Movements** (id, product_id, type, quantity, timestamp). Should I include barcode scanning support?";
        }
        
        if (input.includes('generate') || input.includes('create') || input.includes('build')) {
            return "Absolutely! I can generate the complete database schema with proper relationships, indexes, and constraints. Plus, I'll create a full REST API with authentication, validation, and documentation. Would you like me to start the generation process now?";
        }
        
        if (input.includes('help') || input.includes('how') || input.includes('what')) {
            return "I can help you with: 📊 **Database Design** - Create optimized schemas, 🔗 **Relationships** - Set up proper foreign keys, 🚀 **API Generation** - Build complete REST APIs, 🔒 **Security** - Add authentication & permissions, 📱 **Real-time** - WebSocket integration. What would you like to focus on?";
        }
        
        // General responses
        return "I understand! Let me help you design the perfect database for your needs. Can you tell me more about: 1) What type of data you'll be storing, 2) How users will interact with it, 3) Any specific features you need? I'll create a custom solution for you.";
    }

    mockVideoCall(phoneNumber) {
        const mockId = `mock_video_${Date.now()}`;
        return {
            success: true,
            connectionId: mockId,
            videoUrl: `${this.baseUrl}/video/demo`,
            message: 'Video call simulation - Twilio not configured',
            type: 'video',
            mock: true
        };
    }

    // Get chat session
    getChatSession(sessionId) {
        return this.chatSessions.get(sessionId);
    }

    // End connection
    async endConnection(connectionId) {
        const connection = this.activeConnections.get(connectionId);
        const chatSession = this.chatSessions.get(connectionId);
        
        if (connection && connection.type === 'video' && this.client) {
            try {
                await this.client.video.rooms(connection.roomSid).update({ status: 'completed' });
            } catch (error) {
                console.error('Error ending video room:', error);
            }
        }
        
        if (connection) {
            this.activeConnections.delete(connectionId);
        }
        
        if (chatSession) {
            chatSession.status = 'ended';
            chatSession.endTime = new Date();
        }
        
        return { success: true };
    }
}

module.exports = DirectCommunicationService;