// Real-time client for accurate processing
class RealTimeClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentSessionId = null;
        this.processingCallbacks = new Map();
        this.initializeConnection();
    }

    initializeConnection() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                this.isConnected = true;
                console.log('✅ Real-time connection established');
                showToast('🔗 Real-time processing connected', 'success');
                
                // Join current session
                if (currentSessionId) {
                    this.joinSession(currentSessionId);
                }
            });

            this.socket.on('disconnect', () => {
                this.isConnected = false;
                console.log('❌ Real-time connection lost');
                showToast('🔗 Real-time connection lost', 'warning');
            });

            // Real-time processing events
            this.socket.on('processing-started', (data) => {
                this.handleProcessingStarted(data);
            });

            this.socket.on('processing-progress', (data) => {
                this.handleProcessingProgress(data);
            });

            this.socket.on('processing-complete', (data) => {
                this.handleProcessingComplete(data);
            });

            this.socket.on('processing-error', (data) => {
                this.handleProcessingError(data);
            });

            // Analysis results
            this.socket.on('analysis-result', (data) => {
                this.handleAnalysisResult(data);
            });

            this.socket.on('voice-result', (data) => {
                this.handleVoiceResult(data);
            });

        } catch (error) {
            console.error('Real-time connection error:', error);
            showToast('❌ Real-time connection failed', 'error');
        }
    }

    joinSession(sessionId) {
        if (this.socket && this.isConnected) {
            this.currentSessionId = sessionId;
            this.socket.emit('join-chat', sessionId);
            console.log(`📱 Joined session: ${sessionId}`);
        }
    }

    async processImageRealTime(imageFile, sessionId) {
        if (!this.socket || !this.isConnected) {
            throw new Error('Real-time connection not available');
        }

        return new Promise((resolve, reject) => {
            const processId = Date.now().toString();
            
            // Store callbacks
            this.processingCallbacks.set(processId, { resolve, reject });

            // Convert image to base64
            const reader = new FileReader();
            reader.onload = () => {
                const base64Data = reader.result.split(',')[1];
                
                this.socket.emit('process-image-realtime', {
                    imageBuffer: base64Data,
                    filename: imageFile.name,
                    sessionId: sessionId || this.currentSessionId,
                    processId
                });
            };
            reader.onerror = () => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(imageFile);

            // Timeout after 60 seconds
            setTimeout(() => {
                if (this.processingCallbacks.has(processId)) {
                    this.processingCallbacks.delete(processId);
                    reject(new Error('Processing timeout'));
                }
            }, 60000);
        });
    }

    async processVoiceRealTime(audioData, sessionId) {
        if (!this.socket || !this.isConnected) {
            throw new Error('Real-time connection not available');
        }

        return new Promise((resolve, reject) => {
            const processId = Date.now().toString();
            
            // Store callbacks
            this.processingCallbacks.set(processId, { resolve, reject });

            this.socket.emit('process-voice-realtime', {
                audioBuffer: audioData.audioBuffer,
                transcript: audioData.transcript,
                sessionId: sessionId || this.currentSessionId,
                processId
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.processingCallbacks.has(processId)) {
                    this.processingCallbacks.delete(processId);
                    reject(new Error('Voice processing timeout'));
                }
            }, 30000);
        });
    }

    handleProcessingStarted(data) {
        console.log('🚀 Processing started:', data);
        
        // Update UI
        const statusEl = document.getElementById('processingStatus');
        if (statusEl) {
            statusEl.innerHTML = `
                <div class="flex items-center space-x-2">
                    <div class="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                    <span class="text-blue-400">${data.message}</span>
                </div>
            `;
        }

        showToast(data.message, 'info');
    }

    handleProcessingProgress(data) {
        console.log('⏳ Processing progress:', data);
        
        // Update progress UI
        const progressEl = document.getElementById('processingProgress');
        if (progressEl) {
            progressEl.innerHTML = `
                <div class="text-yellow-400 text-sm">${data.message}</div>
                <div class="text-xs text-gray-500">${data.timestamp}</div>
            `;
        }

        // Show toast for major progress updates
        if (data.message.includes('🤖') || data.message.includes('✅')) {
            showToast(data.message, 'info');
        }
    }

    handleProcessingComplete(data) {
        console.log('✅ Processing complete:', data);
        
        // Find and resolve the corresponding promise
        const callback = Array.from(this.processingCallbacks.values()).find(cb => cb);
        if (callback) {
            callback.resolve(data);
            // Clear all callbacks for this session
            this.processingCallbacks.clear();
        }

        // Update UI
        this.updateResultsUI(data);
        showToast(data.message, 'success');
    }

    handleProcessingError(data) {
        console.error('❌ Processing error:', data);
        
        // Find and reject the corresponding promise
        const callback = Array.from(this.processingCallbacks.values()).find(cb => cb);
        if (callback) {
            callback.reject(new Error(data.error));
            this.processingCallbacks.clear();
        }

        showToast(`❌ ${data.error}`, 'error');
    }

    handleAnalysisResult(data) {
        console.log('📊 Analysis result received:', data);
        
        if (data.analysis) {
            currentGeneratedSchema = this.generateSQLFromAnalysis(data.analysis);
            currentGeneratedAPI = this.generateAPIFromAnalysis(data.analysis);
            
            displayEnhancedResults({
                schema: currentGeneratedSchema,
                apiCode: currentGeneratedAPI,
                analysis: data.analysis,
                provider: data.provider
            });
        }
    }

    handleVoiceResult(data) {
        console.log('🎤 Voice result received:', data);
        
        if (data.schema) {
            currentGeneratedSchema = this.generateSQLFromSchema(data.schema);
            currentGeneratedAPI = this.generateAPIFromSchema(data.schema);
            
            displayEnhancedResults({
                schema: currentGeneratedSchema,
                apiCode: currentGeneratedAPI,
                transcript: data.transcript,
                provider: data.provider
            });
        }
    }

    updateResultsUI(data) {
        const resultsDiv = document.getElementById('results');
        const contentDiv = document.getElementById('resultContent');
        
        if (resultsDiv && contentDiv) {
            let content = `🎉 REAL-TIME PROCESSING COMPLETE!\n\n`;
            content += `📊 Provider: ${data.provider || 'AI Vision'}\n`;
            content += `⚡ Processing Time: Real-time\n`;
            content += `🔒 Session: ${data.sessionId}\n`;
            content += `📈 Status: ${data.message}\n\n`;
            
            if (data.analysis) {
                content += `📋 Tables Detected: ${data.analysis.tables?.length || 0}\n`;
                content += `🔗 Relationships: ${data.analysis.relationships?.length || 0}\n`;
            }
            
            contentDiv.textContent = content;
            resultsDiv.classList.remove('hidden');
        }
    }

    generateSQLFromAnalysis(analysis) {
        if (!analysis || !analysis.tables) return '-- No analysis data';
        
        let sql = '-- Real-time ERD Analysis Result\n\n';
        
        analysis.tables.forEach(table => {
            sql += `CREATE TABLE ${table.name} (\n`;
            table.columns.forEach((col, index) => {
                const comma = index < table.columns.length - 1 ? ',' : '';
                const constraints = col.constraints ? ` ${col.constraints.join(' ')}` : '';
                sql += `    ${col.name} ${col.type}${constraints}${comma}\n`;
            });
            sql += ');\n\n';
        });
        
        return sql;
    }

    generateSQLFromSchema(schema) {
        if (!schema || !schema.tables) return '-- No schema data';
        
        let sql = '-- Voice-to-Schema Result\n\n';
        
        schema.tables.forEach(table => {
            sql += `CREATE TABLE ${table.name} (\n`;
            table.columns.forEach((col, index) => {
                const comma = index < table.columns.length - 1 ? ',' : '';
                const constraints = col.constraints ? ` ${col.constraints.join(' ')}` : '';
                sql += `    ${col.name} ${col.type}${constraints}${comma}\n`;
            });
            sql += ');\n\n';
        });
        
        return sql;
    }

    generateAPIFromAnalysis(analysis) {
        if (!analysis || !analysis.tables) return '// No API generated';
        
        let code = `// Real-time Generated API\nconst express = require('express');\nconst app = express();\napp.use(express.json());\n\n`;
        
        analysis.tables.forEach(table => {
            code += `// ${table.name} endpoints\n`;
            code += `app.get('/api/${table.name}', (req, res) => res.json([]));\n`;
            code += `app.post('/api/${table.name}', (req, res) => res.json({id: 1}));\n\n`;
        });
        
        code += `app.listen(3000, () => console.log('API running'));`;
        return code;
    }

    generateAPIFromSchema(schema) {
        return this.generateAPIFromAnalysis(schema);
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            sessionId: this.currentSessionId,
            activeProcesses: this.processingCallbacks.size
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.isConnected = false;
            this.processingCallbacks.clear();
        }
    }
}

// Initialize real-time client
let realTimeClient = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    realTimeClient = new RealTimeClient();
    
    // Update existing functions to use real-time processing
    window.processImagesWithRealTime = async function(images) {
        if (!realTimeClient || !realTimeClient.isConnected) {
            throw new Error('Real-time processing not available');
        }
        
        try {
            const result = await realTimeClient.processImageRealTime(images[0].file, currentSessionId);
            return result.analysis;
        } catch (error) {
            console.error('Real-time image processing failed:', error);
            throw error;
        }
    };
    
    window.processVoiceWithRealTime = async function(audioData) {
        if (!realTimeClient || !realTimeClient.isConnected) {
            throw new Error('Real-time processing not available');
        }
        
        try {
            const result = await realTimeClient.processVoiceRealTime(audioData, currentSessionId);
            return result.schema;
        } catch (error) {
            console.error('Real-time voice processing failed:', error);
            throw error;
        }
    };
});

// Export for use in other scripts
window.realTimeClient = realTimeClient;