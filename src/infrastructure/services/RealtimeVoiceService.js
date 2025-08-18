const WebSocket = require('ws');
const { Readable } = require('stream');

class RealtimeVoiceService {
  constructor(openaiKey, azureKey, azureRegion) {
    this.openaiKey = openaiKey;
    this.azureKey = azureKey;
    this.azureRegion = azureRegion;
    this.activeConnections = new Map();
  }

  async startRealtimeTranscription(socket, userId) {
    try {
      // OpenAI Realtime API WebSocket connection
      const realtimeWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      this.activeConnections.set(userId, realtimeWs);

      realtimeWs.on('open', () => {
        socket.emit('voice-ready', { status: 'connected' });
        
        // Configure session
        realtimeWs.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a database design expert. Help users create database schemas from their voice descriptions.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            }
          }
        }));
      });

      realtimeWs.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.handleRealtimeMessage(socket, message);
      });

      realtimeWs.on('error', (error) => {
        socket.emit('voice-error', { error: error.message });
      });

      realtimeWs.on('close', () => {
        this.activeConnections.delete(userId);
        socket.emit('voice-disconnected');
      });

    } catch (error) {
      socket.emit('voice-error', { error: error.message });
    }
  }

  handleRealtimeMessage(socket, message) {
    switch (message.type) {
      case 'conversation.item.input_audio_transcription.completed':
        socket.emit('voice-transcribed', {
          text: message.transcript,
          confidence: 1.0
        });
        break;

      case 'response.audio.delta':
        // Stream audio response back to client
        socket.emit('voice-response-audio', {
          audio: message.delta,
          format: 'pcm16'
        });
        break;

      case 'response.text.delta':
        socket.emit('voice-response-text', {
          text: message.delta
        });
        break;

      case 'response.done':
        socket.emit('voice-response-complete');
        break;

      case 'error':
        socket.emit('voice-error', { error: message.error });
        break;
    }
  }

  async sendAudioChunk(userId, audioData) {
    const connection = this.activeConnections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: audioData
      }));
    }
  }

  async commitAudio(userId) {
    const connection = this.activeConnections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }));
    }
  }

  async generateResponse(userId, text) {
    const connection = this.activeConnections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }]
        }
      }));

      connection.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: 'Analyze this database requirement and provide a structured response with schema suggestions.'
        }
      }));
    }
  }

  async startPhoneCall(phoneNumber, context) {
    // Twilio integration for phone calls
    const twilio = require('twilio')(
      process.env.TWILIO_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    try {
      const call = await twilio.calls.create({
        url: `${process.env.BASE_URL}/api/voice/webhook`,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        record: true,
        recordingStatusCallback: `${process.env.BASE_URL}/api/voice/recording`
      });

      return {
        callId: call.sid,
        status: 'initiated',
        message: 'AI agent will call you shortly'
      };
    } catch (error) {
      throw new Error(`Call initiation failed: ${error.message}`);
    }
  }

  generateTwiMLResponse(transcript) {
    const VoiceResponse = require('twilio').twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    // AI-generated response based on transcript
    const response = this.generateAIResponse(transcript);
    
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, response);

    // Continue conversation
    twiml.gather({
      input: 'speech',
      action: '/api/voice/process',
      speechTimeout: 'auto',
      language: 'en-US'
    });

    return twiml.toString();
  }

  generateAIResponse(transcript) {
    // Simple AI response logic (replace with actual LLM call)
    if (transcript.toLowerCase().includes('database')) {
      return 'I understand you need help with database design. Can you describe what kind of application you\'re building?';
    } else if (transcript.toLowerCase().includes('ecommerce')) {
      return 'For an e-commerce system, I recommend tables for products, customers, orders, and inventory. Would you like me to create this schema?';
    } else {
      return 'I\'m here to help you design your database. Can you tell me more about your project requirements?';
    }
  }

  disconnect(userId) {
    const connection = this.activeConnections.get(userId);
    if (connection) {
      connection.close();
      this.activeConnections.delete(userId);
    }
  }
}

module.exports = RealtimeVoiceService;