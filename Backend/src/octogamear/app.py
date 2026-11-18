"""BarAR static web container: serve the AR frontend under /octogame/barar."""

from __future__ import annotations

import mimetypes
import re
from html import escape as html_escape
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.gzip import GZipMiddleware

from .config import Config
from .street.engine import StreetEngine
from .street.router import create_street_router
from .street.store import StreetStore

# Windows may map .js to text/plain; phones need real MIME types.
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("model/gltf-binary", ".glb")
mimetypes.add_type("application/octet-stream", ".mind")
mimetypes.add_type("audio/wav", ".wav")
mimetypes.add_type("audio/mpeg", ".mp3")

WEB_SUBDIRS = ("css", "js", "vendor", "assets", "data")
STREET_SUBDIRS = ("css", "js", "assets")


class CacheStaticFiles(StaticFiles):
    """Static files with a short public cache; names are not content-hashed."""

    def __init__(self, *args: Any, max_age: int = 3600, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.max_age = max_age

    def file_response(self, *args: Any, **kwargs: Any):  # type: ignore[no-untyped-def]
        response = super().file_response(*args, **kwargs)
        if response.status_code == 200:
            response.headers.setdefault("Cache-Control", f"public, max-age={self.max_age}")
        return response


def _render_index(index_path: Path, base_path: str) -> HTMLResponse:
    """Serve index.html with ``<base href>`` rewritten to the configured prefix.

    The AR page hardcodes its original base path, so rewriting keeps a cloned
    or locally mounted frontend working when the service lives elsewhere.
    """
    html = index_path.read_text(encoding="utf-8")
    href = html_escape("/" if base_path == "/" else f"{base_path}/", quote=True)
    html, replacements = re.subn(
        r'<base\s+href="[^"]*"[^>]*>',
        lambda _match: f'<base href="{href}">',
        html,
        count=1,
    )
    if replacements == 0:
        html, _ = re.subn(
            r"(<head\b[^>]*>)",
            lambda match: f'{match.group(1)}\n  <base href="{href}">',
            html,
            count=1,
        )
    return HTMLResponse(content=html, headers={"Cache-Control": "no-cache"})


def _install_health(app: FastAPI, config: Config) -> None:
    health_path = f"{config.api_prefix}/health"

    @app.get(health_path, include_in_schema=False)
    def health() -> dict[str, Any]:
        return {
            "status": "ok",
            "service": "octogamear",
            "version": config.version,
            "base_path": config.base_path,
            "web": {"ready": (config.web_dir / "index.html").is_file()},
        }


def _install_web(app: FastAPI, config: Config) -> None:
    base = config.base_path
    web_dir: Path = config.web_dir
    index_path = web_dir / "index.html"

    if not index_path.is_file():
        message = {
            "detail": "BarAR frontend not found",
            "hint": "Set OCTOGAMEAR_WEB_DIR to a directory that contains index.html (the BarAR checkout).",
        }

        @app.get("/", include_in_schema=False)
        def missing_root() -> JSONResponse:
            return JSONResponse(status_code=503, content=message)

        if base != "/":

            @app.get(base, include_in_schema=False)
            @app.get(f"{base}/", include_in_schema=False)
            def missing_web() -> JSONResponse:
                return JSONResponse(status_code=503, content=message)

        return

    if base == "/":

        @app.get("/", include_in_schema=False)
        def index_page() -> HTMLResponse:
            return _render_index(index_path, config.base_path)

        @app.get("/index.html", include_in_schema=False)
        def index_html() -> HTMLResponse:
            return index_page()

    else:

        @app.get(base, include_in_schema=False)
        def base_without_slash() -> RedirectResponse:
            return RedirectResponse(url=f"{base}/", status_code=307)

        @app.get(f"{base}/", include_in_schema=False)
        def index_page() -> HTMLResponse:
            return _render_index(index_path, config.base_path)

        @app.get(f"{base}/index.html", include_in_schema=False)
        def index_html() -> HTMLResponse:
            return index_page()

        @app.get("/", include_in_schema=False)
        def root() -> RedirectResponse:
            return RedirectResponse(url=f"{base}/", status_code=307)

    for subdir in WEB_SUBDIRS:
        directory = web_dir / subdir
        if directory.is_dir():
            app.mount(
                f"{base.rstrip('/')}/{subdir}",
                CacheStaticFiles(directory=directory),
                name=f"web-{subdir}",
            )


def _install_street(app: FastAPI, config: Config) -> None:
    """Serve the BarStreet H5 under ``/octogame/barstreet``."""
    base = config.street_base_path
    web_dir: Path = config.street_web_dir
    index_path = web_dir / "index.html"

    if not index_path.is_file():
        message = {
            "detail": "BarStreet frontend not found",
            "hint": "Set OCTOGAMEAR_STREET_WEB_DIR to a directory that contains index.html (the BarStreet checkout).",
        }

        @app.get(base, include_in_schema=False)
        @app.get(f"{base}/", include_in_schema=False)
        def missing_street() -> JSONResponse:
            return JSONResponse(status_code=503, content=message)

        return

    if base == "/":

        @app.get("/", include_in_schema=False)
        @app.get("/index.html", include_in_schema=False)
        def street_index_root() -> HTMLResponse:
            return _render_index(index_path, base)

    else:

        @app.get(base, include_in_schema=False)
        def street_without_slash() -> RedirectResponse:
            return RedirectResponse(url=f"{base}/", status_code=307)

        @app.get(f"{base}/", include_in_schema=False)
        def street_index() -> HTMLResponse:
            return _render_index(index_path, base)

        @app.get(f"{base}/index.html", include_in_schema=False)
        def street_index_html() -> HTMLResponse:
            return _render_index(index_path, base)

    for subdir in STREET_SUBDIRS:
        directory = web_dir / subdir
        if directory.is_dir():
            app.mount(
                f"{base.rstrip('/')}/{subdir}",
                CacheStaticFiles(directory=directory),
                name=f"street-{subdir}",
            )


def create_app(config: Config | None = None) -> FastAPI:
    config = config or Config.from_env()

    app = FastAPI(
        title="SunGoten BarAR + BarStreet Web",
        version=config.version,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.state.config = config

    # Compress JS/CSS/JSON/.mind on the wire. This matters for the AR page,
    # where A-Frame, MindAR and the 12-target bundle are several MB.
    app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=6)

    street_store = StreetStore(
        config.street_db_path,
        staff_pin=config.street_staff_pin,
        secret=config.street_secret,
    )
    street_engine = StreetEngine(street_store, min_shift_seconds=config.street_min_shift_seconds)
    app.state.street_store = street_store
    app.state.street_engine = street_engine

    app.include_router(create_street_router(street_engine, config))

    _install_health(app, config)
    _install_web(app, config)
    _install_street(app, config)
    return app


app = create_app()
