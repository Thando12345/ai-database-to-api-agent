const { WebSocketServer } = require('ws');
const { EventEmitter } = require('events');

class MCPTransport extends EventEmitter {
    constructor(server, options = {}) {
        super();
        this.server = server;
        this.port = options.port || 8080;
        this.wss = null;
        this.clients = new Map();
        this.requestId = 0;
    }

    start() {
        this.wss = new WebSocketServer({ port: this.port });
        
        this.wss.on('connection', (ws, req) => {
            const clientId = this.generateClientId();
            const client = new MCPClient(clientId, ws, this.server);
            
            this.clients.set(clientId, client);
            this.server.addClient(client);
            
            console.log(`MCP client connected: ${clientId}`);
            
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    await this.handleMessage(client, message);
                } catch (error) {
                    this.sendError(client, null, error.message);
                }
            });
            
            ws.on('close', () => {
                this.clients.delete(clientId);
                this.server.removeClient(client);
                console.log(`MCP client disconnected: ${clientId}`);
            });
            
            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, error);
            });
        });
        
        console.log(`MCP server listening on port ${this.port}`);
        return this;
    }

    stop() {
        if (this.wss) {
            this.wss.close();
            this.clients.clear();
        }
        return this;
    }

    async handleMessage(client, message) {
        const { id, method, params } = message;
        
        try {
            // Handle MCP protocol messages
            if (method === 'initialize') {
                const result = await this.server.handleRequest(message);
                this.sendResponse(client, id, result);
                return;
            }
            
            // Handle other MCP methods
            const result = await this.server.handleRequest(message);
            this.sendResponse(client, id, result);
            
        } catch (error) {
            this.sendError(client, id, error.message);
        }
    }

    sendResponse(client, id, result) {
        const response = {
            jsonrpc: '2.0',
            id,
            result
        };
        
        client.send(JSON.stringify(response));
    }

    sendError(client, id, message, code = -32603) {
        const response = {
            jsonrpc: '2.0',
            id,
            error: {
                code,
                message
            }
        };
        
        client.send(JSON.stringify(response));
    }

    sendNotification(method, params) {
        const notification = {
            jsonrpc: '2.0',
            method,
            params
        };
        
        const message = JSON.stringify(notification);
        this.clients.forEach(client => {
            client.send(message);
        });
    }

    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

class MCPClient {
    constructor(id, ws, server) {
        this.id = id;
        this.ws = ws;
        this.server = server;
        this.initialized = false;
    }

    send(message) {
        if (this.ws.readyState === this.ws.OPEN) {
            this.ws.send(message);
        }
    }

    async initialize(params) {
        const result = await this.server.handleInitialize(params);
        this.initialized = true;
        return result;
    }
}

// HTTP Transport for REST-like access
class MCPHTTPTransport {
    constructor(server, app) {
        this.server = server;
        this.app = app;
        this.setupRoutes();
    }

    setupRoutes() {
        // MCP over HTTP endpoints
        this.app.post('/mcp/tools/list', async (req, res) => {
            try {
                const result = await this.server.handleRequest({
                    method: 'tools/list',
                    params: {}
                });
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/mcp/tools/call', async (req, res) => {
            try {
                const result = await this.server.handleRequest({
                    method: 'tools/call',
                    params: req.body
                });
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/mcp/resources/list', async (req, res) => {
            try {
                const result = await this.server.handleRequest({
                    method: 'resources/list',
                    params: {}
                });
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/mcp/resources/read', async (req, res) => {
            try {
                const result = await this.server.handleRequest({
                    method: 'resources/read',
                    params: { uri: req.query.uri }
                });
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/mcp/prompts/list', async (req, res) => {
            try {
                const result = await this.server.handleRequest({
                    method: 'prompts/list',
                    params: {}
                });
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/mcp/prompts/get', async (req, res) => {
            try {
                const result = await this.server.handleRequest({
                    method: 'prompts/get',
                    params: req.body
                });
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // MCP base route
        this.app.get('/mcp', (req, res) => {
            res.json({
                message: 'MCP Server Active',
                server: this.server.name,
                version: this.server.version,
                endpoints: {
                    health: '/mcp/health',
                    tools: '/mcp/tools/list',
                    resources: '/mcp/resources/list',
                    prompts: '/mcp/prompts/list'
                },
                websocket: 'ws://localhost:8080'
            });
        });

        // Health check for MCP server
        this.app.get('/mcp/health', (req, res) => {
            res.json({
                status: 'healthy',
                server: this.server.name,
                version: this.server.version,
                capabilities: this.server.capabilities,
                tools: this.server.tools.size,
                resources: this.server.resources.size,
                prompts: this.server.prompts.size,
                timestamp: new Date().toISOString()
            });
        });
    }
}

module.exports = { MCPTransport, MCPHTTPTransport };