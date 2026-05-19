from __future__ import annotations

from pathlib import Path

import numpy as np


def write_interactive_html(path: str | Path, points: np.ndarray, colors: np.ndarray) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    try:
        import plotly.graph_objects as go
    except Exception as ex:
        raise RuntimeError("Plotly is required for interactive HTML output.") from ex

    if len(points) == 0:
        fig = go.Figure()
        fig.update_layout(title="MiniScene - Empty Point Cloud")
        fig.write_html(str(path), include_plotlyjs="cdn")
        return

    # Browsers struggle with multi-million-point scatter traces, which can appear as an empty scene.
    # Keep a representative subset for stable interactive rendering.
    max_preview_points = 200_000
    if len(points) > max_preview_points:
        idx = np.linspace(0, len(points) - 1, max_preview_points, dtype=np.int64)
        points = points[idx]
        colors = colors[idx]

    rgb_255 = np.clip(colors * 255.0, 0, 255).astype(np.uint8)
    marker_colors = [f"rgb({r},{g},{b})" for r, g, b in rgb_255]

    fig = go.Figure(
        data=[
            go.Scatter3d(
                x=points[:, 0],
                y=points[:, 1],
                z=points[:, 2],
                mode="markers",
                marker={"size": 2, "color": marker_colors, "opacity": 0.85},
            )
        ]
    )

    fig.update_layout(
        title="MiniScene 3D Reconstruction",
        scene={"xaxis_title": "X", "yaxis_title": "Y", "zaxis_title": "Z"},
        margin={"l": 0, "r": 0, "b": 0, "t": 40},
    )
    fig.write_html(str(path), include_plotlyjs="cdn")


def write_interactive_mesh_html(path: str | Path, vertices: np.ndarray, triangles: np.ndarray) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    try:
        import plotly.graph_objects as go
    except Exception as ex:
        raise RuntimeError("Plotly is required for interactive HTML output.") from ex

    if len(vertices) == 0 or len(triangles) == 0:
        fig = go.Figure()
        fig.update_layout(title="MiniScene - Empty Mesh")
        fig.write_html(str(path), include_plotlyjs="cdn")
        return

    fig = go.Figure(
        data=[
            go.Mesh3d(
                x=vertices[:, 0],
                y=vertices[:, 1],
                z=vertices[:, 2],
                i=triangles[:, 0],
                j=triangles[:, 1],
                k=triangles[:, 2],
                color="lightblue",
                opacity=1.0,
                flatshading=True,
                lighting={"ambient": 0.5, "diffuse": 0.7, "specular": 0.1, "roughness": 0.9},
                lightposition={"x": 100, "y": 200, "z": 0},
            )
        ]
    )

    fig.update_layout(
        title="MiniScene 3D Mesh",
        scene={"xaxis_title": "X", "yaxis_title": "Y", "zaxis_title": "Z", "aspectmode": "data"},
        margin={"l": 0, "r": 0, "b": 0, "t": 40},
    )
    fig.write_html(str(path), include_plotlyjs="cdn")
