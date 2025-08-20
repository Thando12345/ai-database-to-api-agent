// Video Call Enhancements with Real-time Chat and Text Injection
class VideoCallEnhancer {
    constructor() {
        this.chatHistory = [];
        this.isRecording = false;
        this.speechRecognition = null;
        this.textToSpeech = null;
        this.currentVideoCall = null;
    }

    enhanceVideoCall(videoCallElement) {
        this.currentVideoCall = videoCallElement;
        this.addChatInterface();
        this.addTextInjection();
        this.setupVoiceRecognition();
        this.initializeAIResponses();
    }

    addChatInterface() {
        const chatInterface = document.createElement('div');
        chatInterface.id = 'videoChatInterface';
        chatInterface.className = 'absolute bottom-0 left-0 right-0 h-1/3 bg-black/90 border-t border-gray-600';
        chatInterface.innerHTML = `
            <div class="flex h-full">
                <div class="flex-1 flex flex-col p-2">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-white text-sm font-medium">💬 Real-time Chat</span>
                        <button onclick="videoEnhancer.toggleChat()" class="text-gray-400 hover:text-white text-xs">
                            Hide
                        </button>
                    </div>
                    <div id="videoChatMessages" class="flex-1 overflow-y-auto bg-gray-900/50 rounded p-2 mb-2 text-xs">
                        <div class="text-green-400 mb-1">System: Video chat ready</div>
                    </div>
                    <div class="flex space-x-2">
                        <input type="text" id="videoChatInput" placeholder="Type message..." 
                               class="flex-1 bg-gray-800 text-white px-2 py-1 rounded text-xs border border-gray-600"
                               onkeypress="if(event.key==='Enter') videoEnhancer.sendChatMessage()">
                        <button onclick="videoEnhancer.sendChatMessage()" 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">
                            Send
                        </button>
                        <button onclick="videoEnhancer.toggleVoiceInput()" 
                                class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs">
                            🎤
                        </button>
                    </div>
                </div>
                <div class="w-1/3 p-2 border-l border-gray-600">
                    <div class="text-white text-sm font-medium mb-2">⚡ Quick Actions</div>
                    <div class="space-y-1">
                        <button onclick="videoEnhancer.injectText('Generate database schema')" 
                                class="w-full bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs">
                            📊 Schema Request
                        </button>
                        <button onclick="videoEnhancer.injectText('Create REST API endpoints')" 
                                class="w-full bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs">
                            🚀 API Request
                        </button>
                        <button onclick="videoEnhancer.injectText('Analyze ERD diagram')" 
                                class="w-full bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs">
                            🔍 ERD Analysis
                        </button>
                        <button onclick="videoEnhancer.shareScreen()" 
                                class="w-full bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs">
                            📺 Share Screen
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.currentVideoCall.appendChild(chatInterface);
    }

    addTextInjection() {
        const injectionOverlay = document.createElement('div');
        injectionOverlay.id = 'textInjectionOverlay';
        injectionOverlay.className = 'absolute top-2 left-2 right-2 z-10 hidden';
        injectionOverlay.innerHTML = `
            <div class="bg-blue-600/90 text-white px-3 py-2 rounded-lg text-sm flex justify-between items-center">
                <span id="injectedText">Text will appear here...</span>
                <button onclick="videoEnhancer.hideInjectedText()" class="text-blue-200 hover:text-white">×</button>
            </div>
        `;
        
        this.currentVideoCall.appendChild(injectionOverlay);
    }

    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.speechRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.speechRecognition.continuous = false;
            this.speechRecognition.interimResults = false;
            this.speechRecognition.lang = 'en-US';
            
            this.speechRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.injectText(transcript);
                this.addChatMessage('You (Voice)', transcript, 'text-blue-400');
                this.generateAIResponse(transcript);
            };
            
            this.speechRecognition.onerror = () => {
                this.addChatMessage('System', 'Voice recognition error', 'text-red-400');
            };
        }
    }

    initializeAIResponses() {
        // Simulate AI agent joining
        setTimeout(() => {
            this.addChatMessage('AI Agent', 'Hello! I\'m ready to help with your database needs.', 'text-green-400');
        }, 2000);
        
        // Periodic AI suggestions
        setInterval(() => {
            if (this.chatHistory.length > 0 && Math.random() > 0.7) {
                this.generateContextualSuggestion();
            }
        }, 30000);
    }

    sendChatMessage() {
        const input = document.getElementById('videoChatInput');
        if (!input || !input.value.trim()) return;
        
        const message = input.value.trim();
        this.addChatMessage('You', message, 'text-blue-400');
        input.value = '';
        
        // Generate AI response
        setTimeout(() => {
            this.generateAIResponse(message);
        }, 1000 + Math.random() * 2000);
    }

    addChatMessage(sender, message, colorClass = 'text-white') {
        const messagesContainer = document.getElementById('videoChatMessages');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'mb-1';
        messageElement.innerHTML = `
            <span class="${colorClass} font-medium">${sender}:</span>
            <span class="text-gray-300">${message}</span>
            <span class="text-gray-500 text-xs float-right">${new Date().toLocaleTimeString()}</span>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Store in history
        this.chatHistory.push({ sender, message, timestamp: Date.now() });
    }

    generateAIResponse(userMessage) {
        const responses = this.getContextualResponse(userMessage.toLowerCase());
        const response = responses[Math.floor(Math.random() * responses.length)];
        
        this.addChatMessage('AI Agent', response, 'text-green-400');
        
        // Inject response as overlay text
        this.injectText(`AI: ${response}`);
    }

    getContextualResponse(message) {
        if (message.includes('schema') || message.includes('database')) {
            return [
                'I can generate a complete database schema for you. What entities do you need?',
                'Let me create an optimized schema with proper relationships and constraints.',
                'I\'ll design a schema that follows best practices and normalization rules.'
            ];
        }
        
        if (message.includes('api') || message.includes('endpoint')) {
            return [
                'I\'ll create REST API endpoints with full CRUD operations for your schema.',
                'Let me generate Express.js routes with proper validation and error handling.',
                'I can build a complete API with authentication and rate limiting.'
            ];
        }
        
        if (message.includes('erd') || message.includes('diagram')) {
            return [
                'I can analyze your ERD and extract all entities and relationships.',
                'Let me process that diagram and generate the corresponding SQL schema.',
                'I\'ll create a visual ERD representation of your database structure.'
            ];
        }
        
        return [
            'That\'s interesting! How can I help you with your database project?',
            'I understand. Let me know what specific database task you need assistance with.',
            'Great question! I can help with schema design, API creation, or ERD analysis.'
        ];
    }

    generateContextualSuggestion() {
        const suggestions = [
            'Would you like me to optimize your database indexes?',
            'I can add security constraints to your schema.',
            'Should I generate mock data for testing?',
            'Would you like me to create API documentation?'
        ];
        
        const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        this.addChatMessage('AI Agent', suggestion, 'text-yellow-400');
    }

    injectText(text) {
        const overlay = document.getElementById('textInjectionOverlay');
        const textElement = document.getElementById('injectedText');
        
        if (overlay && textElement) {
            textElement.textContent = text;
            overlay.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.hideInjectedText();
            }, 5000);
        }
    }

    hideInjectedText() {
        const overlay = document.getElementById('textInjectionOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    toggleVoiceInput() {
        if (!this.speechRecognition) {
            this.addChatMessage('System', 'Voice recognition not supported', 'text-red-400');
            return;
        }
        
        if (this.isRecording) {
            this.speechRecognition.stop();
            this.isRecording = false;
            this.addChatMessage('System', 'Voice input stopped', 'text-gray-400');
        } else {
            this.speechRecognition.start();
            this.isRecording = true;
            this.addChatMessage('System', 'Listening... Speak now', 'text-green-400');
        }
    }

    toggleChat() {
        const chatInterface = document.getElementById('videoChatInterface');
        if (chatInterface) {
            chatInterface.classList.toggle('hidden');
        }
    }

    async shareScreen() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            this.addChatMessage('System', 'Screen sharing started', 'text-green-400');
            
            // Replace video stream with screen share
            const videoElement = this.currentVideoCall.querySelector('video');
            if (videoElement) {
                videoElement.srcObject = screenStream;
            }
            
            screenStream.getVideoTracks()[0].onended = () => {
                this.addChatMessage('System', 'Screen sharing ended', 'text-gray-400');
            };
            
        } catch (error) {
            this.addChatMessage('System', 'Screen sharing failed: ' + error.message, 'text-red-400');
        }
    }

    cleanup() {
        if (this.speechRecognition && this.isRecording) {
            this.speechRecognition.stop();
        }
        
        this.chatHistory = [];
        this.isRecording = false;
        this.currentVideoCall = null;
    }
}

// Enhanced video call initialization
function initializeEnhancedVideoCall(phoneNumber) {
    // Create video call container
    const videoContainer = document.createElement('div');
    videoContainer.id = 'enhancedVideoCall';
    videoContainer.className = 'fixed top-4 right-4 w-96 h-72 bg-black rounded-lg border-2 border-blue-500 shadow-2xl z-50 overflow-hidden';
    videoContainer.innerHTML = `
        <div class="relative w-full h-full">
            <video id="enhancedLocalVideo" autoplay muted class="w-full h-2/3 object-cover"></video>
            <div class="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                📹 ${phoneNumber}
            </div>
            <div class="absolute top-2 right-2 flex space-x-1">
                <button onclick="videoEnhancer.toggleChat()" class="bg-blue-600/80 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs">
                    💬
                </button>
                <button onclick="endEnhancedVideoCall()" class="bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded text-xs">
                    ✕
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(videoContainer);
    
    // Initialize video stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            const video = document.getElementById('enhancedLocalVideo');
            if (video) video.srcObject = stream;
            
            // Enhance with chat and text injection
            videoEnhancer.enhanceVideoCall(videoContainer);
            
        })
        .catch(error => {
            console.error('Video call error:', error);
        });
}

function endEnhancedVideoCall() {
    const videoContainer = document.getElementById('enhancedVideoCall');
    if (videoContainer) {
        // Stop video stream
        const video = videoContainer.querySelector('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        
        videoEnhancer.cleanup();
        videoContainer.remove();
    }
}

// Initialize enhancer
const videoEnhancer = new VideoCallEnhancer();

// Export for global use
window.videoEnhancer = videoEnhancer;
window.initializeEnhancedVideoCall = initializeEnhancedVideoCall;
window.endEnhancedVideoCall = endEnhancedVideoCall;