import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Home, Sliders, Check } from 'lucide-react';

const ROOM_TYPES = [
  { value: 'living_room', label: 'Living Room', defaultW: 7.5, defaultL: 9.5 },
  { value: 'bedroom', label: 'Bedroom', defaultW: 7.2, defaultL: 8.8 },
  { value: 'kitchen', label: 'Kitchen', defaultW: 6.8, defaultL: 6.2 },
  { value: 'dining_room', label: 'Dining Room', defaultW: 8.2, defaultL: 6.4 },
  { value: 'office', label: 'Office', defaultW: 5.0, defaultL: 5.0 },
  { value: 'bathroom', label: 'Bathroom', defaultW: 4.0, defaultL: 4.5 },
  { value: 'hallway', label: 'Hallway', defaultW: 3.0, defaultL: 6.0 },
];

const FLOOR_MATERIALS = [
  { value: 'wood', label: 'Warm Oak Wood', color: '#b98f65' },
  { value: 'marble', label: 'Polished White Marble', color: '#ded3c3' },
  { value: 'tile', label: 'Ceramic Grey Tile', color: '#94a3b8' },
  { value: 'concrete', label: 'Smooth Matte Concrete', color: '#64748b' },
  { value: 'carpet', label: 'Cozy Wool Carpet', color: '#c8beb1' },
];

const WALL_COLORS = [
  { value: '#b9b1a6', label: 'Soft Beige' },
  { value: '#e2e8f0', label: 'Off-White' },
  { value: '#cbd5e1', label: 'Cool Grey' },
  { value: '#faebd7', label: 'Warm Ivory' },
  { value: '#2c3e50', label: 'Deep Slate Blue' },
];

export default function EmptyHouseModal({ onCreate, onClose }) {
  const [houseName, setHouseName] = useState('My Dream House');
  const [rooms, setRooms] = useState([
    { id: '1', type: 'living_room', name: 'Living Room', width: 7.5, length: 9.5, height: 3.1, wallColor: '#b9b1a6', floorMaterial: 'wood', floorColor: '#b98f65' },
    { id: '2', type: 'bedroom', name: 'Bedroom', width: 7.2, length: 8.8, height: 3.1, wallColor: '#cbd5e1', floorMaterial: 'carpet', floorColor: '#c8beb1' },
  ]);

  const addRoom = () => {
    const defaultType = 'office';
    const opt = ROOM_TYPES.find(r => r.value === defaultType);
    const id = Math.random().toString(36).substr(2, 9);
    setRooms(prev => [
      ...prev,
      {
        id,
        type: defaultType,
        name: `Office ${prev.length + 1}`,
        width: opt.defaultW,
        length: opt.defaultL,
        height: 3.0,
        wallColor: '#e2e8f0',
        floorMaterial: 'wood',
        floorColor: '#b98f65'
      }
    ]);
  };

  const removeRoom = (id) => {
    if (rooms.length <= 1) {
      alert('Your house must contain at least one room!');
      return;
    }
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  const updateRoom = (id, fields) => {
    setRooms(prev => prev.map(r => {
      if (r.id === id) {
        let updated = { ...r, ...fields };
        // If room type changes, pull defaults
        if (fields.type) {
          const opt = ROOM_TYPES.find(o => o.value === fields.type);
          if (opt) {
            updated.name = opt.label;
            updated.width = opt.defaultW;
            updated.length = opt.defaultL;
          }
        }
        return updated;
      }
      return r;
    }));
  };

  const handleCreate = () => {
    // Generate layout stitched sequentially
    // Let's position rooms adjacent to each other
    let currentXOffset = 0;
    const stitchedRooms = rooms.map((room, index) => {
      let offset = [0, 0, 0];
      if (index === 0) {
        offset = [0, 0, 0];
      } else {
        const prevRoom = rooms[index - 1];
        // Shift along X so rooms align side-by-side
        currentXOffset += prevRoom.width / 2 + room.width / 2 + 0.1; // Add 0.1m gap/wall buffer
        offset = [currentXOffset, 0, 0];
      }

      // Generate ProxyRoom schema compatibilities
      const { width, length, height, wallColor, floorColor, floorMaterial } = room;
      const roomSchema = {
        dimensions: { width, length, height },
        floor: {
          position: [0, 0, 0],
          size: [width, 0.04, length],
          color: floorColor,
          material: floorMaterial
        },
        walls: [
          { id: 'back_wall', position: [0, height / 2, -length / 2], size: [width, height, 0.04], color: wallColor },
          { id: 'left_wall', position: [-width / 2, height / 2, 0], size: [0.04, height, length], color: wallColor },
          { id: 'right_wall', position: [width / 2, height / 2, 0], size: [0.04, height, length], color: wallColor },
        ],
        ceiling: {
          position: [0, height, 0],
          size: [width, 0.04, length],
          color: '#f8fafc'
        }
      };

      return {
        room_id: `${room.type}_${room.id}`,
        room_name: room.name,
        offset,
        room: roomSchema,
        furniture: [],
        removedObjects: [],
        pointCloudUrl: null,
        pcStats: null,
        roomAnalysis: {
          dimensions: { width, length, height, floor_area_m2: width * length },
          scene: { estimated_room_type: room.name }
        }
      };
    });

    // Generate basic connections sequentially
    const connections = [];
    for (let i = 0; i < stitchedRooms.length - 1; i++) {
      connections.push({
        from: stitchedRooms[i].room_id,
        to: stitchedRooms[i+1].room_id
      });
    }

    onCreate({
      name: houseName,
      rooms: stitchedRooms,
      connections,
      currentRoomId: 'whole_house'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute', inset: 0, background: 'rgba(8,11,18,0.85)',
        backdropFilter: 'blur(12px)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <motion.div
        className="glass-panel"
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        style={{ width: 660, height: 'auto', maxHeight: '92vh', overflowY: 'auto', position: 'relative', borderRadius: 20, border: '1px solid rgba(99,102,241,0.2)' }}
      >
        {/* Header */}
        <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home size={18} color="var(--accent)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem' }}>Empty House Manual Designer</h2>
              <p style={{ fontSize: '0.75rem' }}>Add rooms and customize wall/floor profiles</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="action-btn"><X size={20} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* House Name input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>House / Layout Name</span>
            <input
              type="text"
              value={houseName}
              onChange={e => setHouseName(e.target.value)}
              style={{ background: '#0e121c', color: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.88rem', outline: 'none' }}
            />
          </div>

          {/* Rooms configurations list */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Room List ({rooms.length})</span>
            <button
              onClick={addRoom}
              style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.25)', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
            >
              <Plus size={14} /> Add Room
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
            <AnimatePresence>
              {rooms.map((room) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Sliders size={16} color="var(--accent)" />
                    <select
                      value={room.type}
                      onChange={e => updateRoom(room.id, { type: e.target.value })}
                      style={{ background: '#0e121c', color: 'white', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: '0.82rem', outline: 'none', fontWeight: 600 }}
                    >
                      {ROOM_TYPES.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={room.name}
                      onChange={e => updateRoom(room.id, { name: e.target.value })}
                      style={{ background: '#0e121c', color: 'white', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: '0.82rem', outline: 'none', flex: 1 }}
                    />
                    <button onClick={() => removeRoom(room.id)} className="action-btn"><Trash2 size={15} /></button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {/* Width */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Width (m)</span>
                      <input
                        type="number"
                        min="2.5"
                        max="12"
                        step="0.1"
                        value={room.width}
                        onChange={e => updateRoom(room.id, { width: parseFloat(e.target.value) || 5.0 })}
                        style={{ background: '#0e121c', color: 'white', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: '0.78rem', outline: 'none' }}
                      />
                    </div>
                    {/* Length */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Length (m)</span>
                      <input
                        type="number"
                        min="2.5"
                        max="12"
                        step="0.1"
                        value={room.length}
                        onChange={e => updateRoom(room.id, { length: parseFloat(e.target.value) || 5.0 })}
                        style={{ background: '#0e121c', color: 'white', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: '0.78rem', outline: 'none' }}
                      />
                    </div>
                    {/* Floor Material */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Floor Material</span>
                      <select
                        value={room.floorMaterial}
                        onChange={e => {
                          const mat = FLOOR_MATERIALS.find(m => m.value === e.target.value);
                          updateRoom(room.id, { floorMaterial: e.target.value, floorColor: mat ? mat.color : '#b98f65' });
                        }}
                        style={{ background: '#0e121c', color: 'white', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: '0.78rem', outline: 'none' }}
                      >
                        {FLOOR_MATERIALS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Wall colors selection */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Wall Color:</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {WALL_COLORS.map(wc => (
                        <button
                          key={wc.value}
                          onClick={() => updateRoom(room.id, { wallColor: wc.value })}
                          style={{
                            width: 20, height: 20, borderRadius: '50%', background: wc.value, border: `2px solid ${room.wallColor === wc.value ? 'var(--accent)' : 'transparent'}`, cursor: 'pointer', padding: 0
                          }}
                          title={wc.label}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Submit */}
          <button
            type="button"
            className="btn-teal"
            style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '12px' }}
            onClick={handleCreate}
          >
            <Check size={18} /> Initialize Empty House Layout
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
