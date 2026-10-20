const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

console.log('RUNNING server.js from:', __dirname);

const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

// Optional cors package fallback to manual headers
let corsMiddleware;
try {
  const cors = require('cors');
  corsMiddleware = cors({
    origin: CLIENT_ORIGIN === '*' ? '*' : CLIENT_ORIGIN.split(',').map(s => s.trim()),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  });
} catch (e) {
  corsMiddleware = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', CLIENT_ORIGIN);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  };
}
app.use(corsMiddleware);

// Initialize Socket.IO with CORS support for decoupled frontends
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN === '*' ? '*' : CLIENT_ORIGIN.split(',').map(s => s.trim()),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Serve static frontend files if frontend directory exists
// (useful when running single-server or production deployments)
const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// In-memory state: all connected players keyed by socket id
// { id: { x, y, direction, name } }
const players = {};

// Distance (in pixels) inside which two players are considered "in proximity"
// This is the threshold Gather-style apps use to trigger video/audio calls.
const PROXIMITY_RADIUS = 120;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connectedPlayers: Object.keys(players).length,
    timestamp: new Date().toISOString()
  });
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  console.log('1: connection handler running');

  socket.on('playerName', ({ playerName }) => {
    console.log('3: playerName received:', playerName);
    players[socket.id] = {
      x: 400,
      y: 300,
      direction: 'down',
      name: playerName
    };

    socket.emit('init', { id: socket.id, players });
    console.log('broadcasting playerJoined:', players[socket.id]);
    socket.broadcast.emit('playerJoined', { id: socket.id, player: players[socket.id] });
  });

  console.log('2: about to broadcast playerJoined');

  // Client sends movement updates
  socket.on('move', (data) => {
    const player = players[socket.id];
    if (!player) return;

    player.x = data.x;
    player.y = data.y;
    player.direction = data.direction;

    // Broadcast this player's new position to everyone else
    socket.broadcast.emit('playerMoved', {
      id: socket.id,
      x: player.x,
      y: player.y,
      direction: player.direction
    });

    // Recompute proximity groups every time someone moves.
    // In a real app you'd debounce/throttle this instead of running on every packet.
    broadcastProximity();
  });

  // --- WebRTC signaling relay ---
  // The server never looks inside these payloads; it just forwards
  // offer/answer/ICE candidate data between the two specific peers
  // involved, using their socket ids as the address.
  socket.on('webrtc-signal', ({ to, signal }) => {
    io.to(to).emit('webrtc-signal', { from: socket.id, signal });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerLeft', { id: socket.id });
    broadcastProximity();
  });
});

// Computes which pairs of players are within PROXIMITY_RADIUS of each other
// and tells each client who they should open a WebRTC connection with.
function broadcastProximity() {
  const ids = Object.keys(players);
  const nearbyMap = {}; // id -> [nearby ids]

  ids.forEach((id) => (nearbyMap[id] = []));

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = players[ids[i]];
      const b = players[ids[j]];
      if (!a || !b) continue;

      const dist = Math.hypot(a.x - b.x, a.y - b.y);

      if (dist <= PROXIMITY_RADIUS) {
        nearbyMap[ids[i]].push(ids[j]);
        nearbyMap[ids[j]].push(ids[i]);
      }
    }
  }

  ids.forEach((id) => {
    io.to(id).emit('proximityUpdate', { nearby: nearbyMap[id] });
  });
}

server.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
  console.log(`Proximity radius: ${PROXIMITY_RADIUS}px`);
});
