import React from 'react';
import { motion } from 'framer-motion';
import { 
  Film, Camera, Home, Sofa, Sliders, Download, 
  Layout, Eye, Box, Map, Play, Sparkles, Building
} from 'lucide-react';

const PIPELINE_STEPS = [
  { icon: Film, label: 'Upload Videos', color: '#06b6d4' },
  { icon: Eye, label: 'AI Vision', color: '#3b82f6' },
  { icon: Box, label: '3D Reconstruction', color: '#6366f1' },
  { icon: Sliders, label: 'Interior Editing', color: '#a855f7' },
  { icon: Download, label: 'Export Design', color: '#10b981' }
];

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 2,
  delay: Math.random() * 8,
  duration: Math.random() * 10 + 8,
}));

export default function LandingHero({ onUploadSingle, onUploadFullHouse, onCreateEmptyHouse }) {
  return (
    <div className="hero-overlay">
      {/* Background blueprint styles and glows */}
      <div className="hero-bg-glow" />
      <div className="hero-grid-pattern" />
      
      {/* Drifting blueprint wireframe graphics */}
      <div className="blueprint-shapes">
        <svg className="blueprint-shape shape-1" viewBox="0 0 100 100" fill="none">
          <rect x="10" y="10" width="80" height="80" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.25" strokeDasharray="2 2" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.25" strokeDasharray="2 2" />
        </svg>
        <svg className="blueprint-shape shape-2" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
          <polygon points="60,10 110,60 60,110 10,60" stroke="currentColor" strokeWidth="0.25" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* Floating particles */}
      {PARTICLES.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `-${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      {/* Main Hero Card Container */}
      <motion.div
        className="hero-card"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Shimmering Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <span className="cv-badge">
            <span>✨</span> AI Digital Twin Interior Platform
          </span>
        </div>

        {/* Title & Subtitle */}
        <h1 className="hero-title">MiniScene AI</h1>
        <p className="hero-sub">
          Turn room videos into editable 3D interiors and full-house digital twins.
        </p>

        {/* 5-Step Pipeline Visualization */}
        <div className="hero-pipeline">
          {PIPELINE_STEPS.map((step, i) => {
            const StepIcon = step.icon;
            return (
              <div key={step.label} className="pipeline-item-wrapper">
                <motion.div
                  className="pipeline-step-card"
                  style={{ '--icon-color': step.color }}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                >
                  <div className="pipeline-icon-wrapper">
                    <StepIcon size={20} />
                  </div>
                  <span className="pipeline-label">{step.label}</span>
                </motion.div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="pipeline-connector">
                    <div className="connector-line" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Choices Grid */}
        <div className="choices-grid">
          {/* Card 1: Single Room */}
          <motion.div
            className="choice-card"
            style={{
              '--hover-gradient': 'linear-gradient(135deg, #00f2fe, #4facfe)',
              '--icon-bg': 'rgba(6, 182, 212, 0.08)',
              '--icon-border': 'rgba(6, 182, 212, 0.15)',
              '--icon-color': '#06b6d4',
              '--icon-shadow': 'rgba(6, 182, 212, 0.25)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="choice-card-info">
              <div className="choice-icon-container">
                <Camera size={26} />
              </div>
              <h3 className="choice-card-title">Single Room</h3>
              <p className="choice-card-sub">Reconstruct one room from a video.</p>
              
              <div className="choice-chips-container">
                <span className="choice-chip">Depth AI</span>
                <span className="choice-chip">Furniture Detection</span>
                <span className="choice-chip">Editable Scene</span>
              </div>
            </div>
            
            <button className="card-btn card-btn-cyan" onClick={onUploadSingle}>
              Reconstruct Single Room
            </button>
          </motion.div>

          {/* Card 2: Full House */}
          <motion.div
            className="choice-card"
            style={{
              '--hover-gradient': 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
              '--icon-bg': 'rgba(167, 139, 250, 0.08)',
              '--icon-border': 'rgba(167, 139, 250, 0.15)',
              '--icon-color': '#a78bfa',
              '--icon-shadow': 'rgba(167, 139, 250, 0.25)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
          >
            <div className="choice-card-info">
              <div className="choice-icon-container">
                <Building size={26} />
              </div>
              <h3 className="choice-card-title">Full House</h3>
              <p className="choice-card-sub">Upload multiple room videos and generate a complete apartment.</p>
              
              <div className="choice-chips-container">
                <span className="choice-chip">Multi-room</span>
                <span className="choice-chip">Minimap</span>
                <span className="choice-chip">Floor Plan</span>
              </div>
            </div>
            
            <button className="card-btn card-btn-purple" onClick={onUploadFullHouse}>
              Reconstruct Full House
            </button>
          </motion.div>

          {/* Card 3: Empty House */}
          <motion.div
            className="choice-card"
            style={{
              '--hover-gradient': 'linear-gradient(135deg, #6366f1, #4f46e5)',
              '--icon-bg': 'rgba(99, 102, 241, 0.08)',
              '--icon-border': 'rgba(99, 102, 241, 0.15)',
              '--icon-color': '#818cf8',
              '--icon-shadow': 'rgba(99, 102, 241, 0.25)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46 }}
          >
            <div className="choice-card-info">
              <div className="choice-icon-container">
                <Sofa size={26} />
              </div>
              <h3 className="choice-card-title">Empty House</h3>
              <p className="choice-card-sub">Start from scratch and design manually.</p>
              
              <div className="choice-chips-container">
                <span className="choice-chip">Manual Layout</span>
                <span className="choice-chip">Furniture Library</span>
                <span className="choice-chip">Theme Editor</span>
              </div>
            </div>
            
            <button className="card-btn card-btn-indigo" onClick={onCreateEmptyHouse}>
              Start From Empty House
            </button>
          </motion.div>
        </div>

        {/* Feature Highlights Row */}
        <div className="hero-highlights">
          <div className="highlight-chip">
            <Film size={14} /> <span>Video to 3D</span>
          </div>
          <div className="highlight-chip">
            <Home size={14} /> <span>Full House Planner</span>
          </div>
          <div className="highlight-chip">
            <Sofa size={14} /> <span>Furniture Editing</span>
          </div>
          <div className="highlight-chip">
            <Sparkles size={14} /> <span>Color & Material Customization</span>
          </div>
          <div className="highlight-chip">
            <Play size={14} /> <span>Walkthrough Mode</span>
          </div>
          <div className="highlight-chip">
            <Map size={14} /> <span>Floor Plan Export</span>
          </div>
        </div>

        {/* Footer section (user-friendly replaces CV notes) */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, marginTop: 8 }}>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, fontWeight: 500, letterSpacing: '0.2px' }}>
            Built for fast interior planning, furniture visualization, and interactive design.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
