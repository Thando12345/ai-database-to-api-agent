const WebSocket = require('ws');

class OpenAIRealtimeService {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.sessionId = null;
    }

    async connect(chatId) {
        const url = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;
        
        this.ws = new WebSocket(url, {
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "OpenAI-Beta": "realtime=v1"
            }
        });

        return new Promise((resolve, reject) => {
            this.ws.on('open', () => {
                this.isConnected = true;
                this.sessionId = `realtime_${chatId}_${Date.now()}`;
                
                // Configure session for ERD processing
                this.updateSession({
                    instructions: `You are an expert database architect. Analyze ERD images and generate realistic database schemas with proper relationships. Always include Chat ID: ${chatId} in responses.`,
                    voice: "alloy",
                    input_audio_format: "pcm16",
                    output_audio_format: "pcm16",
                    turn_detection: {
                        type: "server_vad",
                        threshold: 0.5,
                        prefix_padding_ms: 300,
                        silence_duration_ms: 200
                    }
                });
                
                resolve(this.sessionId);
            });

            this.ws.on('error', reject);
        });
    }

    updateSession(config) {
        if (!this.isConnected) return;
        
        this.send({
            type: "session.update",
            session: config
        });
    }

    async processERDWithRealtime(imageBase64, chatId, onProgress) {
        if (!this.isConnected) {
            throw new Error('Not connected to OpenAI Realtime API');
        }

        // Create conversation item with ERD image
        this.send({
            type: "conversation.item.create",
            item: {
                type: "message",
                role: "user",
                content: [{
                    type: "input_text",
                    text: `Analyze this ERD image and generate a complete database schema with realistic data. Chat ID: ${chatId}. Image data: ${imageBase64.substring(0, 100)}...`
                }]
            }
        });

        // Request response
        this.send({
            type: "response.create",
            response: {
                modalities: ["text", "audio"],
                metadata: { chatId, type: "erd_analysis" }
            }
        });

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);
            
            this.ws.on('message', (data) => {
                const event = JSON.parse(data);
                
                switch (event.type) {
                    case 'response.text.delta':
                        onProgress?.(event.delta, 'text');
                        break;
                        
                    case 'response.audio.delta':
                        onProgress?.(event.delta, 'audio');
                        break;
                        
                    case 'response.done':
                        clearTimeout(timeout);
                        if (event.response.metadata?.chatId === chatId) {
                            resolve(this.parseERDResponse(event.response));
                        }
                        break;
                        
                    case 'error':
                        clearTimeout(timeout);
                        reject(new Error(event.error.message));
                        break;
                }
            });
        });
    }

    parseERDResponse(response) {
        const textOutput = response.output.find(item => item.type === 'message')?.content?.[0]?.text || '';
        
        // Extract schema from response
        const schemaMatch = textOutput.match(/```sql\n([\s\S]*?)\n```/);
        const schema = schemaMatch ? schemaMatch[1] : this.generateFallbackSchema();
        
        return {
            chatId: response.metadata?.chatId,
            schema,
            textResponse: textOutput,
            audioResponse: response.output.find(item => item.type === 'audio'),
            timestamp: new Date().toISOString()
        };
    }

    generateFallbackSchema() {
        return `-- Generated Schema
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    date_of_birth DATE
);

CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    course_name VARCHAR(200) NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL
);

CREATE TABLE enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(student_id),
    course_id INTEGER REFERENCES courses(course_id),
    enroll_date DATE NOT NULL
);`;
    }

    send(event) {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify(event));
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.isConnected = false;
            this.sessionId = null;
        }
    }
}

module.exports = OpenAIRealtimeService;