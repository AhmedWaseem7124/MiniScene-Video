from collections import Counter
import numpy as np
from miniscene.io.video import iterate_frames
from miniscene.depth.estimator import DepthEstimator
from miniscene.cv.objects import _load_yolo_detector, _center_depth

video = "C:/MiniScene/8342690-uhd_3840_2160_25fps.mp4"
frame_step = 30
max_frames = 24
score_th = 0.3

frames = []
for _, f in iterate_frames(video, frame_step=frame_step):
    frames.append(f)
    if len(frames) >= max_frames:
        break

print('sampled_frames=', len(frames))

est = DepthEstimator(mode='heuristic')
depths = [est.estimate(f) for f in frames]

model = _load_yolo_detector('yolov8n.pt')

raw_total = 0
score_total = 0
depth_valid_total = 0
label_counts = Counter()
per_frame = []

for i, (frame, depth) in enumerate(zip(frames, depths)):
    try:
        results = model.track(source=frame, persist=True, verbose=False, conf=float(score_th), tracker='bytetrack.yaml')
    except Exception as e:
        per_frame.append((i, 0, 0, 0, f'track_error:{type(e).__name__}'))
        continue

    if not results:
        per_frame.append((i, 0, 0, 0, 'no_results'))
        continue

    r0 = results[0]
    boxes = getattr(r0, 'boxes', None)
    if boxes is None:
        per_frame.append((i, 0, 0, 0, 'no_boxes'))
        continue

    xyxy = boxes.xyxy.detach().cpu().numpy() if boxes.xyxy is not None else np.empty((0,4), dtype=np.float32)
    confs = boxes.conf.detach().cpu().numpy() if boxes.conf is not None else np.empty((0,), dtype=np.float32)
    clss = boxes.cls.detach().cpu().numpy().astype(np.int32) if boxes.cls is not None else np.empty((0,), dtype=np.int32)
    names = getattr(r0, 'names', {}) or {}

    raw = len(xyxy)
    raw_total += raw

    sc = 0
    dv = 0
    for box, conf, cls_id in zip(xyxy, confs, clss):
        label_counts[str(names.get(int(cls_id), f'obj_{int(cls_id)}'))] += 1
        if float(conf) < score_th:
            continue
        sc += 1
        x1, y1, x2, y2 = [int(v) for v in box]
        d = _center_depth(depth, x1, y1, x2, y2)
        if d > 0.0 and np.isfinite(d):
            dv += 1

    score_total += sc
    depth_valid_total += dv
    per_frame.append((i, raw, sc, dv, 'ok'))

print('raw_total=', raw_total)
print('score_pass_total=', score_total)
print('depth_valid_total=', depth_valid_total)
print('top_labels=', label_counts.most_common(10))
print('per_frame(first10)=')
for row in per_frame[:10]:
    print(row)
