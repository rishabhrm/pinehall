# Gather Clone — Backend Server

A Node.js + Express + Socket.IO server providing real-time player position synchronization, proximity detection, and WebRTC signaling.

## Responsibilities

- **Player State & Movement**: Maintains active connected players in memory, assigns initial spawn coordinates, and broadcasts movement updates.
- **Proximity Detection**: Computes distance between players every movement update and broadcasts nearby peer lists (`proximityUpdate`) within `PROXIMITY_RADIUS = 120px`.
- **WebRTC Signaling Relay**: Transparently relays SDP offers, answers, and ICE candidate exchange (`webrtc-signal`) between peers.
- **CORS Support**: Configured with CORS for cross-origin Socket.IO and HTTP requests so independent frontend clients (e.g. React/Vite dev servers or static servers) can connect seamlessly.
- **Static Asset Serving (Fallback)**: Can serve static frontend files from `../frontend` for single-port deployments or production hosting.

## Requirements

- Node.js 18+ (LTS recommended)
- npm

## Setup & Running

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```
   Or run with nodemon in development mode:
   ```bash
   npm run dev
   ```

3. Server runs on `http://localhost:3000` by default.

## Environment Variables

Copy `.env.example` to `.env` to customize settings:
- `PORT`: Port to listen on (default `3000`).
- `CLIENT_ORIGIN`: Allowed origins for CORS (default `*` or comma-separated URLs like `http://localhost:5000,http://localhost:5173`).
- `FRONTEND_PATH`: Custom path to frontend directory (default `../frontend`).

## Endpoints

- `GET /health`: Returns JSON with server status and connected player count.
- `GET /`: Serves `index.html` from the frontend folder when accessed directly.
- Socket.IO connection: `ws://localhost:3000`
