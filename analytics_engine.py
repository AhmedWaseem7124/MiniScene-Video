import os
import json
import numpy as np

def load_objects_json(session_dir):
    obj_path = os.path.join(session_dir, 'objects_3d.json')
    if os.path.exists(obj_path):
        try:
            with open(obj_path, 'r') as f:
                data = json.load(f)
                return data.get('objects', [])
        except:
            return []
    return []

def parse_point_cloud_bounds(ply_path):
    # Fallback bounds
    bounds = {
        "min": [-2.5, -2, -2.5],
        "max": [2.5, 2, 2.5],
        "width": 5.0,
        "height": 4.0,
        "length": 5.0,
        "center": [0, 0, 0]
    }
    
    if not os.path.exists(ply_path):
        return bounds
        
    try:
        # Very simple ply parsing to avoid large dependency loads
        pts = []
        with open(ply_path, 'r', encoding='utf-8', errors='ignore') as f:
            in_data = False
            for line in f:
                if line.strip() == "end_header":
                    in_data = True
                    continue
                if in_data:
                    parts = line.split()
                    if len(parts) >= 3:
                        try:
                            pts.append([float(parts[0]), float(parts[1]), float(parts[2])])
                        except:
                            pass
        if pts:
            pts_np = np.array(pts)
            min_bound = np.min(pts_np, axis=0)
            max_bound = np.max(pts_np, axis=0)
            center = (min_bound + max_bound) / 2
            size = max_bound - min_bound
            
            bounds["min"] = min_bound.tolist()
            bounds["max"] = max_bound.tolist()
            bounds["width"] = float(size[0])
            bounds["height"] = float(size[1])
            bounds["length"] = float(size[2])
            bounds["center"] = center.tolist()
    except Exception as e:
        print("Error parsing ply bounds:", e)
        
    return bounds

def classify_room_type(objects):
    labels = [obj.get("label", "").lower() for obj in objects]
    
    counts = {}
    for l in labels:
        counts[l] = counts.get(l, 0) + 1
        
    if "bed" in labels:
        return "Bedroom", 0.9
        
    if "couch" in labels or "sofa" in labels or "tv" in labels:
        return "Living Room", 0.85
        
    office_items = sum(counts.get(k, 0) for k in ["desk", "computer", "laptop", "keyboard"])
    if office_items >= 1:
        return "Office", 0.8
        
    kitchen_items = sum(counts.get(k, 0) for k in ["refrigerator", "oven", "sink", "microwave"])
    if kitchen_items >= 1 or ("dining table" in labels):
        return "Kitchen/Dining", 0.8
        
    if counts.get("chair", 0) > 4 and counts.get("table", 0) > 2:
        return "Classroom/Meeting Room", 0.75
        
    return "Unknown", 0.5

def estimate_dominant_colors(ply_path):
    default_colors = ["#6b6b6b", "#2f2f2f", "#9a8f7a"]
    if not os.path.exists(ply_path):
        return default_colors
        
    try:
        colors = []
        with open(ply_path, 'r', encoding='utf-8', errors='ignore') as f:
            in_data = False
            for line in f:
                if line.strip() == "end_header":
                    in_data = True
                    continue
                if in_data:
                    parts = line.split()
                    # typically x y z r g b
                    if len(parts) >= 6:
                        try:
                            # Usually color is in 3,4,5 or something similar. Let's assume standard XYZRGB
                            r, g, b = int(parts[3]), int(parts[4]), int(parts[5])
                            colors.append([r, g, b])
                        except:
                            pass
                if len(colors) > 5000: # sample only first 5k points
                    break
                    
        if len(colors) == 0:
            return default_colors
            
        colors_np = np.array(colors)
        # simplistic k-means or just median/mean
        median_color = np.median(colors_np, axis=0)
        mean_color = np.mean(colors_np, axis=0)
        
        # Format as hex
        c1 = "#{:02x}{:02x}{:02x}".format(int(median_color[0]), int(median_color[1]), int(median_color[2]))
        c2 = "#{:02x}{:02x}{:02x}".format(int(mean_color[0]), int(mean_color[1]), int(mean_color[2]))
        
        return [c1, c2, "#9a8f7a"]
    except Exception as e:
        print("Error parsing ply colors:", e)
        return default_colors

def generate_semantic_scene(session_id, session_dir):
    objects = load_objects_json(session_dir)
    ply_path = os.path.join(session_dir, 'point_cloud.ply')
    bounds = parse_point_cloud_bounds(ply_path)
    
    floor_y = bounds["min"][1] if len(bounds["min"]) > 1 else -2.0
    
    semantic_data = {
        "scene_id": session_id,
        "semantic_regions": [
            {
                "id": "floor_1",
                "type": "floor",
                "confidence": 0.85,
                "bounds": {
                    "center": [bounds["center"][0], floor_y, bounds["center"][2]],
                    "size": [bounds["width"], 0.05, bounds["length"]]
                }
            }
        ],
        "objects": objects,
        "walkable_area": {
            "percentage": 65 if objects else 90,
            "confidence": 0.75
        }
    }
    
    out_path = os.path.join(session_dir, 'semantic_scene.json')
    with open(out_path, 'w') as f:
        json.dump(semantic_data, f, indent=2)

def generate_room_analysis(session_id, session_dir):
    objects = load_objects_json(session_dir)
    ply_path = os.path.join(session_dir, 'point_cloud.ply')
    bounds = parse_point_cloud_bounds(ply_path)
    
    room_type, room_conf = classify_room_type(objects)
    dominant_colors = estimate_dominant_colors(ply_path)
    
    floor_area = bounds["width"] * bounds["length"]
    object_count = len(objects)
    
    occupied_percentage = min(90, object_count * 5) # rough heuristic
    free_percentage = 100 - occupied_percentage
    
    analysis_data = {
        "dimensions": {
            "width": round(bounds["width"], 2),
            "length": round(bounds["length"], 2),
            "height": round(bounds["height"], 2),
            "width_m": round(bounds["width"], 2),
            "length_m": round(bounds["length"], 2),
            "height_m": round(bounds["height"], 2),
            "floor_area_m2": round(floor_area, 2),
            "scale_source": "estimated_from_point_cloud",
            "unit": "estimated meters"
        },
        "space": {
            "floor_area": round(floor_area, 2),
            "occupied_percentage": occupied_percentage,
            "free_percentage": free_percentage,
            "object_density": round(object_count / max(1, floor_area), 2)
        },
        "scene": {
            "estimated_room_type": room_type,
            "room_type_confidence": room_conf,
            "complexity": "High" if object_count > 10 else "Medium" if object_count > 3 else "Low",
            "reconstruction_confidence": 0.82
        },
        "dominant_colors": dominant_colors
    }
    
    out_path = os.path.join(session_dir, 'room_analysis.json')
    with open(out_path, 'w') as f:
        json.dump(analysis_data, f, indent=2)

def generate_scene_graph(session_id, session_dir):
    objects = load_objects_json(session_dir)

    def _object_position(obj):
        pos = obj.get("position_world")
        if not pos:
            box = obj.get("box_3d") or {}
            pos = box.get("center")
        if not pos:
            samples = obj.get("samples") or []
            if samples:
                pos = samples[0].get("position_world")
        if pos and len(pos) == 3:
            return pos
        return [0, 0, 0]
    
    nodes = []
    edges = []
    
    for i, obj in enumerate(objects):
        obj_id = obj.get("id", f"obj_{i}")
        label = obj.get("label", "unknown")
        conf = obj.get("average_score", 0.5)
        
        nodes.append({
            "id": str(obj_id),
            "label": label,
            "confidence": conf
        })
        
    # Generate edges
    for i in range(len(objects)):
        for j in range(i + 1, len(objects)):
            obj1 = objects[i]
            obj2 = objects[j]
            
            id1 = str(obj1.get("id", f"obj_{i}"))
            id2 = str(obj2.get("id", f"obj_{j}"))
            
            pos1 = _object_position(obj1)
            pos2 = _object_position(obj2)
            
            if pos1 and pos2 and len(pos1) == 3 and len(pos2) == 3:
                dist = np.linalg.norm(np.array(pos1) - np.array(pos2))
                
                if dist < 1.5:
                    relation = "next_to"
                elif dist < 3.0:
                    relation = "near"
                else:
                    continue
                    
                edges.append({
                    "source": id1,
                    "target": id2,
                    "relation": relation,
                    "confidence": max(0.4, 1.0 - (dist / 4.0))
                })
                
    graph_data = {
        "nodes": nodes,
        "edges": edges
    }
    
    out_path = os.path.join(session_dir, 'scene_graph.json')
    with open(out_path, 'w') as f:
        json.dump(graph_data, f, indent=2)

def generate_all_analytics(session_id, session_dir):
    generate_semantic_scene(session_id, session_dir)
    generate_room_analysis(session_id, session_dir)
    generate_scene_graph(session_id, session_dir)
