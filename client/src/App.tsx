import React, { useState, useEffect, useRef, useCallback } from 'react';
import { JoinModal } from './components/JoinModal';
import { StatusBar } from './components/StatusBar';
import { VideoStrip } from './components/VideoStrip';
import { PhaserGame } from './components/PhaserGame';
import { useWebRTC } from './hooks/useWebRTC';
import { BACKEND_URL } from './config';
import type { PlayersMap } from './types';
import './App.css';

export default function App() {
  const [joined, setJoined] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Connecting to server...');
  const [socket, setSocket] = useState<any>(null);

  const allPlayersRef = useRef<PlayersMap>({});

  // Pass joined as the 4th argument so mic/cam permission triggers after clicking Join
  const {
    localStream,
    remotePeers,
    micOn,
    camOn,
    toggleMic,
    toggleCam,
    updateProximityPeers,
    destroyPeerConnection,
  } = useWebRTC(socket, myId, allPlayersRef, joined);

  useEffect(() => {
    if (!joined) return;

    if (!window.io) {
      console.error(
        'Socket.IO client library not found on window. Ensure CDN script is loaded in index.html.'
      );
      return;
    }

    const s = window.io(BACKEND_URL);
    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [joined]);

  const handleJoin = (name: string) => {
    setPlayerName(name);
    setJoined(true);
  };

  const handleSetMyId = useCallback((id: string) => {
    setMyId(id);
  }, []);

  const handleStatusUpdate = useCallback((msg: string) => {
    setStatusMessage(msg);
  }, []);

  if (!joined) {
    return <JoinModal onJoin={handleJoin} />;
  }

  return (
    <div id="app" style={{ display: 'block' }}>
      <StatusBar message={statusMessage} />
      <VideoStrip
        localStream={localStream}
        playerName={playerName}
        micOn={micOn}
        camOn={camOn}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        remotePeers={remotePeers}
      />
      {socket && (
        <PhaserGame
          socket={socket}
          playerName={playerName}
          onSetMyId={handleSetMyId}
          allPlayersRef={allPlayersRef}
          onProximityUpdate={updateProximityPeers}
          onStatusUpdate={handleStatusUpdate}
          onDestroyPeer={destroyPeerConnection}
        />
      )}
    </div>
  );
}