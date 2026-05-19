from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MiniSceneConfig:
    # "adaptive" means detector confidence is dynamically lowered per frame when needed.
    confidence_threshold: str = "adaptive"
    confidence_base: float = 0.35
    confidence_floor: float = 0.20
    iou_threshold: float = 0.40
    frame_skip: str = "auto"
    min_track_length: int = 3


DEFAULT_MINISCENE_CONFIG = MiniSceneConfig()
