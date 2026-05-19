import os
import time
import subprocess
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from analytics_engine import generate_all_analytics

app = Flask(__name__)
CORS(app)

OUTPUT_BASE_DIR = os.path.join(os.path.dirname(__file__), 'outputs')
os.makedirs(OUTPUT_BASE_DIR, exist_ok=True)

@app.route('/api/process-video', methods=['POST'])
def process_video():
    if 'video' not in request.files:
        return jsonify({"success": False, "error": "No video file provided"}), 400
        
    file = request.files['video']
    if file.filename == '':
        return jsonify({"success": False, "error": "No selected file"}), 400
        
    timestamp = int(time.time())
    session_id = f"session_{timestamp}"
    session_dir = os.path.join(OUTPUT_BASE_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    
    filename = secure_filename(file.filename)
    video_path = os.path.join(session_dir, filename)
    file.save(video_path)
    
    print(f"\n--- Processing Video ---")
    print(f"Received video: {file.filename}")
    print(f"Session ID: {session_id}")
    print(f"Video path: {video_path}")
    print(f"Output directory: {session_dir}")

    try:
        cmd = [
            "python", "-m", "miniscene.cli", 
            "--video", video_path, 
            "--out-dir", session_dir, 
            "--extract-objects"
        ]
        print(f"Executing command: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        print(f"CLI Return Code: {result.returncode}")
        print("--- CLI STDOUT ---")
        print(result.stdout)
        print("--- CLI STDERR ---")
        print(result.stderr)
        
        if result.returncode != 0:
            raise Exception("CLI pipeline failed")
        
        # Generate CV Analytics outputs
        generate_all_analytics(session_id, session_dir)
        
        print("--- File Generation Verification ---")
        expected_files = [
            'point_cloud.ply', 'objects_3d.json', 'trajectory.json', 
            'semantic_scene.json', 'room_analysis.json', 'scene_graph.json'
        ]
        for ef in expected_files:
            exists = os.path.exists(os.path.join(session_dir, ef))
            print(f"{ef} exists? {exists}")
            
        print("--- Processing Complete ---\n")
        
        pc_path = os.path.join(session_dir, 'point_cloud.ply')
        obj_path = os.path.join(session_dir, 'objects_3d.json')
        pc_exists = os.path.exists(pc_path)
        pc_size = os.path.getsize(pc_path) if pc_exists else 0
        obj_exists = os.path.exists(obj_path)
        obj_size = os.path.getsize(obj_path) if obj_exists else 0

        success_flag = pc_exists and pc_size > 0

        return jsonify({
            "success": success_flag,
            "session_id": session_id,
            "debug": {
                "video_path": video_path,
                "output_dir": session_dir,
                "cli_command": " ".join(cmd),
                "cli_return_code": result.returncode,
                "point_cloud_exists": pc_exists,
                "point_cloud_size_bytes": pc_size,
                "objects_exists": obj_exists,
                "objects_size_bytes": obj_size,
                "point_cloud_url": f"http://127.0.0.1:5000/outputs/{session_id}/point_cloud.ply",
                "objects_url": f"http://127.0.0.1:5000/outputs/{session_id}/objects_3d.json"
            },
            "files": {
                "point_cloud": f"http://127.0.0.1:5000/outputs/{session_id}/point_cloud.ply",
                "objects": f"http://127.0.0.1:5000/outputs/{session_id}/objects_3d.json",
                "trajectory": f"http://127.0.0.1:5000/outputs/{session_id}/trajectory.json",
                "semantic_scene": f"http://127.0.0.1:5000/outputs/{session_id}/semantic_scene.json",
                "room_analysis": f"http://127.0.0.1:5000/outputs/{session_id}/room_analysis.json",
                "scene_graph": f"http://127.0.0.1:5000/outputs/{session_id}/scene_graph.json"
            }
        })
    except Exception as e:
        print("Pipeline Error:", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/outputs/<path:filepath>')
def serve_outputs(filepath):
    return send_from_directory(OUTPUT_BASE_DIR, filepath)

if __name__ == '__main__':
    app.run(port=5000, debug=True)
