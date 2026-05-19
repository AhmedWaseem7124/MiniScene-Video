from __future__ import annotations

import json
from pathlib import Path
from urllib.request import urlopen


def _download_text(url: str) -> str:
    with urlopen(url, timeout=30) as resp:
        return resp.read().decode("utf-8").strip()


def _ensure_vendor_modules(out_dir: Path) -> tuple[str, str, str]:
    vendor_dir = out_dir / "_vendor"
    vendor_dir.mkdir(parents=True, exist_ok=True)

    three_path = vendor_dir / "three.module.js"
    controls_path = vendor_dir / "PointerLockControls.js"
    ply_path = vendor_dir / "PLYLoader.js"

    if not three_path.exists():
        three_path.write_text(
            _download_text("https://unpkg.com/three@0.160.0/build/three.module.js"),
            encoding="utf-8",
        )

    if not controls_path.exists():
        controls_src = _download_text("https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js")
        controls_src = controls_src.replace("from 'three';", "from './three.module.js';")
        controls_src = controls_src.replace('from "three";', 'from "./three.module.js";')
        controls_path.write_text(controls_src, encoding="utf-8")

    if not ply_path.exists():
        ply_src = _download_text("https://unpkg.com/three@0.160.0/examples/jsm/loaders/PLYLoader.js")
        ply_src = ply_src.replace("from 'three';", "from './three.module.js';")
        ply_src = ply_src.replace('from "three";', 'from "./three.module.js";')
        ply_path.write_text(ply_src, encoding="utf-8")

    return (
        "./_vendor/three.module.js",
        "./_vendor/PointerLockControls.js",
        "./_vendor/PLYLoader.js",
    )


def write_immersive_scene_html(
    path: str | Path,
    mesh_file: str = "mesh_open3d.ply",
    point_cloud_file: str = "point_cloud_open3d.ply",
    objects_file: str | None = None,
) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    three_mod, controls_mod, ply_mod = _ensure_vendor_modules(path.parent)

    objects_ref = json.dumps(objects_file) if objects_file else "null"

    html = f"""<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>MiniScene Immersive Viewer</title>
  <style>
    html, body {{ margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #141a24; }}
    #app {{ width: 100%; height: 100%; }}
    #hud {{
      position: fixed;
      top: 12px;
      left: 12px;
      color: #e9eef7;
      font-family: Consolas, monospace;
      font-size: 12px;
      background: rgba(0,0,0,0.45);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      padding: 10px;
      line-height: 1.45;
      z-index: 10;
      max-width: 420px;
    }}
    #center-dot {{
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 7px;
      height: 7px;
      border: 1px solid #fff;
      border-radius: 50%;
      pointer-events: none;
      opacity: 0.8;
      z-index: 11;
    }}
  </style>
</head>
<body>
  <div id=\"hud\">
    <div><strong>MiniScene Immersive Mode</strong></div>
    <div>Click scene to lock cursor + enter first person</div>
    <div>Move: W A S D | Up/Down: E Q | Sprint: Shift</div>
    <div>Unlock cursor: ESC</div>
    <div>Click while locked: inspect object / place marker</div>
    <div id=\"status\">Loading scene mesh...</div>
    <div id=\"objects\">Objects: pending</div>
    <div id=\"pick\">Pick: none</div>
    <div style=\"margin-top:8px;\"><label><input id=\"show-mesh\" type=\"checkbox\" /> Show mesh cloud</label></div>
    <div style=\"margin-top:8px;\">Local mesh fallback (.ply): <input id=\"local-mesh\" type=\"file\" accept=\".ply\" /></div>
  </div>
  <div id=\"center-dot\"></div>
  <div id=\"app\"></div>

  <script>
    window.__immersiveModuleReady = false;
    setTimeout(() => {{
      if (window.__immersiveModuleReady) return;
      const statusEl = document.getElementById('status');
      if (statusEl) {{
        statusEl.textContent = 'Viewer scripts failed to load. Keep local server running and refresh.';
      }}
    }}, 3500);
  </script>

  <script type=\"module\">
    import * as THREE from '{three_mod}';
    import {{ PointerLockControls }} from '{controls_mod}';
    import {{ PLYLoader }} from '{ply_mod}';

    window.__immersiveModuleReady = true;

    const app = document.getElementById('app');
    const statusEl = document.getElementById('status');
    const objectsEl = document.getElementById('objects');
    const pickEl = document.getElementById('pick');
    const localMeshInput = document.getElementById('local-mesh');
    const showMeshInput = document.getElementById('show-mesh');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141a24);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 2000);
    camera.position.set(0, 1.6, 3.5);

    const renderer = new THREE.WebGLRenderer({{ antialias: true }});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    app.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xd8ebff, 0x2a3240, 1.35);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.05);
    dir.position.set(5, 8, 4);
    scene.add(dir);

    const grid = new THREE.GridHelper(100, 100, 0x6d7f9f, 0x3a4352);
    grid.position.y = -2.0;
    scene.add(grid);

    if (window.location.protocol === 'file:') {{
      statusEl.textContent = 'Opened in file mode. Browser may block loading .ply files. Use local server or file picker.';
    }}

    const controls = new PointerLockControls(camera, document.body);
    document.addEventListener('click', () => {{
      if (!controls.isLocked) controls.lock();
    }});

    const keys = {{}};
    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    const raycaster = new THREE.Raycaster();
    const markerGeo = new THREE.SphereGeometry(0.04, 14, 14);
    const markerMat = new THREE.MeshBasicMaterial({{ color: 0xff5a5a }});
    let marker = null;
    let sceneGeometryObject = null;
    const interactables = [];

    function placeMarker(mesh) {{
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hits = raycaster.intersectObject(mesh, true);
      if (!hits.length) return;

      const p = hits[0].point;
      if (!marker) {{
        marker = new THREE.Mesh(markerGeo, markerMat);
        scene.add(marker);
      }}
      marker.position.copy(p);
      pickEl.textContent = `Pick: x=${{p.x.toFixed(2)}} y=${{p.y.toFixed(2)}} z=${{p.z.toFixed(2)}}`;
    }}

    function makeLabelSprite(text) {{
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#eaf1ff';
      ctx.font = 'bold 42px Consolas';
      ctx.fillText(text, 16, 78);
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({{ map: tex, transparent: true }});
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.9, 0.22, 1);
      return sprite;
    }}

    function labelColor(label) {{
      const l = String(label || '').toLowerCase();
      if (l.includes('person')) return 0x44d17a;
      if (l.includes('bench') || l.includes('chair')) return 0xb48a63;
      if (l.includes('tree') || l.includes('plant')) return 0x4fa765;
      return 0xffad33;
    }}

    function buildPrimitiveForObject(obj) {{
      const label = String(obj.label || '').toLowerCase();
      const size = Array.isArray(obj.size_m) ? obj.size_m : [0.45, 1.2, 0.45];
      const w = Math.max(0.12, Number(size[0] || 0.45));
      const h = Math.max(0.18, Number(size[1] || 1.2));
      const d = Math.max(0.08, Number(size[2] || 0.45));
      const color = labelColor(label);
      const group = new THREE.Group();

      if (label.includes('person')) {{
        const mat = new THREE.MeshStandardMaterial({{ color, roughness: 0.72, metalness: 0.05 }});
        const torso = new THREE.Mesh(
          new THREE.CapsuleGeometry(Math.max(0.08, w * 0.22), Math.max(0.35, h * 0.38), 6, 10),
          mat
        );
        torso.position.y = h * 0.45;
        group.add(torso);

        const head = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.09, w * 0.12), 12, 12), mat);
        head.position.y = h * 0.78;
        group.add(head);

        const legMat = mat;
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, Math.max(0.28, h * 0.28), 8), legMat);
        legL.position.set(-0.08, h * 0.2, 0.0);
        const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, Math.max(0.28, h * 0.28), 8), legMat);
        legR.position.set(0.08, h * 0.2, 0.0);
        group.add(legL);
        group.add(legR);
      }} else if (label.includes('bench') || label.includes('chair')) {{
        const seat = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(0.6, w), Math.max(0.12, h * 0.22), Math.max(0.3, d)),
          new THREE.MeshStandardMaterial({{ color, roughness: 0.75, metalness: 0.08 }})
        );
        seat.position.y = Math.max(0.2, h * 0.35);
        const back = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(0.6, w), Math.max(0.25, h * 0.35), Math.max(0.08, d * 0.2)),
          new THREE.MeshStandardMaterial({{ color: color + 0x111111, roughness: 0.75, metalness: 0.08 }})
        );
        back.position.y = Math.max(0.35, h * 0.55);
        back.position.z = -Math.max(0.11, d * 0.42);
        group.add(seat);
        group.add(back);
      }} else if (label.includes('tree') || label.includes('plant')) {{
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(Math.max(0.07, w * 0.12), Math.max(0.11, w * 0.18), Math.max(0.6, h * 0.65), 10),
          new THREE.MeshStandardMaterial({{ color: 0x7c5533, roughness: 0.9, metalness: 0.02 }})
        );
        trunk.position.y = Math.max(0.35, h * 0.32);
        const crown = new THREE.Mesh(
          new THREE.SphereGeometry(Math.max(0.3, w * 0.5), 14, 14),
          new THREE.MeshStandardMaterial({{ color: 0x3f8e54, roughness: 0.85, metalness: 0.03 }})
        );
        crown.position.y = Math.max(0.8, h * 0.85);
        group.add(trunk);
        group.add(crown);
      }} else {{
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(w, Math.max(0.2, h * 0.55), d),
          new THREE.MeshStandardMaterial({{ color, roughness: 0.75, metalness: 0.08 }})
        );
        box.position.y = Math.max(0.2, h * 0.3);
        group.add(box);
      }}

      return {{ group, h }};
    }}

    function addObjectAnchors(payload) {{
      if (!payload || !Array.isArray(payload.objects) || !payload.objects.length) {{
        objectsEl.textContent = 'Objects: none detected';
        return;
      }}

      const anchors = new THREE.Group();

      for (const obj of payload.objects) {{
        if (!obj.position_world || obj.position_world.length !== 3) continue;
        const x = obj.position_world[0];
        const y = obj.position_world[1];
        const z = obj.position_world[2];

        const built = buildPrimitiveForObject(obj);
        const g = built.group;
        g.position.set(x, y, z);
        g.userData.objectInfo = obj;
        anchors.add(g);

        const distText = Number(obj.distance_m).toFixed(2);
        const label = makeLabelSprite(`${{obj.label}} (${{distText}}m)`);
        label.position.set(x, y + Math.max(0.4, built.h * 0.9), z);
        anchors.add(label);
      }}

      scene.add(anchors);
      objectsEl.textContent = `Objects: ${{payload.objects.length}} loaded`;
    }}

    const loader = new PLYLoader();

    function onPlyProgress(xhr) {{
      if (!xhr || !xhr.total) return;
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      statusEl.textContent = `Loading scene mesh... ${{pct}}%`;
    }}

    function finalizeObject(geometry, asPoints) {{
      geometry.computeBoundingSphere();
      geometry.computeVertexNormals();

      let object;
      if (asPoints) {{
        const mat = new THREE.PointsMaterial({{
          size: 0.02,
          vertexColors: !!geometry.attributes.color,
          color: geometry.attributes.color ? 0xffffff : 0x94b9ff,
          opacity: 0.92,
          transparent: true,
        }});
        object = new THREE.Points(geometry, mat);
        statusEl.textContent = 'Loaded point-cloud fallback. Controls active.';
      }} else {{
        const mat = new THREE.MeshStandardMaterial({{
          color: 0x87a7d6,
          vertexColors: !!geometry.attributes.color,
          metalness: 0.08,
          roughness: 0.82,
          side: THREE.DoubleSide,
        }});
        object = new THREE.Mesh(geometry, mat);
        statusEl.textContent = 'Loaded mesh scene. Controls active.';
      }}

      if (sceneGeometryObject) {{
        scene.remove(sceneGeometryObject);
      }}
      sceneGeometryObject = object;
      sceneGeometryObject.visible = !!showMeshInput.checked;

      if (!sceneGeometryObject.visible) {{
        statusEl.textContent = 'Mesh loaded and hidden. Enable "Show mesh cloud" to display it.';
      }}

      scene.add(object);
      interactables.push(object);

      const bs = geometry.boundingSphere;
      const rad = bs ? bs.radius : 3;
      const c = bs ? bs.center : new THREE.Vector3(0, 0, 0);
      camera.position.set(c.x + rad * 0.15, c.y + rad * 0.25, c.z + rad * 1.6);
      camera.lookAt(c.x, c.y, c.z);
      controls.getObject().position.copy(camera.position);
    }}

    loader.load(
      './{mesh_file}',
      (geometry) => finalizeObject(geometry, false),
      onPlyProgress,
      (err) => {{
        console.error('Mesh load failed', err);
        statusEl.textContent = 'Mesh not found, loading point cloud fallback...';
        loader.load(
          './{point_cloud_file}',
          (geometry) => finalizeObject(geometry, true),
          onPlyProgress,
          (err2) => {{
            console.error('Point cloud load failed', err2);
            statusEl.textContent = 'Failed to load mesh and point cloud. Start a local server and ensure files exist.';
          }}
        );
      }}
    );

    localMeshInput.addEventListener('change', async (event) => {{
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {{
        const buf = await file.arrayBuffer();
        const geometry = loader.parse(buf);
        finalizeObject(geometry, false);
        statusEl.textContent = `Loaded local mesh: ${{file.name}}`;
      }} catch (err) {{
        statusEl.textContent = `Failed to parse local mesh: ${{err}}`;
      }}
    }});

    showMeshInput.addEventListener('change', () => {{
      if (!sceneGeometryObject) return;
      sceneGeometryObject.visible = !!showMeshInput.checked;
      if (sceneGeometryObject.visible) {{
        statusEl.textContent = 'Mesh shown. Controls active.';
      }} else {{
        statusEl.textContent = 'Mesh hidden. Object anchors remain visible.';
      }}
    }});

    const objectsFile = {objects_ref};
    if (objectsFile) {{
      fetch(`./${{objectsFile}}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((payload) => {{
          addObjectAnchors(payload);
        }})
        .catch(() => {{
          objectsEl.textContent = 'Objects: failed to load';
        }});
    }} else {{
      objectsEl.textContent = 'Objects: no object file';
    }}

    window.addEventListener('mousedown', () => {{
      if (!controls.isLocked || !interactables.length) return;

      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const allHits = raycaster.intersectObjects(scene.children, true);
      const objectHit = allHits.find((h) => h.object && h.object.userData && h.object.userData.objectInfo);
      if (objectHit) {{
        const obj = objectHit.object.userData.objectInfo;
        pickEl.textContent = `Pick: ${{obj.label}} @ ${{Number(obj.distance_m).toFixed(2)}}m`;
        return;
      }}

      placeMarker(interactables[0]);
    }});

    let prev = performance.now();
    let tAccum = 0;

    function sampleTrackPosition(points, frameValue) {{
      if (points.length === 1) return points[0].pos;
      if (frameValue <= points[0].frame) return points[0].pos;
      if (frameValue >= points[points.length - 1].frame) return points[points.length - 1].pos;

      for (let i = 0; i < points.length - 1; i++) {{
        const a = points[i];
        const b = points[i + 1];
        if (frameValue >= a.frame && frameValue <= b.frame) {{
          const span = Math.max(1e-6, b.frame - a.frame);
          const alpha = (frameValue - a.frame) / span;
          return new THREE.Vector3().copy(a.pos).lerp(b.pos, alpha);
        }}
      }}
      return points[points.length - 1].pos;
    }}

    function animate(now) {{
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      tAccum += dt;

      if (controls.isLocked) {{
        const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? 4.2 : 2.2;
        const move = speed * dt;
        if (keys['KeyW']) controls.moveForward(move);
        if (keys['KeyS']) controls.moveForward(-move);
        if (keys['KeyA']) controls.moveRight(-move);
        if (keys['KeyD']) controls.moveRight(move);
        if (keys['KeyE']) camera.position.y += move;
        if (keys['KeyQ']) camera.position.y -= move;
      }}

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }}

    requestAnimationFrame(animate);

    window.addEventListener('resize', () => {{
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }});
  </script>
</body>
</html>
"""

    path.write_text(html, encoding="utf-8")
