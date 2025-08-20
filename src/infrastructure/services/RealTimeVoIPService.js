// Real-Time VoIP Service with Twilio Integration
const twilio = require('twilio');
const WebSocket = require('ws');

class RealTimeVoIPService {
    constructor() {
        this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        this.activeCalls = new Map();
        this.wsConnections = new Map();
    }

    async initiateCall(fromNumber, toNumber, socketId) {
        try {
            const call = await this.client.calls.create({
                from: fromNumber,
                to: toNumber,
                url: `${process.env.BASE_URL}/api/voip/twiml`,
                statusCallback: `${process.env.BASE_URL}/api/voip/status`,
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                record: true
            });

            this.activeCalls.set(call.sid, {
                callSid: call.sid,
                fromNumber,
                toNumber,
                socketId,
                status: 'initiated',
                startTime: new Date()
            });

            return {
                success: true,
                callSid: call.sid,
                status: 'initiated'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async endCall(callSid) {
        try {
            await this.client.calls(callSid).update({ status: 'completed' });
            
            const callData = this.activeCalls.get(callSid);
            if (callData) {
                callData.endTime = new Date();
                callData.duration = callData.endTime - callData.startTime;
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    handleCallStatus(callSid, status, duration) {
        const callData = this.activeCalls.get(callSid);
        if (callData) {
            callData.status = status;
            
            // Notify client via WebSocket
            const ws = this.wsConnections.get(callData.socketId);
            if (ws) {
                ws.send(JSON.stringify({
                    type: 'call_status',
                    callSid,
                    status,
                    duration
                }));
            }

            if (status === 'completed') {
                this.activeCalls.delete(callSid);
            }
        }
    }

    generateTwiML(action = 'dial') {
        const VoiceResponse = twilio.twiml.VoiceResponse;
        const response = new VoiceResponse();

        switch (action) {
            case 'dial':
                response.say('Connecting to AI Database Agent...');
                response.dial().number(process.env.AGENT_PHONE_NUMBER);
                break;
            case 'conference':
                response.say('Joining conference with AI Agent...');
                response.dial().conference('ai-agent-room');
                break;
            default:
                response.say('Welcome to AI Database Agent. Please hold while we connect you.');
        }

        return response.toString();
    }

    registerWebSocket(socketId, ws) {
        this.wsConnections.set(socketId, ws);
        
        ws.on('close', () => {
            this.wsConnections.delete(socketId);
        });
    }

    getCallReport(callSid) {
        const callData = this.activeCalls.get(callSid);
        if (!callData) return null;

        return {
            callSid,
            fromNumber: callData.fromNumber,
            toNumber: callData.toNumber,
            status: callData.status,
            startTime: callData.startTime,
            endTime: callData.endTime,
            duration: callData.duration,
            recordingUrl: `${process.env.BASE_URL}/api/voip/recording/${callSid}`
        };
    }
}

module.exports = RealTimeVoIPService;