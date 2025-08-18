const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

class RealtimeService {
  constructor(server) {
    this.io = new Server(server, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });
    
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.setupSocketHandlers();
    this.setupSupabaseSubscriptions();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      socket.on('join-room', (userId) => {
        socket.join(`user-${userId}`);
        socket.emit('joined', { room: `user-${userId}` });
      });

      socket.on('start-workflow', async (data) => {
        await this.handleWorkflowStart(socket, data);
      });

      socket.on('voice-stream', async (audioChunk) => {
        await this.handleVoiceStream(socket, audioChunk);
      });

      socket.on('natural-query', async (data) => {
        await this.handleNaturalQuery(socket, data);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  setupSupabaseSubscriptions() {
    // Real-time schema changes
    this.supabase
      .channel('schemas')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'schemas' },
        (payload) => {
          this.io.to(`user-${payload.new?.user_id || payload.old?.user_id}`)
            .emit('schema-updated', payload);
        }
      )
      .subscribe();

    // Real-time deployment updates
    this.supabase
      .channel('deployments')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'deployments' },
        (payload) => {
          this.io.emit('deployment-updated', payload);
        }
      )
      .subscribe();
  }

  async handleWorkflowStart(socket, { workflowType, input, userId }) {
    try {
      socket.emit('workflow-status', { 
        step: 'started', 
        message: 'Initializing AI workflow...' 
      });

      // Stream progress updates
      const steps = [
        'Analyzing input...',
        'Generating schema...',
        'Creating database tables...',
        'Generating mock data...',
        'Building API endpoints...',
        'Deploying to cloud...'
      ];

      for (let i = 0; i < steps.length; i++) {
        socket.emit('workflow-status', {
          step: i + 1,
          total: steps.length,
          message: steps[i],
          progress: ((i + 1) / steps.length) * 100
        });
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      socket.emit('workflow-completed', {
        success: true,
        apiUrl: 'https://generated-api.example.com',
        schemaId: 'uuid-here'
      });

    } catch (error) {
      socket.emit('workflow-error', { error: error.message });
    }
  }

  async handleVoiceStream(socket, audioChunk) {
    try {
      // Real-time voice processing
      socket.emit('voice-processing', { 
        status: 'transcribing',
        message: 'Converting speech to text...' 
      });

      // Simulate real-time transcription
      setTimeout(() => {
        socket.emit('voice-transcribed', {
          text: 'I need a database for an e-commerce system with products, customers, and orders',
          confidence: 0.95
        });
      }, 1000);

      setTimeout(() => {
        socket.emit('erd-generated', {
          schema: {
            name: 'ecommerce_db',
            tables: [
              { name: 'products', columns: ['id', 'name', 'price'] },
              { name: 'customers', columns: ['id', 'email', 'name'] },
              { name: 'orders', columns: ['id', 'customer_id', 'total'] }
            ]
          }
        });
      }, 3000);

    } catch (error) {
      socket.emit('voice-error', { error: error.message });
    }
  }

  async handleNaturalQuery(socket, { query, schemaId, userId }) {
    try {
      socket.emit('query-processing', { 
        status: 'analyzing',
        message: 'Understanding your query...' 
      });

      // Simulate AI processing
      setTimeout(() => {
        socket.emit('sql-generated', {
          sql: 'SELECT * FROM products WHERE price > 100',
          explanation: 'Finding all products with price greater than $100'
        });
      }, 1500);

      setTimeout(() => {
        socket.emit('query-results', {
          data: [
            { id: 1, name: 'Laptop', price: 999 },
            { id: 2, name: 'Phone', price: 599 }
          ],
          count: 2
        });
      }, 2500);

    } catch (error) {
      socket.emit('query-error', { error: error.message });
    }
  }

  // Broadcast to specific user
  emitToUser(userId, event, data) {
    this.io.to(`user-${userId}`).emit(event, data);
  }

  // Broadcast to all clients
  broadcast(event, data) {
    this.io.emit(event, data);
  }
}

module.exports = RealtimeService;