import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Film, Play, FileVideo, Plus, ChevronRight, HelpCircle, Link as LinkIcon } from 'lucide-react';

const ROOM_OPTIONS = [
  { value: 'living_room', label: 'Living Room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'dining_room', label: 'Dining Room' },
  { value: 'office', label: 'Office' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'balcony', label: 'Balcony' },
  { value: 'hallway', label: 'Hallway' },
  { value: 'custom', label: 'Custom' },
];

export default function MultiVideoUpload({ onUpload, onClose }) {
  const [step, setStep] = useState(1); // 1: Upload & Name, 2: Connections
  const [dragActive, setDragActive] = useState(false);
  const [uploadedRooms, setUploadedRooms] = useState([]); // Array of { id, file, type, name, customName }
  const [connections, setConnections] = useState([]); // Array of { from, to }
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files) => {
    const validFiles = files.filter(f => f.type.startsWith('video/') || /\.(mp4|mov|avi|webm)$/i.test(f.name));
    
    if (validFiles.length === 0) {
      alert('Please upload valid video files (MP4, MOV, AVI, or WEBM).');
      return;
    }

    const newRooms = validFiles.map(file => {
      // Auto-detect room type from filename
      const nameLower = file.name.toLowerCase();
      let type = 'custom';
      let name = 'Custom Room';
      
      if (nameLower.includes('living') || nameLower.includes('room1') || nameLower.includes('video1')) {
        type = 'living_room';
        name = 'Living Room';
      } else if (nameLower.includes('bedroom') || nameLower.includes('room2') || nameLower.includes('video2')) {
        type = 'bedroom';
        name = 'Bedroom';
      } else if (nameLower.includes('kitchen') || nameLower.includes('room3') || nameLower.includes('video3')) {
        type = 'kitchen';
        name = 'Kitchen';
      } else if (nameLower.includes('dining') || nameLower.includes('room4') || nameLower.includes('video4')) {
        type = 'dining_room';
        name = 'Dining Room';
      } else if (nameLower.includes('office')) {
        type = 'office';
        name = 'Office';
      } else if (nameLower.includes('bathroom')) {
        type = 'bathroom';
        name = 'Bathroom';
      } else if (nameLower.includes('balcony')) {
        type = 'balcony';
        name = 'Balcony';
      } else if (nameLower.includes('hallway')) {
        type = 'hallway';
        name = 'Hallway';
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        type,
        name,
        customName: type === 'custom' ? file.name.split('.')[0] : ''
      };
    });

    setUploadedRooms(prev => [...prev, ...newRooms]);
  };

  const removeRoom = (id) => {
    setUploadedRooms(prev => prev.filter(r => r.id !== id));
  };

  const updateRoomType = (id, type) => {
    setUploadedRooms(prev => prev.map(r => {
      if (r.id === id) {
        const option = ROOM_OPTIONS.find(o => o.value === type);
        return {
          ...r,
          type,
          name: option ? option.label : 'Custom Room',
          customName: type === 'custom' ? (r.customName || r.file.name.split('.')[0]) : ''
        };
      }
      return r;
    }));
  };

  const updateCustomName = (id, customName) => {
    setUploadedRooms(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, customName };
      }
      return r;
    }));
  };

  const getFinalRoomLabel = (room) => {
    if (room.type === 'custom') return room.customName || 'Custom Room';
    return room.name;
  };

  const getFinalRoomId = (room) => {
    if (room.type === 'custom') return `room_${room.id}`;
    return room.type;
  };

  // Build default connections list
  const setupDefaultConnections = () => {
    const defaultConns = [];
    const roomsList = uploadedRooms.map(r => ({ id: getFinalRoomId(r), type: r.type }));
    
    // Connect living room to kitchen and bedroom if they exist
    const hasLiving = roomsList.some(r => r.type === 'living_room');
    const hasKitchen = roomsList.some(r => r.type === 'kitchen');
    const hasBedroom = roomsList.some(r => r.type === 'bedroom');
    const hasDining = roomsList.some(r => r.type === 'dining_room');

    if (hasLiving && hasKitchen) defaultConns.push({ from: 'living_room', to: 'kitchen' });
    if (hasLiving && hasBedroom) defaultConns.push({ from: 'living_room', to: 'bedroom' });
    if (hasKitchen && hasDining) defaultConns.push({ from: 'kitchen', to: 'dining_room' });

    // Connect rest sequentially if no default match found
    if (defaultConns.length === 0 && roomsList.length > 1) {
      for (let i = 0; i < roomsList.length - 1; i++) {
        defaultConns.push({ from: roomsList[i].id, to: roomsList[i+1].id });
      }
    }

    setConnections(defaultConns);
    setStep(2);
  };

  const toggleConnection = (fromId, toId) => {
    const exists = connections.some(c => 
      (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
    );

    if (exists) {
      setConnections(prev => prev.filter(c => 
        !((c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId))
      ));
    } else {
      setConnections(prev => [...prev, { from: fromId, to: toId }]);
    }
  };

  const isConnected = (fromId, toId) => {
    return connections.some(c => 
      (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
    );
  };

  const handleStartReconstruction = () => {
    const finalRoomsData = uploadedRooms.map(r => ({
      room_id: getFinalRoomId(r),
      room_name: getFinalRoomLabel(r),
      video_file: r.file
    }));

    onUpload(finalRoomsData, connections);
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
        style={{ width: 620, height: 'auto', maxHeight: '92vh', overflowY: 'auto', position: 'relative', borderRadius: 20, border: '1px solid rgba(167,139,250,0.3)' }}
      >
        {/* Header */}
        <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Film size={18} color="#a78bfa" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem' }}>Full House Reconstruction</h2>
              <p style={{ fontSize: '0.75rem' }}>Upload multiple room videos to generate a complete layout</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="action-btn"><X size={20} /></button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, background: step >= 1 ? '#a78bfa' : 'rgba(255,255,255,0.08)', color: step >= 1 ? 'white' : 'var(--text-muted)' }}>1</div>
            <span style={{ fontSize: '0.78rem', color: step >= 1 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: step === 1 ? 600 : 400 }}>Upload & Name Rooms</span>
          </div>
          <ChevronRight size={13} color="var(--text-muted)" style={{ margin: '0 4px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, background: step >= 2 ? '#a78bfa' : 'rgba(255,255,255,0.08)', color: step >= 2 ? 'white' : 'var(--text-muted)' }}>2</div>
            <span style={{ fontSize: '0.78rem', color: step >= 2 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: step === 2 ? 600 : 400 }}>Connect Rooms</span>
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {step === 1 ? (
            <>
              {/* Drop zone */}
              <div
                onDragEnter={handleDrag} onDragLeave={handleDrag}
                onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
                style={{ border: `2px dashed ${dragActive ? '#a78bfa' : 'rgba(255,255,255,0.12)'}`, borderRadius: 14, padding: '28px 20px', textAlign: 'center', background: dragActive ? 'rgba(167,139,250,0.04)' : 'rgba(0,0,0,0.18)', cursor: 'pointer', transition: 'all 0.25s' }}
              >
                <Film size={36} color={dragActive ? '#a78bfa' : 'var(--text-muted)'} style={{ margin: '0 auto 10px' }} />
                <h3 style={{ marginBottom: 4, fontSize: '0.95rem' }}>Drag & drop multiple room videos</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: 12 }}>Upload files like living.mp4, bedroom.mp4, kitchen.mp4...</p>
                <button type="button" className="btn-primary" style={{ margin: '0 auto', fontSize: '0.8rem', padding: '8px 18px', background: '#8b5cf6' }} onClick={e => { e.stopPropagation(); fileInputRef.current.click(); }}>
                  <Upload size={14} /> Add Videos
                </button>
                <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} accept="video/mp4,video/quicktime,video/x-msvideo,video/webm" onChange={handleChange} />
              </div>

              {/* Upload List */}
              {uploadedRooms.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Uploaded Room Videos ({uploadedRooms.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                    <AnimatePresence>
                      {uploadedRooms.map((room) => (
                        <motion.div
                          key={room.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          style={{
                            display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: 12, borderRadius: 10
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileVideo size={20} color="#a78bfa" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.file.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(room.file.size / (1024 * 1024)).toFixed(1)} MB</div>
                            </div>
                            <button type="button" onClick={() => removeRoom(room.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={15} /></button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 8 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Represents:</span>
                            <select
                              value={room.type}
                              onChange={(e) => updateRoomType(room.id, e.target.value)}
                              style={{ background: '#0e121c', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.78rem', padding: '4px 8px', outline: 'none', flex: 1 }}
                            >
                              {ROOM_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>

                            {room.type === 'custom' && (
                              <input
                                type="text"
                                placeholder="Enter Custom Room Name"
                                value={room.customName}
                                onChange={(e) => updateCustomName(room.id, e.target.value)}
                                style={{ background: '#0e121c', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.78rem', padding: '4px 8px', outline: 'none', flex: 1 }}
                              />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {uploadedRooms.length > 0 && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem', padding: '11px', background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' }}
                  onClick={setupDefaultConnections}
                >
                  Configure Connections <ChevronRight size={16} />
                </button>
              )}
            </>
          ) : (
            <>
              {/* Connection Mapper */}
              <div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                  Connect rooms that have connecting doorways, passages, or openings. This helps build the layout graph.
                </p>

                <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <LinkIcon size={14} /> Establish Pathways
                  </div>

                  {uploadedRooms.length < 2 ? (
                    <div style={{ padding: '10px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Need at least 2 rooms to form connections.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                      {uploadedRooms.map((roomA, idxA) => (
                        <div key={roomA.id}>
                          {uploadedRooms.slice(idxA + 1).map((roomB) => {
                            const labelA = getFinalRoomLabel(roomA);
                            const labelB = getFinalRoomLabel(roomB);
                            const idA = getFinalRoomId(roomA);
                            const idB = getFinalRoomId(roomB);
                            const connected = isConnected(idA, idB);

                            return (
                              <div
                                key={roomB.id}
                                onClick={() => toggleConnection(idA, idB)}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: connected ? 'rgba(167,139,250,0.06)' : 'transparent', border: `1px solid ${connected ? 'rgba(167,139,250,0.25)' : 'transparent'}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', marginBottom: 4
                                }}
                              >
                                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: connected ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                  {labelA} ↔ {labelB}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={connected}
                                  onChange={() => {}} // handled by div onClick
                                  style={{ accentColor: '#a78bfa', cursor: 'pointer' }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', flex: 1, justifyContent: 'center' }}
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', flex: 2, justifyContent: 'center' }}
                  onClick={handleStartReconstruction}
                >
                  <Play size={16} /> Reconstruct House
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
