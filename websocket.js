const { Server } = require('socket.io');
const config = require('../config/config');

class WebSocketManager {
  constructor(server, documentManager, userManager) {
    this.io = new Server(server, {
      cors: {
        origin: config.ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    this.documentManager = documentManager;
    this.userManager = userManager;
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0
    };
    
    this.initializeSocketHandlers();
  }

  initializeSocketHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Periodically log connection stats
    setInterval(() => {
      this.logConnectionStats();
    }, 30000);
  }

  handleConnection(socket) {
    this.connectionStats.totalConnections++;
    this.connectionStats.activeConnections++;
    
    console.log(`🔗 User connected: ${socket.id} (Total: ${this.connectionStats.totalConnections}, Active: ${this.connectionStats.activeConnections})`);

    // User joins a document
    socket.on('join-document', (data) => {
      this.handleJoinDocument(socket, data);
    });

    // Handle text changes
    socket.on('text-change', (data) => {
      this.handleTextChange(socket, data);
    });

    // Handle cursor movements
    socket.on('cursor-move', (data) => {
      this.handleCursorMove(socket, data);
    });

    // Handle user typing
    socket.on('user-typing', (isTyping) => {
      this.handleUserTyping(socket, isTyping);
    });

    // Handle title changes
    socket.on('title-change', (newTitle) => {
      this.handleTitleChange(socket, newTitle);
    });

    // Handle user info update
    socket.on('update-user-info', (userInfo) => {
      this.handleUserInfoUpdate(socket, userInfo);
    });

    // Handle ping from client
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(socket, reason);
    });

    // Handle connection error
    socket.on('error', (error) => {
      console.error(`🚨 Socket error for ${socket.id}:`, error);
    });

    // Send welcome message
    socket.emit('welcome', {
      message: 'Connected to collaborative platform',
      serverTime: new Date().toISOString(),
      socketId: socket.id
    });
  }

  handleJoinDocument(socket, data) {
    try {
      const { documentId, user } = data;
      
      if (!documentId) {
        socket.emit('error', { message: 'Document ID is required' });
        return;
      }

      // Validate document ID format (basic UUID check)
      if (!this.isValidDocumentId(documentId)) {
        socket.emit('error', { message: 'Invalid document ID format' });
        return;
      }

      // Create document if it doesn't exist
      if (!this.documentManager.hasDocument(documentId)) {
        this.documentManager.createDocument(`Document ${documentId.substring(0, 8)}`, '');
      }

      const document = this.documentManager.getDocument(documentId);
      
      // Check user limit
      if (document.users.size >= config.MAX_USERS_PER_DOCUMENT) {
        socket.emit('error', { message: 'Document has reached maximum user limit' });
        return;
      }

      // Add user to document
      const userData = {
        id: socket.id,
        name: user?.name || `User${socket.id.substring(0, 4)}`,
        color: user?.color || this.generateRandomColor(),
        cursor: null,
        isTyping: false,
        joinedAt: new Date()
      };
      
      this.userManager.addUser(socket.id, documentId, userData);
      document.users.add(socket.id);
      socket.join(documentId);

      // Send current document state to new user
      socket.emit('document-state', {
        content: document.content,
        title: document.title,
        documentId: document.id,
        users: this.userManager.getUsersInDocument(documentId)
      });

      // Notify others about new user
      socket.to(documentId).emit('user-joined', userData);

      // Send updated user list to all in document
      this.broadcastUserList(documentId);
      
      console.log(`👤 User ${userData.name} joined document ${documentId} (Users: ${document.users.size})`);
    } catch (error) {
      console.error('Error handling join-document:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  }

  handleTextChange(socket, data) {
    try {
      const user = this.userManager.getUser(socket.id);
      if (!user) return;

      const { content, documentId } = data;

      // Validate content size
      if (content && content.length > config.MAX_DOCUMENT_SIZE) {
        socket.emit('error', { message: 'Document size too large' });
        return;
      }

      // Update document content
      const success = this.documentManager.updateDocument(documentId, { content });
      if (!success) {
        socket.emit('error', { message: 'Document not found' });
        return;
      }

      // Broadcast to other users in the document
      socket.to(documentId).emit('text-update', {
        content,
        userId: socket.id,
        user: {
          name: user.name,
          color: user.color
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error handling text-change:', error);
      socket.emit('error', { message: 'Failed to update text' });
    }
  }

  handleCursorMove(socket, data) {
    if (!config.ENABLE_CURSOR_SHARING) return;

    const user = this.userManager.getUser(socket.id);
    if (!user) return;

    user.cursor = data;
    
    socket.to(user.documentId).emit('cursor-update', {
      userId: socket.id,
      user: {
        name: user.name,
        color: user.color
      },
      cursor: data,
      timestamp: new Date().toISOString()
    });
  }

  handleUserTyping(socket, isTyping) {
    if (!config.ENABLE_TYPING_INDICATORS) return;

    const user = this.userManager.getUser(socket.id);
    if (!user) return;

    user.isTyping = isTyping;
    
    socket.to(user.documentId).emit('user-typing', {
      userId: socket.id,
      user: {
        name: user.name,
        color: user.color
      },
      isTyping,
      timestamp: new Date().toISOString()
    });
  }

  handleTitleChange(socket, newTitle) {
    const user = this.userManager.getUser(socket.id);
    if (!user) return;

    // Validate title
    if (!newTitle || typeof newTitle !== 'string' || newTitle.length > 100) {
      socket.emit('error', { message: 'Invalid document title' });
      return;
    }

    const success = this.documentManager.updateDocument(user.documentId, { title: newTitle });
    if (success) {
      this.io.to(user.documentId).emit('title-updated', {
        title: newTitle,
        updatedBy: user.name,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleUserInfoUpdate(socket, userInfo) {
    const user = this.userManager.getUser(socket.id);
    if (!user) return;

    // Update user information
    if (userInfo.name && userInfo.name.length <= 20) {
      user.name = userInfo.name;
    }
    if (userInfo.color) {
      user.color = userInfo.color;
    }

    // Notify other users in the document
    this.broadcastUserList(user.documentId);
  }

  handleDisconnect(socket, reason) {
    const user = this.userManager.getUser(socket.id);
    if (user) {
      console.log(`👋 User ${user.name} disconnected: ${reason}`);
      
      // Remove user from document
      const document = this.documentManager.getDocument(user.documentId);
      if (document) {
        document.users.delete(socket.id);
        socket.to(user.documentId).emit('user-left', {
          userId: socket.id,
          userName: user.name,
          reason: reason
        });
        this.broadcastUserList(user.documentId);
      }
      
      this.userManager.removeUser(socket.id);
    }

    this.connectionStats.activeConnections--;
    console.log(`📊 Connection closed. Active: ${this.connectionStats.activeConnections}`);
  }

  broadcastUserList(documentId) {
    const users = this.userManager.getUsersInDocument(documentId);
    this.io.to(documentId).emit('users-update', users);
  }

  generateRandomColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#FF9FF3', '#54A0FF', '#5f27cd', '#00d2d3'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  isValidDocumentId(documentId) {
    // Basic validation for document IDs (UUID or 'default')
    return typeof documentId === 'string' && 
           (documentId === 'default' || documentId.length === 36);
  }

  logConnectionStats() {
    console.log(`📊 Connection Stats - Total: ${this.connectionStats.totalConnections}, Active: ${this.connectionStats.activeConnections}`);
  }

  // Public methods for external access
  getConnectionStats() {
    return { ...this.connectionStats };
  }

  getActiveUsers() {
    return this.userManager.getUserCount();
  }
}

module.exports = WebSocketManager;