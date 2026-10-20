import React from 'react';
import { VideoTile } from './VideoTile';
import type { PeerVideo } from '../types';

interface VideoStripProps {
  localStream: MediaStream | null;
  playerName: string;
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  remotePeers: PeerVideo[];
}

export const VideoStrip: React.FC<VideoStripProps> = ({
  localStream,
  playerName,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  remotePeers,
}) => {
  return (
    <div id="videos">
      {localStream && (
        <VideoTile
          stream={localStream}
          name={`${playerName} (You)`}
          isLocal={true}
          micOn={micOn}
          camOn={camOn}
          onToggleMic={onToggleMic}
          onToggleCam={onToggleCam}
        />
      )}
      {remotePeers.map((peer) => (
        <VideoTile
          key={peer.id}
          stream={peer.stream}
          name={peer.name || 'Unknown'}
          isLocal={false}
        />
      ))}
    </div>
  );
};
