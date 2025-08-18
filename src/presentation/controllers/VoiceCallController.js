const RealTimeCallService = require('../../infrastructure/services/RealTimeCallService');

class VoiceCallController {
    constructor() {
        this.callService = new RealTimeCallService();
    }

    // Initiate real phone call
    initiateCall() {
        return async (req, res) => {
            try {
                const { phoneNumber, context } = req.body;

                if (!phoneNumber) {
                    return res.status(400).json({
                        success: false,
                        error: 'Phone number is required'
                    });
                }

                // Validate phone number format
                const phoneRegex = /^\+?[1-9]\d{1,14}$/;
                if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid phone number format'
                    });
                }

                const result = await this.callService.initiateRealCall(phoneNumber, context);
                
                res.json(result);

            } catch (error) {
                console.error('Call initiation error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    fallback: 'Using simulation mode'
                });
            }
        };
    }

    // Generate TwiML for incoming call
    generateTwiML() {
        return (req, res) => {
            try {
                const context = req.query.context ? JSON.parse(req.query.context) : {};
                const twiml = this.callService.generateTwiML(context);
                
                res.type('text/xml');
                res.send(twiml);

            } catch (error) {
                console.error('TwiML generation error:', error);
                res.status(500).send('Error generating TwiML');
            }
        };
    }

    // Process speech input from call
    processSpeech() {
        return async (req, res) => {
            try {
                const { CallSid, SpeechResult, Confidence } = req.body;
                
                const twiml = await this.callService.processSpeechInput({
                    SpeechResult,
                    Confidence: parseFloat(Confidence) || 0.8
                }, CallSid);
                
                res.type('text/xml');
                res.send(twiml);

            } catch (error) {
                console.error('Speech processing error:', error);
                
                // Fallback TwiML
                const VoiceResponse = require('twilio').twiml.VoiceResponse;
                const twiml = new VoiceResponse();
                twiml.say('I apologize, there was an error processing your request. Please try again.');
                twiml.hangup();
                
                res.type('text/xml');
                res.send(twiml.toString());
            }
        };
    }

    // Handle confirmation response
    handleConfirmation() {
        return async (req, res) => {
            try {
                const { CallSid, SpeechResult } = req.body;
                const response = (SpeechResult || '').toLowerCase();
                
                const VoiceResponse = require('twilio').twiml.VoiceResponse;
                const twiml = new VoiceResponse();
                
                if (response.includes('yes') || response.includes('proceed') || response.includes('generate')) {
                    twiml.say({
                        voice: 'alice',
                        language: 'en-US'
                    }, 'Perfect! I am now generating your database schema and API endpoints. You will receive the complete solution in your dashboard within the next minute. Thank you for using our AI Database Assistant!');
                    
                    // Trigger schema generation
                    setTimeout(() => {
                        this.callService.generateSchemaFromCall(CallSid);
                    }, 2000);
                    
                } else {
                    twiml.say({
                        voice: 'alice',
                        language: 'en-US'
                    }, 'No problem! Please describe any changes or additional requirements you have.');
                    
                    const gather = twiml.gather({
                        input: 'speech',
                        timeout: 10,
                        action: `/api/voice/process-speech`,
                        method: 'POST'
                    });
                    
                    gather.say('I am listening for your additional requirements.');
                }
                
                twiml.hangup();
                
                res.type('text/xml');
                res.send(twiml.toString());

            } catch (error) {
                console.error('Confirmation error:', error);
                res.status(500).send('Error processing confirmation');
            }
        };
    }

    // Continue call flow
    continueCall() {
        return (req, res) => {
            try {
                const VoiceResponse = require('twilio').twiml.VoiceResponse;
                const twiml = new VoiceResponse();
                
                twiml.say({
                    voice: 'alice',
                    language: 'en-US'
                }, 'I will create a sample database schema for you. You can customize it later in your dashboard. Thank you for calling!');
                
                twiml.hangup();
                
                res.type('text/xml');
                res.send(twiml.toString());

            } catch (error) {
                console.error('Continue call error:', error);
                res.status(500).send('Error continuing call');
            }
        };
    }

    // Handle call status updates
    handleCallStatus() {
        return async (req, res) => {
            try {
                const { CallSid, CallStatus, Duration } = req.body;
                
                await this.callService.handleCallStatus(CallSid, CallStatus, {
                    Duration
                });
                
                res.json({ success: true });

            } catch (error) {
                console.error('Call status error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        };
    }

    // Handle recording status
    handleRecordingStatus() {
        return (req, res) => {
            try {
                const { CallSid, RecordingUrl, RecordingDuration } = req.body;
                
                console.log(`Recording completed for call ${CallSid}:`, {
                    url: RecordingUrl,
                    duration: RecordingDuration
                });
                
                res.json({ success: true });

            } catch (error) {
                console.error('Recording status error:', error);
                res.status(500).json({ success: false });
            }
        };
    }

    // Get call status
    getCallStatus() {
        return (req, res) => {
            try {
                const { callId } = req.params;
                const callData = this.callService.getCallStatus(callId);
                
                if (callData) {
                    res.json({
                        success: true,
                        call: {
                            id: callData.id,
                            status: callData.status,
                            phoneNumber: callData.phoneNumber,
                            duration: callData.duration,
                            conversation: callData.conversation,
                            generatedSchema: callData.generatedSchema
                        }
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        error: 'Call not found'
                    });
                }

            } catch (error) {
                console.error('Get call status error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        };
    }

    // End call
    endCall() {
        return async (req, res) => {
            try {
                const { callId } = req.params;
                const result = await this.callService.endCall(callId);
                
                res.json(result);

            } catch (error) {
                console.error('End call error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        };
    }
}

module.exports = VoiceCallController;