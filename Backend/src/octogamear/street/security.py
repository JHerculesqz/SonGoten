"""Small security helpers: passports, shift tokens and staff PIN checks."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from .catalog import CHARACTERS


def hash_secret(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(12)}"


def new_recovery_code() -> str:
    raw = "".join(secrets.choice(CHARACTERS) for _ in range(8))
    return f"{raw[:4]}-{raw[4:]}"


def normalize_recovery_code(code: str) -> str:
    return "".join(ch for ch in code.upper() if ch.isalnum())


def _b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64d(value: str) -> bytes:
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def _signature(secret: str, payload_b64: str) -> str:
    return hmac.new(secret.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).hexdigest()


def create_shift_token(secret: str, payload: dict[str, Any]) -> str:
    payload_b64 = _b64e(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    return f"{payload_b64}.{_signature(secret, payload_b64)}"


def verify_shift_token(secret: str, token: str) -> dict[str, Any] | None:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        return None
    expected = _signature(secret, payload_b64)
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        payload = json.loads(_b64d(payload_b64))
    except (ValueError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    expires = payload.get("exp")
    if not isinstance(expires, int) or expires < int(time.time()):
        return None
    return payload


def staff_pin_ok(expected: str, supplied: str) -> bool:
    return hmac.compare_digest(expected, supplied)
