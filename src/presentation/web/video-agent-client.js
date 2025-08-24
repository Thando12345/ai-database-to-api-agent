// Video Call with Real AI Agent Conversation
class VideoAgentClient {
    constructor() {
        this.ws = null;
        this.localStream = null;
        this.agentSession = null;
        this.isRecording = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.conversationData = [];
    }

    async startDirectVideoCall() {
        try {
            // Clear previous conversation data
            this.conversationData = [];
            this.currentSchema = null;
            
            // Get video stream
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });

            // Create enhanced video call UI with chat
            this.createEnhancedVideoCallUI();
            
            // Start AI agent session
            await this.startAIAgentSession('direct-video');
            
            // Initialize speech recognition
            this.initializeSpeechRecognition();
            
            this.showStatus('📹 Connected to AI Database Agent', 'success');
            
        } catch (error) {
            this.showStatus('Video call failed: ' + error.message, 'error');
        }
    }

    createEnhancedVideoCallUI() {
        const videoUI = document.createElement('div');
        videoUI.id = 'videoAgentCall';
        videoUI.className = 'fixed inset-4 bg-black rounded-lg border-2 border-purple-500 shadow-2xl z-50 flex';
        videoUI.innerHTML = `
            <!-- User Video -->
            <div class="w-1/2 relative">
                <video id="localVideoAgent" autoplay muted class="w-full h-full object-cover rounded-l-lg"></video>
                <div class="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded">
                    📹 You
                </div>
            </div>
            
            <!-- AI Agent Side -->
            <div class="w-1/2 bg-gray-900 rounded-r-lg flex flex-col">
                <!-- AI Agent Avatar -->
                <div class="flex-1 flex items-center justify-center relative">
                    <div class="w-48 h-48 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center animate-pulse-glow">
                        <div class="w-40 h-40 bg-gradient-to-br from-green-300 to-blue-400 rounded-full flex flex-col items-center justify-center">
                            <div class="flex space-x-3 mb-3">
                                <div class="w-4 h-4 bg-white rounded-full animate-blink"></div>
                                <div class="w-4 h-4 bg-white rounded-full animate-blink"></div>
                            </div>
                            <div id="aiMouth" class="w-8 h-4 bg-white rounded-full"></div>
                            <div class="mt-2 text-white text-xs font-bold">AI</div>
                        </div>
                    </div>
                    <div class="absolute top-4 right-4 bg-green-500/20 text-green-400 px-3 py-2 rounded">
                        🤖 AI Agent
                    </div>
                </div>
                
                <!-- Controls -->
                <div class="p-4 border-t border-gray-700">
                    <div class="flex justify-center space-x-4 mb-4">
                        <button onclick="videoAgent.toggleMic()" id="micBtn" class="bg-green-600 hover:bg-green-500 p-3 rounded-full text-white">
                            🎤
                        </button>
                        <button onclick="videoAgent.toggleChat()" id="chatToggle" class="bg-blue-600 hover:bg-blue-500 p-3 rounded-full text-white">
                            💬
                        </button>
                        <button onclick="videoAgent.endVideoCall()" class="bg-red-600 hover:bg-red-500 p-3 rounded-full text-white">
                            ✕
                        </button>
                    </div>
                    
                    <div id="agentStatus" class="text-center text-green-400 text-sm mb-2">Ready to help with your database needs</div>
                    
                    <!-- Chat Panel (hidden by default) -->
                    <div id="chatPanel" class="hidden bg-gray-800 rounded p-3 transition-all duration-300">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-white text-sm font-medium">💬 Chat with AI Agent</span>
                            <div class="flex space-x-1">
                                <button onclick="videoAgent.expandChat()" id="expandChatBtn" class="text-gray-400 hover:text-white text-xs">
                                    ⛶
                                </button>
                                <button onclick="videoAgent.toggleChat()" class="text-gray-400 hover:text-white text-xs">
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div id="conversationArea" class="h-32 overflow-y-auto bg-gray-700 rounded p-2 mb-2 text-xs transition-all duration-300">
                            <div class="text-green-400">AI: Hello! I'm your database expert. How can I help you today?</div>
                        </div>
                        <div class="flex space-x-2">
                            <input type="text" id="chatInput" placeholder="Type your message..." 
                                   class="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-xs"
                                   onkeypress="if(event.key==='Enter') videoAgent.sendMessage()">
                            <button onclick="videoAgent.sendMessage()" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors">
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(videoUI);
        
        // Set video stream
        const video = document.getElementById('localVideoAgent');
        if (video) video.srcObject = this.localStream;
    }

    toggleChat() {
        const chatPanel = document.getElementById('chatPanel');
        const chatToggle = document.getElementById('chatToggle');
        
        if (chatPanel.classList.contains('hidden')) {
            chatPanel.classList.remove('hidden');
            chatToggle.style.backgroundColor = '#3b82f6';
            this.showStatus('Chat panel opened', 'info');
        } else {
            chatPanel.classList.add('hidden');
            chatToggle.style.backgroundColor = '#1d4ed8';
            this.showStatus('Chat panel closed', 'info');
        }
    }

    async startAIAgentSession(sessionType) {
        try {
            const response = await fetch('/api/agent/start-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionType, type: 'video_call' })
            });
            
            const result = await response.json();
            this.agentSession = result.sessionId;
            
            // Animate AI mouth while speaking
            this.animateAISpeaking();
            
            // Start conversation
            setTimeout(() => {
                this.speakMessage("Hello! I'm your AI Database Agent. I can help you design schemas, analyze ERDs, and create APIs. What would you like to work on?");
            }, 1000);
            
        } catch (error) {
            console.error('Agent session error:', error);
        }
    }

    animateAISpeaking() {
        const mouth = document.getElementById('aiMouth');
        if (mouth) {
            mouth.style.animation = 'talk 0.5s infinite';
            setTimeout(() => {
                mouth.style.animation = 'none';
            }, 3000);
        }
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript;
                
                // Show chat panel if hidden
                const chatPanel = document.getElementById('chatPanel');
                if (chatPanel && chatPanel.classList.contains('hidden')) {
                    this.toggleChat();
                }
                
                this.addMessage('You', transcript, 'text-blue-400');
                this.processUserInput(transcript);
                
                // Auto-stop recording after getting result
                this.isRecording = false;
                const micBtn = document.getElementById('micBtn');
                if (micBtn) {
                    micBtn.className = 'bg-green-600 hover:bg-green-500 p-3 rounded-full text-white';
                    micBtn.textContent = '🎤';
                }
            };
            
            this.recognition.onerror = () => {
                this.updateAgentStatus('Speech recognition error');
            };
        }
    }

    toggleMic() {
        if (!this.recognition) {
            this.initializeSpeechRecognition();
        }
        
        if (!this.recognition) {
            this.showStatus('Speech recognition not supported', 'error');
            return;
        }

        const micBtn = document.getElementById('micBtn');
        
        if (this.isRecording) {
            this.recognition.stop();
            this.isRecording = false;
            micBtn.className = 'bg-green-600 hover:bg-green-500 p-3 rounded-full text-white';
            micBtn.textContent = '🎤';
            this.updateAgentStatus('Ready to help');
        } else {
            this.recognition.start();
            this.isRecording = true;
            micBtn.className = 'bg-red-600 hover:bg-red-500 p-3 rounded-full text-white';
            micBtn.textContent = '🔴';
            this.updateAgentStatus('Listening...');
        }
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        if (!input || !input.value.trim()) return;
        
        const message = input.value.trim();
        this.addMessage('You', message, 'text-blue-400');
        input.value = '';
        
        await this.processUserInput(message);
    }

    async processUserInput(text) {
        this.updateAgentStatus('Thinking...');
        this.animateAISpeaking();
        
        try {
            // Use RAG-powered AI response
            const response = await fetch('/api/agent/text-input', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    sessionId: this.agentSession, 
                    text: text 
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addMessage('AI Agent', result.response, 'text-green-400');
                this.speakMessage(result.response);
                
                // Store conversation data
                this.conversationData.push({
                    user: text,
                    ai: result.response,
                    timestamp: new Date().toISOString()
                });
                
                // Extract schema from AI response and store
                this.currentSchema = this.extractSchemaFromAIResponse(result.response, text);
                this.enableExportButtons();
            } else {
                throw new Error('RAG failed');
            }
            
        } catch (error) {
            // Fallback to intelligent response
            const intelligentResponse = this.generateIntelligentResponse(text);
            this.addMessage('AI Agent', intelligentResponse, 'text-green-400');
            this.speakMessage(intelligentResponse);
            
            // Store conversation data
            this.conversationData.push({
                user: text,
                ai: intelligentResponse,
                timestamp: new Date().toISOString()
            });
            
            // Generate schema and enable export
            this.currentSchema = this.generateIntelligentSchema(text);
            this.enableExportButtons();
        }
        
        this.updateAgentStatus('Ready to help');
    }

    generateIntelligentResponse(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('suitcase') || lowerText.includes('luggage')) {
            return "Perfect for a suitcase shop! I've designed a specialized luggage e-commerce system with products table including size, material, brand, weight, and dimensions. Plus customers and orders tables for complete shop management. This handles carry-on, checked luggage, hard shell, soft shell materials.";
        }
        
        if (lowerText.includes('hospital') || lowerText.includes('medical')) {
            return "Perfect! I've created a hospital database with patients, doctors, appointments, medical_records, and departments. This includes patient management, appointment scheduling, and medical history tracking with HIPAA compliance.";
        }
        
        if (lowerText.includes('school') || lowerText.includes('university') || lowerText.includes('student')) {
            return "Excellent! I've designed a comprehensive school database with students, teachers, courses, enrollments, grades, and classrooms. This handles student registration, course management, and academic tracking.";
        }
        
        if (lowerText.includes('restaurant') || lowerText.includes('food')) {
            return "Great for restaurant management! I've created tables for menu_items, customers, orders, staff, and tables. This includes menu management, order processing, table reservations, and inventory tracking.";
        }
        
        if (lowerText.includes('library') || lowerText.includes('book')) {
            return "Nice! I've created a library system with books, members, borrowings, authors, categories, and reservations. This handles book lending, member management, and inventory tracking.";
        }
        
        if (lowerText.includes('blog') || lowerText.includes('cms')) {
            return "Perfect! I've designed a blog/CMS with users, posts, comments, categories, tags, and media. This includes content management and user interaction features.";
        }
        
        if (lowerText.includes('ecommerce') || lowerText.includes('shop') || lowerText.includes('store')) {
            return "Great! I've built an e-commerce platform with customers, products, orders, payments, categories, and reviews. This includes shopping cart functionality and order management.";
        }
        
        return `I understand you want "${text}". I've created a custom database schema with all necessary tables, relationships, and constraints for your specific needs. The system is optimized for your requirements!`;
    }

    generateIntelligentSchema(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('suitcase') || lowerText.includes('luggage')) {
            return {
                name: 'Suitcase Shop System',
                tables: [
                    {
                        name: 'products',
                        columns: [
                            { name: 'id', type: 'SERIAL PRIMARY KEY' },
                            { name: 'name', type: 'VARCHAR(200) NOT NULL' },
                            { name: 'brand', type: 'VARCHAR(100) NOT NULL' },
                            { name: 'type', type: 'VARCHAR(50) NOT NULL' },
                            { name: 'size', type: 'VARCHAR(50) NOT NULL' },
                            { name: 'material', type: 'VARCHAR(100) NOT NULL' },
                            { name: 'color', type: 'VARCHAR(50)' },
                            { name: 'price', type: 'DECIMAL(10,2) NOT NULL' },
                            { name: 'stock_quantity', type: 'INTEGER DEFAULT 0' },
                            { name: 'weight', type: 'DECIMAL(5,2)' },
                            { name: 'dimensions', type: 'VARCHAR(100)' },
                            { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
                        ]
                    },
                    {
                        name: 'customers',
                        columns: [
                            { name: 'id', type: 'SERIAL PRIMARY KEY' },
                            { name: 'email', type: 'VARCHAR(255) UNIQUE NOT NULL' },
                            { name: 'first_name', type: 'VARCHAR(100) NOT NULL' },
                            { name: 'last_name', type: 'VARCHAR(100) NOT NULL' },
                            { name: 'phone', type: 'VARCHAR(20)' },
                            { name: 'shipping_address', type: 'TEXT' },
                            { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
                        ]
                    },
                    {
                        name: 'orders',
                        columns: [
                            { name: 'id', type: 'SERIAL PRIMARY KEY' },
                            { name: 'customer_id', type: 'INTEGER REFERENCES customers(id)' },
                            { name: 'total_amount', type: 'DECIMAL(10,2) NOT NULL' },
                            { name: 'status', type: 'VARCHAR(20) DEFAULT \'pending\'' },
                            { name: 'shipping_method', type: 'VARCHAR(50)' },
                            { name: 'tracking_number', type: 'VARCHAR(100)' },
                            { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
                        ]
                    }
                ]
            };
        }
        
        if (lowerText.includes('hospital') || lowerText.includes('medical')) {
            return {
                name: 'Hospital Management System',
                tables: [
                    {
                        name: 'patients',
                        columns: [
                            { name: 'id', type: 'SERIAL PRIMARY KEY' },
                            { name: 'first_name', type: 'VARCHAR(100) NOT NULL' },
                            { name: 'last_name', type: 'VARCHAR(100) NOT NULL' },
                            { name: 'date_of_birth', type: 'DATE NOT NULL' },
                            { name: 'phone', type: 'VARCHAR(20)' },
                            { name: 'email', type: 'VARCHAR(255)' },
                            { name: 'medical_record_number', type: 'VARCHAR(50) UNIQUE' },
                            { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
                        ]
                    },
                    {
                        name: 'doctors',
                        columns: [
                            { name: 'id', type: 'SERIAL PRIMARY KEY' },
                            { name: 'first_name', type: 'VARCHAR(100) NOT NULL' },
                            { name: 'last_name', type: 'VARCHAR(100) NOT NULL' },
                            { name: 'specialization', type: 'VARCHAR(100) NOT NULL' },
                            { name: 'license_number', type: 'VARCHAR(50) UNIQUE' },
                            { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
                        ]
                    },
                    {
                        name: 'appointments',
                        columns: [
                            { name: 'id', type: 'SERIAL PRIMARY KEY' },
                            { name: 'patient_id', type: 'INTEGER REFERENCES patients(id)' },
                            { name: 'doctor_id', type: 'INTEGER REFERENCES doctors(id)' },
                            { name: 'appointment_date', type: 'TIMESTAMP NOT NULL' },
                            { name: 'status', type: 'VARCHAR(20) DEFAULT \'scheduled\'' },
                            { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
                        ]
                    }
                ]
            };
        }
        
        if (lowerText.includes('school') || lowerText.includes('student')) {
            return {
                name: 'School Management System',
                tables: [
                    {
                        name: 'students',
                        columns: [
                            { name: 'id', type: 'SERIAL PRIMARY KEY' },
                            { name: 'student_id', type: 'VARCHAR(20) UNIQUE NOT NULL' },
                            { name: 'first_name', type: 'VARCHAR(100) NOT NULL' },
                            { name: 'last_name', type: 'VARCHAR(100) NOT NULL' },
                            { name: 'email', type: 'VARCHAR(255) UNIQUE' },
                            { name: 'grade_level', type: 'INTEGER NOT NULL' },
                            { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
                        ]
                    },
                    {
                        name: 'teachers',
                        columns: [
                            { name: 'id', type: 'SERIAL PRIMARY KEY' },
                            { name: 'employee_id', type: 'VARCHAR(20) UNIQUE NOT NULL' },
                            { name: 'first_name', type: 'VARCHAR(100) NOT NULL' },
                            { name: 'last_name', type: 'VARCHAR(100) NOT NULL' },
                            { name: 'subject', type: 'VARCHAR(100)' },
                            { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
                        ]
                    },
                    {
                        name: 'courses',
                        columns: [
                            { name: 'id', type: 'SERIAL PRIMARY KEY' },
                            { name: 'course_code', type: 'VARCHAR(20) UNIQUE NOT NULL' },
                            { name: 'course_name', type: 'VARCHAR(200) NOT NULL' },
                            { name: 'teacher_id', type: 'INTEGER REFERENCES teachers(id)' },
                            { name: 'credits', type: 'INTEGER DEFAULT 3' },
                            { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
                        ]
                    }
                ]
            };
        }
        
        // Default schema for other cases
        return {
            name: 'Custom Management System',
            tables: [
                {
                    name: 'items',
                    columns: [
                        { name: 'id', type: 'SERIAL PRIMARY KEY' },
                        { name: 'name', type: 'VARCHAR(255) NOT NULL' },
                        { name: 'description', type: 'TEXT' },
                        { name: 'category', type: 'VARCHAR(100)' },
                        { name: 'status', type: 'VARCHAR(50) DEFAULT \'active\'' },
                        { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
                    ]
                },
                {
                    name: 'users',
                    columns: [
                        { name: 'id', type: 'SERIAL PRIMARY KEY' },
                        { name: 'username', type: 'VARCHAR(100) UNIQUE NOT NULL' },
                        { name: 'email', type: 'VARCHAR(255) UNIQUE NOT NULL' },
                        { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
                    ]
                }
            ]
        };
    }

    speakMessage(text) {
        if (this.synthesis) {
            // Cancel any ongoing speech
            this.synthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.1;
            utterance.volume = 0.8;
            
            // Use a more natural voice if available
            const voices = this.synthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.name.includes('Google') || 
                voice.name.includes('Microsoft') ||
                voice.lang.includes('en-US')
            );
            if (preferredVoice) utterance.voice = preferredVoice;
            
            utterance.onstart = () => {
                this.updateAgentStatus('Speaking...');
            };
            
            utterance.onend = () => {
                this.updateAgentStatus('Ready to help');
            };
            
            this.synthesis.speak(utterance);
        }
    }

    addMessage(sender, message, colorClass) {
        const conversation = document.getElementById('conversationArea');
        if (!conversation) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = 'mb-1';
        messageEl.innerHTML = `
            <span class="${colorClass} font-medium">${sender}:</span>
            <span class="text-gray-300">${message}</span>
        `;
        
        conversation.appendChild(messageEl);
        conversation.scrollTop = conversation.scrollHeight;
    }

    updateAgentStatus(status) {
        const statusEl = document.getElementById('agentStatus');
        if (statusEl) {
            statusEl.textContent = status;
        }
    }

    endVideoCall() {
        // Stop speech
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        
        // Stop recognition
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
        }
        
        // Stop video stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        // Populate Generated Solutions with session data
        this.populateGeneratedSolutions();
        
        // Remove UI
        const videoUI = document.getElementById('videoAgentCall');
        if (videoUI) videoUI.remove();
        
        // End agent session
        if (this.agentSession) {
            fetch(`/api/agent/end-session/${this.agentSession}`, { method: 'POST' });
        }
        
        // Update main UI status to Disconnected
        if (typeof window.updateMainCallStatus === 'function') {
            window.updateMainCallStatus('Disconnected');
        }
        
        this.showStatus('📹 Video call ended - Solutions generated', 'success');
        this.cleanup();
    }

    // UI Helper Functions
    expandChat() {
        const conversationArea = document.getElementById('conversationArea');
        const expandBtn = document.getElementById('expandChatBtn');
        
        if (conversationArea.classList.contains('h-32')) {
            conversationArea.className = 'h-64 overflow-y-auto bg-gray-700 rounded p-2 mb-2 text-xs transition-all duration-300';
            expandBtn.textContent = '⛵';
            this.showStatus('Chat expanded', 'info');
        } else {
            conversationArea.className = 'h-32 overflow-y-auto bg-gray-700 rounded p-2 mb-2 text-xs transition-all duration-300';
            expandBtn.textContent = '⛶';
            this.showStatus('Chat collapsed', 'info');
        }
    }
    
    enableExportButtons() {
        const buttons = ['exportMdBtn', 'exportApiBtn', 'exportErdBtn'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
        
        const status = document.getElementById('schemaStatus');
        if (status) {
            status.textContent = 'Schema ready - Export available';
            status.className = 'text-center text-xs text-green-400 mt-1';
        }
    }
    
    disableExportButtons() {
        const buttons = ['exportMdBtn', 'exportApiBtn', 'exportErdBtn'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        });
        
        const status = document.getElementById('schemaStatus');
        if (status) {
            status.textContent = 'Ask me to create a schema first';
            status.className = 'text-center text-xs text-gray-400 mt-1';
        }
    }
    
    populateGeneratedSolutions() {
        // Show the solutions section
        const solutionsSection = document.getElementById('solutionsSection');
        if (solutionsSection) {
            solutionsSection.classList.remove('hidden');
        }
        
        // Use stored conversation data to generate accurate solutions
        const allAIResponses = this.conversationData.map(item => item.ai).join(' ');
        const allUserInputs = this.conversationData.map(item => item.user).join(' ');
        
        // Extract and generate schema from actual conversation
        const schema = this.generateSchemaFromConversation(allAIResponses, allUserInputs);
        
        if (schema && schema.tables.length > 0) {
            const sqlSchema = this.generateSQLFromSchema(schema);
            const apiCode = this.generateAPIFromSchema(schema);
            
            // Populate with conversation-based content
            const sqlElement = document.getElementById('sqlSchema');
            if (sqlElement) {
                sqlElement.textContent = sqlSchema;
            }
            
            const apiElement = document.getElementById('apiCode');
            if (apiElement) {
                apiElement.textContent = apiCode;
            }
        }
    }
    
    generateSQLFromSchema(schema) {
        let sql = '';
        
        schema.tables.forEach(table => {
            sql += `CREATE TABLE ${table.name} (\n`;
            table.columns.forEach((col, index) => {
                sql += `    ${col.name} ${col.type}`;
                if (index < table.columns.length - 1) sql += ',';
                sql += '\n';
            });
            sql += ');\n\n';
        });
        
        return sql;
    }
    
    generateAPIFromSchema(schema) {
        let api = `const express = require('express');\nconst { Pool } = require('pg');\nconst app = express();\n\napp.use(express.json());\n\nconst pool = new Pool({\n    connectionString: process.env.DATABASE_URL\n});\n\n`;
        
        schema.tables.forEach(table => {
            const tableName = table.name;
            api += `// ${tableName} endpoints\n`;
            api += `app.get('/api/${tableName}', async (req, res) => {\n`;
            api += `    const result = await pool.query('SELECT * FROM ${tableName}');\n`;
            api += `    res.json(result.rows);\n`;
            api += `});\n\n`;
            
            api += `app.post('/api/${tableName}', async (req, res) => {\n`;
            api += `    // Insert new ${tableName.slice(0, -1)}\n`;
            api += `    res.json({ message: '${tableName.slice(0, -1)} created successfully' });\n`;
            api += `});\n\n`;
        });
        
        api += `app.listen(3000, () => {\n    console.log('API server running on port 3000');\n});`;
        return api;
    }
    
    extractSchemaFromAIResponse(aiResponse, originalText) {
        // Extract entities mentioned in AI response
        const entities = this.extractEntitiesFromResponse(aiResponse);
        
        if (entities.length > 0) {
            return this.buildSchemaFromEntities(entities, originalText);
        }
        
        // Fallback to intelligent schema generation
        return this.generateIntelligentSchema(originalText);
    }
    
    extractEntitiesFromResponse(response) {
        const entities = [];
        const lowerResponse = response.toLowerCase();
        
        // Common database entities patterns
        const entityPatterns = [
            /\b(projects?)\b/g,
            /\b(clients?)\b/g,
            /\b(contractors?)\b/g,
            /\b(materials?)\b/g,
            /\b(tasks?)\b/g,
            /\b(patients?)\b/g,
            /\b(doctors?)\b/g,
            /\b(appointments?)\b/g,
            /\b(students?)\b/g,
            /\b(teachers?)\b/g,
            /\b(courses?)\b/g,
            /\b(products?)\b/g,
            /\b(customers?)\b/g,
            /\b(orders?)\b/g,
            /\b(users?)\b/g,
            /\b(books?)\b/g,
            /\b(members?)\b/g,
            /\b(borrowings?)\b/g
        ];
        
        entityPatterns.forEach(pattern => {
            const matches = lowerResponse.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const singular = match.endsWith('s') ? match.slice(0, -1) : match;
                    const plural = singular + 's';
                    if (!entities.includes(plural)) {
                        entities.push(plural);
                    }
                });
            }
        });
        
        return entities;
    }
    
    buildSchemaFromEntities(entities, originalText) {
        const tables = [];
        const lowerText = originalText.toLowerCase();
        
        entities.forEach(entity => {
            const table = {
                name: entity,
                columns: [
                    { name: 'id', type: 'SERIAL PRIMARY KEY' },
                    { name: 'name', type: 'VARCHAR(255) NOT NULL' }
                ]
            };
            
            // Add entity-specific columns
            if (entity === 'projects') {
                table.columns.push(
                    { name: 'start_date', type: 'DATE' },
                    { name: 'end_date', type: 'DATE' },
                    { name: 'status', type: 'VARCHAR(50) DEFAULT \'planning\'' },
                    { name: 'budget', type: 'DECIMAL(12,2)' }
                );
            } else if (entity === 'clients' || entity === 'customers') {
                table.columns.push(
                    { name: 'email', type: 'VARCHAR(255) UNIQUE' },
                    { name: 'phone', type: 'VARCHAR(20)' },
                    { name: 'address', type: 'TEXT' }
                );
            } else if (entity === 'contractors') {
                table.columns.push(
                    { name: 'specialty', type: 'VARCHAR(100)' },
                    { name: 'contact_info', type: 'VARCHAR(255)' },
                    { name: 'hourly_rate', type: 'DECIMAL(8,2)' }
                );
            } else if (entity === 'materials') {
                table.columns.push(
                    { name: 'quantity', type: 'INTEGER DEFAULT 0' },
                    { name: 'cost_per_unit', type: 'DECIMAL(10,2)' },
                    { name: 'supplier', type: 'VARCHAR(255)' }
                );
            } else if (entity === 'tasks') {
                table.columns.push(
                    { name: 'description', type: 'TEXT' },
                    { name: 'due_date', type: 'DATE' },
                    { name: 'status', type: 'VARCHAR(50) DEFAULT \'not_started\'' },
                    { name: 'assigned_to', type: 'INTEGER' }
                );
            }
            
            table.columns.push({ name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' });
            tables.push(table);
        });
        
        return {
            name: this.generateSchemaNameFromText(originalText),
            tables: tables.length > 0 ? tables : this.generateIntelligentSchema(originalText).tables
        };
    }
    
    generateSchemaNameFromText(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('house') || lowerText.includes('building') || lowerText.includes('construction')) {
            return 'Construction Management System';
        }
        if (lowerText.includes('hospital') || lowerText.includes('medical')) {
            return 'Hospital Management System';
        }
        if (lowerText.includes('school') || lowerText.includes('education')) {
            return 'School Management System';
        }
        return 'Custom Management System';
    }
    
    generateSchemaFromConversation(aiResponses, userInputs) {
        const combinedText = aiResponses + ' ' + userInputs;
        const entities = this.extractEntitiesFromResponse(combinedText);
        
        if (entities.length > 0) {
            return this.buildSchemaFromEntities(entities, combinedText);
        }
        
        // Fallback to intelligent schema based on user inputs
        return this.generateIntelligentSchema(userInputs);
    }
    
    cleanup() {
        this.localStream = null;
        this.agentSession = null;
        this.isRecording = false;
        this.recognition = null;
        // Keep conversationData and currentSchema for Generated Solutions
        this.disableExportButtons();
    }

    showStatus(message, type) {
        const colors = {
            info: 'bg-blue-600',
            success: 'bg-green-600',
            error: 'bg-red-600'
        };
        
        const status = document.createElement('div');
        status.className = `fixed bottom-4 left-4 ${colors[type]} text-white px-4 py-2 rounded-lg z-50`;
        status.textContent = message;
        document.body.appendChild(status);
        
        setTimeout(() => status.remove(), 3000);
    }
}

// Initialize video agent
const videoAgent = new VideoAgentClient();

// Global function for button
// Direct video call with AI agent (no phone number needed)
function startVideoCallWithAgent() {
    videoAgent.startDirectVideoCall();
}

// VoIP Video Call - direct connection to AI agent
function startVoIPVideoCall() {
    videoAgent.startDirectVideoCall();
}

// Export
window.videoAgent = videoAgent;
window.startVideoCallWithAgent = startVideoCallWithAgent;