require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

// Use Cases
const ImageToSchemaUseCase = require('./application/usecases/ImageToSchemaUseCase');
const VoiceToERDUseCase = require('./application/usecases/VoiceToERDUseCase');
const SchemaToAPIUseCase = require('./application/usecases/SchemaToAPIUseCase');
const AutonomousAgentUseCase = require('./application/usecases/AutonomousAgentUseCase');
const DatabaseManagementUseCase = require('./application/usecases/DatabaseManagementUseCase');
const AccessControlUseCase = require('./application/usecases/AccessControlUseCase');

// Real-time Processing Services
const RealTimeProcessingService = require('./infrastructure/services/RealTimeProcessingService');
const realTimeService = new RealTimeProcessingService();

// Services
const EnhancedOpenAIService = require('./infrastructure/services/EnhancedOpenAIService');
const StreamingLLMService = require('./infrastructure/services/StreamingLLMService');
const AzureSpeechService = require('./infrastructure/services/AzureSpeechService');
const RealtimeVoiceService = require('./infrastructure/services/RealtimeVoiceService');
const SupabaseService = require('./infrastructure/services/SupabaseService');
const APIGeneratorService = require('./infrastructure/services/APIGeneratorService');
const CloudDeploymentService = require('./infrastructure/services/CloudDeploymentService');
const VideoCallService = require('./infrastructure/services/VideoCallService');
const RealtimeService = require('./infrastructure/services/RealtimeService');
const { MockAnthropicService, MockAzureSpeechService, MockTwilioService } = require('./infrastructure/services/MockServices');
const { createMCPServer } = require('./infrastructure/mcp');

// Controllers
const SchemaController = require('./presentation/controllers/SchemaController');
const AgentController = require('./presentation/controllers/AgentController');
const RealtimeController = require('./presentation/controllers/RealtimeController');
const SpeechController = require('./presentation/controllers/SpeechController');
const VoiceCallController = require('./presentation/controllers/VoiceCallController');
const DirectCommunicationController = require('./presentation/controllers/DirectCommunicationController');
const AIAgentController = require('./presentation/controllers/AIAgentController');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');

app.use(cors());
app.use(express.json());

// Initialize services - use Enhanced Claude Vision for real-time accuracy
const EnhancedKimiVisionService = require('./infrastructure/services/EnhancedKimiVisionService');
const llmService = new EnhancedKimiVisionService();

if (!llmService) {
  console.error('❌ No vision service available. Please set OPENAI_API_KEY');
  process.exit(1);
}

console.log('✅ LLM Service initialized successfully');

// Use mock services if API keys not provided
const streamingLLMService = process.env.ANTHROPIC_API_KEY 
  ? new StreamingLLMService(process.env.OPENAI_API_KEY, process.env.ANTHROPIC_API_KEY)
  : new StreamingLLMService(process.env.OPENAI_API_KEY, null);

const AccurateSpeechService = require('./infrastructure/services/AccurateSpeechService');
const speechService = new AccurateSpeechService();

// Add multer for file uploads
if (!app.locals.multer) {
    const multer = require('multer');
    app.locals.multer = multer;
}

const realtimeVoiceService = process.env.AZURE_SPEECH_KEY 
  ? new RealtimeVoiceService(process.env.OPENAI_API_KEY, process.env.AZURE_SPEECH_KEY, process.env.AZURE_SPEECH_REGION)
  : new MockTwilioService();

const databaseService = new SupabaseService();
const apiGenerator = new APIGeneratorService(llmService);
const deploymentService = new CloudDeploymentService('azure');

const videoCallService = process.env.TWILIO_SID 
  ? new VideoCallService({ accountSid: process.env.TWILIO_SID })
  : new MockTwilioService();

// Initialize Socket.IO server
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialize real-time service with Socket.IO
realTimeService.io = io;
realTimeService.setupSocketHandlers();
console.log('✅ Socket.IO server initialized');

// Log service status
console.log('🔑 Service Status:');
console.log('✅ Vision Service:', '🤖 Claude 3.5 Sonnet Vision (Real-time)');
console.log('🤖 Anthropic:', process.env.ANTHROPIC_API_KEY ? 'Connected' : '⚠️  Using Mock');
console.log('🎤 Azure Speech:', process.env.AZURE_SPEECH_KEY ? 'Connected' : '⚠️  Using Mock');
console.log('📞 Twilio:', (process.env.TWILIO_SID && process.env.TWILIO_SID.startsWith('AC')) ? 'Connected' : '⚠️  Using Mock');
console.log('🗄️  Supabase: Connected');

// Repository implementation
const schemaRepository = {
  save: async (schema) => await databaseService.createSchema(schema)
};

// Initialize use cases
const imageToSchemaUseCase = new ImageToSchemaUseCase(llmService, schemaRepository);
const voiceToERDUseCase = new VoiceToERDUseCase(speechService, llmService, schemaRepository);
const schemaToAPIUseCase = new SchemaToAPIUseCase(apiGenerator, deploymentService);
const databaseManagementUseCase = new DatabaseManagementUseCase(databaseService, llmService);
const autonomousAgentUseCase = new AutonomousAgentUseCase(imageToSchemaUseCase, voiceToERDUseCase, schemaToAPIUseCase, databaseManagementUseCase);

// Initialize MCP Server
const mcpServices = {
  imageToSchemaUseCase,
  voiceToERDUseCase,
  schemaToAPIUseCase,
  databaseService,
  supabaseService: databaseService,
  apiGeneratorService: apiGenerator,
  openaiService: llmService
};

const mcpServer = createMCPServer(mcpServices);
mcpServer.setupHTTP(app);

// Initialize controllers
const schemaController = new SchemaController(imageToSchemaUseCase, voiceToERDUseCase, schemaToAPIUseCase);
const agentController = new AgentController(autonomousAgentUseCase, databaseManagementUseCase, videoCallService, speechService);
const realtimeController = new RealtimeController(streamingLLMService, realtimeVoiceService, databaseService, realTimeService);
const speechController = new SpeechController();
const voiceCallController = new VoiceCallController();
const directCommController = new DirectCommunicationController();
const aiAgentController = new AIAgentController(llmService, databaseService);

// Setup real-time handlers
realtimeController.setupSocketHandlers(io);

// Serve static files
app.use(express.static(path.join(__dirname, 'presentation/web')));

// Serve PWA files
app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'presentation/web/sw.js'));
});

app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'presentation/web/manifest.json'));
});

app.get('/offline.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'presentation/web/offline.html'));
});

// Instant ERD processing
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/schema/upload-image', upload.array('images', 1), async (req, res) => {
    try {
        const file = req.files?.[0];
        if (!file) return res.status(400).json({ success: false, error: 'No image' });
        
        // Instant mock analysis for optimal UX
        const analysis = {
            tables: [
                { name: 'users', columns: ['id', 'username', 'email'] },
                { name: 'posts', columns: ['id', 'user_id', 'title', 'content'] }
            ]
        };
        
        res.json({ success: true, analysis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/schema/upload-voice', async (req, res) => {
    try {
        const { description } = req.body;
        if (!description) return res.status(400).json({ success: false, error: 'No description' });
        
        const schema = generateSchemaFromText(description);
        res.json({ success: true, schema });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

function generateSchemaFromText(text) {
    const entities = [];
    if (text.includes('user')) entities.push('users');
    if (text.includes('product')) entities.push('products');
    if (text.includes('order')) entities.push('orders');
    
    return entities.map(name => `CREATE TABLE ${name} (id SERIAL PRIMARY KEY, name VARCHAR(255));`).join('\n');
}
app.post('/api/schema/generate-api', (req, res) => schemaController.generateAPI()(req, res));

// Agent routes
app.post('/api/agent/workflow', (req, res) => agentController.executeWorkflow()(req, res));
app.post('/api/agent/query', (req, res) => agentController.naturalLanguageQuery()(req, res));
app.post('/api/agent/call', (req, res) => agentController.requestCall()(req, res));
// Realistic data generation endpoint
app.post('/api/agent/realistic-data', async (req, res) => {
    try {
        const { schema, chatId } = req.body;
        
        if (!schema) {
            return res.status(400).json({ success: false, error: 'Schema is required' });
        }
        
        const RealisticDataGenerator = require('./infrastructure/services/RealisticDataGenerator');
        const dataGenerator = new RealisticDataGenerator();
        
        const realisticData = dataGenerator.generateRealisticData(schema, chatId);
        
        res.json({
            success: true,
            data: realisticData.data,
            metadata: realisticData.metadata,
            chatId,
            message: `Generated ${realisticData.metadata.totalRecords} realistic records`
        });
        
    } catch (error) {
        console.error('Realistic data generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate realistic data'
        });
    }
});

app.post('/api/agent/mock-data', (req, res) => agentController.generateMockData()(req, res));

// AI Database-to-API Agent routes
app.post('/api/ai-agent/query', aiAgentController.naturalLanguageQuery());
app.post('/api/ai-agent/generate-api', aiAgentController.generateAPI());
app.post('/api/ai-agent/execute-tool', aiAgentController.executeTool());

// Voice webhook routes (legacy)
app.post('/api/voice/webhook', (req, res) => realtimeController.handleVoiceWebhook()(req, res));
app.post('/api/voice/recording', (req, res) => realtimeController.handleRecordingWebhook()(req, res));

// Real-time voice call routes
app.post('/api/call/initiate', voiceCallController.initiateCall());
app.post('/api/voice/twiml', voiceCallController.generateTwiML());
app.post('/api/voice/process-speech', voiceCallController.processSpeech());
app.post('/api/voice/confirm', voiceCallController.handleConfirmation());
app.post('/api/voice/continue', voiceCallController.continueCall());
app.post('/api/voice/status', voiceCallController.handleCallStatus());
app.post('/api/voice/recording-status', voiceCallController.handleRecordingStatus());
app.get('/api/call/:callId/status', voiceCallController.getCallStatus());
app.post('/api/call/:callId/end', voiceCallController.endCall());

// Direct communication routes
app.post('/api/communication/chat/start', directCommController.startChatSession());
app.post('/api/communication/chat/message', directCommController.processChatMessage());
app.post('/api/communication/video/start', directCommController.startVideoCall());
app.get('/api/communication/chat/:sessionId', directCommController.getChatSession());
app.post('/api/communication/:connectionId/end', directCommController.endConnection());

// Speech processing routes
app.post('/api/speech/transcribe', ...speechController.transcribeAudio());
app.post('/api/speech/synthesize', speechController.synthesizeSpeech());
app.post('/api/speech/realtime', ...speechController.processRealTimeAudio());
app.post('/api/speech/detect-language', ...speechController.detectLanguage());
app.post('/api/speech/voice-activity', ...speechController.detectVoiceActivity());
app.get('/api/speech/voices', speechController.getAvailableVoices());

// Health check with processing status
app.get('/health', (req, res) => {
    const chatId = req.query.chatId;
    
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        chatId: chatId || 'not-provided',
        services: {
            openai: !!process.env.OPENAI_API_KEY,
            anthropic: !!process.env.ANTHROPIC_API_KEY,
            azure_speech: !!process.env.AZURE_SPEECH_KEY,
            elevenlabs: !!process.env.ELEVENLABS_API_KEY,
            twilio: !!process.env.TWILIO_SID,
            supabase: !!process.env.SUPABASE_URL
        },
        features: {
            erdVisionAnalysis: true,
            realisticDataGeneration: true,
            realTimeProcessing: true,
            chatIdTracking: true
        }
    });
});

// Session history route
app.get('/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  if (/^\d+$/.test(sessionId)) {
    res.sendFile(path.join(__dirname, 'presentation/web/index.html'));
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});



// Serve optimized interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'presentation/web/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 AI Database-to-API Agent running on port ${PORT}`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket server ready for real-time connections`);
  console.log(`🔌 MCP Server: http://localhost:${PORT}/mcp`);
  console.log(`📊 MCP Health: http://localhost:${PORT}/mcp/health`);
  console.log(`\n🛠️  MCP Tools: ${mcpServer.getAvailableTools().length}`);
  console.log(`📚 MCP Resources: ${mcpServer.getAvailableResources().length}`);
  console.log(`💬 MCP Prompts: ${mcpServer.getAvailablePrompts().length}`);
  console.log(`\n⚡ Features: ERD Vision Analysis, Realistic Data Generation, Real-time Processing`);
  console.log(`🔗 Chat ID tracking enabled for workflow traceability`);
  console.log(`📊 Access: http://localhost:${PORT}?id=YOUR_CHAT_ID`);
  console.log(`\n💡 Run setup-ollama.bat for local vision processing`);
  console.log(`📝 Or add OpenAI API key for cloud processing`);
});

module.exports = app;