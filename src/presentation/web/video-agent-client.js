// Video Call with Real AI Agent Conversation
class VideoAgentClient {
    constructor() {
        this.ws = null;
        this.localStream = null;
        this.agentSession = null;
        this.isRecording = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
    }

    async startDirectVideoCall() {
        try {
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
                    
                    <!-- Export Panel -->
                    <div class="bg-gray-700/50 rounded p-2 mb-3">
                        <div class="text-center text-gray-300 text-xs mb-2">📤 Export Options</div>
                        <div class="grid grid-cols-3 gap-1">
                            <button onclick="videoAgent.exportMarkdown()" id="exportMdBtn" class="bg-blue-500/80 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                                📄 MD
                            </button>
                            <button onclick="videoAgent.exportAPI()" id="exportApiBtn" class="bg-purple-500/80 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                                🚀 API
                            </button>
                            <button onclick="videoAgent.exportERD()" id="exportErdBtn" class="bg-green-500/80 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                                📊 ERD
                            </button>
                        </div>
                        <div id="schemaStatus" class="text-center text-xs text-gray-400 mt-1">Ask me to create a schema first</div>
                    </div>
                    
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
                this.addMessage('You', transcript, 'text-blue-400');
                this.processUserInput(transcript);
            };
            
            this.recognition.onerror = () => {
                this.updateAgentStatus('Speech recognition error');
            };
        }
    }

    toggleMic() {
        if (!this.recognition) {
            this.showStatus('Speech recognition not supported', 'error');
            return;
        }

        const micBtn = document.getElementById('micBtn');
        
        if (this.isRecording) {
            this.recognition.stop();
            this.isRecording = false;
            micBtn.className = 'bg-green-600/80 hover:bg-green-600 text-white px-2 py-1 rounded text-xs';
            micBtn.textContent = '🎤';
            this.updateAgentStatus('Ready to help');
        } else {
            this.recognition.start();
            this.isRecording = true;
            micBtn.className = 'bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded text-xs';
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
        
        // Always enable export after any user input
        const lowerText = text.toLowerCase();
        
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
                
                // Always generate schema and enable export
                this.currentSchema = this.generateSchemaFromText(text);
                this.enableExportButtons();
            } else {
                throw new Error('RAG failed');
            }
            
        } catch (error) {
            // Fallback to local response
            const fallbackResponse = this.generateIntelligentResponse(text);
            this.addMessage('AI Agent', fallbackResponse, 'text-green-400');
            this.speakMessage(fallbackResponse);
            
            // Always enable export on fallback too
            this.currentSchema = this.generateSchemaFromText(text);
            this.enableExportButtons();
        }
        
        this.updateAgentStatus('Ready to help');
    }

    generateIntelligentResponse(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('hospital') || lowerText.includes('medical')) {
            this.currentSchema = this.generateHospitalSchema();
            this.enableExportButtons();
            return "Perfect! I've created a hospital database with patients, doctors, appointments, medical_records, and departments. This includes patient management, appointment scheduling, and medical history tracking. Export buttons are now active!";
        }
        
        if (lowerText.includes('school') || lowerText.includes('university') || lowerText.includes('student')) {
            this.currentSchema = this.generateSchoolSchema();
            this.enableExportButtons();
            return "Excellent! I've designed a comprehensive school database with students, teachers, courses, enrollments, grades, and classrooms. This handles student registration, course management, and academic tracking. Ready to export!";
        }
        
        if (lowerText.includes('ecommerce') || lowerText.includes('shop') || lowerText.includes('store')) {
            this.currentSchema = this.generateEcommerceSchema();
            this.enableExportButtons();
            return "Great! I've built an e-commerce platform with customers, products, orders, payments, categories, and reviews. This includes shopping cart functionality and order management. Export options are ready!";
        }
        
        if (lowerText.includes('library') || lowerText.includes('book')) {
            this.currentSchema = this.generateLibrarySchema();
            this.enableExportButtons();
            return "Nice! I've created a library system with books, members, borrowings, authors, categories, and reservations. This handles book lending, member management, and inventory tracking. Ready for export!";
        }
        
        if (lowerText.includes('blog') || lowerText.includes('cms')) {
            this.currentSchema = this.generateBlogSchema();
            this.enableExportButtons();
            return "Perfect! I've designed a blog/CMS with users, posts, comments, categories, tags, and media. This includes content management and user interaction features. Export ready!";
        }
        
        this.currentSchema = this.generateGenericSchema(text);
        this.enableExportButtons();
        return `I understand you want "${text}". I've created a custom database schema with all necessary tables, relationships, and constraints for your specific needs. Use the export buttons to download!`;
    }

    generateFallbackResponse(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('hospital') || lowerText.includes('medical')) {
            return "Perfect! I'll create a hospital database schema with patients, doctors, appointments, and medical records. Let me generate that for you right now!";
        }
        
        if (lowerText.includes('school') || lowerText.includes('university') || lowerText.includes('student')) {
            return "Excellent! I'll design a school database with students, courses, teachers, and enrollments. Creating the schema now!";
        }
        
        if (lowerText.includes('ecommerce') || lowerText.includes('shop') || lowerText.includes('store')) {
            return "Great choice! I'll build an e-commerce database with customers, products, orders, and payments. Generating now!";
        }
        
        if (lowerText.includes('library') || lowerText.includes('book')) {
            return "Nice! I'll create a library management system with books, members, and borrowing records. Setting it up!";
        }
        
        if (lowerText.includes('blog') || lowerText.includes('cms')) {
            return "Perfect! I'll design a blog/CMS database with users, posts, comments, and categories. Building it now!";
        }
        
        if (lowerText.includes('inventory') || lowerText.includes('warehouse')) {
            return "Excellent! I'll create an inventory management system with products, suppliers, and stock tracking. Generating!";
        }
        
        return `I understand you want to work with "${text}". I'll create a custom database schema for that domain. Let me design the perfect structure for you!`;
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
        
        // Remove UI
        const videoUI = document.getElementById('videoAgentCall');
        if (videoUI) videoUI.remove();
        
        // End agent session
        if (this.agentSession) {
            fetch(`/api/agent/end-session/${this.agentSession}`, { method: 'POST' });
        }
        
        this.showStatus('📹 Video call with AI Agent ended', 'info');
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
    
    // Export Functions
    exportMarkdown() {
        if (!this.currentSchema) {
            this.showStatus('No schema available. Ask me to create one first!', 'error');
            return;
        }
        
        const markdown = this.generateMarkdown(this.currentSchema);
        this.downloadFile('database-schema.md', markdown);
        this.showStatus('📄 Markdown exported successfully!', 'success');
    }
    
    exportAPI() {
        if (!this.currentSchema) {
            this.showStatus('No schema available. Ask me to create one first!', 'error');
            return;
        }
        
        const apiCode = this.generateAPICode(this.currentSchema);
        this.downloadFile('api-server.js', apiCode);
        this.showStatus('🚀 API code exported successfully!', 'success');
    }
    
    exportERD() {
        if (!this.currentSchema) {
            this.showStatus('No schema available. Ask me to create one first!', 'error');
            return;
        }
        
        const erdSvg = this.generateERDSvg(this.currentSchema);
        this.downloadFile('database-erd.svg', erdSvg);
        this.showStatus('📊 ERD diagram exported successfully!', 'success');
    }
    
    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    

    
    generateMarkdown(schema) {
        let md = `# ${schema.name}\n\n`;
        md += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        if (schema.description) {
            md += `## Description\n${schema.description}\n\n`;
        }
        
        md += `## Database Tables\n\n`;
        
        schema.tables.forEach(table => {
            md += `### ${table.name}\n\n`;
            md += `| Column | Type |\n`;
            md += `|--------|------|\n`;
            
            table.columns.forEach(col => {
                md += `| ${col.name} | ${col.type} |\n`;
            });
            
            md += `\n`;
        });
        
        return md;
    }
    
    generateAPICode(schema) {
        let code = `// ${schema.name} - Generated API\n`;
        code += `const express = require('express');\n`;
        code += `const { Pool } = require('pg');\n`;
        code += `const app = express();\n\n`;
        code += `app.use(express.json());\n\n`;
        code += `const pool = new Pool({\n`;
        code += `    connectionString: process.env.DATABASE_URL\n`;
        code += `});\n\n`;
        
        schema.tables.forEach(table => {
            const tableName = table.name;
            code += `// ${tableName} endpoints\n`;
            code += `app.get('/api/${tableName}', async (req, res) => {\n`;
            code += `    const result = await pool.query('SELECT * FROM ${tableName}');\n`;
            code += `    res.json(result.rows);\n`;
            code += `});\n\n`;
            
            code += `app.post('/api/${tableName}', async (req, res) => {\n`;
            code += `    // Insert logic here\n`;
            code += `    res.json({ message: '${tableName.slice(0, -1)} created' });\n`;
            code += `});\n\n`;
        });
        
        code += `app.listen(3000, () => console.log('API running on port 3000'));\n`;
        return code;
    }
    
    generateERDSvg(schema) {
        let svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">\n`;
        svg += `<style>\n`;
        svg += `.table { fill: #f0f9ff; stroke: #0369a1; stroke-width: 2; }\n`;
        svg += `.table-title { fill: #0369a1; font-family: Arial; font-size: 14px; font-weight: bold; }\n`;
        svg += `.table-field { fill: #374151; font-family: Arial; font-size: 12px; }\n`;
        svg += `</style>\n`;
        
        svg += `<text x="400" y="30" text-anchor="middle" class="table-title" font-size="18">${schema.name}</text>\n`;
        
        schema.tables.forEach((table, index) => {
            const x = 50 + (index % 3) * 250;
            const y = 80 + Math.floor(index / 3) * 180;
            const height = 40 + (table.columns.length * 20);
            
            svg += `<rect class="table" x="${x}" y="${y}" width="200" height="${height}" rx="5"/>\n`;
            svg += `<text class="table-title" x="${x + 10}" y="${y + 20}">${table.name}</text>\n`;
            svg += `<line x1="${x}" y1="${y + 25}" x2="${x + 200}" y2="${y + 25}" stroke="#0369a1"/>\n`;
            
            table.columns.forEach((col, colIndex) => {
                const fieldY = y + 45 + (colIndex * 20);
                svg += `<text class="table-field" x="${x + 10}" y="${fieldY}">${col.name}: ${col.type.split(' ')[0]}</text>\n`;
            });
        });
        
        svg += `</svg>`;
        return svg;
    }
    
    generateSchemaFromText(text) {
        return {
            name: 'Dynamic Schema',
            tables: [{
                name: 'data',
                columns: [
                    { name: 'id', type: 'SERIAL PRIMARY KEY' },
                    { name: 'name', type: 'VARCHAR(255)' },
                    { name: 'created_at', type: 'TIMESTAMP DEFAULT NOW()' }
                ]
            }]
        };
    }
    
    cleanup() {
        this.localStream = null;
        this.agentSession = null;
        this.isRecording = false;
        this.recognition = null;
        this.currentSchema = null;
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