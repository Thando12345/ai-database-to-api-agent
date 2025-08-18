const RealTimeVisionService = require('./RealTimeVisionService');
const AccurateSpeechService = require('./AccurateSpeechService');

class RealTimeProcessingService {
  constructor() {
    this.io = null;
    this.activeConnections = new Map();
    this.processingQueue = [];
    this.isProcessing = false;
    
    // Initialize real services
    this.visionService = new RealTimeVisionService();
    this.speechService = new AccurateSpeechService();
    
    console.log('✅ Real-time processing service initialized');
  }

  setupSocketHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log('🔗 Real-time client connected:', socket.id);
      this.activeConnections.set(socket.id, {
        socket,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      socket.on('process-image-realtime', async (data) => {
        await this.handleRealTimeImageProcessing(socket, data);
      });

      socket.on('process-voice-realtime', async (data) => {
        await this.handleRealTimeVoiceProcessing(socket, data);
      });

      socket.on('get-processing-status', () => {
        socket.emit('processing-status-response', {
          visionProvider: this.visionService.getProviderStatus(),
          speechProvider: this.speechService.getProviderStatus ? this.speechService.getProviderStatus() : { status: 'available' },
          activeConnections: this.activeConnections.size,
          timestamp: new Date().toISOString()
        });
      });

      socket.on('join-chat', (chatId) => {
        socket.join(chatId);
        console.log(`📱 Socket ${socket.id} joined chat: ${chatId}`);
      });

      socket.on('disconnect', () => {
        console.log('❌ Real-time client disconnected:', socket.id);
        this.activeConnections.delete(socket.id);
      });
    });
  }

  async handleRealTimeImageProcessing(socket, data) {
    try {
      const { imageBuffer, filename, sessionId } = data;
      
      if (!imageBuffer) {
        throw new Error('No image data provided');
      }

      console.log(`🔍 Processing image: ${filename} for session: ${sessionId}`);
      
      // Real-time progress updates
      const onProgress = (message) => {
        socket.emit('processing-progress', {
          sessionId,
          message,
          timestamp: new Date().toISOString()
        });
      };

      socket.emit('processing-started', {
        sessionId,
        message: '🚀 Starting real-time ERD analysis...',
        filename
      });

      // Convert base64 to buffer if needed
      let buffer;
      if (typeof imageBuffer === 'string') {
        buffer = Buffer.from(imageBuffer, 'base64');
      } else {
        buffer = Buffer.from(imageBuffer);
      }

      // Process with real AI vision
      const analysis = await this.visionService.analyzeERDRealTime(buffer, onProgress);
      
      const result = {
        success: true,
        analysis,
        sessionId,
        filename,
        provider: analysis.provider,
        timestamp: analysis.timestamp,
        message: '✅ Real-time ERD analysis complete!'
      };
      
      socket.emit('processing-complete', result);
      
      // Broadcast to all clients in session
      this.broadcastToSession(sessionId, 'analysis-result', result);
      
    } catch (error) {
      console.error('Real-time image processing error:', error);
      socket.emit('processing-error', {
        sessionId: data.sessionId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleRealTimeVoiceProcessing(socket, data) {
    try {
      const { audioBuffer, transcript, sessionId } = data;
      
      console.log(`🎤 Processing voice for session: ${sessionId}`);
      
      const onProgress = (message) => {
        socket.emit('processing-progress', {
          sessionId,
          message,
          timestamp: new Date().toISOString()
        });
      };

      socket.emit('processing-started', {
        sessionId,
        message: '🎤 Starting real-time voice processing...'
      });

      let finalTranscript = transcript;
      
      // If audio buffer provided, transcribe it first
      if (audioBuffer && !transcript) {
        onProgress('🎤 Transcribing audio...');
        const buffer = Buffer.from(audioBuffer, 'base64');
        finalTranscript = await this.speechService.transcribeAudio(buffer);
      }

      if (!finalTranscript) {
        throw new Error('No transcript available');
      }

      // Convert voice to schema
      const schema = await this.visionService.processVoiceToSchema(finalTranscript, onProgress);
      
      const result = {
        success: true,
        transcript: finalTranscript,
        schema,
        sessionId,
        provider: schema.provider,
        timestamp: schema.timestamp,
        message: '✅ Real-time voice processing complete!'
      };
      
      socket.emit('processing-complete', result);
      
      // Broadcast to all clients in session
      this.broadcastToSession(sessionId, 'voice-result', result);
      
    } catch (error) {
      console.error('Real-time voice processing error:', error);
      socket.emit('processing-error', {
        sessionId: data.sessionId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async processERDWithUpdates(sessionId, data) {
    const { chatId, imageBase64, filename, options } = data;
    
    try {
      // Emit processing start
      this.emitToChat(chatId, 'erd-processing-start', {
        sessionId,
        filename,
        message: `🔍 Starting ERD analysis for ${filename}...`
      });

      // Step 1: Image analysis
      this.emitToChat(chatId, 'erd-processing-update', {
        sessionId,
        step: 'analysis',
        message: '🤖 Analyzing ERD with AI Vision...',
        progress: 25
      });

      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const analysis = await this.visionService.analyzeERDRealTime(imageBuffer, (message) => {
        this.emitToChat(chatId, 'erd-processing-update', {
          sessionId,
          step: 'analysis',
          message,
          progress: 40
        });
      });

      // Step 2: Schema generation
      this.emitToChat(chatId, 'erd-processing-update', {
        sessionId,
        step: 'schema',
        message: '📊 Generating SQL schema...',
        progress: 60
      });

      const schema = this.generateSQLFromAnalysis(analysis, options);

      // Step 3: API generation
      this.emitToChat(chatId, 'erd-processing-update', {
        sessionId,
        step: 'api',
        message: '⚡ Generating API endpoints...',
        progress: 80
      });

      const apiCode = this.generateAPIFromSchema(schema);

      // Step 4: Complete
      this.emitToChat(chatId, 'erd-processing-complete', {
        sessionId,
        filename,
        analysis,
        schema,
        apiCode,
        options,
        message: '✅ ERD processing complete!',
        progress: 100
      });

      return { analysis, schema, apiCode };

    } catch (error) {
      console.error('ERD processing error:', error);
      
      this.emitToChat(chatId, 'erd-processing-error', {
        sessionId,
        filename,
        error: error.message,
        message: `❌ Failed to process ${filename}: ${error.message}`
      });

      throw error;
    }
  }

  generateSQLFromAnalysis(analysis, options = {}) {
    if (!analysis || !analysis.tables) return '-- No tables detected';
    
    let sql = '-- Generated from Real ERD Analysis\n\n';
    
    // Create tables
    analysis.tables.forEach(table => {
      sql += `CREATE TABLE ${table.name} (\n`;
      
      table.columns.forEach((col, index) => {
        const comma = index < table.columns.length - 1 ? ',' : '';
        const constraints = col.constraints ? ` ${col.constraints.join(' ')}` : '';
        sql += `    ${col.name} ${col.type}${constraints}${comma}\n`;
      });
      
      sql += ');\n\n';
    });
    
    // Add constraints if requested
    if (options.addConstraints && analysis.relationships) {
      sql += '-- Foreign Key Constraints\n';
      analysis.relationships.forEach(rel => {
        sql += `ALTER TABLE ${rel.from_table} ADD CONSTRAINT fk_${rel.from_column} \n`;
        sql += `    FOREIGN KEY (${rel.from_column}) REFERENCES ${rel.to_table}(${rel.to_column});\n\n`;
      });
    }
    
    // Add indexes if requested
    if (options.includeIndexes && analysis.tables) {
      sql += '-- Performance Indexes\n';
      analysis.tables.forEach(table => {
        table.columns.forEach(col => {
          if (col.constraints && col.constraints.includes('UNIQUE')) {
            sql += `CREATE INDEX idx_${table.name}_${col.name} ON ${table.name}(${col.name});\n`;
          }
        });
      });
      sql += '\n';
    }
    
    return sql;
  }

  generateAPIFromSchema(schema) {
    const tables = this.parseSchemaToTables(schema);
    let code = `const express = require('express');\nconst { Pool } = require('pg');\nconst app = express();\n\napp.use(express.json());\n\nconst pool = new Pool({\n    connectionString: process.env.DATABASE_URL\n});\n\n`;
    
    tables.forEach(table => {
      const name = table.name;
      code += `// ${name} endpoints\n`;
      code += `app.get('/api/${name}', async (req, res) => {\n`;
      code += `    const result = await pool.query('SELECT * FROM ${name}');\n`;
      code += `    res.json(result.rows);\n`;
      code += `});\n\n`;
    });
    
    code += `app.listen(3000, () => console.log('API running on port 3000'));`;
    return code;
  }

  parseSchemaToTables(schema) {
    const tables = [];
    const tableMatches = schema.match(/CREATE TABLE (\w+)\s*\([^;]+\);/gi);
    
    if (tableMatches) {
      tableMatches.forEach(tableMatch => {
        const nameMatch = tableMatch.match(/CREATE TABLE (\w+)/i);
        if (nameMatch) {
          tables.push({ name: nameMatch[1] });
        }
      });
    }
    
    return tables;
  }

  broadcastUpdate(event, data) {
    if (this.io) {
      this.io.emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  broadcastToSession(sessionId, event, data) {
    if (!this.io || !sessionId) return;
    
    // Emit to all clients (in a real app, you'd filter by session)
    this.io.emit(event, {
      ...data,
      sessionId,
      timestamp: new Date().toISOString()
    });
  }

  emitToChat(chatId, event, data) {
    if (this.io) {
      this.io.to(chatId).emit(event, data);
      console.log(`📡 Emitted ${event} to chat ${chatId}`);
    }
  }

  getActiveConnections() {
    return this.activeConnections.size;
  }

  getServiceStatus() {
    return {
      activeConnections: this.activeConnections.size,
      visionService: this.visionService.getProviderStatus(),
      speechService: this.speechService.getProviderStatus ? this.speechService.getProviderStatus() : { status: 'available' },
      isReady: true
    };
  }
}

module.exports = RealTimeProcessingService;