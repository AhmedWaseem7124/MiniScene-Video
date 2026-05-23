import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'sofas', label: 'Sofas', icon: '🛋️',
    items: [
      { id: 's1', name: 'Sofa 3-Seat', type: 'Sofa', dim: '2.1m × 0.9m', emoji: '🛋️' },
      { id: 's2', name: 'Armchair', type: 'Armchair', dim: '0.85m × 0.8m', emoji: '🪑' },
    ]
  },
  {
    id: 'beds', label: 'Beds', icon: '🛏️',
    items: [
      { id: 'b1', name: 'Single Bed', type: 'Bed', dim: '1.4m × 2.1m', emoji: '🛏️' },
      { id: 'b2', name: 'King Bed', type: 'KingBed', dim: '2.0m × 2.2m', emoji: '🛏️' },
    ]
  },
  {
    id: 'chairs', label: 'Chairs', icon: '🪑',
    items: [
      { id: 'c1', name: 'Office Chair', type: 'Chair', dim: '0.55m × 0.55m', emoji: '🪑' },
      { id: 'c2', name: 'Dining Chair', type: 'Chair', dim: '0.52m × 0.52m', emoji: '🪑' },
    ]
  },
  {
    id: 'tables', label: 'Tables', icon: '🪵',
    items: [
      { id: 't1', name: 'Coffee Table', type: 'Table', dim: '1.6m × 0.85m', emoji: '🪵' },
      { id: 't2', name: 'Dining Table', type: 'Table', dim: '1.6m × 0.85m', emoji: '🪵' },
      { id: 't3', name: 'Desk', type: 'Desk', dim: '1.4m × 0.7m', emoji: '🖥️' },
      { id: 't4', name: 'Side Table', type: 'SideTable', dim: '0.6m ø', emoji: '🪵' },
    ]
  },
  {
    id: 'cupboards', label: 'Storage', icon: '🗄️',
    items: [
      { id: 'cb1', name: 'Wardrobe', type: 'Cupboard', dim: '1.05m × 0.52m', emoji: '🚪' },
      { id: 'cb2', name: 'Bookshelf', type: 'Bookshelf', dim: '0.9m × 0.3m', emoji: '📚' },
      { id: 'cb3', name: 'TV Stand', type: 'TVStand', dim: '1.6m × 0.45m', emoji: '📺' },
    ]
  },
  {
    id: 'plants', label: 'Plants', icon: '🌿',
    items: [
      { id: 'p1', name: 'Tall Plant', type: 'Plant', dim: '0.5m ø × 1.1m', emoji: '🌿' },
      { id: 'p2', name: 'Corner Palm', type: 'Plant', dim: '0.5m ø × 1.1m', emoji: '🌴' },
    ]
  },
  {
    id: 'decor', label: 'Decor', icon: '✨',
    items: [
      { id: 'd1', name: 'Vase', type: 'Decoration', dim: '0.3m ø', emoji: '🏺' },
      { id: 'd2', name: 'Rug', type: 'Rug', dim: '2.4m × 1.6m', emoji: '🟪' },
      { id: 'd3', name: 'Mirror', type: 'Mirror', dim: '0.72m × 1.5m', emoji: '🪞' },
    ]
  },
  {
    id: 'paintings', label: 'Art', icon: '🖼️',
    items: [
      { id: 'pt1', name: 'Landscape', type: 'Painting', dim: '1.1m × 0.85m', emoji: '🖼️' },
      { id: 'pt2', name: 'Abstract', type: 'Painting', dim: '1.1m × 0.85m', emoji: '🎨' },
    ]
  },
  {
    id: 'lights', label: 'Lights', icon: '💡',
    items: [
      { id: 'l1', name: 'Floor Lamp', type: 'Light', dim: '0.4m ø × 1.5m', emoji: '🕯️' },
      { id: 'l2', name: 'Pendant Light', type: 'PendantLight', dim: '0.56m ø', emoji: '💡' },
    ]
  },
];

export default function FurnitureLibrary({ onClose, onSelect }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [search, setSearch] = useState('');

  const activeItems = search
    ? CATEGORIES.flatMap(c => c.items).filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : CATEGORIES.find(c => c.id === activeCategory)?.items || [];

  return (
    <motion.div
      initial={{ x: -340 }}
      animate={{ x: 0 }}
      exit={{ x: -340 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="glass-panel"
      style={{ position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 50, width: 340 }}
    >
      {/* Header */}
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Furniture Library</h2>
          <p style={{ color: 'var(--text-muted)' }}>Click an item to place it in the scene</p>
        </div>
        <button onClick={onClose} className="action-btn"><X size={20} /></button>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search furniture..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px 8px 32px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'white', outline: 'none', fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Category sidebar */}
        {!search && (
          <div style={{ width: 80, borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 }}>
            {CATEGORIES.map(cat => (
              <div
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '10px 4px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  cursor: 'pointer', fontSize: '0.7rem', textAlign: 'center',
                  background: activeCategory === cat.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                  borderLeft: `3px solid ${activeCategory === cat.id ? 'var(--accent)' : 'transparent'}`,
                  color: activeCategory === cat.id ? 'var(--text-main)' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>{cat.icon}</span>
                {cat.label}
              </div>
            ))}
          </div>
        )}

        {/* Items grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start' }}>
          <AnimatePresence mode="popLayout">
            {activeItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ delay: idx * 0.03 }}
                className="furniture-icon-card"
                onClick={() => onSelect(item)}
              >
                <div className="furniture-preview">{item.emoji}</div>
                <div className="furniture-info">
                  <div className="furniture-name">{item.name}</div>
                  <div className="furniture-dim">{item.dim}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {activeItems.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No items found.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
