import * as THREE from 'three';

export function generateCVData(settings) {
  const numFrames = 15;
  const radius = 6 * settings.roomScale;
  const cameras = [];
  const features = [];
  const featureMatches = [];

  const centerTarget = new THREE.Vector3(0, settings.floorHeight + 1, 0);

  // Generate cameras in an arc around the room
  for (let i = 0; i < numFrames; i++) {
    const angle = (i / (numFrames - 1)) * Math.PI - Math.PI / 2; // -90 to 90 degrees
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const y = settings.floorHeight + 1.8; // Camera height
    
    const position = new THREE.Vector3(x, y, z);
    
    // Calculate rotation to look at center
    const m = new THREE.Matrix4().lookAt(position, centerTarget, new THREE.Vector3(0,1,0));
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(m);
    const rotation = new THREE.Euler().setFromQuaternion(quaternion);

    cameras.push({
      id: `cam_${i}`,
      position: [position.x, position.y, position.z],
      rotation: [rotation.x, rotation.y, rotation.z],
      timestamp: i * 0.5
    });

    // Generate random feature points for this frame
    const frameFeatures = [];
    for (let f = 0; f < 20; f++) {
      // Points roughly in front of the camera
      const fX = position.x + (Math.random() - 0.5) * 4 - Math.sin(angle) * 3;
      const fZ = position.z + (Math.random() - 0.5) * 4 - Math.cos(angle) * 3;
      const fY = settings.floorHeight + Math.random() * 3;
      frameFeatures.push([fX, fY, fZ]);
    }
    features.push(frameFeatures);

    // Generate matches with previous frame
    if (i > 0) {
      for (let m = 0; m < 10; m++) {
        // Pick random feature from previous and current to link
        const prevP = features[i-1][Math.floor(Math.random() * features[i-1].length)];
        const currP = frameFeatures[Math.floor(Math.random() * frameFeatures.length)];
        featureMatches.push({ start: prevP, end: currP, frameIdx: i });
      }
    }
  }

  // Analytics
  return {
    cameras,
    features,
    featureMatches,
    analytics: {
      totalFrames: numFrames,
      matchedFeatures: featureMatches.length * 142, // Mock large number
      processingTime: '1.24s',
      confidence: '94.2%',
      pointCount: 142058
    }
  };
}
