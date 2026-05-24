import json
import sys
import numpy as np
from pathlib import Path

# Add src folder to python path to import miniscene modules
sys.path.append(str(Path("c:/MiniScene/src")))

from miniscene.cv.objects import SceneObject, write_objects_json

def test():
    json_path = "c:/MiniScene/outputs/req_1779624968644/objects_3d.json"
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    raw_objects = data.get("objects", [])
    print(f"Loaded {len(raw_objects)} raw objects from {json_path}")

    # Instantiate SceneObject instances
    objects = []
    for o in raw_objects:
        # Check size_m type (list or dict)
        sz = o.get("size_m")
        if isinstance(sz, dict):
            sz_tuple = (sz["width"], sz["height"], sz["depth"])
        elif isinstance(sz, list):
            sz_tuple = tuple(sz)
        else:
            sz_tuple = (1.0, 1.0, 1.0)
            
        obj = SceneObject(
            object_id=o["id"],
            label=o["label"],
            position_world=np.array(o["position_world"], dtype=np.float32),
            distance_m=o["distance_m"],
            observations=o["observations"],
            size_m=sz_tuple,
            representative_frame_index=o.get("representative_frame_index"),
            representative_bbox_xyxy=tuple(o["representative_bbox_xyxy"]) if o.get("representative_bbox_xyxy") is not None else None,
            representative_score=o.get("representative_score"),
            placement_quality=o.get("placement_quality", "good")
        )
        objects.append(obj)

    # Write out using write_objects_json to a temporary file
    temp_out = "c:/MiniScene/outputs/req_1779624968644/objects_3d_temp.json"
    write_objects_json(temp_out, objects, ground_y=-0.6965579986572266)
    print(f"Wrote to temporary file {temp_out}")

    # Verify the output structure by reading a few items from it
    with open(temp_out, "r", encoding="utf-8") as f:
        new_data = json.load(f)
    
    first_obj = new_data["objects"][0]
    print("\n--- Serialized Object Example ---")
    print(json.dumps(first_obj, indent=2))

if __name__ == "__main__":
    test()
