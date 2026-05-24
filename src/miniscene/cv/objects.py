from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from miniscene.cv.motion import CameraIntrinsics
from miniscene.config import DEFAULT_MINISCENE_CONFIG
from miniscene.recon.reconstruct import camera_to_world, pixel_to_camera_point


@dataclass
class ObjectObservation:
    frame_index: int
    label: str
    score: float
    track_id: int | None
    bbox_xyxy: tuple[int, int, int, int]
    position_world: np.ndarray
    distance_m: float
    placement_quality: str = "good"


@dataclass
class SceneObject:
    object_id: int | str
    label: str
    position_world: np.ndarray
    distance_m: float
    observations: int
    size_m: tuple[float, float, float] | None = None
    representative_frame_index: int | None = None
    representative_bbox_xyxy: tuple[int, int, int, int] | None = None
    representative_score: float | None = None
    sprite_file: str | None = None
    placement_quality: str = "good"
    source_frames: list[str] | None = None
    merged_from: list[str] | None = None


@dataclass
class SceneTrackSample:
    frame_index: int
    position_world: np.ndarray
    distance_m: float
    score: float | None = None
    bbox_xyxy: tuple[int, int, int, int] | None = None
    placement_quality: str = "good"


@dataclass
class SceneTrack:
    track_id: int
    label: str
    samples: list[SceneTrackSample]


def _center_depth(depth_map: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> float:
    h, w = depth_map.shape[:2]
    x1 = max(0, min(w - 1, x1))
    x2 = max(0, min(w - 1, x2))
    y1 = max(0, min(h - 1, y1))
    y2 = max(0, min(h - 1, y2))

    if x2 <= x1 or y2 <= y1:
        return 0.0

    bw = max(1, x2 - x1)
    bh = max(1, y2 - y1)
    rx1 = x1 + int(0.25 * bw)
    rx2 = x1 + int(0.75 * bw)
    ry1 = y1 + int(0.45 * bh)
    ry2 = y1 + int(0.85 * bh)
    rx1 = max(0, min(w - 1, rx1))
    rx2 = max(0, min(w - 1, rx2))
    ry1 = max(0, min(h - 1, ry1))
    ry2 = max(0, min(h - 1, ry2))
    if rx2 <= rx1 or ry2 <= ry1:
        return 0.0

    patch = depth_map[ry1:ry2, rx1:rx2]
    if patch.size == 0:
        return 0.0

    valid = patch[np.isfinite(patch)]
    if valid.size == 0:
        return 0.0

    # Use a closer quantile to avoid locking onto background behind the object.
    return float(np.quantile(valid, 0.35))


def _robust_bbox_depth(depth_map: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> tuple[float, int]:
    """Extract robust depth from bbox region using median of entire region + nearby area.
    
    Returns: (depth_m, valid_count) for validation and logging.
    """
    h, w = depth_map.shape[:2]
    x1 = max(0, min(w - 1, x1))
    x2 = max(0, min(w, x2))
    y1 = max(0, min(h - 1, y1))
    y2 = max(0, min(h, y2))

    if x2 <= x1 or y2 <= y1:
        return 0.0, 0

    # Sample depth from object region (inner 80% to avoid edge artifacts).
    bw = max(1, x2 - x1)
    bh = max(1, y2 - y1)
    inner_x1 = x1 + int(0.10 * bw)
    inner_x2 = x1 + int(0.90 * bw)
    inner_y1 = y1 + int(0.10 * bh)
    inner_y2 = y1 + int(0.90 * bh)
    
    inner_x1 = max(0, min(w - 1, inner_x1))
    inner_x2 = max(0, min(w, inner_x2))
    inner_y1 = max(0, min(h - 1, inner_y1))
    inner_y2 = max(0, min(h, inner_y2))
    
    if inner_x2 <= inner_x1 or inner_y2 <= inner_y1:
        return 0.0, 0

    patch = depth_map[inner_y1:inner_y2, inner_x1:inner_x2]
    if patch.size == 0:
        return 0.0, 0

    valid = patch[np.isfinite(patch)]
    if valid.size == 0:
        return 0.0, 0

    # Use median of inner region for stability; fallback to 30th percentile if needed.
    depth = float(np.median(valid))
    if depth <= 0.01 or not np.isfinite(depth):
        depth = float(np.percentile(valid, 30))
    
    return max(0.01, float(depth)), int(valid.size)


def _mask_depth_and_center(
    depth_map: np.ndarray,
    bbox_xyxy: tuple[int, int, int, int],
    mask: np.ndarray | None,
) -> tuple[float, int, tuple[int, int, int, int], tuple[int, int]]:
    """Estimate depth and a stable center from a segmentation mask when available.

    Falls back to bbox-based depth if no usable mask exists.
    """
    x1, y1, x2, y2 = [int(v) for v in bbox_xyxy]
    h, w = depth_map.shape[:2]

    if mask is None:
        depth, valid_count = _robust_bbox_depth(depth_map, x1, y1, x2, y2)
        cx = int((x1 + x2) / 2)
        cy = int((y1 + y2) / 2)
        return depth, valid_count, (x1, y1, x2, y2), (cx, cy)

    mask_arr = np.asarray(mask)
    if mask_arr.ndim != 2:
        depth, valid_count = _robust_bbox_depth(depth_map, x1, y1, x2, y2)
        cx = int((x1 + x2) / 2)
        cy = int((y1 + y2) / 2)
        return depth, valid_count, (x1, y1, x2, y2), (cx, cy)

    if mask_arr.shape[:2] != (h, w):
        mask_arr = cv2.resize(mask_arr.astype(np.float32), (w, h), interpolation=cv2.INTER_NEAREST)

    mask_bin = mask_arr > 0.5
    if not np.any(mask_bin):
        depth, valid_count = _robust_bbox_depth(depth_map, x1, y1, x2, y2)
        cx = int((x1 + x2) / 2)
        cy = int((y1 + y2) / 2)
        return depth, valid_count, (x1, y1, x2, y2), (cx, cy)

    bx1 = max(0, min(w - 1, x1))
    bx2 = max(0, min(w, x2))
    by1 = max(0, min(h - 1, y1))
    by2 = max(0, min(h, y2))
    bbox_mask = np.zeros((h, w), dtype=bool)
    bbox_mask[by1:by2, bx1:bx2] = True
    sample_mask = mask_bin & bbox_mask & np.isfinite(depth_map)

    valid = depth_map[sample_mask]
    if valid.size == 0:
        depth, valid_count = _robust_bbox_depth(depth_map, x1, y1, x2, y2)
        cx = int((x1 + x2) / 2)
        cy = int((y1 + y2) / 2)
        return depth, valid_count, (x1, y1, x2, y2), (cx, cy)

    depth = float(np.median(valid))
    if depth <= 0.01 or not np.isfinite(depth):
        depth = float(np.percentile(valid, 30))

    ys, xs = np.where(sample_mask)
    if xs.size == 0 or ys.size == 0:
        cx = int((x1 + x2) / 2)
        cy = int((y1 + y2) / 2)
        refined_bbox = (x1, y1, x2, y2)
    else:
        cx = int(np.round(float(np.mean(xs))))
        cy = int(np.round(float(np.mean(ys))))
        refined_bbox = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)

    return max(0.01, float(depth)), int(valid.size), refined_bbox, (cx, cy)


def verify_yolo_status(model_name: str = "yolov8n-seg.pt", detection_enabled: bool = True) -> tuple[bool, object | None]:
    try:
        import ultralytics
        from ultralytics import YOLO
        import torch
        ultralytics_installed = True
    except ImportError:
        print("ultralytics installed? false")
        print(f"YOLO model path/name: {model_name}")
        print("model loaded successfully? false")
        print("selected device: CPU")
        print(f"detection enabled? {str(detection_enabled).lower()}")
        print("YOLO unavailable. Install ultralytics or disable object extraction.")
        return False, None

    print("ultralytics installed? true")
    print(f"YOLO model path/name: {model_name}")
    
    model = None
    try:
        model = YOLO(model_name)
        model_loaded = True
    except Exception:
        if model_name == "yolov8n-seg.pt":
            try:
                model_name = "yolov8n.pt"
                print(f"yolov8n-seg.pt load failed, retrying fallback: {model_name}")
                model = YOLO(model_name)
                model_loaded = True
            except Exception:
                model_loaded = False
        else:
            model_loaded = False
            
    if not model_loaded:
        print("model loaded successfully? false")
        print("selected device: CPU")
        print(f"detection enabled? {str(detection_enabled).lower()}")
        return False, None

    print("model loaded successfully? true")
    
    device_str = "CPU"
    try:
        if hasattr(model, "device"):
            device_str = "GPU" if "cuda" in str(model.device).lower() else "CPU"
        elif torch.cuda.is_available():
            device_str = "GPU"
    except Exception:
        pass
    print(f"selected device: {device_str}")
    print(f"detection enabled? {str(detection_enabled).lower()}")
    return True, model


def _load_yolo_detector(model_name: str = "yolov8n.pt") -> object:
    from ultralytics import YOLO
    return YOLO(model_name)


COMMON_OBJECT_LABELS = {
    "chair",
    "couch",
    "bed",
    "dining table",
    "tv",
    "laptop",
    "potted plant",
    "refrigerator",
    "microwave",
    "oven",
    "sink",
    "vase",
    "book",
    "clock",
    "sofa",
    "table",
    "person",
}


CLASS_SCORE_THRESHOLDS = {
    "chair": 0.15,
    "couch": 0.15,
    "sofa": 0.15,
    "bed": 0.15,
    "dining table": 0.15,
    "table": 0.15,
    "tv": 0.15,
    "laptop": 0.15,
    "potted plant": 0.15,
    "refrigerator": 0.15,
    "microwave": 0.15,
    "oven": 0.15,
    "sink": 0.15,
    "vase": 0.15,
    "book": 0.15,
    "clock": 0.15,
    "person": 0.15,
}


DEFAULT_SIZES = {
    "chair": (0.6, 0.9, 0.6),
    "couch": (2.0, 0.9, 0.8),
    "sofa": (2.0, 0.9, 0.8),
    "bed": (2.0, 0.6, 1.6),
    "dining table": (1.2, 0.75, 0.8),
    "table": (1.2, 0.75, 0.8),
    "tv": (1.2, 0.8, 0.1),
    "laptop": (0.4, 0.25, 0.3),
    "potted plant": (0.5, 1.2, 0.5),
    "refrigerator": (0.8, 1.8, 0.8),
    "microwave": (0.5, 0.3, 0.4),
    "oven": (0.6, 0.85, 0.6),
    "sink": (0.6, 0.4, 0.5),
    "vase": (0.3, 0.5, 0.3),
    "book": (0.2, 0.05, 0.25),
    "clock": (0.3, 0.3, 0.1),
    "person": (0.6, 1.7, 0.4),
}


def _adaptive_conf_schedule(base_conf: float) -> list[float]:
    base = float(max(0.05, min(0.95, base_conf)))
    floor = min(0.20, base)
    schedule = [base]
    while schedule[-1] - 1e-6 > floor:
        schedule.append(max(floor, schedule[-1] - 0.10))
    if schedule[-1] > floor + 1e-6:
        schedule.append(floor)

    # Preserve order while removing duplicate values from clamping.
    out: list[float] = []
    seen: set[float] = set()
    for v in schedule:
        key = round(float(v), 3)
        if key in seen:
            continue
        seen.add(key)
        out.append(float(v))
    return out


def _label_threshold(label: str, base_threshold: float) -> float:
    label_key = label.strip().lower()
    class_t = CLASS_SCORE_THRESHOLDS.get(label_key)
    if class_t is None:
        return float(base_threshold)
    # Never be stricter than the global setting for known common classes.
    return float(min(base_threshold, class_t))


def detect_objects_3d(
    frames_bgr: list[np.ndarray],
    depth_maps: list[np.ndarray],
    poses_world_from_cam: list[np.ndarray],
    intrinsics: CameraIntrinsics,
    score_threshold: float = DEFAULT_MINISCENE_CONFIG.confidence_base,
    iou_threshold: float = DEFAULT_MINISCENE_CONFIG.iou_threshold,
    max_per_frame: int = 6,
    dedup_enable: bool = True,
    dedup_merge_radius_m: float = 1.2,
    dedup_feature_similarity: float = 0.72,
) -> list[SceneObject]:
    if not frames_bgr:
        return []

    observations, _ = _detect_observations(
        frames_bgr=frames_bgr,
        depth_maps=depth_maps,
        poses_world_from_cam=poses_world_from_cam,
        intrinsics=intrinsics,
        score_threshold=score_threshold,
        iou_threshold=iou_threshold,
        max_per_frame=max_per_frame,
        label_allowlist=None,
    )
    tracks = _build_tracks(observations, min_samples=1)
    if dedup_enable:
        tracks = deduplicate_tracks_with_feature_matching(
            tracks,
            frames_bgr,
            merge_radius_m=float(dedup_merge_radius_m),
            feature_similarity_threshold=float(dedup_feature_similarity),
        )
    return _objects_from_tracks(tracks, merge_radius_m=1.0)


def deduplicate_objects(objects: list[SceneObject]) -> list[SceneObject]:
    MERGE_THRESHOLDS = {
        "bed": 2.0,
        "couch": 1.8,
        "sofa": 1.8,
        "dining table": 1.5,
        "table": 1.5,
        "chair": 0.8,
        "potted plant": 0.7,
        "tv": 1.2,
        "default": 1.0
    }

    # Group by label
    grouped: dict[str, list[SceneObject]] = {}
    for obj in objects:
        grouped.setdefault(obj.label.strip().lower(), []).append(obj)

    merged_objects: list[SceneObject] = []

    for label, group in grouped.items():
        threshold = MERGE_THRESHOLDS.get(label, MERGE_THRESHOLDS["default"])
        label_merged: list[SceneObject] = []
        
        for obj in group:
            if not getattr(obj, "source_frames", None):
                frame_name = f"frame_{obj.representative_frame_index:03d}.jpg" if obj.representative_frame_index is not None else "unknown.jpg"
                obj.source_frames = [frame_name]
            if not getattr(obj, "merged_from", None):
                obj.merged_from = [str(obj.object_id)]

            match_idx = -1
            best_d = 1e9
            for i, m in enumerate(label_merged):
                d = float(np.linalg.norm(obj.position_world - m.position_world))
                if d < threshold and d < best_d:
                    best_d = d
                    match_idx = i

            if match_idx == -1:
                label_merged.append(obj)
            else:
                m = label_merged[match_idx]
                print(f"Merging duplicate {m.label}: {obj.object_id} -> {m.object_id}")
                
                # Average position_world
                w_old = max(1, int(m.observations))
                w_new = max(1, int(obj.observations))
                total_w = w_old + w_new
                
                m.position_world = ((m.position_world * w_old) + (obj.position_world * w_new)) / float(total_w)
                m.distance_m = float((m.distance_m * w_old + obj.distance_m * w_new) / float(total_w))
                
                # Average size
                if m.size_m is not None and obj.size_m is not None:
                    m_size = np.array(m.size_m, dtype=np.float32)
                    obj_size = np.array(obj.size_m, dtype=np.float32)
                    avg_size = ((m_size * w_old) + (obj_size * w_new)) / float(total_w)
                    m.size_m = (float(avg_size[0]), float(avg_size[1]), float(avg_size[2]))
                
                m.observations = total_w
                
                if obj.representative_score is not None:
                    if m.representative_score is None or obj.representative_score > m.representative_score:
                        m.representative_score = obj.representative_score
                        m.representative_frame_index = obj.representative_frame_index
                        m.representative_bbox_xyxy = obj.representative_bbox_xyxy

                if obj.placement_quality == "estimated" or m.placement_quality == "estimated":
                    m.placement_quality = "estimated"
                
                m_frames = set(m.source_frames or [])
                obj_frames = set(obj.source_frames or [])
                m.source_frames = sorted(list(m_frames.union(obj_frames)))
                
                m_from = set(m.merged_from or [])
                obj_from = set(obj.merged_from or [])
                m.merged_from = sorted(list(m_from.union(obj_from)))

        merged_objects.extend(label_merged)

    return merged_objects


def detect_scene_entities_3d(
    frames_bgr: list[np.ndarray],
    depth_maps: list[np.ndarray],
    poses_world_from_cam: list[np.ndarray],
    intrinsics: CameraIntrinsics,
    score_threshold: float = DEFAULT_MINISCENE_CONFIG.confidence_base,
    iou_threshold: float = DEFAULT_MINISCENE_CONFIG.iou_threshold,
    max_per_frame: int = 6,
    label_allowlist: set[str] | None = None,
    min_track_samples: int = DEFAULT_MINISCENE_CONFIG.min_track_length,
    min_object_observations: int = 2,
    max_instances_by_label: dict[str, int] | None = None,
    dedup_enable: bool = True,
    dedup_merge_radius_m: float = 1.2,
    dedup_feature_similarity: float = 0.72,
    max_detect_keyframes: int = 0,
    disable_tracking: bool = False,
    out_dir: str | Path | None = None,
) -> tuple[list[SceneObject], list[SceneTrack], dict]:
    import time as pytime
    observations, metadata = _detect_observations(
        frames_bgr=frames_bgr,
        depth_maps=depth_maps,
        poses_world_from_cam=poses_world_from_cam,
        intrinsics=intrinsics,
        score_threshold=score_threshold,
        iou_threshold=iou_threshold,
        max_per_frame=max_per_frame,
        label_allowlist=label_allowlist,
        max_detect_keyframes=max_detect_keyframes,
        disable_tracking=disable_tracking,
        out_dir=out_dir,
    )
    t_track_start = pytime.perf_counter()
    tracks = _build_tracks(observations, min_samples=min_track_samples)
    if dedup_enable:
        tracks = deduplicate_tracks_with_feature_matching(
            tracks,
            frames_bgr,
            merge_radius_m=float(dedup_merge_radius_m),
            feature_similarity_threshold=float(dedup_feature_similarity),
        )
    objects = _objects_from_tracks(tracks, merge_radius_m=1.0)
    if min_object_observations > 1:
        objects = [o for o in objects if o.observations >= min_object_observations]

    if max_instances_by_label:
        tracks = _prune_tracks_by_label_limit(tracks, max_instances_by_label)
        objects = _prune_objects_by_label_limit(objects, tracks, max_instances_by_label)

    # 1. Determine which observations are already placed/represented in objects
    placed_obs_keys = set()
    for obj in objects:
        if obj.representative_frame_index is not None and obj.representative_bbox_xyxy is not None:
            placed_obs_keys.add((int(obj.representative_frame_index), tuple(int(v) for v in obj.representative_bbox_xyxy), obj.label.strip().lower()))

    # 2. Identify unplaced observations
    unplaced_observations = []
    for obs in observations:
        key = (int(obs.frame_index), tuple(int(v) for v in obs.bbox_xyxy), obs.label.strip().lower())
        if key in placed_obs_keys:
            continue
        
        # Also check if any existing object of the same label is within 1.2m
        covered_by_proximity = False
        for obj in objects:
            if obj.label.strip().lower() == obs.label.strip().lower():
                if np.linalg.norm(obj.position_world - obs.position_world) < 1.2:
                    covered_by_proximity = True
                    break
        if not covered_by_proximity:
            unplaced_observations.append(obs)

    # 3. Estimate proxy room bounds from camera positions
    if poses_world_from_cam:
        cam_centers = np.array([p[:3, 3] for p in poses_world_from_cam])
        pc_min = np.min(cam_centers, axis=0) - 3.0
        pc_max = np.max(cam_centers, axis=0) + 3.0
    else:
        pc_min = np.array([-3.0, -2.0, -3.0])
        pc_max = np.array([3.0, 2.0, 3.0])
    
    room_w = float(pc_max[0] - pc_min[0])
    room_d = float(pc_max[2] - pc_min[2])
    
    img_h, img_w = 480, 640
    if frames_bgr:
        img_h, img_w = frames_bgr[0].shape[:2]

    # 4. Convert unplaced observations to fallback objects, clamping and estimating positions
    fallback_objects = []
    rejection_report = {
        "low_confidence": 0,
        "unallowed_class": 0,
        "duplicate": 0,
        "invalid_bbox": 0,
        "missing_depth": 0
    }
    
    final_objects = list(objects)
    
    for idx, obs in enumerate(unplaced_observations, start=1):
        lbl_lower = obs.label.strip().lower()
        size = DEFAULT_SIZES.get(lbl_lower, (0.5, 0.5, 0.5))
        
        # simple room-bounds fallback position
        x1, y1, x2, y2 = obs.bbox_xyxy
        cx_norm = ((x1 + x2) / 2.0) / max(1, img_w)
        cy_norm = ((y1 + y2) / 2.0) / max(1, img_h)
        
        world_x = float(pc_min[0]) + cx_norm * room_w
        world_z = float(pc_min[2]) + cy_norm * room_d
        
        obj_h = size[1]  # Y is height axis
        world_y = float(pc_min[1]) + obj_h / 2.0
        
        pos_est = np.array([world_x, world_y, world_z], dtype=np.float32)
        pos_est = np.clip(pos_est, pc_min, pc_max)
        
        if obs.placement_quality == "estimated":
            pos = pos_est
        else:
            pos = np.clip(obs.position_world.copy(), pc_min, pc_max)
            
        # Check duplicate
        duplicate = False
        for f_obj in final_objects:
            if f_obj.label.strip().lower() == obs.label.strip().lower():
                if np.linalg.norm(f_obj.position_world - pos) < 1.2:
                    duplicate = True
                    break
        if duplicate:
            rejection_report["duplicate"] += 1
            continue
            
        fallback_obj = SceneObject(
            object_id=f"estimated_{idx}",
            label=obs.label,
            position_world=pos,
            distance_m=obs.distance_m,
            observations=1,
            size_m=size,
            representative_frame_index=int(obs.frame_index),
            representative_bbox_xyxy=obs.bbox_xyxy,
            representative_score=float(obs.score),
            placement_quality="estimated",
        )
        final_objects.append(fallback_obj)

    # 5. Populate rejection report based on raw detections not written to final_objects
    raw_dets = metadata.get("raw_detections", [])
    placed_keys = set()
    for obj in final_objects:
        if obj.representative_frame_index is not None and obj.representative_bbox_xyxy is not None:
            placed_keys.add((int(obj.representative_frame_index), tuple(int(v) for v in obj.representative_bbox_xyxy), obj.label.strip().lower()))
            
    for det in raw_dets:
        det_label = det["label"]
        det_label_lower = det_label.strip().lower()
        det_conf = det["confidence"]
        det_bbox = det["bbox_2d"]
        det_frame = det["frame_index"]
        
        key = (int(det_frame), tuple(int(v) for v in det_bbox), det_label_lower)
        if key in placed_keys:
            continue
            
        if label_allowlist and det_label not in label_allowlist:
            rejection_report["unallowed_class"] += 1
        elif det_conf < _label_threshold(det_label, float(score_threshold)):
            rejection_report["low_confidence"] += 1
        elif len(det_bbox) != 4 or det_bbox[2] <= det_bbox[0] or det_bbox[3] <= det_bbox[1]:
            rejection_report["invalid_bbox"] += 1
        else:
            rejection_report["duplicate"] += 1
            
    pre_dedup = len(final_objects)
    
    # Initial formatted indexing for logging
    label_counts = {}
    for obj in final_objects:
        lbl_clean = obj.label.strip().lower().replace(" ", "_")
        label_counts[lbl_clean] = label_counts.get(lbl_clean, 0) + 1
        obj.object_id = f"{lbl_clean}_{label_counts[lbl_clean]}"

    # Deduplicate objects
    final_objects = deduplicate_objects(final_objects)

    # Final formatted indexing for clean sequence
    label_counts = {}
    for obj in final_objects:
        lbl_clean = obj.label.strip().lower().replace(" ", "_")
        label_counts[lbl_clean] = label_counts.get(lbl_clean, 0) + 1
        obj.object_id = f"{lbl_clean}_{label_counts[lbl_clean]}"

    metadata["rejection_report"] = rejection_report
    metadata["fallback_used"] = (len(final_objects) > len(objects)) or (len(final_objects) == 0 and metadata.get("raw_detections_count", 0) > 0)
    metadata["fallback_reason"] = "Converted 2D YOLO detections to estimated 3D objects"
    
    metadata["pre_dedup_object_count"] = pre_dedup
    metadata["final_objects_count"] = len(final_objects)
    metadata["merged_duplicates_count"] = pre_dedup - len(final_objects)
    metadata["deduplication_enabled"] = True

    metadata["object_tracking_time"] += pytime.perf_counter() - t_track_start

    return final_objects, tracks, metadata


def deduplicate_tracks_with_feature_matching(
    tracks: list[SceneTrack],
    frames_bgr: list[np.ndarray],
    merge_radius_m: float = 1.2,
    feature_similarity_threshold: float = 0.72,
) -> list[SceneTrack]:
    """Merge fragmented tracks of the same object using 3D proximity and ORB appearance similarity."""
    if not tracks or not frames_bgr:
        return tracks

    signatures: list[dict[str, object]] = []
    for tr in tracks:
        pts = np.asarray([s.position_world for s in tr.samples], dtype=np.float32)
        if pts.size == 0:
            center = np.zeros((3,), dtype=np.float32)
        else:
            center = np.median(pts, axis=0).astype(np.float32)
        desc = _track_appearance_descriptor(tr, frames_bgr)
        signatures.append({"track": tr, "center": center, "desc": desc})

    n = len(signatures)
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra = find(a)
        rb = find(b)
        if ra != rb:
            parent[rb] = ra

    for i in range(n):
        ti = signatures[i]["track"]
        ci = signatures[i]["center"]
        di = signatures[i]["desc"]
        if not isinstance(ti, SceneTrack) or not isinstance(ci, np.ndarray):
            continue

        for j in range(i + 1, n):
            tj = signatures[j]["track"]
            cj = signatures[j]["center"]
            dj = signatures[j]["desc"]
            if not isinstance(tj, SceneTrack) or not isinstance(cj, np.ndarray):
                continue
            if ti.label != tj.label:
                continue

            d_world = float(np.linalg.norm(ci - cj))
            if not np.isfinite(d_world) or d_world > merge_radius_m:
                continue

            sim = _descriptor_similarity(di, dj)
            if sim is None:
                # If appearance is unavailable, require stricter geometric closeness.
                if d_world <= 0.55 * merge_radius_m:
                    union(i, j)
                continue

            if sim >= feature_similarity_threshold:
                union(i, j)

    grouped: dict[int, list[SceneTrack]] = {}
    for idx, sig in enumerate(signatures):
        tr = sig["track"]
        if not isinstance(tr, SceneTrack):
            continue
        grouped.setdefault(find(idx), []).append(tr)

    merged_tracks: list[SceneTrack] = []
    next_track_id = 1
    for _, grp in grouped.items():
        if len(grp) == 1:
            t = grp[0]
            merged_tracks.append(SceneTrack(track_id=next_track_id, label=t.label, samples=list(t.samples)))
            next_track_id += 1
            continue

        label = grp[0].label
        samples: list[SceneTrackSample] = []
        for tr in grp:
            samples.extend(tr.samples)

        samples.sort(key=lambda s: (s.frame_index, float(s.distance_m)))
        merged_tracks.append(SceneTrack(track_id=next_track_id, label=label, samples=samples))
        next_track_id += 1

    merged_tracks.sort(key=lambda t: (-len(t.samples), t.label, t.track_id))
    return merged_tracks


def _track_appearance_descriptor(track: SceneTrack, frames_bgr: list[np.ndarray]) -> np.ndarray | None:
    if not track.samples:
        return None

    best_sample = max(track.samples, key=lambda s: float(s.score or 0.0))
    if best_sample.bbox_xyxy is None:
        return None

    fi = int(best_sample.frame_index)
    if fi < 0 or fi >= len(frames_bgr):
        return None

    frame = frames_bgr[fi]
    x1, y1, x2, y2 = [int(v) for v in best_sample.bbox_xyxy]
    h, w = frame.shape[:2]
    x1 = max(0, min(w - 1, x1))
    x2 = max(0, min(w, x2))
    y1 = max(0, min(h - 1, y1))
    y2 = max(0, min(h, y2))
    if x2 <= x1 or y2 <= y1:
        return None

    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return None

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    orb = cv2.ORB_create(nfeatures=128)
    _, desc = orb.detectAndCompute(gray, None)
    if desc is None or len(desc) == 0:
        return None

    v = np.mean(desc.astype(np.float32), axis=0)
    norm = float(np.linalg.norm(v))
    if norm <= 1e-6:
        return None
    return (v / norm).astype(np.float32)


def _descriptor_similarity(a: np.ndarray | None, b: np.ndarray | None) -> float | None:
    if a is None or b is None:
        return None
    if a.shape != b.shape or a.ndim != 1:
        return None
    sim = float(np.dot(a, b))
    if not np.isfinite(sim):
        return None
    return sim


def refine_objects_with_point_cloud(
    objects: list[SceneObject],
    points_world: np.ndarray,
    k_neighbors: int = 256,
    max_snap_radius_m: float = 1.8,
) -> list[SceneObject]:
    if not objects:
        return objects
    if points_world is None or len(points_world) == 0:
        return objects

    pts = np.asarray(points_world, dtype=np.float32)
    if pts.ndim != 2 or pts.shape[1] != 3:
        return objects

    for obj in objects:
        d = np.linalg.norm(pts - obj.position_world.reshape(1, 3), axis=1)
        if d.size == 0:
            continue
        order = np.argsort(d)
        nn = order[: min(k_neighbors, order.size)]
        if nn.size == 0:
            continue
        if float(d[nn[0]]) > max_snap_radius_m:
            continue

        local = pts[nn]
        obj.position_world = np.median(local, axis=0).astype(np.float32)

    return objects


def estimate_ground_plane(points_world: np.ndarray, percentile: float = 5.0) -> float:
    """Estimate ground plane Y coordinate from lowest points in point cloud."""
    if points_world is None or len(points_world) == 0:
        return 0.0
    pts = np.asarray(points_world, dtype=np.float32)
    if pts.ndim != 2 or pts.shape[1] != 3 or pts.shape[0] < 10:
        return 0.0
    y_coords = pts[:, 1]
    valid = y_coords[np.isfinite(y_coords)]
    if valid.size == 0:
        return 0.0
    return float(np.percentile(valid, percentile))


def align_objects_to_ground(objects: list[SceneObject], ground_y: float, object_heights: dict[str, float] | None = None) -> list[SceneObject]:
    """Align object anchors to the ground plane so they sit on the floor."""
    if not objects or not np.isfinite(ground_y):
        return objects
    for obj in objects:
        _ = object_heights
        obj.position_world[1] = ground_y
    return objects


def _objects_from_tracks(tracks: list[SceneTrack], merge_radius_m: float = 1.0) -> list[SceneObject]:
    if not tracks:
        return []

    def _sample_width_m(bbox: tuple[int, int, int, int], depth_m: float) -> float:
        x1, _, x2, _ = bbox
        px_w = max(1, x2 - x1)
        focal_px = 1200.0
        return float(px_w * depth_m / focal_px)

    def _sample_height_m(bbox: tuple[int, int, int, int], depth_m: float) -> float:
        _, y1, _, y2 = bbox
        px_h = max(1, y2 - y1)
        focal_px = 1200.0
        return float(px_h * depth_m / focal_px)

    # Start with one object candidate per stable track.
    candidates: list[SceneObject] = []
    next_id = 1
    for tr in tracks:
        pts = np.asarray([s.position_world for s in tr.samples], dtype=np.float32)
        if pts.size == 0:
            continue
        center = np.median(pts, axis=0)
        d_median = float(np.median(np.asarray([s.distance_m for s in tr.samples], dtype=np.float32)))

        widths_m = []
        heights_m = []
        for s in tr.samples:
            if s.bbox_xyxy is not None:
                widths_m.append(_sample_width_m(s.bbox_xyxy, s.distance_m))
                heights_m.append(_sample_height_m(s.bbox_xyxy, s.distance_m))

        if widths_m and heights_m:
            w_m = float(np.median(widths_m))
            h_m = float(np.median(heights_m))
            d_m = max(0.08, min(w_m, h_m) * 0.8)
            size_m = (w_m, h_m, d_m)
        else:
            size_m = DEFAULT_SIZES.get(tr.label.strip().lower(), (0.5, 0.5, 0.5))

        p_q = "estimated" if any(getattr(s, "placement_quality", "good") == "estimated" for s in tr.samples) else "good"

        best_sample = max(tr.samples, key=lambda s: float(s.score or 0.0))
        candidates.append(
            SceneObject(
                object_id=next_id,
                label=tr.label,
                position_world=center.astype(np.float32),
                distance_m=d_median,
                observations=len(tr.samples),
                size_m=size_m,
                representative_frame_index=int(best_sample.frame_index),
                representative_bbox_xyxy=best_sample.bbox_xyxy,
                representative_score=float(best_sample.score) if best_sample.score is not None else None,
                placement_quality=p_q,
            )
        )
        next_id += 1

    # Merge fragmented tracks for the same semantic object.
    merged: list[SceneObject] = []
    for obj in sorted(candidates, key=lambda o: (-o.observations, o.distance_m)):
        match_idx = -1
        best_d = 1e9
        for i, m in enumerate(merged):
            if m.label != obj.label:
                continue
            d = float(np.linalg.norm(obj.position_world - m.position_world))
            if d < merge_radius_m and d < best_d:
                best_d = d
                match_idx = i

        if match_idx == -1:
            merged.append(obj)
            continue

        m = merged[match_idx]
        w_old = max(1, int(m.observations))
        w_new = max(1, int(obj.observations))
        m.position_world = ((m.position_world * w_old) + (obj.position_world * w_new)) / float(w_old + w_new)
        m.distance_m = float((m.distance_m * w_old + obj.distance_m * w_new) / float(w_old + w_new))
        m.observations = int(w_old + w_new)
        if obj.placement_quality == "estimated" or m.placement_quality == "estimated":
            m.placement_quality = "estimated"
        if w_new > w_old:
            m.size_m = obj.size_m
        if (obj.representative_score or 0.0) > (m.representative_score or 0.0):
            m.representative_score = obj.representative_score
            m.representative_frame_index = obj.representative_frame_index
            m.representative_bbox_xyxy = obj.representative_bbox_xyxy

    for i, o in enumerate(merged, start=1):
        o.object_id = i
    return merged


def _prune_tracks_by_label_limit(tracks: list[SceneTrack], max_instances_by_label: dict[str, int]) -> list[SceneTrack]:
    if not tracks:
        return tracks

    grouped: dict[str, list[SceneTrack]] = {}
    for tr in tracks:
        grouped.setdefault(tr.label, []).append(tr)

    selected: list[SceneTrack] = []
    for label, lst in grouped.items():
        limit = max_instances_by_label.get(label)
        if limit is None or limit <= 0:
            selected.extend(lst)
            continue

        # Prefer tracks with more samples and longer temporal span.
        ranked = sorted(
            lst,
            key=lambda t: (
                len(t.samples),
                (t.samples[-1].frame_index - t.samples[0].frame_index) if len(t.samples) > 1 else 0,
            ),
            reverse=True,
        )
        selected.extend(ranked[:limit])

    return sorted(selected, key=lambda t: (-len(t.samples), t.label, t.track_id))


def _prune_objects_by_label_limit(
    objects: list[SceneObject],
    tracks: list[SceneTrack],
    max_instances_by_label: dict[str, int],
) -> list[SceneObject]:
    if not objects:
        return objects

    # Use kept track centroids as preferred anchors for stable object identity.
    track_centers: dict[str, list[np.ndarray]] = {}
    for tr in tracks:
        pts = np.asarray([s.position_world for s in tr.samples], dtype=np.float32)
        if pts.size == 0:
            continue
        track_centers.setdefault(tr.label, []).append(np.mean(pts, axis=0))

    grouped: dict[str, list[SceneObject]] = {}
    for obj in objects:
        grouped.setdefault(obj.label, []).append(obj)

    selected: list[SceneObject] = []
    for label, lst in grouped.items():
        limit = max_instances_by_label.get(label)
        if limit is None or limit <= 0:
            selected.extend(lst)
            continue

        centers = track_centers.get(label, [])
        if centers:
            def rank_key(o: SceneObject) -> tuple[float, int]:
                d = min(float(np.linalg.norm(o.position_world - c)) for c in centers)
                return (d, -o.observations)

            ranked = sorted(lst, key=rank_key)
        else:
            ranked = sorted(lst, key=lambda o: (-o.observations, o.distance_m))

        selected.extend(ranked[:limit])

    # Reindex IDs for cleaner downstream UI.
    for i, obj in enumerate(selected, start=1):
        obj.object_id = i
    return selected


def _detect_observations(
    frames_bgr: list[np.ndarray],
    depth_maps: list[np.ndarray],
    poses_world_from_cam: list[np.ndarray],
    intrinsics: CameraIntrinsics,
    score_threshold: float,
    iou_threshold: float,
    max_per_frame: int,
    label_allowlist: set[str] | None,
    max_detect_keyframes: int = 0,
    disable_tracking: bool = False,
    out_dir: str | Path | None = None,
) -> tuple[list[ObjectObservation], dict]:
    metadata = {
        "yolo_loaded": False,
        "frames_scanned": 0,
        "raw_detections_count": 0,
        "final_objects_count": 0,
        "rejection_reasons": {
            "low_confidence": 0,
            "unallowed_class": 0
        },
        "object_detection_time": 0.0,
        "object_tracking_time": 0.0,
        "raw_detections": []
    }

    if not frames_bgr:
        return [], metadata

    success, model = verify_yolo_status("yolov8n-seg.pt", detection_enabled=True)
    if not success or model is None:
        return [], metadata

    metadata["yolo_loaded"] = True

    L = len(frames_bgr)
    if 0 < max_detect_keyframes < L:
        if max_detect_keyframes == 1:
            keyframes_set = {L // 2}
        else:
            keyframes_set = {int(round(i * (L - 1) / (max_detect_keyframes - 1))) for i in range(max_detect_keyframes)}
    else:
        keyframes_set = set(range(L))

    observations: list[ObjectObservation] = []
    common_kept_total = 0
    raw_detections_data = {"frames": []}

    current_keyframe_idx = 0
    total_keyframes = len(keyframes_set)
    for frame_idx, (frame_bgr, depth_map, pose) in enumerate(zip(frames_bgr, depth_maps, poses_world_from_cam)):
        if frame_idx not in keyframes_set:
            continue
        
        current_keyframe_idx += 1
        print(f"Running YOLO keyframe {current_keyframe_idx}/{total_keyframes}")
        metadata["frames_scanned"] += 1
        used_conf = float(score_threshold)
        kept = 0
        frame_candidates: list[ObjectObservation] = []
        conf_schedule = _adaptive_conf_schedule(float(score_threshold))

        got_detections = False
        frame_detections = []

        for conf_try in conf_schedule:
            used_conf = float(conf_try)
            import time as pytime
            t_det_start = pytime.perf_counter()
            try:
                if disable_tracking:
                    results = model.predict(
                        source=frame_bgr,
                        verbose=False,
                        conf=used_conf,
                        iou=float(iou_threshold),
                    )
                else:
                    results = model.track(
                        source=frame_bgr,
                        persist=True,
                        verbose=False,
                        conf=used_conf,
                        iou=float(iou_threshold),
                        tracker="bytetrack.yaml",
                    )
            except Exception:
                results = None

            det_elapsed = pytime.perf_counter() - t_det_start
            metadata["object_detection_time"] += det_elapsed

            if not results:
                continue

            r0 = results[0]
            boxes = getattr(r0, "boxes", None)
            if boxes is None or len(boxes) == 0:
                continue

            got_detections = True
            masks_obj = getattr(r0, "masks", None)
            masks_data = None
            if masks_obj is not None and getattr(masks_obj, "data", None) is not None:
                masks_data = masks_obj.data.detach().cpu().numpy()

            xyxy = boxes.xyxy.detach().cpu().numpy() if boxes.xyxy is not None else np.empty((0, 4), dtype=np.float32)
            confs = boxes.conf.detach().cpu().numpy() if boxes.conf is not None else np.empty((0,), dtype=np.float32)
            clss = boxes.cls.detach().cpu().numpy().astype(np.int32) if boxes.cls is not None else np.empty((0,), dtype=np.int32)
            ids = boxes.id.detach().cpu().numpy().astype(np.int32) if getattr(boxes, "id", None) is not None else np.full((len(xyxy),), -1, dtype=np.int32)
            names = getattr(r0, "names", {}) or {}

            frame_detections = []
            for box, score, label_id in zip(xyxy, confs, clss):
                x1, y1, x2, y2 = [int(v) for v in box]
                label = str(names.get(int(label_id), f"obj_{int(label_id)}"))
                frame_detections.append({
                    "label": label,
                    "confidence": float(score),
                    "bbox_2d": [x1, y1, x2, y2]
                })

            metadata["raw_detections_count"] += len(frame_detections)
            for det in frame_detections:
                metadata["raw_detections"].append({
                    "frame_index": int(frame_idx),
                    "label": det["label"],
                    "confidence": det["confidence"],
                    "bbox_2d": det["bbox_2d"]
                })

            frame_candidates = []
            for det_idx, (box, score, label_id, yolo_track_id) in enumerate(zip(xyxy, confs, clss, ids)):
                x1, y1, x2, y2 = [int(v) for v in box]
                label = str(names.get(int(label_id), f"obj_{int(label_id)}"))
                label_key = label.strip().lower()
                mask = masks_data[det_idx] if masks_data is not None and det_idx < len(masks_data) else None

                if label_allowlist and label not in label_allowlist:
                    metadata["rejection_reasons"]["unallowed_class"] += 1
                    continue
                if float(score) < _label_threshold(label, float(score_threshold)):
                    metadata["rejection_reasons"]["low_confidence"] += 1
                    continue

                d, valid_count, refined_bbox, center_xy = _mask_depth_and_center(depth_map, (x1, y1, x2, y2), mask)
                placement_quality = "good"
                if d <= 0.0 or not np.isfinite(d):
                    d = 1.5
                    placement_quality = "estimated"

                u, v = center_xy
                p_cam = pixel_to_camera_point(u, v, float(d), intrinsics)
                p_world = camera_to_world(p_cam, pose)

                cam_center = pose[:3, 3]
                dist = float(np.linalg.norm(p_world - cam_center))

                frame_candidates.append(
                    ObjectObservation(
                        frame_index=frame_idx,
                        label=label,
                        score=float(score),
                        track_id=int(yolo_track_id) if int(yolo_track_id) >= 0 else None,
                        bbox_xyxy=refined_bbox,
                        position_world=p_world.astype(np.float32),
                        distance_m=dist,
                        placement_quality=placement_quality,
                    )
                )
                if label_key in COMMON_OBJECT_LABELS:
                    common_kept_total += 1
                if int(frame_idx) <= 1 and int(valid_count) > 0:
                    bbox_w = max(0, refined_bbox[2] - refined_bbox[0])
                    bbox_h = max(0, refined_bbox[3] - refined_bbox[1])
                    source = "mask" if mask is not None else "bbox"
                    print(f"  [depth] {label}: depth={d:.3f}m, distance={dist:.3f}m, source={source}, bbox_size=({bbox_w}x{bbox_h}), valid_pixels={valid_count}")

            if frame_candidates:
                break

        if not frame_candidates and conf_schedule:
            # Last-resort rescue for common objects at a softer threshold.
            rescue_conf = max(0.12, min(conf_schedule[-1], float(score_threshold) * 0.40))
            used_conf = float(rescue_conf)
            try:
                if disable_tracking:
                    results = model.predict(
                        source=frame_bgr,
                        verbose=False,
                        conf=used_conf,
                        iou=float(iou_threshold),
                    )
                else:
                    results = model.track(
                        source=frame_bgr,
                        persist=True,
                        verbose=False,
                        conf=used_conf,
                        iou=float(iou_threshold),
                        tracker="bytetrack.yaml",
                    )
            except Exception:
                results = None

            if results:
                r0 = results[0]
                boxes = getattr(r0, "boxes", None)
                if boxes is not None and len(boxes) > 0:
                    got_detections = True
                    masks_obj = getattr(r0, "masks", None)
                    masks_data = None
                    if masks_obj is not None and getattr(masks_obj, "data", None) is not None:
                        masks_data = masks_obj.data.detach().cpu().numpy()

                    xyxy = boxes.xyxy.detach().cpu().numpy() if boxes.xyxy is not None else np.empty((0, 4), dtype=np.float32)
                    confs = boxes.conf.detach().cpu().numpy() if boxes.conf is not None else np.empty((0,), dtype=np.float32)
                    clss = boxes.cls.detach().cpu().numpy().astype(np.int32) if boxes.cls is not None else np.empty((0,), dtype=np.int32)
                    ids = boxes.id.detach().cpu().numpy().astype(np.int32) if getattr(boxes, "id", None) is not None else np.full((len(xyxy),), -1, dtype=np.int32)
                    names = getattr(r0, "names", {}) or {}

                    frame_detections = []
                    for box, score, label_id in zip(xyxy, confs, clss):
                        x1, y1, x2, y2 = [int(v) for v in box]
                        label = str(names.get(int(label_id), f"obj_{int(label_id)}"))
                        frame_detections.append({
                            "label": label,
                            "confidence": float(score),
                            "bbox_2d": [x1, y1, x2, y2]
                        })

                    metadata["raw_detections_count"] += len(frame_detections)
                    for det in frame_detections:
                        metadata["raw_detections"].append({
                            "frame_index": int(frame_idx),
                            "label": det["label"],
                            "confidence": det["confidence"],
                            "bbox_2d": det["bbox_2d"]
                        })

                    for det_idx, (box, score, label_id, yolo_track_id) in enumerate(zip(xyxy, confs, clss, ids)):
                        x1, y1, x2, y2 = [int(v) for v in box]
                        label = str(names.get(int(label_id), f"obj_{int(label_id)}"))
                        label_key = label.strip().lower()
                        mask = masks_data[det_idx] if masks_data is not None and det_idx < len(masks_data) else None

                        if label_key not in COMMON_OBJECT_LABELS:
                            continue
                        if label_allowlist and label not in label_allowlist:
                            metadata["rejection_reasons"]["unallowed_class"] += 1
                            continue
                        if float(score) < rescue_conf:
                            metadata["rejection_reasons"]["low_confidence"] += 1
                            continue

                        d, valid_count, refined_bbox, center_xy = _mask_depth_and_center(depth_map, (x1, y1, x2, y2), mask)
                        placement_quality = "good"
                        if d <= 0.0 or not np.isfinite(d):
                            d = 1.5
                            placement_quality = "estimated"

                        u, v = center_xy
                        p_cam = pixel_to_camera_point(u, v, float(d), intrinsics)
                        p_world = camera_to_world(p_cam, pose)

                        cam_center = pose[:3, 3]
                        dist = float(np.linalg.norm(p_world - cam_center))

                        frame_candidates.append(
                            ObjectObservation(
                                frame_index=frame_idx,
                                label=label,
                                score=float(score),
                                track_id=int(yolo_track_id) if int(yolo_track_id) >= 0 else None,
                                bbox_xyxy=refined_bbox,
                                position_world=p_world.astype(np.float32),
                                distance_m=dist,
                                placement_quality=placement_quality,
                            )
                        )
                        common_kept_total += 1

        if frame_candidates:
            for obs in sorted(frame_candidates, key=lambda o: o.score, reverse=True):
                observations.append(obs)
                kept += 1
                if kept >= max_per_frame:
                    break

        print(f"[objects] frame={frame_idx} final_conf={used_conf:.2f} kept={kept}")

        # Save debug images if out_dir is provided
        if out_dir is not None:
            debug_dir = Path(out_dir) / "debug_detection_frames"
            debug_dir.mkdir(parents=True, exist_ok=True)
            orig_path = debug_dir / f"frame_{frame_idx:03d}.jpg"
            cv2.imwrite(str(orig_path), frame_bgr)

            drawn_frame = frame_bgr.copy()
            for det in frame_detections:
                x1, y1, x2, y2 = det["bbox_2d"]
                lbl = det["label"]
                conf = det["confidence"]
                cv2.rectangle(drawn_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(drawn_frame, f"{lbl} {conf:.2f}", (x1, max(15, y1 - 5)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            det_path = debug_dir / f"frame_{frame_idx:03d}_detections.jpg"
            cv2.imwrite(str(det_path), drawn_frame)

        raw_detections_data["frames"].append({
            "frame": f"frame_{frame_idx:03d}.jpg",
            "detections": frame_detections
        })

    if observations and common_kept_total == 0:
        print("[objects] warning: no common-object detections kept (person/chair/sofa/table)")

    if out_dir is not None:
        raw_json_path = Path(out_dir) / "raw_detections.json"
        try:
            raw_json_path.write_text(json.dumps(raw_detections_data, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"[objects] failed to write raw_detections.json: {e}")

    return observations, metadata


def _cluster_observations(observations: list[ObjectObservation], merge_radius_m: float = 0.9) -> list[SceneObject]:
    if not observations:
        return []

    clusters: list[dict] = []
    for obs in observations:
        chosen_idx = -1
        best_d = 1e9
        for idx, c in enumerate(clusters):
            if c["label"] != obs.label:
                continue
            d = float(np.linalg.norm(obs.position_world - c["center"]))
            if d < merge_radius_m and d < best_d:
                best_d = d
                chosen_idx = idx

        if chosen_idx == -1:
            clusters.append(
                {
                    "label": obs.label,
                    "points": [obs.position_world],
                    "distances": [obs.distance_m],
                    "center": obs.position_world.copy(),
                    "widths_m": [max(0.05, _bbox_width_m(obs, obs.distance_m))],
                    "heights_m": [max(0.05, _bbox_height_m(obs, obs.distance_m))],
                    "best_obs": obs,
                }
            )
        else:
            c = clusters[chosen_idx]
            c["points"].append(obs.position_world)
            c["distances"].append(obs.distance_m)
            c["center"] = np.mean(np.asarray(c["points"], dtype=np.float32), axis=0)
            c["widths_m"].append(max(0.05, _bbox_width_m(obs, obs.distance_m)))
            c["heights_m"].append(max(0.05, _bbox_height_m(obs, obs.distance_m)))
            if obs.score > c["best_obs"].score:
                c["best_obs"] = obs

    result: list[SceneObject] = []
    for i, c in enumerate(clusters, start=1):
        pts = np.asarray(c["points"], dtype=np.float32)
        center = np.median(pts, axis=0)
        d_median = float(np.median(np.asarray(c["distances"], dtype=np.float32)))
        w_m = float(np.median(np.asarray(c["widths_m"], dtype=np.float32)))
        h_m = float(np.median(np.asarray(c["heights_m"], dtype=np.float32)))
        d_m = max(0.08, min(w_m, h_m) * 0.8)
        best_obs: ObjectObservation = c["best_obs"]
        result.append(
            SceneObject(
                object_id=i,
                label=str(c["label"]),
                position_world=center.astype(np.float32),
                distance_m=d_median,
                observations=len(c["points"]),
                size_m=(w_m, h_m, d_m),
                representative_frame_index=int(best_obs.frame_index),
                representative_bbox_xyxy=tuple(int(v) for v in best_obs.bbox_xyxy),
                representative_score=float(best_obs.score),
            )
        )

    result.sort(key=lambda o: (-o.observations, o.distance_m))
    return result


def _bbox_iou(a: tuple[int, int, int, int] | None, b: tuple[int, int, int, int] | None) -> float:
    if a is None or b is None:
        return 0.0

    ax1, ay1, ax2, ay2 = [int(v) for v in a]
    bx1, by1, bx2, by2 = [int(v) for v in b]

    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)

    iw = max(0, ix2 - ix1)
    ih = max(0, iy2 - iy1)
    inter = float(iw * ih)
    if inter <= 0.0:
        return 0.0

    area_a = float(max(0, ax2 - ax1) * max(0, ay2 - ay1))
    area_b = float(max(0, bx2 - bx1) * max(0, by2 - by1))
    union = area_a + area_b - inter
    if union <= 1e-6:
        return 0.0
    return float(inter / union)


def _build_tracks(
    observations: list[ObjectObservation],
    match_iou_threshold: float = 0.25,
    max_missed_frames: int = 3,
    min_samples: int = 2,
) -> list[SceneTrack]:
    if not observations:
        return []

    grouped: dict[int, list[ObjectObservation]] = {}
    for obs in observations:
        grouped.setdefault(int(obs.frame_index), []).append(obs)

    frame_indices = sorted(grouped.keys())
    active_tracks: list[dict[str, object]] = []
    finished_tracks: list[dict[str, object]] = []
    next_track_id = 1

    def _new_track(obs: ObjectObservation, track_id: int) -> dict[str, object]:
        sample = SceneTrackSample(
            frame_index=int(obs.frame_index),
            position_world=obs.position_world.astype(np.float32),
            distance_m=float(obs.distance_m),
            score=float(obs.score),
            bbox_xyxy=tuple(int(v) for v in obs.bbox_xyxy),
        )
        return {
            "track_id": int(track_id),
            "label": obs.label,
            "samples": [sample],
            "last_bbox": tuple(int(v) for v in obs.bbox_xyxy),
            "missed": 0,
            "hits": 1,
            "running_position": obs.position_world.astype(np.float32),
            "running_confidence": float(obs.score),
            "stable": bool(int(min_samples) <= 1),
        }

    def _finalize_stable_track(tr: dict[str, object]) -> None:
        if not bool(tr.get("stable", False)):
            return
        samples = tr.get("samples", [])
        if not isinstance(samples, list) or len(samples) < int(min_samples):
            return
        finished_tracks.append(tr)

    for frame_idx in frame_indices:
        frame_obs = sorted(grouped[frame_idx], key=lambda o: float(o.score), reverse=True)

        pairs: list[tuple[float, int, int]] = []
        for obs_idx, obs in enumerate(frame_obs):
            for tr_idx, tr in enumerate(active_tracks):
                if str(tr.get("label")) != obs.label:
                    continue
                iou = _bbox_iou(tr.get("last_bbox"), obs.bbox_xyxy)
                if iou < float(match_iou_threshold):
                    continue
                pairs.append((float(iou), obs_idx, tr_idx))

        pairs.sort(reverse=True, key=lambda x: x[0])
        matched_obs: set[int] = set()
        matched_tracks: set[int] = set()

        for _, obs_idx, tr_idx in pairs:
            if obs_idx in matched_obs or tr_idx in matched_tracks:
                continue

            obs = frame_obs[obs_idx]
            tr = active_tracks[tr_idx]
            hits = int(tr.get("hits", 0))
            avg_pos = np.asarray(tr.get("running_position"), dtype=np.float32)
            if avg_pos.shape != (3,):
                avg_pos = obs.position_world.astype(np.float32)
            avg_conf = float(tr.get("running_confidence", float(obs.score)))

            new_hits = hits + 1
            new_avg_pos = ((avg_pos * hits) + obs.position_world.astype(np.float32)) / float(new_hits)
            new_avg_conf = ((avg_conf * hits) + float(obs.score)) / float(new_hits)

            samples_obj = tr.get("samples", [])
            if isinstance(samples_obj, list):
                samples_obj.append(
                    SceneTrackSample(
                        frame_index=int(obs.frame_index),
                        position_world=new_avg_pos.astype(np.float32),
                        distance_m=float(obs.distance_m),
                        score=float(obs.score),
                        bbox_xyxy=tuple(int(v) for v in obs.bbox_xyxy),
                    )
                )

            tr["running_position"] = new_avg_pos.astype(np.float32)
            tr["running_confidence"] = float(new_avg_conf)
            tr["last_bbox"] = tuple(int(v) for v in obs.bbox_xyxy)
            tr["missed"] = 0
            tr["hits"] = new_hits
            tr["stable"] = bool(new_hits >= int(min_samples))

            matched_obs.add(obs_idx)
            matched_tracks.add(tr_idx)

        for tr_idx, tr in enumerate(active_tracks):
            if tr_idx in matched_tracks:
                continue
            tr["missed"] = int(tr.get("missed", 0)) + 1

        survivors: list[dict[str, object]] = []
        for tr in active_tracks:
            if int(tr.get("missed", 0)) > int(max_missed_frames):
                _finalize_stable_track(tr)
            else:
                survivors.append(tr)
        active_tracks = survivors

        for obs_idx, obs in enumerate(frame_obs):
            if obs_idx in matched_obs:
                continue
            active_tracks.append(_new_track(obs, next_track_id))
            next_track_id += 1

    for tr in active_tracks:
        _finalize_stable_track(tr)

    result: list[SceneTrack] = []
    for tr in finished_tracks:
        samples_obj = tr.get("samples", [])
        if not isinstance(samples_obj, list):
            continue
        samples = [s for s in samples_obj if isinstance(s, SceneTrackSample)]
        if len(samples) < int(min_samples):
            continue
        samples.sort(key=lambda s: int(s.frame_index))
        result.append(SceneTrack(track_id=int(tr["track_id"]), label=str(tr["label"]), samples=samples))

    # Reindex to keep contiguous IDs for downstream validation.
    result.sort(key=lambda t: (-len(t.samples), t.label, t.track_id))
    for i, tr in enumerate(result, start=1):
        tr.track_id = i
    return result



def _track_aggregated_bbox(samples: list[SceneTrackSample]) -> tuple[int, int, int, int] | None:
    boxes = [s.bbox_xyxy for s in samples if s.bbox_xyxy is not None]
    if not boxes:
        return None
    x1 = min(int(b[0]) for b in boxes)
    y1 = min(int(b[1]) for b in boxes)
    x2 = max(int(b[2]) for b in boxes)
    y2 = max(int(b[3]) for b in boxes)
    return (x1, y1, x2, y2)


def _track_average_score(samples: list[SceneTrackSample]) -> float | None:
    vals = [float(s.score) for s in samples if s.score is not None and np.isfinite(float(s.score))]
    if not vals:
        return None
    return float(np.mean(np.asarray(vals, dtype=np.float32)))


def _objects_payload_from_tracks(tracks: list[SceneTrack], ground_y: float | None = None) -> list[dict]:
    payload: list[dict] = []
    for t in tracks:
        pts = np.asarray([s.position_world for s in t.samples], dtype=np.float32)
        if pts.size == 0:
            center = np.zeros((3,), dtype=np.float32)
        else:
            center = np.median(pts, axis=0).astype(np.float32)

        if ground_y is not None and np.isfinite(ground_y):
            center[1] = float(ground_y)

        distances = np.asarray([float(s.distance_m) for s in t.samples], dtype=np.float32)
        distance_m = float(np.median(distances)) if distances.size > 0 else 0.0

        best_sample = max(
            t.samples,
            key=lambda s: float(s.score) if s.score is not None else -1.0,
        )
        avg_score = _track_average_score(t.samples)
        aggregated_bbox = _track_aggregated_bbox(t.samples)

        payload.append(
            {
                "id": int(t.track_id),
                "label": t.label,
                "position_world": [float(center[0]), float(center[1]), float(center[2])],
                "distance_m": float(distance_m),
                "observations": int(len(t.samples)),
                "representative_frame_index": int(best_sample.frame_index),
                "representative_bbox_xyxy": list(best_sample.bbox_xyxy) if best_sample.bbox_xyxy is not None else None,
                "representative_score": float(best_sample.score) if best_sample.score is not None else None,
                "aggregated_bbox_xyxy": list(aggregated_bbox) if aggregated_bbox is not None else None,
                "average_score": float(avg_score) if avg_score is not None else None,
                "sprite_file": None,
            }
        )

    return payload


def write_objects_json(
    path: str | Path,
    objects: list[SceneObject],
    tracks: list[SceneTrack] | None = None,
    ground_y: float | None = None,
    metadata: dict | None = None,
) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    track_source = list(tracks or [])
    
    # Serialize objects list directly
    object_payload = []
    for obj in objects:
        pos = [float(obj.position_world[0]), float(obj.position_world[1]), float(obj.position_world[2])]
        if ground_y is not None and np.isfinite(ground_y):
            pos[1] = float(ground_y)

        size = list(obj.size_m) if obj.size_m is not None else None

        item_payload = {
            "id": obj.object_id,
            "label": obj.label,
            "confidence": float(obj.representative_score) if obj.representative_score is not None else None,
            "bbox_2d": list(obj.representative_bbox_xyxy) if obj.representative_bbox_xyxy is not None else None,
            "position_world": pos,
            "distance_m": float(obj.distance_m),
            "observations": int(obj.observations),
            "representative_frame_index": int(obj.representative_frame_index) if obj.representative_frame_index is not None else None,
            "representative_bbox_xyxy": list(obj.representative_bbox_xyxy) if obj.representative_bbox_xyxy is not None else None,
            "representative_score": float(obj.representative_score) if obj.representative_score is not None else None,
            "sprite_file": obj.sprite_file,
            "placement_quality": obj.placement_quality,
            "source_frame": f"frame_{obj.representative_frame_index:03d}.jpg" if obj.representative_frame_index is not None else None,
            "size_m": size,
            "size": size,
        }
        if getattr(obj, "source_frames", None) is not None:
            item_payload["source_frames"] = obj.source_frames
        if getattr(obj, "merged_from", None) is not None:
            item_payload["merged_from"] = obj.merged_from
            
        object_payload.append(item_payload)

    track_payload = [
        {
            "id": int(t.track_id),
            "label": t.label,
            "average_score": _track_average_score(t.samples),
            "aggregated_bbox_xyxy": list(_track_aggregated_bbox(t.samples)) if _track_aggregated_bbox(t.samples) is not None else None,
            "samples": [
                {
                    "frame_index": int(s.frame_index),
                    "position_world": [
                        float(s.position_world[0]),
                        float(s.position_world[1]),
                        float(s.position_world[2]),
                    ],
                    "distance_m": float(s.distance_m),
                    "score": float(s.score) if s.score is not None else None,
                    "bbox_xyxy": list(s.bbox_xyxy) if s.bbox_xyxy is not None else None,
                }
                for s in t.samples
            ],
        }
        for t in track_source
    ]

    payload = {
        "objects": object_payload,
        "tracks": track_payload,
    }
    if metadata is not None:
        metadata["reason"] = metadata.get("fallback_reason") or "Converted 2D YOLO detections to estimated 3D objects"
        metadata["fallback_used"] = metadata.get("fallback_used", False)
        payload["metadata"] = metadata
        
        # Write raw_detections.json separately as requested
        if "raw_detections" in metadata:
            raw_path = Path(path).parent / "raw_detections.json"
            try:
                with open(raw_path, "w", encoding="utf-8") as rf:
                    json.dump({
                        "raw_detections": metadata["raw_detections"]
                    }, rf, indent=2)
                print(f"Wrote raw detections file: {raw_path}")
            except Exception as e:
                print(f"Error writing raw detections: {e}")
    else:
        payload["metadata"] = {
            "yolo_loaded": True,
            "frames_scanned": 0,
            "raw_detections_count": len(object_payload),
            "final_objects_count": len(object_payload),
            "fallback_used": False,
            "reason": "Converted 2D YOLO detections to estimated 3D objects",
            "rejection_reasons": {
                "low_confidence": 0,
                "unallowed_class": 0
            }
        }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def save_object_visual_assets(
    frames_bgr: list[np.ndarray],
    objects: list[SceneObject],
    out_dir: str | Path,
) -> None:
    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    for obj in objects:
        if obj.representative_frame_index is None or obj.representative_bbox_xyxy is None:
            continue
        fi = int(obj.representative_frame_index)
        if fi < 0 or fi >= len(frames_bgr):
            continue

        frame = frames_bgr[fi]
        x1, y1, x2, y2 = obj.representative_bbox_xyxy
        h, w = frame.shape[:2]
        x1 = max(0, min(w - 1, int(x1)))
        x2 = max(0, min(w - 1, int(x2)))
        y1 = max(0, min(h - 1, int(y1)))
        y2 = max(0, min(h - 1, int(y2)))
        if x2 <= x1 or y2 <= y1:
            continue

        crop = frame[y1:y2, x1:x2].copy()
        if crop.size == 0:
            continue

        rgba = _bbox_to_rgba(crop)
        name = f"obj_{obj.object_id:03d}_{obj.label.replace(' ', '_')}.png"
        out_file = out_path / name
        cv2.imwrite(str(out_file), rgba)
        obj.sprite_file = f"objects_assets/{name}"


def _bbox_width_m(obs: ObjectObservation, depth_m: float) -> float:
    x1, _, x2, _ = obs.bbox_xyxy
    px_w = max(1, x2 - x1)
    focal_px = 1200.0
    return float(px_w * depth_m / focal_px)


def _bbox_height_m(obs: ObjectObservation, depth_m: float) -> float:
    _, y1, _, y2 = obs.bbox_xyxy
    px_h = max(1, y2 - y1)
    focal_px = 1200.0
    return float(px_h * depth_m / focal_px)


def _bbox_to_rgba(crop_bgr: np.ndarray) -> np.ndarray:
    h, w = crop_bgr.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)

    rect = (1, 1, max(1, w - 2), max(1, h - 2))
    try:
        cv2.grabCut(crop_bgr, mask, rect, bgd, fgd, 2, cv2.GC_INIT_WITH_RECT)
        alpha = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    except Exception:
        alpha = np.full((h, w), 220, dtype=np.uint8)

    rgba = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha
    return rgba
