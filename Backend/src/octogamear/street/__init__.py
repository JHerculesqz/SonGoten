"""BarStreet: pixel street, four bars, role shifts, card albums and vouchers."""

from __future__ import annotations

__all__ = ["StreetEngine", "StreetStore", "create_street_router"]


def __getattr__(name: str):
    """Lazy imports keep app startup cheap and avoid circular imports."""
    if name == "StreetEngine":
        from .engine import StreetEngine

        return StreetEngine
    if name == "StreetStore":
        from .store import StreetStore

        return StreetStore
    if name == "create_street_router":
        from .router import create_street_router

        return create_street_router
    raise AttributeError(name)
