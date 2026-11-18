"""SQLite storage for BarStreet. No ORM: a small schema plus idempotent seed."""

from __future__ import annotations

import json
import secrets
import sqlite3
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Any

from .catalog import ALBUMS, BARS, CARDS, ROLES, TASKS


def now_iso() -> str:
    """Local timestamp with second precision, used for all ledger rows."""
    return datetime.now().replace(microsecond=0).isoformat()


def today_str() -> str:
    return date.today().isoformat()


SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS passports (
    id TEXT PRIMARY KEY,
    recovery_hash TEXT NOT NULL UNIQUE,
    nickname TEXT NOT NULL,
    created_at TEXT NOT NULL,
    coins INTEGER NOT NULL DEFAULT 0,
    shards INTEGER NOT NULL DEFAULT 0,
    pack_credits INTEGER NOT NULL DEFAULT 0,
    reputation INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    pity_counter INTEGER NOT NULL DEFAULT 0,
    missing_pity_counter INTEGER NOT NULL DEFAULT 0,
    free_pack_date TEXT,
    coin_pack_date TEXT,
    coin_packs_today INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bars (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    tagline TEXT NOT NULL,
    role_id TEXT NOT NULL,
    signature TEXT NOT NULL,
    album_id TEXT NOT NULL,
    reward_name TEXT NOT NULL,
    color TEXT NOT NULL,
    accent TEXT NOT NULL,
    icon TEXT NOT NULL,
    menu_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    game TEXT NOT NULL,
    icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    bar_id TEXT NOT NULL,
    name TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    reward_name TEXT NOT NULL,
    icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    album_id TEXT NOT NULL,
    bar_id TEXT NOT NULL,
    name TEXT NOT NULL,
    rarity TEXT NOT NULL,
    lore TEXT NOT NULL,
    bonus_type TEXT NOT NULL,
    bonus_value INTEGER NOT NULL,
    icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target INTEGER NOT NULL,
    metric TEXT NOT NULL,
    reward_coins INTEGER NOT NULL DEFAULT 0,
    reward_shards INTEGER NOT NULL DEFAULT 0,
    reward_pack_credits INTEGER NOT NULL DEFAULT 0,
    icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_cards (
    passport_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    first_at TEXT NOT NULL,
    PRIMARY KEY (passport_id, card_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    passport_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (passport_id, role_id)
);

CREATE TABLE IF NOT EXISTS bar_progress (
    passport_id TEXT NOT NULL,
    bar_id TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    reputation INTEGER NOT NULL DEFAULT 0,
    shifts_count INTEGER NOT NULL DEFAULT 0,
    last_redeemed_at TEXT,
    PRIMARY KEY (passport_id, bar_id)
);

CREATE TABLE IF NOT EXISTS street_progress (
    passport_id TEXT PRIMARY KEY,
    last_redeemed_at TEXT
);

CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    passport_id TEXT NOT NULL,
    bar_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    score INTEGER,
    featured INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_token ON shifts(token_hash);
CREATE INDEX IF NOT EXISTS idx_shifts_user_day ON shifts(passport_id, completed_at);

CREATE TABLE IF NOT EXISTS packs (
    id TEXT PRIMARY KEY,
    passport_id TEXT NOT NULL,
    album_id TEXT NOT NULL,
    source TEXT NOT NULL,
    card_id TEXT NOT NULL,
    is_new INTEGER NOT NULL,
    shards INTEGER NOT NULL DEFAULT 0,
    opened_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_packs_user_day ON packs(passport_id, opened_at);

CREATE TABLE IF NOT EXISTS album_milestones (
    passport_id TEXT NOT NULL,
    album_id TEXT NOT NULL,
    threshold INTEGER NOT NULL,
    claimed_at TEXT NOT NULL,
    PRIMARY KEY (passport_id, album_id, threshold)
);

CREATE TABLE IF NOT EXISTS user_tasks (
    passport_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    task_date TEXT NOT NULL,
    claimed_at TEXT NOT NULL,
    PRIMARY KEY (passport_id, task_id, task_date)
);

CREATE TABLE IF NOT EXISTS vouchers (
    id TEXT PRIMARY KEY,
    passport_id TEXT NOT NULL,
    bar_id TEXT NOT NULL,
    album_id TEXT NOT NULL,
    reward_name TEXT NOT NULL,
    code TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'bar',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    redeemed_at TEXT,
    redeemed_by TEXT,
    redeemed_bar_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_user_bar ON vouchers(passport_id, bar_id, status);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


class StreetStore:
    """Thread-safe, lazily initialized SQLite store.

    FastAPI runs synchronous endpoints in a thread pool, so every operation opens
    its own connection. Schema creation and seeding are guarded by a lock and are
    idempotent.
    """

    def __init__(self, db_path: Path, *, staff_pin: str = "8888", secret: str = "") -> None:
        self.db_path = db_path
        self.staff_pin = staff_pin
        self._lock = threading.Lock()
        self._ready = False
        self._secret: str | None = secret or None

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path, timeout=15)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def ensure_ready(self) -> None:
        if self._ready:
            return
        with self._lock:
            if self._ready:
                return
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            with self.connect() as conn:
                conn.executescript(SCHEMA)
                conn.execute("PRAGMA journal_mode = WAL")
                self._seed(conn)
                if self._secret is None:
                    row = conn.execute("SELECT value FROM meta WHERE key = 'secret'").fetchone()
                    if row is None:
                        secret = secrets.token_hex(32)
                        conn.execute("INSERT INTO meta(key, value) VALUES('secret', ?)", (secret,))
                        self._secret = secret
                    else:
                        self._secret = str(row["value"])
            self._ready = True

    @property
    def secret(self) -> str:
        self.ensure_ready()
        assert self._secret is not None
        return self._secret

    def _seed(self, conn: sqlite3.Connection) -> None:
        for role in ROLES:
            conn.execute(
                "INSERT OR IGNORE INTO roles(id, name, description, game, icon) VALUES(?, ?, ?, ?, ?)",
                (role["id"], role["name"], role["description"], role["game"], role["icon"]),
            )
        for bar in BARS:
            conn.execute(
                """
                INSERT OR IGNORE INTO bars(
                    id, name, subtitle, tagline, role_id, signature, album_id,
                    reward_name, color, accent, icon, menu_json
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    bar["id"],
                    bar["name"],
                    bar["subtitle"],
                    bar["tagline"],
                    bar["role_id"],
                    bar["signature"],
                    bar["album_id"],
                    bar["reward_name"],
                    bar["color"],
                    bar["accent"],
                    bar["icon"],
                    json.dumps(bar["menu"], ensure_ascii=False),
                ),
            )
        for album in ALBUMS:
            conn.execute(
                "INSERT OR IGNORE INTO albums(id, bar_id, name, subtitle, reward_name, icon) VALUES(?, ?, ?, ?, ?, ?)",
                (
                    album["id"],
                    album["bar_id"],
                    album["name"],
                    album["subtitle"],
                    album["reward_name"],
                    album["icon"],
                ),
            )
        for card in CARDS:
            conn.execute(
                """
                INSERT OR IGNORE INTO cards(
                    id, album_id, bar_id, name, rarity, lore, bonus_type, bonus_value, icon
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    card["id"],
                    card["album_id"],
                    card["bar_id"],
                    card["name"],
                    card["rarity"],
                    card["lore"],
                    card["bonus_type"],
                    card["bonus_value"],
                    card["icon"],
                ),
            )
        for task in TASKS:
            conn.execute(
                """
                INSERT OR IGNORE INTO tasks(
                    id, title, description, target, metric,
                    reward_coins, reward_shards, reward_pack_credits, icon
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    task["id"],
                    task["title"],
                    task["description"],
                    task["target"],
                    task["metric"],
                    task["reward_coins"],
                    task["reward_shards"],
                    task["reward_pack_credits"],
                    task["icon"],
                ),
            )
        conn.execute(
            "INSERT OR REPLACE INTO meta(key, value) VALUES('seed_version', '1')",
        )

    def one(self, sql: str, params: tuple[Any, ...] = ()) -> sqlite3.Row | None:
        self.ensure_ready()
        with self.connect() as conn:
            return conn.execute(sql, params).fetchone()

    def all(self, sql: str, params: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
        self.ensure_ready()
        with self.connect() as conn:
            return list(conn.execute(sql, params).fetchall())
