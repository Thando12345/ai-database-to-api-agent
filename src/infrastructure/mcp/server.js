#!/usr/bin/env node

const { createMCPServer } = require('./index');
const config = require('../../../mcp-config.json');

// Mock services for standalone MCP server
const mockServices = {
    imageToSchemaUseCase: {
        async execute({ imageData, format }) {
            return {
                schema: 'CREATE TABLE users (id UUID PRIMARY KEY, email VARCHAR(255));',
                tables: ['users'],
                relationships: [],
                format
            };
        }
    },
    voiceToERDUseCase: {
        async execute({ audioBuffer, format }) {
            return {
                transcript: 'Create a user table with email and password',
                schema: 'CREATE TABLE users (id UUID PRIMARY KEY, email VARCHAR(255), password VARCHAR(255));',
                entities: ['users']
            };
        }
    },
    schemaToAPIUseCase: {
        async execute({ schema, framework, includeAuth }) {
            return {
                code: '// Generated Express.js API code',
                endpoints: ['/api/users'],
                documentation: 'API documentation',
                framework
            };
        }
    },
    databaseService: {
        async deploySchema(schema, environment) {
            return {
                id: 'deploy_123',
                connectionString: 'postgresql://localhost:5432/test',
                tables: ['users'],
                environment
            };
        },
        async validateSchema(schema, options) {
            return {
                isValid: true,
                errors: [],
                warnings: [],
                suggestions: ['Add indexes for better performance'],
                score: 85
            };
        },
        async optimizeQueries(queries, schema) {
            return queries.map(query => ({
                original: query,
                optimized: query + ' -- optimized',
                improvement: '20% faster',
                explanation: 'Added index usage'
            }));
        }
    },
    supabaseService: {
        async getSchemas() {
            return [
                {
                    id: '1',
                    name: 'User Management',
                    description: 'User authentication and profiles',
                    created_at: new Date().toISOString(),
                    status: 'active',
                    tables: ['users', 'profiles']
                }
            ];
        },
        async getActiveSchema() {
            return {
                id: '1',
                name: 'Active Schema',
                description: 'Currently active schema',
                sql_content: 'CREATE TABLE users (id UUID PRIMARY KEY);',
                tables: ['users'],
                relationships: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        },
        async getAPISpecs() {
            return [
                {
                    id: '1',
                    name: 'User API',
                    version: '1.0.0',
                    framework: 'express',
                    endpoints: ['/api/users'],
                    status: 'active',
                    created_at: new Date().toISOString()
                }
            ];
        },
        async getDeployments() {
            return [
                {
                    id: '1',
                    environment: 'development',
                    status: 'running',
                    url: 'https://api.example.com',
                    version: '1.0.0',
                    deployed_at: new Date().toISOString(),
                    health_status: 'healthy'
                }
            ];
        },
        async getAuditLogs({ limit = 50 }) {
            return Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
                id: `log_${i}`,
                operation: 'CREATE',
                table_name: 'users',
                user_id: 'user_123',
                timestamp: new Date().toISOString(),
                new_values: { email: 'user@example.com' }
            }));
        }
    },
    openaiService: {
        // Mock OpenAI service for prompts
    }
};

async function startMCPServer() {
    try {
        console.log('Starting Database-to-API Agent MCP Server...');
        
        // Create MCP server with mock services
        const mcpServer = createMCPServer(mockServices, config);
        
        // Start WebSocket transport
        const wsPort = config.transport?.websocket?.port || 8080;
        mcpServer.startWebSocket(wsPort);
        
        console.log(`MCP Server started successfully!`);
        console.log(`WebSocket: ws://localhost:${wsPort}`);
        console.log(`Health: Available tools: ${mcpServer.getAvailableTools().length}`);
        console.log(`Health: Available resources: ${mcpServer.getAvailableResources().length}`);
        console.log(`Health: Available prompts: ${mcpServer.getAvailablePrompts().length}`);
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\nShutting down MCP server...');
            mcpServer.stop();
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            console.log('\nShutting down MCP server...');
            mcpServer.stop();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('Failed to start MCP server:', error);
        process.exit(1);
    }
}

// Start server if run directly
if (require.main === module) {
    startMCPServer();
}

module.exports = { startMCPServer, mockServices };