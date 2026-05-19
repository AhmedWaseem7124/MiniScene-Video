from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from miniscene.cv.motion import CameraIntrinsics


@dataclass
class ReconstructionResult:
    points_world: np.ndarray
    colors_rgb: np.ndarray


@dataclass
class MeshResult:
    vertices: np.ndarray
    triangles: np.ndarray
    colors_rgb: np.ndarray


def pixel_to_camera_point(u: int, v: int, depth: float, intrinsics: CameraIntrinsics) -> np.ndarray:
    x = (u - intrinsics.cx) * depth / intrinsics.fx
    y = (v - intrinsics.cy) * depth / intrinsics.fy
    z = depth
    return np.array([x, y, z], dtype=np.float32)


def camera_to_world(point_cam: np.ndarray, pose_world_from_cam: np.ndarray) -> np.ndarray:
    p_h = np.array([point_cam[0], point_cam[1], point_cam[2], 1.0], dtype=np.float64)
    p_w = pose_world_from_cam @ p_h
    return p_w[:3].astype(np.float32)


def build_point_cloud(
    frames_bgr: list[np.ndarray],
    depth_maps: list[np.ndarray],
    poses_world_from_cam: list[np.ndarray],
    intrinsics: CameraIntrinsics,
    sample_step: int = 6,
    max_depth: float = 8.0,
) -> ReconstructionResult:
    points: list[np.ndarray] = []
    colors: list[np.ndarray] = []

    for frame, depth, pose in zip(frames_bgr, depth_maps, poses_world_from_cam):
        h, w = depth.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        for v in range(0, h, sample_step):
            for u in range(0, w, sample_step):
                d = float(depth[v, u])
                if d <= 0.0 or d > max_depth:
                    continue
                p_cam = pixel_to_camera_point(u, v, d, intrinsics)
                p_world = camera_to_world(p_cam, pose)
                points.append(p_world)
                colors.append(rgb[v, u] / 255.0)

    if not points:
        return ReconstructionResult(
            points_world=np.empty((0, 3), dtype=np.float32),
            colors_rgb=np.empty((0, 3), dtype=np.float32),
        )

    return ReconstructionResult(
        points_world=np.vstack(points).astype(np.float32),
        colors_rgb=np.vstack(colors).astype(np.float32),
    )


def write_ply(path: str | Path, points: np.ndarray, colors: np.ndarray) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    if points.shape[0] != colors.shape[0]:
        raise ValueError("points and colors must have same length")

    rgb = np.clip(colors * 255.0, 0, 255).astype(np.uint8)

    header = "\n".join(
        [
            "ply",
            "format ascii 1.0",
            f"element vertex {len(points)}",
            "property float x",
            "property float y",
            "property float z",
            "property uchar red",
            "property uchar green",
            "property uchar blue",
            "end_header",
        ]
    )

    with path.open("w", encoding="utf-8") as f:
        f.write(header + "\n")
        for p, c in zip(points, rgb):
            f.write(f"{p[0]} {p[1]} {p[2]} {int(c[0])} {int(c[1])} {int(c[2])}\n")


def write_open3d_mesh(
    out_dir: str | Path,
    points: np.ndarray,
    colors: np.ndarray,
    voxel_size: float = 0.03,
    poisson_depth: int = 8,
) -> tuple[Path, Path]:
    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    try:
        import open3d as o3d
    except Exception as ex:
        raise RuntimeError("Open3D is required for mesh export. Install open3d.") from ex

    if len(points) == 0:
        raise RuntimeError("Cannot build mesh from empty point cloud")

    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(points.astype(np.float64))
    pcd.colors = o3d.utility.Vector3dVector(np.clip(colors, 0.0, 1.0).astype(np.float64))

    if voxel_size > 0:
        pcd = pcd.voxel_down_sample(voxel_size=voxel_size)

    if len(pcd.points) < 100:
        raise RuntimeError("Too few points after downsampling to build a stable mesh")

    pcd.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=voxel_size * 4, max_nn=30))

    mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(pcd, depth=poisson_depth)

    densities_np = np.asarray(densities)
    keep = densities_np > np.quantile(densities_np, 0.04)
    mesh = mesh.select_by_index(np.where(keep)[0])
    mesh.remove_degenerate_triangles()
    mesh.remove_duplicated_triangles()
    mesh.remove_duplicated_vertices()
    mesh.remove_non_manifold_edges()
    mesh.compute_vertex_normals()

    pcd_path = out_path / "point_cloud_open3d.ply"
    mesh_path = out_path / "mesh_open3d.ply"

    o3d.io.write_point_cloud(str(pcd_path), pcd)
    o3d.io.write_triangle_mesh(str(mesh_path), mesh)
    return pcd_path, mesh_path


def read_open3d_mesh_arrays(mesh_path: str | Path) -> tuple[np.ndarray, np.ndarray]:
    try:
        import open3d as o3d
    except Exception as ex:
        raise RuntimeError("Open3D is required to read mesh data.") from ex

    mesh = o3d.io.read_triangle_mesh(str(mesh_path))
    if mesh.is_empty():
        return np.empty((0, 3), dtype=np.float32), np.empty((0, 3), dtype=np.int32)

    vertices = np.asarray(mesh.vertices, dtype=np.float32)
    triangles = np.asarray(mesh.triangles, dtype=np.int32)
    return vertices, triangles


def build_surface_mesh_from_depth(
    frame_bgr: np.ndarray,
    depth_map: np.ndarray,
    intrinsics: CameraIntrinsics,
    sample_step: int = 2,
    max_depth: float = 8.0,
    max_triangle_depth_delta: float = 0.5,
) -> MeshResult:
    h, w = depth_map.shape[:2]
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    grid_h = (h + sample_step - 1) // sample_step
    grid_w = (w + sample_step - 1) // sample_step
    idx_grid = -np.ones((grid_h, grid_w), dtype=np.int32)
    depth_grid = np.zeros((grid_h, grid_w), dtype=np.float32)

    vertices: list[np.ndarray] = []
    colors: list[np.ndarray] = []

    for gv, v in enumerate(range(0, h, sample_step)):
        for gu, u in enumerate(range(0, w, sample_step)):
            d = float(depth_map[v, u])
            if d <= 0.0 or d > max_depth:
                continue

            p = pixel_to_camera_point(u, v, d, intrinsics)
            idx_grid[gv, gu] = len(vertices)
            depth_grid[gv, gu] = d
            vertices.append(p)
            colors.append(rgb[v, u] / 255.0)

    if not vertices:
        return MeshResult(
            vertices=np.empty((0, 3), dtype=np.float32),
            triangles=np.empty((0, 3), dtype=np.int32),
            colors_rgb=np.empty((0, 3), dtype=np.float32),
        )

    triangles: list[tuple[int, int, int]] = []

    for gv in range(grid_h - 1):
        for gu in range(grid_w - 1):
            i00 = idx_grid[gv, gu]
            i10 = idx_grid[gv, gu + 1]
            i01 = idx_grid[gv + 1, gu]
            i11 = idx_grid[gv + 1, gu + 1]

            d00 = depth_grid[gv, gu]
            d10 = depth_grid[gv, gu + 1]
            d01 = depth_grid[gv + 1, gu]
            d11 = depth_grid[gv + 1, gu + 1]

            if i00 >= 0 and i10 >= 0 and i11 >= 0:
                if max(abs(d00 - d10), abs(d10 - d11), abs(d11 - d00)) <= max_triangle_depth_delta:
                    triangles.append((int(i00), int(i10), int(i11)))

            if i00 >= 0 and i11 >= 0 and i01 >= 0:
                if max(abs(d00 - d11), abs(d11 - d01), abs(d01 - d00)) <= max_triangle_depth_delta:
                    triangles.append((int(i00), int(i11), int(i01)))

    return MeshResult(
        vertices=np.asarray(vertices, dtype=np.float32),
        triangles=np.asarray(triangles, dtype=np.int32) if triangles else np.empty((0, 3), dtype=np.int32),
        colors_rgb=np.asarray(colors, dtype=np.float32),
    )


def write_mesh_obj(path: str | Path, vertices: np.ndarray, triangles: np.ndarray, colors: np.ndarray | None = None) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as f:
        f.write("# MiniScene mesh\n")
        if colors is not None and len(colors) == len(vertices):
            colors = np.clip(colors, 0.0, 1.0)
            for v, c in zip(vertices, colors):
                f.write(f"v {v[0]} {v[1]} {v[2]} {c[0]} {c[1]} {c[2]}\n")
        else:
            for v in vertices:
                f.write(f"v {v[0]} {v[1]} {v[2]}\n")

        for tri in triangles:
            a, b, c = int(tri[0]) + 1, int(tri[1]) + 1, int(tri[2]) + 1
            f.write(f"f {a} {b} {c}\n")


def write_trajectory_json(
    path: str | Path,
    poses_world_from_cam: list[np.ndarray],
    intrinsics: CameraIntrinsics,
) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "intrinsics": {
            "fx": intrinsics.fx,
            "fy": intrinsics.fy,
            "cx": intrinsics.cx,
            "cy": intrinsics.cy,
        },
        "poses_world_from_cam": [pose.tolist() for pose in poses_world_from_cam],
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def save_depth_previews(depth_maps: list[np.ndarray], out_dir: str | Path, max_previews: int = 10) -> None:
    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    for i, depth in enumerate(depth_maps[:max_previews]):
        norm = (depth - depth.min()) / (depth.max() - depth.min() + 1e-6)
        img = (norm * 255).astype(np.uint8)
        cv2.imwrite(str(out_path / f"depth_{i:04d}.png"), img)


def estimate_distance_between_pixels(
    depth_map: np.ndarray,
    pose_world_from_cam: np.ndarray,
    intrinsics: CameraIntrinsics,
    px_a: tuple[int, int],
    px_b: tuple[int, int],
) -> float:
    ua, va = px_a
    ub, vb = px_b

    da = float(depth_map[va, ua])
    db = float(depth_map[vb, ub])

    pa_cam = pixel_to_camera_point(ua, va, da, intrinsics)
    pb_cam = pixel_to_camera_point(ub, vb, db, intrinsics)

    pa_w = camera_to_world(pa_cam, pose_world_from_cam)
    pb_w = camera_to_world(pb_cam, pose_world_from_cam)

    return float(np.linalg.norm(pa_w - pb_w))
