import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';

const STAGES = [
  { id: 'upload', label: 'Uploading video...', duration: 2000 },
  { id: 'extract', label: 'Extracting frames...', duration: 3000 },
  { id: 'depth', label: 'Estimating depth...', duration: 4000 },
  { id: 'recon', label: 'Reconstructing point cloud...', duration: 5000 },
  { id: 'detect', label: 'Detecting objects...', duration: 3000 },
  { id: 'semantics', label: 'Understanding scene...', duration: 3000 },
  { id: 'analysis', label: 'Generating room analysis...', duration: 2000 },
  { id: 'build', label: 'Building 3D viewer...', duration: 1000 }
];

export default function ProcessingStatus({ isProcessing, onComplete }) {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isProcessing) {
      setCurrentStageIdx(0);
      setProgress(0);
      return;
    }

    let isMounted = true;
    let timeoutId;

    const runStages = async () => {
      let totalTime = STAGES.reduce((acc, stage) => acc + stage.duration, 0);
      let elapsed = 0;

      // Fake progress incrementer
      const progressInterval = setInterval(() => {
        elapsed += 100;
        const p = Math.min((elapsed / totalTime) * 100, 99); // max 99 until truly complete
        if (isMounted) setProgress(p);
      }, 100);

      // Stage incrementer
      for (let i = 0; i < STAGES.length; i++) {
        if (!isMounted) break;
        setCurrentStageIdx(i);
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, STAGES[i].duration);
        });
      }

      clearInterval(progressInterval);
      if (isMounted) {
        setProgress(100);
        setTimeout(() => {
          if (isMounted) onComplete();
        }, 500);
      }
    };

    runStages();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [isProcessing]);

  if (!isProcessing) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 17, 21, 0.9)', backdropFilter: 'blur(10px)',
        zIndex: 200, display: 'flex', flexDirection: 'column', 
        alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 30 }}>
        
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} color="var(--accent)" className="spinner" style={{ margin: '0 auto 20px', animation: 'spin 2s linear infinite' }} />
          <h2 style={{ color: 'white', marginBottom: 8, fontSize: '1.5rem' }}>Processing Video</h2>
          <p style={{ color: 'var(--text-muted)' }}>This may take a few minutes...</p>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 24, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STAGES.map((stage, idx) => {
              const isActive = idx === currentStageIdx;
              const isDone = idx < currentStageIdx || progress === 100;
              
              let color = 'var(--text-muted)';
              if (isActive) color = 'white';
              if (isDone) color = '#22c55e'; // Green
              
              return (
                <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: isActive || isDone ? 1 : 0.5 }}>
                  {isDone ? (
                    <CheckCircle2 size={18} color="#22c55e" />
                  ) : isActive ? (
                    <Loader2 size={18} color="var(--accent)" className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }} />
                  )}
                  <span style={{ color, fontWeight: isActive ? 600 : 400, fontSize: '0.95rem' }}>{stage.label}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Overall Progress</span>
              <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>{Math.floor(progress)}%</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div 
                style={{ height: '100%', background: 'var(--accent)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
