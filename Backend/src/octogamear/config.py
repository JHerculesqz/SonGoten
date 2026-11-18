"""Environment-driven configuration for the BarAR static web container."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from . import __version__

DEFAULT_BASE_PATH = "/octogame/barar"
DEFAULT_STREET_BASE_PATH = "/octogame/barstreet"
DEFAULT_PORT = 3501

# Backend/src/octogamear/config.py -> SonGoten/BarAR (the static frontend root).
_DEFAULT_WEB_DIR = Path(__file__).resolve().parents[3] / "BarAR"
_DEFAULT_STREET_WEB_DIR = Path(__file__).resolve().parents[3] / "BarStreet"
_DEFAULT_STREET_DB = Path(__file__).resolve().parents[3] / "Backend" / "data" / "barstreet.sqlite3"


def _normalize_base_path(raw: str | None, default: str = DEFAULT_BASE_PATH) -> str:
    value = (raw or default).strip()
    if not value:
        value = default
    if not value.startswith("/"):
        value = "/" + value
    if value != "/":
        value = value.rstrip("/")
    return value


def _int_env(name: str, default: int, *, minimum: int, maximum: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return max(minimum, min(maximum, value))


@dataclass(frozen=True, slots=True)
class Config:
    """Runtime configuration, overridable through OCTOGAMEAR_* variables."""

    web_dir: Path = _DEFAULT_WEB_DIR
    base_path: str = DEFAULT_BASE_PATH
    street_web_dir: Path = _DEFAULT_STREET_WEB_DIR
    street_base_path: str = DEFAULT_STREET_BASE_PATH
    street_db_path: Path = _DEFAULT_STREET_DB
    street_staff_pin: str = "8888"
    street_min_shift_seconds: int = 20
    street_secret: str = ""
    host: str = "0.0.0.0"
    port: int = DEFAULT_PORT
    log_level: str = "info"
    version: str = __version__

    @property
    def api_prefix(self) -> str:
        """Prefix for the health endpoint, e.g. /octogame/barar/api."""
        return "/api" if self.base_path == "/" else f"{self.base_path}/api"

    @property
    def street_api_prefix(self) -> str:
        """Prefix for BarStreet APIs, e.g. /octogame/barstreet/api."""
        return "/api" if self.street_base_path == "/" else f"{self.street_base_path}/api"

    @classmethod
    def from_env(cls) -> Config:
        web_dir = os.getenv("OCTOGAMEAR_WEB_DIR", "").strip()
        street_web_dir = os.getenv("OCTOGAMEAR_STREET_WEB_DIR", "").strip()
        street_db = os.getenv("OCTOGAMEAR_STREET_DB", "").strip()
        return cls(
            web_dir=Path(web_dir).expanduser() if web_dir else _DEFAULT_WEB_DIR,
            base_path=_normalize_base_path(os.getenv("OCTOGAMEAR_BASE_PATH")),
            street_web_dir=Path(street_web_dir).expanduser() if street_web_dir else _DEFAULT_STREET_WEB_DIR,
            street_base_path=_normalize_base_path(
                os.getenv("OCTOGAMEAR_STREET_BASE_PATH"), DEFAULT_STREET_BASE_PATH
            ),
            street_db_path=Path(street_db).expanduser() if street_db else _DEFAULT_STREET_DB,
            street_staff_pin=os.getenv("OCTOGAMEAR_STREET_STAFF_PIN", "8888").strip() or "8888",
            street_min_shift_seconds=_int_env(
                "OCTOGAMEAR_STREET_MIN_SHIFT_SECONDS", 20, minimum=0, maximum=600
            ),
            street_secret=os.getenv("OCTOGAMEAR_STREET_SECRET", "").strip(),
            host=os.getenv("OCTOGAMEAR_HOST", "0.0.0.0").strip() or "0.0.0.0",
            port=_int_env("OCTOGAMEAR_PORT", DEFAULT_PORT, minimum=1, maximum=65535),
            log_level=os.getenv("OCTOGAMEAR_LOG_LEVEL", "info").strip() or "info",
        )
