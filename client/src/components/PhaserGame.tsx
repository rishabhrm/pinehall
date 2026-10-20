import React, { useEffect, useRef } from 'react';
import type { PlayersMap } from '../types';

interface PhaserGameProps {
  socket: any;
  playerName: string;
  onSetMyId: (id: string) => void;
  allPlayersRef: React.MutableRefObject<PlayersMap>;
  onProximityUpdate: (nearby: string[]) => void;
  onStatusUpdate: (msg: string) => void;
  onDestroyPeer: (id: string) => void;
}

export const PhaserGame: React.FC<PhaserGameProps> = React.memo(({
  socket,
  playerName,
  onSetMyId,
  allPlayersRef,
  onProximityUpdate,
  onStatusUpdate,
  onDestroyPeer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);

  // Store callbacks in refs to keep them fresh without re-running the Phaser lifecycle useEffect
  const onSetMyIdRef = useRef(onSetMyId);
  onSetMyIdRef.current = onSetMyId;

  const onProximityUpdateRef = useRef(onProximityUpdate);
  onProximityUpdateRef.current = onProximityUpdate;

  const onStatusUpdateRef = useRef(onStatusUpdate);
  onStatusUpdateRef.current = onStatusUpdate;

  const onDestroyPeerRef = useRef(onDestroyPeer);
  onDestroyPeerRef.current = onDestroyPeer;

  useEffect(() => {
    if (!containerRef.current || !socket || !window.Phaser) return;

    // Prevent duplicate canvases
    containerRef.current.innerHTML = '';

    const Phaser = window.Phaser;
    const SPEED = 200;

    let myId: string | null = null;
    let mySprite: any = null;
    const otherSprites: { [id: string]: any } = {};
    const remoteStopTimers: { [id: string]: any } = {};
    let cursors: any = null;
    let wasd: any = null;

    function facingGroup(direction: string) {
      return direction === 'left' || direction === 'right' ? 'side' : direction;
    }

    function generateCharacterFrames(scene: any) {
      const w = 32,
        h = 44;
      const legOffsets = [4, 0, -4, 0];

      function drawFrame(view: string, legOffset: number) {
        const g = scene.add.graphics();

        g.fillStyle(0x333344, 1);
        const lead = view === 'side' ? legOffset : -legOffset;
        g.fillRect(w / 2 - 8 + lead, h - 14, 6, 14);
        g.fillRect(w / 2 + 2 - lead, h - 14, 6, 14);

        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(w / 2 - 10, h - 32, 20, 20, 4);

        g.fillRoundedRect(w / 2 - 14, h - 30, 5, 16, 2);
        g.fillRoundedRect(w / 2 + 9, h - 30, 5, 16, 2);

        g.fillStyle(0xe8c39e, 1);
        g.fillCircle(w / 2, h - 34, 9);
        g.lineStyle(1, 0x1a1a2e, 1);
        g.strokeCircle(w / 2, h - 34, 9);

        if (view === 'down') {
          g.fillStyle(0x1a1a2e, 1);
          g.fillCircle(w / 2 - 3, h - 35, 1.3);
          g.fillCircle(w / 2 + 3, h - 35, 1.3);
        } else if (view === 'up') {
          g.fillStyle(0x553311, 1);
          g.fillCircle(w / 2, h - 38, 6);
        } else if (view === 'side') {
          g.fillStyle(0x1a1a2e, 1);
          g.fillCircle(w / 2 + 4, h - 35, 1.3);
        }

        return g;
      }

      ['down', 'up', 'side'].forEach((view) => {
        legOffsets.forEach((offset, i) => {
          const g = drawFrame(view, offset);
          g.generateTexture(`char-${view}-${i}`, w, h);
          g.destroy();
        });

        scene.anims.create({
          key: `walk-${view}`,
          frames: [0, 1, 2, 3].map((i) => ({ key: `char-${view}-${i}` })),
          frameRate: 8,
          repeat: -1,
        });
      });
    }

    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: containerRef.current,
      backgroundColor: '#2d2d44',
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: {
        preload(this: any) {
          this.load.spritesheet('tiles', '/tiles.png', {
            frameWidth: 32,
            frameHeight: 32,
          });
        },
        create(this: any) {
          const scene = this;

          scene.add
            .tileSprite(0, 0, 800, 600, 'tiles', 0)
            .setOrigin(0, 0)
            .setDepth(-2);

          scene.add
            .tileSprite(520, 40, 240, 210, 'tiles', 16)
            .setOrigin(0, 0)
            .setDepth(-1);

          scene.add
            .tileSprite(40, 432, 220, 130, 'tiles', 17)
            .setOrigin(0, 0)
            .setDepth(-1);

          generateCharacterFrames(scene);

          const wallRects = [
            { x: 520, y: 40, w: 240, h: 12 },
            { x: 520, y: 40, w: 12, h: 110 },
            { x: 520, y: 190, w: 12, h: 60 },
            { x: 748, y: 40, w: 12, h: 210 },
            { x: 520, y: 238, w: 240, h: 12 },
            { x: 600, y: 100, w: 100, h: 50 },
            { x: 40, y: 420, w: 220, h: 12 },
          ];

          const walls = scene.physics.add.staticGroup();
          wallRects.forEach((w) => {
            const rect = scene.add.rectangle(
              w.x + w.w / 2,
              w.y + w.h / 2,
              w.w,
              w.h,
              0x55557a
            );
            rect.setStrokeStyle(2, 0x8888aa);
            scene.physics.add.existing(rect, true);
            walls.add(rect);
          });

          scene.add.text(560, 20, 'Meeting Room', {
            fontSize: '12px',
            color: '#ccccee',
          });
          scene.add.text(55, 400, 'Lounge', {
            fontSize: '12px',
            color: '#ccccee',
          });

          scene.physics.world.setBounds(0, 0, 800, 600);

          cursors = scene.input.keyboard.createCursorKeys();
          wasd = scene.input.keyboard.addKeys('W,A,S,D');

          const handleInit = ({ id, players }: { id: string; players: PlayersMap }) => {
            myId = id;
            onSetMyIdRef.current(id);
            allPlayersRef.current = players;

            Object.entries(players).forEach(([pid, p]) => {
              if (pid === myId) {
                mySprite = scene.physics.add
                  .sprite(p.x, p.y, 'char-down-1')
                  .setTint(0x00ff99);
                mySprite.facingGroup = 'down';
                mySprite.body.setSize(18, 14).setOffset(7, 28);
                mySprite.setCollideWorldBounds(true);
                scene.physics.add.collider(mySprite, walls);
              } else {
                otherSprites[pid] = scene.add
                  .sprite(p.x, p.y, 'char-down-1')
                  .setTint(0xff6666);
                otherSprites[pid].facingGroup = 'down';
              }
            });

            onStatusUpdateRef.current(
              `Connected as ${playerName} (${myId.slice(0, 6)}) — Use arrow keys / WASD to move`
            );
          };

          const handlePlayerJoined = ({ id, player }: { id: string; player: any }) => {
            if (id === myId || otherSprites[id]) return;
            allPlayersRef.current[id] = player;
            otherSprites[id] = scene.add
              .sprite(player.x, player.y, 'char-down-1')
              .setTint(0xff6666);
            otherSprites[id].facingGroup = 'down';
          };

          const handlePlayerMoved = ({
            id,
            x,
            y,
            direction,
          }: {
            id: string;
            x: number;
            y: number;
            direction: string;
          }) => {
            const sprite = otherSprites[id];
            if (!sprite) return;

            scene.tweens.add({
              targets: sprite,
              x,
              y,
              duration: 80,
              ease: 'Linear',
            });

            const group = facingGroup(direction);
            sprite.setFlipX(direction === 'left');
            sprite.facingGroup = group;
            sprite.anims.play(`walk-${group}`, true);

            clearTimeout(remoteStopTimers[id]);
            remoteStopTimers[id] = setTimeout(() => {
              sprite.anims.stop();
              sprite.setTexture(`char-${group}-1`);
            }, 150);
          };

          const handlePlayerLeft = ({ id }: { id: string }) => {
            if (otherSprites[id]) {
              otherSprites[id].destroy();
              delete otherSprites[id];
            }
            clearTimeout(remoteStopTimers[id]);
            delete remoteStopTimers[id];
            delete allPlayersRef.current[id];
            onDestroyPeerRef.current(id);
          };

          const handleProximityUpdate = ({ nearby }: { nearby: string[] }) => {
            Object.values(otherSprites).forEach((s) => s.setTint(0xff6666));
            nearby.forEach((id) => {
              if (otherSprites[id]) otherSprites[id].setTint(0xffcc00);
            });

            onStatusUpdateRef.current(
              nearby.length
                ? `In proximity with ${nearby.length} player(s) — video call active above`
                : `Connected as ${playerName} (${myId ? myId.slice(0, 6) : ''}) — Use arrow keys / WASD to move`
            );

            onProximityUpdateRef.current(nearby);
          };

          socket.on('init', handleInit);
          socket.on('playerJoined', handlePlayerJoined);
          socket.on('playerMoved', handlePlayerMoved);
          socket.on('playerLeft', handlePlayerLeft);
          socket.on('proximityUpdate', handleProximityUpdate);

          // Tell server about player name
          socket.emit('playerName', { playerName });

          scene.events.once('shutdown', () => {
            socket.off('init', handleInit);
            socket.off('playerJoined', handlePlayerJoined);
            socket.off('playerMoved', handlePlayerMoved);
            socket.off('playerLeft', handlePlayerLeft);
            socket.off('proximityUpdate', handleProximityUpdate);
          });
        },
        update(this: any) {
          if (!mySprite || !mySprite.body) return;

          let dx = 0, dy = 0;
          if (cursors?.left.isDown || wasd?.A.isDown) dx = -1;
          else if (cursors?.right.isDown || wasd?.D.isDown) dx = 1;
          if (cursors?.up.isDown || wasd?.W.isDown) dy = -1;
          else if (cursors?.down.isDown || wasd?.S.isDown) dy = 1;

          if (dx !== 0 && dy !== 0) {
            dx *= Math.SQRT1_2;
            dy *= Math.SQRT1_2;
          }

          mySprite.body.setVelocity(dx * SPEED, dy * SPEED);

          if (dx !== 0 || dy !== 0) {
            const direction =
              dy < 0 ? 'up' : dy > 0 ? 'down' : dx < 0 ? 'left' : 'right';
            const group = facingGroup(direction);
            mySprite.setFlipX(direction === 'left');
            mySprite.facingGroup = group;
            mySprite.anims.play(`walk-${group}`, true);
            socket.emit('move', { x: mySprite.x, y: mySprite.y, direction });
          } else if (mySprite.anims.isPlaying) {
            mySprite.anims.stop();
          }
        },
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [socket, playerName]); // <-- Only re-run if socket or name changes, not on every status update!

  return <div id="game" ref={containerRef} />;
});