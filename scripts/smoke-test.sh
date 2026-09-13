#!/usr/bin/env bash
set -u
cd /home/aragon/CascadeProjects/media-car-player

pkill -f "next/dist/bin/next start" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 1

nohup node node_modules/next/dist/bin/next start -p 3000 >/tmp/mcp.log 2>&1 &
disown

UP=0
for i in $(seq 1 60); do
  if curl -sf -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
    UP=$i
    break
  fi
  sleep 1
done

echo "SERVER_UP_AFTER=${UP:-NEVER}s"
echo "== SERVER LOG =="
cat /tmp/mcp.log
echo
echo "== ENDPOINTS =="

check() {
  local name="$1"
  local url="$2"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:3000$url")
  echo "$name -> $code"
}

check "HOME" "/"
check "MANIFEST" "/manifest.webmanifest"
check "SW" "/sw.js"
check "ICON" "/icons/icon-192.png"
check "DOWNLOAD_API" "/api/download?url=https%3A%2F%2Fexample.com"
echo
echo "== CONTENT CHECKS =="
curl -s http://127.0.0.1:3000/ | grep -o "Media Car" | head -1
curl -s http://127.0.0.1:3000/ | grep -o 'manifest.webmanifest' | head -1
curl -s http://127.0.0.1:3000/sw.js | head -c 60
echo

pkill -f "next/dist/bin/next start" 2>/dev/null
pkill -f "next-server" 2>/dev/null
true