import React from 'react';

export default function ControlsHelp({ mode }) {
  if (mode !== 'walk') return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      right: 24,
      background: 'rgba(15, 17, 21, 0.8)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.1)',
      padding: '16px',
      borderRadius: '12px',
      color: '#f0f2f5',
      fontSize: '0.85rem',
      pointerEvents: 'none',
      zIndex: 10
    }}>
      <h3 style={{ marginBottom: 12, fontSize: '0.9rem', color: '#6366f1' }}>Walkthrough Controls</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <kbd style={kbdStyle}>W</kbd><kbd style={kbdStyle}>A</kbd><kbd style={kbdStyle}>S</kbd><kbd style={kbdStyle}>D</kbd>
        </div>
        <span>Move around</span>
        
        <kbd style={kbdStyle}>Mouse</kbd>
        <span>Look around</span>
        
        <kbd style={kbdStyle}>Q</kbd> / <kbd style={kbdStyle}>E</kbd>
        <span>Move Up / Down</span>
        
        <kbd style={kbdStyle}>ESC</kbd>
        <span>Exit Walk Mode</span>
      </div>
    </div>
  );
}

const kbdStyle = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 4,
  padding: '2px 6px',
  fontFamily: 'monospace',
  fontSize: '0.8rem',
  boxShadow: '0 2px 0 rgba(0,0,0,0.2)'
};
