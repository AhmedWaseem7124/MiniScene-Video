import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Star, Clock, Grid, List, Filter, Sparkles, Loader } from 'lucide-react';
import ThumbnailGenerator from './ThumbnailGenerator';

// Predefined Color Palettes
const PALETTES = {
  neutral: ['#ffffff', '#f5f0e8', '#d6cabc', '#b8a99a', '#2b2b2b'],
  wood: ['#8b5a2b', '#a97449', '#c19a6b', '#5a3825'],
  luxury: ['#c4a46a', '#b77745', '#1f1f1f', '#f7f3ec'],
  modern: ['#111827', '#374151', '#9ca3af', '#e5e7eb'],
  pastel: ['#f7c6c7', '#c8e7dc', '#c9d8ff', '#f5e6a8']
};

// Complete Catalog of 80+ items
export const CATALOG = [
  // ─── BEDROOM ───
  { id: 'king_bed_lux', name: 'Modern King Bed', category: 'Bedroom', subcategory: 'Bed', placementType: 'floor', size: [2.02, 1.25, 2.29], defaultColor: '#6b4423', colorOptions: PALETTES.wood, material: 'wood', icon: '🛏️', tags: ['bed', 'king', 'wood', 'bedroom', 'master'], type: 'KingBed' },
  { id: 'queen_bed_classic', name: 'Classic Queen Bed', category: 'Bedroom', subcategory: 'Bed', placementType: 'floor', size: [1.6, 1.15, 2.14], defaultColor: '#7c5235', colorOptions: PALETTES.neutral, material: 'fabric', icon: '🛏️', tags: ['bed', 'queen', 'fabric', 'bedroom'], type: 'Bed' },
  { id: 'single_bed_cozy', name: 'Cozy Single Bed', category: 'Bedroom', subcategory: 'Bed', placementType: 'floor', size: [1.0, 1.0, 2.0], defaultColor: '#8b5a2b', colorOptions: PALETTES.neutral, material: 'wood', icon: '🛏️', tags: ['bed', 'single', 'kids', 'bedroom'], type: 'Bed' },
  { id: 'bunk_bed_kids', name: 'Kids Bunk Bed', category: 'Bedroom', subcategory: 'Bed', placementType: 'floor', size: [1.0, 1.8, 2.0], defaultColor: '#5a3825', colorOptions: PALETTES.pastel, material: 'wood', icon: '🛏️', tags: ['bed', 'bunk', 'kids', 'bedroom'], type: 'Bed' },
  { id: 'bedside_table_wood', name: 'Bedside Nightstand', category: 'Bedroom', subcategory: 'Bedside Table', placementType: 'floor', size: [0.6, 0.57, 0.6], defaultColor: '#bda27e', colorOptions: PALETTES.wood, material: 'wood', icon: '🪵', tags: ['nightstand', 'bedside', 'table', 'bedroom'], type: 'BedsideTable' },
  { id: 'wardrobe_closet', name: 'Sliding Door Wardrobe', category: 'Bedroom', subcategory: 'Wardrobe', placementType: 'floor', size: [1.0, 2.0, 1.0], defaultColor: '#d9d1c6', colorOptions: PALETTES.neutral, material: 'wood', icon: '🚪', tags: ['closet', 'wardrobe', 'storage', 'bedroom'], type: 'Wardrobe' },
  { id: 'dresser_drawers', name: '6-Drawer Dresser', category: 'Bedroom', subcategory: 'Dresser', placementType: 'floor', size: [1.4, 0.8, 0.5], defaultColor: '#a97449', colorOptions: PALETTES.wood, material: 'wood', icon: '🗄️', tags: ['dresser', 'drawers', 'storage', 'bedroom'], type: 'Desk' },
  { id: 'vanity_table_chic', name: 'Chic Vanity Table', category: 'Bedroom', subcategory: 'Vanity Table', placementType: 'floor', size: [1.0, 0.75, 0.45], defaultColor: '#f5f0e8', colorOptions: PALETTES.luxury, material: 'wood', icon: '💄', tags: ['vanity', 'makeup', 'table', 'dresser'], type: 'Desk' },
  { id: 'wall_mirror_oval', name: 'Oval Wall Mirror', category: 'Bedroom', subcategory: 'Wall Mirror', placementType: 'wall', size: [0.8, 1.2, 0.05], defaultColor: '#caa56f', colorOptions: PALETTES.luxury, material: 'glass', icon: '🪞', tags: ['mirror', 'wall', 'gold', 'decor'], type: 'WallMirror' },
  { id: 'ottoman_cushion', name: 'Velvet Ottoman', category: 'Bedroom', subcategory: 'Ottoman', placementType: 'floor', size: [0.6, 0.45, 0.6], defaultColor: '#b77745', colorOptions: PALETTES.pastel, material: 'fabric', icon: '🪑', tags: ['ottoman', 'pouf', 'stool', 'seat'], type: 'Chair' },
  { id: 'bed_bench_fabric', name: 'Upholstered Bed Bench', category: 'Bedroom', subcategory: 'Bed Bench', placementType: 'floor', size: [1.2, 0.45, 0.4], defaultColor: '#d8cfc4', colorOptions: PALETTES.neutral, material: 'fabric', icon: '🪑', tags: ['bench', 'seat', 'ottoman', 'bedroom'], type: 'Chair' },

  // ─── LIVING ROOM ───
  { id: 'sofa_3_seat_leather', name: '3-Seat Leather Sofa', category: 'Living Room', subcategory: '3 Seat Sofa', placementType: 'floor', size: [2.1, 0.9, 0.92], defaultColor: '#2b2b2b', colorOptions: PALETTES.luxury, material: 'leather', icon: '🛋️', tags: ['sofa', 'leather', 'couch', 'living'], type: 'Sofa' },
  { id: 'sofa_l_shape_fabric', name: 'Modern L-Shape Sofa', category: 'Living Room', subcategory: 'L Shape Sofa', placementType: 'floor', size: [2.6, 0.9, 1.8], defaultColor: '#d6cabc', colorOptions: PALETTES.neutral, material: 'fabric', icon: '🛋️', tags: ['sofa', 'sectional', 'l-shape', 'couch', 'living'], type: 'Sofa' },
  { id: 'sofa_sectional_large', name: 'Large Sectional Sofa', category: 'Living Room', subcategory: 'Sectional Sofa', placementType: 'floor', size: [3.2, 0.9, 2.4], defaultColor: '#374151', colorOptions: PALETTES.modern, material: 'fabric', icon: '🛋️', tags: ['sofa', 'sectional', 'large', 'couch', 'living'], type: 'Sofa' },
  { id: 'armchair_fabric', name: 'Upholstered Armchair', category: 'Living Room', subcategory: 'Armchair', placementType: 'floor', size: [0.82, 1.22, 0.8], defaultColor: '#4a5568', colorOptions: PALETTES.neutral, material: 'fabric', icon: '🪑', tags: ['armchair', 'chair', 'accent', 'living'], type: 'Armchair' },
  { id: 'recliner_comfy', name: 'Comfy Recliner Chair', category: 'Living Room', subcategory: 'Recliner', placementType: 'floor', size: [0.95, 1.0, 0.95], defaultColor: '#1f1f1f', colorOptions: PALETTES.luxury, material: 'leather', icon: '🛋️', tags: ['recliner', 'armchair', 'leather', 'seat'], type: 'Armchair' },
  { id: 'coffee_table_wood', name: 'Wood Coffee Table', category: 'Living Room', subcategory: 'Coffee Table', placementType: 'floor', size: [1.6, 0.78, 0.85], defaultColor: '#d97706', colorOptions: PALETTES.wood, material: 'wood', icon: '🪵', tags: ['table', 'coffee', 'wood', 'living'], type: 'Table' },
  { id: 'side_table_modern', name: 'Round Side Table', category: 'Living Room', subcategory: 'Side Table', placementType: 'floor', size: [0.6, 0.57, 0.6], defaultColor: '#d4a96a', colorOptions: PALETTES.luxury, material: 'metal', icon: '🪵', tags: ['table', 'side', 'round', 'end'], type: 'SideTable' },
  { id: 'tv_stand_console', name: 'Media TV Stand', category: 'Living Room', subcategory: 'TV Stand', placementType: 'floor', size: [1.6, 0.6, 0.45], defaultColor: '#1c1917', colorOptions: PALETTES.modern, material: 'wood', icon: '📺', tags: ['tv', 'stand', 'media', 'console', 'storage'], type: 'TVStand' },
  { id: 'wall_tv_lcd', name: 'Wall Mounted TV', category: 'Living Room', subcategory: 'Wall Mounted LCD', placementType: 'wall', size: [1.25, 0.72, 0.05], defaultColor: '#111111', colorOptions: ['#111111'], material: 'plastic', icon: '📺', tags: ['tv', 'wall', 'lcd', 'screen', 'electronics'], type: 'Mirror' },
  { id: 'console_table_chic', name: 'Hallway Console Table', category: 'Living Room', subcategory: 'Console Table', placementType: 'floor', size: [1.0, 0.85, 1.0], defaultColor: '#d4c5b3', colorOptions: PALETTES.neutral, material: 'wood', icon: '🪵', tags: ['console', 'table', 'hallway', 'entry'], type: 'Console' },
  { id: 'bookshelf_wood', name: 'Library Bookshelf', category: 'Living Room', subcategory: 'Bookshelf', placementType: 'floor', size: [0.9, 2.0, 0.3], defaultColor: '#57534e', colorOptions: PALETTES.wood, material: 'wood', icon: '📚', tags: ['bookshelf', 'shelves', 'bookcase', 'storage'], type: 'Bookshelf' },
  { id: 'display_cabinet_glass', name: 'Glass Display Cabinet', category: 'Living Room', subcategory: 'Display Cabinet', placementType: 'floor', size: [1.0, 1.0, 1.0], defaultColor: '#111111', colorOptions: PALETTES.modern, material: 'glass', icon: '🚪', tags: ['cabinet', 'display', 'glass', 'storage'], type: 'DisplayCabinet' },

  // ─── DINING ROOM ───
  { id: 'dining_table_4s', name: '4-Seater Dining Table', category: 'Dining Room', subcategory: 'Dining Table 4-Seater', placementType: 'floor', size: [1.4, 0.78, 0.8], defaultColor: '#d97706', colorOptions: PALETTES.wood, material: 'wood', icon: '🪵', tags: ['table', 'dining', '4-seater', 'kitchen'], type: 'Table' },
  { id: 'dining_table_6s', name: '6-Seater Dining Table', category: 'Dining Room', subcategory: 'Dining Table 6-Seater', placementType: 'floor', size: [1.8, 0.78, 0.9], defaultColor: '#a97449', colorOptions: PALETTES.wood, material: 'wood', icon: '🪵', tags: ['table', 'dining', '6-seater'], type: 'Table' },
  { id: 'dining_table_8s', name: '8-Seater Dining Table', category: 'Dining Room', subcategory: 'Dining Table 8-Seater', placementType: 'floor', size: [2.4, 0.78, 1.0], defaultColor: '#5a3825', colorOptions: PALETTES.luxury, material: 'marble', icon: '🪵', tags: ['table', 'dining', '8-seater', 'large'], type: 'Table' },
  { id: 'dining_chair_fabric', name: 'Cozy Dining Chair', category: 'Dining Room', subcategory: 'Dining Chair', placementType: 'floor', size: [0.52, 1.16, 0.52], defaultColor: '#2d3748', colorOptions: PALETTES.neutral, material: 'fabric', icon: '🪑', tags: ['chair', 'dining', 'seat'], type: 'Chair' },
  { id: 'bar_stool_metal', name: 'High Bar Stool', category: 'Dining Room', subcategory: 'Bar Stool', placementType: 'floor', size: [0.45, 0.85, 0.45], defaultColor: '#718096', colorOptions: PALETTES.modern, material: 'metal', icon: '🪑', tags: ['stool', 'bar', 'counter', 'seat'], type: 'Chair' },
  { id: 'buffet_cabinet_wood', name: 'Sideboard Buffet Cabinet', category: 'Dining Room', subcategory: 'Buffet Cabinet', placementType: 'floor', size: [1.6, 0.9, 0.45], defaultColor: '#44403c', colorOptions: PALETTES.wood, material: 'wood', icon: '🚪', tags: ['sideboard', 'buffet', 'cabinet', 'dining', 'storage'], type: 'Cupboard' },
  { id: 'crockery_cabinet_lit', name: 'Modern Crockery Cabinet', category: 'Dining Room', subcategory: 'Crockery Cabinet', placementType: 'floor', size: [1.0, 1.8, 0.45], defaultColor: '#111111', colorOptions: PALETTES.luxury, material: 'glass', icon: '🚪', tags: ['crockery', 'china', 'cabinet', 'glass', 'dining'], type: 'DisplayCabinet' },

  // ─── OFFICE ───
  { id: 'office_desk_wood', name: 'Executive Office Desk', category: 'Office', subcategory: 'Office Desk', placementType: 'floor', size: [1.4, 0.785, 0.7], defaultColor: '#78350f', colorOptions: PALETTES.wood, material: 'wood', icon: '🖥️', tags: ['desk', 'office', 'writing', 'table', 'work'], type: 'Desk' },
  { id: 'executive_chair_leather', name: 'Ergonomic Executive Chair', category: 'Office', subcategory: 'Executive Chair', placementType: 'floor', size: [0.7, 1.2, 0.7], defaultColor: '#2d3748', colorOptions: PALETTES.modern, material: 'leather', icon: '🪑', tags: ['chair', 'office', 'executive', 'ergonomic', 'seat'], type: 'Armchair' },
  { id: 'visitor_chair_mesh', name: 'Visitor Mesh Chair', category: 'Office', subcategory: 'Visitor Chair', placementType: 'floor', size: [0.55, 0.85, 0.55], defaultColor: '#718096', colorOptions: PALETTES.neutral, material: 'plastic', icon: '🪑', tags: ['chair', 'visitor', 'guest', 'office'], type: 'Chair' },
  { id: 'office_bookshelf_tall', name: 'Office Bookshelf', category: 'Office', subcategory: 'Bookshelf', placementType: 'floor', size: [0.9, 2.0, 0.3], defaultColor: '#57534e', colorOptions: PALETTES.neutral, material: 'wood', icon: '📚', tags: ['bookshelf', 'shelves', 'office', 'storage'], type: 'Bookshelf' },
  { id: 'filing_cabinet_lock', name: 'Filing Cabinet', category: 'Office', subcategory: 'Filing Cabinet', placementType: 'floor', size: [0.6, 1.2, 0.5], defaultColor: '#44403c', colorOptions: PALETTES.modern, material: 'metal', icon: '🗄️', tags: ['cabinet', 'filing', 'file', 'storage', 'office'], type: 'Cupboard' },
  { id: 'conference_table_oval', name: 'Conference Board Table', category: 'Office', subcategory: 'Conference Table', placementType: 'floor', size: [3.2, 0.78, 1.2], defaultColor: '#d97706', colorOptions: PALETTES.wood, material: 'wood', icon: '🪵', tags: ['table', 'conference', 'meeting', 'large', 'boardroom'], type: 'Table' },
  { id: 'laptop_table_small', name: 'Mobile Laptop Cart', category: 'Office', subcategory: 'Laptop Table', placementType: 'floor', size: [0.8, 0.75, 0.5], defaultColor: '#f7f3ec', colorOptions: PALETTES.neutral, material: 'metal', icon: '🪵', tags: ['laptop', 'table', 'cart', 'small', 'work'], type: 'Table' },

  // ─── KITCHEN ───
  { id: 'kitchen_base_cab', name: 'Base Lower Cabinet', category: 'Kitchen', subcategory: 'Base Cabinet', placementType: 'floor', size: [1.0, 0.9, 0.6], defaultColor: '#b9aa97', colorOptions: PALETTES.neutral, material: 'wood', icon: '🚪', tags: ['cabinet', 'kitchen', 'base', 'counter', 'storage'], type: 'KitchenCabinet' },
  { id: 'kitchen_wall_cab', name: 'Wall Upper Cabinet', category: 'Kitchen', subcategory: 'Wall Cabinet', placementType: 'wall', size: [1.0, 0.7, 0.35], defaultColor: '#b9aa97', colorOptions: PALETTES.neutral, material: 'wood', icon: '🚪', tags: ['cabinet', 'wall', 'kitchen', 'upper', 'storage'], type: 'KitchenCabinet' },
  { id: 'kitchen_island_counter', name: 'Kitchen Island Counter', category: 'Kitchen', subcategory: 'Island Counter', placementType: 'floor', size: [1.8, 0.9, 0.9], defaultColor: '#7a4e31', colorOptions: PALETTES.luxury, material: 'marble', icon: '🪵', tags: ['island', 'kitchen', 'counter', 'table', 'breakfast'], type: 'KitchenCabinet' },
  { id: 'kitchen_refrigerator_steel', name: 'Smart Refrigerator', category: 'Kitchen', subcategory: 'Refrigerator', placementType: 'floor', size: [0.9, 1.8, 0.75], defaultColor: '#777974', colorOptions: PALETTES.modern, material: 'metal', icon: '🧊', tags: ['fridge', 'refrigerator', 'appliance', 'kitchen'], type: 'Refrigerator' },
  { id: 'kitchen_oven_stack_built', name: 'Double Oven Stack', category: 'Kitchen', subcategory: 'Oven Unit', placementType: 'floor', size: [0.6, 2.0, 0.6], defaultColor: '#2d2c2a', colorOptions: PALETTES.modern, material: 'metal', icon: '🔥', tags: ['oven', 'stack', 'appliance', 'kitchen', 'built-in'], type: 'OvenStack' },
  { id: 'kitchen_sink_unit_double', name: 'Double Sink Unit', category: 'Kitchen', subcategory: 'Sink Unit', placementType: 'floor', size: [1.0, 0.9, 0.6], defaultColor: '#b9aa97', colorOptions: PALETTES.neutral, material: 'metal', icon: '🚰', tags: ['sink', 'basin', 'cabinet', 'kitchen', 'counter'], type: 'KitchenCabinet' },
  { id: 'kitchen_cooktop_gas', name: '4-Burner Gas Cooktop', category: 'Kitchen', subcategory: 'Stove/Cooktop', placementType: 'floor', size: [0.75, 0.05, 0.52], defaultColor: '#1a1a1a', colorOptions: ['#1a1a1a', '#2d2c2a', '#e5e7eb'], material: 'glass', icon: '🍳', tags: ['cooktop', 'stove', 'gas', 'appliance', 'kitchen'], type: 'KitchenCabinet' },
  { id: 'kitchen_tall_pantry_closet', name: 'Tall Pantry Cabinet', category: 'Kitchen', subcategory: 'Tall Pantry Cabinet', placementType: 'floor', size: [0.6, 2.0, 0.6], defaultColor: '#44403c', colorOptions: PALETTES.wood, material: 'wood', icon: '🚪', tags: ['pantry', 'cabinet', 'tall', 'kitchen', 'storage'], type: 'Cupboard' },

  // ─── GARDEN / OUTDOOR ───
  { id: 'garden_bench_wood', name: 'Outdoor Wood Bench', category: 'Garden / Outdoor', subcategory: 'Outdoor Bench', placementType: 'floor', size: [1.5, 0.45, 0.5], defaultColor: '#8b5a2b', colorOptions: PALETTES.wood, material: 'wood', icon: '🪵', tags: ['bench', 'outdoor', 'garden', 'patio'], type: 'Sofa' },
  { id: 'patio_chair_wicker', name: 'Wicker Patio Chair', category: 'Garden / Outdoor', subcategory: 'Patio Chair', placementType: 'floor', size: [0.6, 0.8, 0.6], defaultColor: '#b8a99a', colorOptions: PALETTES.neutral, material: 'fabric', icon: '🪑', tags: ['chair', 'patio', 'wicker', 'outdoor', 'garden'], type: 'Armchair' },
  { id: 'patio_table_round', name: 'Patio Dining Table', category: 'Garden / Outdoor', subcategory: 'Patio Table', placementType: 'floor', size: [0.9, 0.75, 0.9], defaultColor: '#5a3825', colorOptions: PALETTES.wood, material: 'wood', icon: '🪵', tags: ['table', 'patio', 'outdoor', 'garden', 'round'], type: 'Table' },
  { id: 'patio_umbrella_deck', name: 'Cantilever Deck Umbrella', category: 'Garden / Outdoor', subcategory: 'Umbrella', placementType: 'floor', size: [2.2, 2.4, 2.2], defaultColor: '#f5f0e8', colorOptions: PALETTES.pastel, material: 'fabric', icon: '⛱️', tags: ['umbrella', 'parasol', 'shade', 'patio', 'outdoor'], type: 'Plant' },
  { id: 'planter_box_wood', name: 'Wooden Planter Box', category: 'Garden / Outdoor', subcategory: 'Planter Box', placementType: 'floor', size: [1.0, 0.45, 0.4], defaultColor: '#a97449', colorOptions: PALETTES.wood, material: 'wood', icon: '🪴', tags: ['planter', 'box', 'pot', 'garden', 'flowers'], type: 'Plant' },
  { id: 'garden_pot_terracotta', name: 'Terracotta Garden Pot', category: 'Garden / Outdoor', subcategory: 'Garden Pot', placementType: 'floor', size: [0.4, 0.4, 0.4], defaultColor: '#d6cabc', colorOptions: PALETTES.pastel, material: 'marble', icon: '🪴', tags: ['pot', 'planter', 'terracotta', 'clay', 'garden'], type: 'Plant' },
  { id: 'outdoor_sofa_weather', name: 'Weatherproof Outdoor Sofa', category: 'Garden / Outdoor', subcategory: 'Outdoor Sofa', placementType: 'floor', size: [1.8, 0.75, 0.8], defaultColor: '#f5f0e8', colorOptions: PALETTES.neutral, material: 'fabric', icon: '🛋️', tags: ['sofa', 'outdoor', 'weatherproof', 'patio', 'couch'], type: 'Sofa' },

  // ─── PLANTS ───
  { id: 'plant_fiddle_fig', name: 'Fiddle Leaf Fig Tree', category: 'Plants', subcategory: 'Tall Indoor Plant', placementType: 'floor', size: [0.5, 1.5, 0.5], defaultColor: '#16a34a', colorOptions: ['#16a34a', '#15803d', '#14532d'], material: 'matte', icon: '🌿', tags: ['plant', 'fig', 'tree', 'tall', 'indoor', 'decor'], type: 'Plant' },
  { id: 'plant_pothos_hanging', name: 'Hanging Pothos Basket', category: 'Plants', subcategory: 'Hanging Plant', placementType: 'ceiling', size: [0.4, 0.8, 0.4], defaultColor: '#166534', colorOptions: ['#166534', '#15803d'], material: 'matte', icon: '🌿', tags: ['plant', 'hanging', 'basket', 'pothos', 'ceiling'], type: 'Plant' },
  { id: 'plant_snake_pot', name: 'Snake Plant in Ceramic Pot', category: 'Plants', subcategory: 'Small Potted Plant', placementType: 'floor', size: [0.3, 0.6, 0.3], defaultColor: '#15803d', colorOptions: ['#15803d', '#16a34a'], material: 'matte', icon: '🪴', tags: ['plant', 'snake', 'pot', 'ceramic', 'indoor'], type: 'Plant' },
  { id: 'plant_palm_corner', name: 'Areca Corner Palm', category: 'Plants', subcategory: 'Palm Plant', placementType: 'floor', size: [0.8, 1.6, 0.8], defaultColor: '#15803d', colorOptions: ['#15803d', '#166534'], material: 'matte', icon: '🌴', tags: ['plant', 'palm', 'areca', 'corner', 'tropical'], type: 'Plant' },
  { id: 'plant_succulent_desk', name: 'Mini Desk Succulent', category: 'Plants', subcategory: 'Table Plant', placementType: 'table-top', size: [0.15, 0.15, 0.15], defaultColor: '#16a34a', colorOptions: ['#16a34a', '#c8e7dc'], material: 'matte', icon: '🌵', tags: ['plant', 'succulent', 'desk', 'mini', 'small', 'table-top'], type: 'Plant' },
  { id: 'plant_monstera_floor', name: 'Monstera Deliciosa', category: 'Plants', subcategory: 'Floor Plant', placementType: 'floor', size: [0.6, 1.1, 0.6], defaultColor: '#14532d', colorOptions: ['#14532d', '#16a34a'], material: 'matte', icon: '🌿', tags: ['plant', 'monstera', 'swiss', 'cheese', 'floor'], type: 'Plant' },

  // ─── WINDOWS & CURTAINS ───
  { id: 'window_single_frame', name: 'Single Casement Window', category: 'Windows & Curtains', subcategory: 'Single Window', placementType: 'wall', size: [1.0, 1.2, 0.08], defaultColor: '#dce8ef', colorOptions: PALETTES.neutral, material: 'glass', icon: '🪟', tags: ['window', 'single', 'glass', 'wall'], type: 'Window' },
  { id: 'window_large_panes', name: 'Large 3-Pane Window', category: 'Windows & Curtains', subcategory: 'Large Window', placementType: 'wall', size: [2.0, 1.5, 0.08], defaultColor: '#dce8ef', colorOptions: PALETTES.neutral, material: 'glass', icon: '🪟', tags: ['window', 'large', 'panes', 'wall'], type: 'Window' },
  { id: 'window_sliding_patio', name: 'Sliding Patio Door Window', category: 'Windows & Curtains', subcategory: 'Sliding Window', placementType: 'wall', size: [2.4, 2.0, 0.12], defaultColor: '#dce8ef', colorOptions: PALETTES.neutral, material: 'glass', icon: '🪟', tags: ['window', 'sliding', 'patio', 'glass', 'door'], type: 'Window' },
  { id: 'curtain_sheer_white', name: 'Elegant Sheer Curtains', category: 'Windows & Curtains', subcategory: 'Sheer Curtains', placementType: 'wall', size: [1.2, 2.4, 0.1], defaultColor: '#f5f0e8', colorOptions: PALETTES.pastel, material: 'fabric', icon: '🎪', tags: ['curtain', 'sheer', 'white', 'drape', 'light'], type: 'Curtain' },
  { id: 'curtain_heavy_velvet', name: 'Heavy Blackout Curtains', category: 'Windows & Curtains', subcategory: 'Heavy Curtains', placementType: 'wall', size: [1.2, 2.4, 0.15], defaultColor: '#b8a99a', colorOptions: PALETTES.neutral, material: 'fabric', icon: '🎪', tags: ['curtain', 'heavy', 'blackout', 'velvet', 'drape'], type: 'Curtain' },
  { id: 'blinds_venetian_wood', name: 'Venetian Wood Blinds', category: 'Windows & Curtains', subcategory: 'Blinds', placementType: 'wall', size: [1.0, 1.5, 0.05], defaultColor: '#a97449', colorOptions: PALETTES.wood, material: 'wood', icon: '🏁', tags: ['blinds', 'venetian', 'shades', 'wood', 'window'], type: 'Curtain' },
  { id: 'curtain_rod_brass', name: 'Metallic Curtain Rod', category: 'Windows & Curtains', subcategory: 'Curtain Rod', placementType: 'wall', size: [2.6, 0.05, 0.05], defaultColor: '#cbd5e1', colorOptions: PALETTES.luxury, material: 'metal', icon: '➖', tags: ['rod', 'pole', 'curtain', 'metal', 'brass'], type: 'Curtain' },

  // ─── RUGS & CARPETS ───
  { id: 'rug_large_wool', name: 'Large Rectangular Rug', category: 'Rugs & Carpets', subcategory: 'Large Rectangular Rug', placementType: 'floor-flat', size: [3.0, 0.02, 2.0], defaultColor: '#8b5cf6', colorOptions: PALETTES.pastel, material: 'fabric', icon: '🟪', tags: ['rug', 'carpet', 'large', 'wool', 'floor'], type: 'Rug' },
  { id: 'rug_round_jute', name: 'Round Jute Rug', category: 'Rugs & Carpets', subcategory: 'Round Rug', placementType: 'floor-flat', size: [1.8, 0.02, 1.8], defaultColor: '#caa893', colorOptions: PALETTES.wood, material: 'fabric', icon: '🟡', tags: ['rug', 'round', 'jute', 'braided', 'natural'], type: 'Rug' },
  { id: 'rug_runner_wool', name: 'Hallway Runner Rug', category: 'Rugs & Carpets', subcategory: 'Runner Rug', placementType: 'floor-flat', size: [3.0, 0.02, 0.8], defaultColor: '#7c3aed', colorOptions: PALETTES.neutral, material: 'fabric', icon: '➖', tags: ['rug', 'runner', 'hallway', 'narrow', 'carpet'], type: 'Rug' },
  { id: 'rug_persian_carpet', name: 'Traditional Persian Carpet', category: 'Rugs & Carpets', subcategory: 'Persian Carpet', placementType: 'floor-flat', size: [2.4, 0.02, 1.6], defaultColor: '#dc2626', colorOptions: ['#dc2626', '#b77745', '#5a3825'], material: 'fabric', icon: '🧧', tags: ['carpet', 'rug', 'persian', 'traditional', 'pattern'], type: 'Rug' },
  { id: 'rug_modern_geo', name: 'Modern Geometric Carpet', category: 'Rugs & Carpets', subcategory: 'Modern Carpet', placementType: 'floor-flat', size: [2.4, 0.02, 1.6], defaultColor: '#3b82f6', colorOptions: PALETTES.modern, material: 'fabric', icon: '🟥', tags: ['carpet', 'rug', 'modern', 'geometric', 'pattern'], type: 'Rug' },
  { id: 'rug_bedroom_fluffy', name: 'Soft Bedroom Rug', category: 'Rugs & Carpets', subcategory: 'Bedroom Rug', placementType: 'floor-flat', size: [2.0, 0.02, 1.4], defaultColor: '#ddd5c8', colorOptions: PALETTES.neutral, material: 'fabric', icon: '🟪', tags: ['rug', 'bedroom', 'soft', 'fluffy', 'bedside'], type: 'Rug' },
  { id: 'rug_dining_weave', name: 'Flatweave Dining Rug', category: 'Rugs & Carpets', subcategory: 'Dining Rug', placementType: 'floor-flat', size: [3.2, 0.02, 2.4], defaultColor: '#b9afa2', colorOptions: PALETTES.neutral, material: 'fabric', icon: '🟪', tags: ['rug', 'dining', 'flatweave', 'under-table'], type: 'Rug' },

  // ─── DECOR ───
  { id: 'decor_vase_ceramic', name: 'Ceramic Table Vase', category: 'Decor', subcategory: 'Vase', placementType: 'table-top', size: [0.25, 0.45, 0.25], defaultColor: '#fb923c', colorOptions: PALETTES.pastel, material: 'marble', icon: '🏺', tags: ['vase', 'ceramic', 'decor', 'flowers', 'table-top'], type: 'Decoration' },
  { id: 'decor_vase_floor', name: 'Tall Floor Ceramic Vase', category: 'Decor', subcategory: 'Floor Vase', placementType: 'floor', size: [0.35, 0.85, 0.35], defaultColor: '#b0b8c4', colorOptions: PALETTES.neutral, material: 'marble', icon: '🏺', tags: ['vase', 'floor', 'tall', 'ceramic', 'decor'], type: 'Decoration' },
  { id: 'decor_painting_scenic', name: 'Scenic Landscape Painting', category: 'Decor', subcategory: 'Wall Painting', placementType: 'wall', size: [1.1, 0.85, 0.06], defaultColor: '#1e293b', colorOptions: PALETTES.neutral, material: 'wood', icon: '🖼️', tags: ['painting', 'wall', 'art', 'scenic', 'landscape', 'decor'], type: 'Painting' },
  { id: 'decor_painting_abstract', name: 'Abstract Art Canvas', category: 'Decor', subcategory: 'Abstract Art', placementType: 'wall', size: [1.1, 0.85, 0.06], defaultColor: '#38bdf8', colorOptions: PALETTES.pastel, material: 'wood', icon: '🎨', tags: ['art', 'abstract', 'wall', 'canvas', 'painting'], type: 'Painting' },
  { id: 'decor_photo_frame_black', name: 'Gallery Photo Frame', category: 'Decor', subcategory: 'Photo Frame', placementType: 'wall', size: [0.4, 0.5, 0.03], defaultColor: '#2b2b2b', colorOptions: PALETTES.neutral, material: 'plastic', icon: '🖼️', tags: ['frame', 'photo', 'picture', 'wall', 'gallery'], type: 'Painting' },
  { id: 'decor_wall_clock_modern', name: 'Modern Wall Clock', category: 'Decor', subcategory: 'Clock', placementType: 'wall', size: [0.4, 0.4, 0.04], defaultColor: '#111111', colorOptions: PALETTES.modern, material: 'metal', icon: '🕰️', tags: ['clock', 'wall', 'time', 'modern', 'decor'], type: 'Painting' },
  { id: 'decor_sculpture_stone', name: 'Abstract Stone Sculpture', category: 'Decor', subcategory: 'Sculpture', placementType: 'table-top', size: [0.3, 0.6, 0.3], defaultColor: '#f5f0e8', colorOptions: PALETTES.luxury, material: 'marble', icon: '🗿', tags: ['sculpture', 'art', 'stone', 'marble', 'decor', 'table-top'], type: 'Decoration' },
  { id: 'decor_books_heap', name: 'Hardcover Books Stack', category: 'Decor', subcategory: 'Books', placementType: 'table-top', size: [0.3, 0.2, 0.25], defaultColor: '#dc2626', colorOptions: PALETTES.neutral, material: 'matte', icon: '📚', tags: ['books', 'stack', 'literature', 'read', 'table-top'], type: 'Decoration' },
  { id: 'decor_magazines_stack', name: 'Design Magazine Stack', category: 'Decor', subcategory: 'Magazine Stack', placementType: 'table-top', size: [0.3, 0.1, 0.25], defaultColor: '#2563eb', colorOptions: PALETTES.modern, material: 'matte', icon: '📚', tags: ['magazines', 'stack', 'design', 'reading'], type: 'Decoration' },
  { id: 'decor_cushion_pillow', name: 'Comfortable Throw Pillows', category: 'Decor', subcategory: 'Throw Pillows', placementType: 'table-top', size: [0.4, 0.15, 0.4], defaultColor: '#f5f0ea', colorOptions: PALETTES.pastel, material: 'fabric', icon: '🛌', tags: ['pillows', 'cushions', 'throw', 'decor', 'sofa'], type: 'Decoration' },
  { id: 'decor_blanket_throw', name: 'Cozy Knit Throw Blanket', category: 'Decor', subcategory: 'Blanket', placementType: 'table-top', size: [0.6, 0.05, 0.6], defaultColor: '#ddd5c8', colorOptions: PALETTES.pastel, material: 'fabric', icon: '🛌', tags: ['blanket', 'throw', 'knit', 'cozy', 'bed', 'sofa'], type: 'Decoration' },

  // ─── LIGHTING ───
  { id: 'light_floor_lamp_shining', name: 'Modern Arc Floor Lamp', category: 'Lighting', subcategory: 'Floor Lamp', placementType: 'floor', size: [0.4, 1.5, 0.4], defaultColor: '#fef9c3', colorOptions: PALETTES.luxury, material: 'metal', icon: '🕯️', tags: ['lamp', 'floor', 'arc', 'light', 'standing'], type: 'Light' },
  { id: 'light_table_lamp_bedside', name: 'Bedside Ceramic Table Lamp', category: 'Lighting', subcategory: 'Table Lamp', placementType: 'table-top', size: [0.26, 0.45, 0.26], defaultColor: '#fde68a', colorOptions: PALETTES.pastel, material: 'marble', icon: '💡', tags: ['lamp', 'table', 'bedside', 'desk', 'light', 'table-top'], type: 'Light' },
  { id: 'light_wall_sconce_brass', name: 'Brass Wall Sconce Light', category: 'Lighting', subcategory: 'Wall Light', placementType: 'wall', size: [0.15, 0.3, 0.15], defaultColor: '#fde68a', colorOptions: PALETTES.luxury, material: 'metal', icon: '💡', tags: ['sconce', 'wall', 'light', 'brass', 'fixture'], type: 'Light' },
  { id: 'light_pendant_cone', name: 'Nordic Cone Pendant Light', category: 'Lighting', subcategory: 'Pendant Light', placementType: 'ceiling', size: [0.28, 1.2, 0.28], defaultColor: '#fde68a', colorOptions: PALETTES.modern, material: 'metal', icon: '💡', tags: ['pendant', 'ceiling', 'hanging', 'cone', 'light'], type: 'PendantLight' },
  { id: 'light_chandelier_crystal', name: 'Crystal Chandelier Light', category: 'Lighting', subcategory: 'Chandelier', placementType: 'ceiling', size: [1.55, 1.05, 1.05], defaultColor: '#fde68a', colorOptions: PALETTES.luxury, material: 'glass', icon: '💡', tags: ['chandelier', 'crystal', 'hanging', 'ceiling', 'luxury', 'light'], type: 'PendantLight' },
  { id: 'light_ceiling_flush_mount', name: 'Flush Mount Ceiling Light', category: 'Lighting', subcategory: 'Ceiling Light', placementType: 'ceiling', size: [0.3, 0.1, 0.3], defaultColor: '#ffffff', colorOptions: PALETTES.neutral, material: 'plastic', icon: '💡', tags: ['ceiling', 'flush', 'mount', 'light', 'dome'], type: 'Light' },
  { id: 'light_led_cove_strip', name: 'LED Cove Light Strip', category: 'Lighting', subcategory: 'LED Strip', placementType: 'ceiling', size: [1.0, 0.02, 0.02], defaultColor: '#38bdf8', colorOptions: ['#38bdf8', '#fbbf24', '#ffffff', '#ec4899'], material: 'plastic', icon: '💡', tags: ['led', 'strip', 'cove', 'lighting', 'backlight', 'flexible'], type: 'Light' },
  { id: 'light_spotlight_track', name: 'Adjustable Spot Track Light', category: 'Lighting', subcategory: 'Spot Light', placementType: 'ceiling', size: [0.12, 0.12, 0.12], defaultColor: '#ffffff', colorOptions: PALETTES.neutral, material: 'metal', icon: '💡', tags: ['spotlight', 'spot', 'track', 'ceiling', 'directional'], type: 'Light' },

  // ─── FANS ───
  { id: 'fan_ceiling_modern', name: '3-Blade Ceiling Fan', category: 'Fans', subcategory: 'Ceiling Fan', placementType: 'ceiling', size: [1.2, 0.4, 1.2], defaultColor: '#2b2b2b', colorOptions: PALETTES.neutral, material: 'metal', icon: '🌀', tags: ['fan', 'ceiling', 'blades', 'cooling', 'electric'], type: 'Light' },
  { id: 'fan_pedestal_standing', name: 'Pedestal Standing Fan', category: 'Fans', subcategory: 'Pedestal Fan', placementType: 'floor', size: [0.45, 1.3, 0.45], defaultColor: '#2b2b2b', colorOptions: PALETTES.modern, material: 'plastic', icon: '🌀', tags: ['fan', 'pedestal', 'standing', 'floor', 'cooling'], type: 'Light' },
  { id: 'fan_wall_oscillate', name: 'Oscillating Wall Fan', category: 'Fans', subcategory: 'Wall Fan', placementType: 'wall', size: [0.4, 0.45, 0.35], defaultColor: '#2b2b2b', colorOptions: PALETTES.neutral, material: 'plastic', icon: '🌀', tags: ['fan', 'wall', 'oscillating', 'cooling'], type: 'Light' }
];

// Enrich catalog schema programmatically for modelPath, thumbnailPath, and colors
CATALOG.forEach(item => {
  const catFolder = item.category.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  item.modelPath = item.modelPath || `/models/${catFolder}/${item.id}.glb`;
  item.thumbnailPath = item.thumbnailPath || `/thumbnails/${catFolder}/${item.id}.png`;
  item.colors = item.colors || item.colorOptions || [];
});

// ─── Beautiful Falling Image / Preview Fallback component ──────────────────
function FurniturePreviewImage({ item, buster, className }) {
  const [error, setError] = useState(false);

  // Category gradient generator to produce rich, beautiful aesthetics
  const getCategoryGradient = (cat) => {
    const hashes = cat.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hashes % 360;
    return `linear-gradient(135deg, hsl(${hue}, 45%, 28%) 0%, hsl(${(hue + 60) % 360}, 50%, 14%) 100%)`;
  };

  const [thumbUrl, setThumbUrl] = useState(item.thumbnailPath);
  
  useEffect(() => {
    setError(false);
    setThumbUrl(item.thumbnailPath);
  }, [item.thumbnailPath, item.id]);

  if (error || !thumbUrl) {
    return (
      <div 
        className="fallback-preview" 
        style={{ 
          display: 'flex', 
          height: '100%', 
          width: '100%', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: getCategoryGradient(item.category),
          borderRadius: 'inherit',
          color: '#f8fafc',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          fontWeight: 700,
          fontFamily: "'Outfit', sans-serif"
        }}
      >
        <span style={{ fontSize: className === 'list-preview' ? '1.1rem' : '1.7rem' }}>
          {item.icon || '🪑'}
        </span>
      </div>
    );
  }

  const srcUrl = buster ? `${thumbUrl}?t=${buster}` : thumbUrl;

  return (
    <img
      src={srcUrl}
      alt={item.name}
      className={className || "furniture-preview"}
      onError={() => setError(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        borderRadius: 'inherit',
        background: 'rgba(0, 0, 0, 0.15)'
      }}
    />
  );
}

// Extract categories and structure them for sidebar tabs
const CATEGORIES = [
  { id: 'Bedroom', label: 'Bedroom', icon: '🛏️' },
  { id: 'Living Room', label: 'Living Room', icon: '🛋️' },
  { id: 'Dining Room', label: 'Dining Room', icon: '🍽️' },
  { id: 'Office', label: 'Office', icon: '🖥️' },
  { id: 'Kitchen', label: 'Kitchen', icon: '🍳' },
  { id: 'Garden / Outdoor', label: 'Outdoor', icon: '🏡' },
  { id: 'Plants', label: 'Plants', icon: '🌿' },
  { id: 'Windows & Curtains', label: 'Windows', icon: '🪟' },
  { id: 'Rugs & Carpets', label: 'Rugs', icon: '🟪' },
  { id: 'Decor', label: 'Decor', icon: '🏺' },
  { id: 'Lighting', label: 'Lighting', icon: '💡' },
  { id: 'Fans', label: 'Fans', icon: '🌀' }
];

export default function FurnitureLibrary({ onClose, onSelect }) {
  const [activeCategory, setActiveCategory] = useState('Bedroom');
  const [search, setSearch] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0 });
  const [thumbnailBuster, setThumbnailBuster] = useState(Date.now());
  
  // Local state for Favorites and Recently Used
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('miniscene_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentlyUsed, setRecentlyUsed] = useState(() => {
    try {
      const saved = localStorage.getItem('miniscene_recent');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save favorites to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('miniscene_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (itemId, e) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  // List of subcategories for the active category
  const subcategoriesList = useMemo(() => {
    const items = CATALOG.filter(i => i.category === activeCategory);
    const subs = new Set(items.map(i => i.subcategory));
    return ['all', ...Array.from(subs)];
  }, [activeCategory]);

  // Reset filters when active category changes
  useEffect(() => {
    setSelectedSubcategory('all');
  }, [activeCategory]);

  // Handle item placement
  const handleItemSelect = (item) => {
    // Add to recently used
    setRecentlyUsed(prev => {
      const filtered = prev.filter(id => id !== item.id);
      const updated = [item.id, ...filtered].slice(0, 6);
      localStorage.setItem('miniscene_recent', JSON.stringify(updated));
      return updated;
    });
    onSelect(item);
  };

  // Filtered Catalog Items based on category, search, placement and subcategory
  const filteredItems = useMemo(() => {
    return CATALOG.filter(item => {
      // 1. Search filter (Name, Category, Subcategory, Tags)
      if (search) {
        const query = search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCategory = item.category.toLowerCase().includes(query);
        const matchesSubcategory = item.subcategory.toLowerCase().includes(query);
        const matchesTags = item.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesName && !matchesCategory && !matchesSubcategory && !matchesTags) {
          return false;
        }
      } else {
        // Category filter (only apply if search is empty)
        if (activeCategory === 'favorites') {
          if (!favorites.includes(item.id)) return false;
        } else if (item.category !== activeCategory) {
          return false;
        }
      }

      // 2. Placement Type filter
      if (selectedPlacement !== 'all' && item.placementType !== selectedPlacement) {
        return false;
      }

      // 3. Subcategory filter
      if (selectedSubcategory !== 'all' && !search && item.subcategory !== selectedSubcategory) {
        return false;
      }

      return true;
    });
  }, [search, activeCategory, selectedPlacement, selectedSubcategory, favorites]);

  // Map recently used IDs to catalog items
  const recentItemsList = useMemo(() => {
    return recentlyUsed
      .map(id => CATALOG.find(item => item.id === id))
      .filter(Boolean);
  }, [recentlyUsed]);

  return (
    <motion.div
      initial={{ x: -440 }}
      animate={{ x: 0 }}
      exit={{ x: -440 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="glass-panel furniture-library-drawer"
      style={{ 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: '#f8fafc' }}>Add Furniture</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Browse or search the 3D interior catalog</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button 
            onClick={() => setIsGenerating(true)}
            disabled={isGenerating}
            className="action-btn"
            title="Generate real thumbnails for all models"
            style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid var(--border)', 
              borderRadius: '50%', 
              padding: 6,
              color: isGenerating ? 'var(--text-muted)' : 'var(--teal)',
              opacity: isGenerating ? 0.5 : 1
            }}
          >
            <Sparkles size={16} />
          </button>
          <button onClick={onClose} className="action-btn" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '50%', padding: 6 }}><X size={16} /></button>
        </div>
      </div>

      {/* Thumbnail Generation Progress Bar */}
      {isGenerating && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.12)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.25)',
          padding: '8px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#a78bfa' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Loader size={12} style={{ animation: 'spin 1.5s linear infinite' }} />
              Generating catalog thumbnails...
            </span>
            <span>{genProgress.current} / {genProgress.total}</span>
          </div>
          <div style={{ height: 4, width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(genProgress.current / genProgress.total) * 100}%`,
              background: 'linear-gradient(90deg, #a78bfa, #06b6d4)',
              transition: 'width 0.2s ease-out'
            }} />
          </div>
        </div>
      )}

      {/* Search & Top Filters */}
      <div style={{ padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--border)' }}>
        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search catalog by name, tag, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', 
              padding: '10px 14px 10px 38px',
              background: 'rgba(0,0,0,0.3)', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, 
              color: '#f8fafc', 
              outline: 'none', 
              fontSize: '0.85rem',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          {search && (
            <button 
              onClick={() => setSearch('')} 
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters Controls Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {/* Placement Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Filter size={10} /> Placement:</span>
            <select
              value={selectedPlacement}
              onChange={e => setSelectedPlacement(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(15,23,42,0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                color: '#e2e8f0',
                fontSize: '0.75rem',
                padding: '4px 6px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Levels</option>
              <option value="floor">Floor</option>
              <option value="floor-flat">Floor-Flat (Rugs)</option>
              <option value="wall">Wall Mounted</option>
              <option value="ceiling">Ceiling Mounted</option>
              <option value="table-top">Tabletop</option>
            </select>
          </div>

          {/* Grid/List Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, padding: 2 }}>
            <button 
              onClick={() => setViewMode('grid')}
              style={{ padding: '4px 8px', background: viewMode === 'grid' ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', borderRadius: 6, color: viewMode === 'grid' ? 'var(--teal)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Grid size={13} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              style={{ padding: '4px 8px', background: viewMode === 'list' ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', borderRadius: 6, color: viewMode === 'list' ? 'var(--teal)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Categories */}
        {!search && (
          <div style={{ width: 85, borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
            {/* Standard Categories */}
            {CATEGORIES.map(cat => (
              <div
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '12px 6px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  cursor: 'pointer', fontSize: '0.68rem', textAlign: 'center', fontWeight: 500,
                  background: activeCategory === cat.id ? 'rgba(6,182,212,0.1)' : 'transparent',
                  borderLeft: `3px solid ${activeCategory === cat.id ? 'var(--teal)' : 'transparent'}`,
                  color: activeCategory === cat.id ? '#06b6d4' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                  userSelect: 'none'
                }}
              >
                <span style={{ fontSize: '1.4rem', filter: activeCategory === cat.id ? 'drop-shadow(0 0 4px rgba(6,182,212,0.3))' : 'none' }}>{cat.icon}</span>
                <span style={{ fontSize: '0.62rem', marginTop: 2, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>{cat.label}</span>
              </div>
            ))}

            <div style={{ margin: '8px 0', borderTop: '1px solid var(--border)' }} />

            {/* Favorites Tab */}
            <div
              onClick={() => setActiveCategory('favorites')}
              style={{
                padding: '12px 6px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                cursor: 'pointer', fontSize: '0.68rem', textAlign: 'center', fontWeight: 500,
                background: activeCategory === 'favorites' ? 'rgba(251,191,36,0.1)' : 'transparent',
                borderLeft: `3px solid ${activeCategory === 'favorites' ? '#fbbf24' : 'transparent'}`,
                color: activeCategory === 'favorites' ? '#fbbf24' : 'var(--text-muted)',
                transition: 'all 0.2s',
                userSelect: 'none',
                marginTop: 'auto',
                marginBottom: 10
              }}
            >
              <Star size={16} fill={activeCategory === 'favorites' ? '#fbbf24' : 'none'} style={{ color: activeCategory === 'favorites' ? '#fbbf24' : 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.62rem', marginTop: 2 }}>Favorites ({favorites.length})</span>
            </div>
          </div>
        )}

        {/* Content Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(0,0,0,0.05)' }}>
          
          {/* Subcategory Row (Only visible when not searching and category is not favorites) */}
          {!search && activeCategory !== 'favorites' && subcategoriesList.length > 2 && (
            <div style={{ padding: '8px 14px', background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
              {subcategoriesList.map(sub => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubcategory(sub)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 14,
                    border: '1px solid',
                    borderColor: selectedSubcategory === sub ? 'var(--teal)' : 'rgba(255,255,255,0.08)',
                    background: selectedSubcategory === sub ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.02)',
                    color: selectedSubcategory === sub ? '#06b6d4' : 'var(--text-muted)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontWeight: selectedSubcategory === sub ? 600 : 400,
                    transition: 'all 0.15s'
                  }}
                >
                  {sub === 'all' ? 'All' : sub}
                </button>
              ))}
            </div>
          )}

          {/* Shelf of Recently Used (Top shelf inside grid area) */}
          {!search && activeCategory !== 'favorites' && recentItemsList.length > 0 && selectedSubcategory === 'all' && (
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> Recently Placed
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {recentItemsList.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleItemSelect(item)}
                    title={`${item.name} (${item.category})`}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    <span>{item.icon}</span>
                    <span style={{ maxWidth: 80, textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid of Items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {viewMode === 'grid' ? (
              // GRID VIEW
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'start' }}>
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, idx) => {
                    const isFav = favorites.includes(item.id);
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.88 }}
                        transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.2) }}
                        className="furniture-icon-card"
                        onClick={() => handleItemSelect(item)}
                        style={{ position: 'relative' }}
                      >
                        {/* Favorite button */}
                        <button
                          onClick={(e) => toggleFavorite(item.id, e)}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            background: 'rgba(15,23,42,0.6)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '50%',
                            padding: 4,
                            cursor: 'pointer',
                            display: 'flex',
                            zIndex: 10
                          }}
                        >
                          <Star size={12} fill={isFav ? '#fbbf24' : 'none'} style={{ color: isFav ? '#fbbf24' : '#94a3b8' }} />
                        </button>

                        <div className="furniture-preview-container">
                          <FurniturePreviewImage item={item} buster={thumbnailBuster} />
                        </div>
                        <div className="furniture-info" style={{ padding: '6px 8px' }}>
                          <div className="furniture-name" style={{ fontSize: '0.75rem', lineHeight: '1.2', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</div>
                          <div className="furniture-dim" style={{ fontSize: '0.62rem', marginTop: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{item.size[0].toFixed(1)}m × {item.size[2].toFixed(1)}m</span>
                            <span style={{ opacity: 0.6, fontSize: '0.58rem', textTransform: 'capitalize' }}>{item.material}</span>
                          </div>
                          
                          {/* Color dots preview */}
                          {item.colorOptions && item.colorOptions.length > 0 && (
                            <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                              {item.colorOptions.slice(0, 5).map((color, cIdx) => (
                                <div 
                                  key={cIdx} 
                                  style={{ width: 6, height: 6, borderRadius: '50%', background: color, border: '0.5px solid rgba(255,255,255,0.2)' }} 
                                />
                              ))}
                              {item.colorOptions.length > 5 && (
                                <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', lineHeight: '6px' }}>+</span>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              // LIST VIEW
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, idx) => {
                    const isFav = favorites.includes(item.id);
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.2) }}
                        onClick={() => handleItemSelect(item)}
                        style={{
                          padding: '8px 10px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent)';
                          e.currentTarget.style.background = 'rgba(99,102,241,0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                          <FurniturePreviewImage item={item} buster={thumbnailBuster} className="list-preview" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f8fafc', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', gap: 6, marginTop: 1 }}>
                            <span>Size: {item.size[0].toFixed(1)}w × {item.size[1].toFixed(1)}h × {item.size[2].toFixed(1)}d</span>
                            <span>•</span>
                            <span style={{ textTransform: 'capitalize' }}>{item.material}</span>
                            <span>•</span>
                            <span style={{ textTransform: 'uppercase', fontSize: '0.6rem', color: 'var(--teal)' }}>{item.placementType}</span>
                          </div>
                        </div>

                        {/* Favorite button */}
                        <button
                          onClick={(e) => toggleFavorite(item.id, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            padding: 4
                          }}
                        >
                          <Star size={14} fill={isFav ? '#fbbf24' : 'none'} style={{ color: isFav ? '#fbbf24' : '#475569' }} />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {filteredItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No items found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Offscreen R3F Thumbnail Generator */}
      <ThumbnailGenerator 
        items={CATALOG}
        isGenerating={isGenerating}
        onProgress={(curr, tot) => setGenProgress({ current: curr, total: tot })}
        onComplete={() => {
          setIsGenerating(false);
          setThumbnailBuster(Date.now());
        }}
      />
    </motion.div>
  );
}
