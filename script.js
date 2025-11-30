// Main application controller
class CollaborativePlatform {
    constructor() {
        this.socket = null;
        this.currentDocumentId = 'default';
        this.userName = 'User';
        this.userColor = '';
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        // Component managers
        this.editorManager = null;
        this.sidebarManager = null;
        this.userListManager = null;
        this.cursorManager = null;

        this.initializeApp();
    }

    initializeApp() {
        console.log('🚀 Initializing Collaborative Platform...');
        
        // Set global reference for components
        window.collabPlatform = this;
        
        this.initializeUtilities();
        this.bindGlobalEvents();
        this.showUserModal();
        
        // Extract document ID from URL if present
        this.extractDocumentFromURL();
    }

    initializeUtilities() {
        // Initialize utility classes
        this.cursorManager = new CursorManager();
    }

    bindGlobalEvents() {
        // Window events
        window.addEventListener('beforeunload', () => this.handleBeforeUnload());
        window.addEventListener('online', () => this.handleOnlineStatus());
        window.addEventListener('offline', () => this.handleOfflineStatus());
        
        // Handle browser back/forward
        window.addEventListener('popstate', () => this.extractDocumentFromURL());
    }

    extractDocumentFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const docParam = urlParams.get('doc');
        if (docParam && docParam !== this.currentDocumentId) {
            this.currentDocumentId = docParam;
            console.log('📄 Document from URL:', this.currentDocumentId);
        }
    }

    showUserModal() {
        const modal = document.getElementById('user-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('username').focus();
            
            // Set random default name
            const randomId = Math.random().toString(36).substring(2, 6);
            document.getElementById('username').value = `User${randomId}`;
        }
    }

    hideUserModal() {
        const modal = document.getElementById('user-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async joinSession() {
        const usernameInput = document.getElementById('username');
        const documentSelect = document.getElementById('document-select');
        
        if (!usernameInput || !documentSelect) return;

        const username = usernameInput.value.trim();
        const selectedDocId = documentSelect.value;

        if (!username) {
            this.showNotification('Please enter your name', 'error');
            return;
        }

        this.userName = username;
        this.userColor = Helpers.generateRandomColor();
        this.currentDocumentId = selectedDocId || 'default';
        
        this.hideUserModal();
        this.connectToServer();
        this.showNotification(`Welcome ${username}! 🎉`, 'success');
    }

    connectToServer() {
        this.updateConnectionStatus('connecting');
        
        try {
            // Connect to Socket.IO server
            this.socket = io({
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay,
                timeout: 10000
            });
            
            this.setupSocketEventHandlers();
            
        } catch (error) {
            console.error('🚨 Failed to connect:', error);
            this.showNotification('Failed to connect to server', 'error');
            this.attemptReconnect();
        }
    }

    setupSocketEventHandlers() {
        if (!this.socket) return;

        // Connection events
        this.socket.on('connect', () => this.handleSocketConnect());
        this.socket.on('disconnect', (reason) => this.handleSocketDisconnect(reason));
        this.socket.on('connect_error', (error) => this.handleSocketError(error));
        this.socket.on('reconnect', (attempt) => this.handleSocketReconnect(attempt));
        this.socket.on('reconnect_attempt', (attempt) => this.handleReconnectAttempt(attempt));
        this.socket.on('reconnect_error', (error) => this.handleReconnectError(error));
        this.socket.on('reconnect_failed', () => this.handleReconnectFailed());

        // Application events
        this.socket.on('welcome', (data) => this.handleWelcome(data));
        this.socket.on('document-state', (data) => this.handleDocumentState(data));
        this.socket.on('text-update', (data) => this.handleRemoteTextUpdate(data));
        this.socket.on('title-updated', (data) => this.handleRemoteTitleUpdate(data));
        this.socket.on('users-update', (users) => this.handleUsersUpdate(users));
        this.socket.on('user-joined', (user) => this.handleUserJoined(user));
        this.socket.on('user-left', (data) => this.handleUserLeft(data));
        this.socket.on('cursor-update', (data) => this.handleCursorUpdate(data));
        this.socket.on('user-typing', (data) => this.handleUserTyping(data));
        this.socket.on('error', (data) => this.handleSocketAppError(data));
        this.socket.on('pong', (data) => this.handlePong(data));
    }

    handleSocketConnect() {
        console.log('✅ Connected to server with ID:', this.socket.id);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('online');
        
        // Initialize component managers
        this.initializeComponentManagers();
        
        // Join the document
        this.joinDocument();
        
        this.showNotification('Connected to server!', 'success');
    }

    initializeComponentManagers() {
        // Initialize editor manager
        this.editorManager = new EditorManager(this.socket, this.currentDocumentId);
        
        // Initialize sidebar manager
        this.sidebarManager = new SidebarManager(this.socket, this.currentDocumentId);
        
        // Initialize user list manager
        this.userListManager = new UserListManager(this.socket);
    }

    handleSocketDisconnect(reason) {
        console.log('❌ Disconnected from server:', reason);
        this.isConnected = false;
        this.updateConnectionStatus('offline');
        
        if (reason === 'io server disconnect') {
            this.showNotification('Disconnected from server', 'error');
        } else {
            this.attemptReconnect();
        }
    }

    handleSocketError(error) {
        console.error('🚨 Socket connection error:', error);
        this.updateConnectionStatus('offline');
        this.attemptReconnect();
    }

    handleSocketReconnect(attempt) {
        console.log('🔄 Reconnected after attempt:', attempt);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('online');
        this.joinDocument();
        this.showNotification('Reconnected to server!', 'success');
    }

    handleReconnectAttempt(attempt) {
        console.log(`🔄 Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`);
        this.reconnectAttempts = attempt;
        this.updateConnectionStatus('connecting');
        this.showNotification(`Reconnecting... (${attempt}/${this.maxReconnectAttempts})`, 'warning', 2000);
    }

    handleReconnectError(error) {
        console.error('🚨 Reconnection error:', error);
    }

    handleReconnectFailed() {
        console.error('❌ All reconnection attempts failed');
        this.showNotification('Failed to reconnect. Please refresh the page.', 'error');
    }

    handleWelcome(data) {
        console.log('👋 Server welcome:', data);
    }

    handleDocumentState(data) {
        if (this.editorManager) {
            this.editorManager.setContent(data.content);
        }
        
        if (document.getElementById('document-title')) {
            document.getElementById('document-title').value = data.title;
        }
        
        this.currentDocumentId = data.documentId;
        
        if (this.sidebarManager) {
            this.sidebarManager.setCurrentDocumentId(this.currentDocumentId);
            this.sidebarManager.loadDocuments();
        }
    }

    handleRemoteTextUpdate(data) {
        // Don't update if this change came from the current user
        if (data.userId === this.socket.id) return;

        if (this.editorManager) {
            this.editorManager.setContent(data.content);
        }
        
        // Show subtle notification for remote changes
        if (data.user && data.user.name) {
            this.showNotification(`${data.user.name} made changes`, 'info', 2000);
        }
    }

    handleRemoteTitleUpdate(data) {
        const titleInput = document.getElementById('document-title');
        if (titleInput) {
            titleInput.value = data.title || data;
        }
    }

    handleUsersUpdate(users) {
        if (this.userListManager) {
            // Update the user list manager
            this.userListManager.users.clear();
            users.forEach(user => {
                this.userListManager.addUser(user);
            });
        }
        
        if (this.sidebarManager) {
            this.sidebarManager.updateUsersList(users);
        }
    }

    handleUserJoined(user) {
        if (this.userListManager) {
            this.userListManager.addUser(user);
        }
        
        if (user.name) {
            this.showNotification(`👤 ${user.name} joined the document`, 'info', 3000);
        }
    }

    handleUserLeft(data) {
        const userId = data.userId || data;
        const userName = data.userName || 'A user';
        
        if (this.userListManager) {
            this.userListManager.removeUser(userId);
        }
        
        if (this.cursorManager) {
            this.cursorManager.removeCursor(userId);
        }
        
        this.showNotification(`👋 ${userName} left the document`, 'info', 3000);
    }

    handleCursorUpdate(data) {
        if (this.cursorManager && data.userId !== this.socket.id) {
            this.cursorManager.updateCursor(data);
        }
    }

    handleUserTyping(data) {
        if (this.userListManager && data.userId !== this.socket.id) {
            this.userListManager.setUserTyping(data.userId, data.isTyping);
        }
    }

    handleSocketAppError(data) {
        console.error('🚨 Application error:', data);
        if (data.message) {
            this.showNotification(data.message, 'error');
        }
    }

    handlePong(data) {
        // Handle pong response for latency measurement
        const latency = Date.now() - data.timestamp;
        console.log(`📡 Latency: ${latency}ms`);
    }

    joinDocument() {
        if (this.socket && this.isConnected) {
            this.socket.emit('join-document', {
                documentId: this.currentDocumentId,
                user: {
                    name: this.userName,
                    color: this.userColor
                }
            });
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts), 30000);
            
            console.log(`🔄 Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts})`);
            
            setTimeout(() => {
                if (!this.isConnected) {
                    this.connectToServer();
                }
            }, delay);
        } else {
            this.showNotification('Failed to reconnect. Please refresh the page.', 'error');
        }
    }

    updateConnectionStatus(status) {
        const indicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');

        if (!indicator || !statusText) return;

        // Remove all status classes
        indicator.className = 'status-indicator';
        statusText.textContent = this.getStatusText(status);

        switch (status) {
            case 'online':
                indicator.classList.add('status-online');
                break;
            case 'offline':
                indicator.classList.add('status-offline');
                break;
            case 'connecting':
                indicator.classList.add('status-connecting');
                break;
        }
    }

    getStatusText(status) {
        const statusMap = {
            online: 'Connected',
            offline: 'Disconnected',
            connecting: 'Connecting...'
        };
        return statusMap[status] || 'Unknown';
    }

    handleBeforeUnload() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    handleOnlineStatus() {
        console.log('🌐 Browser is online');
        if (!this.isConnected) {
            this.attemptReconnect();
        }
    }

    handleOfflineStatus() {
        console.log('🌐 Browser is offline');
        this.updateConnectionStatus('offline');
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
            </div>
        `;

        // Add to document
        document.body.appendChild(notification);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, duration);
        }

        return notification;
    }

    // Public method to get user data
    getUserData() {
        return {
            name: this.userName,
            color: this.userColor,
            socketId: this.socket?.id
        };
    }

    // Public method to update user info
    updateUserInfo(userInfo) {
        if (userInfo.name) {
            this.userName = userInfo.name;
        }
        if (userInfo.color) {
            this.userColor = userInfo.color;
        }
        
        if (this.socket && this.isConnected) {
            this.socket.emit('update-user-info', userInfo);
        }
    }
}

// Global helper functions
const Helpers = {
    generateRandomColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
            '#FF9FF3', '#54A0FF', '#5f27cd', '#00d2d3'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create and initialize the main application
    const app = new CollaborativePlatform();
    
    // Bind modal events
    const joinBtn = document.getElementById('join-btn');
    const usernameInput = document.getElementById('username');
    
    if (joinBtn) {
        joinBtn.addEventListener('click', () => app.joinSession());
    }
    
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                app.joinSession();
            }
        });
    }
    
    // Make app globally available for debugging
    window.app = app;
    
    console.log('🎉 Collaborative Platform initialized!');
});