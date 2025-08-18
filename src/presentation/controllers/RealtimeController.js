class RealtimeController {
  constructor(streamingLLMService, realtimeVoiceService, supabaseService, realtimeService) {
    this.streamingLLMService = streamingLLMService;
    this.realtimeVoiceService = realtimeVoiceService;
    this.supabaseService = supabaseService;
    this.realtimeService = realtimeService;
  }

  setupSocketHandlers(io) {
    io.on('connection', (socket) => {
      // Real-time ERD analysis
      socket.on('analyze-erd-stream', async (data) => {
        try {
          const { imageBuffer, userId } = data;
          
          for await (const chunk of this.streamingLLMService.streamERDAnalysis(imageBuffer)) {
            socket.emit('erd-analysis-chunk', chunk);
            
            if (chunk.type === 'complete' && chunk.schema) {
              // Save to database
              const savedSchema = await this.supabaseService.createSchema(chunk.schema);
              socket.emit('schema-saved', savedSchema);
            }
          }
        } catch (error) {
          socket.emit('erd-analysis-error', { error: error.message });
        }
      });

      // Real-time voice processing
      socket.on('start-voice-session', async (data) => {
        const { userId } = data;
        await this.realtimeVoiceService.startRealtimeTranscription(socket, userId);
      });

      socket.on('voice-audio-chunk', async (data) => {
        const { userId, audioData } = data;
        await this.realtimeVoiceService.sendAudioChunk(userId, audioData);
      });

      socket.on('voice-commit', async (data) => {
        const { userId } = data;
        await this.realtimeVoiceService.commitAudio(userId);
      });

      // Real-time natural language queries
      socket.on('natural-query-stream', async (data) => {
        try {
          const { query, schemaId, userId } = data;
          
          // Get table schemas
          const schema = await this.supabaseService.getSchema(schemaId);
          
          for await (const chunk of this.streamingLLMService.streamNaturalLanguageSQL(query, schema.tables)) {
            socket.emit('query-chunk', chunk);
            
            if (chunk.type === 'complete' && chunk.result?.sql) {
              // Execute the query
              const results = await this.supabaseService.executeQuery(chunk.result.sql, userId);
              socket.emit('query-results', { 
                sql: chunk.result.sql,
                explanation: chunk.result.explanation,
                data: results 
              });
            }
          }
        } catch (error) {
          socket.emit('query-error', { error: error.message });
        }
      });

      // Real-time autonomous workflow
      socket.on('start-autonomous-workflow', async (data) => {
        try {
          const { input, workflowType, userId } = data;
          
          socket.emit('workflow-started', { message: 'Starting autonomous workflow...' });
          
          // Step 1: Generate schema
          let schema;
          if (workflowType === 'image') {
            for await (const chunk of this.streamingLLMService.streamERDAnalysis(input)) {
              socket.emit('workflow-progress', { 
                step: 'schema_generation', 
                chunk 
              });
              
              if (chunk.type === 'complete') {
                schema = chunk.schema;
              }
            }
          } else if (workflowType === 'voice') {
            for await (const chunk of this.streamingLLMService.streamVoiceToERD(input)) {
              socket.emit('workflow-progress', { 
                step: 'schema_generation', 
                chunk 
              });
              
              if (chunk.type === 'complete') {
                schema = chunk.schema;
              }
            }
          }

          if (!schema) throw new Error('Schema generation failed');

          // Step 2: Save schema and run migration
          const savedSchema = await this.supabaseService.createSchema(schema);
          await this.supabaseService.executeMigration(savedSchema.sql);
          
          socket.emit('workflow-progress', { 
            step: 'migration_complete',
            message: 'Database tables created successfully'
          });

          // Step 3: Generate mock data
          for await (const chunk of this.streamingLLMService.streamMockDataGeneration(schema, 50)) {
            socket.emit('workflow-progress', { 
              step: 'mock_data_generation', 
              chunk 
            });
            
            if (chunk.type === 'complete') {
              // Insert mock data
              await this.supabaseService.executeMigration(chunk.sql);
            }
          }

          // Step 4: Generate API
          for await (const chunk of this.streamingLLMService.streamAPIGeneration(schema, { level: 'authenticated' })) {
            socket.emit('workflow-progress', { 
              step: 'api_generation', 
              chunk 
            });
            
            if (chunk.type === 'complete') {
              // Save API spec and deploy
              const apiSpec = {
                name: `${schema.schema_name}_api`,
                version: '1.0.0',
                endpoints: this.generateEndpoints(schema),
                code: chunk.code
              };
              
              const savedAPI = await this.supabaseService.saveAPISpec(apiSpec, savedSchema.id);
              
              socket.emit('workflow-completed', {
                success: true,
                schemaId: savedSchema.id,
                apiId: savedAPI.id,
                deploymentUrl: 'https://api.example.com',
                code: chunk.code
              });
            }
          }

        } catch (error) {
          socket.emit('workflow-error', { error: error.message });
        }
      });

      // Phone call initiation
      socket.on('request-phone-call', async (data) => {
        try {
          const { phoneNumber, context } = data;
          const call = await this.realtimeVoiceService.startPhoneCall(phoneNumber, context);
          socket.emit('call-initiated', call);
        } catch (error) {
          socket.emit('call-error', { error: error.message });
        }
      });

      socket.on('disconnect', () => {
        // Clean up voice connections if userId exists
        if (socket.userId) {
          this.realtimeVoiceService.disconnect(socket.userId);
        }
      });
    });
  }

  // Twilio webhook handlers
  handleVoiceWebhook() {
    return (req, res) => {
      const transcript = req.body.SpeechResult || '';
      const twiml = this.realtimeVoiceService.generateTwiMLResponse(transcript);
      
      res.type('text/xml');
      res.send(twiml);
    };
  }

  handleRecordingWebhook() {
    return async (req, res) => {
      const recordingUrl = req.body.RecordingUrl;
      const callSid = req.body.CallSid;
      
      // Process recording for further analysis
      console.log(`Recording available: ${recordingUrl} for call ${callSid}`);
      
      res.status(200).send('OK');
    };
  }

  generateEndpoints(schema) {
    const endpoints = [];
    
    schema.tables?.forEach(table => {
      const basePath = `/${table.name.toLowerCase()}`;
      
      endpoints.push(
        { path: basePath, method: 'get', operation: `List ${table.name}` },
        { path: basePath, method: 'post', operation: `Create ${table.name}` },
        { path: `${basePath}/{id}`, method: 'get', operation: `Get ${table.name}` },
        { path: `${basePath}/{id}`, method: 'put', operation: `Update ${table.name}` },
        { path: `${basePath}/{id}`, method: 'delete', operation: `Delete ${table.name}` }
      );
    });
    
    return endpoints;
  }
}

module.exports = RealtimeController;