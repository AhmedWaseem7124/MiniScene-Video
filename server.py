import os
import sys
import json
import time
import subprocess
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from analytics_engine import generate_all_analytics

class SimpleResult:
    def __init__(self, returncode, stdout, stderr):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr

app = Flask(__name__)
CORS(app)

OUTPUT_BASE_DIR = os.path.join(os.path.dirname(__file__), 'outputs')
os.makedirs(OUTPUT_BASE_DIR, exist_ok=True)

# ── Mode Configurations ────────────────────────────────────────────────────
#
#  ultra_fast  →  Point cloud only. No object detection. Fastest.
#  fast        →  Point cloud + lightweight YOLO on 5 keyframes. ~30-90s.
#  quality     →  Full point cloud + full detection on all frames. ~5-10min.

ENABLE_CACHE = False
QUALITY_TIMEOUT_SECONDS = 600

# Ultra-fast: just reconstruction, no detection
ULTRA_FAST_TIMEOUT        = 60
ULTRA_FAST_VIDEO_SECONDS  = 6
ULTRA_FAST_FRAME_STEP     = 15
ULTRA_FAST_MAX_FRAMES     = 12
ULTRA_FAST_SAMPLE_STEP    = 16
ULTRA_FAST_MAX_SIDE       = 480

# Fast: reconstruction + lightweight object detection on 5 keyframes
FAST_TIMEOUT              = 120
FAST_VIDEO_SECONDS        = 10
FAST_FRAME_STEP           = 10
FAST_MAX_FRAMES           = 18
FAST_SAMPLE_STEP          = 14
FAST_MAX_SIDE             = 640
FAST_DETECT_KEYFRAMES     = 5   # run YOLO on this many evenly-spaced frames
FAST_MAX_PER_FRAME        = 4
FAST_MIN_OBSERVATIONS     = 1   # accept single-frame detections in fast mode
FAST_MIN_TRACK_SAMPLES    = 1

EXPECTED_OUTPUTS = [
    'point_cloud.ply',
    'objects_3d.json',
    'trajectory.json',
    'room_analysis.json',
    'semantic_scene.json',
    'scene_graph.json',
]


def _file_info(session_dir, filename):
    path = os.path.join(session_dir, filename)
    exists = os.path.exists(path)
    return {
        "exists": exists,
        "size_bytes": os.path.getsize(path) if exists else 0,
    }


def _build_debug(session_id, session_dir, video_path, cmd, result=None, extra=None):
    files = {name: _file_info(session_dir, name) for name in EXPECTED_OUTPUTS}
    debug = {
        "video_path": video_path,
        "output_dir": session_dir,
        "cli_command": " ".join(cmd) if cmd else "",
        "files": files,
        "point_cloud_exists": files['point_cloud.ply']["exists"],
        "point_cloud_size_bytes": files['point_cloud.ply']["size_bytes"],
        "objects_exists": files['objects_3d.json']["exists"],
        "objects_size_bytes": files['objects_3d.json']["size_bytes"],
        "point_cloud_url": f"http://127.0.0.1:5000/outputs/{session_id}/point_cloud.ply",
        "objects_url": f"http://127.0.0.1:5000/outputs/{session_id}/objects_3d.json",
    }
    if result is not None:
        debug.update({
            "cli_return_code": result.returncode,
            "cli_stdout_tail": str(result.stdout or "")[-4000:],
            "cli_stderr_tail": str(result.stderr or "")[-4000:],
        })
    if extra:
        debug.update(extra)
    return debug


def _print_final_output_summary(session_dir):
    print("FINAL OUTPUT SUMMARY")
    for filename in EXPECTED_OUTPUTS:
        info = _file_info(session_dir, filename)
        size = f", size={info['size_bytes']} bytes" if filename == 'point_cloud.ply' else ""
        print(f"- {filename} exists: {info['exists']}{size}")


def _read_video_summary(video_path):
    try:
        import cv2
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"width": 0, "height": 0, "fps": 0.0, "frame_count": 0, "duration_seconds": 0.0}
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        cap.release()
        duration = frame_count / fps if fps > 0 else 0.0
        return {"width": width, "height": height, "fps": fps, "frame_count": frame_count, "duration_seconds": duration}
    except Exception as ex:
        return {"error": str(ex), "duration_seconds": 0.0, "frame_count": 0, "fps": 0.0}


def _ensure_empty_objects_file(session_dir):
    """Write a safe empty objects file if detection didn't run or produced nothing."""
    path = os.path.join(session_dir, 'objects_3d.json')
    if not os.path.exists(path):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump({
                "objects": [],
                "tracks": [],
                "message": "No objects detected in selected keyframes"
            }, f, indent=2)


def _write_analytics_stubs(session_id, session_dir):
    """Write safe placeholder stubs for analytic files to prevent frontend 404 errors."""
    os.makedirs(session_dir, exist_ok=True)
    
    # Stub room_analysis.json
    analysis_path = os.path.join(session_dir, 'room_analysis.json')
    if not os.path.exists(analysis_path):
        analysis_stub = {
            "dimensions": {"width": 5.0, "length": 5.0, "height": 3.0, "unit": "estimated meters"},
            "space": {"floor_area": 25.0, "occupied_percentage": 0, "free_percentage": 100, "object_density": 0.0},
            "scene": {"estimated_room_type": "Unknown", "room_type_confidence": 0.5, "complexity": "Low", "reconstruction_confidence": 0.8},
            "dominant_colors": ["#6b6b6b", "#2f2f2f", "#9a8f7a"]
        }
        with open(analysis_path, 'w', encoding='utf-8') as f:
            json.dump(analysis_stub, f, indent=2)

    # Stub semantic_scene.json
    semantic_path = os.path.join(session_dir, 'semantic_scene.json')
    if not os.path.exists(semantic_path):
        semantic_stub = {
            "scene_id": session_id,
            "semantic_regions": [{
                "id": "floor_1",
                "type": "floor",
                "confidence": 0.85,
                "bounds": {"center": [0, -1.0, 0], "size": [5.0, 0.05, 5.0]}
            }],
            "objects": [],
            "walkable_area": {"percentage": 100, "confidence": 0.75}
        }
        with open(semantic_path, 'w', encoding='utf-8') as f:
            json.dump(semantic_stub, f, indent=2)

    # Stub scene_graph.json
    graph_path = os.path.join(session_dir, 'scene_graph.json')
    if not os.path.exists(graph_path):
        graph_stub = {"nodes": [], "edges": []}
        with open(graph_path, 'w', encoding='utf-8') as f:
            json.dump(graph_stub, f, indent=2)


def _count_detected_objects(session_dir):
    """Read objects_3d.json and return count of detected objects (0 if missing/empty)."""
    path = os.path.join(session_dir, 'objects_3d.json')
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        objs = data.get('objects') or []
        return len(objs)
    except Exception:
        return 0


@app.route('/api/process-video', methods=['POST'])
def process_video():
    import hashlib
    import threading
    request_started = time.perf_counter()

    form_session_id = request.form.get("session_id")
    if form_session_id:
        session_id = secure_filename(form_session_id)
    else:
        timestamp = int(time.time())
        session_id = f"session_{timestamp}"

    print(f"UPLOAD REQUEST RECEIVED - Session: {session_id}")
    sys.stdout.flush()

    if 'video' not in request.files:
        return jsonify({"success": False, "error": "No video file provided"}), 400

    file = request.files['video']
    if file.filename == '':
        return jsonify({"success": False, "error": "No selected file"}), 400

    # Compute SHA256 hash of the video file for caching
    hasher = hashlib.sha256()
    file.seek(0)
    for chunk in iter(lambda: file.read(65536), b""):
        hasher.update(chunk)
    video_hash = hasher.hexdigest()
    file.seek(0) # reset stream position

    # Check for cache hit
    cached_session_id = None
    if ENABLE_CACHE and os.path.exists(OUTPUT_BASE_DIR):
        for sub in os.listdir(OUTPUT_BASE_DIR):
            sub_path = os.path.join(OUTPUT_BASE_DIR, sub)
            if os.path.isdir(sub_path):
                hash_file = os.path.join(sub_path, "video_hash.txt")
                if os.path.exists(hash_file):
                    try:
                        with open(hash_file, "r") as hf:
                            if hf.read().strip() == video_hash:
                                # Cache hit! Verify core files exist
                                if os.path.exists(os.path.join(sub_path, "point_cloud.ply")):
                                    cached_session_id = sub
                                    break
                    except Exception:
                        pass

    if cached_session_id:
        obj_count = _count_detected_objects(os.path.join(OUTPUT_BASE_DIR, cached_session_id))
        elapsed = time.perf_counter() - request_started
        print(f"\n--- Cache Hit ---")
        print(f"Serving cached session: {cached_session_id}")
        print(f"Time: {elapsed:.2f}s\n")
        return jsonify({
            "success": True,
            "session_id": cached_session_id,
            "detected_object_count": obj_count,
            "files": {
                "point_cloud":   f"http://127.0.0.1:5000/outputs/{cached_session_id}/point_cloud.ply",
                "objects":       f"http://127.0.0.1:5000/outputs/{cached_session_id}/objects_3d.json",
                "trajectory":    f"http://127.0.0.1:5000/outputs/{cached_session_id}/trajectory.json",
                "semantic_scene": f"http://127.0.0.1:5000/outputs/{cached_session_id}/semantic_scene.json",
                "room_analysis": f"http://127.0.0.1:5000/outputs/{cached_session_id}/room_analysis.json",
                "scene_graph":   f"http://127.0.0.1:5000/outputs/{cached_session_id}/scene_graph.json",
            },
            "debug": {
                "message": "Returned cached session output",
                "cached_session_id": cached_session_id,
                "processing_time_seconds": round(elapsed, 2),
            }
        })

    # Save incoming video to new session folder
    session_dir = os.path.join(OUTPUT_BASE_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    filename = secure_filename(file.filename)
    video_path = os.path.join(session_dir, filename)
    file.save(video_path)

    # Map incoming mode string → one of: minimal / ultra_fast / fast / quality
    raw_mode = (request.form.get("mode") or "minimal").strip().lower()
    if raw_mode == "quality":
        mode = "quality"
    elif raw_mode == "fast":
        mode = "fast"
    elif raw_mode in ("ultra_fast", "ultra-fast", "ultrafast", "pointcloud"):
        mode = "ultra_fast"
    else:
        mode = "minimal"   # default

    video_summary = _read_video_summary(video_path)

    print(f"\n--- Processing Video ---")
    print(f"Session: {session_id}  |  Mode: {mode}")
    print(f"Video: {file.filename} ({float(video_summary.get('duration_seconds', 0)):.1f}s, "
          f"{int(video_summary.get('frame_count', 0))} frames @ {float(video_summary.get('fps', 0)):.1f}fps)")

    try:
        # Build CLI command with optimized parameters
        # Try to locate the virtual environment's python executable directly to avoid Flask reloader bugs on Windows
        venv_py = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".venv", "Scripts", "python.exe")
        python_exe = venv_py if os.path.exists(venv_py) else sys.executable
        
        cmd = [
            python_exe, "-m", "miniscene.cli",
            "--video", video_path,
            "--out-dir", session_dir,
            "--mode", mode,
        ]
        analytics_enabled = (mode == "quality")

        print(f"Command: {' '.join(cmd)}")

        # Run CLI with subprocess.Popen to stream stdout and stderr line-by-line
        import queue
        import threading

        def enqueue_output(out, q):
            for line in iter(out.readline, ''):
                q.put(line)
            out.close()

        p = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        q = queue.Queue()
        t = threading.Thread(target=enqueue_output, args=(p.stdout, q))
        t.daemon = True
        t.start()

        # Watchdog and streaming loop
        current_stage = "video_load"
        cli_profile = {}
        all_stdout_lines = []
        last_line_time = time.perf_counter()

        ply_file = os.path.join(session_dir, 'point_cloud.ply')
        obj_file = os.path.join(session_dir, 'objects_3d.json')
        extract_objects = (mode in ("minimal", "fast", "quality"))
        returned_early = False

        while True:
            retcode = p.poll()
            try:
                line = q.get(timeout=0.1)
                last_line_time = time.perf_counter()
            except queue.Empty:
                if retcode is not None:
                    break
                # Check early return condition
                if not returned_early:
                    ply_exists = os.path.exists(ply_file) and os.path.getsize(ply_file) > 0
                    obj_exists = not extract_objects or (os.path.exists(obj_file) and os.path.getsize(obj_file) > 0)
                    if ply_exists and obj_exists:
                        print("[server] Core files generated! Returning early to frontend.")
                        returned_early = True
                        
                        def wait_finish_bg(proc, q_thread):
                            while proc.poll() is None:
                                try:
                                    q_thread.get(timeout=0.5)
                                except queue.Empty:
                                    pass
                            proc.wait()
                            print(f"[server] Background CLI process finished with code {proc.returncode}")
                            
                        threading.Thread(target=wait_finish_bg, args=(p, q), daemon=True).start()
                        break
                if time.perf_counter() - last_line_time > 60.0:
                    print(f"No progress for 60s — possible bottleneck at {current_stage}")
                    last_line_time = time.perf_counter()
                continue

            all_stdout_lines.append(line)
            sys.stdout.write(line)
            sys.stdout.flush()

            # Infer current stage for watchdog
            line_lower = line.lower()
            if "loaded" in line_lower and "frames" in line_lower:
                current_stage = "camera_pose_estimation"
            elif "matching pair" in line_lower:
                current_stage = "camera_pose_estimation"
            elif "estimated camera trajectory" in line_lower:
                current_stage = "depth_estimation"
            elif "estimating depth" in line_lower:
                current_stage = "depth_estimation"
            elif "point cloud points:" in line_lower or "validation:" in line_lower:
                current_stage = "file_writing"
            elif "running yolo" in line_lower:
                current_stage = "object_detection"
            elif "detected 3d objects" in line_lower or "ground plane y" in line_lower:
                current_stage = "file_writing"

            # Parse [TIMER] logs
            if line.startswith("[TIMER]"):
                parts = line.strip().split(":")
                if len(parts) >= 2:
                    stage = parts[0][len("[TIMER]"):].strip()
                    val_str = parts[1].strip().replace("s", "")
                    try:
                        cli_profile[stage] = float(val_str)
                    except ValueError:
                        pass

            # Check early return condition after processing a line
            if not returned_early:
                ply_exists = os.path.exists(ply_file) and os.path.getsize(ply_file) > 0
                obj_exists = not extract_objects or (os.path.exists(obj_file) and os.path.getsize(obj_file) > 0)
                if ply_exists and obj_exists:
                    print("[server] Core files generated! Returning early to frontend.")
                    returned_early = True
                    
                    def wait_finish_bg(proc, q_thread):
                        while proc.poll() is None:
                            try:
                                q_thread.get(timeout=0.5)
                            except queue.Empty:
                                pass
                        proc.wait()
                        print(f"[server] Background CLI process finished with code {proc.returncode}")
                        
                    threading.Thread(target=wait_finish_bg, args=(p, q), daemon=True).start()
                    break

        if not returned_early:
            p.wait()
            returncode = p.returncode
        else:
            returncode = 0
            
        print(f"CLI return code: {returncode}")

        result = SimpleResult(
            returncode=returncode,
            stdout="".join(all_stdout_lines),
            stderr=""
        )

        if returncode != 0:
            elapsed = time.perf_counter() - request_started
            _ensure_empty_objects_file(session_dir)
            _write_analytics_stubs(session_id, session_dir)
            debug = _build_debug(session_id, session_dir, video_path, cmd, result, {
                "mode": mode,
                "processing_time_seconds": round(elapsed, 2),
                "video_summary": video_summary,
            })
            _print_final_output_summary(session_dir)
            return jsonify({
                "success": False,
                "error": f"CLI exited with return code {returncode}",
                "debug": debug,
            }), 500

        # Post-processing / Caching Write
        _ensure_empty_objects_file(session_dir)
        
        # Write hash file for cache hits on future identical runs
        with open(os.path.join(session_dir, "video_hash.txt"), "w") as hf:
            hf.write(video_hash)

        # Write analytic stubs immediately so the frontend has them instantly
        _write_analytics_stubs(session_id, session_dir)

        # In Quality mode, start actual analytics generation in background
        if analytics_enabled:
            def run_analytics_bg(sess_id, sess_dir):
                try:
                    t_an_start = time.perf_counter()
                    generate_all_analytics(sess_id, sess_dir)
                    elapsed_an = time.perf_counter() - t_an_start
                    print(f"[TIMER] analytics_generation: {elapsed_an:.1f}s")
                    print(f"Background analytics completed for session {sess_id}")
                except Exception as ae:
                    print(f"Background analytics error for session {sess_id}: {ae}")
            threading.Thread(target=run_analytics_bg, args=(session_id, session_dir), daemon=True).start()

        obj_count = _count_detected_objects(session_dir)
        elapsed = time.perf_counter() - request_started
        
        # Make sure all timers are represented
        if "analytics_generation" not in cli_profile:
            cli_profile["analytics_generation"] = 0.0

        # Print neat timeline table to terminal
        print("\n" + "="*45)
        print("         PIPELINE TIMING PROFILE         ")
        print("="*45)
        print(f" Video Load:            {cli_profile.get('video_load', 0.0):.2f}s")
        print(f" Frame Extraction:      {cli_profile.get('frame_extraction', 0.0):.2f}s")
        print(f" Frame Resizing:        {cli_profile.get('frame_resizing', 0.0):.2f}s")
        print(f" Feature Detection:     {cli_profile.get('feature_detection', 0.0):.2f}s")
        print(f" Feature Matching:      {cli_profile.get('feature_matching', 0.0):.2f}s")
        print(f" Camera Pose Estimation:{cli_profile.get('camera_pose_estimation', 0.0):.2f}s")
        print(f" Depth Estimation:      {cli_profile.get('depth_estimation', 0.0):.2f}s")
        print(f" Point Cloud Gen:       {cli_profile.get('point_cloud_generation', 0.0):.2f}s")
        print(f" Object Detection:      {cli_profile.get('object_detection', 0.0):.2f}s")
        print(f" Object Tracking:       {cli_profile.get('object_tracking', 0.0):.2f}s")
        print(f" Analytics Generation:  {cli_profile.get('analytics_generation', 0.0):.2f}s")
        print(f" File Writing:          {cli_profile.get('file_writing', 0.0):.2f}s")
        print(f" Server Save & Setup:   {elapsed - sum(cli_profile.values()):.2f}s")
        print(f" Total Processing:      {elapsed:.2f}s")
        print("="*45 + "\n")

        _print_final_output_summary(session_dir)
        print(f"Detected objects: {obj_count}")
        print(f"Total processing time: {elapsed:.2f}s")
        print("--- Processing Complete ---\n")

        debug = _build_debug(session_id, session_dir, video_path, cmd, result, {
            "mode": mode,
            "processing_time_seconds": round(elapsed, 2),
            "video_summary": video_summary,
            "detected_object_count": obj_count,
            "timing_profile": cli_profile,
        })

        pc_exists = debug["point_cloud_exists"]
        pc_size = debug["point_cloud_size_bytes"]
        success_flag = pc_exists and pc_size > 0
        error_msg = None if success_flag else ("Point cloud missing" if not pc_exists else "Point cloud empty")

        return jsonify({
            "success": success_flag,
            "error": error_msg,
            "session_id": session_id,
            "detected_object_count": obj_count,
            "debug": debug,
            "files": {
                "point_cloud":   f"http://127.0.0.1:5000/outputs/{session_id}/point_cloud.ply",
                "objects":       f"http://127.0.0.1:5000/outputs/{session_id}/objects_3d.json",
                "trajectory":    f"http://127.0.0.1:5000/outputs/{session_id}/trajectory.json",
                "semantic_scene": f"http://127.0.0.1:5000/outputs/{session_id}/semantic_scene.json",
                "room_analysis": f"http://127.0.0.1:5000/outputs/{session_id}/room_analysis.json",
                "scene_graph":   f"http://127.0.0.1:5000/outputs/{session_id}/scene_graph.json",
            }
        })

    except Exception as e:
        elapsed = time.perf_counter() - request_started
        print("Pipeline Error:", e)
        _ensure_empty_objects_file(session_dir)
        _write_analytics_stubs(session_id, session_dir)
        debug = _build_debug(
            session_id, session_dir, video_path,
            locals().get("cmd", []), locals().get("result"),
            {
                "mode": locals().get("mode", "unknown"),
                "processing_time_seconds": round(elapsed, 2),
                "video_summary": locals().get("video_summary", {}),
            }
        )
        _print_final_output_summary(session_dir)
        return jsonify({"success": False, "error": str(e) or "Processing failed", "debug": debug}), 500


@app.route('/outputs/<path:filepath>')
def serve_outputs(filepath):
    return send_from_directory(OUTPUT_BASE_DIR, filepath)


@app.route("/")
def home():
    return jsonify({"status": "MiniScene backend running"})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "backend": "running"})


if __name__ == '__main__':
    app.run(port=5000, debug=True)