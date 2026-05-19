import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Film, Play, FileVideo } from 'lucide-react';

export default function VideoUpload({ onUpload, onClose }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (validTypes.includes(selectedFile.type) || selectedFile.name.match(/\.(mp4|mov|avi|webm)$/i)) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
    } else {
      alert("Unsupported file format. Please upload MP4, MOV, AVI, or WEBM.");
    }
  };

  const handleProcess = () => {
    if (file) {
      onUpload(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="glass-panel"
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        margin: 'auto', width: '90%', maxWidth: 500, height: 'fit-content',
        zIndex: 100, padding: 0, overflow: 'hidden'
      }}
    >
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Upload size={24} color="var(--accent)" />
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Upload Room Video</h2>
        </div>
        <button onClick={onClose} className="action-btn"><X size={20}/></button>
      </div>

      <div style={{ padding: '20px' }}>
        {!file ? (
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? 'var(--accent)' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: 12, padding: '40px 20px', textAlign: 'center',
              background: dragActive ? 'rgba(56, 189, 248, 0.05)' : 'rgba(0,0,0,0.2)',
              cursor: 'pointer', transition: 'all 0.3s ease'
            }}
            onClick={() => fileInputRef.current.click()}
          >
            <Film size={48} color={dragActive ? 'var(--accent)' : 'var(--text-muted)'} style={{ margin: '0 auto 16px' }} />
            <h3 style={{ marginBottom: 8, color: 'var(--text-main)' }}>Drag and drop your video here</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>Supported formats: MP4, MOV, AVI, WEBM</p>
            <button className="btn-primary" style={{ margin: '0 auto' }}>Select File</button>
            <input 
              ref={fileInputRef} type="file" style={{ display: 'none' }} 
              accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
              onChange={handleChange}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
              <video src={preview} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>
              <FileVideo size={32} color="var(--accent)" />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
              </div>
              <button 
                onClick={() => { setFile(null); setPreview(null); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <button 
              className="btn-primary" 
              style={{ width: '100%', padding: '14px', fontSize: '1.1rem', justifyContent: 'center' }}
              onClick={handleProcess}
            >
              <Play size={20} style={{ marginRight: 8 }} /> Process Video
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
