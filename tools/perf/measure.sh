#!/bin/sh
# Drives one full profiling pass and writes the JSON to $2.
#   tools/perf/measure.sh <url> <out.json> [viewport] [scale]
# Set BFLAGS=--headed for real-GPU frame times (headless is SwiftShader).
set -e
B="$HOME/.claude/skills/gstack/browse/dist/browse"
URL="$1"
OUT="$2"
VP="${3:-1440x900}"
SCALE="${4:-1}"

if [ "$SCALE" = "1" ]; then $B $BFLAGS viewport "$VP" >/dev/null; else $B $BFLAGS viewport "$VP" --scale "$SCALE" >/dev/null; fi

# Warm-up pass: same origin, discarded. The bundled drafting faces are fetched
# and font-matched on first use, and an unwarmed face makes the first paint of
# every page several times its steady cost — which is real, but it is a
# cold-cache cost, not the thing an A/B of the paint path is trying to compare.
$B $BFLAGS goto "$URL" >/dev/null
sleep 1
$B $BFLAGS js "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('enter the desk')).click(); 'warm'" >/dev/null
sleep 10

$B $BFLAGS goto "$URL" >/dev/null
sleep 2
$B $BFLAGS js "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('enter the desk')).click(); 'clicked'" >/dev/null
sleep 12
$B $BFLAGS eval tools/perf/probe.js
$B $BFLAGS eval tools/perf/walk.js
for i in $(seq 1 40); do
  sleep 3
  R=$($B $BFLAGS js "window.__perfResult ? 'done' : 'wait'" 2>/dev/null || echo wait)
  case "$R" in *done*) break ;; esac
done
$B $BFLAGS js "JSON.stringify(window.__perfResult)" > "$OUT"
echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
