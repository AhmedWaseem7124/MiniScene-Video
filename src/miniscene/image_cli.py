from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np

from miniscene.cv.motion import default_intrinsics
from miniscene.depth.estimator import DepthEstimator
from miniscene.recon.reconstruct import (
    build_point_cloud,
    build_surface_mesh_from_depth,
    write_mesh_obj,
    write_open3d_mesh,
    write_ply,
)
from miniscene.recon.trellis2 import try_reconstruct_image_with_trellis2
from miniscene.viz.interactive import write_interactive_html, write_interactive_mesh_html


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MiniScene single-image 3D reconstruction")
    parser.add_argument("--image", required=True, help="Input image path")
    parser.add_argument("--out-dir", default="outputs_image", help="Output directory")
    parser.add_argument(
        "--reconstruction-backend",
        choices=["auto", "trellis2", "depth"],
        default="auto",
        help="Preferred backend for image reconstruction. auto tries Trellis 2 first and falls back to the existing depth pipeline.",
    )
    parser.add_argument(
        "--trellis-model",
        default="microsoft/TRELLIS-image-large",
        help="Trellis model name or local path when using the trellis2 backend.",
    )
    parser.add_argument(
        "--depth-mode",
        choices=["auto", "model", "midas", "heuristic"],
        default="midas",
        help="Depth estimation mode",
    )
    parser.add_argument("--sample-step", type=int, default=4, help="Point cloud pixel sampling stride")
    parser.add_argument("--open3d-mesh", action="store_true", help="Generate Open3D mesh outputs")
    parser.add_argument("--mesh-step", type=int, default=2, help="Depth mesh sampling stride")
    parser.add_argument(
        "--mesh-depth-delta",
        type=float,
        default=0.5,
        help="Reject mesh triangles with depth discontinuity above this threshold",
    )
    return parser.parse_args()


def run_pipeline(args: argparse.Namespace) -> None:
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    frame = cv2.imread(args.image)
    if frame is None:
        raise RuntimeError(f"Unable to read image: {args.image}")

    height, width = frame.shape[:2]
    intrinsics = default_intrinsics(width, height)

    if args.reconstruction_backend in {"auto", "trellis2"}:
        trellis_ok = try_reconstruct_image_with_trellis2(
            image_path=args.image,
            out_dir=out_dir,
            model_name=args.trellis_model,
        )
        if trellis_ok:
            print(f"Trellis 2 reconstruction succeeded: {out_dir / 'trellis.glb'}")
            print(f"Wrote: {out_dir / 'trellis_gaussian.ply'}")
            print(f"Wrote: {out_dir / 'trellis_preview.html'}")
            return

        print("Trellis 2 was unavailable or failed; falling back to the existing depth-based image pipeline.")

    if args.reconstruction_backend == "trellis2":
        print("Trellis 2 requested explicitly, but it is not available on this machine; using the fallback pipeline.")

    try:
        estimator = DepthEstimator(mode=args.depth_mode)
    except RuntimeError as ex:
        if args.depth_mode in {"auto", "model", "midas"}:
            print(f"Depth model unavailable ({ex}); falling back to heuristic depth.")
            estimator = DepthEstimator(mode="heuristic")
        else:
            raise

    depth = estimator.estimate(frame)

    norm = (depth - depth.min()) / (depth.max() - depth.min() + 1e-6)
    depth_gray = (norm * 255).astype(np.uint8)
    depth_heatmap = cv2.applyColorMap(depth_gray, cv2.COLORMAP_INFERNO)

    np.save(out_dir / "depth.npy", depth)
    cv2.imwrite(str(out_dir / "depth_gray.png"), depth_gray)
    cv2.imwrite(str(out_dir / "depth_heatmap.png"), depth_heatmap)

    pose = np.eye(4, dtype=np.float64)
    recon = build_point_cloud(
        frames_bgr=[frame],
        depth_maps=[depth],
        poses_world_from_cam=[pose],
        intrinsics=intrinsics,
        sample_step=max(1, args.sample_step),
    )

    ply_path = out_dir / "point_cloud.ply"
    html_path = out_dir / "scene_preview.html"
    mesh_obj_path = out_dir / "mesh.obj"
    mesh_html_path = out_dir / "mesh_preview.html"

    write_ply(ply_path, recon.points_world, recon.colors_rgb)
    write_interactive_html(html_path, recon.points_world, recon.colors_rgb)

    mesh = build_surface_mesh_from_depth(
        frame_bgr=frame,
        depth_map=depth,
        intrinsics=intrinsics,
        sample_step=max(1, args.mesh_step),
        max_triangle_depth_delta=max(0.0, args.mesh_depth_delta),
    )
    write_mesh_obj(mesh_obj_path, mesh.vertices, mesh.triangles, mesh.colors_rgb)
    write_interactive_mesh_html(mesh_html_path, mesh.vertices, mesh.triangles)

    print(f"Image loaded: {width}x{height}")
    print(f"Point cloud points: {len(recon.points_world)}")
    print(f"Wrote: {ply_path}")
    print(f"Wrote: {html_path}")
    print(f"Wrote: {mesh_obj_path}")
    print(f"Wrote: {mesh_html_path}")
    print(f"Mesh vertices: {len(mesh.vertices)}")
    print(f"Mesh triangles: {len(mesh.triangles)}")
    print(f"Wrote: {out_dir / 'depth_gray.png'}")
    print(f"Wrote: {out_dir / 'depth_heatmap.png'}")
    print(f"Wrote: {out_dir / 'depth.npy'}")

    if args.open3d_mesh:
        try:
            pcd_o3d_path, mesh_o3d_path = write_open3d_mesh(out_dir, recon.points_world, recon.colors_rgb)
            print(f"Wrote: {pcd_o3d_path}")
            print(f"Wrote: {mesh_o3d_path}")
        except Exception as ex:
            print(f"Open3D mesh export skipped: {ex}")


def main() -> None:
    args = parse_args()
    run_pipeline(args)


if __name__ == "__main__":
    main()
