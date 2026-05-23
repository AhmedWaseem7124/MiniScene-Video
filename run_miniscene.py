from __future__ import annotations

import os
import signal
import subprocess
import sys
import threading
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT / "frontend"


def _npm_command() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def _stream_output(name: str, process: subprocess.Popen[str]) -> None:
    assert process.stdout is not None
    for line in process.stdout:
        print(f"[{name}] {line}", end="")


def _start_process(name: str, cmd: list[str], cwd: Path) -> subprocess.Popen[str]:
    print(f"Starting {name}: {' '.join(cmd)}")
    return subprocess.Popen(
        cmd,
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )


def _stop_process(process: subprocess.Popen[str], name: str) -> None:
    if process.poll() is not None:
        return

    print(f"Stopping {name}...")
    if os.name == "nt":
        process.terminate()
    else:
        process.send_signal(signal.SIGTERM)

    try:
        process.wait(timeout=8)
    except subprocess.TimeoutExpired:
        process.kill()


def main() -> int:
    if not FRONTEND_DIR.exists():
        print(f"Frontend directory not found: {FRONTEND_DIR}", file=sys.stderr)
        return 1

    backend = _start_process(
        "backend",
        [sys.executable, str(ROOT / "server.py")],
        ROOT,
    )
    frontend = _start_process(
        "frontend",
        [_npm_command(), "run", "dev", "--", "--host", "0.0.0.0"],
        FRONTEND_DIR,
    )

    threads = [
        threading.Thread(target=_stream_output, args=("backend", backend), daemon=True),
        threading.Thread(target=_stream_output, args=("frontend", frontend), daemon=True),
    ]
    for thread in threads:
        thread.start()

    print("\nMiniScene AI is starting.")
    print("Frontend: http://localhost:5173/")
    print("Backend:  http://127.0.0.1:5000/")
    print("Press Ctrl+C to stop both.\n")

    processes = [("backend", backend), ("frontend", frontend)]
    try:
        while True:
            for name, process in processes:
                code = process.poll()
                if code is not None:
                    print(f"{name} exited with code {code}")
                    for other_name, other_process in processes:
                        if other_process is not process:
                            _stop_process(other_process, other_name)
                    return int(code)
            threading.Event().wait(0.5)
    except KeyboardInterrupt:
        print("\nShutdown requested.")
        for name, process in processes:
            _stop_process(process, name)
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
