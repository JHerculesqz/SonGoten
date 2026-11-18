# syntax=docker/dockerfile:1.7
#
# SunGoten/BarAR — AR frontend static web container.
#
# Stage 1 fetches the BarAR and BarStreet frontends from the SonGoten
# repository at build time. A China-friendly GitHub accelerator is tried first;
# direct GitHub is the fallback. The frontends are NOT copied from the local
# directories, so the image always reflects the configured REPO_REF.
#
# Stage 2 installs uv 0.13.1 from the chosen PyPI index, then packages the
# FastAPI web container in this Backend/ directory with locked dependencies.
#
# Docker repository names must be lowercase, so the image is tagged
# sungoten/barar even though the project name is SunGoten/BarAR.

ARG PYTHON_IMAGE=python:3.12-slim

# ---------------------------------------------------------------------------
# 1. Frontend: sparse-clone only BarAR/ from SonGoten master
# ---------------------------------------------------------------------------
FROM ${PYTHON_IMAGE} AS frontend-fetch

# Comma-separated accelerator prefixes. Each one is tried in order; direct
# GitHub is the final fallback. Set empty to skip mirrors entirely.
ARG GIT_MIRROR="https://ghfast.top/,https://gh-proxy.com/,https://ghproxy.net/"
ARG REPO_URL=https://github.com/JHerculesqz/SonGoten.git
ARG REPO_REF=master
ARG APT_MIRROR=

ENV DEBIAN_FRONTEND=noninteractive \
    GIT_TERMINAL_PROMPT=0 \
    GIT_HTTP_LOW_SPEED_LIMIT=1000 \
    GIT_HTTP_LOW_SPEED_TIME=30

RUN set -eux; \
    if [ -n "${APT_MIRROR}" ]; then \
        for file in /etc/apt/sources.list /etc/apt/sources.list.d/*.sources; do \
            [ -f "$file" ] || continue; \
            sed -i "s|deb.debian.org|${APT_MIRROR}|g; s|security.debian.org|${APT_MIRROR}|g" "$file"; \
        done; \
    fi; \
    apt-get update; \
    apt-get install -y --no-install-recommends git ca-certificates; \
    rm -rf /var/lib/apt/lists/*

WORKDIR /src

RUN set -eux; \
    cloned=0; \
    if [ -n "${GIT_MIRROR}" ]; then \
        for mirror in $(printf '%s' "${GIT_MIRROR}" | tr ',' ' '); do \
            [ -n "${mirror}" ] || continue; \
            echo "Fetching BarAR via mirror: ${mirror%/}/${REPO_URL}"; \
            if git clone --depth 1 --filter=blob:none --sparse --branch "${REPO_REF}" \
                    "${mirror%/}/${REPO_URL}" repo; then \
                cloned=1; \
                break; \
            else \
                echo "Mirror failed: ${mirror}"; \
                rm -rf repo; \
            fi; \
        done; \
    fi; \
    if [ "${cloned}" = "0" ]; then \
        echo "Fetching BarAR directly: ${REPO_URL}"; \
        git clone --depth 1 --filter=blob:none --sparse --branch "${REPO_REF}" \
            "${REPO_URL}" repo; \
    fi; \
    cd repo; \
    git sparse-checkout set BarAR BarStreet; \
    test -f BarAR/index.html; \
    test -f BarAR/data/data.json; \
    test -f BarStreet/index.html; \
    test -f BarStreet/js/app.js; \
    mkdir -p /web /web-street; \
    cp -R BarAR/index.html BarAR/css BarAR/js BarAR/vendor BarAR/assets BarAR/data /web/; \
    cp -R BarStreet/index.html BarStreet/css BarStreet/js BarStreet/assets /web-street/; \
    echo "Frontend source: ${REPO_URL}@${REPO_REF} ($(git rev-parse --short HEAD))"

# ---------------------------------------------------------------------------
# 2. Runtime: uv 0.13.1 + FastAPI microservice
# ---------------------------------------------------------------------------
FROM ${PYTHON_IMAGE} AS runtime

ARG UV_VERSION=0.13.1
ARG UV_INDEX_URL=https://pypi.org/simple
ARG VERSION=0.1.0
ARG REPO_URL=https://github.com/JHerculesqz/SonGoten.git
ARG REPO_REF=master

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_DEFAULT_INDEX=${UV_INDEX_URL} \
    OCTOGAMEAR_HOST=0.0.0.0 \
    OCTOGAMEAR_PORT=3501 \
    OCTOGAMEAR_BASE_PATH=/octogame/barar \
    OCTOGAMEAR_WEB_DIR=/app/web \
    OCTOGAMEAR_STREET_BASE_PATH=/octogame/barstreet \
    OCTOGAMEAR_STREET_WEB_DIR=/app/web-street \
    OCTOGAMEAR_STREET_DB=/app/data/barstreet.sqlite3 \
    OCTOGAMEAR_STREET_STAFF_PIN=8888 \
    PATH=/app/.venv/bin:$PATH

LABEL org.opencontainers.image.title="SunGoten/BarAR + BarStreet" \
      org.opencontainers.image.description="BarAR AR page and BarStreet pixel bar game" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.source="https://github.com/JHerculesqz/SonGoten" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Install the exact uv release from PyPI (or a domestic mirror) instead of
# relying on the ghcr.io uv image.
RUN pip install --index-url "${UV_INDEX_URL}" "uv==${UV_VERSION}" \
    && uv --version

COPY pyproject.toml uv.lock README.md ./
# uv.lock records public URLs. Re-lock against the selected index so a
# domestic PyPI mirror takes effect during the build.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv lock --default-index "${UV_INDEX_URL}" \
    && uv sync --frozen --no-dev --no-install-project --no-editable

COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable

COPY scripts/healthcheck.py ./healthcheck.py
COPY --from=frontend-fetch /web ./web
COPY --from=frontend-fetch /web-street ./web-street

RUN mkdir -p /app/data \
    && useradd --create-home --uid 10001 octogamear \
    && chown -R octogamear:octogamear /app

USER octogamear

EXPOSE 3501

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "/app/healthcheck.py"]

CMD ["python", "-m", "octogamear"]
