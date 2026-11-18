from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from octogamear import __version__
from octogamear.app import create_app
from octogamear.config import Config

BASE = "/octogame/barar"
API = f"{BASE}/api"


def test_health(client: TestClient) -> None:
    response = client.get(f"{API}/health")
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "status": "ok",
        "service": "octogamear",
        "version": __version__,
        "base_path": BASE,
        "web": {"ready": True},
    }


def test_root_redirects_to_web(client: TestClient) -> None:
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == f"{BASE}/"


def test_base_without_slash_redirects(client: TestClient) -> None:
    response = client.get(BASE, follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == f"{BASE}/"


def test_index_and_static_assets(client: TestClient) -> None:
    index = client.get(f"{BASE}/")
    assert index.status_code == 200
    assert "THE GARDEN" in index.text
    assert '<base href="/octogame/barar/">' in index.text
    assert '<base href="/octogamear/">' not in index.text
    assert index.headers["cache-control"] == "no-cache"

    css = client.get(f"{BASE}/css/style.css")
    assert css.status_code == 200
    assert "text/css" in css.headers["content-type"]
    assert "max-age=3600" in css.headers["cache-control"]

    js = client.get(f"{BASE}/js/app.js")
    assert js.status_code == 200
    assert "javascript" in js.headers["content-type"]

    data_file = client.get(f"{BASE}/data/data.json")
    assert data_file.status_code == 200
    assert "application/json" in data_file.headers["content-type"]
    assert data_file.json() == {"cocktails": []}

    audio = client.get(f"{BASE}/data/audios/sample.wav")
    assert audio.status_code == 200
    assert audio.headers["content-type"].startswith("audio/")

    mind = client.get(f"{BASE}/assets/targets/cocktails.mind")
    assert mind.status_code == 200
    assert mind.content == b"MIND"

    assert client.get(f"{BASE}/index.html").status_code == 200


def test_static_path_traversal_is_blocked(client: TestClient) -> None:
    response = client.get(f"{BASE}/css/%2e%2e/%2e%2e/private.txt")
    assert response.status_code == 404
    assert "secret" not in response.text


def test_missing_web_dir_does_not_break_health(tmp_path: Path) -> None:
    config = Config(web_dir=tmp_path / "missing", base_path=BASE)
    with TestClient(create_app(config)) as test_client:
        assert test_client.get("/").status_code == 503
        assert test_client.get(f"{BASE}/").status_code == 503
        health = test_client.get(f"{API}/health")
        assert health.status_code == 200
        assert health.json()["web"]["ready"] is False


def test_docs_and_openapi_are_disabled(client: TestClient) -> None:
    assert client.get(f"{API}/docs").status_code == 404
    assert client.get(f"{API}/openapi.json").status_code == 404


def test_game_session_leaderboard_and_remy_routes_are_gone(client: TestClient) -> None:
    assert client.get(f"{API}/game").status_code == 404
    assert client.post(f"{API}/sessions").status_code == 404
    assert client.get(f"{API}/leaderboard").status_code == 404
    assert client.post(f"{API}/remy/ask", json={"question": "hello"}).status_code == 404


def test_root_base_path(web_dir: Path) -> None:
    config = Config(web_dir=web_dir, base_path="/")
    with TestClient(create_app(config)) as test_client:
        index = test_client.get("/")
        assert index.status_code == 200
        assert '<base href="/">' in index.text
        assert test_client.get("/css/style.css").status_code == 200
        assert test_client.get("/api/health").json()["base_path"] == "/"
