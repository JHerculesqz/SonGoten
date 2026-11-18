"""FastAPI routes for the BarStreet game."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any, Literal, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from .engine import GameError, StreetEngine

T = TypeVar("T")


class PassportCreate(BaseModel):
    nickname: str | None = Field(default=None, max_length=24)


class RestoreRequest(BaseModel):
    recovery_code: str = Field(min_length=1, max_length=32)


class ShiftStartRequest(BaseModel):
    bar_id: str
    role_id: str


class ShiftCompleteRequest(BaseModel):
    shift_token: str = Field(min_length=10)
    score: int = Field(ge=0, le=100)


class ShiftTokenRequest(BaseModel):
    shift_token: str = Field(min_length=10)


class ExchangeRequest(BaseModel):
    card_id: str


class PackOpenRequest(BaseModel):
    source: Literal["free", "coins", "shift"]
    album_id: str


class RedeemRequest(BaseModel):
    album_id: str


class StaffRedeemRequest(BaseModel):
    code: str = Field(min_length=4, max_length=12)
    pin: str = Field(min_length=1, max_length=32)
    bar_id: str


def create_street_router(engine: StreetEngine, config: Any) -> APIRouter:
    router = APIRouter(prefix=config.street_api_prefix, tags=["barstreet"])

    def call(fn: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        try:
            return fn(*args, **kwargs)
        except GameError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    def get_passport(request: Request) -> str:
        passport_id = (request.headers.get("X-Passport") or "").strip()
        if not passport_id:
            raise HTTPException(status_code=401, detail="缺少护照，请先创建或恢复")
        if not engine.passport_exists(passport_id):
            raise HTTPException(status_code=401, detail="护照无效，请重新创建或恢复")
        return passport_id

    @router.get("/health")
    def health() -> dict[str, Any]:
        try:
            engine.store.ensure_ready()
            db_ok = True
        except Exception:
            db_ok = False
        return {
            "status": "ok" if db_ok else "degraded",
            "service": "barstreet",
            "db": db_ok,
            "web": (config.street_web_dir / "index.html").is_file(),
            "base_path": config.street_base_path,
        }

    @router.get("/meta")
    def meta() -> dict[str, Any]:
        return call(engine.meta)

    @router.post("/passport")
    def create_passport(body: PassportCreate) -> dict[str, Any]:
        return call(engine.create_passport, body.nickname)

    @router.post("/passport/restore")
    def restore_passport(body: RestoreRequest) -> dict[str, Any]:
        return call(engine.restore_passport, body.recovery_code)

    @router.get("/street")
    def street(passport_id: str = Depends(get_passport)) -> dict[str, Any]:
        return call(engine.street, passport_id)

    @router.get("/bars/{bar_id}")
    def bar_detail(bar_id: str, passport_id: str = Depends(get_passport)) -> dict[str, Any]:
        return call(engine.bar_detail, passport_id, bar_id)

    @router.post("/bars/{bar_id}/upgrade")
    def upgrade_bar(bar_id: str, passport_id: str = Depends(get_passport)) -> dict[str, Any]:
        return call(engine.upgrade_bar, passport_id, bar_id)

    @router.post("/shifts/start")
    def start_shift(
        body: ShiftStartRequest, passport_id: str = Depends(get_passport)
    ) -> dict[str, Any]:
        return call(engine.start_shift, passport_id, body.bar_id, body.role_id)

    @router.post("/shifts/complete")
    def complete_shift(
        body: ShiftCompleteRequest, passport_id: str = Depends(get_passport)
    ) -> dict[str, Any]:
        return call(engine.complete_shift, passport_id, body.shift_token, body.score)

    @router.post("/shifts/abandon")
    def abandon_shift(
        body: ShiftTokenRequest, passport_id: str = Depends(get_passport)
    ) -> dict[str, Any]:
        return call(engine.abandon_shift, passport_id, body.shift_token)

    @router.get("/albums")
    def albums(passport_id: str = Depends(get_passport)) -> dict[str, Any]:
        return call(engine.albums, passport_id)

    @router.post("/albums/{album_id}/exchange")
    def exchange(
        album_id: str, body: ExchangeRequest, passport_id: str = Depends(get_passport)
    ) -> dict[str, Any]:
        return call(engine.exchange, passport_id, album_id, body.card_id)

    @router.get("/packs")
    def packs_info(passport_id: str = Depends(get_passport)) -> dict[str, Any]:
        return call(engine.packs_info, passport_id)

    @router.post("/packs/open")
    def open_pack(body: PackOpenRequest, passport_id: str = Depends(get_passport)) -> dict[str, Any]:
        return call(engine.open_pack, passport_id, body.source, body.album_id)

    @router.get("/tasks")
    def tasks(passport_id: str = Depends(get_passport)) -> dict[str, Any]:
        return call(engine.tasks, passport_id)

    @router.post("/tasks/{task_id}/claim")
    def claim_task(task_id: str, passport_id: str = Depends(get_passport)) -> dict[str, Any]:
        return call(engine.claim_task, passport_id, task_id)

    @router.get("/redeem")
    def redeem_info(passport_id: str = Depends(get_passport)) -> dict[str, Any]:
        return call(engine.redeem_info, passport_id)

    @router.post("/redeem")
    def create_voucher(body: RedeemRequest, passport_id: str = Depends(get_passport)) -> dict[str, Any]:
        return call(engine.create_voucher, passport_id, body.album_id)

    @router.post("/staff/redeem")
    def staff_redeem(body: StaffRedeemRequest) -> dict[str, Any]:
        return call(engine.staff_redeem, body.code, body.pin, body.bar_id)

    @router.get("/staff/summary")
    def staff_summary(
        bar_id: str = Query(...), pin: str = Query(...)
    ) -> dict[str, Any]:
        return call(engine.staff_summary, bar_id, pin)

    return router
