#!/usr/bin/env bash
# Encode Metaball turntable PNG sequence → ProRes 4444 (alpha) or VP9 webm.
# Usage:
#   ./encode_turntable.sh <frames_dir> <output_path_without_ext> [fps] [mov|webm]
set -euo pipefail

FRAMES_DIR="${1:?frames dir}"
OUT_BASE="${2:?output base path without extension}"
FPS="${3:-24}"
FMT="${4:-mov}"

shopt -s nullglob
frames=("$FRAMES_DIR"/*.png)
if [[ ${#frames[@]} -eq 0 ]]; then
  echo "No PNG frames in $FRAMES_DIR" >&2
  exit 1
fi

# Detect Blender-style %04d.png vs other numbering via first frame basename
pattern="$FRAMES_DIR/%04d.png"
if [[ ! -f "$FRAMES_DIR/0001.png" && ! -f "$FRAMES_DIR/0000.png" ]]; then
  # Fall back to glob concat via concat demuxer is harder; try %d
  pattern="$FRAMES_DIR/%d.png"
fi

mkdir -p "$(dirname "$OUT_BASE")"

if [[ "$FMT" == "webm" ]]; then
  ffmpeg -y -framerate "$FPS" -i "$pattern" \
    -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 \
    "${OUT_BASE}.webm"
  echo "Wrote ${OUT_BASE}.webm"
else
  ffmpeg -y -framerate "$FPS" -i "$pattern" \
    -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le \
    "${OUT_BASE}.mov"
  echo "Wrote ${OUT_BASE}.mov"
fi
