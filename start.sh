#!/bin/sh
# Start the study app: fetch/build data if needed, then serve it on localhost and open the browser.
cd "$(dirname "$0")" || exit 1
PORT="${CCA_PORT:-8765}"
python3 tools/setup.py || exit 1
( sleep 1; (open "http://127.0.0.1:$PORT/app/index.html" || xdg-open "http://127.0.0.1:$PORT/app/index.html") >/dev/null 2>&1 ) &
exec python3 serve.py "$PORT"
