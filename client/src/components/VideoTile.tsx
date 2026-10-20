import React, { useEffect, useRef } from 'react';

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  micOn?: boolean;
  camOn?: boolean;
  onToggleMic?: () => void;
  onToggleCam?: () => void;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  name,
  isLocal = false,
  micOn = true,
  camOn = true,
  onToggleMic,
  onToggleCam,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-wrap">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        id={isLocal ? 'localVideo' : undefined}
        style={{ opacity: isLocal && !camOn ? 0.2 : 1 }}
      />
      <span>{name}</span>
      {isLocal && onToggleMic && onToggleCam && (
        <div id="localControls">
          <button
            type="button"
            onClick={onToggleMic}
            className={micOn ? '' : 'off'}
          >
            Mic: {micOn ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            onClick={onToggleCam}
            className={camOn ? '' : 'off'}
          >
            Cam: {camOn ? 'On' : 'Off'}
          </button>
        </div>
      )}
    </div>
  );
};
