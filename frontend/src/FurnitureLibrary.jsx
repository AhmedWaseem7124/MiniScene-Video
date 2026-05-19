import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';

const categories = [
  { id: 'beds', label: 'Beds', items: [{ id: 'b1', name: 'Single Bed', type: 'Bed' }, { id: 'b2', name: 'Double Bed', type: 'Bed' }] },
  { id: 'chairs', label: 'Chairs', items: [{ id: 'c1', name: 'Office Chair', type: 'Chair' }, { id: 'c2', name: 'Dining Chair', type: 'Chair' }] },
  { id: 'tables', label: 'Tables', items: [{ id: 't1', name: 'Coffee Table', type: 'Table' }, { id: 't2', name: 'Dining Table', type: 'Table' }] },
  { id: 'plants', label: 'Plants', items: [{ id: 'p1', name: 'Tall Plant', type: 'Plant' }, { id: 'p2', name: 'Desk Plant', type: 'Plant' }] },
  { id: 'cupboards', label: 'Cupboards', items: [{ id: 'cb1', name: 'Wardrobe', type: 'Cupboard' }, { id: 'cb2', name: 'Shelf', type: 'Cupboard' }] },
  { id: 'decor', label: 'Decorations', items: [{ id: 'd1', name: 'Vase', type: 'Decoration' }, { id: 'd2', name: 'Rug', type: 'Decoration' }] },
  { id: 'paintings', label: 'Paintings', items: [{ id: 'pt1', name: 'Landscape', type: 'Painting' }, { id: 'pt2', name: 'Abstract', type: 'Painting' }] },
  { id: 'lights', label: 'Lights', items: [{ id: 'l1', name: 'Floor Lamp', type: 'Light' }, { id: 'l2', name: 'Table Lamp', type: 'Light' }] },
];

export default function FurnitureLibrary({ onClose, onSelect }) {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [search, setSearch] = useState('');

  const filteredItems = categories
    .find(c => c.id === activeCategory)?.items
    .filter(item => item.name.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <motion.div 
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      className="glass-panel"
      style={{ position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 50, width: 320 }}
    >
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Furniture Library</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select an item to place</p>
        </div>
        <button onClick={onClose} className="action-btn"><X size={20}/></button>
      </div>

      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search furniture..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', padding: '8px 12px 8px 36px', 
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'white', outline: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Categories */}
        <div style={{ width: 100, borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
          {categories.map(cat => (
            <div 
              key={cat.id} 
              onClick={() => { setActiveCategory(cat.id); setSearch(''); }}
              style={{
                padding: '12px 8px', fontSize: '0.85rem', cursor: 'pointer',
                background: activeCategory === cat.id ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                borderLeft: activeCategory === cat.id ? '3px solid var(--accent)' : '3px solid transparent'
              }}
            >
              {cat.label}
            </div>
          ))}
        </div>

        {/* Items Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'grid', gridTemplateColumns: '1fr', gap: 12, alignContent: 'start' }}>
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => onSelect(item)}
              className="object-item"
              style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '12px' }}
            >
              <div style={{ width: '100%', height: 80, background: 'rgba(0,0,0,0.2)', borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.type} Model</span>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.name}</span>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: 20 }}>No items found.</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
