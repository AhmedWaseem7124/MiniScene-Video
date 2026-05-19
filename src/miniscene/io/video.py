from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

import cv2


@dataclass
class VideoMeta:
    width: int
    height: int
    fps: float
    frame_count: int


def read_video_meta(video_path: str | Path) -> VideoMeta:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise FileNotFoundError(f"Unable to open video: {video_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    cap.release()
    return VideoMeta(width=width, height=height, fps=fps, frame_count=frame_count)


def iterate_frames(video_path: str | Path, frame_step: int = 1) -> Iterator[tuple[int, "cv2.typing.MatLike"]]:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise FileNotFoundError(f"Unable to open video: {video_path}")

    idx = 0
    out_idx = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if idx % frame_step == 0:
                yield out_idx, frame
                out_idx += 1
            idx += 1
    finally:
        cap.release()


def estimate_auto_frame_step(video_path: str | Path, max_probe_pairs: int = 24) -> int:
    """Estimate frame skip from motion intensity.

    Lower skip for higher motion to preserve temporal detail, higher skip for low motion.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise FileNotFoundError(f"Unable to open video: {video_path}")

    prev_gray = None
    motion_scores: list[float] = []
    try:
        while len(motion_scores) < max_probe_pairs:
            ok, frame = cap.read()
            if not ok:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            if prev_gray is not None:
                diff = cv2.absdiff(prev_gray, gray)
                motion_scores.append(float(diff.mean()))
            prev_gray = gray
    finally:
        cap.release()

    if not motion_scores:
        return 5

    motion = float(sum(motion_scores) / len(motion_scores))

    # Heuristic mapping from average frame delta to sampling stride.
    if motion >= 10.0:
        return 2
    if motion >= 6.0:
        return 3
    if motion >= 3.0:
        return 4
    if motion >= 1.5:
        return 5
    return 6
