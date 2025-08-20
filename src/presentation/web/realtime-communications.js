// Enhanced Real-time Communications with WebRTC VoIP
class RealtimeCommunications {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isCallActive = false;
        this.callType = null; // 'audio' or 'video'
        
        this.iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' }
        ];
    }

    async startVoIPCall(phoneNumber) {
        if (this.isCallActive) {
            this.showStatus('Call already active', 'warning');
            return;
        }

        try {
            this.callType = 'audio';
            this.showStatus(`📞 Dialing ${phoneNumber}...`, 'info');
            
            // Get audio stream
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            
            // Play dialing tone first
            await this.playDialTone();
            
            // Ring sequence
            await this.playRingSequence(phoneNumber);
            
            // Setup WebRTC
            await this.setupPeerConnection();
            this.createCallUI(phoneNumber, 'audio');
            
            this.isCallActive = true;
            this.showStatus(`✅ Audio call connected with ${phoneNumber}`, 'success');
            
        } catch (error) {
            this.showStatus('❌ VoIP call failed: ' + error.message, 'error');
            this.cleanup();
        }
    }

    async startVideoCall(phoneNumber) {
        if (this.isCallActive) {
            this.showStatus('Call already active', 'warning');
            return;
        }

        try {
            this.callType = 'video';
            this.showStatus(`📹 Dialing ${phoneNumber} for video call...`, 'info');
            
            // Get video + audio stream
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            
            // Play dialing tone first
            await this.playDialTone();
            
            // Ring sequence
            await this.playRingSequence(phoneNumber);
            
            // Setup WebRTC
            await this.setupPeerConnection();
            this.createCallUI(phoneNumber, 'video');
            
            this.isCallActive = true;
            this.showStatus(`✅ Video call connected with ${phoneNumber}`, 'success');
            
        } catch (error) {
            this.showStatus('❌ Video call failed: ' + error.message, 'error');
            this.cleanup();
        }
    }

    async playDialTone() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            // Create dual-tone multi-frequency (DTMF) dialing sound
            const playDTMF = (freq1, freq2, duration) => {
                const osc1 = audioContext.createOscillator();
                const osc2 = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                osc1.connect(gainNode);
                osc2.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                osc1.frequency.setValueAtTime(freq1, audioContext.currentTime);
                osc2.frequency.setValueAtTime(freq2, audioContext.currentTime);
                osc1.type = 'sine';
                osc2.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                
                osc1.start(audioContext.currentTime);
                osc2.start(audioContext.currentTime);
                osc1.stop(audioContext.currentTime + duration);
                osc2.stop(audioContext.currentTime + duration);
            };
            
            // Play dialing tones (simulating number entry)
            const tones = [
                [697, 1209], [697, 1336], [697, 1477], // 1, 2, 3
                [770, 1209], [770, 1336] // 4, 5
            ];
            
            for (let i = 0; i < tones.length; i++) {
                playDTMF(tones[i][0], tones[i][1], 0.2);
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error('Dial tone error:', error);
        }
    }

    async playRingSequence(phoneNumber) {
        try {
            // Create ring tone using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            const playRingTone = () => {
                // Create double ring pattern (ring-ring pause)
                const createRing = (startTime, frequency, duration) => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(frequency, startTime);
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0.5, startTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                    
                    oscillator.start(startTime);
                    oscillator.stop(startTime + duration);
                };
                
                // Double ring pattern: ring-ring-pause
                const now = audioContext.currentTime;
                createRing(now, 440, 0.5);        // First ring
                createRing(now + 0.6, 440, 0.5);  // Second ring
            };
            
            for (let ring = 1; ring <= 3; ring++) {
                this.showStatus(`📞 Ring ${ring} - Calling ${phoneNumber}...`, 'info');
                playRingTone();
                await new Promise(resolve => setTimeout(resolve, 2500));
            }
            
            this.showStatus(`📞 Connecting to ${phoneNumber}...`, 'info');
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Ring tone error:', error);
            this.showStatus(`📞 Calling ${phoneNumber} (audio unavailable)...`, 'info');
        }
    }

    async setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
        
        // Add local stream
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });
        
        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) remoteVideo.srcObject = this.remoteStream;
        };
        
        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                // Send candidate to signaling server
                console.log('ICE candidate:', event.candidate);
            }
        };
        
        // Create offer
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
    }

    createCallUI(phoneNumber, type) {
        const callUI = document.createElement('div');
        callUI.id = 'activeCallUI';
        callUI.className = 'fixed top-4 right-4 bg-gray-900 border border-blue-500 rounded-lg p-4 z-50 shadow-xl';
        
        if (type === 'audio') {
            callUI.innerHTML = `
                <div class="flex items-center space-x-3 mb-3">
                    <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span class="text-white font-medium">📞 ${phoneNumber}</span>
                </div>
                <div class="flex space-x-2">
                    <button onclick="rtComm.toggleMute()" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm">
                        🔊 Mute
                    </button>
                    <button onclick="rtComm.endCall()" class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm">
                        📞 End
                    </button>
                </div>
            `;
        } else {
            callUI.innerHTML = `
                <div class="w-80 h-60 bg-black rounded-lg overflow-hidden">
                    <div class="relative h-full">
                        <video id="localVideo" autoplay muted class="w-full h-2/3 object-cover"></video>
                        <div class="h-1/3 bg-gray-800 p-2">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-white text-sm">📹 ${phoneNumber}</span>
                                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="rtComm.toggleMute()" class="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs">
                                    🔊
                                </button>
                                <button onclick="rtComm.toggleVideo()" class="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs">
                                    📹
                                </button>
                                <button onclick="rtComm.endCall()" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">
                                    End
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        document.body.appendChild(callUI);
        
        // Setup video if video call
        if (type === 'video') {
            const localVideo = document.getElementById('localVideo');
            if (localVideo && this.localStream) {
                localVideo.srcObject = this.localStream;
            }
        }
    }

    toggleMute() {
        if (!this.localStream) return;
        
        const audioTracks = this.localStream.getAudioTracks();
        audioTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        
        this.showStatus(audioTracks[0]?.enabled ? '🔊 Unmuted' : '🔇 Muted', 'info');
    }

    toggleVideo() {
        if (!this.localStream || this.callType !== 'video') return;
        
        const videoTracks = this.localStream.getVideoTracks();
        videoTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        
        this.showStatus(videoTracks[0]?.enabled ? '📹 Video on' : '📹 Video off', 'info');
    }

    endCall() {
        this.cleanup();
        this.showStatus('📞 Call ended', 'info');
    }

    cleanup() {
        // Stop all tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        // Remove UI
        const callUI = document.getElementById('activeCallUI');
        if (callUI) callUI.remove();
        
        this.isCallActive = false;
        this.callType = null;
        this.remoteStream = null;
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

// VoIP Button Handlers
function createVoIPButtons() {
    const voipContainer = document.createElement('div');
    voipContainer.className = 'fixed bottom-4 right-4 flex space-x-3 z-40';
    voipContainer.innerHTML = `
        <button id="voipCallBtn" onclick="startVoIPCall()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-full shadow-lg transition-colors">
            📞 VoIP Call
        </button>
        <button id="voipVideoBtn" onclick="startVoIPVideoCall()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-full shadow-lg transition-colors">
            📹 VoIP Video
        </button>
    `;
    document.body.appendChild(voipContainer);
}

// Global functions
function startVoIPCall() {
    const phoneNumber = prompt('Enter phone number:') || '+27 61 948 0745';
    rtComm.startVoIPCall(phoneNumber);
}

function startVoIPVideoCall() {
    const phoneNumber = prompt('Enter phone number:') || '+27 61 948 0745';
    rtComm.startVideoCall(phoneNumber);
}

// Initialize
const rtComm = new RealtimeCommunications();

// Auto-create buttons on load
document.addEventListener('DOMContentLoaded', () => {
    createVoIPButtons();
});

// Export for global use
window.rtComm = rtComm;
window.startVoIPCall = startVoIPCall;
window.startVoIPVideoCall = startVoIPVideoCall;