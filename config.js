/**
 * Configuration file for Collaborative Platform
 */

const path = require('path');

// Basic configuration
const config = {
  // Server Configuration
  SERVER: {
    PORT: process.env.PORT || 3000,
    FRONTEND_PORT: process.env.FRONTEND_PORT || 3000,
    HOST: process.env.HOST || 'localhost',
    NODE_ENV: process.env.NODE_ENV || 'development'
  },

  // Application Settings
  FEATURES: {
    MAX_USERS_PER_DOCUMENT: 50,
    MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
    ENABLE_TYPING_INDICATORS: true,
    ENABLE_CURSOR_SHARING: true
  },

  // Security
  SECURITY: {
    CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
    ALLOWED_ORIGINS: [
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ]
  },

  // Default Content
  DEFAULTS: {
    DOCUMENT_TITLE: 'Welcome Document',
    WELCOME_CONTENT: `# 🚀 Welcome to Collaborative Platform!

## ✨ Features:
- **Real-time editing** - See changes as they happen
- **Multi-user support** - Collaborate with your team
- **Live cursors** - See where others are editing
- **Document sharing** - Share links with collaborators

Happy collaborating! 🎉`
  }
};

// Simple validation
config.validate = function() {
  if (!this.SERVER.PORT || this.SERVER.PORT === 'undefined') {
    this.SERVER.PORT = 3000;
  }
  if (!this.SERVER.FRONTEND_PORT || this.SERVER.FRONTEND_PORT === 'undefined') {
    this.SERVER.FRONTEND_PORT = 3000;
  }
  console.log('✅ Configuration validated successfully');
  return true;
};

// Initialize
config.validate();

module.exports = config;