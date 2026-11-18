# BarAR + BarStreet · FastAPI Web 容器

同一个 FastAPI 容器托管两个 H5 前端：

- **BarAR**：`../BarAR/` 的 MindAR + A-Frame 酒单 AR 页面。
- **BarStreet**：`../BarStreet/` 的像素街区酒吧游戏（四家酒吧、四个岗位、卡册与酒券）。

提供 GZip、MIME 类型、短缓存、健康检查与 BarStreet 的游戏 API（护照、班次、卡包、
卡册、任务、酒券核销）。

- BarAR 入口：<http://本机IP:3501/octogame/barar/>
- BarAR 健康检查：<http://本机IP:3501/octogame/barar/api/health>
- BarStreet 入口：<http://本机IP:3501/octogame/barstreet/>
- BarStreet 健康检查：<http://本机IP:3501/octogame/barstreet/api/health>

> 前端源码位于同仓库的 `BarAR/` 与 `BarStreet/` 目录；本目录包含 Web 容器、游戏 API、
> Dockerfile 与 Docker Compose 部署配置。镜像构建时会从 GitHub `master` 拉取两个前端。

## 本地开发

需要 [uv](https://docs.astral.sh/uv/) 0.13.1 或更高版本。

```bash
cd Backend
uv sync --frozen
uv run --frozen python -m octogamear
```

如果本机 uv 默认索引不可用（例如内网 Nexus 返回 502），可以显式使用公网 PyPI：

```bash
uv sync --frozen --default-index https://pypi.org/simple
```

默认静态目录自动定位到 `../BarAR/`（`index.html` 所在目录）。如果前端放在其他位置：

```bash
OCTOGAMEAR_WEB_DIR=/path/to/BarAR uv run --frozen python -m octogamear
```

BarStreet 默认从 `../BarStreet/` 读取，数据默认写在 `Backend/data/barstreet.sqlite3`：

```bash
OCTOGAMEAR_STREET_WEB_DIR=/path/to/BarStreet \
OCTOGAMEAR_STREET_DB=/path/to/barstreet.sqlite3 \
OCTOGAMEAR_STREET_STAFF_PIN=8888 \
uv run --frozen python -m octogamear
```

首次启动会自动建表并写入四家酒吧、四个岗位、五本卡册（45 张卡）与每日任务。
演示店员 PIN 为 `8888`，正式部署请改 `OCTOGAMEAR_STREET_STAFF_PIN`。单实例不设置
`OCTOGAMEAR_STREET_SECRET` 时会自动生成并持久化到数据库；多实例或迁移时请显式设置，
以保证班次令牌的签名一致。

默认监听 `0.0.0.0:3501`，同一局域网内的手机可通过本机 IP 访问。只允许本机访问时：

```bash
OCTOGAMEAR_HOST=127.0.0.1 OCTOGAMEAR_PORT=3501 uv run --frozen python -m octogamear
```

运行测试与静态检查：

```bash
uv run --frozen pytest
uv run --frozen ruff check .
```

## 行为

- `GET /` → 307 重定向到 `/octogame/barar/`
- `GET /octogame/barar/` → 返回 `index.html`，并把 `<base href>` 重写为当前前缀
- `GET /octogame/barstreet/` → 返回 BarStreet 的 `index.html`，同样改写 `<base href>`
- 静态挂载：BarAR 的 `css/`、`js/`、`vendor/`、`assets/`、`data/`；BarStreet 的 `css/`、`js/`、`assets/`
- `GET /octogame/barar/api/health` → 存活与 BarAR 前端目录状态
- `GET /octogame/barstreet/api/health` → BarStreet 服务、SQLite 与前端目录状态
- BarStreet API：`/octogame/barstreet/api/passport`、`/street`、`/shifts/start`、
  `/shifts/complete`、`/shifts/abandon`、`/bars/{id}/upgrade`、`/packs/open`、`/albums`、
  `/tasks`、`/redeem`、`/staff/redeem` 等
- 其他路径（包括旧的 `/game`、`/sessions`、`/leaderboard`、`/remy/ask`）均返回 404
- FastAPI 自带的 `/docs`、`/openapi.json` 已关闭
- 超过 1KB 的 JS/CSS/JSON/`.mind` 自动 GZip

健康检查返回：

```json
{
  "status": "ok",
  "service": "octogamear",
  "version": "0.1.0",
  "base_path": "/octogame/barar",
  "web": {"ready": true}
}
```

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `OCTOGAMEAR_HOST` | `0.0.0.0` | 监听地址；默认允许局域网访问，只本机可设 `127.0.0.1` |
| `OCTOGAMEAR_PORT` | `3501` | 监听端口（容器内固定 3501） |
| `OCTOGAMEAR_HOST_PORT` | `3501` | 仅 compose 使用：发布到宿主机的端口 |
| `OCTOGAMEAR_BASE_PATH` | `/octogame/barar` | 前端与健康检查的公共前缀；后端返回 `index.html` 时会自动改写 `<base href>` |
| `OCTOGAMEAR_WEB_DIR` | `../BarAR` | 包含 `index.html` 的 BarAR 前端目录；容器内固定为 `/app/web` |
| `OCTOGAMEAR_LOG_LEVEL` | `info` | uvicorn 日志级别 |
| `OCTOGAMEAR_STREET_BASE_PATH` | `/octogame/barstreet` | BarStreet 前端与 API 的公共前缀 |
| `OCTOGAMEAR_STREET_WEB_DIR` | `../BarStreet` | 包含 `index.html` 的 BarStreet 前端目录；容器内为 `/app/web-street` |
| `OCTOGAMEAR_STREET_DB` | `Backend/data/barstreet.sqlite3` | SQLite 数据文件；容器内为 `/app/data/barstreet.sqlite3` |
| `OCTOGAMEAR_STREET_STAFF_PIN` | `8888` | 店员核销 PIN，正式部署必须修改 |
| `OCTOGAMEAR_STREET_SECRET` | 空（自动生成并写入数据库） | 班次令牌签名密钥；多实例部署必须显式设置 |
| `OCTOGAMEAR_STREET_MIN_SHIFT_SECONDS` | `20` | 班次最短结算时间，测试可设为 `0` |

## Docker Compose 部署

镜像名：`sungoten/barar`（Docker 仓库名必须小写；项目展示名为 SunGoten/BarAR）。

构建阶段会从 GitHub `master` 同时拉取 `BarAR/` 与 `BarStreet/`，再打包本目录的
FastAPI Web 容器。默认依次尝试 `https://ghfast.top/`、`https://gh-proxy.com/`、
`https://ghproxy.net/` 三个加速前缀，全部失败后回退直连 GitHub。构建必须能访问远端源码，
且远端必须包含：

```text
BarAR/index.html
BarAR/data/data.json
BarAR/css/
BarAR/js/
BarAR/vendor/
BarAR/assets/
BarStreet/index.html
BarStreet/css/
BarStreet/js/
BarStreet/assets/
```

> **重要：** 新增或修改 `BarStreet/` 后，必须先提交并推送到远端 `master`，再重建镜像；
> 镜像构建只拉取远端前端，不会使用本地未提交的 `BarStreet/`。

```bash
cd Backend
cp .env.example .env       # 可选：端口、加速镜像
docker compose up -d --build
```

访问 <http://本机IP:3501/octogame/barar/>（本机也可用 `127.0.0.1`）。查看状态：

```bash
docker compose ps
curl -fsS http://127.0.0.1:3501/octogame/barar/api/health
```

常用构建参数（可在 `.env` 中覆盖）：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `GIT_MIRROR` | `https://ghfast.top/,https://gh-proxy.com/,https://ghproxy.net/` | 逗号分隔的加速前缀列表，按顺序尝试；留空则直连 |
| `REPO_URL` | `https://github.com/JHerculesqz/SonGoten.git` | 源码仓库 |
| `REPO_REF` | `master` | 分支或标签 |
| `PYTHON_IMAGE` | `python:3.12-slim` | Python 基础镜像 |
| `UV_VERSION` | `0.13.1` | 从 PyPI 安装的 uv 版本，不依赖 ghcr.io |
| `UV_INDEX_URL` | `https://pypi.org/simple` | Python 包索引，国内可用 `https://pypi.tuna.tsinghua.edu.cn/simple` |
| `APT_MIRROR` | 空 | 构建阶段 Debian 源，如 `mirrors.aliyun.com` |

只重建 Web 容器、强制拉取最新前端：

```bash
docker compose build --no-cache barar
docker compose up -d
```

> **部署到店里的手机时务必加 HTTPS。** 摄像头（`getUserMedia`）只在安全上下文可用：
> `127.0.0.1` / `localhost` 可以直接调试，但手机通过 `http://局域网IP:3501/octogame/barar/`
> 访问会无法启动 AR。请用 Caddy / Nginx 反向代理到本服务的 3501 端口并配置证书，或用
> cloudflared / ngrok 隧道，再把二维码指向 HTTPS 地址。

## 安全与隐私

- 无账号、无 Cookie、无追踪；容器只提供静态文件与健康检查。
- 静态文件只暴露 `css/`、`js/`、`vendor/`、`assets/`、`data/` 和 `index.html`。
- 容器以非 root 用户运行，只读根文件系统，`/tmp` 使用 tmpfs。
- 生产环境建议叠加反向代理 TLS。

## 目录

```text
SonGoten/
├── Backend/
│   ├── src/octogamear/
│   │   ├── app.py           # BarAR + BarStreet 静态托管、GZip、健康检查
│   │   ├── config.py        # 环境变量
│   │   ├── __main__.py      # python -m octogamear
│   │   └── street/          # BarStreet 游戏 API
│   │       ├── catalog.py   # 四店、四岗位、五本卡册、45 张卡、任务
│   │       ├── store.py     # SQLite 表结构与种子数据
│   │       ├── engine.py    # 班次、卡包、卡册、酒券、风控
│   │       ├── router.py    # FastAPI 路由
│   │       └── security.py  # 护照、班次令牌、店员 PIN
│   ├── tests/               # 含 test_street.py
│   ├── scripts/healthcheck.py
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── pyproject.toml
│   └── uv.lock
├── BarAR/                   # AR 前端静态源码
│   ├── index.html
│   └── css/ js/ vendor/ assets/ data/
└── BarStreet/               # 像素街区游戏前端
    ├── index.html
    ├── README.md
    └── css/ js/ assets/
```
