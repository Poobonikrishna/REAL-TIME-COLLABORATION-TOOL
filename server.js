const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');

// Simple config if the main one fails
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const app = express();
const server = http.createServer(app);

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/components', express.static(path.join(__dirname, '../frontend/components')));
app.use('/utils', express.static(path.join(__dirname, '../frontend/utils')));

// CORS
app.use(cors());
app.use(express.json());

// Import managers
const DocumentManager = require('./documentManager');
const UserManager = require('./userManager');
const WebSocketManager = require('./websocket');

const documentManager = new DocumentManager();
const userManager = new UserManager();
const wsManager = new WebSocketManager(server, documentManager, userManager);

// API Routes
app.get('/api/documents', (req, res) => {
  const documents = documentManager.getAllDocuments();
  res.json(documents);
});

app.post('/api/documents', (req, res) => {
  const { title, content } = req.body;
  const document = documentManager.createDocument(title, content);
  res.json(document);
});

app.get('/api/documents/:id', (req, res) => {
  const document = documentManager.getDocument(req.params.id);
  if (document) {
    res.json(document);
  } else {
    res.status(404).json({ error: 'Document not found' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🎯 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🌍 Frontend: http://${HOST}:${PORT}`);
  console.log(`🔧 Health check: http://${HOST}:${PORT}/health`);
});