# ruff: noqa: E501
"""Static catalog for the BarStreet game: bars, roles, albums, cards, tasks."""

from __future__ import annotations

from typing import Any

ROLE_IDS = ("bartender", "waiter", "cleaner", "supplier")

ROLES: list[dict[str, Any]] = [
    {
        "id": "bartender",
        "name": "调酒师",
        "description": "看配方、控倒酒、摇出节奏。",
        "game": "bartender",
        "icon": "🍸",
    },
    {
        "id": "waiter",
        "name": "服务员",
        "description": "记桌号、端稳托盘、别撞到猫。",
        "game": "waiter",
        "icon": "🍽️",
    },
    {
        "id": "cleaner",
        "name": "清洁工",
        "description": "擦污渍、收酒瓶、找失物。",
        "game": "cleaner",
        "icon": "🧹",
    },
    {
        "id": "supplier",
        "name": "酒水供应商",
        "description": "看订单、配货、搬箱、算利润。",
        "game": "supplier",
        "icon": "📦",
    },
]

BARS: list[dict[str, Any]] = [
    {
        "id": "loopin",
        "name": "Loopin",
        "subtitle": "霓虹理想国",
        "tagline": "把星座装进酒杯",
        "role_id": "bartender",
        "signature": "十二星座特调",
        "album_id": "loopin",
        "reward_name": "星座特调券",
        "color": "#2B1B4A",
        "accent": "#FF7A3D",
        "icon": "♌",
        "menu": ["星座特调", "月光 Negroni", "星尘 Highball"],
    },
    {
        "id": "citrus",
        "name": "Citrus",
        "subtitle": "阳光露台",
        "tagline": "把阳光榨成气泡",
        "role_id": "waiter",
        "signature": "Citrus Spritz",
        "album_id": "citrus",
        "reward_name": "Citrus Spritz 券",
        "color": "#F2C94C",
        "accent": "#6FCF97",
        "icon": "🍋",
        "menu": ["Citrus Spritz", "青柠 Gin Fizz", "橙花 Collins"],
    },
    {
        "id": "hijack",
        "name": "HiJack",
        "subtitle": "午夜派对",
        "tagline": "把午夜调成音量",
        "role_id": "cleaner",
        "signature": "派对 Shot / Punch",
        "album_id": "hijack",
        "reward_name": "派对特调券",
        "color": "#FF3CAC",
        "accent": "#2D9CDB",
        "icon": "🪩",
        "menu": ["Party Shot", "午夜 Punch", "霓虹 Sour"],
    },
    {
        "id": "factory",
        "name": "工厂",
        "subtitle": "精酿工厂",
        "tagline": "把麦芽酿成机器轰鸣",
        "role_id": "supplier",
        "signature": "精酿 / 桶陈鸡尾酒",
        "album_id": "factory",
        "reward_name": "精酿券",
        "color": "#4F4F4F",
        "accent": "#D9A441",
        "icon": "🏭",
        "menu": ["工厂拉格", "桶陈 Negroni", "烟熏 Old Fashioned"],
    },
]

ALBUMS: list[dict[str, Any]] = [
    {
        "id": "loopin",
        "bar_id": "loopin",
        "name": "星座酒标",
        "subtitle": "十二星座的第一杯",
        "reward_name": "星座特调券",
        "icon": "♈",
    },
    {
        "id": "citrus",
        "bar_id": "citrus",
        "name": "阳光露台",
        "subtitle": "柑橘、香草与下午三点的影子",
        "reward_name": "Citrus Spritz 券",
        "icon": "🍋",
    },
    {
        "id": "hijack",
        "bar_id": "hijack",
        "name": "午夜派对",
        "subtitle": "迪斯科球照不到的角落",
        "reward_name": "派对特调券",
        "icon": "🪩",
    },
    {
        "id": "factory",
        "bar_id": "factory",
        "name": "精酿机器",
        "subtitle": "麦芽、木桶与一整条生产线",
        "reward_name": "精酿券",
        "icon": "🏭",
    },
    {
        "id": "street",
        "bar_id": "street",
        "name": "时光街",
        "subtitle": "一条街、四家店、很多人",
        "reward_name": "街区通行证",
        "icon": "🏙️",
    },
]

# 45 cards: four bar albums plus the street album. Each album has nine cards.
CARDS: list[dict[str, Any]] = [
    # Loopin · 星座酒标
    {"id": "loopin_01", "album_id": "loopin", "bar_id": "loopin", "name": "白羊·点火", "rarity": "N", "lore": "第一杯总是最烈的，像三月的风。", "bonus_type": "shift_pay", "bonus_value": 1, "icon": "♈"},
    {"id": "loopin_02", "album_id": "loopin", "bar_id": "loopin", "name": "金牛·慢摇", "rarity": "N", "lore": "摇酒壶要摇够 30 秒，急不得。", "bonus_type": "shift_pay", "bonus_value": 1, "icon": "♉"},
    {"id": "loopin_03", "album_id": "loopin", "bar_id": "loopin", "name": "双子·双杯", "rarity": "N", "lore": "两杯一样的酒，给两个不一样的人。", "bonus_type": "shift_pay", "bonus_value": 1, "icon": "♊"},
    {"id": "loopin_04", "album_id": "loopin", "bar_id": "loopin", "name": "巨蟹·盐边", "rarity": "R", "lore": "杯口的盐，是海留下的句子。", "bonus_type": "reputation", "bonus_value": 2, "icon": "♋"},
    {"id": "loopin_05", "album_id": "loopin", "bar_id": "loopin", "name": "狮子·金色泡沫", "rarity": "R", "lore": "今晚的主角，杯里要有光。", "bonus_type": "drop", "bonus_value": 1, "icon": "♌"},
    {"id": "loopin_06", "album_id": "loopin", "bar_id": "loopin", "name": "处女·精确到滴", "rarity": "R", "lore": "0.5 毫升的差别，她尝得出来。", "bonus_type": "score", "bonus_value": 2, "icon": "♍"},
    {"id": "loopin_07", "album_id": "loopin", "bar_id": "loopin", "name": "天秤·一半一半", "rarity": "SR", "lore": "一半甜，一半苦，刚刚好。", "bonus_type": "shift_pay", "bonus_value": 3, "icon": "♎"},
    {"id": "loopin_08", "album_id": "loopin", "bar_id": "loopin", "name": "天蝎·深水", "rarity": "SR", "lore": "别看杯底，杯底也在看你。", "bonus_type": "drop", "bonus_value": 2, "icon": "♏"},
    {"id": "loopin_09", "album_id": "loopin", "bar_id": "loopin", "name": "射手·最后一杯", "rarity": "SSR", "lore": "打烊前的最后一杯，永远留给远方。", "bonus_type": "xp", "bonus_value": 10, "icon": "♐"},
    # Citrus · 阳光露台
    {"id": "citrus_01", "album_id": "citrus", "bar_id": "citrus", "name": "柠檬", "rarity": "N", "lore": "酸是阳光的另一种说法。", "bonus_type": "shift_pay", "bonus_value": 1, "icon": "🍋"},
    {"id": "citrus_02", "album_id": "citrus", "bar_id": "citrus", "name": "青柠", "rarity": "N", "lore": "切半，挤汁，别把籽掉进去。", "bonus_type": "shift_pay", "bonus_value": 1, "icon": "🍈"},
    {"id": "citrus_03", "album_id": "citrus", "bar_id": "citrus", "name": "薄荷", "rarity": "N", "lore": "拍一下，香气才醒。", "bonus_type": "reputation", "bonus_value": 1, "icon": "🌿"},
    {"id": "citrus_04", "album_id": "citrus", "bar_id": "citrus", "name": "西柚", "rarity": "R", "lore": "苦一点，才像成年人。", "bonus_type": "shift_pay", "bonus_value": 2, "icon": "🍊"},
    {"id": "citrus_05", "album_id": "citrus", "bar_id": "citrus", "name": "橙花", "rarity": "R", "lore": "露台的风，从这一朵开始。", "bonus_type": "drop", "bonus_value": 1, "icon": "🌼"},
    {"id": "citrus_06", "album_id": "citrus", "bar_id": "citrus", "name": "遮阳棚", "rarity": "R", "lore": "下午三点的影子，归它管。", "bonus_type": "reputation", "bonus_value": 2, "icon": "⛱️"},
    {"id": "citrus_07", "album_id": "citrus", "bar_id": "citrus", "name": "露台", "rarity": "SR", "lore": "城市里最容易发呆的地方。", "bonus_type": "shift_pay", "bonus_value": 3, "icon": "🪴"},
    {"id": "citrus_08", "album_id": "citrus", "bar_id": "citrus", "name": "阿柑", "rarity": "SR", "lore": "她记得每一桌的名字，也记得谁没来。", "bonus_type": "xp", "bonus_value": 5, "icon": "💁"},
    {"id": "citrus_09", "album_id": "citrus", "bar_id": "citrus", "name": "Citrus Spritz", "rarity": "SSR", "lore": "气泡升起来的时候，夏天就开始了。", "bonus_type": "drop", "bonus_value": 3, "icon": "🍹"},
    # HiJack · 午夜派对
    {"id": "hijack_01", "album_id": "hijack", "bar_id": "hijack", "name": "迪斯科球", "rarity": "N", "lore": "它转一夜，也没人嫌它吵。", "bonus_type": "reputation", "bonus_value": 1, "icon": "🪩"},
    {"id": "hijack_02", "album_id": "hijack", "bar_id": "hijack", "name": "Shot 杯", "rarity": "N", "lore": "一口，别想太多。", "bonus_type": "shift_pay", "bonus_value": 1, "icon": "🥃"},
    {"id": "hijack_03", "album_id": "hijack", "bar_id": "hijack", "name": "DJ 台", "rarity": "N", "lore": "低音一响，地板先动。", "bonus_type": "reputation", "bonus_value": 1, "icon": "🎛️"},
    {"id": "hijack_04", "album_id": "hijack", "bar_id": "hijack", "name": "涂鸦", "rarity": "R", "lore": "墙上的字，比菜单诚实。", "bonus_type": "drop", "bonus_value": 1, "icon": "🎨"},
    {"id": "hijack_05", "album_id": "hijack", "bar_id": "hijack", "name": "失物招领", "rarity": "R", "lore": "每一件失物，都有一个没讲完的夜晚。", "bonus_type": "shards", "bonus_value": 2, "icon": "🧳"},
    {"id": "hijack_06", "album_id": "hijack", "bar_id": "hijack", "name": "拖把", "rarity": "R", "lore": "凌晨三点，它才是主角。", "bonus_type": "shift_pay", "bonus_value": 2, "icon": "🧹"},
    {"id": "hijack_07", "album_id": "hijack", "bar_id": "hijack", "name": "舞池", "rarity": "SR", "lore": "谁都不认识谁，但都在同一个拍子上。", "bonus_type": "xp", "bonus_value": 5, "icon": "🕺"},
    {"id": "hijack_08", "album_id": "hijack", "bar_id": "hijack", "name": "老 K", "rarity": "SR", "lore": "他放的不是歌，是别人的青春。", "bonus_type": "reputation", "bonus_value": 3, "icon": "🎧"},
    {"id": "hijack_09", "album_id": "hijack", "bar_id": "hijack", "name": "打烊灯", "rarity": "SSR", "lore": "灯一亮，故事就该散了。", "bonus_type": "drop", "bonus_value": 3, "icon": "💡"},
    # Factory · 精酿机器
    {"id": "factory_01", "album_id": "factory", "bar_id": "factory", "name": "麦芽", "rarity": "N", "lore": "发芽、烘干、磨碎，急不得。", "bonus_type": "shift_pay", "bonus_value": 1, "icon": "🌾"},
    {"id": "factory_02", "album_id": "factory", "bar_id": "factory", "name": "酒花", "rarity": "N", "lore": "苦味是它的脾气，香气是它的温柔。", "bonus_type": "reputation", "bonus_value": 1, "icon": "🌿"},
    {"id": "factory_03", "album_id": "factory", "bar_id": "factory", "name": "木桶", "rarity": "N", "lore": "木头会呼吸，酒会记住。", "bonus_type": "shift_pay", "bonus_value": 1, "icon": "🛢️"},
    {"id": "factory_04", "album_id": "factory", "bar_id": "factory", "name": "发酵罐", "rarity": "R", "lore": "咕嘟咕嘟，是工厂的心跳。", "bonus_type": "drop", "bonus_value": 1, "icon": "🏭"},
    {"id": "factory_05", "album_id": "factory", "bar_id": "factory", "name": "管道", "rarity": "R", "lore": "每一根管子，都通向一杯酒。", "bonus_type": "reputation", "bonus_value": 2, "icon": "🔧"},
    {"id": "factory_06", "album_id": "factory", "bar_id": "factory", "name": "叉车", "rarity": "R", "lore": "拐弯要慢，酒比货重。", "bonus_type": "shift_pay", "bonus_value": 2, "icon": "🚜"},
    {"id": "factory_07", "album_id": "factory", "bar_id": "factory", "name": "老麦", "rarity": "SR", "lore": "他尝一口，就知道哪一桶能出门。", "bonus_type": "xp", "bonus_value": 5, "icon": "🍺"},
    {"id": "factory_08", "album_id": "factory", "bar_id": "factory", "name": "工厂门", "rarity": "SR", "lore": "门一开，麦香先出来。", "bonus_type": "reputation", "bonus_value": 3, "icon": "🚪"},
    {"id": "factory_09", "album_id": "factory", "bar_id": "factory", "name": "蒸汽", "rarity": "SSR", "lore": "整条街最诚实的声音。", "bonus_type": "drop", "bonus_value": 3, "icon": "💨"},
    # Street · 时光街
    {"id": "street_01", "album_id": "street", "bar_id": "street", "name": "路灯", "rarity": "N", "lore": "它比谁都清楚，谁最后走。", "bonus_type": "shift_pay", "bonus_value": 1, "icon": "💡"},
    {"id": "street_02", "album_id": "street", "bar_id": "street", "name": "流浪猫", "rarity": "N", "lore": "它不属于任何一家店，但每家都喂它。", "bonus_type": "reputation", "bonus_value": 1, "icon": "🐈"},
    {"id": "street_03", "album_id": "street", "bar_id": "street", "name": "老单车", "rarity": "N", "lore": "车铃响的时候，街区还年轻。", "bonus_type": "shift_pay", "bonus_value": 1, "icon": "🚲"},
    {"id": "street_04", "album_id": "street", "bar_id": "street", "name": "电话亭", "rarity": "R", "lore": "现在没人打电话，但有人躲雨。", "bonus_type": "drop", "bonus_value": 1, "icon": "☎️"},
    {"id": "street_05", "album_id": "street", "bar_id": "street", "name": "四店合影", "rarity": "R", "lore": "四扇门都亮着，才算一个晚上。", "bonus_type": "reputation", "bonus_value": 2, "icon": "📸"},
    {"id": "street_06", "album_id": "street", "bar_id": "street", "name": "雨夜", "rarity": "R", "lore": "雨把霓虹拉长，也把话变多。", "bonus_type": "shift_pay", "bonus_value": 2, "icon": "🌧️"},
    {"id": "street_07", "album_id": "street", "bar_id": "street", "name": "路牌", "rarity": "SR", "lore": "你在这里，故事也在这里。", "bonus_type": "xp", "bonus_value": 5, "icon": "🪧"},
    {"id": "street_08", "album_id": "street", "bar_id": "street", "name": "老邻居", "rarity": "SR", "lore": "她记得每一家店换过几次老板。", "bonus_type": "reputation", "bonus_value": 3, "icon": "👵"},
    {"id": "street_09", "album_id": "street", "bar_id": "street", "name": "街区全景", "rarity": "SSR", "lore": "一条街，四家店，很多人。", "bonus_type": "drop", "bonus_value": 3, "icon": "🏙️"},
]

TASKS: list[dict[str, Any]] = [
    {
        "id": "shift_2",
        "title": "连上两班",
        "description": "今天完成 2 个班次。",
        "target": 2,
        "metric": "shifts",
        "reward_coins": 200,
        "reward_shards": 10,
        "reward_pack_credits": 0,
        "icon": "⚡",
    },
    {
        "id": "bars_2",
        "title": "巡街打工",
        "description": "在 2 家不同的酒吧各完成 1 个班次。",
        "target": 2,
        "metric": "bars",
        "reward_coins": 0,
        "reward_shards": 0,
        "reward_pack_credits": 1,
        "icon": "🏙️",
    },
    {
        "id": "pack_1",
        "title": "开个卡包",
        "description": "今天打开 1 个卡包。",
        "target": 1,
        "metric": "packs",
        "reward_coins": 100,
        "reward_shards": 0,
        "reward_pack_credits": 0,
        "icon": "🃏",
    },
]

ALBUM_MILESTONES: list[dict[str, Any]] = [
    {"threshold": 3, "label": "集齐 3 张", "coins": 200, "shards": 0, "pack_credits": 0},
    {"threshold": 5, "label": "集齐 5 张", "coins": 0, "shards": 20, "pack_credits": 1},
    {"threshold": 7, "label": "集齐 7 张", "coins": 0, "shards": 0, "pack_credits": 3},
    {"threshold": 9, "label": "集齐整册", "coins": 0, "shards": 100, "pack_credits": 0},
]

RARITY_WEIGHTS: dict[str, int] = {"N": 60, "R": 28, "SR": 10, "SSR": 2}
RARITY_SHARDS: dict[str, int] = {"N": 2, "R": 5, "SR": 12, "SSR": 30}
RARITY_ORDER = ("N", "R", "SR", "SSR")

BAR_BY_ID = {bar["id"]: bar for bar in BARS}
ROLE_BY_ID = {role["id"]: role for role in ROLES}
ALBUM_BY_ID = {album["id"]: album for album in ALBUMS}
CARD_BY_ID = {card["id"]: card for card in CARDS}
TASK_BY_ID = {task["id"]: task for task in TASKS}
CARDS_BY_ALBUM: dict[str, list[dict[str, Any]]] = {
    album["id"]: [card for card in CARDS if card["album_id"] == album["id"]] for album in ALBUMS
}

SHIFTS_PER_DAY = 3
FREE_PACKS_PER_DAY = 1
COIN_PACKS_PER_DAY = 2
COIN_PACK_COSTS = (200, 400)
EXCHANGE_SHARD_COST = 40
BAR_VOUCHER_COOLDOWN_DAYS = 90
STREET_VOUCHER_COOLDOWN_DAYS = 365
CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
