export function generateSceneGraph(objects, placedItems, settings) {
  const allObjects = [
    ...objects.map(o => ({
      id: o.id,
      label: o.label,
      center: [o.box_3d?.center[0] || 0, settings.floorHeight, o.box_3d?.center[2] || 0],
      size: o.box_3d?.size || [1, 1, 1],
      rotation: [0, 0, 0] // Default for detected
    })),
    ...placedItems.map(p => ({
      id: p.id,
      label: p.name,
      center: [p.position[0], p.position[1], p.position[2]],
      size: p.scale,
      rotation: p.rotation || [0, 0, 0]
    }))
  ];

  const edges = [];
  const adjacencyList = {};
  allObjects.forEach(obj => adjacencyList[obj.id] = []);

  for (let i = 0; i < allObjects.length; i++) {
    for (let j = 0; j < allObjects.length; j++) {
      if (i === j) continue;
      const a = allObjects[i];
      const b = allObjects[j];

      const dx = b.center[0] - a.center[0];
      const dy = b.center[1] - a.center[1];
      const dz = b.center[2] - a.center[2];
      const distXZ = Math.sqrt(dx * dx + dz * dz);
      const distTotal = Math.sqrt(dx*dx + dy*dy + dz*dz);

      const rA = Math.max(a.size[0], a.size[2]) / 2;
      const rB = Math.max(b.size[0], b.size[2]) / 2;
      const clearance = distXZ - (rA + rB);

      let relation = null;

      if (dy > (a.size[1]/2 + b.size[1]/2 - 0.1) && distXZ < Math.max(a.size[0], a.size[2])) {
        relation = "on_top_of"; // b is on top of a
      } else if (clearance < 0.2) {
        relation = "attached_to";
      } else if (clearance < 1.0) {
        // Simple directional check ignoring rotation for now, using absolute axes
        if (Math.abs(dx) > Math.abs(dz)) {
          relation = "next_to";
        } else {
          relation = dz > 0 ? "in_front_of" : "behind";
        }
      } else if (clearance < 2.5) {
        relation = "near";
      }

      // Special facing rule for placed objects with rotation (rough heuristic)
      if (a.rotation[1] !== 0 && clearance < 3) {
        const dirX = Math.sin(a.rotation[1]);
        const dirZ = Math.cos(a.rotation[1]);
        const dot = (dx * dirX + dz * dirZ) / distXZ;
        if (dot > 0.8) relation = "facing";
      }

      if (relation) {
        edges.push({
          id: `${a.id}->${b.id}`,
          source: a.id,
          target: b.id,
          relation: relation,
          start: a.center,
          end: b.center
        });
        adjacencyList[a.id].push(b.id);
      }
    }
  }

  // Analytics
  let maxEdges = 0;
  let centralObjectId = null;
  const isolatedObjects = [];
  
  Object.keys(adjacencyList).forEach(id => {
    const count = adjacencyList[id].length;
    if (count === 0) isolatedObjects.push(id);
    if (count > maxEdges) {
      maxEdges = count;
      centralObjectId = id;
    }
  });

  const centralObject = allObjects.find(o => o.id === centralObjectId);

  // Connected Components (Clusters)
  const visited = new Set();
  let clusters = 0;
  
  const dfs = (nodeId) => {
    visited.add(nodeId);
    adjacencyList[nodeId].forEach(neighbor => {
      if (!visited.has(neighbor)) dfs(neighbor);
    });
  };

  Object.keys(adjacencyList).forEach(id => {
    if (!visited.has(id)) {
      clusters++;
      dfs(id);
    }
  });

  return {
    nodes: allObjects,
    edges,
    analytics: {
      centralObject: centralObject ? centralObject.label : "None",
      isolatedCount: isolatedObjects.length,
      clusterCount: clusters
    }
  };
}
