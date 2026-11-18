# BarAR · THE GARDEN AR 酒单（前端）

SonGoten 的第一个 AR 小游戏前端：客人用手机扫描十二星座鸡尾酒卡片，SARA 从卡片中走出来，
拿着对应的 3D 鸡尾酒讲述这杯酒的故事。

前端是纯静态的 **MindAR + A-Frame** 页面，不依赖构建工具；后端微服务、Dockerfile 与
Docker Compose 已迁移到同仓库的 [`../Backend/`](../Backend/)。

## 目录

```text
BarAR/
├── index.html                 # 首页 + AR 场景 + HUD
├── css/style.css              # Loopin 风格视觉与响应式布局
├── js/app.js                  # 七语种、目标识别、音频、面板与状态
├── js/components.js           # sara-idle / face-camera
├── vendor/                    # A-Frame + MindAR
├── assets/
│   ├── targets/
│   │   ├── cocktails.mind     # 12 个星座卡片识别库
│   │   ├── cards/             # 12 张卡片（含天蝎座/双鱼座新卡）
│   │   └── loopin-cocktail.jpg
│   ├── models/sara/sara.glb   # SARA 3D 模型
│   ├── models/cocktails/      # 12 个鸡尾酒 GLB
│   └── textures/shadow.png
├── data/
│   ├── data.json              # 12 星座鸡尾酒文案
│   └── audios/                # 12 段 MP3 旁白
└── reference/                 # 视觉参考图
```

## 启动

前端由 FastAPI Web 容器托管，推荐使用 Docker Compose：

```bash
cd ../Backend
cp .env.example .env
docker compose up -d --build
```

访问 <http://本机IP:3501/octogame/barar/>。镜像构建时会从 GitHub `master` 的 `BarAR/`
目录拉取本前端；默认依次尝试多个国内加速前缀，全部失败后回退直连 GitHub。

本地只跑 Web 容器：

```bash
cd ../Backend
uv sync --frozen
uv run --frozen python -m octogamear
```

> **手机访问需要 HTTPS。** 摄像头（`getUserMedia`）只在安全上下文可用：
> `127.0.0.1` / `localhost` 可以直接调试，但手机通过 `http://局域网IP:3501/octogame/barar/`
> 访问会无法启动 AR。请用 Caddy / Nginx 终止 TLS，或使用 cloudflared / ngrok 隧道。

## 说明

- 识别库 `assets/targets/cocktails.mind` 为 12 个 target，`targetIndex 0–11` 对应
  `data/data.json` 中的 12 个星座条目。
- 如果重建 Docker 镜像，请先推送 `BarAR/`（包括新的 `cocktails.mind`）；镜像只拉取远端前端。
- `assets/targets/` 只保留当前 AR 使用的 `cocktails.mind`、`cards/` 与首页图
  `loopin-cocktail.jpg`；旧 Mojito 的 `mojito-card.png`、`mojito.mind` 与
  `zodiac-menu.jpg` 已随旧后端游戏一起删除。
- SARA 模型在首次识别成功后懒加载；音频使用独立 MP3，不调用 Web Speech API。
- 首页/AR 页支持中文、繁體中文、English、日本語、한국어、Français、Deutsch 七语种。
- 故事面板为紧凑版：2 行字幕，播放/重播/重扫按钮在右上角。

详细部署、环境变量和安全说明见 [`../Backend/README.md`](../Backend/README.md)。
