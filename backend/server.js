const app = require('./app');
const http = require('http');
const SocketHandler = require('./socket/socketHandler');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const socketHandler = new SocketHandler(server);

// Add stats endpoint
app.get('/api/stats', (req, res) => {
  res.json(socketHandler.getStats());
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server initialized`);
});
