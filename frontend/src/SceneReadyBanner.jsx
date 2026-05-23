import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, Box } from 'lucide-react';

export default function SceneReadyBanner({ pointCount, sessionId, detectedObjectCount }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 7000);
    return () => clearTimeout(timer);
  }, []);

  const hasObjects = typeof detectedObjectCount === 'number' && detectedObjectCount > 0;
  const noObjects  = typeof detectedObjectCount === 'number' && detectedObjectCount === 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="scene-ready-banner"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ gap: 10 }}
        >
          <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0 }} />

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ecfdf5' }}>
              3D Room Reconstructed!
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6ee7b7', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {pointCount && (
                <span>{pointCount.toLocaleString()} pts</span>
              )}
              <span>·</span>
              <span>Floor &amp; walls estimated</span>
              {hasObjects && (
                <>
                  <span>·</span>
                  <span style={{ color: '#06b6d4', fontWeight: 600 }}>
                    {detectedObjectCount} object{detectedObjectCount !== 1 ? 's' : ''} detected
                  </span>
                </>
              )}
              {noObjects && (
                <>
                  <span>·</span>
                  <span style={{ color: '#fbbf24' }}>No objects detected</span>
                </>
              )}
            </div>
            {!hasObjects && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Click the floor to place furniture from the library
              </div>
            )}
          </div>

          <button
            onClick={() => setVisible(false)}
            style={{ background: 'transparent', border: 'none', color: '#6ee7b7', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
