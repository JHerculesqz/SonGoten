"""Container health probe for BarAR and BarStreet.

Honours OCTOGAMEAR_BASE_PATH / OCTOGAMEAR_STREET_BASE_PATH and OCTOGAMEAR_PORT.
The container is healthy only when both frontends are served and BarStreet's
SQLite store is ready.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request

port = os.environ.get("OCTOGAMEAR_PORT", "3501")
barar_base = os.environ.get("OCTOGAMEAR_BASE_PATH", "/octogame/barar").rstrip("/")
street_base = os.environ.get("OCTOGAMEAR_STREET_BASE_PATH", "/octogame/barstreet").rstrip("/")

checks = [
    (f"http://127.0.0.1:{port}{barar_base}/api/health", "web"),
    (f"http://127.0.0.1:{port}{street_base}/api/health", "db"),
]


def main() -> int:
    for url, key in checks:
        try:
            with urllib.request.urlopen(url, timeout=3) as response:
                if response.status != 200:
                    print(f"healthcheck failed: {url} -> {response.status}", file=sys.stderr)
                    return 1
                payload = json.loads(response.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001 - any failure means unhealthy
            print(f"healthcheck failed: {url}: {exc}", file=sys.stderr)
            return 1

        if key == "web":
            web = payload.get("web")
            ready = web.get("ready") is True if isinstance(web, dict) else web is True
            if not ready:
                print(f"healthcheck failed: {url} frontend not ready", file=sys.stderr)
                return 1
        elif key == "db" and payload.get("db") is not True:
            print(f"healthcheck failed: {url} database not ready", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
