"""Run the BarAR web container with ``python -m octogamear``."""

from __future__ import annotations

import uvicorn

from .config import Config


def main() -> None:
    config = Config.from_env()
    uvicorn.run(
        "octogamear.app:app",
        host=config.host,
        port=config.port,
        log_level=config.log_level,
    )


if __name__ == "__main__":
    main()
