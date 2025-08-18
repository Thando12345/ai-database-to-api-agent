const { EventEmitter } = require('events');

class MCPServer extends EventEmitter {
    constructor(config = {}) {
        super();
        this.name = config.name || 'database-api-agent';
        this.version = config.version || '1.0.0';
        this.tools = new Map();
        this.resources = new Map();
        this.prompts = new Map();
        this.clients = new Set();
        this.capabilities = {
            tools: { listChanged: true },
            resources: { subscribe: true, listChanged: true },
            prompts: { listChanged: true },
            logging: {}
        };
    }

    registerTool(name, schema, handler) {
        this.tools.set(name, { schema, handler });
        this.emit('tools/list_changed');
        return this;
    }

    registerResource(uri, mimeType, handler) {
        this.resources.set(uri, { mimeType, handler });
        this.emit('resources/list_changed');
        return this;
    }

    registerPrompt(name, description, handler) {
        this.prompts.set(name, { description, handler });
        this.emit('prompts/list_changed');
        return this;
    }

    async handleRequest(request) {
        const { method, params } = request;

        switch (method) {
            case 'initialize':
                return this.handleInitialize(params);
            case 'tools/list':
                return this.handleToolsList();
            case 'tools/call':
                return this.handleToolCall(params);
            case 'resources/list':
                return this.handleResourcesList();
            case 'resources/read':
                return this.handleResourceRead(params);
            case 'prompts/list':
                return this.handlePromptsList();
            case 'prompts/get':
                return this.handlePromptGet(params);
            default:
                throw new Error(`Unknown method: ${method}`);
        }
    }

    async handleInitialize(params) {
        return {
            protocolVersion: '2024-11-05',
            capabilities: this.capabilities,
            serverInfo: {
                name: this.name,
                version: this.version
            }
        };
    }

    async handleToolsList() {
        return {
            tools: Array.from(this.tools.entries()).map(([name, { schema }]) => ({
                name,
                ...schema
            }))
        };
    }

    async handleToolCall(params) {
        const { name, arguments: args } = params;
        const tool = this.tools.get(name);
        
        if (!tool) {
            throw new Error(`Tool not found: ${name}`);
        }

        try {
            const result = await tool.handler(args);
            return {
                content: [
                    {
                        type: 'text',
                        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    }

    async handleResourcesList() {
        return {
            resources: Array.from(this.resources.entries()).map(([uri, { mimeType }]) => ({
                uri,
                mimeType,
                name: uri.split('/').pop()
            }))
        };
    }

    async handleResourceRead(params) {
        const { uri } = params;
        const resource = this.resources.get(uri);
        
        if (!resource) {
            throw new Error(`Resource not found: ${uri}`);
        }

        const content = await resource.handler();
        return {
            contents: [
                {
                    uri,
                    mimeType: resource.mimeType,
                    text: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
                }
            ]
        };
    }

    async handlePromptsList() {
        return {
            prompts: Array.from(this.prompts.entries()).map(([name, { description }]) => ({
                name,
                description
            }))
        };
    }

    async handlePromptGet(params) {
        const { name, arguments: args } = params;
        const prompt = this.prompts.get(name);
        
        if (!prompt) {
            throw new Error(`Prompt not found: ${name}`);
        }

        const result = await prompt.handler(args);
        return {
            description: prompt.description,
            messages: result.messages || [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: result.text || result
                    }
                }
            ]
        };
    }

    addClient(client) {
        this.clients.add(client);
        return this;
    }

    removeClient(client) {
        this.clients.delete(client);
        return this;
    }

    broadcast(notification) {
        this.clients.forEach(client => {
            if (client.send) {
                client.send(notification);
            }
        });
    }

    log(level, message, data = {}) {
        const logEntry = {
            level,
            logger: this.name,
            data: {
                message,
                ...data
            }
        };
        
        this.broadcast({
            method: 'notifications/message',
            params: logEntry
        });
    }
}

module.exports = MCPServer;