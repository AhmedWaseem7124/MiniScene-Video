from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class CameraIntrinsics:
    fx: float
    fy: float
    cx: float
    cy: float

    def matrix(self) -> np.ndarray:
        return np.array(
            [
                [self.fx, 0.0, self.cx],
                [0.0, self.fy, self.cy],
                [0.0, 0.0, 1.0],
            ],
            dtype=np.float64,
        )


def default_intrinsics(width: int, height: int, focal_scale: float = 1.2) -> CameraIntrinsics:
    fx = width * focal_scale
    fy = width * focal_scale
    cx = width / 2.0
    cy = height / 2.0
    return CameraIntrinsics(fx=fx, fy=fy, cx=cx, cy=cy)


def _to_gray(frame: np.ndarray) -> np.ndarray:
    if frame.ndim == 2:
        return frame
    return cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)


def estimate_relative_pose(
    frame_a: np.ndarray,
    frame_b: np.ndarray,
    intrinsics: CameraIntrinsics,
    max_features: int = 3000,
) -> tuple[np.ndarray, np.ndarray, int, float, float, float]:
    import time
    t0 = time.perf_counter()
    gray_a = _to_gray(frame_a)
    gray_b = _to_gray(frame_b)

    orb = cv2.ORB_create(nfeatures=max_features)
    kpa, desa = orb.detectAndCompute(gray_a, None)
    kpb, desb = orb.detectAndCompute(gray_b, None)
    det_time = time.perf_counter() - t0

    t1 = time.perf_counter()
    if desa is None or desb is None or len(kpa) < 8 or len(kpb) < 8:
        return np.eye(3), np.zeros((3, 1)), 0, det_time, time.perf_counter() - t1, 0.0

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = matcher.match(desa, desb)
    match_time = time.perf_counter() - t1

    t2 = time.perf_counter()
    if len(matches) < 8:
        return np.eye(3), np.zeros((3, 1)), 0, det_time, match_time, time.perf_counter() - t2

    matches = sorted(matches, key=lambda m: m.distance)
    pts_a = np.float32([kpa[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
    pts_b = np.float32([kpb[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)

    E, inlier_mask = cv2.findEssentialMat(
        pts_a,
        pts_b,
        intrinsics.matrix(),
        method=cv2.RANSAC,
        prob=0.999,
        threshold=1.0,
    )

    if E is None:
        return np.eye(3), np.zeros((3, 1)), 0, det_time, match_time, time.perf_counter() - t2

    _, R, t, pose_inliers = cv2.recoverPose(E, pts_a, pts_b, intrinsics.matrix())
    inlier_count = int(pose_inliers.sum()) if pose_inliers is not None else 0
    pose_est_time = time.perf_counter() - t2
    return R, t, inlier_count, det_time, match_time, pose_est_time


def accumulate_camera_poses(
    frames: list[np.ndarray],
    intrinsics: CameraIntrinsics,
    max_features: int = 3000,
) -> tuple[list[np.ndarray], float, float, float]:
    poses: list[np.ndarray] = [np.eye(4, dtype=np.float64)]
    total_det_time = 0.0
    total_match_time = 0.0
    total_pose_est_time = 0.0

    total_pairs = len(frames) - 1
    for i in range(1, len(frames)):
        print(f"Matching pair {i}/{total_pairs}")
        prev_pose = poses[-1]
        R_rel, t_rel, _, det_t, match_t, pose_t = estimate_relative_pose(
            frames[i - 1], frames[i], intrinsics, max_features=max_features
        )
        total_det_time += det_t
        total_match_time += match_t
        total_pose_est_time += pose_t

        T_rel = np.eye(4, dtype=np.float64)
        T_rel[:3, :3] = R_rel
        T_rel[:3, 3] = t_rel.flatten()

        pose = prev_pose @ T_rel
        poses.append(pose)

    return poses, total_det_time, total_match_time, total_pose_est_time
