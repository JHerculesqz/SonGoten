"""Server-authoritative game logic for BarStreet.

The client runs the four mini-games; the server validates the shift token, score
and elapsed time, then owns the economy: coins, reputation, card drops, packs,
album milestones and vouchers. Mini-game scores are not cryptographically proven
in this MVP, but tokens expire, shifts are single-use and rewards are capped.
"""

from __future__ import annotations

import hashlib
import json
import random
import secrets
import sqlite3
import time
from datetime import datetime, timedelta
from typing import Any

from .catalog import (
    ALBUM_BY_ID,
    ALBUM_MILESTONES,
    ALBUMS,
    BAR_BY_ID,
    BAR_VOUCHER_COOLDOWN_DAYS,
    BARS,
    CARDS_BY_ALBUM,
    COIN_PACK_COSTS,
    COIN_PACKS_PER_DAY,
    EXCHANGE_SHARD_COST,
    FREE_PACKS_PER_DAY,
    RARITY_SHARDS,
    RARITY_WEIGHTS,
    ROLE_BY_ID,
    ROLE_IDS,
    SHIFTS_PER_DAY,
    STREET_VOUCHER_COOLDOWN_DAYS,
    TASK_BY_ID,
    TASKS,
)
from .security import (
    create_shift_token,
    hash_secret,
    new_id,
    new_recovery_code,
    normalize_recovery_code,
    staff_pin_ok,
    verify_shift_token,
)
from .store import StreetStore, now_iso, today_str


class GameError(Exception):
    """A user-facing game error with an HTTP status code."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _level_from_xp(xp: int) -> int:
    return max(1, min(10, 1 + xp // 150))


def _bar_level_from_rep(reputation: int) -> int:
    return max(1, min(10, 1 + reputation // 100))


def _passport_level_from_rep(reputation: int) -> int:
    return max(1, min(20, 1 + reputation // 200))


def _cutoff(days: int) -> str:
    return (datetime.now() - timedelta(days=days)).replace(microsecond=0).isoformat()


def _parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value)


class StreetEngine:
    def __init__(self, store: StreetStore, *, min_shift_seconds: int = 20) -> None:
        self.store = store
        self.min_shift_seconds = max(0, min_shift_seconds)

    # ------------------------------------------------------------------
    # Passport
    # ------------------------------------------------------------------
    def create_passport(self, nickname: str | None = None) -> dict[str, Any]:
        self.store.ensure_ready()
        nickname = (nickname or "").strip()[:24] or "夜班新人"
        passport_id = new_id("psp")
        recovery_code = new_recovery_code()
        now = now_iso()
        with self.store.connect() as conn:
            conn.execute(
                "INSERT INTO passports(id, recovery_hash, nickname, created_at) VALUES(?, ?, ?, ?)",
                (passport_id, hash_secret(normalize_recovery_code(recovery_code)), nickname, now),
            )
            for role in ROLE_IDS:
                conn.execute(
                    "INSERT INTO user_roles(passport_id, role_id, level, xp) VALUES(?, ?, 1, 0)",
                    (passport_id, role),
                )
            for bar in BARS:
                conn.execute(
                    "INSERT INTO bar_progress("
                    "passport_id, bar_id, level, reputation, shifts_count"
                    ") VALUES(?, ?, 1, 0, 0)",
                    (passport_id, bar["id"]),
                )
            conn.execute("INSERT INTO street_progress(passport_id) VALUES(?)", (passport_id,))
            self._audit(conn, passport_id, "passport.create", passport_id, {})
        return {
            "passport_id": passport_id,
            "recovery_code": recovery_code,
            "nickname": nickname,
            "created_at": now,
        }

    def restore_passport(self, recovery_code: str) -> dict[str, Any]:
        self.store.ensure_ready()
        normalized = normalize_recovery_code(recovery_code)
        if not normalized:
            raise GameError("恢复码不能为空", 400)
        with self.store.connect() as conn:
            row = conn.execute(
                "SELECT id, nickname FROM passports WHERE recovery_hash = ?",
                (hash_secret(normalized),),
            ).fetchone()
        if row is None:
            raise GameError("恢复码无效", 404)
        return {"passport_id": row["id"], "nickname": row["nickname"]}

    def passport_exists(self, passport_id: str) -> bool:
        self.store.ensure_ready()
        with self.store.connect() as conn:
            return conn.execute("SELECT 1 FROM passports WHERE id = ?", (passport_id,)).fetchone() is not None

    def _passport(self, conn: sqlite3.Connection, passport_id: str) -> sqlite3.Row:
        row = conn.execute("SELECT * FROM passports WHERE id = ?", (passport_id,)).fetchone()
        if row is None:
            raise GameError("护照不存在，请重新创建", 401)
        return row

    def _user_dict(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "passport_id": row["id"],
            "nickname": row["nickname"],
            "coins": row["coins"],
            "shards": row["shards"],
            "pack_credits": row["pack_credits"],
            "reputation": row["reputation"],
            "level": row["level"],
            "created_at": row["created_at"],
        }

    # ------------------------------------------------------------------
    # Street and bars
    # ------------------------------------------------------------------
    def street(self, passport_id: str) -> dict[str, Any]:
        self.store.ensure_ready()
        day = today_str()
        with self.store.connect() as conn:
            passport = self._passport(conn, passport_id)
            shifts_today = self._shifts_today(conn, passport_id)
            packs_today = self._packs_today(conn, passport_id)
            bars_today = self._bars_today(conn, passport_id)
            bars: list[dict[str, Any]] = []
            for bar in BARS:
                progress = self._bar_progress(conn, passport_id, bar["id"])
                owned, total, complete = self._album_progress(conn, passport_id, bar["album_id"])
                featured = self._featured_role(bar["id"], day)
                bars.append(
                    {
                        "id": bar["id"],
                        "name": bar["name"],
                        "subtitle": bar["subtitle"],
                        "tagline": bar["tagline"],
                        "role_id": bar["role_id"],
                        "role_name": ROLE_BY_ID[bar["role_id"]]["name"],
                        "signature": bar["signature"],
                        "album_id": bar["album_id"],
                        "reward_name": bar["reward_name"],
                        "color": bar["color"],
                        "accent": bar["accent"],
                        "icon": bar["icon"],
                        "menu": bar["menu"],
                        "level": progress["level"],
                        "reputation": progress["reputation"],
                        "shifts_count": progress["shifts_count"],
                        "album_owned": owned,
                        "album_total": total,
                        "album_complete": complete,
                        "featured_role_id": featured,
                        "featured_role_name": ROLE_BY_ID[featured]["name"],
                    }
                )
            coin_packs_today = (
                passport["coin_packs_today"] if passport["coin_pack_date"] == day else 0
            )
            roles: list[dict[str, Any]] = []
            for role_id in ROLE_IDS:
                user_role = self._user_role(conn, passport_id, role_id)
                role_info = ROLE_BY_ID[role_id]
                roles.append(
                    {
                        "id": role_id,
                        "name": role_info["name"],
                        "icon": role_info["icon"],
                        "description": role_info["description"],
                        "level": user_role["level"],
                        "xp": user_role["xp"],
                        "next_xp": user_role["level"] * 150,
                    }
                )
            return {
                "date": day,
                "user": self._user_dict(passport),
                "roles": roles,
                "daily": {
                    "shifts_done": shifts_today,
                    "shifts_limit": SHIFTS_PER_DAY,
                    "shifts_left": max(0, SHIFTS_PER_DAY - shifts_today),
                    "packs_opened": packs_today,
                    "bars_visited": bars_today,
                    "free_pack_available": passport["free_pack_date"] != day,
                    "coin_packs_left": max(0, COIN_PACKS_PER_DAY - coin_packs_today),
                    "coin_pack_costs": list(COIN_PACK_COSTS),
                },
                "bars": bars,
            }

    def bar_detail(self, passport_id: str, bar_id: str) -> dict[str, Any]:
        self.store.ensure_ready()
        day = today_str()
        with self.store.connect() as conn:
            bar = self._bar(conn, bar_id)
            passport = self._passport(conn, passport_id)
            progress = self._bar_progress(conn, passport_id, bar_id)
            featured = self._featured_role(bar_id, day)
            roles: list[dict[str, Any]] = []
            for role in ROLE_IDS:
                role_row = conn.execute(
                    "SELECT name, description, game, icon FROM roles WHERE id = ?", (role,)
                ).fetchone()
                user_role = self._user_role(conn, passport_id, role)
                roles.append(
                    {
                        "id": role,
                        "name": role_row["name"],
                        "description": role_row["description"],
                        "game": role_row["game"],
                        "icon": role_row["icon"],
                        "level": user_role["level"],
                        "xp": user_role["xp"],
                        "next_xp": user_role["level"] * 150,
                        "primary": role == bar["role_id"],
                        "featured": role == featured,
                    }
                )
            owned, total, complete = self._album_progress(conn, passport_id, bar["album_id"])
            return {
                "bar": {
                    "id": bar["id"],
                    "name": bar["name"],
                    "subtitle": bar["subtitle"],
                    "tagline": bar["tagline"],
                    "role_id": bar["role_id"],
                    "signature": bar["signature"],
                    "album_id": bar["album_id"],
                    "reward_name": bar["reward_name"],
                    "color": bar["color"],
                    "accent": bar["accent"],
                    "icon": bar["icon"],
                    "menu": json.loads(bar["menu_json"]),
                    "level": progress["level"],
                    "reputation": progress["reputation"],
                    "shifts_count": progress["shifts_count"],
                },
                "featured_role_id": featured,
                "featured_role_name": ROLE_BY_ID[featured]["name"],
                "roles": roles,
                "album": {"id": bar["album_id"], "owned": owned, "total": total, "complete": complete},
                "user": self._user_dict(passport),
            }

    def upgrade_bar(self, passport_id: str, bar_id: str) -> dict[str, Any]:
        """Spend earned coins to raise a bar's level (equipment/decor/menu)."""
        self.store.ensure_ready()
        with self.store.connect() as conn:
            passport = self._passport(conn, passport_id)
            bar = self._bar(conn, bar_id)
            progress = self._bar_progress(conn, passport_id, bar_id)
            if progress["level"] >= 10:
                raise GameError("这家店已经升到满级了", 409)
            cost = 300 * progress["level"]
            if passport["coins"] < cost:
                raise GameError(f"营业币不足，还需要 {cost - passport['coins']} 个", 400)
            conn.execute(
                "UPDATE passports SET coins = coins - ? WHERE id = ?",
                (cost, passport_id),
            )
            conn.execute(
                "UPDATE bar_progress SET level = level + 1 WHERE passport_id = ? AND bar_id = ?",
                (passport_id, bar_id),
            )
            updated = self._passport(conn, passport_id)
            new_progress = self._bar_progress(conn, passport_id, bar_id)
            self._audit(
                conn,
                passport_id,
                "bar.upgrade",
                bar_id,
                {"cost": cost, "level": new_progress["level"]},
            )
            next_cost = 300 * new_progress["level"] if new_progress["level"] < 10 else None
            return {
                "bar_id": bar_id,
                "bar_name": bar["name"],
                "cost": cost,
                "level": new_progress["level"],
                "next_cost": next_cost,
                "user": self._user_dict(updated),
            }

    def meta(self) -> dict[str, Any]:
        self.store.ensure_ready()
        return {
            "bars": [dict(bar) for bar in BARS],
            "roles": [
                {
                    "id": role,
                    "name": ROLE_BY_ID[role]["name"],
                    "description": ROLE_BY_ID[role]["description"],
                    "game": ROLE_BY_ID[role]["game"],
                    "icon": ROLE_BY_ID[role]["icon"],
                }
                for role in ROLE_IDS
            ],
            "albums": ALBUMS,
            "shifts_per_day": SHIFTS_PER_DAY,
            "free_packs_per_day": FREE_PACKS_PER_DAY,
            "coin_packs_per_day": COIN_PACKS_PER_DAY,
            "exchange_shard_cost": EXCHANGE_SHARD_COST,
        }

    # ------------------------------------------------------------------
    # Shifts
    # ------------------------------------------------------------------
    def start_shift(self, passport_id: str, bar_id: str, role_id: str) -> dict[str, Any]:
        self.store.ensure_ready()
        day = today_str()
        with self.store.connect() as conn:
            self._passport(conn, passport_id)
            self._bar(conn, bar_id)
            if role_id not in ROLE_BY_ID:
                raise GameError("岗位不存在", 404)
            shifts_today = self._shifts_today(conn, passport_id)
            if shifts_today >= SHIFTS_PER_DAY:
                raise GameError("今天的班次已经用完了，明天再来", 429)
            open_shift = conn.execute(
                "SELECT id FROM shifts WHERE passport_id = ? AND status = 'open' AND expires_at > ?",
                (passport_id, now_iso()),
            ).fetchone()
            if open_shift is not None:
                raise GameError("已有进行中的班次，请先完成它", 409)
            featured = role_id == self._featured_role(bar_id, day)
            now_ts = int(time.time())
            expires_ts = now_ts + 600
            payload = {
                "p": passport_id,
                "b": bar_id,
                "r": role_id,
                "f": bool(featured),
                "iat": now_ts,
                "exp": expires_ts,
                "n": secrets.token_hex(8),
            }
            token = create_shift_token(self.store.secret, payload)
            shift_id = new_id("shift")
            conn.execute(
                """
                INSERT INTO shifts(
                    id, passport_id, bar_id, role_id, token_hash, status,
                    featured, started_at, expires_at
                ) VALUES(?, ?, ?, ?, ?, 'open', ?, ?, ?)
                """,
                (
                    shift_id,
                    passport_id,
                    bar_id,
                    role_id,
                    hash_secret(token),
                    1 if featured else 0,
                    now_iso(),
                    datetime.fromtimestamp(expires_ts).replace(microsecond=0).isoformat(),
                ),
            )
        return {
            "shift_id": shift_id,
            "shift_token": token,
            "bar_id": bar_id,
            "role_id": role_id,
            "featured": featured,
            "expires_at": payload["exp"],
            "min_seconds": self.min_shift_seconds,
        }

    def abandon_shift(self, passport_id: str, token: str) -> dict[str, Any]:
        self.store.ensure_ready()
        payload = verify_shift_token(self.store.secret, token)
        if payload is None or payload.get("p") != passport_id:
            raise GameError("班次凭证无效或已过期", 401)
        with self.store.connect() as conn:
            shift = conn.execute(
                "SELECT * FROM shifts WHERE token_hash = ?",
                (hash_secret(token),),
            ).fetchone()
            if shift is None or shift["passport_id"] != passport_id:
                raise GameError("班次不存在", 404)
            if shift["status"] == "open":
                conn.execute(
                    "UPDATE shifts SET status = 'abandoned', completed_at = ? WHERE id = ?",
                    (now_iso(), shift["id"]),
                )
            elif shift["status"] == "completed":
                raise GameError("这个班次已经结算过了", 409)
        return {"ok": True, "message": "已放弃本班，下次再努力"}

    def complete_shift(self, passport_id: str, token: str, score: int) -> dict[str, Any]:
        self.store.ensure_ready()
        payload = verify_shift_token(self.store.secret, token)
        if payload is None or payload.get("p") != passport_id:
            raise GameError("班次凭证无效或已过期", 401)
        token_hash = hash_secret(token)
        now = now_iso()
        with self.store.connect() as conn:
            passport = self._passport(conn, passport_id)
            shift = conn.execute(
                "SELECT * FROM shifts WHERE token_hash = ?",
                (token_hash,),
            ).fetchone()
            if shift is None or shift["passport_id"] != passport_id:
                raise GameError("班次不存在", 404)
            if shift["status"] != "open":
                raise GameError("这个班次已经结算过了", 409)
            if shift["expires_at"] < now:
                conn.execute("UPDATE shifts SET status = 'expired' WHERE id = ?", (shift["id"],))
                raise GameError("班次已过期，请重新上工", 410)
            if score < 0 or score > 100:
                raise GameError("评分必须在 0–100 之间", 400)
            elapsed = (datetime.now() - _parse_iso(shift["started_at"])).total_seconds()
            if elapsed < self.min_shift_seconds:
                raise GameError("班次时间太短，请认真完成这一班", 400)
            bar = self._bar(conn, shift["bar_id"])
            featured = bool(shift["featured"])
            role = self._user_role(conn, passport_id, shift["role_id"])
            progress = self._bar_progress(conn, passport_id, shift["bar_id"])
            bonus = self._card_bonus(conn, passport_id, shift["bar_id"])

            role_factor = 1 + 0.08 * (role["level"] - 1)
            bar_factor = 1 + 0.05 * (progress["level"] - 1)
            match_factor = 1.10 if shift["role_id"] == bar["role_id"] else 1.0
            featured_factor = 1.5 if featured else 1.0
            score_factor = 0.5 + score / 100
            pay_factor = 1 + bonus.get("shift_pay", 0) / 100
            coins = max(
                10,
                round(
                    100
                    * role_factor
                    * bar_factor
                    * match_factor
                    * featured_factor
                    * score_factor
                    * pay_factor
                ),
            )
            reputation = 8 + score // 10 + (5 if featured else 0) + bonus.get("reputation", 0)
            xp_gain = round((20 + score // 5) * (1 + bonus.get("xp", 0) / 100))

            new_role_xp = role["xp"] + xp_gain
            new_role_level = _level_from_xp(new_role_xp)
            new_bar_rep = progress["reputation"] + reputation
            # Reputation raises the bar level, but coin-funded upgrades are
            # permanent and must not be lowered by a later shift.
            new_bar_level = max(progress["level"], _bar_level_from_rep(new_bar_rep))
            new_passport_rep = passport["reputation"] + reputation
            new_passport_level = _passport_level_from_rep(new_passport_rep)

            conn.execute(
                "UPDATE shifts SET status = 'completed', score = ?, completed_at = ? WHERE id = ?",
                (score, now, shift["id"]),
            )
            conn.execute(
                "UPDATE user_roles SET xp = ?, level = ? WHERE passport_id = ? AND role_id = ?",
                (new_role_xp, new_role_level, passport_id, shift["role_id"]),
            )
            conn.execute(
                """
                UPDATE bar_progress
                SET reputation = ?, level = ?, shifts_count = shifts_count + 1
                WHERE passport_id = ? AND bar_id = ?
                """,
                (new_bar_rep, new_bar_level, passport_id, shift["bar_id"]),
            )

            completed_count = conn.execute(
                "SELECT COUNT(*) AS n FROM shifts WHERE passport_id = ? AND status = 'completed'",
                (passport_id,),
            ).fetchone()["n"]
            pack_credit = 1 if completed_count % 3 == 0 else 0
            conn.execute(
                """
                UPDATE passports
                SET coins = coins + ?, reputation = ?, level = ?, pack_credits = pack_credits + ?
                WHERE id = ?
                """,
                (coins, new_passport_rep, new_passport_level, pack_credit, passport_id),
            )

            card_result: dict[str, Any] | None = None
            milestones: list[dict[str, Any]] = []
            drop_chance = min(
                0.85,
                0.15 + score / 500 + (0.05 if featured else 0) + bonus.get("drop", 0) / 100,
            )
            if random.random() < drop_chance:
                card = self._weighted_card(conn, bar["album_id"])
                if card is not None:
                    granted = self._grant_card(conn, passport_id, card)
                    card_result = granted
                    milestones = self._check_milestones(conn, passport_id, bar["album_id"])

            updated = self._passport(conn, passport_id)
            return {
                "score": score,
                "perfect": score >= 90,
                "featured": featured,
                "coins": coins,
                "reputation": reputation,
                "xp": xp_gain,
                "role_level": new_role_level,
                "bar_level": new_bar_level,
                "passport_level": new_passport_level,
                "pack_credit": pack_credit,
                "card": card_result,
                "milestones": milestones,
                "user": self._user_dict(updated),
                "shifts_left": max(0, SHIFTS_PER_DAY - self._shifts_today(conn, passport_id)),
            }

    # ------------------------------------------------------------------
    # Albums, packs and cards
    # ------------------------------------------------------------------
    def albums(self, passport_id: str) -> dict[str, Any]:
        self.store.ensure_ready()
        with self.store.connect() as conn:
            passport = self._passport(conn, passport_id)
            albums: list[dict[str, Any]] = []
            for album in ALBUMS:
                cards = []
                owned_count = 0
                for card in CARDS_BY_ALBUM[album["id"]]:
                    row = conn.execute(
                        "SELECT count FROM user_cards WHERE passport_id = ? AND card_id = ?",
                        (passport_id, card["id"]),
                    ).fetchone()
                    owned = row is not None
                    owned_count += 1 if owned else 0
                    cards.append(
                        {
                            "id": card["id"],
                            "name": card["name"],
                            "rarity": card["rarity"],
                            "lore": card["lore"],
                            "bonus_type": card["bonus_type"],
                            "bonus_value": card["bonus_value"],
                            "icon": card["icon"],
                            "owned": owned,
                            "count": int(row["count"]) if row else 0,
                        }
                    )
                claimed = {
                    row["threshold"]
                    for row in conn.execute(
                        "SELECT threshold FROM album_milestones WHERE passport_id = ? AND album_id = ?",
                        (passport_id, album["id"]),
                    ).fetchall()
                }
                albums.append(
                    {
                        "id": album["id"],
                        "bar_id": album["bar_id"],
                        "name": album["name"],
                        "subtitle": album["subtitle"],
                        "reward_name": album["reward_name"],
                        "icon": album["icon"],
                        "cards": cards,
                        "owned": owned_count,
                        "total": len(cards),
                        "complete": owned_count == len(cards),
                        "milestones": [
                            {
                                **milestone,
                                "claimed": milestone["threshold"] in claimed,
                            }
                            for milestone in ALBUM_MILESTONES
                        ],
                    }
                )
            return {"albums": albums, "shards": passport["shards"]}

    def exchange(self, passport_id: str, album_id: str, card_id: str) -> dict[str, Any]:
        self.store.ensure_ready()
        with self.store.connect() as conn:
            passport = self._passport(conn, passport_id)
            album = self._album(conn, album_id)
            card = conn.execute("SELECT * FROM cards WHERE id = ? AND album_id = ?", (card_id, album["id"])).fetchone()
            if card is None:
                raise GameError("这张卡不属于该卡册", 404)
            owned = conn.execute(
                "SELECT 1 FROM user_cards WHERE passport_id = ? AND card_id = ?",
                (passport_id, card_id),
            ).fetchone()
            if owned is not None:
                raise GameError("你已经拥有这张卡了", 409)
            if passport["shards"] < EXCHANGE_SHARD_COST:
                raise GameError(f"旧时光碎片不足，还需要 {EXCHANGE_SHARD_COST - passport['shards']} 个", 400)
            conn.execute(
                "UPDATE passports SET shards = shards - ? WHERE id = ?",
                (EXCHANGE_SHARD_COST, passport_id),
            )
            granted = self._grant_card(conn, passport_id, card)
            milestones = self._check_milestones(conn, passport_id, album_id)
            owned_count = self._owned_count(conn, passport_id, album_id)
            updated = self._passport(conn, passport_id)
            return {
                "card": granted,
                "shards": updated["shards"],
                "album": {
                    "id": album_id,
                    "owned": owned_count,
                    "total": len(CARDS_BY_ALBUM[album_id]),
                    "complete": owned_count == len(CARDS_BY_ALBUM[album_id]),
                },
                "milestones": milestones,
            }

    def packs_info(self, passport_id: str) -> dict[str, Any]:
        self.store.ensure_ready()
        day = today_str()
        with self.store.connect() as conn:
            passport = self._passport(conn, passport_id)
            coin_packs_today = passport["coin_packs_today"] if passport["coin_pack_date"] == day else 0
            return {
                "free_available": passport["free_pack_date"] != day,
                "coin_packs_left": max(0, COIN_PACKS_PER_DAY - coin_packs_today),
                "coin_pack_costs": list(COIN_PACK_COSTS),
                "pack_credits": passport["pack_credits"],
                "coins": passport["coins"],
                "albums": [
                    {"id": album["id"], "name": album["name"], "bar_id": album["bar_id"], "icon": album["icon"]}
                    for album in ALBUMS
                ],
            }

    def open_pack(self, passport_id: str, source: str, album_id: str) -> dict[str, Any]:
        self.store.ensure_ready()
        day = today_str()
        if source not in ("free", "coins", "shift"):
            raise GameError("未知的卡包来源", 400)
        with self.store.connect() as conn:
            passport = self._passport(conn, passport_id)
            self._album(conn, album_id)
            coin_packs_today = passport["coin_packs_today"] if passport["coin_pack_date"] == day else 0
            coins = passport["coins"]
            pack_credits = passport["pack_credits"]
            free_pack_date = passport["free_pack_date"]
            if source == "free":
                if free_pack_date == day:
                    raise GameError("今天的免费卡包已经领过了", 429)
                free_pack_date = day
            elif source == "coins":
                if coin_packs_today >= COIN_PACKS_PER_DAY:
                    raise GameError("今天用营业币购买的卡包已经买完了", 429)
                cost = COIN_PACK_COSTS[coin_packs_today]
                if coins < cost:
                    raise GameError(f"营业币不足，还需要 {cost - coins} 个", 400)
                coins -= cost
                coin_packs_today += 1
            else:
                if pack_credits < 1:
                    raise GameError("没有可用的班次卡包，先去上一班吧", 400)
                pack_credits -= 1

            owned_ids = self._owned_card_ids(conn, passport_id, album_id)
            missing = [card for card in CARDS_BY_ALBUM[album_id] if card["id"] not in owned_ids]
            pity = passport["pity_counter"] + 1
            missing_pity = passport["missing_pity_counter"] + 1
            forced_missing = False
            forced_rare = False

            if missing_pity >= 20 and missing:
                card = random.choice(missing)
                missing_pity = 0
                forced_missing = True
            elif pity >= 10:
                rarity = random.choices(("SR", "SSR"), weights=(80, 20), k=1)[0]
                pool = [c for c in CARDS_BY_ALBUM[album_id] if c["rarity"] == rarity]
                card = random.choice(pool) if pool else self._weighted_card(conn, album_id)
                pity = 0
                forced_rare = True
            else:
                card = self._weighted_card(conn, album_id)

            if card is None:
                raise GameError("卡池为空，请联系店员", 500)

            granted = self._grant_card(conn, passport_id, card)
            milestones = self._check_milestones(conn, passport_id, album_id)
            if granted["new"]:
                missing_pity = 0
            conn.execute(
                """
                UPDATE passports
                SET coins = ?, pack_credits = ?, free_pack_date = ?, coin_pack_date = ?,
                    coin_packs_today = ?, pity_counter = ?, missing_pity_counter = ?
                WHERE id = ?
                """,
                (
                    coins,
                    pack_credits,
                    free_pack_date,
                    day,
                    coin_packs_today,
                    pity,
                    missing_pity,
                    passport_id,
                ),
            )
            conn.execute(
                """
                INSERT INTO packs(id, passport_id, album_id, source, card_id, is_new, shards, opened_at)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    new_id("pack"),
                    passport_id,
                    album_id,
                    source,
                    card["id"],
                    1 if granted["new"] else 0,
                    granted["shards"],
                    now_iso(),
                ),
            )
            updated = self._passport(conn, passport_id)
            owned_count = self._owned_count(conn, passport_id, album_id)
            total = len(CARDS_BY_ALBUM[album_id])
            return {
                "card": granted,
                "album": {
                    "id": album_id,
                    "owned": owned_count,
                    "total": total,
                    "complete": owned_count == total,
                },
                "pity": {
                    "counter": pity,
                    "missing_counter": missing_pity,
                    "forced_rare": forced_rare,
                    "forced_missing": forced_missing,
                },
                "milestones": milestones,
                "user": self._user_dict(updated),
                "coins": updated["coins"],
                "pack_credits": updated["pack_credits"],
            }

    # ------------------------------------------------------------------
    # Daily tasks
    # ------------------------------------------------------------------
    def tasks(self, passport_id: str) -> dict[str, Any]:
        self.store.ensure_ready()
        day = today_str()
        with self.store.connect() as conn:
            self._passport(conn, passport_id)
            result = []
            for task in TASKS:
                progress = self._task_progress(conn, passport_id, task["metric"], day)
                claimed = conn.execute(
                    "SELECT 1 FROM user_tasks WHERE passport_id = ? AND task_id = ? AND task_date = ?",
                    (passport_id, task["id"], day),
                ).fetchone()
                result.append(
                    {
                        "id": task["id"],
                        "title": task["title"],
                        "description": task["description"],
                        "icon": task["icon"],
                        "target": task["target"],
                        "progress": min(progress, task["target"]),
                        "claimed": claimed is not None,
                        "reward": {
                            "coins": task["reward_coins"],
                            "shards": task["reward_shards"],
                            "pack_credits": task["reward_pack_credits"],
                        },
                    }
                )
            return {"date": day, "tasks": result}

    def claim_task(self, passport_id: str, task_id: str) -> dict[str, Any]:
        self.store.ensure_ready()
        day = today_str()
        task = TASK_BY_ID.get(task_id)
        if task is None:
            raise GameError("任务不存在", 404)
        with self.store.connect() as conn:
            self._passport(conn, passport_id)
            progress = self._task_progress(conn, passport_id, task["metric"], day)
            if progress < task["target"]:
                raise GameError("任务还没有完成", 400)
            existing = conn.execute(
                "SELECT 1 FROM user_tasks WHERE passport_id = ? AND task_id = ? AND task_date = ?",
                (passport_id, task_id, day),
            ).fetchone()
            if existing is not None:
                raise GameError("今天已经领过这个任务的奖励了", 409)
            conn.execute(
                "INSERT INTO user_tasks(passport_id, task_id, task_date, claimed_at) VALUES(?, ?, ?, ?)",
                (passport_id, task_id, day, now_iso()),
            )
            conn.execute(
                "UPDATE passports SET "
                "coins = coins + ?, shards = shards + ?, pack_credits = pack_credits + ? "
                "WHERE id = ?",
                (task["reward_coins"], task["reward_shards"], task["reward_pack_credits"], passport_id),
            )
            updated = self._passport(conn, passport_id)
            self._audit(conn, passport_id, "task.claim", task_id, {"date": day})
            return {
                "task_id": task_id,
                "reward": {
                    "coins": task["reward_coins"],
                    "shards": task["reward_shards"],
                    "pack_credits": task["reward_pack_credits"],
                },
                "user": self._user_dict(updated),
            }

    # ------------------------------------------------------------------
    # Vouchers and staff
    # ------------------------------------------------------------------
    def redeem_info(self, passport_id: str) -> dict[str, Any]:
        self.store.ensure_ready()
        now = now_iso()
        with self.store.connect() as conn:
            passport = self._passport(conn, passport_id)
            conn.execute(
                "UPDATE vouchers SET status = 'expired' WHERE status = 'active' AND expires_at < ?",
                (now,),
            )
            eligible: list[dict[str, Any]] = []
            for album in ALBUMS:
                owned, total, complete = self._album_progress(conn, passport_id, album["id"])
                active = conn.execute(
                    """
                    SELECT * FROM vouchers
                    WHERE passport_id = ? AND album_id = ? AND status = 'active'
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (passport_id, album["id"]),
                ).fetchone()
                if active is not None:
                    continue
                if album["id"] == "street":
                    bars_complete = all(
                        self._album_progress(conn, passport_id, bar["album_id"])[2] for bar in BARS
                    )
                    if not (bars_complete and complete):
                        continue
                    street = conn.execute(
                        "SELECT last_redeemed_at FROM street_progress WHERE passport_id = ?",
                        (passport_id,),
                    ).fetchone()
                    last = street["last_redeemed_at"] if street else None
                    if last and last >= _cutoff(STREET_VOUCHER_COOLDOWN_DAYS):
                        continue
                    eligible.append(
                        {
                            "album_id": album["id"],
                            "bar_id": "street",
                            "reward_name": album["reward_name"],
                            "scope": "street",
                            "reason": "四店卡册 + 街区卡册已集齐",
                        }
                    )
                    continue
                if not complete:
                    continue
                progress = self._bar_progress(conn, passport_id, album["bar_id"])
                last = progress["last_redeemed_at"]
                if last and last >= _cutoff(BAR_VOUCHER_COOLDOWN_DAYS):
                    continue
                eligible.append(
                    {
                        "album_id": album["id"],
                        "bar_id": album["bar_id"],
                        "reward_name": album["reward_name"],
                        "scope": "bar",
                        "reason": f"{owned}/{total} 张已集齐",
                    }
                )
            vouchers = conn.execute(
                """
                SELECT * FROM vouchers WHERE passport_id = ?
                ORDER BY created_at DESC LIMIT 20
                """,
                (passport_id,),
            ).fetchall()
            return {
                "eligible": eligible,
                "vouchers": [
                    {
                        "id": row["id"],
                        "bar_id": row["bar_id"],
                        "album_id": row["album_id"],
                        "reward_name": row["reward_name"],
                        "code": row["code"] if row["status"] == "active" else None,
                        "scope": row["scope"],
                        "status": row["status"],
                        "created_at": row["created_at"],
                        "expires_at": row["expires_at"],
                        "redeemed_at": row["redeemed_at"],
                    }
                    for row in vouchers
                ],
                "shards": passport["shards"],
            }

    def create_voucher(self, passport_id: str, album_id: str) -> dict[str, Any]:
        self.store.ensure_ready()
        album = ALBUM_BY_ID.get(album_id)
        if album is None:
            raise GameError("卡册不存在", 404)
        now = now_iso()
        with self.store.connect() as conn:
            self._passport(conn, passport_id)
            owned, total, complete = self._album_progress(conn, passport_id, album_id)
            if not complete:
                raise GameError(f"还差 {total - owned} 张卡才能兑换", 400)
            active = conn.execute(
                """
                SELECT * FROM vouchers
                WHERE passport_id = ? AND album_id = ? AND status = 'active' AND expires_at > ?
                ORDER BY created_at DESC LIMIT 1
                """,
                (passport_id, album_id, now),
            ).fetchone()
            if active is not None:
                return self._voucher_dict(active)
            scope = "street" if album_id == "street" else "bar"
            if scope == "street":
                bars_complete = all(
                    self._album_progress(conn, passport_id, bar["album_id"])[2] for bar in BARS
                )
                if not bars_complete:
                    raise GameError("还差酒吧卡册没有集齐", 400)
                street = conn.execute(
                    "SELECT last_redeemed_at FROM street_progress WHERE passport_id = ?",
                    (passport_id,),
                ).fetchone()
                last = street["last_redeemed_at"] if street else None
                if last and last >= _cutoff(STREET_VOUCHER_COOLDOWN_DAYS):
                    raise GameError("街区通行证还在冷却中", 429)
            else:
                progress = self._bar_progress(conn, passport_id, album["bar_id"])
                last = progress["last_redeemed_at"]
                if last and last >= _cutoff(BAR_VOUCHER_COOLDOWN_DAYS):
                    raise GameError("这家店的酒券还在冷却中", 429)

            code = self._new_voucher_code(conn)
            expires = (datetime.now() + (timedelta(minutes=30) if scope == "street" else timedelta(minutes=5))).replace(
                microsecond=0
            ).isoformat()
            voucher_id = new_id("v")
            conn.execute(
                """
                INSERT INTO vouchers(
                    id, passport_id, bar_id, album_id, reward_name, code, scope, status, created_at, expires_at
                ) VALUES(?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
                """,
                (
                    voucher_id,
                    passport_id,
                    album["bar_id"],
                    album_id,
                    album["reward_name"],
                    code,
                    scope,
                    now,
                    expires,
                ),
            )
            self._audit(conn, passport_id, "voucher.create", album_id, {"code": code, "scope": scope})
            row = conn.execute("SELECT * FROM vouchers WHERE id = ?", (voucher_id,)).fetchone()
            return self._voucher_dict(row)

    def staff_redeem(self, code: str, pin: str, bar_id: str) -> dict[str, Any]:
        self.store.ensure_ready()
        if not staff_pin_ok(self.store.staff_pin, pin):
            raise GameError("店员 PIN 不正确", 403)
        bar = BAR_BY_ID.get(bar_id)
        if bar is None:
            raise GameError("门店不存在", 404)
        now = now_iso()
        with self.store.connect() as conn:
            conn.execute(
                "UPDATE vouchers SET status = 'expired' WHERE status = 'active' AND expires_at < ?",
                (now,),
            )
            voucher = conn.execute(
                "SELECT * FROM vouchers WHERE code = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
                (code,),
            ).fetchone()
            if voucher is None:
                raise GameError("核销码无效或已过期", 404)
            if voucher["scope"] != "street" and voucher["bar_id"] != bar_id:
                raise GameError("这张酒券不属于本店", 409)
            cutoff_days = (
                STREET_VOUCHER_COOLDOWN_DAYS
                if voucher["scope"] == "street"
                else BAR_VOUCHER_COOLDOWN_DAYS
            )
            cutoff = _cutoff(cutoff_days)
            if voucher["scope"] == "street":
                prior = conn.execute(
                    """
                    SELECT 1 FROM vouchers
                    WHERE passport_id = ? AND scope = 'street' AND status = 'redeemed' AND redeemed_at >= ?
                    LIMIT 1
                    """,
                    (voucher["passport_id"], cutoff),
                ).fetchone()
            else:
                prior = conn.execute(
                    """
                    SELECT 1 FROM vouchers
                    WHERE passport_id = ? AND scope = 'bar' AND bar_id = ?
                      AND status = 'redeemed' AND redeemed_at >= ?
                    LIMIT 1
                    """,
                    (voucher["passport_id"], voucher["bar_id"], cutoff),
                ).fetchone()
            if prior is not None:
                raise GameError("该客人仍在兑换冷却中", 409)
            conn.execute(
                """
                UPDATE vouchers
                SET status = 'redeemed', redeemed_at = ?, redeemed_by = ?, redeemed_bar_id = ?
                WHERE id = ?
                """,
                (now, f"staff:{bar_id}", bar_id, voucher["id"]),
            )
            if voucher["scope"] == "street":
                conn.execute(
                    "UPDATE street_progress SET last_redeemed_at = ? WHERE passport_id = ?",
                    (now, voucher["passport_id"]),
                )
            else:
                conn.execute(
                    "UPDATE bar_progress SET last_redeemed_at = ? WHERE passport_id = ? AND bar_id = ?",
                    (now, voucher["passport_id"], voucher["bar_id"]),
                )
            passport = conn.execute(
                "SELECT nickname FROM passports WHERE id = ?", (voucher["passport_id"],)
            ).fetchone()
            self._audit(
                conn,
                f"staff:{bar_id}",
                "voucher.redeem",
                voucher["id"],
                {"code": code, "passport": voucher["passport_id"]},
            )
            return {
                "ok": True,
                "reward_name": voucher["reward_name"],
                "nickname": passport["nickname"] if passport else "客人",
                "scope": voucher["scope"],
                "message": "核销成功，请给客人上酒",
            }

    def staff_summary(self, bar_id: str, pin: str) -> dict[str, Any]:
        self.store.ensure_ready()
        if not staff_pin_ok(self.store.staff_pin, pin):
            raise GameError("店员 PIN 不正确", 403)
        bar = BAR_BY_ID.get(bar_id)
        if bar is None:
            raise GameError("门店不存在", 404)
        day = today_str()
        with self.store.connect() as conn:
            redeemed_today = conn.execute(
                """
                SELECT COUNT(*) AS n FROM vouchers
                WHERE status = 'redeemed' AND redeemed_bar_id = ? AND redeemed_at >= ?
                """,
                (bar_id, f"{day}T00:00:00"),
            ).fetchone()["n"]
            active = conn.execute(
                """
                SELECT COUNT(*) AS n FROM vouchers
                WHERE status = 'active' AND expires_at > ? AND (bar_id = ? OR scope = 'street')
                """,
                (now_iso(), bar_id),
            ).fetchone()["n"]
            users = conn.execute("SELECT COUNT(*) AS n FROM passports").fetchone()["n"]
            return {
                "bar_id": bar_id,
                "bar_name": bar["name"],
                "today_redeemed": redeemed_today,
                "active_vouchers": active,
                "total_passports": users,
            }

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------
    def _bar(self, conn: sqlite3.Connection, bar_id: str) -> sqlite3.Row:
        bar = conn.execute("SELECT * FROM bars WHERE id = ?", (bar_id,)).fetchone()
        if bar is None:
            raise GameError("酒吧不存在", 404)
        return bar

    def _album(self, conn: sqlite3.Connection, album_id: str) -> sqlite3.Row:
        album = conn.execute("SELECT * FROM albums WHERE id = ?", (album_id,)).fetchone()
        if album is None:
            raise GameError("卡册不存在", 404)
        return album

    def _bar_progress(self, conn: sqlite3.Connection, passport_id: str, bar_id: str) -> sqlite3.Row:
        row = conn.execute(
            "SELECT * FROM bar_progress WHERE passport_id = ? AND bar_id = ?",
            (passport_id, bar_id),
        ).fetchone()
        if row is None:
            conn.execute(
                "INSERT INTO bar_progress(passport_id, bar_id, level, reputation, shifts_count) VALUES(?, ?, 1, 0, 0)",
                (passport_id, bar_id),
            )
            row = conn.execute(
                "SELECT * FROM bar_progress WHERE passport_id = ? AND bar_id = ?",
                (passport_id, bar_id),
            ).fetchone()
        return row

    def _user_role(self, conn: sqlite3.Connection, passport_id: str, role_id: str) -> sqlite3.Row:
        row = conn.execute(
            "SELECT * FROM user_roles WHERE passport_id = ? AND role_id = ?",
            (passport_id, role_id),
        ).fetchone()
        if row is None:
            conn.execute(
                "INSERT INTO user_roles(passport_id, role_id, level, xp) VALUES(?, ?, 1, 0)",
                (passport_id, role_id),
            )
            row = conn.execute(
                "SELECT * FROM user_roles WHERE passport_id = ? AND role_id = ?",
                (passport_id, role_id),
            ).fetchone()
        return row

    def _featured_role(self, bar_id: str, day: str) -> str:
        digest = hashlib.sha256(f"{day}:{bar_id}".encode()).hexdigest()
        return ROLE_IDS[int(digest[:8], 16) % len(ROLE_IDS)]

    def _shifts_today(self, conn: sqlite3.Connection, passport_id: str) -> int:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM shifts WHERE passport_id = ? AND status = 'completed' AND completed_at >= ?",
            (passport_id, f"{today_str()}T00:00:00"),
        ).fetchone()
        return int(row["n"]) if row else 0

    def _packs_today(self, conn: sqlite3.Connection, passport_id: str) -> int:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM packs WHERE passport_id = ? AND opened_at >= ?",
            (passport_id, f"{today_str()}T00:00:00"),
        ).fetchone()
        return int(row["n"]) if row else 0

    def _bars_today(self, conn: sqlite3.Connection, passport_id: str) -> int:
        row = conn.execute(
            """
            SELECT COUNT(DISTINCT bar_id) AS n FROM shifts
            WHERE passport_id = ? AND status = 'completed' AND completed_at >= ?
            """,
            (passport_id, f"{today_str()}T00:00:00"),
        ).fetchone()
        return int(row["n"]) if row else 0

    def _owned_card_ids(self, conn: sqlite3.Connection, passport_id: str, album_id: str) -> set[str]:
        rows = conn.execute(
            """
            SELECT uc.card_id FROM user_cards uc
            JOIN cards c ON c.id = uc.card_id
            WHERE uc.passport_id = ? AND c.album_id = ?
            """,
            (passport_id, album_id),
        ).fetchall()
        return {row["card_id"] for row in rows}

    def _owned_count(self, conn: sqlite3.Connection, passport_id: str, album_id: str) -> int:
        row = conn.execute(
            """
            SELECT COUNT(*) AS n FROM user_cards uc
            JOIN cards c ON c.id = uc.card_id
            WHERE uc.passport_id = ? AND c.album_id = ?
            """,
            (passport_id, album_id),
        ).fetchone()
        return int(row["n"]) if row else 0

    def _album_progress(
        self, conn: sqlite3.Connection, passport_id: str, album_id: str
    ) -> tuple[int, int, bool]:
        total = len(CARDS_BY_ALBUM[album_id])
        owned = self._owned_count(conn, passport_id, album_id)
        return owned, total, owned == total

    def _weighted_card(self, conn: sqlite3.Connection, album_id: str) -> sqlite3.Row | dict[str, Any] | None:
        cards = CARDS_BY_ALBUM.get(album_id, [])
        if not cards:
            return None
        weights = [RARITY_WEIGHTS.get(card["rarity"], 1) for card in cards]
        return random.choices(cards, weights=weights, k=1)[0]

    def _grant_card(
        self, conn: sqlite3.Connection, passport_id: str, card: sqlite3.Row | dict[str, Any]
    ) -> dict[str, Any]:
        card_id = card["id"]
        existing = conn.execute(
            "SELECT count FROM user_cards WHERE passport_id = ? AND card_id = ?",
            (passport_id, card_id),
        ).fetchone()
        if existing is None:
            conn.execute(
                "INSERT INTO user_cards(passport_id, card_id, count, first_at) VALUES(?, ?, 1, ?)",
                (passport_id, card_id, now_iso()),
            )
            return {
                "id": card_id,
                "name": card["name"],
                "rarity": card["rarity"],
                "lore": card["lore"],
                "icon": card["icon"],
                "bonus_type": card["bonus_type"],
                "bonus_value": card["bonus_value"],
                "new": True,
                "count": 1,
                "shards": 0,
            }
        shards = RARITY_SHARDS.get(card["rarity"], 2)
        conn.execute(
            "UPDATE user_cards SET count = count + 1 WHERE passport_id = ? AND card_id = ?",
            (passport_id, card_id),
        )
        conn.execute("UPDATE passports SET shards = shards + ? WHERE id = ?", (shards, passport_id))
        return {
            "id": card_id,
            "name": card["name"],
            "rarity": card["rarity"],
            "lore": card["lore"],
            "icon": card["icon"],
            "bonus_type": card["bonus_type"],
            "bonus_value": card["bonus_value"],
            "new": False,
            "count": int(existing["count"]) + 1,
            "shards": shards,
        }

    def _check_milestones(self, conn: sqlite3.Connection, passport_id: str, album_id: str) -> list[dict[str, Any]]:
        owned = self._owned_count(conn, passport_id, album_id)
        granted: list[dict[str, Any]] = []
        for milestone in ALBUM_MILESTONES:
            if owned < milestone["threshold"]:
                continue
            exists = conn.execute(
                "SELECT 1 FROM album_milestones WHERE passport_id = ? AND album_id = ? AND threshold = ?",
                (passport_id, album_id, milestone["threshold"]),
            ).fetchone()
            if exists is not None:
                continue
            conn.execute(
                "INSERT INTO album_milestones(passport_id, album_id, threshold, claimed_at) VALUES(?, ?, ?, ?)",
                (passport_id, album_id, milestone["threshold"], now_iso()),
            )
            conn.execute(
                "UPDATE passports SET "
                "coins = coins + ?, shards = shards + ?, pack_credits = pack_credits + ? "
                "WHERE id = ?",
                (
                    milestone["coins"],
                    milestone["shards"],
                    milestone["pack_credits"],
                    passport_id,
                ),
            )
            granted.append(dict(milestone))
        return granted

    def _card_bonus(self, conn: sqlite3.Connection, passport_id: str, bar_id: str) -> dict[str, int]:
        rows = conn.execute(
            """
            SELECT c.bonus_type, SUM(c.bonus_value) AS total
            FROM user_cards uc
            JOIN cards c ON c.id = uc.card_id
            WHERE uc.passport_id = ? AND (c.bar_id = ? OR c.bar_id = 'street')
            GROUP BY c.bonus_type
            """,
            (passport_id, bar_id),
        ).fetchall()
        return {row["bonus_type"]: int(row["total"] or 0) for row in rows}

    def _task_progress(self, conn: sqlite3.Connection, passport_id: str, metric: str, day: str) -> int:
        if metric == "shifts":
            return self._shifts_today(conn, passport_id)
        if metric == "bars":
            return self._bars_today(conn, passport_id)
        if metric == "packs":
            return self._packs_today(conn, passport_id)
        return 0

    def _new_voucher_code(self, conn: sqlite3.Connection) -> str:
        for _ in range(30):
            code = f"{secrets.randbelow(1_000_000):06d}"
            active = conn.execute(
                "SELECT 1 FROM vouchers WHERE code = ? AND status = 'active'",
                (code,),
            ).fetchone()
            if active is None:
                return code
        raise GameError("核销码生成失败，请重试", 500)

    def _voucher_dict(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "bar_id": row["bar_id"],
            "album_id": row["album_id"],
            "reward_name": row["reward_name"],
            "code": row["code"],
            "scope": row["scope"],
            "status": row["status"],
            "created_at": row["created_at"],
            "expires_at": row["expires_at"],
        }

    def _audit(
        self, conn: sqlite3.Connection, actor: str, action: str, target: str, payload: dict[str, Any]
    ) -> None:
        conn.execute(
            "INSERT INTO audit_log(actor, action, target, payload, created_at) VALUES(?, ?, ?, ?, ?)",
            (actor, action, target, json.dumps(payload, ensure_ascii=False, sort_keys=True), now_iso()),
        )
