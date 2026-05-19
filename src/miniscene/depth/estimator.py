from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class DepthEstimator:
    mode: str = "auto"

    def __post_init__(self) -> None:
        self._backend = "heuristic"
        self._model = None
        self._processor = None
        self._midas_transform = None
        self._torch = None
        if self.mode in {"auto", "model", "midas"}:
            self._try_load_model()
        if self.mode in {"model", "midas"} and self._backend == "heuristic":
            raise RuntimeError(
                "Model-based depth requested but dependencies/model are unavailable. "
                "Install torch and transformers, or use --depth-mode heuristic."
            )

    @property
    def is_model_loaded(self) -> bool:
        return self._backend in {"midas", "hf"}

    def _try_load_model(self) -> None:
        if self._try_load_midas():
            self._backend = "midas"
            return

        if self.mode == "midas":
            return

        try:
            import torch
            from PIL import Image
            from transformers import AutoImageProcessor, AutoModelForDepthEstimation

            self._torch = torch
            self._Image = Image
            model_name = "LiheYoung/depth-anything-small-hf"
            self._processor = AutoImageProcessor.from_pretrained(model_name)
            self._model = AutoModelForDepthEstimation.from_pretrained(model_name)
            self._model.eval()
            self._backend = "hf"
        except Exception:
            self._model = None
            self._processor = None

    def _try_load_midas(self) -> bool:
        try:
            import torch

            self._torch = torch
            self._model = torch.hub.load("intel-isl/MiDaS", "MiDaS_small", trust_repo=True)
            transforms = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)
            self._midas_transform = transforms.small_transform
            self._model.eval()
            return True
        except Exception:
            self._model = None
            self._midas_transform = None
            return False

    def estimate(self, frame_bgr: np.ndarray) -> np.ndarray:
        if self._backend == "midas":
            return self._estimate_midas(frame_bgr)
        if self._backend == "hf":
            return self._estimate_model(frame_bgr)
        return self._estimate_heuristic(frame_bgr)

    def _estimate_midas(self, frame_bgr: np.ndarray) -> np.ndarray:
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        input_batch = self._midas_transform(rgb)

        with self._torch.no_grad():
            pred = self._model(input_batch)
            pred = self._torch.nn.functional.interpolate(
                pred.unsqueeze(1),
                size=rgb.shape[:2],
                mode="bicubic",
                align_corners=False,
            ).squeeze()

        depth = pred.cpu().numpy().astype(np.float32)
        depth = depth - depth.min()
        depth = depth / (depth.max() + 1e-6)
        depth = 0.2 + depth * 4.8
        return depth

    def _estimate_model(self, frame_bgr: np.ndarray) -> np.ndarray:
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        pil_img = self._Image.fromarray(rgb)
        inputs = self._processor(images=pil_img, return_tensors="pt")

        with self._torch.no_grad():
            pred = self._model(**inputs).predicted_depth

        pred = self._torch.nn.functional.interpolate(
            pred.unsqueeze(1),
            size=rgb.shape[:2],
            mode="bicubic",
            align_corners=False,
        ).squeeze()

        depth = pred.cpu().numpy().astype(np.float32)
        depth = depth - depth.min()
        depth = depth / (depth.max() + 1e-6)
        depth = 0.2 + depth * 4.8
        return depth

    def _estimate_heuristic(self, frame_bgr: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        gray_f = gray.astype(np.float32) / 255.0

        blur = cv2.GaussianBlur(gray_f, (5, 5), 0)
        lap = cv2.Laplacian(blur, cv2.CV_32F, ksize=3)
        detail = np.abs(lap)

        low_detail = 1.0 - (detail / (detail.max() + 1e-6))
        brightness = 1.0 - gray_f

        depth = 0.7 * low_detail + 0.3 * brightness
        depth = cv2.GaussianBlur(depth, (9, 9), 0)

        depth = depth - depth.min()
        depth = depth / (depth.max() + 1e-6)
        depth = 0.3 + depth * 4.2
        return depth.astype(np.float32)
