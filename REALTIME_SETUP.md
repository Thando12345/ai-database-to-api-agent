# Real-Time AI Database-to-API Agent Setup

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   
   Add your API keys:
   ```env
   OPENAI_API_KEY=sk-your-openai-key
   ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
   VITE_SUPABASE_URL=https://gypxdmiplgdgebxkcesh.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   TWILIO_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   ```

3. **Setup Supabase Database**
   
   **Option A - Automated:**
   ```bash
   npm run setup-db
   ```
   
   **Option B - Manual:**
   1. Go to https://supabase.com/dashboard/project/gypxdmiplgdgebxkcesh
   2. Click "SQL Editor" → "New Query"
   3. Copy content from `supabase/schema.sql`
   4. Paste and click "Run"

4. **Start Real-Time Server**
   ```bash
   npm run dev
   ```

5. **Access Dashboard**
   ```
   http://localhost:3000
   ```

## 🔥 Real-Time Features

### 1. **Streaming ERD Analysis**
- Upload ERD image → Get real-time AI analysis
- Live schema generation with progress updates
- Instant database table creation

### 2. **Real-Time Voice Processing**
- OpenAI Realtime API integration
- Live speech-to-text transcription
- Immediate ERD generation from voice
- Spoken AI responses

### 3. **Autonomous Workflows**
- Multi-step AI workflows with live updates
- Real-time progress tracking
- Automatic database migrations
- Live mock data generation
- Instant API deployment

### 4. **Natural Language Queries**
- Real-time SQL generation from natural language
- Live query execution
- Streaming results

### 5. **Phone/Video Calls**
- Twilio integration for voice calls
- AI agent phone conversations
- Real-time call processing

## 🎯 Usage Examples

### Real-Time ERD Analysis
```javascript
// Client-side WebSocket
socket.emit('analyze-erd-stream', {
  imageBuffer: imageData,
  userId: 'user-123'
});

socket.on('erd-analysis-chunk', (chunk) => {
  if (chunk.type === 'complete') {
    console.log('Schema generated:', chunk.schema);
  }
});
```

### Real-Time Voice Processing
```javascript
// Start voice session
socket.emit('start-voice-session', { userId: 'user-123' });

// Stream audio chunks
socket.emit('voice-audio-chunk', {
  userId: 'user-123',
  audioData: pcm16Array
});

// Get live transcription
socket.on('voice-transcribed', (data) => {
  console.log('Transcribed:', data.text);
});
```

### Autonomous Workflow
```javascript
// Start full workflow
socket.emit('start-autonomous-workflow', {
  input: 'Create e-commerce database',
  workflowType: 'voice',
  userId: 'user-123'
});

// Get live progress updates
socket.on('workflow-progress', (data) => {
  console.log(`Step ${data.step}:`, data.message);
});
```

### Natural Language Queries
```javascript
// Real-time SQL generation
socket.emit('natural-query-stream', {
  query: 'Show me all products with price > $100',
  schemaId: 'schema-uuid',
  userId: 'user-123'
});

// Get streaming results
socket.on('query-results', (data) => {
  console.log('SQL:', data.sql);
  console.log('Results:', data.data);
});
```

## 🔧 API Endpoints

### WebSocket Events

**Client → Server:**
- `analyze-erd-stream` - Stream ERD analysis
- `start-voice-session` - Start real-time voice
- `voice-audio-chunk` - Send audio data
- `natural-query-stream` - Stream SQL generation
- `start-autonomous-workflow` - Start full workflow
- `request-phone-call` - Initiate phone call

**Server → Client:**
- `erd-analysis-chunk` - ERD analysis progress
- `voice-transcribed` - Live transcription
- `voice-response-text` - AI voice response
- `workflow-progress` - Workflow updates
- `query-chunk` - SQL generation progress
- `query-results` - Query execution results

### HTTP Endpoints
- `POST /api/voice/webhook` - Twilio voice webhook
- `POST /api/voice/recording` - Recording callback
- `GET /health` - Health check

## 🎨 Frontend Integration

The web dashboard (`/src/presentation/web/index.html`) includes:

- **Real-time ERD upload** with live analysis
- **Voice recording** with streaming transcription
- **Autonomous workflow** with progress tracking
- **Phone call integration** with Twilio
- **Live query interface** with natural language

## 🔐 Security Features

- **Row-Level Security (RLS)** in Supabase
- **JWT authentication** for API access
- **Rate limiting** on WebSocket connections
- **Input validation** for all AI prompts
- **Secure voice processing** with OpenAI Realtime API

## 📊 Monitoring

- Real-time connection status
- Live workflow progress
- Error handling and recovery
- Performance metrics
- Usage analytics

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment
```bash
# Build for production
npm run build

# Deploy to cloud platform
# (Azure Functions, AWS Lambda, etc.)
```

## 🔄 Real-Time Architecture

```
Client (WebSocket) ↔ Socket.IO Server ↔ AI Services
                                      ↔ Supabase Database
                                      ↔ Twilio Voice API
                                      ↔ OpenAI Realtime API
```

The system provides **true real-time AI interactions** with:
- Live streaming responses
- Instant database operations
- Real-time voice processing
- Autonomous multi-step workflows
- Phone/video call integration

All features work together seamlessly for a complete AI-powered database-to-API experience.