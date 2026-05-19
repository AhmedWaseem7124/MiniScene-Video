from __future__ import annotations

import sys
from pathlib import Path


TRELLIS_MODEL_NAME = "microsoft/TRELLIS-image-large"


def _write_trellis_preview_html(path: Path, glb_name: str) -> None:
    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Trellis 2 Preview</title>
  <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
  <style>
    html, body {{ margin: 0; width: 100%; height: 100%; background: #11161f; color: #e9eef7; font-family: Consolas, monospace; }}
    model-viewer {{ width: 100%; height: 100%; background: linear-gradient(180deg, #101724 0%, #0b0f17 100%); }}
    .hud {{ position: fixed; top: 12px; left: 12px; z-index: 10; background: rgba(0,0,0,0.45); padding: 10px 12px; border-radius: 8px; }}
  </style>
</head>
<body>
  <div class="hud">Trellis 2 preview</div>
  <model-viewer src="./{glb_name}" camera-controls auto-rotate shadow-intensity="1" exposure="1.0" ar></model-viewer>
</body>
</html>
"""
    path.write_text(html, encoding="utf-8")


def try_reconstruct_image_with_trellis2(image_path: str | Path, out_dir: str | Path, model_name: str = TRELLIS_MODEL_NAME) -> bool:
    """Try TRELLIS image-to-3D first, returning False when it is unavailable.

    The function intentionally falls back cleanly on non-Linux, CPU-only, or
    missing-dependency machines.
    """
    if sys.platform.startswith("win"):
        return False

    try:
        import torch

        if not torch.cuda.is_available():
            return False

        from PIL import Image
        from trellis.pipelines import TrellisImageTo3DPipeline
        from trellis.utils import postprocessing_utils
    except Exception:
        return False

    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    try:
        image = Image.open(image_path).convert("RGB")
        pipeline = TrellisImageTo3DPipeline.from_pretrained(model_name)
        pipeline.cuda()
        outputs = pipeline.run(image, seed=1)

        gaussian_list = outputs.get("gaussian") or []
        mesh_list = outputs.get("mesh") or []
        if not gaussian_list or not mesh_list:
            return False

        gaussian = gaussian_list[0]
        mesh = mesh_list[0]

        gaussian_path = out_path / "trellis_gaussian.ply"
        glb_path = out_path / "trellis.glb"
        preview_path = out_path / "trellis_preview.html"

        gaussian.save_ply(str(gaussian_path))
        glb = postprocessing_utils.to_glb(
            gaussian,
            mesh,
            simplify=0.95,
            texture_size=1024,
        )
        glb.export(str(glb_path))
        _write_trellis_preview_html(preview_path, glb_path.name)
        return True
    except Exception:
        return False