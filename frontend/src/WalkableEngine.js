import * as THREE from 'three';

export function generateWalkableMap(objects, placedItems, settings) {
  const width = 10 * settings.roomScale;
  const depth = 10 * settings.roomScale;
  
  const allObjects = [
    ...objects.map(o => ({ center: o.box_3d?.center || [0,0,0], size: o.box_3d?.size || [1,1,1] })),
    ...placedItems.map(p => ({ center: p.position, size: p.scale }))
  ];

  const gridSize = 100; // 100x100 grid
  const grid = new Array(gridSize).fill(0).map(() => new Array(gridSize).fill(0));
  // 0 = Walkable (Green), 1 = Narrow (Yellow), 2 = Blocked (Red)

  const toGrid = (x, z) => {
    const gx = Math.floor(((x + width/2) / width) * gridSize);
    const gz = Math.floor(((z + depth/2) / depth) * gridSize);
    return [Math.max(0, Math.min(gridSize-1, gx)), Math.max(0, Math.min(gridSize-1, gz))];
  };

  // Mark blocked and narrow
  allObjects.forEach(obj => {
    const hw = obj.size[0] / 2;
    const hd = obj.size[2] / 2;
    
    // Narrow bounds (yellow)
    const [nx1, nz1] = toGrid(obj.center[0] - hw - 0.5, obj.center[2] - hd - 0.5);
    const [nx2, nz2] = toGrid(obj.center[0] + hw + 0.5, obj.center[2] + hd + 0.5);
    
    for (let x = nx1; x <= nx2; x++) {
      for (let z = nz1; z <= nz2; z++) {
        grid[z][x] = Math.max(grid[z][x], 1);
      }
    }

    // Blocked bounds (red)
    const [bx1, bz1] = toGrid(obj.center[0] - hw, obj.center[2] - hd);
    const [bx2, bz2] = toGrid(obj.center[0] + hw, obj.center[2] + hd);
    
    for (let x = bx1; x <= bx2; x++) {
      for (let z = bz1; z <= bz2; z++) {
        grid[z][x] = 2; // Blocked
      }
    }
  });

  // Calculate Analytics
  let walkCount = 0, narrowCount = 0, blockedCount = 0;
  for (let z = 0; z < gridSize; z++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[z][x] === 0) walkCount++;
      else if (grid[z][x] === 1) narrowCount++;
      else blockedCount++;
    }
  }

  const totalCells = gridSize * gridSize;
  const walkPercent = Math.round((walkCount / totalCells) * 100);
  const narrowPercent = Math.round((narrowCount / totalCells) * 100);
  const blockedPercent = Math.round((blockedCount / totalCells) * 100);

  let freedomScore = "Excellent";
  if (blockedPercent > 40) freedomScore = "Poor";
  else if (walkPercent < 50) freedomScore = "Moderate";

  // Generate Texture
  const canvas = document.createElement('canvas');
  canvas.width = gridSize;
  canvas.height = gridSize;
  const ctx = canvas.getContext('2d');

  for (let z = 0; z < gridSize; z++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[z][x] === 0) ctx.fillStyle = '#22c55e'; // Green
      else if (grid[z][x] === 1) ctx.fillStyle = '#facc15'; // Yellow
      else ctx.fillStyle = '#ef4444'; // Red
      ctx.fillRect(x, z, 1, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;

  // Simple A* Path Simulation
  const path = findPath(grid, gridSize);
  const worldPath = path.map(p => {
    const x = (p[0] / gridSize) * width - width/2;
    const z = (p[1] / gridSize) * depth - depth/2;
    return [x, settings.floorHeight + 0.1, z];
  });

  return {
    texture,
    path: worldPath,
    analytics: {
      walkPercent, narrowPercent, blockedPercent, freedomScore
    }
  };
}

// Minimal A* for Path Simulation
function findPath(grid, size) {
  // Try to find a path from bottom-middle to top-middle
  const start = [Math.floor(size/2), size-1];
  const end = [Math.floor(size/2), 0];
  
  // If start or end is blocked, just return an empty path
  if (grid[start[1]][start[0]] === 2 || grid[end[1]][end[0]] === 2) return [];

  const open = [start];
  const cameFrom = {};
  const gScore = {};
  gScore[`${start[0]},${start[1]}`] = 0;

  const fScore = {};
  fScore[`${start[0]},${start[1]}`] = Math.abs(start[0]-end[0]) + Math.abs(start[1]-end[1]);

  let iters = 0;
  while (open.length > 0 && iters < 2000) {
    iters++;
    // Get lowest fScore
    let currIdx = 0;
    for (let i = 1; i < open.length; i++) {
      const a = `${open[i][0]},${open[i][1]}`;
      const b = `${open[currIdx][0]},${open[currIdx][1]}`;
      if ((fScore[a] || Infinity) < (fScore[b] || Infinity)) currIdx = i;
    }
    
    const curr = open.splice(currIdx, 1)[0];
    const currKey = `${curr[0]},${curr[1]}`;

    if (curr[0] === end[0] && curr[1] === end[1]) {
      const path = [curr];
      let step = currKey;
      while (cameFrom[step]) {
        const prev = cameFrom[step];
        path.push(prev);
        step = `${prev[0]},${prev[1]}`;
      }
      return path.reverse();
    }

    const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
    for (const d of dirs) {
      const nx = curr[0] + d[0];
      const nz = curr[1] + d[1];
      if (nx >= 0 && nx < size && nz >= 0 && nz < size && grid[nz][nx] !== 2) { // 2 is blocked
        const nKey = `${nx},${nz}`;
        const penalty = grid[nz][nx] === 1 ? 5 : 1; // Try to avoid yellow zones if possible
        const tgScore = gScore[currKey] + penalty;
        if (tgScore < (gScore[nKey] || Infinity)) {
          cameFrom[nKey] = curr;
          gScore[nKey] = tgScore;
          fScore[nKey] = tgScore + Math.abs(nx-end[0]) + Math.abs(nz-end[1]);
          if (!open.find(p => p[0]===nx && p[1]===nz)) open.push([nx, nz]);
        }
      }
    }
  }
  return []; // No path
}
