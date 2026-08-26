#!/usr/bin/env python3
"""Objective pixel-level analysis of Beat Streets screenshots."""
import sys
import numpy as np
from PIL import Image
from collections import Counter

def classify_color(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    if mx < 40:
        return "black"
    if mx - mn < 40:
        return "gray/white"
    if r >= 120 and r > g * 1.3 and r > b * 1.3:
        return "red"
    if g >= 120 and g > r * 1.3 and g > b * 1.3:
        return "green"
    if r >= 120 and g >= 120 and r > b * 1.3 and g > b * 1.3:
        return "yellow"
    if b >= 120 and b > r * 1.3 and b > g * 1.3:
        return "blue"
    return "other"

def analyze(path):
    img = Image.open(path).convert("RGB")
    a = np.asarray(img, dtype=np.int32)
    h, w, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    total = h * w

    lum = 0.299 * r + 0.587 * g + 0.114 * b
    black = float((lum < 20).sum())
    bright = float((lum > 150).sum())
    nonblack_frac = 1.0 - black / total
    bright_frac = bright / total

    # distinct colors
    quant = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
    uniq = len(np.unique(quant))
    uniq_full = len(np.unique(r.astype(np.int64) * 1000000 + g.astype(np.int64) * 1000 + b.astype(np.int64)))

    # saturated colored pixels (debug markers)
    mxv = a.max(axis=2)
    mnv = a.min(axis=2)
    sat = mxv - mnv
    saturated = sat > 60
    # per color counts on saturated pixels
    cat = np.empty(total, dtype=object)
    cat[:] = "black"
    rr, gg, bb = r.ravel(), g.ravel(), b.ravel()
    satf = saturated.ravel()
    cnt = Counter()
    for i in range(total):
        if satf[i]:
            cnt[classify_color(int(rr[i]), int(gg[i]), int(bb[i]))] += 1
    colsum = sum(cnt.values())
    cols = {k: round(v / total * 100, 3) for k, v in cnt.items()} if colsum else {}

    # row/col coverage (where any non-dark pixel is) to estimate content bounding box
    nonblack_mask = lum > 25
    rows = np.where(nonblack_mask.any(axis=1))[0]
    colsx = np.where(nonblack_mask.any(axis=0))[0]

    print(f"\n=== {path} ({w}x{h}) ===")
    print(f"black(<20 lum): {black/total*100:.2f}%   bright(>150): {bright_frac*100:.2f}%   non-dark: {nonblack_frac*100:.2f}%")
    print(f"distinct colors (5-bit quantized): {uniq}   full-color: {uniq_full}")
    print(f"saturated(colored) pixels: {colsum} ({colsum/total*100:.3f}% of image)")
    print(f"colored-pixel distribution(% of whole image): {cols if cols else 'none'}")
    if len(rows) and len(colsx):
        print(f"content bbox: rows {rows.min()}-{rows.max()} of {h}, cols {colsx.min()}-{colsx.max()} of {w}  (content covers {len(rows)} rows x {len(colsx)} cols)")
    # brightness histogram buckets
    bmax = int(lum.max())
    print(f"max luminance: {bmax}  mean: {lum.mean():.1f}")
    # is there white text (light pixels on dark bg)?
    whiteish = float((lum > 180).sum())
    print(f"near-white pixels(>180): {whiteish/total*100:.2f}%")

for p in sys.argv[1:]:
    analyze(p)
