require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const SimpleVisionService = require('./src/infrastructure/services/SimpleVisionService');
const SimpleVoIPService = require('./src/infrastructure/services/SimpleVoIPService');
const SimpleAIAgentService = require('./src/infrastructure/services/SimpleAIAgentService');
const SimpleRAGService = require('./src/infrastructure/services/SimpleRAGService');

// Try to load canvas, fallback if not available
let createCanvas = null;
try {
    const canvas = require('canvas');
    createCanvas = canvas.createCanvas;
} catch (error) {
    console.log('Canvas not available, using SVG fallback for ERD generation');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize simple services
const visionService = new SimpleVisionService();
const voipService = new SimpleVoIPService();
const aiAgentService = new SimpleAIAgentService();
const ragService = new SimpleRAGService();

// Middleware
app.use(express.json());

// Static file serving with proper MIME types
app.use(express.static('src/presentation/web', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
    }
}));

// Explicit routes for problematic JS files
app.get('/real-time-client.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.sendFile(path.join(__dirname, 'src/presentation/web/real-time-client.js'));
});

app.get('/erd-generator.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.sendFile(path.join(__dirname, 'src/presentation/web/erd-generator.js'));
});

app.get('/voip-realtime.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.sendFile(path.join(__dirname, 'src/presentation/web/voip-realtime.js'));
});

// Socket.IO will be initialized after server creation
let io;

// File upload configuration
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files allowed'));
        }
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/presentation/web/index.html'));
});

app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
    const startTime = Date.now();
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const imageBuffer = fs.readFileSync(req.file.path);
        
        // Real-time vision analysis with validation
        const analysis = await visionService.analyzeERDImage(imageBuffer);
        
        // Add processing metadata
        analysis.processing_time = Date.now() - startTime;
        analysis.file_size = req.file.size;
        analysis.timestamp = new Date().toISOString();
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({ 
            success: true, 
            analysis,
            processing_time: analysis.processing_time + 'ms'
        });
    } catch (error) {
        console.error('Image analysis error:', error);
        
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            error: 'Analysis failed: ' + error.message,
            processing_time: (Date.now() - startTime) + 'ms'
        });
    }
});

app.post('/api/analyze-text', (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        // Simple text analysis
        const words = text.toLowerCase();
        const tables = [];

        if (words.includes('user') || words.includes('customer')) {
            tables.push({
                name: 'users',
                columns: [
                    { name: 'user_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                    { name: 'name', type: 'VARCHAR(100)', constraints: ['NOT NULL'] },
                    { name: 'email', type: 'VARCHAR(255)', constraints: ['UNIQUE'] }
                ]
            });
        }

        if (words.includes('product') || words.includes('item')) {
            tables.push({
                name: 'products',
                columns: [
                    { name: 'product_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                    { name: 'name', type: 'VARCHAR(200)', constraints: ['NOT NULL'] },
                    { name: 'price', type: 'DECIMAL(10,2)', constraints: ['NOT NULL'] }
                ]
            });
        }

        if (words.includes('order') || words.includes('purchase')) {
            tables.push({
                name: 'orders',
                columns: [
                    { name: 'order_id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                    { name: 'user_id', type: 'INTEGER', constraints: ['REFERENCES users(user_id)'] },
                    { name: 'total', type: 'DECIMAL(10,2)', constraints: ['NOT NULL'] }
                ]
            });
        }

        if (tables.length === 0) {
            tables.push({
                name: 'entities',
                columns: [
                    { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                    { name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }
                ]
            });
        }

        const analysis = { tables, relationships: [] };
        
        // Generate ERD image
        const erdImage = generateERDImage(analysis);
        
        res.json({ 
            success: true, 
            analysis,
            erdImage: erdImage.base64,
            downloadUrl: `/download/erd-${Date.now()}.png`
        });
    } catch (error) {
        console.error('Text analysis error:', error);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

app.post('/api/generate-schema', (req, res) => {
    try {
        const { analysis } = req.body;
        
        let sql = '-- Generated SQL Schema\n\n';
        
        analysis.tables.forEach(table => {
            sql += `CREATE TABLE ${table.name} (\n`;
            table.columns.forEach((col, index) => {
                const comma = index < table.columns.length - 1 ? ',' : '';
                const constraints = col.constraints ? ' ' + col.constraints.join(' ') : '';
                sql += `    ${col.name} ${col.type}${constraints}${comma}\n`;
            });
            sql += ');\n\n';
        });

        res.json({ success: true, schema: sql });
    } catch (error) {
        console.error('Schema generation error:', error);
        res.status(500).json({ error: 'Schema generation failed' });
    }
});

app.post('/api/generate-api', (req, res) => {
    try {
        const { analysis } = req.body;
        
        let code = `const express = require('express');
const app = express();
app.use(express.json());

`;
        
        analysis.tables.forEach(table => {
            const name = table.name;
            code += `// ${name} endpoints
app.get('/api/${name}', (req, res) => {
    res.json({ message: 'Get all ${name}' });
});

app.post('/api/${name}', (req, res) => {
    res.json({ message: 'Create ${name.slice(0, -1)}', data: req.body });
});

`;
        });

        code += `app.listen(3000, () => {
    console.log('API running on port 3000');
});`;

        res.json({ success: true, apiCode: code });
    } catch (error) {
        console.error('API generation error:', error);
        res.status(500).json({ error: 'API generation failed' });
    }
});

// ERD Image Generation Function
function generateERDImage(analysis) {
    if (createCanvas) {
        return generateCanvasERD(analysis);
    } else {
        return generateSVGERD(analysis);
    }
}

function generateCanvasERD(analysis) {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 800, 600);
    
    // Title
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Entity Relationship Diagram', 50, 40);
    
    // Draw tables
    let yPos = 80;
    const tableWidth = 200;
    const tableHeight = 120;
    const spacing = 250;
    
    analysis.tables.forEach((table, index) => {
        const xPos = 50 + (index % 3) * spacing;
        const currentY = yPos + Math.floor(index / 3) * 180;
        
        // Table box
        ctx.fillStyle = '#3498db';
        ctx.fillRect(xPos, currentY, tableWidth, tableHeight);
        
        // Table header
        ctx.fillStyle = '#2980b9';
        ctx.fillRect(xPos, currentY, tableWidth, 30);
        
        // Table name
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(table.name.toUpperCase(), xPos + 10, currentY + 20);
        
        // Columns
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        table.columns.forEach((col, colIndex) => {
            const isPK = col.constraints && col.constraints.includes('PRIMARY KEY');
            const text = `${isPK ? 'PK ' : ''}${col.name}: ${col.type}`;
            ctx.fillText(text, xPos + 10, currentY + 50 + (colIndex * 15));
        });
    });
    
    // Add timestamp
    ctx.fillStyle = '#7f8c8d';
    ctx.font = '10px Arial';
    ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 50, 580);
    
    return {
        buffer: canvas.toBuffer('image/png'),
        base64: canvas.toDataURL('image/png')
    };
}

function generateSVGERD(analysis) {
    const width = 800;
    const height = 600;
    const tableWidth = 200;
    const tableHeight = 120;
    const spacing = 250;
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Background
    svg += `<rect width="${width}" height="${height}" fill="#f8f9fa"/>`;
    
    // Title
    svg += `<text x="50" y="40" font-family="Arial" font-size="24" font-weight="bold" fill="#2c3e50">Entity Relationship Diagram</text>`;
    
    // Arrow marker definition
    svg += `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#e74c3c"/></marker></defs>`;
    
    // Draw tables and store positions
    let yPos = 80;
    const tablePositions = {};
    
    analysis.tables.forEach((table, index) => {
        const xPos = 50 + (index % 3) * spacing;
        const currentY = yPos + Math.floor(index / 3) * 180;
        
        tablePositions[table.name] = { x: xPos, y: currentY, width: tableWidth, height: tableHeight };
        
        // Table box
        svg += `<rect x="${xPos}" y="${currentY}" width="${tableWidth}" height="${tableHeight}" fill="#3498db" stroke="#2980b9"/>`;
        
        // Table header
        svg += `<rect x="${xPos}" y="${currentY}" width="${tableWidth}" height="30" fill="#2980b9"/>`;
        
        // Table name
        svg += `<text x="${xPos + 10}" y="${currentY + 20}" font-family="Arial" font-size="16" font-weight="bold" fill="white">${table.name.toUpperCase()}</text>`;
        
        // Columns
        table.columns.forEach((col, colIndex) => {
            const isPK = col.constraints && col.constraints.includes('PRIMARY KEY');
            const isFK = col.constraints && col.constraints.some(c => c.includes('REFERENCES'));
            const text = `${isPK ? 'PK ' : isFK ? 'FK ' : ''}${col.name}: ${col.type}`;
            svg += `<text x="${xPos + 10}" y="${currentY + 50 + (colIndex * 15)}" font-family="Arial" font-size="12" fill="#2c3e50">${text}</text>`;
        });
    });
    
    // Draw connections
    analysis.tables.forEach(table => {
        table.columns.forEach(col => {
            if (col.constraints) {
                const refConstraint = col.constraints.find(c => c.includes('REFERENCES'));
                if (refConstraint) {
                    const match = refConstraint.match(/REFERENCES (\w+)/);
                    if (match && tablePositions[match[1]] && tablePositions[table.name]) {
                        const from = tablePositions[table.name];
                        const to = tablePositions[match[1]];
                        
                        const fromX = from.x + from.width;
                        const fromY = from.y + from.height / 2;
                        const toX = to.x;
                        const toY = to.y + to.height / 2;
                        
                        svg += `<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="#e74c3c" stroke-width="2" marker-end="url(#arrowhead)"/>`;
                    }
                }
            }
        });
    });
    
    // Add timestamp
    svg += `<text x="50" y="580" font-family="Arial" font-size="10" fill="#7f8c8d">Generated: ${new Date().toLocaleString()}</text>`;
    
    svg += '</svg>';
    
    // Convert SVG to data URL
    const base64 = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
    
    return {
        buffer: Buffer.from(svg),
        base64: base64,
        svg: svg
    };
}

// Download endpoint for ERD images
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    
    // For demo, generate a simple ERD
    const demoAnalysis = {
        tables: [
            {
                name: 'users',
                columns: [
                    { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                    { name: 'name', type: 'VARCHAR(100)', constraints: ['NOT NULL'] },
                    { name: 'email', type: 'VARCHAR(255)', constraints: ['UNIQUE'] }
                ]
            },
            {
                name: 'posts',
                columns: [
                    { name: 'id', type: 'SERIAL', constraints: ['PRIMARY KEY'] },
                    { name: 'user_id', type: 'INTEGER', constraints: ['REFERENCES users(id)'] },
                    { name: 'title', type: 'VARCHAR(255)', constraints: ['NOT NULL'] }
                ]
            }
        ]
    };
    
    const erdImage = generateERDImage(demoAnalysis);
    
    if (erdImage.svg) {
        // SVG fallback
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', `attachment; filename="${filename.replace('.png', '.svg')}"`);
        res.send(erdImage.svg);
    } else {
        // Canvas PNG
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(erdImage.buffer);
    }
});

// Initialize Twilio if credentials are provided
let twilioClient = null;
if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
        const twilio = require('twilio');
        twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
        console.log('✅ Twilio client initialized');
    } catch (error) {
        console.log('⚠️  Twilio initialization failed:', error.message);
    }
} else {
    console.log('⚠️  Twilio credentials not found - using simulation mode');
}

// Simple VoIP Call Endpoints
app.post('/api/voip/start-call', async (req, res) => {
    try {
        const { phoneNumber, clientId } = req.body;
        
        const result = await voipService.startVoIPCall(phoneNumber, clientId);
        
        if (result.success) {
            // Start AI agent session
            const agentSession = await aiAgentService.startAIAgent(result.callId, phoneNumber);
            res.json({ ...result, agentSession });
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/voip/end-call', async (req, res) => {
    try {
        const { callId } = req.body;
        
        const result = voipService.endCall(callId);
        const report = await aiAgentService.endSession(callId);
        
        res.json({ ...result, report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/voip/report/:callId', (req, res) => {
    const { callId } = req.params;
    const report = voipService.getCallReport(callId);
    res.json({ success: true, report });
});

// AI Agent Endpoints
app.post('/api/agent/start-session', async (req, res) => {
    try {
        const { phoneNumber, type } = req.body;
        const sessionId = 'session_' + Date.now();
        
        const result = await aiAgentService.startAIAgent(sessionId, phoneNumber);
        res.json({ success: true, sessionId, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/agent/end-session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const report = await aiAgentService.endSession(sessionId);
        res.json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/agent/text-input', async (req, res) => {
    try {
        const { sessionId, text } = req.body;
        
        // Use RAG for intelligent responses
        const ragResponse = await ragService.generateRAGResponse(text);
        
        res.json({ 
            success: true, 
            response: ragResponse,
            sessionId 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/agent/report/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const report = await aiAgentService.endSession(sessionId);
        res.json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Legacy phone call endpoint
app.post('/api/request-call', async (req, res) => {
    try {
        const { phoneNumber, purpose, sessionId } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        
        // Validate phone number format
        const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
        const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
        
        if (!phoneRegex.test(cleanPhone)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }
        
        console.log(`📞 Call request received:`);
        console.log(`   Phone: ${phoneNumber}`);
        console.log(`   Purpose: ${purpose || 'Database consultation'}`);
        console.log(`   Session: ${sessionId || 'N/A'}`);
        console.log(`   Time: ${new Date().toISOString()}`);
        
        if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
            try {
                // Make actual Twilio call
                const call = await twilioClient.calls.create({
                    to: phoneNumber,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/voice/twiml`,
                    method: 'POST',
                    statusCallback: `${process.env.BASE_URL || 'http://localhost:3000'}/api/voice/status`,
                    statusCallbackMethod: 'POST'
                });
                
                console.log(`📞 Real call initiated: ${call.sid}`);
                
                res.json({
                    success: true,
                    message: 'Real call initiated successfully',
                    phoneNumber: phoneNumber,
                    callId: call.sid,
                    estimatedCallTime: '5-10 seconds',
                    type: 'real_call'
                });
                
            } catch (twilioError) {
                console.error('Twilio call error:', twilioError);
                
                // Fallback to simulation
                const callId = `sim_${Date.now()}`;
                setTimeout(() => {
                    console.log(`📞 Simulated call to ${phoneNumber}`);
                }, 2000);
                
                res.json({
                    success: true,
                    message: 'Call simulation started (Twilio error)',
                    phoneNumber: phoneNumber,
                    callId: callId,
                    estimatedCallTime: '2-3 minutes',
                    type: 'simulation',
                    error: twilioError.message
                });
            }
        } else {
            // Simulation mode
            const callId = `sim_${Date.now()}`;
            setTimeout(() => {
                console.log(`📞 Simulated call to ${phoneNumber}`);
            }, 2000);
            
            res.json({
                success: true,
                message: 'Call simulation started (no Twilio config)',
                phoneNumber: phoneNumber,
                callId: callId,
                estimatedCallTime: '2-3 minutes',
                type: 'simulation'
            });
        }
        
    } catch (error) {
        console.error('Call request error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to process call request: ' + error.message 
        });
    }
});

// Legacy TwiML endpoint
app.post('/api/voice/twiml', (req, res) => {
    try {
        let twiml;
        
        if (twilioClient) {
            const VoiceResponse = require('twilio').twiml.VoiceResponse;
            twiml = new VoiceResponse();
            
            twiml.say({
                voice: 'alice',
                language: 'en-US'
            }, 'Hello! I am your AI Database Assistant. I understand you need help with database design.');
            
            const gather = twiml.gather({
                input: 'speech',
                timeout: 10,
                speechTimeout: 'auto',
                action: '/api/voice/process-speech',
                method: 'POST'
            });
            
            gather.say({
                voice: 'alice',
                language: 'en-US'
            }, 'Please describe your database requirements. For example, tell me about the type of application you are building.');
            
            twiml.say({
                voice: 'alice',
                language: 'en-US'
            }, 'Thank you for calling. I will help you design your database schema.');
            
            twiml.hangup();
        } else {
            // Fallback TwiML
            twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Hello from AI Database Agent</Say><Hangup/></Response>';
        }
        
        res.type('text/xml');
        res.send(twiml.toString());
        
    } catch (error) {
        console.error('TwiML generation error:', error);
        res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error occurred</Say><Hangup/></Response>');
    }
});

// Voice processing endpoint
app.post('/api/voice/process-speech', (req, res) => {
    try {
        const { SpeechResult, CallSid } = req.body;
        
        console.log(`📞 Speech received from ${CallSid}: ${SpeechResult}`);
        
        let twiml;
        
        if (twilioClient) {
            const VoiceResponse = require('twilio').twiml.VoiceResponse;
            twiml = new VoiceResponse();
            
            // Generate response based on speech
            let response = 'I understand you need help with database design.';
            
            if (SpeechResult && SpeechResult.toLowerCase().includes('ecommerce')) {
                response = 'Perfect! For an e-commerce system, I recommend tables for customers, products, orders, and categories. I will generate this schema for you.';
            } else if (SpeechResult && SpeechResult.toLowerCase().includes('blog')) {
                response = 'Great! For a blog system, you will need users, posts, comments, and categories tables. I will create this structure for you.';
            }
            
            twiml.say({
                voice: 'alice',
                language: 'en-US'
            }, response);
            
            twiml.say({
                voice: 'alice',
                language: 'en-US'
            }, 'I will now generate your database schema and API. You can view the results in your dashboard. Thank you for calling!');
            
            twiml.hangup();
        } else {
            twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Processing complete</Say><Hangup/></Response>';
        }
        
        res.type('text/xml');
        res.send(twiml.toString());
        
    } catch (error) {
        console.error('Speech processing error:', error);
        res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Processing error</Say><Hangup/></Response>');
    }
});

// Call status webhook
app.post('/api/voice/status', (req, res) => {
    try {
        const { CallSid, CallStatus, Duration } = req.body;
        
        console.log(`📞 Call ${CallSid} status: ${CallStatus}`);
        if (Duration) {
            console.log(`📞 Call duration: ${Duration} seconds`);
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Call status error:', error);
        res.status(500).json({ success: false });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        twilio: twilioClient ? 'connected' : 'simulation',
        endpoints: {
            call_request: '/api/request-call',
            twiml: '/api/voice/twiml',
            speech_processing: '/api/voice/process-speech',
            call_status: '/api/voice/status'
        }
    });
});

// 404 handler for missing files
app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
        console.log(`❌ Missing JS file: ${req.path}`);
        res.status(404).send(`// File not found: ${req.path}`);
    } else {
        next();
    }
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server with WebSocket support
const http = require('http');
const server = http.createServer(app);

// Initialize Socket.IO after server creation
const { Server } = require('socket.io');
io = new Server(server, {
    cors: { 
        origin: "*",
        methods: ["GET", "POST"]
    },
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('✅ Socket.IO client connected:', socket.id);
    
    socket.emit('welcome', { message: 'Connected to AI Database Agent' });
    
    socket.on('disconnect', () => {
        console.log('❌ Socket.IO client disconnected:', socket.id);
    });
    
    socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
    });
});

// Initialize WebSocket for VoIP
try {
    voipService.initializeWebSocketServer(server);
} catch (error) {
    console.log('VoIP WebSocket initialization skipped:', error.message);
}

server.listen(PORT, () => {
    console.log(`🚀 AI Database-to-API Agent running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} to get started`);
    console.log(`🔊 VoIP WebSocket server ready`);
    console.log(`⚡ Socket.IO server ready`);
    console.log(`📁 Static files served from: src/presentation/web`);
});

module.exports = app;