#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "opencv-python-headless",
#   "numpy",
# ]
# ///
"""
Verify Beat Streets WebGL rendering orientation with OpenCV.

Renders the same game frame through the WebGL path (default) and the 2D path (known
correct), then uses OpenCV template matching to decide whether the WebGL render matches
the correct 2D frame or its vertical mirror. A vertical flip bug would make WebGL match
the flipped 2D frame instead.

Deterministic — no vision model involved. Run with: uvx beatstreets-verify.py
"""
import sys
import cv2
import numpy as np

WEBGL = "e2e/screenshots/ocv-webgl.png"
TWO_D = "e2e/screenshots/ocv-2d.png"


def load(path: str) -> np.ndarray:
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        sys.exit(f"could not read {path}")
    return img


def main() -> int:
    webgl = load(WEBGL)
    two_d = load(TWO_D)
    # Normalise to the same size.
    if webgl.shape != two_d.shape:
        two_d = cv2.resize(two_d, (webgl.shape[1], webgl.shape[0]))

    gray_w = cv2.cvtColor(webgl, cv2.COLOR_BGR2GRAY)
    gray_t = cv2.cvtColor(two_d, cv2.COLOR_BGR2GRAY)
    flipped = cv2.flip(gray_t, 0)  # vertical flip

    # Normalised cross-correlation of the whole frame: how similar is WebGL to each?
    def corr(a: np.ndarray, b: np.ndarray) -> float:
        a = a.astype(np.float32)
        b = b.astype(np.float32)
        a -= a.mean()
        b -= b.mean()
        denom = float(np.sqrt(np.sum(a * a) * np.sum(b * b)))
        if denom == 0:
            return 0.0
        return float(np.sum(a * b) / denom)

    sim_normal = corr(gray_w, gray_t)
    sim_flipped = corr(gray_w, flipped)

    print(f"OpenCV {cv2.__version__}")
    print(f"WebGL vs 2D (correct)      corr = {sim_normal:.4f}")
    print(f"WebGL vs 2D (vert-flipped) corr = {sim_flipped:.4f}")

    if sim_normal > sim_flipped:
        print("VERDICT: WebGL matches the correct (non-flipped) 2D orientation.")
        return 0
    print("VERDICT: WebGL appears vertically flipped (upside-down).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
