const multer = require('multer');
const AccurateSpeechService = require('../../infrastructure/services/AccurateSpeechService');

class SpeechController {
    constructor() {
        this.speechService = new AccurateSpeechService();
        this.upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 25 * 1024 * 1024 // 25MB limit
            },
            fileFilter: (req, file, cb) => {
                const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm'];
                if (allowedTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('Invalid audio format'), false);
                }
            }
        });
    }

    // Speech-to-Text endpoint
    transcribeAudio() {
        return [
            this.upload.single('audio'),
            async (req, res) => {
                try {
                    const { language = 'en', userId } = req.body;
                    
                    if (!req.file && !req.body.audioData) {
                        return res.status(400).json({
                            success: false,
                            error: 'No audio file or data provided'
                        });
                    }

                    let audioBuffer;
                    if (req.file) {
                        audioBuffer = req.file.buffer;
                    } else if (req.body.audioData) {
                        // Handle base64 or simulated data
                        if (req.body.audioData === 'simulated_audio_data') {
                            audioBuffer = Buffer.from('mock_audio_data');
                        } else {
                            audioBuffer = Buffer.from(req.body.audioData, 'base64');
                        }
                    }

                    const result = await this.speechService.speechToText(audioBuffer, {
                        language,
                        userId
                    });

                    if (result.success) {
                        res.json({
                            success: true,
                            text: result.text,
                            confidence: result.confidence,
                            language: result.language,
                            duration: result.duration,
                            provider: result.provider,
                            segments: result.segments
                        });
                    } else {
                        res.status(500).json({
                            success: false,
                            error: 'Transcription failed',
                            details: result.error
                        });
                    }

                } catch (error) {
                    console.error('Transcription error:', error);
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        ];
    }

    // Text-to-Speech endpoint
    synthesizeSpeech() {
        return async (req, res) => {
            try {
                const { text, voice, provider, language = 'en' } = req.body;

                if (!text) {
                    return res.status(400).json({
                        success: false,
                        error: 'No text provided'
                    });
                }

                if (text.length > 4000) {
                    return res.status(400).json({
                        success: false,
                        error: 'Text too long (max 4000 characters)'
                    });
                }

                const options = {
                    voice,
                    provider,
                    language,
                    rate: req.body.rate || 1.0,
                    pitch: req.body.pitch || 1.0,
                    volume: req.body.volume || 0.8
                };

                const result = await this.speechService.textToSpeech(text, options);

                if (result.success) {
                    if (result.audioBuffer) {
                        // Return audio file
                        res.set({
                            'Content-Type': `audio/${result.format}`,
                            'Content-Length': result.audioBuffer.length,
                            'Content-Disposition': 'attachment; filename="speech.mp3"'
                        });
                        res.send(result.audioBuffer);
                    } else {
                        // Return browser instructions
                        res.json({
                            success: true,
                            provider: result.provider,
                            browserCode: result.browserCode,
                            text: result.text
                        });
                    }
                } else {
                    res.status(500).json({
                        success: false,
                        error: 'Speech synthesis failed'
                    });
                }

            } catch (error) {
                console.error('TTS error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        };
    }

    // Real-time transcription endpoint
    processRealTimeAudio() {
        return [
            this.upload.array('audioChunks', 10),
            async (req, res) => {
                try {
                    const { language = 'en', userId } = req.body;
                    
                    if (!req.files || req.files.length === 0) {
                        return res.status(400).json({
                            success: false,
                            error: 'No audio chunks provided'
                        });
                    }

                    const audioChunks = req.files.map(file => file.buffer);
                    
                    const result = await this.speechService.processRealTimeAudio(audioChunks, {
                        language,
                        userId
                    });

                    res.json(result);

                } catch (error) {
                    console.error('Real-time transcription error:', error);
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        ];
    }

    // Language detection endpoint
    detectLanguage() {
        return [
            this.upload.single('audio'),
            async (req, res) => {
                try {
                    if (!req.file) {
                        return res.status(400).json({
                            success: false,
                            error: 'No audio file provided'
                        });
                    }

                    const result = await this.speechService.detectLanguage(req.file.buffer);
                    res.json({
                        success: true,
                        ...result
                    });

                } catch (error) {
                    console.error('Language detection error:', error);
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        ];
    }

    // Voice activity detection
    detectVoiceActivity() {
        return [
            this.upload.single('audio'),
            async (req, res) => {
                try {
                    if (!req.file) {
                        return res.status(400).json({
                            success: false,
                            error: 'No audio file provided'
                        });
                    }

                    const result = this.speechService.detectVoiceActivity(req.file.buffer);
                    res.json({
                        success: true,
                        ...result
                    });

                } catch (error) {
                    console.error('VAD error:', error);
                    res.status(500).json({
                        success: false,
                        error: error.message
                    });
                }
            }
        ];
    }

    // Get available voices
    getAvailableVoices() {
        return async (req, res) => {
            try {
                const voices = {
                    openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
                    azure: [
                        'en-US-JennyNeural',
                        'en-US-GuyNeural', 
                        'en-US-AriaNeural',
                        'en-US-DavisNeural',
                        'en-US-AmberNeural'
                    ],
                    elevenlabs: [
                        'EXAVITQu4vr4xnSDxMaL', // Bella
                        'ErXwobaYiN019PkySvjV', // Antoni
                        'VR6AewLTigWG4xSOukaG', // Arnold
                        'pNInz6obpgDQGcFmaJgB', // Adam
                        'yoZ06aMxZJJ28mfd3POQ'  // Sam
                    ]
                };

                res.json({
                    success: true,
                    voices,
                    providers: Object.keys(voices)
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        };
    }
}

module.exports = SpeechController;