const DirectCommunicationService = require('../../infrastructure/services/DirectCommunicationService');

class DirectCommunicationController {
    constructor() {
        this.communicationService = new DirectCommunicationService();
    }

    // Start chat session
    startChatSession() {
        return async (req, res) => {
            try {
                const { userId, context } = req.body;

                if (!userId) {
                    return res.status(400).json({
                        success: false,
                        error: 'User ID is required'
                    });
                }

                const result = await this.communicationService.startChatSession(userId, context);
                res.json(result);

            } catch (error) {
                console.error('Chat session error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        };
    }

    // Process chat message
    processChatMessage() {
        return async (req, res) => {
            try {
                const { sessionId, message } = req.body;

                if (!sessionId || !message) {
                    return res.status(400).json({
                        success: false,
                        error: 'Session ID and message are required'
                    });
                }

                const result = await this.communicationService.processChatMessage(sessionId, message);
                res.json(result);

            } catch (error) {
                console.error('Chat message error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        };
    }

    // Start video call
    startVideoCall() {
        return async (req, res) => {
            try {
                const { phoneNumber, context } = req.body;

                if (!phoneNumber) {
                    return res.status(400).json({
                        success: false,
                        error: 'Phone number is required'
                    });
                }

                const result = await this.communicationService.initiateVideoCall(phoneNumber, context);
                res.json(result);

            } catch (error) {
                console.error('Video call error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        };
    }

    // Get chat session
    getChatSession() {
        return (req, res) => {
            try {
                const { sessionId } = req.params;
                const session = this.communicationService.getChatSession(sessionId);

                if (session) {
                    res.json({
                        success: true,
                        session: {
                            id: session.id,
                            status: session.status,
                            messages: session.messages,
                            startTime: session.startTime
                        }
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        error: 'Session not found'
                    });
                }

            } catch (error) {
                console.error('Get chat session error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        };
    }

    // End connection
    endConnection() {
        return async (req, res) => {
            try {
                const { connectionId } = req.params;
                const result = await this.communicationService.endConnection(connectionId);
                
                res.json(result);

            } catch (error) {
                console.error('End connection error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        };
    }
}

module.exports = DirectCommunicationController;