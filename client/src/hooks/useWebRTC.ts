import { useState, useEffect, useRef, useCallback } from 'react';
import type { PeerVideo, PlayersMap } from '../types';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export function useWebRTC(
  socket: any,
  myId: string | null,
  allPlayersRef: React.MutableRefObject<PlayersMap>,
  enabled: boolean = false // <-- Added enabled flag
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<PeerVideo[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [id: string]: any }>({});
  const currentNearbyRef = useRef<Set<string>>(new Set());

  // 1. Acquire local camera & microphone ONLY after player joins
  useEffect(() => {
    if (!enabled) return; // <-- Guard: Do not request permissions before joining

    let active = true;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (!active) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          localStreamRef.current = stream;
          setLocalStream(stream);
        })
        .catch((err) => {
          console.warn('Camera/mic access denied or unavailable:', err);
        });
    }

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [enabled]);

  const destroyPeerConnection = useCallback((remoteId: string) => {
    if (peersRef.current[remoteId]) {
      try {
        peersRef.current[remoteId].destroy();
      } catch (e) {
        console.warn('Error destroying peer connection:', e);
      }
      delete peersRef.current[remoteId];
    }
    setRemotePeers((prev) => prev.filter((p) => p.id !== remoteId));
  }, []);

  const createPeerConnection = useCallback(
    (remoteId: string) => {
      if (!localStreamRef.current || !window.SimplePeer) return;
      if (!myId) return;

      const initiator = myId < remoteId;

      const peer = new window.SimplePeer({
        initiator,
        stream: localStreamRef.current,
        trickle: true,
        config: { iceServers: ICE_SERVERS },
      });

      peersRef.current[remoteId] = peer;

      peer.on('signal', (signal: any) => {
        if (socket) {
          socket.emit('webrtc-signal', { to: remoteId, signal });
        }
      });

      peer.on('stream', (remoteStream: MediaStream) => {
        setRemotePeers((prev) => {
          if (prev.some((p) => p.id === remoteId)) return prev;
          const peerName = allPlayersRef.current[remoteId]?.name || 'Unknown';
          return [...prev, { id: remoteId, name: peerName, stream: remoteStream }];
        });
      });

      peer.on('close', () => destroyPeerConnection(remoteId));
      peer.on('error', (err: any) => {
        console.warn(`Peer error with ${remoteId}:`, err);
        destroyPeerConnection(remoteId);
      });
    },
    [socket, myId, allPlayersRef, destroyPeerConnection]
  );

  // 2. Handle proximity peer diffs
  const updateProximityPeers = useCallback(
    (nearbyIds: string[]) => {
      const nextNearby = new Set(nearbyIds);

      // New arrivals
      nextNearby.forEach((id) => {
        if (!currentNearbyRef.current.has(id) && !peersRef.current[id]) {
          createPeerConnection(id);
        }
      });

      // Departures
      currentNearbyRef.current.forEach((id) => {
        if (!nextNearby.has(id)) {
          destroyPeerConnection(id);
        }
      });

      currentNearbyRef.current = nextNearby;
    },
    [createPeerConnection, destroyPeerConnection]
  );

  // 3. Listen for webrtc-signal relay from socket
  useEffect(() => {
    if (!socket) return;

    const handleSignal = ({ from, signal }: { from: string; signal: any }) => {
      if (!peersRef.current[from]) {
        if (!localStreamRef.current || !window.SimplePeer) return;

        const peer = new window.SimplePeer({
          initiator: false,
          stream: localStreamRef.current,
          trickle: true,
          config: { iceServers: ICE_SERVERS },
        });

        peersRef.current[from] = peer;

        peer.on('signal', (s: any) => {
          socket.emit('webrtc-signal', { to: from, signal: s });
        });

        peer.on('stream', (remoteStream: MediaStream) => {
          setRemotePeers((prev) => {
            if (prev.some((p) => p.id === from)) return prev;
            const peerName = allPlayersRef.current[from]?.name || 'Unknown';
            return [...prev, { id: from, name: peerName, stream: remoteStream }];
          });
        });

        peer.on('close', () => destroyPeerConnection(from));
        peer.on('error', (err: any) => {
          console.warn(`Peer error with ${from}:`, err);
          destroyPeerConnection(from);
        });
      }

      peersRef.current[from].signal(signal);
    };

    socket.on('webrtc-signal', handleSignal);

    return () => {
      socket.off('webrtc-signal', handleSignal);
    };
  }, [socket, allPlayersRef, destroyPeerConnection]);

  // 4. Media controls
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const nextState = !micOn;
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState;
      });
      setMicOn(nextState);
    }
  }, [micOn]);

  const toggleCam = useCallback(() => {
    if (localStreamRef.current) {
      const nextState = !camOn;
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextState;
      });
      setCamOn(nextState);
    }
  }, [camOn]);

  return {
    localStream,
    remotePeers,
    micOn,
    camOn,
    toggleMic,
    toggleCam,
    updateProximityPeers,
    destroyPeerConnection,
  };
}