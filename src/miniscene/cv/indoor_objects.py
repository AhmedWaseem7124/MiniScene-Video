import cv2
import numpy as np

def detect_indoor_custom_objects(frame: np.ndarray, room_context=None) -> list[dict]:
    """Wrapper to run all indoor object custom heuristic detectors on a given frame."""
    if frame is None or frame.size == 0:
        return []
        
    detections = []
    detections.extend(detect_rug_candidates(frame))
    detections.extend(detect_painting_candidates(frame))
    detections.extend(detect_mirror_candidates(frame))
    detections.extend(detect_cupboard_candidates(frame))
    detections.extend(detect_curtain_candidates(frame))
    detections.extend(detect_lamp_candidates(frame))
    return detections

def detect_rug_candidates(frame: np.ndarray) -> list[dict]:
    """Identify flat rectangular shapes in the lower portion of the frame (rugs)."""
    h, w = frame.shape[:2]
    img_area = h * w
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 30, 100)
    
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 0.03 * img_area:
            continue
            
        x, y, w_box, h_box = cv2.boundingRect(cnt)
        cx = x + w_box / 2
        cy = y + h_box / 2
        
        # Must be in the lower part of the image (floor) and wider than it is tall
        if cy > 0.6 * h and w_box > h_box:
            candidates.append({
                "label": "rug",
                "confidence": 0.45,
                "bbox_2d": [x, y, x + w_box, y + h_box],
                "source": "heuristic"
            })
            
    return candidates

def detect_painting_candidates(frame: np.ndarray) -> list[dict]:
    """Identify framed rectangular shapes in the middle-upper part of the frame (paintings)."""
    h, w = frame.shape[:2]
    img_area = h * w
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 0.01 * img_area or area > 0.15 * img_area:
            continue
            
        # Approximate contour to check for rectangular shapes (4 vertices)
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)
        
        x, y, w_box, h_box = cv2.boundingRect(cnt)
        cx = x + w_box / 2
        cy = y + h_box / 2
        
        # Paintings reside on walls (middle height of the room)
        if len(approx) == 4 and 0.2 * h < cy < 0.65 * h:
            candidates.append({
                "label": "painting",
                "confidence": 0.48,
                "bbox_2d": [x, y, x + w_box, y + h_box],
                "source": "heuristic"
            })
            
    return candidates

def detect_mirror_candidates(frame: np.ndarray) -> list[dict]:
    """Identify bright, reflective rectangular shapes on walls (mirrors)."""
    h, w = frame.shape[:2]
    img_area = h * w
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Mirror reflections often create highly bright spots or bright frames
    _, thresh = cv2.threshold(gray, 210, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 0.01 * img_area or area > 0.1 * img_area:
            continue
            
        x, y, w_box, h_box = cv2.boundingRect(cnt)
        cx = x + w_box / 2
        cy = y + h_box / 2
        
        # Placed on walls at standing height level
        if 0.15 * h < cy < 0.6 * h:
            candidates.append({
                "label": "mirror",
                "confidence": 0.42,
                "bbox_2d": [x, y, x + w_box, y + h_box],
                "source": "heuristic"
            })
            
    return candidates

def detect_cupboard_candidates(frame: np.ndarray) -> list[dict]:
    """Identify tall vertical standing rectangular shapes (cupboard/wardrobe)."""
    h, w = frame.shape[:2]
    img_area = h * w
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 40, 120)
    
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 0.02 * img_area or area > 0.2 * img_area:
            continue
            
        x, y, w_box, h_box = cv2.boundingRect(cnt)
        cx = x + w_box / 2
        cy = y + h_box / 2
        
        # Cupboards are vertical objects standing on/near the floor level
        if h_box > w_box * 1.3 and cy > 0.45 * h:
            candidates.append({
                "label": "cupboard",
                "confidence": 0.46,
                "bbox_2d": [x, y, x + w_box, y + h_box],
                "source": "heuristic"
            })
            
    return candidates

def detect_curtain_candidates(frame: np.ndarray) -> list[dict]:
    """Identify highly vertical vertical stripes near the edges of the frame (curtains)."""
    h, w = frame.shape[:2]
    img_area = h * w
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 30, 90)
    
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 0.015 * img_area or area > 0.25 * img_area:
            continue
            
        x, y, w_box, h_box = cv2.boundingRect(cnt)
        cx = x + w_box / 2
        
        # Curtains run vertically and are positioned on the margins of the window/walls
        if h_box > w_box * 2.5 and (cx < 0.25 * w or cx > 0.75 * w):
            candidates.append({
                "label": "curtain",
                "confidence": 0.44,
                "bbox_2d": [x, y, x + w_box, y + h_box],
                "source": "heuristic"
            })
            
    return candidates

def detect_lamp_candidates(frame: np.ndarray) -> list[dict]:
    """Identify small bright sources or light shapes in the upper part of the frame (lamps)."""
    h, w = frame.shape[:2]
    img_area = h * w
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Lamps or lights are bright glowing objects
    _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        # Small size cap
        if area < 0.001 * img_area or area > 0.02 * img_area:
            continue
            
        x, y, w_box, h_box = cv2.boundingRect(cnt)
        cy = y + h_box / 2
        
        # Lights or hanging lamps reside on/near ceiling
        if cy < 0.45 * h:
            candidates.append({
                "label": "lamp",
                "confidence": 0.40,
                "bbox_2d": [x, y, x + w_box, y + h_box],
                "source": "heuristic"
            })
            
    return candidates
