# BarStreet · 时光街区

《时光街区 · 四间酒吧》的 H5 前端：一条等距 2.5D 雨天街区，Loopin、Citrus、HiJack、工厂四家酒吧，
四个岗位小游戏，四本卡册，以及到店兑换免费鸡尾酒的单店酒券。

- 入口：`http://本机IP:3501/octogame/barstreet/`
- 后端：同一仓库的 [`../Backend/`](../Backend/)，FastAPI + SQLite
- 健康检查：`http://本机IP:3501/octogame/barstreet/api/health`

## 怎么玩

1. 打开页面，领取匿名“酒馆护照”（不需要手机号）。首页是一条雨天等距街区：
   Loopin、Citrus、HiJack、工厂四家酒吧分布在街道两侧，点门头进入。
   地图支持滚轮/双指缩放、放大后拖动、`1:1` 重置。
2. 在街区点一家酒吧，选择岗位：
   - **Loopin · 调酒师**：按配方点配料，控制倒酒量。
   - **Citrus · 服务员**：记桌号、端盘送酒、避开猫。
   - **HiJack · 清洁工**：擦污渍、收酒瓶、找失物。
   - **工厂 · 酒水供应商**：看订单、配货、搬箱。
3. 每班 45–60 秒，结算工资、口碑、经验、卡牌或卡包。
4. 用营业币升级店铺/买每日限量普通卡包；用重复卡换碎片；集齐一本 9 张卡册。
5. 集齐卡册后到“兑换”页生成 6 位酒券码，到对应酒吧由店员核销。
6. 店员入口：`#/staff`，演示 PIN 为 `8888`（正式部署请改环境变量）。

## 页面

| 路由 | 功能 |
| --- | --- |
| `#/street` | 等距雨天街区首页；四家酒吧可点击，地图可缩放/拖拽 |
| `#/bar/:id` | 店面、岗位选择、经营升级、酒单、到店玩法 |
| `#/shift/:bar/:role` | 岗位小游戏 |
| `#/albums` | 五本卡册、里程碑、碎片换卡 |
| `#/packs` | 免费/营业币/班次卡包、概率与保底 |
| `#/tasks` | 每日任务与领取 |
| `#/redeem` | 单店酒券、街区通行证、6 位核销码 |
| `#/me` | 护照、恢复码、岗位/店铺等级、切换账号 |
| `#/staff` | 店员核销与今日数据 |

## 本地运行

前端由 FastAPI 托管，不需要构建工具：

```bash
cd ../Backend
uv sync --frozen --default-index https://pypi.org/simple
uv run --frozen python -m octogamear
```

然后打开 <http://127.0.0.1:3501/octogame/barstreet/>。

如果前端目录不在默认的 `../BarStreet/`：

```bash
OCTOGAMEAR_STREET_WEB_DIR=/path/to/BarStreet uv run --frozen python -m octogamear
```

## 数据与隐私

- 匿名护照：设备本地保存 `passport_id` 与恢复码；服务器只存恢复码哈希，不存手机号。
- 游戏进度存在 `Backend/data/barstreet.sqlite3`（可通过 `OCTOGAMEAR_STREET_DB` 修改）。
- 酒券：6 位码、短有效期、一次性、店员核销；不可转让、不可折现。
- 18+；不劝酒；每款饮酒玩法都有无酒精路线。

## 目录

```text
BarStreet/
├── index.html          # H5 入口（<base href="/octogame/barstreet/">）
├── css/style.css       # 等距街区、卡册、游戏、店员后台样式
├── js/api.js           # API 客户端与护照存储
├── js/street-map.js    # 首页等距雨天街区（内联 SVG，原创绘制）
├── js/games.js         # 四个 45–60 秒岗位小游戏
├── js/app.js           # 街区/店面/班次/卡册/开包/任务/兑换/店员
├── assets/             # 预留：卡面、Sprite、音效、favicon
├── reference/          # 《街区参考图.png》：仅作风格参考，不参与运行
└── README.md
```

> 首页街区是原创内联 SVG：参考图的“等距、雨天、暖光窗户、绿植街道”氛围被转译为
> 可缩放、可点击的 H5 场景；参考图本身不会被嵌入或发布。

## 说明

- 前端是纯静态文件，由 FastAPI 在 `/octogame/barstreet/` 下托管；`<base href>` 会按
  `OCTOGAMEAR_STREET_BASE_PATH` 自动改写。
- 卡牌文案、店铺、岗位、卡册与任务定义在后端
  `Backend/src/octogamear/street/catalog.py`，改完重启服务即可。
- 这是 MVP：卡包逻辑、班次结算、酒券核销都在服务端；小游戏评分由客户端上报，
  服务端校验时长、令牌与分数范围，后续可加操作序列回放。
