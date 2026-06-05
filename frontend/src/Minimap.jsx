import { useEffect, useRef } from 'react';

export default function Minimap({ activeHouse }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeHouse || !activeHouse.rooms || activeHouse.rooms.length === 0) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    const draw = () => {
      if (!ctx || !canvas) return;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear canvas
      ctx.fillStyle = '#0f172a'; // slate-900 matching UI
      ctx.fillRect(0, 0, width, height);

      // 2. Calculate bounds of rooms to center and auto-scale
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      activeHouse.rooms.forEach(room => {
        const offset = room.offset || [0, 0, 0];
        const w = room.room?.dimensions?.width || 5.0;
        const l = room.room?.dimensions?.length || 5.0;

        const rMinX = offset[0] - w / 2;
        const rMaxX = offset[0] + w / 2;
        const rMinZ = offset[2] - l / 2;
        const rMaxZ = offset[2] + l / 2;

        if (rMinX < minX) minX = rMinX;
        if (rMaxX > maxX) maxX = rMaxX;
        if (rMinZ < minZ) minZ = rMinZ;
        if (rMaxZ > maxZ) maxZ = rMaxZ;
      });

      // Add padding
      const padding = 15;
      const rangeX = (maxX - minX) || 1;
      const rangeZ = (maxZ - minZ) || 1;

      // Scale to fit canvas
      const scaleX = (width - padding * 2) / rangeX;
      const scaleZ = (height - padding * 2) / rangeZ;
      const scale = Math.min(scaleX, scaleZ);

      // Center offsets
      const offsetX = padding + (width - padding * 2 - rangeX * scale) / 2 - minX * scale;
      const offsetZ = padding + (height - padding * 2 - rangeZ * scale) / 2 - minZ * scale;

      const toCanvasX = (worldX) => worldX * scale + offsetX;
      const toCanvasY = (worldZ) => worldZ * scale + offsetZ; // Z in 3D maps to Y in 2D

      // 3. Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // 4. Draw rooms
      activeHouse.rooms.forEach(room => {
        const offset = room.offset || [0, 0, 0];
        const w = room.room?.dimensions?.width || 5.0;
        const l = room.room?.dimensions?.length || 5.0;

        const x = toCanvasX(offset[0] - w / 2);
        const y = toCanvasY(offset[2] - l / 2);
        const rWidth = w * scale;
        const rHeight = l * scale;

        const isCurrent = activeHouse.currentRoomId === room.room_id;

        // Fill
        ctx.fillStyle = isCurrent ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(x, y, rWidth, rHeight);

        // Border
        ctx.strokeStyle = isCurrent ? '#6366f1' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = isCurrent ? 2 : 1;
        ctx.strokeRect(x, y, rWidth, rHeight);

        // Name label
        ctx.fillStyle = isCurrent ? '#a5b4fc' : '#6b7a99';
        ctx.font = 'bold 8px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(room.room_name, x + rWidth / 2, y + rHeight / 2);
      });

      // 5. Draw connections
      if (activeHouse.connections) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);

        activeHouse.connections.forEach(conn => {
          const roomFrom = activeHouse.rooms.find(r => r.room_id === conn.from);
          const roomTo = activeHouse.rooms.find(r => r.room_id === conn.to);

          if (roomFrom && roomTo) {
            const fromX = toCanvasX(roomFrom.offset[0]);
            const fromY = toCanvasY(roomFrom.offset[2]);
            const toX = toCanvasX(roomTo.offset[0]);
            const toY = toCanvasY(roomTo.offset[2]);

            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);
            ctx.stroke();
          }
        });
        ctx.setLineDash([]); // Reset
      }

      // 6. Draw camera marker (if window object exists)
      const camState = window.minisceneCameraState;
      if (camState && typeof camState.x === 'number' && typeof camState.z === 'number') {
        // Convert camera position (note: point cloud might be scaled, camera coordinates are global 3D space)
        // In full house view, rooms are rendered relative to their offsets.
        const camX = toCanvasX(camState.x);
        const camY = toCanvasY(camState.z);

        // Camera direction wedge
        const angle = camState.angle || 0; // Camera rotation Y
        const radius = 18;

        ctx.fillStyle = 'rgba(6, 182, 212, 0.18)';
        ctx.beginPath();
        ctx.moveTo(camX, camY);
        // Note: Canvas angle starts at 3 o'clock, ThreeJS camera rotation Y is offset by PI/2.
        // We draw a cone of 45 degrees (PI/4) around the angle.
        ctx.arc(camX, camY, radius, angle - Math.PI/2 - Math.PI/6, angle - Math.PI/2 + Math.PI/6);
        ctx.closePath();
        ctx.fill();

        // Direction indicator line
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(camX, camY);
        ctx.lineTo(camX + Math.sin(angle) * 12, camY + Math.cos(angle) * 12);
        ctx.stroke();

        // Active point
        ctx.fillStyle = '#06b6d4';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(camX, camY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [activeHouse]);

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      right: 20,
      width: 170,
      height: 170,
      borderRadius: 14,
      overflow: 'hidden',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      zIndex: 20,
      pointerEvents: 'none'
    }}>
      <canvas ref={canvasRef} width={170} height={170} />
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '0.62rem',
        color: '#6b7a99',
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Digital Twin Map
      </div>
    </div>
  );
}
