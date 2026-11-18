from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from octogamear.app import create_app
from octogamear.config import Config


@pytest.fixture
def web_dir(tmp_path: Path) -> Path:
    root = tmp_path / "web"
    for subdir in ("css", "js", "vendor", "assets", "data"):
        (root / subdir).mkdir(parents=True)
    (root / "index.html").write_text(
        '<!doctype html><html><head><base href="/octogamear/"><title>THE GARDEN</title></head>'
        "<body>AR</body></html>",
        encoding="utf-8",
    )
    (root / "css" / "style.css").write_text("body{background:#041411}", encoding="utf-8")
    (root / "js" / "app.js").write_text("console.log('ar');", encoding="utf-8")
    (root / "assets" / "targets").mkdir()
    (root / "assets" / "targets" / "cocktails.mind").write_bytes(b"MIND")
    (root / "data" / "audios").mkdir()
    (root / "data" / "data.json").write_text('{"cocktails": []}', encoding="utf-8")
    (root / "data" / "audios" / "sample.wav").write_bytes(b"RIFF")
    # A file outside the web root, used to prove traversal attempts are blocked.
    (tmp_path / "private.txt").write_text("secret", encoding="utf-8")
    return root


@pytest.fixture
def config(web_dir: Path) -> Config:
    return Config(web_dir=web_dir, base_path="/octogame/barar")


@pytest.fixture
def client(config: Config) -> Iterator[TestClient]:
    with TestClient(create_app(config)) as test_client:
        yield test_client
