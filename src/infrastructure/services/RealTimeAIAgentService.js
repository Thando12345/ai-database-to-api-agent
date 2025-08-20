// Real-Time AI Agent Service with Voice & Vision
const OpenAI = require('openai');
const { SpeechConfig, AudioConfig, SpeechRecognizer, SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');

class RealTimeAIAgentService {
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.speechConfig = SpeechConfig.fromSubscription(process.env.AZURE_SPEECH_KEY, process.env.AZURE_SPEECH_REGION);
        this.conversationHistory = new Map();
        this.activeAgents = new Map();
    }

    async startAIAgent(sessionId, phoneNumber) {
        const agent = {
            sessionId,
            phoneNumber,
            startTime: new Date(),
            conversationHistory: [],
            isActive: true,
            currentTask: null
        };

        this.activeAgents.set(sessionId, agent);
        
        // Initialize conversation
        const welcomeMessage = `Hello! I'm your AI Database Agent. I can help you with ERD analysis, schema generation, and API creation. How can I assist you today?`;
        
        agent.conversationHistory.push({
            role: 'assistant',
            content: welcomeMessage,
            timestamp: new Date()
        });

        return {
            success: true,
            sessionId,
            welcomeMessage,
            agent
        };
    }

    async processVoiceInput(sessionId, audioBuffer) {
        const agent = this.activeAgents.get(sessionId);
        if (!agent) throw new Error('Agent session not found');

        try {
            // Convert speech to text
            const transcript = await this.speechToText(audioBuffer);
            
            // Add to conversation history
            agent.conversationHistory.push({
                role: 'user',
                content: transcript,
                timestamp: new Date()
            });

            // Generate AI response
            const response = await this.generateResponse(sessionId, transcript);
            
            // Convert response to speech
            const audioResponse = await this.textToSpeech(response);

            return {
                transcript,
                response,
                audioResponse,
                conversationHistory: agent.conversationHistory
            };
        } catch (error) {
            throw new Error(`Voice processing failed: ${error.message}`);
        }
    }

    async processTextInput(sessionId, text) {
        const agent = this.activeAgents.get(sessionId);
        if (!agent) throw new Error('Agent session not found');

        // Add to conversation history
        agent.conversationHistory.push({
            role: 'user',
            content: text,
            timestamp: new Date()
        });

        // Generate AI response
        const response = await this.generateResponse(sessionId, text);

        return {
            response,
            conversationHistory: agent.conversationHistory
        };
    }

    async generateResponse(sessionId, userInput) {
        const agent = this.activeAgents.get(sessionId);
        const context = this.buildContext(agent.conversationHistory);

        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are an expert AI Database Agent. Help users with ERD analysis, database schema design, SQL generation, and REST API creation. Be concise, helpful, and technical when needed."
                },
                ...context,
                {
                    role: "user",
                    content: userInput
                }
            ],
            max_tokens: 500,
            temperature: 0.7
        });

        const response = completion.choices[0].message.content;
        
        // Add to conversation history
        agent.conversationHistory.push({
            role: 'assistant',
            content: response,
            timestamp: new Date()
        });

        // Detect if user needs specific action
        agent.currentTask = this.detectTask(userInput);

        return response;
    }

    async speechToText(audioBuffer) {
        return new Promise((resolve, reject) => {
            const audioConfig = AudioConfig.fromWavFileInput(audioBuffer);
            const recognizer = new SpeechRecognizer(this.speechConfig, audioConfig);

            recognizer.recognizeOnceAsync(result => {
                if (result.text) {
                    resolve(result.text);
                } else {
                    reject(new Error('Speech recognition failed'));
                }
                recognizer.close();
            });
        });
    }

    async textToSpeech(text) {
        return new Promise((resolve, reject) => {
            const synthesizer = new SpeechSynthesizer(this.speechConfig);
            
            synthesizer.speakTextAsync(text, result => {
                if (result.audioData) {
                    resolve(result.audioData);
                } else {
                    reject(new Error('Speech synthesis failed'));
                }
                synthesizer.close();
            });
        });
    }

    buildContext(history) {
        return history.slice(-10).map(entry => ({
            role: entry.role,
            content: entry.content
        }));
    }

    detectTask(input) {
        const lowerInput = input.toLowerCase();
        
        if (lowerInput.includes('schema') || lowerInput.includes('database')) {
            return 'schema_generation';
        }
        if (lowerInput.includes('api') || lowerInput.includes('endpoint')) {
            return 'api_generation';
        }
        if (lowerInput.includes('erd') || lowerInput.includes('diagram')) {
            return 'erd_analysis';
        }
        
        return 'general_assistance';
    }

    async endSession(sessionId) {
        const agent = this.activeAgents.get(sessionId);
        if (!agent) return null;

        agent.isActive = false;
        agent.endTime = new Date();
        agent.duration = agent.endTime - agent.startTime;

        // Generate session report
        const report = this.generateSessionReport(agent);
        
        this.activeAgents.delete(sessionId);
        
        return report;
    }

    generateSessionReport(agent) {
        const totalMessages = agent.conversationHistory.length;
        const userMessages = agent.conversationHistory.filter(msg => msg.role === 'user').length;
        const assistantMessages = agent.conversationHistory.filter(msg => msg.role === 'assistant').length;

        return {
            sessionId: agent.sessionId,
            phoneNumber: agent.phoneNumber,
            startTime: agent.startTime,
            endTime: agent.endTime,
            duration: agent.duration,
            totalMessages,
            userMessages,
            assistantMessages,
            lastTask: agent.currentTask,
            conversationSummary: this.summarizeConversation(agent.conversationHistory),
            recommendations: this.generateRecommendations(agent.conversationHistory)
        };
    }

    summarizeConversation(history) {
        const topics = [];
        history.forEach(entry => {
            if (entry.role === 'user') {
                const content = entry.content.toLowerCase();
                if (content.includes('schema')) topics.push('Database Schema');
                if (content.includes('api')) topics.push('API Development');
                if (content.includes('erd')) topics.push('ERD Analysis');
            }
        });
        
        return `Discussed: ${[...new Set(topics)].join(', ') || 'General database consultation'}`;
    }

    generateRecommendations(history) {
        const recommendations = [];
        const lastUserMessage = history.filter(msg => msg.role === 'user').pop();
        
        if (lastUserMessage) {
            const content = lastUserMessage.content.toLowerCase();
            if (content.includes('schema')) {
                recommendations.push('Consider adding indexes for better performance');
                recommendations.push('Implement proper foreign key constraints');
            }
            if (content.includes('api')) {
                recommendations.push('Add input validation and error handling');
                recommendations.push('Implement rate limiting and authentication');
            }
        }
        
        return recommendations;
    }

    getActiveAgent(sessionId) {
        return this.activeAgents.get(sessionId);
    }

    getAllActiveSessions() {
        return Array.from(this.activeAgents.values());
    }
}

module.exports = RealTimeAIAgentService;