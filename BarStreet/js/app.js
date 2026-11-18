/* BarStreet single-page app: pixel street, four bars, shifts, albums, packs, vouchers. */
(function () {
  "use strict";

  const API = window.BarStreetAPI;
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");

  const state = {
    meta: null,
    street: null,
    albums: null,
    tasks: null,
    packs: null,
    redeem: null,
    albumIndex: 0,
    packAlbum: "loopin",
    toastTimer: null,
  };

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function attr(value) { return escapeHtml(value); }
  function pct(value, total) { return Math.max(0, Math.min(100, Math.round((value / Math.max(1, total)) * 100))); }
  function money(value) { return Number(value || 0).toLocaleString("zh-CN"); }

  function toast(message, kind) {
    toastEl.textContent = message;
    toastEl.className = "toast show " + (kind || "");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { toastEl.className = "toast"; }, 2600);
  }

  function loadingHtml(text) {
    return '<div class="loading"><div class="spinner"></div><div>' + escapeHtml(text || "正在加载…") + "</div></div>";
  }

  function handleError(err) {
    if (err && err.status === 401) {
      API.clearPassport();
      state.street = null;
      renderWelcome("护照已失效，请重新领取或用恢复码找回。");
      return;
    }
    toast((err && err.message) || "出了点小问题，再试一次", "err");
  }

  async function ensureMeta() {
    if (state.meta) return state.meta;
    state.meta = await API.request("/meta");
    return state.meta;
  }

  function navigate(hash) {
    if (location.hash === hash) renderRoute();
    else location.hash = hash;
  }

  // ------------------------------------------------------------------ chrome
  function bottomNav(active) {
    const items = [
      ["street", "#/street", "街区", "🏙️"],
      ["albums", "#/albums", "卡册", "🃏"],
      ["tasks", "#/tasks", "任务", "✅"],
      ["redeem", "#/redeem", "兑换", "🎟️"],
      ["me", "#/me", "我的", "👤"],
    ];
    return '<nav class="bottom-nav">' + items.map(function (item) {
      return '<button class="nav-item ' + (item[0] === active ? "active" : "") + '" data-go="' + item[1] + '">' +
        '<span class="nav-icon">' + item[3] + '</span><span>' + item[2] + "</span></button>";
    }).join("") + "</nav>";
  }

  function page(content, active) {
    app.innerHTML = '<div class="shell">' + content + bottomNav(active) +
      '<div class="footer-note">时光街区 · 四间酒吧 · 18+ · 不劝酒</div></div>';
  }

  function hud(user, extra) {
    const u = user || (state.street && state.street.user);
    if (!u) return "";
    return '<div class="hud">' +
      '<div class="hud-stats">' +
        '<span class="stat">🪙 <b>' + money(u.coins) + "</b></span>" +
        '<span class="stat">🧩 <b>' + money(u.shards) + "</b></span>" +
        '<span class="stat">🃏 <b>' + money(u.pack_credits) + "</b></span>" +
      "</div>" +
      '<div class="hud-right">' +
        (extra ? '<span class="level-chip">' + escapeHtml(extra) + "</span>" : "") +
        '<span class="level-chip">Lv.' + u.level + "</span>" +
      "</div>" +
    "</div>";
  }

  function openModal(html, onClose) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = '<div class="modal"><button type="button" class="modal-close" aria-label="关闭">×</button>' + html + "</div>";
    document.body.appendChild(overlay);
    const close = function () {
      overlay.remove();
      if (onClose) onClose();
    };
    overlay.addEventListener("click", function (event) { if (event.target === overlay) close(); });
    $(".modal-close", overlay).addEventListener("click", close);
    return { overlay: overlay, close: close };
  }

  function bindGo(root) {
    $$("[data-go]", root || app).forEach(function (el) {
      el.addEventListener("click", function () { navigate(el.dataset.go); });
    });
  }

  function timeText(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    } catch (_err) { return iso; }
  }

  // ---------------------------------------------------------------- isometric street
  // The rainy isometric street map lives in js/street-map.js (window.BarStreetMap).

  // ---------------------------------------------------------------- welcome
  function renderWelcome(message) {
    app.innerHTML = '<div class="welcome">' +
      '<div class="welcome-sky"></div>' +
      '<div class="welcome-sign">时光街区</div>' +
      '<div class="welcome-sub">白天在四家酒吧打工，集齐酒标；晚上到店，把酒标换成一杯真的鸡尾酒。</div>' +
      '<div class="welcome-card panel">' +
        '<div class="welcome-street"><div class="welcome-buildings">' +
          '<div class="welcome-block"></div><div class="welcome-block"></div>' +
          '<div class="welcome-block"></div><div class="welcome-block"></div>' +
        "</div></div>" +
        '<div class="field"><label>给自己起个夜班名字</label>' +
          '<input id="nickname" class="input" maxlength="24" placeholder="例如：夜班新人" autocomplete="nickname"></div>' +
        '<button id="create-passport" class="pixel-btn primary block">领取酒馆护照</button>' +
        '<div class="small muted center" style="margin-top:8px">匿名护照，不需要手机号 · 18+</div>' +
        '<details style="margin-top:10px"><summary class="small muted">我有恢复码</summary>' +
          '<div class="field"><label>恢复码</label><input id="recovery-code" class="input" placeholder="XXXX-XXXX" autocomplete="off"></div>' +
          '<button id="restore-passport" class="pixel-btn block">恢复护照</button>' +
        "</details>" +
      "</div>" +
      (message ? '<div class="panel small">' + escapeHtml(message) + "</div>" : "") +
      '<div class="footer-note">Loopin · Citrus · HiJack · 工厂</div>' +
    "</div>";

    const createBtn = $("#create-passport");
    createBtn.addEventListener("click", async function () {
      createBtn.disabled = true;
      try {
        const nickname = ($("#nickname").value || "").trim();
        const data = await API.request("/passport", { method: "POST", body: { nickname: nickname } });
        API.setPassport({ passport_id: data.passport_id, recovery_code: data.recovery_code, nickname: data.nickname });
        showRecovery(data);
      } catch (err) {
        handleError(err);
      } finally {
        createBtn.disabled = false;
      }
    });

    $("#restore-passport").addEventListener("click", async function () {
      const input = $("#recovery-code");
      const code = (input.value || "").trim();
      if (!code) { toast("请输入恢复码", "err"); return; }
      try {
        const data = await API.request("/passport/restore", { method: "POST", body: { recovery_code: code } });
        API.setPassport({ passport_id: data.passport_id, nickname: data.nickname });
        toast("护照已恢复", "ok");
        navigate("#/street");
      } catch (err) {
        handleError(err);
      }
    });
  }

  function showRecovery(data) {
    const modal = openModal(
      "<h3>护照已创建</h3>" +
      "<p>这是你的恢复码。换手机或清了浏览器缓存时，用它找回全部进度。</p>" +
      '<div class="code-box">' + escapeHtml(data.recovery_code) + "</div>" +
      '<p class="small">请截图或抄下来。我们不会收集手机号，所以恢复码丢了就找不回。</p>' +
      '<div class="modal-actions">' +
        '<button type="button" class="pixel-btn" data-copy>复制恢复码</button>' +
        '<button type="button" class="pixel-btn primary" data-enter>进入街区</button>' +
      "</div>"
    );
    $("[data-copy]", modal.overlay).addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(data.recovery_code);
        toast("恢复码已复制", "ok");
      } catch (_err) {
        toast("复制失败，请手动抄写", "err");
      }
    });
    $("[data-enter]", modal.overlay).addEventListener("click", function () {
      modal.close();
      navigate("#/street");
    });
  }

  // ----------------------------------------------------------------- street
  async function renderStreet() {
    app.innerHTML = loadingHtml("正在点亮街灯…");
    try {
      const results = await Promise.all([API.request("/street"), ensureMeta()]);
      const street = results[0];
      state.street = street;
      const user = street.user;
      const daily = street.daily;

      page(
        hud(user, "班次 " + daily.shifts_left + "/" + daily.shifts_limit) +
        '<div class="iso-caption"><span>☔ 雨夜 · 街区营业中</span><span>滚轮/双指缩放 · 放大后拖动</span></div>' +
        window.BarStreetMap.scene(street.bars),
        "street"
      );

      window.BarStreetMap.init(app);
      bindGo(app);
      $$("[data-bar]", app).forEach(function (el) {
        const go = function () { navigate("#/bar/" + encodeURIComponent(el.dataset.bar)); };
        el.addEventListener("click", go);
        if (el.tagName && el.tagName.toLowerCase() === "g") {
          el.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              go();
            }
          });
        }
      });
    } catch (err) {
      handleError(err);
    }
  }

  // -------------------------------------------------------------------- bar
  async function renderBar(barId) {
    app.innerHTML = loadingHtml("正在推开店门…");
    try {
      const data = await API.request("/bars/" + encodeURIComponent(barId));
      const bar = data.bar;
      const daily = state.street && state.street.daily;
      const shiftsLeft = daily ? daily.shifts_left : null;
      const upgradeCost = 300 * bar.level;
      const canUpgrade = bar.level < 10 && data.user.coins >= upgradeCost;
      const roles = data.roles.map(function (role) {
        const disabled = shiftsLeft !== null && shiftsLeft <= 0;
        const xpPct = pct(role.xp, role.next_xp);
        return '<div class="role-card">' +
          '<div class="role-head">' +
            '<div class="role-icon">' + role.icon + "</div>" +
            '<div class="grow"><div class="role-name">' + escapeHtml(role.name) + "</div>" +
              '<div class="role-desc">' + escapeHtml(role.description) + "</div></div>" +
            '<div class="role-badges">' +
              (role.primary ? '<span class="badge hot">本店招牌</span>' : "") +
              (role.featured ? '<span class="badge hot">今日 +50%</span>' : "") +
            "</div>" +
          "</div>" +
          '<div class="role-foot">' +
            '<div class="progress-bar"><div class="progress-fill mint" style="width:' + xpPct + '%"></div></div>' +
            '<span class="small mono">Lv.' + role.level + "</span>" +
            '<button type="button" class="pixel-btn small primary" data-shift-role="' + attr(role.id) + '"' +
              (disabled ? " disabled" : "") + ">上工</button>" +
          "</div>" +
        "</div>";
      }).join("");

      page(
        hud(data.user, shiftsLeft === null ? "" : "班次 " + shiftsLeft + "/" + (daily ? daily.shifts_limit : 3)) +
        '<div class="bar-hero" style="--bar-color:' + attr(bar.color) + ';--bar-accent:' + attr(bar.accent) + '">' +
          '<div class="bar-hero-top"><div class="bar-icon">' + bar.icon + "</div>" +
            '<div class="grow"><h2 class="bar-title">' + escapeHtml(bar.name) + "</h2>" +
              '<div class="bar-sub">' + escapeHtml(bar.subtitle) + " · " + escapeHtml(bar.tagline) + "</div></div>" +
          "</div>" +
          '<div class="bar-stats">' +
            '<span class="bar-stat">招牌 <b>' + escapeHtml(bar.signature) + "</b></span>" +
            '<span class="bar-stat">店铺 <b>Lv.' + bar.level + "</b></span>" +
            '<span class="bar-stat">口碑 <b>' + bar.reputation + "</b></span>" +
            '<span class="bar-stat">卡册 <b>' + data.album.owned + "/" + data.album.total + "</b></span>" +
          "</div>" +
        "</div>" +
        '<div class="panel"><div class="panel-title">选择岗位 <small>今日招牌：' + escapeHtml(data.featured_role_name) + " +50%</small></div>" +
          '<div class="role-list">' + roles + "</div>" +
          (shiftsLeft !== null && shiftsLeft <= 0
            ? '<div class="small muted" style="margin-top:8px">今天的班次已经用完了，明天再来。</div>'
            : "") +
        "</div>" +
        '<div class="panel"><div class="panel-title">经营店铺 <small>Lv.' + bar.level + " / 10</small></div>" +
          '<div class="small muted" style="line-height:1.7">升级设备、装修和菜单，提升本店班次工资与接待能力。</div>' +
          '<button type="button" class="pixel-btn primary block" data-upgrade="' + attr(bar.id) + '"' +
            (canUpgrade ? "" : " disabled") + ">" +
            (bar.level >= 10 ? "已经满级" : "升级店铺 · " + upgradeCost + " 营业币") +
          "</button>" +
          (bar.level < 10 && data.user.coins < upgradeCost
            ? '<div class="small muted" style="margin-top:6px">还差 ' + (upgradeCost - data.user.coins) + " 营业币，去上几班吧。</div>"
            : "") +
        "</div>" +
        '<div class="panel"><div class="panel-title">酒单 <small>' + bar.menu.length + " 款</small></div>" +
          '<div class="menu-list">' + bar.menu.map(function (item) {
            return '<div class="menu-item"><span>' + escapeHtml(item) + '</span><span>今晚供应</span></div>';
          }).join("") + "</div>" +
        "</div>" +
        '<div class="panel"><div class="panel-title">到店玩法</div>' +
          '<div class="small muted" style="line-height:1.7">' + escapeHtml(toStoreGame(bar.id)) + "</div>" +
        "</div>" +
        '<div class="wrap"><button type="button" class="pixel-btn grow" data-go="#/albums">查看本店卡册</button>' +
          '<button type="button" class="pixel-btn grow" data-go="#/street">回街区</button></div>',
        "street"
      );

      bindGo(app);
      $$("[data-shift-role]", app).forEach(function (btn) {
        btn.addEventListener("click", function () {
          navigate("#/shift/" + encodeURIComponent(bar.id) + "/" + encodeURIComponent(btn.dataset.shiftRole));
        });
      });
      $$("[data-upgrade]", app).forEach(function (btn) {
        btn.addEventListener("click", async function () {
          btn.disabled = true;
          try {
            const result = await API.request("/bars/" + encodeURIComponent(bar.id) + "/upgrade", { method: "POST" });
            if (state.street) state.street.user = result.user;
            toast(result.bar_name + " 升到 Lv." + result.level, "ok");
            renderBar(bar.id);
          } catch (err) {
            handleError(err);
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      handleError(err);
    }
  }

  function toStoreGame(barId) {
    return {
      loopin: "扫 BarAR 星座卡，SARA 会从卡片里走出来；集章可换星座酒标。",
      citrus: "和同桌玩「两真一假 / 同桌默契考」，赢的人先点下一轮。",
      hijack: "整点看大屏：摇一摇赛马、同步干杯，输的人负责去拿纸巾。",
      factory: "驻场乐队间隙玩 Bar Trivia / 歌词猎人，答对送小食。",
    }[barId] || "到店扫码，和同桌玩一局。";
  }

  // ------------------------------------------------------------------ shift
  async function renderShift(barId, roleId) {
    await ensureMeta();
    const bar = state.meta.bars.find(function (item) { return item.id === barId; });
    const role = state.meta.roles.find(function (item) { return item.id === roleId; });
    if (!bar || !role) { toast("岗位不存在", "err"); navigate("#/street"); return; }

    app.innerHTML = loadingHtml("正在准备班次…");
    let started;
    try {
      started = await API.request("/shifts/start", {
        method: "POST",
        body: { bar_id: barId, role_id: roleId },
      });
    } catch (err) {
      toast(err.message, "err");
      navigate("#/bar/" + encodeURIComponent(barId));
      return;
    }

    const gameRoot = document.createElement("div");
    app.innerHTML = "";
    app.appendChild(gameRoot);

    window.BarStreetGames.start(role.game, gameRoot, async function (result) {
      if (result.abandoned) {
        try { await API.request("/shifts/abandon", { method: "POST", body: { shift_token: started.shift_token } }); } catch (_err) { /* ignore */ }
        navigate("#/bar/" + encodeURIComponent(barId));
        return;
      }
      app.innerHTML = loadingHtml("正在结算工资…");
      try {
        const settlement = await API.request("/shifts/complete", {
          method: "POST",
          body: { shift_token: started.shift_token, score: result.score },
        });
        if (state.street) {
          state.street.user = settlement.user;
          if (state.street.daily) {
            state.street.daily.shifts_left = settlement.shifts_left;
            state.street.daily.shifts_done = state.street.daily.shifts_limit - settlement.shifts_left;
          }
        }
        renderSettlement(settlement, bar, role);
      } catch (err) {
        toast(err.message, "err");
        navigate("#/bar/" + encodeURIComponent(barId));
      }
    });
  }

  function renderSettlement(data, bar, role) {
    const card = data.card;
    const milestones = (data.milestones || []).map(function (item) {
      return '<div class="featured-row"><span class="dot"></span><span class="grow">' + escapeHtml(item.label) + "</span>" +
        '<span class="small mono">+' + item.coins + " 币 / +" + item.shards + " 碎片</span></div>";
    }).join("");
    app.innerHTML = '<div class="shell">' +
      '<div class="panel">' +
        '<div class="panel-title">' + (data.perfect ? "完美收工！" : "收工！") + " <small>" + escapeHtml(bar.name) + " · " + escapeHtml(role.name) + "</small></div>" +
        '<div class="center" style="padding:8px 0"><div class="mono" style="font-size:42px;color:var(--amber-2)">' + data.score + "</div>" +
          '<div class="small muted">本班评分</div></div>' +
        '<div class="me-grid">' +
          '<div class="me-stat"><span>工资</span><b>+' + data.coins + "</b></div>" +
          '<div class="me-stat"><span>口碑</span><b>+' + data.reputation + "</b></div>" +
          '<div class="me-stat"><span>经验</span><b>+' + data.xp + "</b></div>" +
          '<div class="me-stat"><span>剩余班次</span><b>' + data.shifts_left + "</b></div>" +
        "</div>" +
        '<div class="small muted" style="margin-top:8px">' + escapeHtml(role.name) + " Lv." + data.role_level +
          " · " + escapeHtml(bar.name) + " Lv." + data.bar_level + " · 护照 Lv." + data.passport_level + "</div>" +
        (data.pack_credit ? '<div class="badge new" style="margin-top:8px">获得 1 个班次卡包</div>' : "") +
      "</div>" +
      (card ? '<div class="panel"><div class="panel-title">' + (card.new ? "新卡入册" : "重复卡") + " <small>" + card.rarity + "</small></div>" +
        '<div class="reveal-card"><div class="big-icon">' + card.icon + "</div>" +
          '<div class="big-name">' + escapeHtml(card.name) + "</div>" +
          '<div class="small muted">' + (card.new ? "已收入卡册" : "转化为 " + card.shards + " 个旧时光碎片") + "</div>" +
        "</div></div>" : "") +
      (milestones ? '<div class="panel"><div class="panel-title">卡册里程碑</div>' + milestones + "</div>" : "") +
      '<div class="wrap">' +
        '<button type="button" class="pixel-btn primary grow" data-go="#/bar/' + encodeURIComponent(bar.id) + '">再上一班</button>' +
        '<button type="button" class="pixel-btn grow" data-go="#/street">回街区</button>' +
      "</div>" +
      '<button type="button" class="pixel-btn block" data-go="#/albums" style="margin-top:8px">看卡册</button>' +
    "</div>";
    bindGo(app);
  }

  // ----------------------------------------------------------------- albums
  async function renderAlbums() {
    app.innerHTML = loadingHtml("正在翻卡册…");
    try {
      const data = await API.request("/albums");
      state.albums = data;
      const albums = data.albums;
      const index = Math.min(state.albumIndex, albums.length - 1);
      state.albumIndex = index;
      const album = albums[index];
      const user = state.street ? state.street.user : { coins: 0, shards: data.shards, pack_credits: 0, level: 1 };
      user.shards = data.shards;

      page(
        hud(user, "碎片 " + data.shards) +
        '<div class="section-title">卡册 <small>集齐一本，到店换一杯</small></div>' +
        '<div class="album-tabs">' + albums.map(function (item, idx) {
          return '<button type="button" class="album-tab ' + (idx === index ? "active" : "") + '" data-album="' + idx + '">' +
            item.icon + " " + escapeHtml(item.name) + "</button>";
        }).join("") + "</div>" +
        '<div class="panel">' +
          '<div class="album-head"><div class="album-icon">' + album.icon + "</div>" +
            "<div><h3>" + escapeHtml(album.name) + "</h3><p>" + escapeHtml(album.subtitle) + "</p></div></div>" +
          '<div class="album-progress"><div class="row"><span>收集进度</span><span class="mono">' + album.owned + "/" + album.total + "</span></div>" +
            '<div class="progress-bar"><div class="progress-fill" style="width:' + pct(album.owned, album.total) + '%"></div></div></div>' +
          '<div class="milestones">' + album.milestones.map(function (item) {
            return '<div class="milestone ' + (item.claimed ? "done" : "") + '"><b>' + item.threshold + "/9</b>" +
              escapeHtml(item.label) + (item.claimed ? " ✓" : "") + "</div>";
          }).join("") + "</div>" +
          '<div class="card-grid">' + album.cards.map(cardHtml).join("") + "</div>" +
          '<div class="wrap" style="margin-top:10px">' +
            '<button type="button" class="pixel-btn primary grow" data-go="#/packs">去开包</button>' +
            '<button type="button" class="pixel-btn grow" data-go="#/redeem">去兑换</button>' +
          "</div>" +
        "</div>",
        "albums"
      );

      bindGo(app);
      $$("[data-album]", app).forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.albumIndex = Number(btn.dataset.album);
          renderAlbums();
        });
      });
      $$("[data-card]", app).forEach(function (btn) {
        btn.addEventListener("click", function () {
          const card = album.cards.find(function (item) { return item.id === btn.dataset.card; });
          if (card) showCardModal(album, card, data.shards);
        });
      });
    } catch (err) {
      handleError(err);
    }
  }

  function cardHtml(card) {
    const locked = !card.owned;
    return '<button type="button" class="card ' + card.rarity + (locked ? " locked" : "") + '" data-card="' + attr(card.id) + '">' +
      (card.count > 1 ? '<span class="card-count">×' + card.count + "</span>" : "") +
      '<span class="card-icon">' + (locked ? "❔" : card.icon) + "</span>" +
      '<span class="card-name">' + (locked ? "？？？" : escapeHtml(card.name)) + "</span>" +
      '<span class="card-rarity">' + card.rarity + "</span>" +
    "</button>";
  }

  function showCardModal(album, card, shards) {
    const owned = card.owned;
    const canExchange = !owned && shards >= 40;
    const modal = openModal(
      '<div class="reveal-card">' +
        '<div class="big-icon">' + (owned ? card.icon : "❔") + "</div>" +
        '<div class="big-name">' + (owned ? escapeHtml(card.name) : "未收集") + "</div>" +
        '<div class="big-rarity" style="color:' + rarityColor(card.rarity) + '">' + card.rarity + "</div>" +
        '<div class="big-lore">' + (owned ? escapeHtml(card.lore) : "集齐卡册后，这张卡会出现在你的护照里。") + "</div>" +
        (owned ? '<div class="badge">已拥有 ×' + card.count + "</div>" : "") +
      "</div>" +
      '<div class="modal-actions">' +
        (canExchange ? '<button type="button" class="pixel-btn primary" data-exchange>用 40 碎片兑换</button>' : "") +
        '<button type="button" class="pixel-btn" data-close>关闭</button>' +
      "</div>"
    );
    $("[data-close]", modal.overlay).addEventListener("click", modal.close);
    const exchangeBtn = $("[data-exchange]", modal.overlay);
    if (exchangeBtn) {
      exchangeBtn.addEventListener("click", async function () {
        exchangeBtn.disabled = true;
        try {
          await API.request("/albums/" + encodeURIComponent(album.id) + "/exchange", {
            method: "POST",
            body: { card_id: card.id },
          });
          toast("兑换成功，新卡已入册", "ok");
          modal.close();
          renderAlbums();
        } catch (err) {
          handleError(err);
          exchangeBtn.disabled = false;
        }
      });
    }
  }

  function rarityColor(rarity) {
    return { N: "#9d96ae", R: "#7fb7ef", SR: "#d39bef", SSR: "#ffd166" }[rarity] || "#9d96ae";
  }

  // ------------------------------------------------------------------ packs
  async function renderPacks() {
    app.innerHTML = loadingHtml("正在整理卡包…");
    try {
      const data = await API.request("/packs");
      state.packs = data;
      const albums = data.albums;
      if (!albums.some(function (item) { return item.id === state.packAlbum; })) state.packAlbum = albums[0].id;
      const album = albums.find(function (item) { return item.id === state.packAlbum; });
      const cost = data.coin_packs_left >= 2 ? data.coin_pack_costs[0] : data.coin_pack_costs[1];
      const user = state.street ? state.street.user : { coins: data.coins, shards: 0, pack_credits: data.pack_credits, level: 1 };

      page(
        hud(user, "班次卡包 " + data.pack_credits) +
        '<div class="section-title">开卡包 <small>不卖真钱卡包</small></div>' +
        '<div class="panel">' +
          '<div class="panel-title">选择卡册 <small>' + escapeHtml(album.name) + "</small></div>" +
          '<div class="album-picker">' + albums.map(function (item) {
            return '<button type="button" class="album-pick ' + (item.id === state.packAlbum ? "active" : "") + '" data-pack-album="' + attr(item.id) + '">' +
              item.icon + " " + escapeHtml(item.name) + "</button>";
          }).join("") + "</div>" +
          '<div class="pack-grid">' +
            packOption("free", "🎁", "每日免费卡包", data.free_available ? "今天还有 1 个" : "今天已领完", data.free_available) +
            packOption("coins", "🪙", "营业币卡包 · " + cost + " 币", "今天还可买 " + data.coin_packs_left + " 个 · 你有 " + data.coins + " 币", data.coin_packs_left > 0 && data.coins >= cost) +
            packOption("shift", "🃏", "班次卡包", "可用 " + data.pack_credits + " 个 · 每 3 个班次获得 1 个", data.pack_credits > 0) +
          "</div>" +
          '<div class="small muted" style="margin-top:8px;line-height:1.7">概率：N 60% · R 28% · SR 10% · SSR 2%。每 10 包保底 SR+，每 20 包保底未拥有卡。重复卡自动转旧时光碎片（N+2 / R+5 / SR+12 / SSR+30）。</div>' +
        "</div>" +
        '<div class="panel"><div class="panel-title">小提示</div><div class="small muted" style="line-height:1.7">' +
          "卡包是集卡的主要来源，但不是兑换酒券的唯一路径：集齐一本 9 张卡，就能在该店生成一张单店酒券。" +
        "</div></div>",
        "street"
      );

      bindGo(app);
      $$("[data-pack-album]", app).forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.packAlbum = btn.dataset.packAlbum;
          renderPacks();
        });
      });
      $$("[data-open]", app).forEach(function (btn) {
        btn.addEventListener("click", function () { openPack(btn.dataset.open); });
      });
    } catch (err) {
      handleError(err);
    }
  }

  function packOption(source, icon, title, subtitle, enabled) {
    return '<div class="pack-card ' + (enabled ? "" : "disabled") + '">' +
      '<div class="p-icon">' + icon + "</div>" +
      '<div class="p-body"><div class="p-title">' + escapeHtml(title) + '</div><div class="p-sub">' + escapeHtml(subtitle) + "</div></div>" +
      '<button type="button" class="pixel-btn small ' + (enabled ? "primary" : "") + '" data-open="' + source + '"' + (enabled ? "" : " disabled") + ">开包</button>" +
    "</div>";
  }

  async function openPack(source) {
    try {
      const data = await API.request("/packs/open", {
        method: "POST",
        body: { source: source, album_id: state.packAlbum },
      });
      if (state.street) state.street.user = data.user;
      showReveal(data);
    } catch (err) {
      handleError(err);
    }
  }

  function showReveal(data) {
    const card = data.card;
    const newText = card.new ? "新卡入册" : "重复卡 → " + card.shards + " 碎片";
    const milestones = (data.milestones || []).map(function (item) {
      return '<div class="small muted">里程碑 ' + item.threshold + "/9：" + escapeHtml(item.label) + " · +" + item.coins + " 币 / +" + item.shards + " 碎片</div>";
    }).join("");
    const modal = openModal(
      '<div class="reveal-card">' +
        '<div class="big-icon">' + card.icon + "</div>" +
        '<div class="big-name">' + escapeHtml(card.name) + "</div>" +
        '<div class="big-rarity" style="color:' + rarityColor(card.rarity) + '">' + card.rarity + "</div>" +
        '<div class="big-lore">' + escapeHtml(card.lore) + "</div>" +
        '<div class="badge ' + (card.new ? "new" : "") + '">' + newText + "</div>" +
        '<div class="small muted">本册进度 ' + data.album.owned + "/" + data.album.total + (data.album.complete ? " · 已集齐！" : "") + "</div>" +
        (milestones ? '<div style="margin-top:6px">' + milestones + "</div>" : "") +
      "</div>" +
      '<div class="modal-actions">' +
        '<button type="button" class="pixel-btn primary" data-again>再开一个</button>' +
        '<button type="button" class="pixel-btn" data-albums>看卡册</button>' +
      "</div>",
      function () { renderPacks(); }
    );
    $("[data-again]", modal.overlay).addEventListener("click", function () { modal.close(); });
    $("[data-albums]", modal.overlay).addEventListener("click", function () { modal.close(); navigate("#/albums"); });
  }

  // ------------------------------------------------------------------ tasks
  async function renderTasks() {
    app.innerHTML = loadingHtml("正在看今天的班表…");
    try {
      const data = await API.request("/tasks");
      state.tasks = data;
      const user = state.street ? state.street.user : { coins: 0, shards: 0, pack_credits: 0, level: 1 };
      page(
        hud(user, "今日任务") +
        '<div class="section-title">今日任务 <small>' + escapeHtml(data.date) + "</small></div>" +
        data.tasks.map(function (task) {
          const done = task.progress >= task.target;
          const reward = [];
          if (task.reward.coins) reward.push(task.reward.coins + " 币");
          if (task.reward.shards) reward.push(task.reward.shards + " 碎片");
          if (task.reward.pack_credits) reward.push(task.reward.pack_credits + " 卡包");
          return '<div class="task-card">' +
            '<div class="task-head"><span class="task-icon">' + task.icon + "</span>" +
              '<div class="grow"><div class="task-title">' + escapeHtml(task.title) + '</div><div class="task-desc">' + escapeHtml(task.description) + "</div></div>" +
              '<span class="task-reward">' + reward.join(" · ") + "</span></div>" +
            '<div class="task-foot"><div class="progress-bar"><div class="progress-fill ' + (done ? "mint" : "") + '" style="width:' + pct(task.progress, task.target) + '%"></div></div>' +
              '<span class="small mono">' + task.progress + "/" + task.target + "</span>" +
              '<button type="button" class="pixel-btn small primary" data-claim="' + attr(task.id) + '"' +
                (done && !task.claimed ? "" : " disabled") + ">" + (task.claimed ? "已领取" : "领取") + "</button></div>" +
          "</div>";
        }).join(""),
        "tasks"
      );
      bindGo(app);
      $$("[data-claim]", app).forEach(function (btn) {
        btn.addEventListener("click", async function () {
          btn.disabled = true;
          try {
            const result = await API.request("/tasks/" + encodeURIComponent(btn.dataset.claim) + "/claim", { method: "POST" });
            if (state.street) state.street.user = result.user;
            toast("奖励已领取", "ok");
            renderTasks();
          } catch (err) {
            handleError(err);
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      handleError(err);
    }
  }

  // ----------------------------------------------------------------- redeem
  async function renderRedeem() {
    app.innerHTML = loadingHtml("正在准备酒券…");
    try {
      const data = await API.request("/redeem");
      state.redeem = data;
      const user = state.street ? state.street.user : { coins: 0, shards: data.shards, pack_credits: 0, level: 1 };
      user.shards = data.shards;
      const active = data.vouchers.filter(function (item) { return item.status === "active"; });
      const history = data.vouchers.filter(function (item) { return item.status !== "active"; });

      page(
        hud(user, "碎片 " + data.shards) +
        '<div class="section-title">兑换 <small>到店出示，店员核销</small></div>' +
        (active.length ? '<div class="section-title">有效酒券</div>' + active.map(voucherHtml).join("") : "") +
        (data.eligible.length
          ? '<div class="section-title">可兑换卡册</div>' + data.eligible.map(function (item) {
            return '<div class="redeem-card"><div class="r-title">' + escapeHtml(item.reward_name) + "</div>" +
              '<div class="r-sub">' + escapeHtml(item.reason) + " · 到店核销后失效</div>" +
              '<button type="button" class="pixel-btn primary block" data-redeem="' + attr(item.album_id) + '">生成酒券</button></div>';
          }).join("")
          : (active.length
            ? '<div class="panel"><div class="empty">有效酒券用掉后，如果还有集齐的卡册，就能再生成一张。</div></div>'
            : '<div class="panel"><div class="empty">还没有可兑换的卡册。<br>集齐一本 9 张卡，就能在这里生成一张单店酒券。</div></div>')) +
        '<div class="panel"><div class="panel-title">怎么用 <small>3 步</small></div>' +
          '<div class="small muted" style="line-height:1.8">1. 在店里打开本页，点「生成酒券」。<br>2. 把 6 位码出示给店员。<br>3. 店员在后台核销后上酒。酒券 5 分钟内有效，可重新生成。</div>' +
        "</div>" +
        (history.length ? '<div class="panel"><div class="panel-title">历史记录</div><div class="voucher-history">' +
          history.map(function (item) {
            return '<div class="voucher-history-row"><span>' + escapeHtml(item.reward_name) + "</span><span>" + escapeHtml(item.status) + " · " + timeText(item.redeemed_at || item.created_at) + "</span></div>";
          }).join("") + "</div></div>" : ""),
        "redeem"
      );

      bindGo(app);
      $$("[data-redeem]", app).forEach(function (btn) {
        btn.addEventListener("click", async function () {
          btn.disabled = true;
          try {
            const voucher = await API.request("/redeem", { method: "POST", body: { album_id: btn.dataset.redeem } });
            toast("酒券已生成，5 分钟内有效", "ok");
            await renderRedeem();
            showVoucher(voucher);
          } catch (err) {
            handleError(err);
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      handleError(err);
    }
  }

  function voucherHtml(voucher) {
    return '<div class="voucher"><div class="r-title">' + escapeHtml(voucher.reward_name) + "</div>" +
      '<div class="voucher-code">' + escapeHtml(voucher.code) + "</div>" +
      '<div class="voucher-meta">到店出示给店员 · 有效至 ' + timeText(voucher.expires_at) + " · " + escapeHtml(voucher.scope === "street" ? "街区通行证" : "单店酒券") + "</div></div>";
  }

  function showVoucher(voucher) {
    const modal = openModal(
      "<h3>酒券已生成</h3>" +
      '<div class="voucher"><div class="voucher-code">' + escapeHtml(voucher.code) + "</div>" +
      '<div class="voucher-meta">' + escapeHtml(voucher.reward_name) + " · 有效至 " + timeText(voucher.expires_at) + "</div></div>" +
      "<p>把 6 位码出示给店员，由店员核销。截图过期无效；如果过期，回到兑换页重新生成。</p>" +
      '<div class="modal-actions"><button type="button" class="pixel-btn primary" data-close>知道了</button></div>'
    );
    $("[data-close]", modal.overlay).addEventListener("click", modal.close);
  }

  // --------------------------------------------------------------------- me
  async function renderMe() {
    app.innerHTML = loadingHtml("正在翻你的护照…");
    try {
      if (!state.street) state.street = await API.request("/street");
      const street = state.street;
      const user = street.user;
      const saved = API.getPassport() || {};
      const roles = street.roles || [];
      page(
        hud(user) +
        '<div class="section-title">我的护照 <small>' + escapeHtml(user.nickname) + "</small></div>" +
        '<div class="panel">' +
          '<div class="me-grid">' +
            '<div class="me-stat"><span>营业币</span><b>' + money(user.coins) + "</b></div>" +
            '<div class="me-stat"><span>旧时光碎片</span><b>' + money(user.shards) + "</b></div>" +
            '<div class="me-stat"><span>班次卡包</span><b>' + money(user.pack_credits) + "</b></div>" +
            '<div class="me-stat"><span>护照等级</span><b>Lv.' + user.level + "</b></div>" +
          "</div>" +
          '<div class="field"><label>恢复码</label><div class="code-box">' + escapeHtml(saved.recovery_code || "未保存在本机") + "</div></div>" +
          '<div class="wrap"><button type="button" class="pixel-btn small" id="copy-code" ' + (saved.recovery_code ? "" : "disabled") + ">复制恢复码</button>" +
            '<button type="button" class="pixel-btn small" id="restore-btn">用恢复码找回</button></div>' +
          '<div class="small muted" style="margin-top:8px">匿名护照：不需要手机号；换设备时用恢复码找回。数据保存在店内服务器。</div>' +
        "</div>" +
        '<div class="panel"><div class="panel-title">岗位等级</div>' +
          roles.map(function (role) {
            return '<div class="role-level-row"><span>' + role.icon + " " + escapeHtml(role.name) + "</span><b>Lv." + role.level + " · " + role.xp + " XP</b></div>";
          }).join("") +
        "</div>" +
        '<div class="panel"><div class="panel-title">店铺等级</div>' +
          street.bars.map(function (bar) {
            return '<div class="role-level-row"><span>' + bar.icon + " " + escapeHtml(bar.name) + "</span><b>Lv." + bar.level + " · 口碑 " + bar.reputation + "</b></div>";
          }).join("") +
        "</div>" +
        '<div class="wrap">' +
          '<button type="button" class="pixel-btn grow" data-go="#/staff">店员入口</button>' +
          '<button type="button" class="pixel-btn grow" id="switch-account">切换账号</button>' +
        "</div>",
        "me"
      );

      bindGo(app);
      const copyBtn = $("#copy-code");
      if (copyBtn) copyBtn.addEventListener("click", async function () {
        try { await navigator.clipboard.writeText(saved.recovery_code); toast("恢复码已复制", "ok"); }
        catch (_err) { toast("复制失败，请手动抄写", "err"); }
      });
      $("#restore-btn").addEventListener("click", function () {
        const modal = openModal(
          "<h3>用恢复码找回</h3><p>输入创建护照时保存的 8 位恢复码。</p>" +
          '<div class="field"><label>恢复码</label><input id="restore-input" class="input" placeholder="XXXX-XXXX"></div>' +
          '<div class="modal-actions"><button type="button" class="pixel-btn primary" id="do-restore">找回</button></div>'
        );
        $("#do-restore", modal.overlay).addEventListener("click", async function () {
          const code = ($("#restore-input", modal.overlay).value || "").trim();
          if (!code) { toast("请输入恢复码", "err"); return; }
          try {
            const data = await API.request("/passport/restore", { method: "POST", body: { recovery_code: code } });
            API.setPassport({ passport_id: data.passport_id, nickname: data.nickname });
            state.street = null;
            modal.close();
            toast("护照已找回", "ok");
            navigate("#/street");
          } catch (err) { handleError(err); }
        });
      });
      $("#switch-account").addEventListener("click", function () {
        if (!window.confirm("切换账号会清空本机的护照记录，进度仍在店内服务器。继续？")) return;
        API.clearPassport();
        state.street = null;
        renderWelcome("已切换账号，请重新领取或恢复护照。");
      });
    } catch (err) {
      handleError(err);
    }
  }

  // ------------------------------------------------------------------ staff
  async function renderStaff() {
    app.innerHTML = loadingHtml("正在打开店员后台…");
    try {
      await ensureMeta();
      const bars = state.meta.bars;
      page(
        '<div class="section-title">店员后台 <small>核销酒券</small></div>' +
        '<div class="panel"><div class="staff-form">' +
          '<div class="field"><label>门店</label><select id="staff-bar" class="input">' +
            bars.map(function (bar) { return '<option value="' + attr(bar.id) + '">' + escapeHtml(bar.name) + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="field"><label>店员 PIN</label><input id="staff-pin" class="input" inputmode="numeric" placeholder="演示 PIN：8888"></div>' +
          '<div class="field"><label>客人酒券码</label><input id="staff-code" class="input" inputmode="numeric" maxlength="6" placeholder="6 位数字"></div>' +
          '<button type="button" class="pixel-btn primary block" id="do-redeem">核销</button>' +
          '<button type="button" class="pixel-btn block" id="do-summary">查看今日数据</button>' +
        "</div></div>" +
        '<div id="staff-result"></div>' +
        '<div class="panel"><div class="panel-title">使用说明</div>' +
          '<div class="small muted" style="line-height:1.8">· 客人集齐卡册后生成 6 位酒券码，5 分钟内有效。<br>· 单店酒券只能在本店核销；街区通行证可在任意门店核销。<br>· 核销后系统会记录冷却时间，防止重复兑换。<br>· 演示 PIN 为 8888，正式部署请设置 OCTOGAMEAR_STREET_STAFF_PIN。</div>' +
        "</div>" +
        '<button type="button" class="pixel-btn block" data-go="#/street">返回街区</button>',
        "me"
      );
      bindGo(app);

      $("#do-redeem").addEventListener("click", async function () {
        const barId = $("#staff-bar").value;
        const pin = ($("#staff-pin").value || "").trim();
        const code = ($("#staff-code").value || "").trim();
        const resultEl = $("#staff-result");
        if (!pin || !code) { toast("请填写 PIN 和酒券码", "err"); return; }
        try {
          const data = await API.request("/staff/redeem", { method: "POST", body: { code: code, pin: pin, bar_id: barId } });
          resultEl.innerHTML = '<div class="staff-result"><b>核销成功</b><div>' + escapeHtml(data.nickname) + " · " + escapeHtml(data.reward_name) + "</div><div class=\"small muted\">" + escapeHtml(data.message) + "</div></div>";
          $("#staff-code").value = "";
          toast("核销成功", "ok");
        } catch (err) {
          resultEl.innerHTML = '<div class="staff-result error"><b>核销失败</b><div class="small">' + escapeHtml(err.message) + "</div></div>";
        }
      });

      $("#do-summary").addEventListener("click", async function () {
        const barId = $("#staff-bar").value;
        const pin = ($("#staff-pin").value || "").trim();
        const resultEl = $("#staff-result");
        if (!pin) { toast("请填写店员 PIN", "err"); return; }
        try {
          const data = await API.request("/staff/summary?bar_id=" + encodeURIComponent(barId) + "&pin=" + encodeURIComponent(pin));
          resultEl.innerHTML = '<div class="staff-result"><b>' + escapeHtml(data.bar_name) + ' 今日数据</b>' +
            '<div class="me-grid" style="margin-top:8px"><div class="me-stat"><span>今日核销</span><b>' + data.today_redeemed + "</b></div>" +
            '<div class="me-stat"><span>有效酒券</span><b>' + data.active_vouchers + "</b></div>" +
            '<div class="me-stat"><span>护照总数</span><b>' + data.total_passports + "</b></div></div></div>";
        } catch (err) {
          resultEl.innerHTML = '<div class="staff-result error"><b>查询失败</b><div class="small">' + escapeHtml(err.message) + "</div></div>";
        }
      });
    } catch (err) {
      handleError(err);
    }
  }

  // ----------------------------------------------------------------- router
  function parseRoute() {
    const hash = location.hash || "#/street";
    return hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(function (part) {
      try { return decodeURIComponent(part); } catch (_err) { return part; }
    });
  }

  async function renderRoute() {
    const parts = parseRoute();
    if (!API.getPassport()) {
      if (parts[0] === "staff") { renderStaff(); return; }
      renderWelcome();
      return;
    }
    try {
      await ensureMeta();
      if (parts[0] === "bar" && parts[1]) { renderBar(parts[1]); return; }
      if (parts[0] === "shift" && parts[1] && parts[2]) { renderShift(parts[1], parts[2]); return; }
      if (parts[0] === "albums") { renderAlbums(); return; }
      if (parts[0] === "packs") { renderPacks(); return; }
      if (parts[0] === "tasks") { renderTasks(); return; }
      if (parts[0] === "redeem") { renderRedeem(); return; }
      if (parts[0] === "me") { renderMe(); return; }
      if (parts[0] === "staff") { renderStaff(); return; }
      renderStreet();
    } catch (err) {
      handleError(err);
    }
  }

  window.addEventListener("hashchange", renderRoute);
  window.BarStreetApp = { renderRoute: renderRoute };

  if (API.getPassport()) renderRoute();
  else renderWelcome();
})();
