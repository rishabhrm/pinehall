export interface Player {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  name: string;
}

export interface PlayersMap {
  [id: string]: Player;
}

export interface PeerVideo {
  id: string;
  name: string;
  stream: MediaStream;
}

declare global {
  interface Window {
    Phaser: any;
    SimplePeer: any;
    io: any;
    BACKEND_URL?: string;
  }
}
