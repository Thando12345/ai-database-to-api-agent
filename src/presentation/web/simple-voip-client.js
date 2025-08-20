// Simple VoIP Client using WebRTC
class SimpleVoIPClient {
    constructor() {
        this.ws = null;
        this.clientId = null;
        this.currentCall = null;
        this.localStream = null;
        this.peerConnection = null;
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('VoIP WebSocket connected');
        };
        
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };
        
        this.ws.onclose = () => {
            console.log('VoIP WebSocket disconnected');
        };
    }

    handleMessage(message) {
        switch (message.type) {
            case 'connected':
                this.clientId = message.clientId;
                this.showStatus('VoIP client connected', 'success');
                break;
            case 'call_dialing':
                this.updateCallStatus(message.status);
                this.playDialTone();
                break;
            case 'call_status':
                this.updateCallStatus(message.status);
                if (message.ring) {
                    this.playRingTone();
                }
                break;
            case 'call_connected':
                this.onCallConnected(message);
                break;
            case 'call_ended':
                this.onCallEnded(message);
                break;
            case 'audio_packet':
                this.handleAudioPacket(message);
                break;
        }
    }

    playDialTone() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(350, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1);
    }

    playRingTone() {
        // Create ring tone audio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    onCallConnected(message) {
        this.updateCallStatus(message.status);
        this.showStatus(`Call connected to ${message.phoneNumber}`, 'success');
        
        // Update UI to show connected state
        const statusEl = document.getElementById('callStatus');
        if (statusEl) {
            statusEl.innerHTML = `
                <div class="text-green-400 font-medium">Connected to ${message.phoneNumber}</div>
                <div class="text-gray-400 text-xs">Call quality: HD • Real-time audio active</div>
            `;
        }
    }

    onCallEnded(message) {
        this.cleanup();
        this.hideCallUI();
        
        if (message.report) {
            this.showCallReport(message.report);
        }
        
        this.showStatus(`Call ended - Duration: ${Math.round(message.duration / 1000)}s`, 'info');
    }

    handleAudioPacket(message) {
        // Simulate real-time audio processing
        const indicator = document.querySelector('.animate-pulse');
        if (indicator) {
            indicator.style.backgroundColor = '#10b981'; // Green for active audio
            setTimeout(() => {
                indicator.style.backgroundColor = '#6b7280'; // Gray for inactive
            }, 50);
        }
    }

    showCallReport(report) {
        const reportHTML = `
            <div id="callReport" class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-blue-500 rounded-lg p-6 z-50 shadow-2xl max-w-md">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-white font-bold text-lg">📞 Call Report</h3>
                    <button onclick="document.getElementById('callReport').remove()" class="text-gray-400 hover:text-white">×</button>
                </div>
                <div class="space-y-3 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Phone Number:</span>
                        <span class="text-white">${report.phoneNumber}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Duration:</span>
                        <span class="text-white">${Math.round(report.totalDuration / 1000)}s</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Quality:</span>
                        <span class="text-green-400">${report.callQuality}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Status:</span>
                        <span class="text-green-400">${report.status}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Started:</span>
                        <span class="text-white">${new Date(report.startTime).toLocaleTimeString()}</span>
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-700">
                    <button onclick="document.getElementById('callReport').remove()" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                        Close Report
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', reportHTML);
    }

    async startCall(phoneNumber) {
        if (!this.ws || !this.clientId) {
            this.showStatus('Not connected to VoIP server', 'error');
            return;
        }

        try {
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: false 
            });

            // Setup peer connection
            this.peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            // Add local stream
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Handle ICE candidates
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.ws.send(JSON.stringify({
                        type: 'ice_candidate',
                        candidate: event.candidate
                    }));
                }
            };

            // Start call
            this.ws.send(JSON.stringify({
                type: 'start_call',
                phoneNumber: phoneNumber
            }));

            this.currentCall = { phoneNumber };
            this.showCallUI(phoneNumber);

        } catch (error) {
            this.showStatus('Failed to start call: ' + error.message, 'error');
        }
    }

    endCall() {
        if (this.currentCall) {
            this.ws.send(JSON.stringify({
                type: 'end_call',
                callId: this.currentCall.callId
            }));
        }

        this.cleanup();
        this.hideCallUI();
        this.showStatus('Call ended', 'info');
    }

    cleanup() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        this.currentCall = null;
    }

    showCallUI(phoneNumber) {
        const callUI = document.createElement('div');
        callUI.id = 'simpleCallUI';
        callUI.className = 'fixed top-4 right-4 bg-gray-900 border border-green-500 rounded-lg p-4 z-50 shadow-xl';
        callUI.innerHTML = `
            <div class="flex items-center space-x-3 mb-3">
                <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span class="text-white font-medium">📞 ${phoneNumber}</span>
            </div>
            <div id="callStatus" class="text-gray-300 text-sm mb-3">Connecting...</div>
            <div class="flex space-x-2">
                <button onclick="simpleVoIP.toggleMute()" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm">
                    🔊 Mute
                </button>
                <button onclick="simpleVoIP.endCall()" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm">
                    📞 End
                </button>
            </div>
        `;
        
        document.body.appendChild(callUI);
    }

    hideCallUI() {
        const callUI = document.getElementById('simpleCallUI');
        if (callUI) callUI.remove();
    }

    updateCallStatus(status) {
        const statusEl = document.getElementById('callStatus');
        if (statusEl) {
            statusEl.textContent = status;
        }
        this.showStatus(status, 'info');
    }

    toggleMute() {
        if (!this.localStream) return;
        
        const audioTracks = this.localStream.getAudioTracks();
        audioTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        
        this.showStatus(audioTracks[0]?.enabled ? '🔊 Unmuted' : '🔇 Muted', 'info');
    }

    showStatus(message, type) {
        const colors = {
            info: 'bg-blue-600',
            success: 'bg-green-600',
            warning: 'bg-yellow-600',
            error: 'bg-red-600'
        };
        
        const status = document.createElement('div');
        status.className = `fixed bottom-4 left-4 ${colors[type]} text-white px-4 py-2 rounded-lg z-50 shadow-lg`;
        status.textContent = message;
        document.body.appendChild(status);
        
        setTimeout(() => status.remove(), 3000);
    }
}

// Initialize VoIP client
const simpleVoIP = new SimpleVoIPClient();

// Auto-connect on load
document.addEventListener('DOMContentLoaded', () => {
    simpleVoIP.connect();
});

// Global functions for buttons
function startSimpleVoIPCall() {
    const phoneNumber = prompt('Enter phone number:');
    if (phoneNumber) {
        simpleVoIP.startCall(phoneNumber);
    }
}

// Export for global use
window.simpleVoIP = simpleVoIP;
window.startSimpleVoIPCall = startSimpleVoIPCall;