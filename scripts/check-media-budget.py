#!/usr/bin/env python3
"""Automated Wayfinder media size and format gate for tracked repository assets."""
import argparse
from pathlib import Path
from PIL import Image

ART_DIRS = (
    "learning-target", "teks-check", "rtf-comics", "rtf-characters",
    "learning-guide-assets", "lesson-content-assets"
)
def main():
    p = argparse.ArgumentParser()
    p.add_argument("--root", type=Path, default=Path("."))
    p.add_argument("--image-kib", type=int, default=250)
    p.add_argument("--html-kib", type=int, default=2048)
    args = p.parse_args()
    root = args.root
    fails = []
    checked = 0
    for category in ART_DIRS:
        folder = root / "assets" / category
        if not folder.exists():
            continue
        for path in folder.rglob("*.webp"):
            checked += 1
            size = path.stat().st_size
            if size > args.image_kib * 1024:
                fails.append(f"Image too large: {path} ({size:,} bytes)")
            try:
                with Image.open(path) as im:
                    if im.format != "WEBP":
                        fails.append(f"Incorrect actual image format: {path}")
                    im.verify()
            except Exception as e:
                fails.append(f"Image decode failed: {path} ({e})")
    for category in ("Tech", "CS", "AAVTC"):
        for path in (root / category).glob("[0-9]*.html"):
            checked += 1
            if path.stat().st_size > args.html_kib * 1024:
                fails.append(f"Repository source too large: {path} ({path.stat().st_size:,} bytes)")
    for failure in fails:
        print("FAIL:", failure)
    print(f"Checked {checked} tracked WebP media and lesson source files; failures={len(fails)}")
    # Note: JISD downloadable HTML is not in GitHub. Its offline size is checked by
    # wayfinder-media.py and the post-upload Drive byte-size readback.
    raise SystemExit(1 if fails else 0)
if __name__ == "__main__":
    main()
