import { useEffect, useRef } from 'react';
import { Download, FileText, Image as ImageIcon, X } from 'lucide-react';

export default function FloorPlanPanel({ activeHouse, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    drawFloorPlan();
  }, [activeHouse]);

  const drawFloorPlan = (forExport = false) => {
    const canvas = canvasRef.current;
    if (!canvas || !activeHouse || !activeHouse.rooms) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Clear with grid blueprint paper background
    ctx.fillStyle = forExport ? '#ffffff' : '#0f172a'; // slate-900 or white for export
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = forExport ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 25;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // 2. Find bounds of stitched rooms
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

    const rangeX = (maxX - minX) || 1;
    const rangeZ = (maxZ - minZ) || 1;

    // Add padding
    const padding = 60;
    const scaleX = (width - padding * 2) / rangeX;
    const scaleZ = (height - padding * 2) / rangeZ;
    const scale = Math.min(scaleX, scaleZ);

    // Center offsets
    const offsetX = padding + (width - padding * 2 - rangeX * scale) / 2 - minX * scale;
    const offsetZ = padding + (height - padding * 2 - rangeZ * scale) / 2 - minZ * scale;

    const toCanvasX = (worldX) => worldX * scale + offsetX;
    const toCanvasY = (worldZ) => worldZ * scale + offsetZ;

    // 3. Draw connection doorways
    if (activeHouse.connections) {
      ctx.strokeStyle = forExport ? '#6200ee' : '#a78bfa';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

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

          // Draw doorway opening arc midway
          const midX = (fromX + toX) / 2;
          const midY = (fromY + toY) / 2;
          ctx.fillStyle = forExport ? '#ffffff' : '#0f172a';
          ctx.beginPath();
          ctx.arc(midX, midY, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.setLineDash([]);
          ctx.strokeStyle = forExport ? '#000000' : '#ffffff';
          ctx.beginPath();
          ctx.arc(midX, midY, 12, 0, Math.PI / 2);
          ctx.stroke();
          ctx.setLineDash([5, 5]);
        }
      });
      ctx.setLineDash([]); // Reset
    }

    // 4. Draw room structures
    activeHouse.rooms.forEach(room => {
      const offset = room.offset || [0, 0, 0];
      const w = room.room?.dimensions?.width || 5.0;
      const l = room.room?.dimensions?.length || 5.0;

      const rX = toCanvasX(offset[0] - w / 2);
      const rY = toCanvasY(offset[2] - l / 2);
      const rWidth = w * scale;
      const rHeight = l * scale;

      // Fill room area
      ctx.fillStyle = forExport ? 'rgba(0, 0, 0, 0.01)' : 'rgba(255, 255, 255, 0.015)';
      ctx.fillRect(rX, rY, rWidth, rHeight);

      // Draw thick structural walls
      ctx.strokeStyle = forExport ? '#1e293b' : '#f8fafc';
      ctx.lineWidth = 5;
      ctx.strokeRect(rX, rY, rWidth, rHeight);

      // Inner thin wall line for CAD styling
      ctx.strokeStyle = forExport ? '#cbd5e1' : '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(rX + 3, rY + 3, rWidth - 6, rHeight - 6);

      // Draw furniture items top-down
      const allFurniture = [
        ...(room.furniture || []).filter(f => !f.detected),
        ...(room.furniture || []).filter(f => f.detected)
      ];

      allFurniture.forEach(item => {
        const itemPos = item.position || [0, 0, 0];
        const itemSize = item.size || [1, 1, 1];
        const rotY = item.rotation ? item.rotation[1] : 0;

        // Coordinates local to room, offset is room offset
        // In stitched model, furniture coordinate position is relative to room center!
        const globalX = offset[0] + itemPos[0];
        const globalZ = offset[2] + itemPos[2];

        const cX = toCanvasX(globalX);
        const cY = toCanvasY(globalZ);
        const iW = itemSize[0] * scale;
        const iD = itemSize[2] * scale;

        // Draw rotated furniture box
        ctx.save();
        ctx.translate(cX, cY);
        ctx.rotate(-rotY); // ThreeJS uses opposite rotation orientation

        ctx.fillStyle = forExport ? 'rgba(99, 102, 241, 0.08)' : 'rgba(6, 182, 212, 0.08)';
        ctx.strokeStyle = forExport ? '#4f46e5' : '#06b6d4';
        ctx.lineWidth = 1.5;
        
        // Draw centered rectangle
        ctx.fillRect(-iW / 2, -iD / 2, iW, iD);
        ctx.strokeRect(-iW / 2, -iD / 2, iW, iD);

        // Add cross lines for styling
        ctx.strokeStyle = forExport ? 'rgba(79, 70, 229, 0.2)' : 'rgba(6, 182, 212, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-iW / 2, -iD / 2); ctx.lineTo(iW / 2, iD / 2);
        ctx.moveTo(iW / 2, -iD / 2); ctx.lineTo(-iW / 2, iD / 2);
        ctx.stroke();

        ctx.restore();
      });

      // 5. Draw dimensions ticks and text (CAD dimension lines)
      ctx.fillStyle = forExport ? '#475569' : '#94a3b8';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';

      // Width dimension line (Horizontal)
      ctx.fillText(`${w.toFixed(1)}m`, rX + rWidth / 2, rY - 8);
      ctx.strokeStyle = forExport ? '#94a3b8' : '#475569';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(rX, rY - 12); ctx.lineTo(rX + rWidth, rY - 12);
      ctx.moveTo(rX, rY - 16); ctx.lineTo(rX, rY - 8);
      ctx.moveTo(rX + rWidth, rY - 16); ctx.lineTo(rX + rWidth, rY - 8);
      ctx.stroke();

      // Length dimension line (Vertical)
      ctx.save();
      ctx.translate(rX - 8, rY + rHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${l.toFixed(1)}m`, 0, 0);
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(rX - 12, rY); ctx.lineTo(rX - 12, rY + rHeight);
      ctx.moveTo(rX - 16, rY); ctx.lineTo(rX - 8, rY);
      ctx.moveTo(rX - 16, rY + rHeight); ctx.lineTo(rX - 8, rY + rHeight);
      ctx.stroke();

      // Room name & area label
      ctx.fillStyle = forExport ? '#1e293b' : '#ffffff';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(room.room_name, rX + rWidth / 2, rY + rHeight / 2 - 4);

      ctx.fillStyle = forExport ? '#64748b' : '#6b7a99';
      ctx.font = '9px Inter, sans-serif';
      ctx.fillText(`${(w * l).toFixed(1)} m²`, rX + rWidth / 2, rY + rHeight / 2 + 10);
    });

    // 6. Draw Title Block for blueprint look
    ctx.strokeStyle = forExport ? '#1e293b' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, height - 85, width - 40, 65);
    ctx.fillStyle = forExport ? '#f8fafc' : 'rgba(255, 255, 255, 0.01)';
    ctx.fillRect(20, height - 85, width - 40, 65);

    ctx.fillStyle = forExport ? '#1e293b' : '#ffffff';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(activeHouse.name || 'MiniScene AI Digital Twin', 35, height - 62);

    ctx.fillStyle = forExport ? '#64748b' : '#6b7a99';
    ctx.font = '10px monospace';
    ctx.fillText(`Scale: 1:50 | Rooms: ${activeHouse.rooms.length} | Date: ${new Date().toLocaleDateString()}`, 35, height - 42);

    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillStyle = forExport ? '#4f46e5' : '#06b6d4';
    ctx.textAlign = 'right';
    ctx.fillText('MINISCENE AI FLOOR PLAN', width - 35, height - 52);
  };

  const exportPNG = () => {
    // Generate clean print resolution and download
    const link = document.createElement('a');
    link.download = `${activeHouse.name || 'house'}_floor_plan.png`;
    
    // Draw in white background before capturing
    drawFloorPlan(true);
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    
    // Re-draw in slate-900 background for UI view
    drawFloorPlan(false);
  };

  const exportPDF = () => {
    // Simulated PDF blueprint layout using print/save dialog, or simulated download
    drawFloorPlan(true);
    const dataUrl = canvasRef.current.toDataURL('image/png');
    drawFloorPlan(false);

    // Open a new tab with styled print layout that converts to PDF perfectly on Cmd+P
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${activeHouse.name || 'house'}_floor_plan_blueprint</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; background: #f1f5f9; }
            .card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); display: flex; flexDirection: column; align-items: center; max-width: 90%; }
            img { max-width: 100%; border: 1px solid #cbd5e1; }
            .buttons { margin-top: 20px; display: flex; gap: 12px; }
            button { background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; }
            button.secondary { background: #64748b; }
            @media print {
              body { background: white; }
              .card { box-shadow: none; padding: 0; }
              .buttons { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>MiniScene AI Digital Twin Blueprint</h2>
            <p style="color: #64748b; font-size: 13px; margin-top: -6px; margin-bottom: 16px;">Layout: ${activeHouse.name || 'My Apartment'} | Scale: 1:50</p>
            <img src="${dataUrl}" />
            <div class="buttons">
              <button onclick="window.print()">Print / Save as PDF</button>
              <button class="secondary" onclick="window.close()">Close Window</button>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{
      position: 'absolute',
      inset: '16px',
      background: '#090d16',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 30,
      boxShadow: '0 12px 48px rgba(0,0,0,0.6)'
    }}>
      {/* Top panel actions */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#0e121c',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px'
      }}>
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'white' }}>
            2D Blueprint Floor Plan
          </h3>
          <p style={{ fontSize: '0.72rem', color: '#6b7a99', marginTop: 2 }}>
            CAD schematic layout of {activeHouse.rooms.length} stitched rooms
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={exportPNG}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'white',
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
          >
            <ImageIcon size={14} /> Export PNG
          </button>
          <button
            onClick={exportPDF}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'white',
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
          >
            <FileText size={14} /> Export PDF
          </button>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <button onClick={onClose} className="action-btn"><X size={18} /></button>
        </div>
      </div>

      {/* Main floor plan workspace */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090c13',
        padding: 24,
        overflow: 'auto',
        borderBottomLeftRadius: '16px',
        borderBottomRightRadius: '16px'
      }}>
        <canvas
          ref={canvasRef}
          width={650}
          height={480}
          style={{
            background: '#0f172a',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        />
      </div>
    </div>
  );
}
