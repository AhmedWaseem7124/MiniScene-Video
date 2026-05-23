import requests
import time
import json

url = "http://127.0.0.1:5000/api/process-video"

# Reset video pointer and send
print("Uploading video first time (should process)...")
t0 = time.time()
with open("WhatsApp Video 2026-04-05 at 4.27.46 PM.mp4", "rb") as f:
    res1 = requests.post(url, files={"video": f}, data={"mode": "fast"})
t1 = time.time()
print(f"Response 1 code: {res1.status_code}")
print(f"Time taken first time: {t1 - t0:.2f}s")
try:
    data1 = res1.json()
    print("Success status:", data1.get("success"))
    print("Session ID:", data1.get("session_id"))
    print("Detected objects count:", data1.get("detected_object_count"))
    print("Debug payload:")
    print(json.dumps(data1.get("debug"), indent=2))
except Exception as e:
    print("Error parsing json:", e)
    print(res1.text)

print("\nUploading video second time (should cache hit)...")
t2 = time.time()
with open("WhatsApp Video 2026-04-05 at 4.27.46 PM.mp4", "rb") as f:
    res2 = requests.post(url, files={"video": f}, data={"mode": "fast"})
t3 = time.time()
print(f"Response 2 code: {res2.status_code}")
print(f"Time taken second time: {t3 - t2:.2f}s")
try:
    data2 = res2.json()
    print("Success status:", data2.get("success"))
    print("Session ID:", data2.get("session_id"))
    print("Detected objects count:", data2.get("detected_object_count"))
    print("Debug message:", data2.get("debug", {}).get("message"))
except Exception as e:
    print("Error parsing json:", e)
    print(res2.text)
