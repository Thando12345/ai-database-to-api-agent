# AI Database-to-API Agent 🤖

**Transform database designs into working APIs using AI technology**

Upload ERD images, describe databases in natural language, or use voice commands to automatically generate SQL schemas and Express.js APIs with real-time processing.

[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18-blue)](https://expressjs.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-orange)](https://openai.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## 🚀 Features

### Core Capabilities
- **🖼️ Image-to-Schema**: Upload ERD diagrams → Generate SQL schemas using GPT-4 Vision
- **🎤 Voice-to-ERD**: Record descriptions → Create database structures using Azure Speech
- **⚡ Schema-to-API**: Transform schemas → Deploy complete Express.js CRUD APIs
- **🤖 Autonomous Agent**: Multi-step workflows with minimal user input
- **🔐 Enterprise Security**: Row-level security, JWT authentication, data masking
- **📱 Multimodal Interface**: Image, voice, text, and video call interactions

### Advanced Features
- **Real-time Processing**: WebSocket-based live updates
- **MCP Integration**: Model Context Protocol for enhanced AI interactions
- **Cloud Deployment**: Azure Functions and AWS Lambda support
- **Natural Language Queries**: Convert plain English to optimized SQL
- **Mock Data Generation**: Realistic test data with referential integrity
- **Video Call Integration**: Direct communication with AI agent

## 🏗️ Architecture

### Clean Architecture Implementation

```
src/
├── domain/entities/              # Core business entities
│   ├── Schema.js                # Database schema representation
│   ├── APISpec.js               # API specification entities
│   └── User.js                  # User entities with permissions
├── application/usecases/         # Business logic workflows
│   ├── ImageToSchemaUseCase.js  # ERD image analysis
│   ├── VoiceToERDUseCase.js     # Voice-to-schema conversion
│   ├── SchemaToAPIUseCase.js    # API generation from schemas
│   ├── AutonomousAgentUseCase.js # Multi-step autonomous workflows
│   ├── DatabaseManagementUseCase.js # DB operations & migrations
│   └── AccessControlUseCase.js  # Security & permissions
├── infrastructure/
│   ├── mcp/                     # Model Context Protocol
│   │   ├── MCPServer.js         # MCP server implementation
│   │   ├── MCPTools.js          # Available MCP tools
│   │   ├── MCPResources.js      # Resource management
│   │   └── MCPPrompts.js        # AI prompt templates
│   └── services/                # External integrations
│       ├── EnhancedOpenAIService.js # GPT-4 Vision & completions
│       ├── AzureSpeechService.js    # Speech-to-text/text-to-speech
│       ├── SupabaseService.js       # Database operations
│       ├── APIGeneratorService.js   # Express.js API generation
│       ├── CloudDeploymentService.js # Azure/AWS deployment
│       ├── RealtimeService.js       # WebSocket real-time updates
│       └── VideoCallService.js      # Twilio video integration
└── presentation/
    ├── controllers/             # HTTP request handlers
    │   ├── SchemaController.js  # Schema operations
    │   ├── AgentController.js   # Autonomous workflows
    │   ├── RealtimeController.js # WebSocket endpoints
    │   └── VoiceCallController.js # Video call management
    └── web/                     # Frontend interface
        ├── index.html           # Main dashboard
        ├── mvp.html            # Simplified interface
        ├── mcp-test.html       # MCP testing interface
        └── sw.js               # Service worker for PWA
```

## 🛠️ Quick Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- OpenAI API key (for GPT-4 Vision)
- Azure Speech Services key (optional)
- Supabase account (optional, for persistence)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Thando12345/ai-database-to-api-agent.git
   cd ai-database-to-api-agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your API keys:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # AI Services (Required for enhanced features)
   OPENAI_API_KEY=your_openai_key_here
   AZURE_SPEECH_KEY=your_azure_speech_key
   AZURE_SPEECH_REGION=eastus
   
   # Database (Optional - for persistence)
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   
   # Security
   JWT_SECRET=your-super-secret-jwt-key
   
   # File Upload
   MAX_FILE_SIZE=10485760
   UPLOAD_DIR=uploads
   ```

4. **Start the application**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

5. **Access the dashboard**
   Open `http://localhost:3000` in your browser

## 📋 API Endpoints

### Schema Operations
- `POST /api/analyze-image` - Convert ERD image to database schema
- `POST /api/analyze-text` - Convert text description to schema
- `POST /api/generate-schema` - Generate SQL from analysis
- `POST /api/generate-api` - Create Express.js API from schema

### Health & Monitoring
- `GET /health` - System health check
- `GET /` - Web dashboard interface

### MCP Integration
- `POST /mcp/tools` - Execute MCP tools
- `GET /mcp/resources` - List available resources
- `POST /mcp/prompts` - Generate AI prompts

## 🎯 Usage Examples

### 1. Image-to-API Workflow
```bash
# Upload ERD image and generate complete API
curl -X POST -F "image=@erd-diagram.png" \
  http://localhost:3000/api/analyze-image
```

### 2. Text-to-Schema Conversion
```bash
# Describe database in natural language
curl -X POST -H "Content-Type: application/json" \
  -d '{"text": "I need a user management system with users, roles, and permissions"}' \
  http://localhost:3000/api/analyze-text
```

### 3. Generate SQL Schema
```bash
# Convert analysis to SQL
curl -X POST -H "Content-Type: application/json" \
  -d '{"analysis": {...}}' \
  http://localhost:3000/api/generate-schema
```

## 🔐 Security Features

### Access Control Levels
1. **Unrestricted Access** - Full database and API rights
2. **No DB Access** - API-only access with database restrictions
3. **Table-level Permissions** - Granular table access control
4. **Row-level Security** - User-specific data filtering
5. **Data Masking** - Sensitive field obfuscation

### Implementation
- JWT-based authentication
- Role-based access control (RBAC)
- Policy-based authorization
- Row-level security policies
- Data masking for sensitive fields
- Comprehensive audit logging

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Docker
```bash
docker build -t ai-database-agent .
docker run -p 3000:3000 ai-database-agent
```

### Cloud Platforms
- **Azure Functions**: Use `render.yaml` configuration
- **AWS Lambda**: Serverless framework ready
- **Heroku**: Git-based deployment
- **Vercel**: Frontend deployment

## 🧪 Testing

### MCP Testing Interface
Access `http://localhost:3000/mcp-test.html` for:
- Tool execution testing
- Resource access validation
- Prompt generation testing
- Real-time communication testing

### Health Monitoring
- System status: `GET /health`
- Database connectivity validation
- External service availability checks

## 📚 Documentation

- **[Architecture Guide](docs/ARCHITECTURE.md)** - Detailed system architecture
- **[Production Guide](PRODUCTION_READY_GUIDE.md)** - Production deployment guide
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Cloud deployment instructions
- **[Realtime Setup](REALTIME_SETUP.md)** - WebSocket configuration
- **[Detailed Prompts](DETAILED_PROMPTS.md)** - AI prompt engineering

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 16+
- **Framework**: Express.js 4.18
- **File Upload**: Multer
- **WebSockets**: Native WebSocket API

### AI Services
- **Vision**: OpenAI GPT-4 Vision
- **Speech**: Azure Cognitive Services
- **LLM**: Multiple provider support
- **MCP**: Model Context Protocol

### Database
- **Primary**: PostgreSQL (Supabase)
- **Alternative**: SQLite, MySQL support
- **ORM**: Native SQL with connection pooling

### Frontend
- **Core**: Vanilla JavaScript
- **Styling**: TailwindCSS
- **PWA**: Service Worker enabled
- **Real-time**: WebSocket integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 Vision API
- Microsoft Azure for Speech Services
- Supabase for database infrastructure
- Express.js community
- Clean Architecture principles by Robert C. Martin

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Thando12345/ai-database-to-api-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Thando12345/ai-database-to-api-agent/discussions)
- **Documentation**: [Wiki](https://github.com/Thando12345/ai-database-to-api-agent/wiki)

---

**Made with ❤️ by AI Database Agent Team**
