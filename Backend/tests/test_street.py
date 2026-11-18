from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from octogamear.app import create_app
from octogamear.config import Config
from octogamear.street.catalog import CARDS_BY_ALBUM
from octogamear.street.store import now_iso

BASE = "/octogame/barstreet"
API = f"{BASE}/api"


def _make_web(root: Path, name: str, title: str) -> Path:
    web = root / name
    for subdir in ("css", "js", "vendor", "assets", "data"):
        (web / subdir).mkdir(parents=True)
    (web / "index.html").write_text(
        f'<!doctype html><html><head><base href="/old/"><title>{title}</title></head><body>{title}</body></html>',
        encoding="utf-8",
    )
    (web / "css" / "style.css").write_text("body{background:#000}", encoding="utf-8")
    (web / "js" / "api.js").write_text("console.log('api');", encoding="utf-8")
    (web / "js" / "games.js").write_text("console.log('games');", encoding="utf-8")
    (web / "js" / "app.js").write_text("console.log('street');", encoding="utf-8")
    return web


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    barar = _make_web(tmp_path, "barar", "BarAR")
    street = _make_web(tmp_path, "street", "BarStreet")
    config = Config(
        web_dir=barar,
        base_path="/octogame/barar",
        street_web_dir=street,
        street_base_path=BASE,
        street_db_path=tmp_path / "barstreet.sqlite3",
        street_min_shift_seconds=0,
        street_staff_pin="8888",
        street_secret="test-secret",
    )
    with TestClient(create_app(config)) as test_client:
        yield test_client


def _passport(client: TestClient, nickname: str = "测试员") -> tuple[str, dict[str, str], str]:
    response = client.post(f"{API}/passport", json={"nickname": nickname})
    assert response.status_code == 200
    body = response.json()
    return body["passport_id"], {"X-Passport": body["passport_id"]}, body["recovery_code"]


def _complete(client: TestClient, headers: dict[str, str], bar: str, role: str, score: int = 80) -> dict:
    started = client.post(f"{API}/shifts/start", headers=headers, json={"bar_id": bar, "role_id": role})
    assert started.status_code == 200, started.text
    token = started.json()["shift_token"]
    response = client.post(
        f"{API}/shifts/complete",
        headers=headers,
        json={"shift_token": token, "score": score},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_health_and_frontend(client: TestClient) -> None:
    health = client.get(f"{API}/health")
    assert health.status_code == 200
    assert health.json()["service"] == "barstreet"
    assert health.json()["db"] is True
    assert health.json()["web"] is True

    index = client.get(f"{BASE}/")
    assert index.status_code == 200
    assert "BarStreet" in index.text
    assert '<base href="/octogame/barstreet/">' in index.text
    assert client.get(f"{BASE}/css/style.css").status_code == 200
    assert client.get(f"{BASE}/js/api.js").status_code == 200
    assert client.get(f"{BASE}/js/games.js").status_code == 200
    assert client.get(f"{BASE}/js/app.js").status_code == 200


def test_passport_street_and_restore(client: TestClient) -> None:
    passport_id, headers, recovery_code = _passport(client)
    assert passport_id.startswith("psp_")
    assert len(recovery_code) == 9

    street = client.get(f"{API}/street", headers=headers)
    assert street.status_code == 200
    body = street.json()
    assert [bar["id"] for bar in body["bars"]] == ["loopin", "citrus", "hijack", "factory"]
    assert len(body["roles"]) == 4
    assert body["daily"]["shifts_left"] == 3
    assert body["daily"]["free_pack_available"] is True
    assert body["user"]["coins"] == 0

    restored = client.post(f"{API}/passport/restore", json={"recovery_code": recovery_code})
    assert restored.status_code == 200
    assert restored.json()["passport_id"] == passport_id

    missing = client.get(f"{API}/street")
    assert missing.status_code == 401


def test_shift_settlement_and_single_use(client: TestClient) -> None:
    _, headers, _ = _passport(client)
    started = client.post(
        f"{API}/shifts/start", headers=headers, json={"bar_id": "loopin", "role_id": "bartender"}
    )
    assert started.status_code == 200
    token = started.json()["shift_token"]

    completed = client.post(
        f"{API}/shifts/complete",
        headers=headers,
        json={"shift_token": token, "score": 88},
    )
    assert completed.status_code == 200
    result = completed.json()
    assert result["coins"] > 0
    assert result["reputation"] > 0
    assert result["xp"] > 0
    assert result["shifts_left"] == 2
    assert result["user"]["coins"] == result["coins"]

    again = client.post(
        f"{API}/shifts/complete",
        headers=headers,
        json={"shift_token": token, "score": 88},
    )
    assert again.status_code == 409


def test_shift_limits_validation_and_abandon(client: TestClient) -> None:
    _, headers, _ = _passport(client)
    assert client.post(
        f"{API}/shifts/start", headers=headers, json={"bar_id": "nope", "role_id": "bartender"}
    ).status_code == 404
    assert client.post(
        f"{API}/shifts/start", headers=headers, json={"bar_id": "loopin", "role_id": "nope"}
    ).status_code == 404

    started = client.post(
        f"{API}/shifts/start", headers=headers, json={"bar_id": "loopin", "role_id": "bartender"}
    )
    token = started.json()["shift_token"]
    assert client.post(
        f"{API}/shifts/complete", headers=headers, json={"shift_token": "bad-token-123", "score": 10}
    ).status_code == 401
    assert client.post(
        f"{API}/shifts/complete", headers=headers, json={"shift_token": token, "score": 101}
    ).status_code == 422

    abandoned = client.post(f"{API}/shifts/abandon", headers=headers, json={"shift_token": token})
    assert abandoned.status_code == 200
    assert abandoned.json()["ok"] is True

    for _ in range(3):
        _complete(client, headers, "loopin", "bartender")
    blocked = client.post(
        f"{API}/shifts/start", headers=headers, json={"bar_id": "loopin", "role_id": "bartender"}
    )
    assert blocked.status_code == 429


def test_pack_free_and_coin_limits(client: TestClient) -> None:
    _, headers, _ = _passport(client)
    first = client.post(f"{API}/packs/open", headers=headers, json={"source": "free", "album_id": "loopin"})
    assert first.status_code == 200
    assert first.json()["card"]["new"] is True
    second = client.post(f"{API}/packs/open", headers=headers, json={"source": "free", "album_id": "loopin"})
    assert second.status_code == 429

    _complete(client, headers, "loopin", "bartender", 90)
    _complete(client, headers, "citrus", "waiter", 90)
    packs = client.get(f"{API}/packs", headers=headers).json()
    assert packs["coin_packs_left"] == 2
    assert packs["coins"] >= packs["coin_pack_costs"][0]

    paid = client.post(f"{API}/packs/open", headers=headers, json={"source": "coins", "album_id": "citrus"})
    assert paid.status_code == 200
    assert paid.json()["user"]["coins"] < packs["coins"]
    assert paid.json()["album"]["id"] == "citrus"


def test_tasks_claim_and_repeat(client: TestClient) -> None:
    _, headers, _ = _passport(client)
    _complete(client, headers, "loopin", "bartender")
    _complete(client, headers, "citrus", "waiter")

    tasks = client.get(f"{API}/tasks", headers=headers).json()["tasks"]
    by_id = {task["id"]: task for task in tasks}
    assert by_id["shift_2"]["progress"] == 2
    assert by_id["bars_2"]["progress"] == 2

    claimed = client.post(f"{API}/tasks/shift_2/claim", headers=headers)
    assert claimed.status_code == 200
    assert claimed.json()["reward"]["coins"] == 200
    assert client.post(f"{API}/tasks/shift_2/claim", headers=headers).status_code == 409

    bars = client.post(f"{API}/tasks/bars_2/claim", headers=headers)
    assert bars.status_code == 200
    assert bars.json()["reward"]["pack_credits"] == 1


def test_bar_upgrade(client: TestClient) -> None:
    passport_id, headers, _ = _passport(client)
    store = client.app.state.street_store
    with store.connect() as conn:
        conn.execute("UPDATE passports SET coins = 1000 WHERE id = ?", (passport_id,))

    before = client.get(f"{API}/bars/loopin", headers=headers).json()["bar"]["level"]
    upgraded = client.post(f"{API}/bars/loopin/upgrade", headers=headers)
    assert upgraded.status_code == 200
    assert upgraded.json()["level"] == before + 1
    assert upgraded.json()["cost"] == 300 * before
    assert upgraded.json()["user"]["coins"] == 1000 - 300 * before

    with store.connect() as conn:
        conn.execute("UPDATE passports SET coins = 0 WHERE id = ?", (passport_id,))
    broke = client.post(f"{API}/bars/loopin/upgrade", headers=headers)
    assert broke.status_code == 400

    with store.connect() as conn:
        conn.execute("UPDATE passports SET coins = 10000 WHERE id = ?", (passport_id,))
        conn.execute(
            "UPDATE bar_progress SET level = 10 WHERE passport_id = ? AND bar_id = 'loopin'",
            (passport_id,),
        )
    maxed = client.post(f"{API}/bars/loopin/upgrade", headers=headers)
    assert maxed.status_code == 409


def test_album_exchange(client: TestClient) -> None:
    passport_id, headers, _ = _passport(client)
    store = client.app.state.street_store
    with store.connect() as conn:
        conn.execute("UPDATE passports SET shards = 40 WHERE id = ?", (passport_id,))

    albums = client.get(f"{API}/albums", headers=headers).json()["albums"]
    loopin = next(album for album in albums if album["id"] == "loopin")
    missing = next(card for card in loopin["cards"] if not card["owned"])
    response = client.post(
        f"{API}/albums/loopin/exchange",
        headers=headers,
        json={"card_id": missing["id"]},
    )
    assert response.status_code == 200
    assert response.json()["card"]["new"] is True
    assert response.json()["shards"] == 0

    again = client.post(
        f"{API}/albums/loopin/exchange",
        headers=headers,
        json={"card_id": missing["id"]},
    )
    assert again.status_code == 409
    broke = client.post(
        f"{API}/albums/loopin/exchange",
        headers=headers,
        json={"card_id": "loopin_01" if missing["id"] != "loopin_01" else "loopin_02"},
    )
    assert broke.status_code == 400


def test_voucher_creation_and_staff_redemption(client: TestClient) -> None:
    passport_id, headers, _ = _passport(client, "酒券测试")
    store = client.app.state.street_store
    with store.connect() as conn:
        for card in CARDS_BY_ALBUM["loopin"]:
            conn.execute(
                "INSERT OR IGNORE INTO user_cards(passport_id, card_id, count, first_at) VALUES(?, ?, 1, ?)",
                (passport_id, card["id"], now_iso()),
            )

    info = client.get(f"{API}/redeem", headers=headers)
    assert info.status_code == 200
    assert any(item["album_id"] == "loopin" for item in info.json()["eligible"])

    created = client.post(f"{API}/redeem", headers=headers, json={"album_id": "loopin"})
    assert created.status_code == 200
    voucher = created.json()
    assert voucher["scope"] == "bar"
    assert len(voucher["code"]) == 6

    wrong_pin = client.post(
        f"{API}/staff/redeem", json={"code": voucher["code"], "pin": "0000", "bar_id": "loopin"}
    )
    assert wrong_pin.status_code == 403
    wrong_bar = client.post(
        f"{API}/staff/redeem", json={"code": voucher["code"], "pin": "8888", "bar_id": "citrus"}
    )
    assert wrong_bar.status_code == 409
    redeemed = client.post(
        f"{API}/staff/redeem", json={"code": voucher["code"], "pin": "8888", "bar_id": "loopin"}
    )
    assert redeemed.status_code == 200
    assert redeemed.json()["nickname"] == "酒券测试"
    assert client.post(
        f"{API}/staff/redeem", json={"code": voucher["code"], "pin": "8888", "bar_id": "loopin"}
    ).status_code == 404

    summary = client.get(f"{API}/staff/summary?bar_id=loopin&pin=8888")
    assert summary.status_code == 200
    assert summary.json()["today_redeemed"] == 1
    assert summary.json()["active_vouchers"] == 0


def test_street_voucher_requires_all_albums(client: TestClient) -> None:
    passport_id, headers, _ = _passport(client)
    store = client.app.state.street_store
    with store.connect() as conn:
        for album_id in ("loopin", "citrus", "hijack", "factory"):
            for card in CARDS_BY_ALBUM[album_id]:
                conn.execute(
                    "INSERT OR IGNORE INTO user_cards(passport_id, card_id, count, first_at) VALUES(?, ?, 1, ?)",
                    (passport_id, card["id"], now_iso()),
                )
    no_street = client.get(f"{API}/redeem", headers=headers).json()
    assert not any(item["scope"] == "street" for item in no_street["eligible"])

    with store.connect() as conn:
        for card in CARDS_BY_ALBUM["street"]:
            conn.execute(
                "INSERT OR IGNORE INTO user_cards(passport_id, card_id, count, first_at) VALUES(?, ?, 1, ?)",
                (passport_id, card["id"], now_iso()),
            )
    info = client.get(f"{API}/redeem", headers=headers).json()
    assert any(item["scope"] == "street" for item in info["eligible"])
    created = client.post(f"{API}/redeem", headers=headers, json={"album_id": "street"})
    assert created.status_code == 200
    assert created.json()["scope"] == "street"
    # A street pass can be redeemed at any partner bar.
    redeemed = client.post(
        f"{API}/staff/redeem",
        json={"code": created.json()["code"], "pin": "8888", "bar_id": "factory"},
    )
    assert redeemed.status_code == 200
