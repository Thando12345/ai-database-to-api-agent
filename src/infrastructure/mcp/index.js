const MCPServer = require('./MCPServer');
const MCPTools = require('./MCPTools');
const MCPResources = require('./MCPResources');
const MCPPrompts = require('./MCPPrompts');
const { MCPTransport, MCPHTTPTransport } = require('./MCPTransport');

class DatabaseAPIAgentMCP {
    constructor(services, config = {}) {
        this.services = services;
        this.config = config;
        
        // Initialize MCP server
        this.server = new MCPServer({
            name: 'database-api-agent',
            version: '1.0.0',
            ...config.server
        });
        
        // Initialize components
        this.tools = new MCPTools(services);
        this.resources = new MCPResources(services);
        this.prompts = new MCPPrompts(services);
        
        // Transport layers
        this.wsTransport = null;
        this.httpTransport = null;
        
        this.setupMCP();
    }

    setupMCP() {
        // Register tools
        this.tools.getTools().forEach(tool => {
            this.server.registerTool(tool.name, tool.schema, tool.handler);
        });

        // Register resources
        this.resources.getResources().forEach(resource => {
            this.server.registerResource(resource.uri, resource.mimeType, resource.handler);
        });

        // Register prompts
        this.prompts.getPrompts().forEach(prompt => {
            this.server.registerPrompt(prompt.name, prompt.description, prompt.handler);
        });

        console.log('MCP server initialized with:');
        console.log(`- ${this.server.tools.size} tools`);
        console.log(`- ${this.server.resources.size} resources`);
        console.log(`- ${this.server.prompts.size} prompts`);
    }

    // Start WebSocket transport
    startWebSocket(port = 8080) {
        this.wsTransport = new MCPTransport(this.server, { port });
        this.wsTransport.start();
        return this;
    }

    // Setup HTTP transport (requires Express app)
    setupHTTP(app) {
        this.httpTransport = new MCPHTTPTransport(this.server, app);
        return this;
    }

    // Get server instance for direct access
    getServer() {
        return this.server;
    }

    // Get available tools
    getAvailableTools() {
        return Array.from(this.server.tools.keys());
    }

    // Get available resources
    getAvailableResources() {
        return Array.from(this.server.resources.keys());
    }

    // Get available prompts
    getAvailablePrompts() {
        return Array.from(this.server.prompts.keys());
    }

    // Execute tool directly
    async executeTool(name, args) {
        return await this.server.handleToolCall({ name, arguments: args });
    }

    // Read resource directly
    async readResource(uri) {
        return await this.server.handleResourceRead({ uri });
    }

    // Get prompt directly
    async getPrompt(name, args) {
        return await this.server.handlePromptGet({ name, arguments: args });
    }

    // Stop all transports
    stop() {
        if (this.wsTransport) {
            this.wsTransport.stop();
        }
        return this;
    }

    // Health check
    getHealth() {
        return {
            status: 'healthy',
            server: this.server.name,
            version: this.server.version,
            tools: this.server.tools.size,
            resources: this.server.resources.size,
            prompts: this.server.prompts.size,
            clients: this.server.clients.size,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }
}

// Factory function for easy setup
function createMCPServer(services, config = {}) {
    return new DatabaseAPIAgentMCP(services, config);
}

module.exports = {
    DatabaseAPIAgentMCP,
    createMCPServer,
    MCPServer,
    MCPTools,
    MCPResources,
    MCPPrompts,
    MCPTransport,
    MCPHTTPTransport
};