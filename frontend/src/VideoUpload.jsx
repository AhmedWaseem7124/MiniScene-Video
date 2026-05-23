import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Film, Play, FileVideo, Gauge, Sparkles, Zap, ChevronRight } from 'lucide-react';

const STEPS = [
  { num: 1, label: 'Upload Video' },
  { num: 2, label: 'Choose Mode' },
  { num: 3, label: 'Reconstruct' },
];

const MODE_INFO = {
  minimal: {
    title: 'Minimal Demo Mode',
    icon: <Zap size={17} />,
    color: '#10b981',
    time: '~5–15 sec',
    desc: 'Recommended for instant testing. Minimal point cloud room shape reconstructed from 5 frames.',
    steps: ['Extract 5 frames', 'Heuristic depth', 'Build point cloud', 'Skip objects & matching'],
    badge: 'Fastest Default',
  },
  ultra_fast: {
    title: 'Point Cloud Only',
    icon: <Zap size={17} />,
    color: '#94a3b8',
    time: '~10–25 sec',
    desc: 'Fastest point cloud only. Reconstructs 3D room geometry from 8 frames without object detection.',
    steps: ['Extract 8 frames', 'Heuristic depth', 'Build point cloud', 'Room shape only'],
    badge: 'Ultra Fast',
  },
  fast: {
    title: 'Fast + Objects',
    icon: <Gauge size={17} />,
    color: '#06b6d4',
    time: '~15–40 sec',
    desc: 'Lightweight detection. Room reconstruction from 8 frames + YOLO object detection on 3 keyframes.',
    steps: ['Extract 8 frames', 'Heuristic depth', 'Build point cloud', 'Detect objects (3 keyframes)'],
    badge: 'Recommended',
  },
  quality: {
    title: 'Full Quality',
    icon: <Sparkles size={17} />,
    color: '#a78bfa',
    time: '~60–90 sec',
    desc: 'Full pipeline. Reconstructs room from 30 frames, dense depth, and YOLO object detection on 8 keyframes.',
    steps: ['Extract 30 frames', 'Dense depth', 'Full point cloud', 'Detect objects (8 keyframes)'],
    badge: 'Best Results',
  },
};

export default function VideoUpload({ onUpload, onClose }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState('minimal');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };
  const handleChange = (e) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };
  const handleFile = (f) => {
    if (f.type.startsWith('video/') || /\.(mp4|mov|avi|webm)$/i.test(f.name)) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    } else {
      alert('Please upload MP4, MOV, AVI, or WEBM.');
    }
  };

  const step = file ? 2 : 1;

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
        style={{ width: 540, height: 'auto', maxHeight: '92vh', overflowY: 'auto', position: 'relative', borderRadius: 20, border: '1px solid rgba(99,102,241,0.2)' }}
      >
        {/* Header */}
        <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Film size={18} color="var(--teal)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem' }}>Upload Room Video</h2>
              <p style={{ fontSize: '0.75rem' }}>AI will reconstruct your 3D room</p>
            </div>
          </div>
          <button onClick={onClose} className="action-btn"><X size={20} /></button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {STEPS.map((s, i) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, background: step >= s.num ? 'var(--teal)' : 'rgba(255,255,255,0.08)', color: step >= s.num ? 'white' : 'var(--text-muted)', transition: 'all 0.3s' }}>{s.num}</div>
              <span style={{ fontSize: '0.78rem', color: step >= s.num ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: step === s.num ? 600 : 400 }}>{s.label}</span>
              {i < STEPS.length - 1 && <ChevronRight size={13} color="var(--text-muted)" style={{ margin: '0 2px' }} />}
            </div>
          ))}
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Drop zone or preview */}
          {!file ? (
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag}
              onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              style={{ border: `2px dashed ${dragActive ? 'var(--teal)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 14, padding: '36px 20px', textAlign: 'center', background: dragActive ? 'rgba(6,182,212,0.04)' : 'rgba(0,0,0,0.18)', cursor: 'pointer', transition: 'all 0.25s' }}
            >
              <Film size={44} color={dragActive ? 'var(--teal)' : 'var(--text-muted)'} style={{ margin: '0 auto 14px' }} />
              <h3 style={{ marginBottom: 6, fontSize: '1rem' }}>Drag & drop your room video</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 14 }}>MP4, MOV, AVI, WEBM — any indoor space</p>
              <button className="btn-teal" style={{ margin: '0 auto', fontSize: '0.9rem', padding: '9px 22px' }} onClick={e => { e.stopPropagation(); fileInputRef.current.click(); }}>
                <Upload size={15} /> Select File
              </button>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept="video/mp4,video/quicktime,video/x-msvideo,video/webm" onChange={handleChange} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ borderRadius: 10, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
                <video src={preview} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: 8 }}>
                <FileVideo size={26} color="var(--teal)" />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{(file.size / (1024 * 1024)).toFixed(1)} MB</div>
                </div>
                <button onClick={() => { setFile(null); setPreview(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={17} /></button>
              </div>
            </div>
          )}

          {/* Mode picker — 3 modes */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Processing Mode</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {Object.entries(MODE_INFO).map(([key, mi]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  style={{ padding: '11px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', background: mode === key ? `${mi.color}14` : 'rgba(0,0,0,0.18)', border: `1px solid ${mode === key ? mi.color + '60' : 'var(--border)'}`, color: 'white', transition: 'all 0.2s', width: '100%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: mode === key ? mi.color : 'var(--text-muted)' }}>{mi.icon}</span>
                    <strong style={{ fontSize: '0.88rem' }}>{mi.title}</strong>
                    <span style={{ marginLeft: 4, fontSize: '0.68rem', padding: '2px 7px', borderRadius: 10, background: mode === key ? `${mi.color}22` : 'rgba(255,255,255,0.05)', color: mode === key ? mi.color : 'var(--text-muted)', border: `1px solid ${mode === key ? mi.color + '40' : 'transparent'}` }}>{mi.badge}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{mi.time}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 4, paddingLeft: 25 }}>{mi.desc}</p>
                  {mode === key && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8, paddingLeft: 25 }}>
                      {mi.steps.map((s, i) => (
                        <span key={i} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 8, background: `${mi.color}12`, color: mi.color, border: `1px solid ${mi.color}30` }}>
                          {i + 1}. {s}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Process button */}
          {file && (
            <motion.button
              className="btn-teal"
              style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '13px' }}
              onClick={() => onUpload(file, mode)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            >
              <Play size={19} /> Reconstruct 3D Room
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
