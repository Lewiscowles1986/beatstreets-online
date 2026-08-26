#!/usr/bin/env python3
"""Spatial structure analysis: where dark vs light regions sit, text edge density."""
import sys
import numpy as np
from PIL import Image

def analyze(path):
    img = Image.open(path).convert("RGB")
    a = np.asarray(img, dtype=np.int32)
    h, w, _ = a.shape
    lum = 0.299*a[...,0] + 0.587*a[...,1] + 0.114*a[...,2]

    print(f"\n=== {path} ===")
    # histogram buckets of luminance
    hist, _ = np.histogram(lum, bins=[0,20,60,100,140,180,220,256])
    labels = ["0-20","20-60","60-100","100-140","140-180","180-220","220-255"]
    print("lum histogram (%):", {labels[i]: round(hist[i]/lum.size*100,2) for i in range(len(labels))})

    # any dark region at all?
    dark = lum < 20
    print(f"dark(<20) px: {dark.sum()/lum.size*100:.3f}%")
    if dark.sum() > 0:
        rows = np.where(dark.any(axis=1))[0]
        cols = np.where(dark.any(axis=0))[0]
        print(f"  dark bbox rows {rows.min()}-{rows.max()} cols {cols.min()}-{cols.max()}")

    # grid of 4x4 blocks, mean luminance
    print("mean lum per 4x4 block:")
    for by in range(4):
        row = []
        for bx in range(4):
            block = lum[by*h//4:(by+1)*h//4, bx*w//4:(bx+1)*w//4]
            row.append(round(block.mean(),1))
        print("   ", row)

    # edge/text density (sobel-like via gradient magnitude on downscaled gray)
    g = np.asarray(img.convert("L"), dtype=np.float32)
    gs = np.asarray(Image.fromarray(g).resize((128,72)), dtype=np.float32)
    gx = np.abs(np.diff(gs, axis=1)); gy = np.abs(np.diff(gs, axis=0))
    edge = (gx[:-1,:]+gy[:,:-1])/2
    print(f"edge magnitude mean: {edge.mean():.1f}  max: {edge.max():.0f}")
    # fraction of cells that are "text-like" (high local contrast)
    strong = edge > 30
    print(f"high-contrast edge cells(>30): {strong.sum()}/{edge.size} ({strong.sum()/edge.size*100:.1f}%)")

for p in sys.argv[1:]:
    analyze(p)
