const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Collaborative Platform...');

const PORT = process.env.PORT || 3000;

// Start backend server
const backend = spawn('node', ['backend/server.js'], {
  stdio: 'inherit',
  shell: false  // Change this to false to fix the deprecation warning
});

console.log(`✅ Backend server starting on http://localhost:${PORT}`);
console.log('📖 Open your browser and navigate to the URL above');

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  backend.kill();
  process.exit();
});