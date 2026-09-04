#!/usr/bin/env bash
set -u
URL="https://www.1000ps.com/en-us/brand/7/bmw"
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
echo "[$(date +%H:%M:%S)] waiting for 1000PS block to lift…"
for i in $(seq 1 40); do   # up to ~40 min (60s each)
  code=$(curl -sS -A "$UA" -m 25 -o /dev/null -w "%{http_code}" "$URL")
  echo "[$(date +%H:%M:%S)] probe $i → HTTP $code"
  if [ "$code" = "200" ]; then
    echo "[$(date +%H:%M:%S)] unblocked — starting resumable scrape"
    PS_CONCURRENCY=2 PS_DELAY_MS=1200 node scrape.mjs
    exit $?
  fi
  sleep 60
done
echo "still blocked after 40 min — giving up; rerun run-when-unblocked.sh later"
exit 1
