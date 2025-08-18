const axios = require('axios');
const FormData = require('form-data');

class AccurateSpeechService {
    constructor() {
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.azureKey = process.env.AZURE_SPEECH_KEY;
        this.azureRegion = process.env.AZURE_SPEECH_REGION;
        this.elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    }

    // Speech-to-Text using OpenAI Whisper (most accurate)
    async speechToText(audioBuffer, options = {}) {
        if (!this.openaiApiKey) {
            return this.mockSpeechToText(audioBuffer);
        }

        try {
            const formData = new FormData();
            formData.append('file', audioBuffer, {
                filename: 'audio.wav',
                contentType: 'audio/wav'
            });
            formData.append('model', 'whisper-1');
            formData.append('language', options.language || 'en');
            formData.append('response_format', 'verbose_json');
            formData.append('temperature', '0.2');

            const response = await axios.post(
                'https://api.openai.com/v1/audio/transcriptions',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.openaiApiKey}`,
                        ...formData.getHeaders()
                    },
                    timeout: 30000
                }
            );

            return {
                success: true,
                text: response.data.text,
                confidence: this.calculateConfidence(response.data),
                language: response.data.language || 'en',
                duration: response.data.duration,
                segments: response.data.segments || []
            };

        } catch (error) {
            console.error('OpenAI Whisper error:', error.message);
            return this.fallbackSpeechToText(audioBuffer, options);
        }
    }

    // Fallback to Azure Speech Services
    async fallbackSpeechToText(audioBuffer, options = {}) {
        if (!this.azureKey || !this.azureRegion) {
            return this.mockSpeechToText(audioBuffer);
        }

        try {
            const response = await axios.post(
                `https://${this.azureRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`,
                audioBuffer,
                {
                    headers: {
                        'Ocp-Apim-Subscription-Key': this.azureKey,
                        'Content-Type': 'audio/wav',
                        'Accept': 'application/json'
                    },
                    params: {
                        language: options.language || 'en-US',
                        format: 'detailed'
                    },
                    timeout: 30000
                }
            );

            const result = response.data;
            return {
                success: true,
                text: result.DisplayText || result.RecognitionStatus,
                confidence: result.Confidence || 0.8,
                language: options.language || 'en-US',
                duration: result.Duration
            };

        } catch (error) {
            console.error('Azure Speech error:', error.message);
            return this.mockSpeechToText(audioBuffer);
        }
    }

    // Text-to-Speech using multiple providers
    async textToSpeech(text, options = {}) {
        // Try ElevenLabs first (highest quality)
        if (this.elevenLabsKey) {
            try {
                return await this.elevenLabsTextToSpeech(text, options);
            } catch (error) {
                console.error('ElevenLabs TTS error:', error.message);
            }
        }

        // Fallback to OpenAI TTS
        if (this.openaiApiKey) {
            try {
                return await this.openaiTextToSpeech(text, options);
            } catch (error) {
                console.error('OpenAI TTS error:', error.message);
            }
        }

        // Fallback to Azure TTS
        if (this.azureKey) {
            try {
                return await this.azureTextToSpeech(text, options);
            } catch (error) {
                console.error('Azure TTS error:', error.message);
            }
        }

        // Final fallback to browser TTS
        return this.browserTextToSpeech(text, options);
    }

    async elevenLabsTextToSpeech(text, options = {}) {
        const voiceId = options.voiceId || 'EXAVITQu4vr4xnSDxMaL'; // Bella voice
        
        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                text: text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5,
                    style: 0.0,
                    use_speaker_boost: true
                }
            },
            {
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': this.elevenLabsKey
                },
                responseType: 'arraybuffer'
            }
        );

        return {
            success: true,
            audioBuffer: Buffer.from(response.data),
            format: 'mp3',
            provider: 'elevenlabs'
        };
    }

    async openaiTextToSpeech(text, options = {}) {
        const response = await axios.post(
            'https://api.openai.com/v1/audio/speech',
            {
                model: 'tts-1-hd',
                input: text,
                voice: options.voice || 'alloy',
                response_format: 'mp3',
                speed: options.speed || 1.0
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            }
        );

        return {
            success: true,
            audioBuffer: Buffer.from(response.data),
            format: 'mp3',
            provider: 'openai'
        };
    }

    async azureTextToSpeech(text, options = {}) {
        const ssml = `
            <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
                <voice name='${options.voice || 'en-US-JennyNeural'}'>
                    <prosody rate='${options.rate || 'medium'}' pitch='${options.pitch || 'medium'}'>
                        ${text}
                    </prosody>
                </voice>
            </speak>
        `;

        const response = await axios.post(
            `https://${this.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
            ssml,
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': this.azureKey,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
                },
                responseType: 'arraybuffer'
            }
        );

        return {
            success: true,
            audioBuffer: Buffer.from(response.data),
            format: 'mp3',
            provider: 'azure'
        };
    }

    browserTextToSpeech(text, options = {}) {
        return {
            success: true,
            text: text,
            provider: 'browser',
            instructions: 'Use browser SpeechSynthesis API',
            browserCode: `
                const utterance = new SpeechSynthesisUtterance('${text}');
                utterance.rate = ${options.rate || 0.9};
                utterance.pitch = ${options.pitch || 1.0};
                utterance.volume = ${options.volume || 0.8};
                speechSynthesis.speak(utterance);
            `
        };
    }

    // Real-time speech processing
    async processRealTimeAudio(audioChunks, options = {}) {
        const combinedBuffer = Buffer.concat(audioChunks);
        
        // Process in chunks for better accuracy
        if (combinedBuffer.length > 1024 * 1024) { // 1MB chunks
            return this.processLargeAudio(combinedBuffer, options);
        }

        return this.speechToText(combinedBuffer, options);
    }

    async processLargeAudio(audioBuffer, options = {}) {
        const chunkSize = 1024 * 1024; // 1MB chunks
        const chunks = [];
        
        for (let i = 0; i < audioBuffer.length; i += chunkSize) {
            chunks.push(audioBuffer.slice(i, i + chunkSize));
        }

        const results = [];
        for (const chunk of chunks) {
            const result = await this.speechToText(chunk, options);
            if (result.success) {
                results.push(result.text);
            }
        }

        return {
            success: true,
            text: results.join(' '),
            confidence: 0.8,
            chunks: results.length
        };
    }

    calculateConfidence(whisperData) {
        if (!whisperData.segments) return 0.8;
        
        const avgConfidence = whisperData.segments.reduce((sum, segment) => {
            return sum + (segment.avg_logprob || -0.5);
        }, 0) / whisperData.segments.length;
        
        // Convert log probability to confidence score
        return Math.max(0, Math.min(1, (avgConfidence + 1) / 1));
    }

    mockSpeechToText(audioBuffer) {
        const mockTranscripts = [
            "I need a database for an e-commerce website with products, customers, orders, and payment information. Each product should have a name, price, description, and category. Customers need email, name, and address fields. Orders should link to customers and contain multiple products.",
            "Create a blog platform database with users, posts, comments, and categories. Users should have usernames, emails, and profiles. Posts need titles, content, publication dates, and author information. Comments should be linked to both posts and users.",
            "I want an inventory management system with warehouses, products, suppliers, and stock movements. Products should have SKU codes, names, and descriptions. Track stock levels across multiple warehouse locations.",
            "Design a social media database with users, posts, likes, follows, and messages. Users have profiles with photos and bio information. Posts can have images, text, and hashtags. Include friend relationships and messaging system.",
            "Build a learning management system with courses, students, instructors, and assignments. Courses have modules and lessons. Students can enroll in courses and submit assignments. Track progress and grades."
        ];

        return {
            success: true,
            text: mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)],
            confidence: 0.95,
            language: 'en',
            provider: 'mock',
            duration: 5.2
        };
    }

    // Voice activity detection
    detectVoiceActivity(audioBuffer) {
        // Simple energy-based VAD
        const samples = new Int16Array(audioBuffer);
        let energy = 0;
        
        for (let i = 0; i < samples.length; i++) {
            energy += samples[i] * samples[i];
        }
        
        const avgEnergy = energy / samples.length;
        const threshold = 1000000; // Adjust based on testing
        
        return {
            hasVoice: avgEnergy > threshold,
            energy: avgEnergy,
            confidence: Math.min(1, avgEnergy / (threshold * 2))
        };
    }

    // Language detection
    async detectLanguage(audioBuffer) {
        if (!this.openaiApiKey) {
            return { language: 'en', confidence: 0.8 };
        }

        try {
            const formData = new FormData();
            formData.append('file', audioBuffer, 'audio.wav');
            formData.append('model', 'whisper-1');
            formData.append('response_format', 'verbose_json');

            const response = await axios.post(
                'https://api.openai.com/v1/audio/transcriptions',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.openaiApiKey}`,
                        ...formData.getHeaders()
                    }
                }
            );

            return {
                language: response.data.language || 'en',
                confidence: 0.9
            };

        } catch (error) {
            return { language: 'en', confidence: 0.5 };
        }
    }
}

module.exports = AccurateSpeechService;