export function generateRecommendations(objects, placedItems, settings) {
  const width = 10 * settings.roomScale;
  const depth = 10 * settings.roomScale;
  
  const allObjects = [
    ...objects.map(o => ({ center: o.box_3d?.center || [0,0,0], size: o.box_3d?.size || [1,1,1] })),
    ...placedItems.map(p => ({ center: p.position, size: p.scale }))
  ];

  const checkCollision = (pos, rX, rZ) => {
    for (const obj of allObjects) {
      const dx = Math.abs(pos[0] - obj.center[0]);
      const dz = Math.abs(pos[2] - obj.center[2]);
      if (dx < (rX + obj.size[0]/2 + 0.5) && dz < (rZ + obj.size[2]/2 + 0.5)) {
        return true;
      }
    }
    return false;
  };

  const recommendations = [];
  
  // Rule 1: Bed against back wall
  const bedPos = [0, settings.floorHeight, -depth/2 + 1.2];
  if (!checkCollision(bedPos, 1, 1)) {
    recommendations.push({
      id: 'rec_bed_1', type: 'Bed', name: 'Modern Bed',
      position: bedPos, rotation: [0, 0, 0], score: 0.94,
      reason: 'Aligns symmetrically with the longest back wall.',
      efficiency: '+12%'
    });
  }

  // Rule 2: Sofa facing open space
  const sofaPos = [0, settings.floorHeight, 1];
  if (!checkCollision(sofaPos, 1, 0.5)) {
    recommendations.push({
      id: 'rec_sofa_1', type: 'Sofa', name: 'Lounge Sofa',
      position: sofaPos, rotation: [0, 0, 0], score: 0.89,
      reason: 'Faces the center open space, ideal for a TV setup.',
      efficiency: '+8%'
    });
  }

  // Rule 3: Plant in back-left corner
  const plantPos1 = [-width/2 + 0.8, settings.floorHeight, -depth/2 + 0.8];
  if (!checkCollision(plantPos1, 0.5, 0.5)) {
    recommendations.push({
      id: 'rec_plant_1', type: 'Plant', name: 'Monstera',
      position: plantPos1, rotation: [0, 0, 0], score: 0.95,
      reason: 'Fills the empty corner gracefully without blocking pathways.',
      efficiency: '+3%'
    });
  }

  // Rule 4: Cupboard against right wall
  const cupPos = [width/2 - 0.6, settings.floorHeight, -1];
  if (!checkCollision(cupPos, 0.6, 1)) {
    recommendations.push({
      id: 'rec_cupboard_1', type: 'Cupboard', name: 'Wardrobe',
      position: cupPos, rotation: [0, -Math.PI/2, 0], score: 0.85,
      reason: 'Maximizes vertical storage along the secondary wall.',
      efficiency: '+15%'
    });
  }

  return recommendations;
}
