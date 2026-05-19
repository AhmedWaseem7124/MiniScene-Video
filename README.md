
# MiniScene AI

MiniScene is a lightweight 3D scene reconstruction and spatial understanding pipeline.
It converts a smartphone indoor video into a sparse interactive 3D scene using:

- frame extraction + feature tracking (CV)
- monocular depth estimation (optional model-based, fallback heuristic)
- camera motion estimation
- 3D point cloud reconstruction
- interactive scene preview

## Pipeline

`Video -> CV (Frame Extraction + Feature Tracking) -> Depth Estimation -> 3D Reconstruction -> Interactive 3D Scene`

## Features

- ORB feature tracking across frames
- Feature-match-assisted object deduplication across frames (count each physical object once)
- Relative camera motion estimation via essential matrix decomposition
- Optional Hugging Face depth model (`depth-anything-small-hf`) when `torch` and `transformers` are installed
- Lightweight fallback depth estimator when model dependencies are unavailable
- Point cloud export to `.ply`
- Interactive Plotly preview (`.html`)
- Approximate real-world distance estimator between two pixels in a frame

## Tooling & Models

| Tool / Model    | Type              | Used For                            |
| --------------- | ----------------- | ----------------------------------- |
| OpenCV          | CV Library        | Video processing & frame extraction |
| MiDaS           | AI Model          | Depth estimation                    |
| PyTorch         | ML Framework      | Running AI models                   |
| NumPy           | Numeric Library   | Matrix & coordinate computations    |
| Open3D          | 3D Vision Library | Point cloud, mesh & visualization   |
| Matplotlib      | Visualization     | Depth heatmaps                      |
| Streamlit       | UI Framework      | User interface                      |
| COLMAP (opt.)   | SfM Tool          | Camera motion estimation            |
| Three.js (opt.) | Web 3D            | Browser visualization               |

## Quickstart

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Run:

```bash
python -m miniscene.cli --video data/input.mp4 --out-dir outputs --frame-step 5
```

Object-count tuning (generic across scenes):

```bash
python -m miniscene.cli --video data/input.mp4 --out-dir outputs --extract-objects \
    --object-dedup-merge-radius 1.2 \
    --object-dedup-feature-similarity 0.72
```

Optional model-based depth:

```bash
pip install torch transformers pillow
python -m miniscene.cli --video data/input.mp4 --out-dir outputs --depth-mode model
```

## Output

- `outputs/point_cloud.ply` - reconstructed sparse point cloud
- `outputs/trajectory.json` - camera trajectory and metadata
- `outputs/scene_preview.html` - interactive 3D visualization
- `outputs/depth_preview/` - sample normalized depth map images

## Distance Estimation Example

Use the `estimate_distance_between_pixels` utility:

```python
from miniscene.recon.reconstruct import estimate_distance_between_pixels

d = estimate_distance_between_pixels(
    depth_map=depth_map,
    pose_world_from_cam=pose,
    intrinsics=K,
    px_a=(120, 80),
    px_b=(300, 220),
)
print(f"Distance: {d:.2f} meters")
```

## Notes

- Monocular depth from a single RGB video is scale-ambiguous; absolute scale is approximate unless calibrated with known scene dimensions.
- Best quality comes from stable camera motion and good lighting.
