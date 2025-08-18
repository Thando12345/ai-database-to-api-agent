# Architecture Documentation

## Clean Architecture Implementation

### Domain Layer (Entities)
- **Schema.js** - Database schema representation with tables, columns, relationships
- **APISpec.js** - API specification entities for endpoint generation
- **User.js** - User entities with roles, permissions, and access policies

### Application Layer (Use Cases)
- **ImageToSchemaUseCase** - Convert ERD images to database schemas
- **VoiceToERDUseCase** - Convert voice descriptions to ERD structures
- **SchemaToAPIUseCase** - Transform schemas into deployable APIs
- **AutonomousAgentUseCase** - Multi-step workflows with minimal user input
- **DatabaseManagementUseCase** - Migrations, mock data, natural language queries
- **AccessControlUseCase** - Security enforcement and data masking

### Infrastructure Layer (Services)
- **OpenAIVisionService** - GPT-4 Vision for ERD image analysis
- **AzureSpeechService** - Speech-to-text and text-to-speech
- **NeonDatabaseService** - MCP integration with Neon database
- **CloudDeploymentService** - Azure Functions and AWS Lambda deployment
- **VideoCallService** - Direct communication with AI agent

### Presentation Layer (Controllers & Web)
- **SchemaController** - REST endpoints for schema operations
- **AgentController** - Autonomous workflows and advanced features
- **Web Dashboard** - Multimodal interface (image, voice, video)

## Key Workflows

### 1. Image-to-Code Workflow
```
User uploads ERD image → 
GPT-4 Vision extracts schema → 
Generate SQL tables → 
Create CRUD API endpoints → 
Deploy to cloud platform
```

### 2. Voice-to-ERD Workflow
```
User records description → 
Azure Speech-to-Text → 
LLM generates ERD structure → 
Convert to database schema → 
Generate and deploy API
```

### 3. Autonomous Agent Mode
```
Input (image/voice) → 
Schema generation → 
Database migration → 
Mock data generation → 
API deployment → 
Spoken feedback
```

## Security Implementation

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

## Technology Stack

### Core Technologies
- **Backend**: Node.js with Express
- **Database**: PostgreSQL (Neon)
- **AI Services**: OpenAI GPT-4, Azure Cognitive Services
- **Cloud**: Azure Functions, AWS Lambda
- **Communication**: Twilio for voice/video calls

### Architecture Principles
- **SOLID Principles** - Single responsibility, dependency inversion
- **Clean Architecture** - Clear separation of concerns
- **Dependency Injection** - Testable, modular design
- **MCP Integration** - Model Context Protocol for database operations