import { motion } from 'framer-motion';
import { Film, Home, Sofa } from 'lucide-react';

const STEPS = [
  { icon: '🎬', emoji: true, label: 'Upload Videos' },
  { icon: '🔬', emoji: true, label: 'AI Synthesis' },
  { icon: '🏠', emoji: true, label: 'Digital Twin' },
  { icon: '🛋️', emoji: true, label: 'Edit & Theme' },
];

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: Math.random() * 4 + 2,
  delay: Math.random() * 5,
  duration: Math.random() * 3 + 3,
}));

export default function LandingHero({ onUploadSingle, onUploadFullHouse, onCreateEmptyHouse }) {
  return (
    <div className="hero-overlay">
      {/* Ambient particles */}
      {PARTICLES.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            bottom: 0,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      <motion.div
        className="hero-card"
        style={{ maxWidth: '960px', width: '92%' }}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <span className="cv-badge">
            <span>✨</span> MiniScene AI Flagship — Multi-Room Digital Twin Edition
          </span>
        </div>

        {/* Title */}
        <h1 className="hero-title">MiniScene AI</h1>
        <p className="hero-sub" style={{ marginBottom: 24 }}>
          Generate a beautiful 3D digital twin from room videos or design a custom layout from scratch.
        </p>

        {/* Flow diagram */}
        <div className="hero-flow" style={{ marginBottom: 28 }}>
          {STEPS.map((step, i) => (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.div
                className="hero-flow-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <div className="hero-flow-icon">{step.icon}</div>
                <span className="hero-flow-label">{step.label}</span>
              </motion.div>
              {i < STEPS.length - 1 && (
                <span className="hero-flow-arrow" style={{ marginBottom: 18 }}>→</span>
              )}
            </div>
          ))}
        </div>

        {/* Choices Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          {/* Card 1: Single Room */}
          <motion.div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              transition: 'border-color 0.2s',
            }}
            whileHover={{ scale: 1.03, borderColor: 'var(--teal)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Film size={22} color="var(--teal)" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: '#f8fafc' }}>Single Room</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Reconstruct a single room from video using computer vision depth mapping.</p>
            </div>
            <button
              className="btn-teal"
              style={{ fontSize: '0.82rem', padding: '10px 16px', width: '100%', justifyContent: 'center', borderRadius: '20px' }}
              onClick={onUploadSingle}
            >
              Reconstruct Single Room
            </button>
          </motion.div>

          {/* Card 2: Full House */}
          <motion.div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              transition: 'border-color 0.2s',
            }}
            whileHover={{ scale: 1.03, borderColor: '#a78bfa' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(167, 139, 250, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Home size={22} color="#a78bfa" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: '#f8fafc' }}>Full House</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Upload multiple room videos and stitch them into a complete editable house.</p>
            </div>
            <button
              className="btn-primary"
              style={{ fontSize: '0.82rem', padding: '10px 16px', width: '100%', justifyContent: 'center', borderRadius: '20px', background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' }}
              onClick={onUploadFullHouse}
            >
              Reconstruct Full House
            </button>
          </motion.div>

          {/* Card 3: Empty House */}
          <motion.div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              transition: 'border-color 0.2s',
            }}
            whileHover={{ scale: 1.03, borderColor: 'var(--accent)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sofa size={22} color="var(--accent)" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: '#f8fafc' }}>Empty House</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Design a multi-room house layout manually and place furniture.</p>
            </div>
            <button
              className="btn-primary"
              style={{ fontSize: '0.82rem', padding: '10px 16px', width: '100%', justifyContent: 'center', borderRadius: '20px' }}
              onClick={onCreateEmptyHouse}
            >
              Start From Empty House
            </button>
          </motion.div>
        </div>

        {/* CV Pipeline note */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Stitching Engine:</strong>{' '}
            Combines monocular depth room structures via adjacent wall-alignment heuristics into a single synchronized digital twin.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
