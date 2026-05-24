from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
from tqdm import tqdm

from miniscene.config import DEFAULT_MINISCENE_CONFIG
from miniscene.cv.motion import accumulate_camera_poses, default_intrinsics
from miniscene.cv.objects import (
    align_objects_to_ground,
    detect_scene_entities_3d,
    estimate_ground_plane,
    refine_objects_with_point_cloud,
    refine_object_placements,
    write_objects_json,
)
from miniscene.depth.estimator import DepthEstimator
from miniscene.io.video import estimate_auto_frame_step, iterate_frames, read_video_meta
from miniscene.recon.reconstruct import (
    build_point_cloud,
    save_depth_previews,
    write_open3d_mesh,
    write_ply,
    write_trajectory_json,
)
from miniscene.viz.interactive import write_interactive_html
from miniscene.viz.immersive import write_immersive_scene_html


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MiniScene AI pipeline")
    parser.add_argument(
        "--mode",
        choices=["minimal", "ultra_fast", "fast", "quality"],
        default="minimal",
        help="Processing mode (minimal, ultra_fast, fast, quality)",
    )
    parser.add_argument("--video", required=True, help="Input video path")
    parser.add_argument("--out-dir", default="outputs", help="Output directory")
    parser.add_argument(
        "--frame-step",
        type=int,
        default=0,
        help="Optional override for frame skip (0 means automatic motion-based skip)",
    )
    parser.add_argument(
        "--depth-mode",
        choices=["auto", "model", "midas", "heuristic"],
        default="auto",
        help="Depth estimation mode",
    )
    parser.add_argument("--sample-step", type=int, default=6, help="Point cloud pixel sampling stride")
    parser.add_argument("--max-frames", type=int, default=120, help="Limit number of processed frames")
    parser.add_argument(
        "--open3d-mesh",
        action="store_true",
        help="Generate Open3D point cloud + mesh outputs",
    )
    parser.add_argument(
        "--immersive-viewer",
        action="store_true",
        help="Generate first-person immersive scene viewer HTML",
    )
    parser.add_argument(
        "--extract-objects",
        action="store_true",
        help="Detect and place scene objects in 3D using depth + camera poses",
    )
    parser.add_argument(
        "--object-score-threshold",
        type=float,
        default=-1.0,
        help="Optional override for detection confidence base (-1 means profile default adaptive base)",
    )
    parser.add_argument(
        "--object-max-per-frame",
        type=int,
        default=6,
        help="Max detections per sampled frame",
    )
    parser.add_argument(
        "--object-labels",
        default="",
        help="Comma-separated object labels to keep (empty means keep all detectable labels)",
    )
    parser.add_argument(
        "--object-min-track-samples",
        type=int,
        default=0,
        help="Optional override for minimum samples per dynamic track (0 means profile default)",
    )
    parser.add_argument(
        "--object-min-observations",
        type=int,
        default=2,
        help="Minimum observations per static object",
    )
    parser.add_argument(
        "--object-max-person-instances",
        type=int,
        default=0,
        help="Maximum number of distinct person entities to keep (0 means no cap)",
    )
    parser.add_argument(
        "--object-max-bench-instances",
        type=int,
        default=0,
        help="Maximum number of distinct bench entities to keep (0 means no cap)",
    )
    parser.add_argument(
        "--object-label-max",
        default="",
        help="Comma-separated per-label caps, e.g. 'couch:4,dining table:1,person:2'",
    )
    parser.add_argument(
        "--object-dedup-merge-radius",
        type=float,
        default=1.2,
        help="3D merge radius in meters for cross-frame object deduplication",
    )
    parser.add_argument(
        "--object-dedup-feature-similarity",
        type=float,
        default=0.72,
        help="Cosine similarity threshold for feature-based track deduplication (0..1)",
    )
    parser.add_argument(
        "--disable-object-feature-dedup",
        action="store_true",
        help="Disable cross-frame feature-based object deduplication",
    )
    parser.add_argument(
        "--fast-interior-mode",
        action="store_true",
        help="Speed-first reconstruction for architecture/interior draft output",
    )
    parser.add_argument(
        "--fast-target-seconds",
        type=int,
        default=15,
        help="Target budget for fast mode (used to choose lightweight defaults)",
    )
    parser.add_argument(
        "--fast-keyframes",
        type=int,
        default=16,
        help="Approximate number of keyframes to process in fast mode",
    )
    parser.add_argument(
        "--fast-max-side",
        type=int,
        default=640,
        help="Maximum image side length used in fast mode",
    )
    parser.add_argument(
        "--max-width",
        type=int,
        default=720,
        help="Maximum image side length to resize frames to immediately during extraction",
    )
    parser.add_argument(
        "--max-points",
        type=int,
        default=0,
        help="Maximum number of points in point cloud (0 means no limit)",
    )
    parser.add_argument(
        "--orb-max-features",
        type=int,
        default=1000,
        help="Maximum ORB features to detect per frame",
    )
    parser.add_argument(
        "--max-detect-keyframes",
        type=int,
        default=0,
        help="Maximum keyframes to run object detection on",
    )
    parser.add_argument(
        "--disable-tracking",
        action="store_true",
        help="Disable YOLO tracking, run predict instead",
    )
    return parser.parse_args()


def _resize_frame_max_side(frame: np.ndarray, max_side: int) -> np.ndarray:
    h, w = frame.shape[:2]
    longest = max(h, w)
    if longest <= max_side:
        return frame

    scale = float(max_side) / float(longest)
    nw = max(2, int(round(w * scale)))
    nh = max(2, int(round(h * scale)))
    return cv2.resize(frame, (nw, nh), interpolation=cv2.INTER_AREA)


def _parse_label_max(raw: str) -> dict[str, int]:
    out: dict[str, int] = {}
    if not raw:
        return out

    for part in str(raw).split(","):
        part = part.strip()
        if not part or ":" not in part:
            continue
        label, value = part.split(":", 1)
        label = label.strip()
        value = value.strip()
        if not label:
            continue
        try:
            n = int(value)
        except ValueError:
            continue
        out[label] = max(0, n)
    return out


def _validate_track_consistency(tracks) -> list[str]:
    errors: list[str] = []
    ids = [int(t.track_id) for t in tracks]

    if any(tid <= 0 for tid in ids):
        bad = [tid for tid in ids if tid <= 0]
        errors.append(f"Invalid non-positive track IDs found: {bad}")

    if len(set(ids)) != len(ids):
        errors.append("Duplicate track IDs detected")

    if ids:
        expected = set(range(1, len(ids) + 1))
        actual = set(ids)
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        if missing:
            errors.append(f"Missing track IDs in sequence 1..N: {missing}")
        if extra:
            errors.append(f"Unexpected track IDs outside sequence 1..N: {extra}")

    return errors


def _validate_point_cloud(points_world: np.ndarray) -> tuple[bool, str]:
    pts = np.asarray(points_world)
    if pts.ndim != 2 or pts.shape[1] != 3:
        return False, f"Point cloud shape invalid: got {pts.shape}, expected (N, 3)"
    if pts.shape[0] == 0:
        return False, "Point cloud has zero points"

    finite_mask = np.all(np.isfinite(pts), axis=1)
    valid_count = int(np.count_nonzero(finite_mask))
    if valid_count <= 0:
        return False, "Point cloud has no finite valid points"

    return True, f"Point cloud valid points: {valid_count}/{int(pts.shape[0])}"


def run_pipeline(args: argparse.Namespace) -> None:
    import time
    t_start_pipeline = time.perf_counter()

    elapsed_video_load = 0.0
    elapsed_frame_extraction = 0.0
    elapsed_frame_resizing = 0.0
    elapsed_feature_detection = 0.0
    elapsed_feature_matching = 0.0
    elapsed_camera_pose_estimation = 0.0
    elapsed_depth_estimation = 0.0
    elapsed_point_cloud_generation = 0.0
    elapsed_object_detection = 0.0
    elapsed_object_tracking = 0.0
    elapsed_file_writing = 0.0

    t_start_load = time.perf_counter()
    cfg = DEFAULT_MINISCENE_CONFIG
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    meta = read_video_meta(args.video)
    elapsed_video_load = time.perf_counter() - t_start_load

    # Default values from args
    effective_depth_mode = args.depth_mode
    effective_max_frames = max(2, args.max_frames)
    effective_sample_step = max(1, args.sample_step)
    resize_side = args.max_width
    orb_max_features = args.orb_max_features
    extract_objects = args.extract_objects
    max_detect_keyframes = args.max_detect_keyframes
    disable_tracking = args.disable_tracking
    disable_object_feature_dedup = args.disable_object_feature_dedup

    # Mode-based overrides
    if args.mode == "minimal":
        effective_max_frames = 5
        resize_side = 320
        effective_depth_mode = "heuristic"
        extract_objects = True
        effective_sample_step = 16
        orb_max_features = 0
        max_detect_keyframes = 1
        disable_tracking = True
        disable_object_feature_dedup = True
    elif args.mode == "ultra_fast":
        effective_max_frames = 8
        resize_side = 320
        effective_depth_mode = "heuristic"
        extract_objects = False
        effective_sample_step = 12
        orb_max_features = 500
        max_detect_keyframes = 0
        disable_tracking = True
        disable_object_feature_dedup = True
    elif args.mode == "fast":
        effective_max_frames = 8
        resize_side = 480
        effective_depth_mode = "heuristic"
        extract_objects = True
        effective_sample_step = 12
        orb_max_features = 500
        max_detect_keyframes = 5
        disable_tracking = True
        disable_object_feature_dedup = True
    elif args.mode == "quality":
        effective_max_frames = 30
        resize_side = 720
        effective_depth_mode = "auto"
        extract_objects = True
        effective_sample_step = 6
        orb_max_features = 1000
        max_detect_keyframes = 8
        disable_tracking = False
        disable_object_feature_dedup = False

    if int(args.frame_step) > 0:
        effective_frame_step = max(1, int(args.frame_step))
    else:
        effective_frame_step = estimate_auto_frame_step(args.video)

    if float(args.object_score_threshold) >= 0.0:
        object_score_threshold = float(args.object_score_threshold)
    else:
        object_score_threshold = float(cfg.confidence_base)

    if int(args.object_min_track_samples) > 0:
        min_track_samples = max(1, int(args.object_min_track_samples))
    else:
        min_track_samples = int(cfg.min_track_length)

    print(
        f"MiniScene mode: {args.mode} | "
        f"confidence={cfg.confidence_threshold}, "
        f"iou={cfg.iou_threshold:.2f}, "
        f"frame_skip={'auto' if int(args.frame_step) <= 0 else 'manual'}, "
        f"min_track_length={min_track_samples}"
    )

    if args.fast_interior_mode:
        effective_depth_mode = "heuristic"
        effective_max_frames = max(8, int(args.fast_keyframes))
        target_frame_count = max(8, int(args.fast_keyframes))
        if meta.frame_count > 0:
            effective_frame_step = max(1, int(round(meta.frame_count / float(target_frame_count))))
        effective_sample_step = max(effective_sample_step, 12)
        print(
            "Fast interior mode enabled: "
            f"target={int(args.fast_target_seconds)}s, "
            f"frames<= {effective_max_frames}, "
            f"frame_step={effective_frame_step}, "
            f"max_side={int(args.fast_max_side)}, "
            f"depth={effective_depth_mode}"
        )

    frames: list[np.ndarray] = []
    cap = cv2.VideoCapture(str(args.video))
    if not cap.isOpened():
        raise FileNotFoundError(f"Unable to open video: {args.video}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    if total_frames > 2:
        target_count = effective_max_frames
        if total_frames <= target_count:
            indices = list(range(total_frames))
        else:
            indices = [int(round(i * (total_frames - 1) / (target_count - 1))) for i in range(target_count)]
        
        indices_set = set(indices)
        max_idx = max(indices_set)
        
        total_target_frames = len(indices)
        for idx in range(max_idx + 1):
            if idx in indices_set:
                print(f"Processing frame {len(frames) + 1}/{total_target_frames}")
                t_read0 = time.perf_counter()
                ok, frame = cap.read()
                elapsed_frame_extraction += time.perf_counter() - t_read0
                if not ok:
                    break
                if resize_side > 0:
                    t_resize0 = time.perf_counter()
                    frame = _resize_frame_max_side(frame, resize_side)
                    elapsed_frame_resizing += time.perf_counter() - t_resize0
                frames.append(frame)
            else:
                t_grab0 = time.perf_counter()
                ok = cap.grab()
                elapsed_frame_extraction += time.perf_counter() - t_grab0
                if not ok:
                    break
    else:
        idx = 0
        while True:
            t_read0 = time.perf_counter()
            ok, frame = cap.read()
            elapsed_frame_extraction += time.perf_counter() - t_read0
            if not ok:
                break
            if idx % effective_frame_step == 0:
                print(f"Processing frame {len(frames) + 1}/{effective_max_frames}")
                if resize_side > 0:
                    t_resize0 = time.perf_counter()
                    frame = _resize_frame_max_side(frame, resize_side)
                    elapsed_frame_resizing += time.perf_counter() - t_resize0
                frames.append(frame)
                if len(frames) >= effective_max_frames:
                    break
            idx += 1

    cap.release()

    if len(frames) < 2:
        raise RuntimeError("Need at least 2 sampled frames for reconstruction")

    proc_h, proc_w = frames[0].shape[:2]
    intrinsics = default_intrinsics(proc_w, proc_h)
    print(f"Loaded {len(frames)} frames (source {meta.width}x{meta.height}, processed {proc_w}x{proc_h})")

    t_start_traj = time.perf_counter()
    if args.mode == "minimal":
        poses = [np.eye(4, dtype=np.float64) for _ in range(len(frames))]
        det_time = 0.0
        match_time = 0.0
        pose_estimation_time = 0.0
        print("Minimal mode: Skipped camera trajectory estimation (using identity poses)")
    else:
        poses, det_time, match_time, pose_estimation_time = accumulate_camera_poses(
            frames, intrinsics, max_features=orb_max_features
        )
    elapsed_camera_trajectory = time.perf_counter() - t_start_traj
    elapsed_feature_detection = det_time
    elapsed_feature_matching = match_time
    elapsed_camera_pose_estimation = pose_estimation_time
    print("Estimated camera trajectory")

    t_start_depth = time.perf_counter()
    estimator = DepthEstimator(mode=effective_depth_mode)
    depth_maps = []
    for i, frame in enumerate(frames):
        print(f"Estimating depth {i + 1}/{len(frames)}")
        depth_maps.append(estimator.estimate(frame))
    elapsed_depth_estimation = time.perf_counter() - t_start_depth

    t_start_pcd = time.perf_counter()
    recon = build_point_cloud(
        frames_bgr=frames,
        depth_maps=depth_maps,
        poses_world_from_cam=poses,
        intrinsics=intrinsics,
        sample_step=effective_sample_step,
    )

    if args.max_points > 0 and len(recon.points_world) > args.max_points:
        rng = np.random.default_rng(42)
        downsample_indices = rng.choice(len(recon.points_world), size=args.max_points, replace=False)
        recon.points_world = recon.points_world[downsample_indices]
        recon.colors_rgb = recon.colors_rgb[downsample_indices]
    elapsed_point_cloud_generation = time.perf_counter() - t_start_pcd

    ply_path = out_dir / "point_cloud.ply"
    traj_path = out_dir / "trajectory.json"
    html_path = out_dir / "scene_preview.html"
    objects_path = out_dir / "objects_3d.json"

    mesh_o3d_path: Path | None = None
    pcd_o3d_path: Path | None = None

    objects_file_name = None
    tracks = []
    objects = []
    metadata = {}
    ground_y = 0.0

    if extract_objects:
        import json as _json
        t_start_obj = time.perf_counter()
        allowlist = {s.strip() for s in str(args.object_labels).split(",") if s.strip()}
        max_instances_by_label = {
            "person": max(0, int(args.object_max_person_instances)),
            "bench": max(0, int(args.object_max_bench_instances)),
        }
        max_instances_by_label.update(_parse_label_max(str(args.object_label_max)))

        # In fast/quality modes, single-frame detections count as objects.
        # Only quality mode benefits from requiring multi-frame confirmation.
        effective_min_observations = 1 if args.mode in ("fast", "ultra_fast", "minimal") else max(1, int(args.object_min_observations))

        objects, tracks, metadata = detect_scene_entities_3d(
            frames_bgr=frames,
            depth_maps=depth_maps,
            poses_world_from_cam=poses,
            intrinsics=intrinsics,
            score_threshold=object_score_threshold,
            iou_threshold=float(cfg.iou_threshold),
            max_per_frame=max(1, int(args.object_max_per_frame)),
            label_allowlist=allowlist if allowlist else None,
            min_track_samples=min_track_samples,
            min_object_observations=effective_min_observations,
            max_instances_by_label=max_instances_by_label,
            dedup_enable=not bool(disable_object_feature_dedup),
            dedup_merge_radius_m=max(0.1, float(args.object_dedup_merge_radius)),
            dedup_feature_similarity=min(1.0, max(0.0, float(args.object_dedup_feature_similarity))),
            max_detect_keyframes=max_detect_keyframes,
            disable_tracking=disable_tracking,
            out_dir=out_dir,
        )


        if len(objects) > 0:
            ground_y = estimate_ground_plane(recon.points_world)
            objects = refine_objects_with_point_cloud(objects, recon.points_world)
            objects = align_objects_to_ground(objects, ground_y)
            objects = refine_object_placements(
                objects,
                ground_y,
                recon.points_world,
                poses_world_from_cam=poses,
                depth_maps=depth_maps,
                intrinsics=intrinsics
            )
        elapsed_object_detection = metadata.get("object_detection_time", 0.0)
        elapsed_object_tracking = metadata.get("object_tracking_time", 0.0)

    # Validation gate before final output writes.
    validation_errors: list[str] = []
    pc_ok, pc_msg = _validate_point_cloud(recon.points_world)
    if not pc_ok:
        validation_errors.append(pc_msg)
    else:
        print(f"Validation: {pc_msg}")

    if extract_objects:
        if len(objects) <= 0:
            print("WARNING: No objects detected (including fallback). Continuing with empty objects_3d.json.")
        # Only validate track consistency when we have actual tracks; skip for fallback estimated objects.
        if tracks:
            validation_errors.extend(_validate_track_consistency(tracks))

    if validation_errors:
        print("Validation gate failed. Final outputs were not written.")
        for msg in validation_errors:
            print(f" - {msg}")
        return

    t_start_file_writing = time.perf_counter()
    # Final outputs are written only after validation passes.
    
    # 1. Write core assets first (allows early response to server)
    write_ply(ply_path, recon.points_world, recon.colors_rgb)
    
    if extract_objects:
        write_objects_json(objects_path, objects, tracks=tracks, ground_y=ground_y, metadata=metadata)
        objects_file_name = objects_path.name
        print(f"Detected 3D objects: {len(objects)}")
        print(f"Detected motion tracks: {len(tracks)}")
        print(f"Ground plane Y: {ground_y:.3f}")
        print(f"Fallback used: {metadata.get('fallback_used', False)}")
        print(f"Wrote: {objects_path}")
    else:
        # Write an empty objects json file if objects extraction is skipped,
        # to ensure frontend/caching works without errors.
        import json
        with open(objects_path, "w", encoding="utf-8") as f:
            json.dump({
                "objects": [],
                "tracks": [],
                "metadata": {
                    "yolo_loaded": False,
                    "frames_scanned": 0,
                    "raw_detections_count": 0,
                    "final_objects_count": 0,
                    "rejection_reasons": {
                        "low_confidence": 0,
                        "unallowed_class": 0
                    }
                },
                "message": "Object detection skipped in this mode"
            }, f, indent=2)
        print(f"Wrote empty objects file: {objects_path}")

    # 2. Write auxiliary files afterwards
    write_trajectory_json(traj_path, poses, intrinsics)
    write_interactive_html(html_path, recon.points_world, recon.colors_rgb)
    save_depth_previews(depth_maps, out_dir / "depth_preview")

    if args.open3d_mesh:
        try:
            pcd_o3d_path, mesh_o3d_path = write_open3d_mesh(out_dir, recon.points_world, recon.colors_rgb)
            print(f"Wrote: {pcd_o3d_path}")
            print(f"Wrote: {mesh_o3d_path}")
        except Exception as ex:
            print(f"Open3D mesh export skipped: {ex}")

    if args.immersive_viewer:
        immersive_path = out_dir / "scene_immersive.html"
        mesh_name = mesh_o3d_path.name if mesh_o3d_path is not None else "mesh_open3d.ply"
        pcd_name = pcd_o3d_path.name if pcd_o3d_path is not None else "point_cloud_open3d.ply"
        write_immersive_scene_html(
            immersive_path,
            mesh_file=mesh_name,
            point_cloud_file=pcd_name,
            objects_file=objects_file_name,
        )
        print(f"Wrote: {immersive_path}")

    print(f"Point cloud points: {len(recon.points_world)}")
    print(f"Wrote: {ply_path}")
    print(f"Wrote: {traj_path}")
    print(f"Wrote: {html_path}")

    elapsed_file_writing = time.perf_counter() - t_start_file_writing

    print(f"[TIMER] video_load: {elapsed_video_load:.1f}s")
    print(f"[TIMER] frame_extraction: {elapsed_frame_extraction:.1f}s")
    print(f"[TIMER] frame_resizing: {elapsed_frame_resizing:.1f}s")
    print(f"[TIMER] feature_detection: {elapsed_feature_detection:.1f}s")
    print(f"[TIMER] feature_matching: {elapsed_feature_matching:.1f}s")
    print(f"[TIMER] camera_pose_estimation: {elapsed_camera_pose_estimation:.1f}s")
    print(f"[TIMER] depth_estimation: {elapsed_depth_estimation:.1f}s")
    print(f"[TIMER] point_cloud_generation: {elapsed_point_cloud_generation:.1f}s")
    print(f"[TIMER] object_detection: {elapsed_object_detection:.1f}s")
    print(f"[TIMER] object_tracking: {elapsed_object_tracking:.1f}s")
    print(f"[TIMER] file_writing: {elapsed_file_writing:.1f}s")

    # Output timing profiles in JSON format for the backend to parse
    import json
    profile_data = {
        "frame_extraction": elapsed_frame_extraction,
        "camera_trajectory": elapsed_camera_trajectory,
        "feature_detection": elapsed_feature_detection,
        "feature_matching": elapsed_feature_matching,
        "depth_estimation": elapsed_depth_estimation,
        "point_cloud_generation": elapsed_point_cloud_generation,
        "object_detection": elapsed_object_detection,
        "video_load": elapsed_video_load,
        "frame_resizing": elapsed_frame_resizing,
        "camera_pose_estimation": elapsed_camera_pose_estimation,
        "object_tracking": elapsed_object_tracking,
        "file_writing": elapsed_file_writing,
    }
    print("TIMING_PROFILE:" + json.dumps(profile_data))


def main() -> None:
    args = parse_args()
    run_pipeline(args)


if __name__ == "__main__":
    main()
