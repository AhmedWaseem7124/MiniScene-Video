from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MiniSceneConfig:
    # "adaptive" means detector confidence is dynamically lowered per frame when needed.
    confidence_threshold: str = "adaptive"
    confidence_base: float = 0.15
    confidence_floor: float = 0.10
    iou_threshold: float = 0.45
    frame_skip: str = "auto"
    min_track_length: int = 1


DEFAULT_MINISCENE_CONFIG = MiniSceneConfig()
