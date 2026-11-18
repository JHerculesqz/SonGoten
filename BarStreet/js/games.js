/* Four 45–60 second role mini-games. Each game reports {score, perfect, abandoned}. */
(function () {
  "use strict";

  const $ = (root, sel) => root.querySelector(sel);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const escape = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  function createShell(root, opts) {
    const duration = opts.duration || 60;
    let score = 0;
    let remaining = duration;
    let finished = false;
    const cleanups = [];

    root.innerHTML =
      '<div class="game-shell">' +
        '<div class="game-top">' +
          '<button type="button" class="pixel-btn ghost small" data-exit>退出</button>' +
          '<div class="game-title">' + escape(opts.title) + '</div>' +
          '<div class="game-timer" data-timer>' + duration + 's</div>' +
        '</div>' +
        '<div class="game-score"><span>' + escape(opts.subtitle || "") + '</span><span>得分 <b data-score>0</b></span></div>' +
        '<div class="game-stage" data-stage></div>' +
        '<div class="game-tip">' + escape(opts.tip || "") + '</div>' +
      '</div>';

    const stage = $ (root, "[data-stage]");
    const scoreEl = $(root, "[data-score]");
    const timerEl = $(root, "[data-timer]");
    const exitBtn = $(root, "[data-exit]");

    function paintScore() {
      scoreEl.textContent = String(Math.round(score));
    }
    function setScore(value) {
      score = clamp(Number(value) || 0, 0, 100);
      paintScore();
    }
    function addScore(value) {
      setScore(score + value);
    }
    function paintTimer() {
      timerEl.textContent = Math.ceil(remaining) + "s";
      timerEl.classList.toggle("low", remaining <= 10);
    }
    const timerId = setInterval(function () {
      remaining -= 0.25;
      if (remaining <= 0) {
        remaining = 0;
        paintTimer();
        finish({ score: Math.round(score), perfect: score >= 90 });
      } else {
        paintTimer();
      }
    }, 250);

    function runCleanups() {
      while (cleanups.length) {
        try { cleanups.pop()(); } catch (_err) { /* keep finishing */ }
      }
    }
    function finish(result) {
      if (finished) return;
      finished = true;
      clearInterval(timerId);
      runCleanups();
      opts.done({
        score: clamp(Math.round(result && result.score != null ? result.score : score), 0, 100),
        perfect: result && result.perfect != null ? result.perfect : score >= 90,
        abandoned: Boolean(result && result.abandoned),
      });
    }
    function addCleanup(fn) { cleanups.push(fn); }

    exitBtn.addEventListener("click", function () {
      if (window.confirm("放弃本班？本班不会获得奖励。")) {
        finish({ score: 0, perfect: false, abandoned: true });
      }
    });

    paintScore();
    paintTimer();
    return { stage, setScore, addScore, getScore: () => score, finish, addCleanup };
  }

  // --------------------------------------------------------------- bartender
  const INGREDIENTS = [
    { id: "gin", name: "金酒", icon: "🍸" },
    { id: "rum", name: "朗姆", icon: "🥃" },
    { id: "tequila", name: "龙舌兰", icon: "🌵" },
    { id: "lemon", name: "柠檬", icon: "🍋" },
    { id: "lime", name: "青柠", icon: "🍈" },
    { id: "soda", name: "苏打", icon: "🫧" },
    { id: "mint", name: "薄荷", icon: "🌿" },
    { id: "syrup", name: "糖浆", icon: "🍯" },
    { id: "bitters", name: "苦精", icon: "🧪" },
  ];
  const RECIPES = [
    { name: "白羊·点火", steps: ["gin", "lemon", "soda"] },
    { name: "金牛·慢摇", steps: ["rum", "syrup", "bitters"] },
    { name: "双子·双杯", steps: ["tequila", "lime", "soda"] },
    { name: "巨蟹·盐边", steps: ["tequila", "lime", "syrup"] },
    { name: "狮子·金色泡沫", steps: ["gin", "syrup", "soda"] },
    { name: "处女·精确到滴", steps: ["gin", "bitters", "lemon"] },
  ];
  const ING_BY_ID = Object.fromEntries(INGREDIENTS.map((item) => [item.id, item]));

  function startBartender(root, done) {
    const shell = createShell(root, {
      title: "星座配方 · 调酒师",
      subtitle: "Loopin · 调酒师",
      tip: "按配方顺序点配料，再在绿区停下倒酒。3 杯酒，60 秒。",
      duration: 60,
      done,
    });
    let orderIndex = 0;
    let stepIndex = 0;
    let order = RECIPES[0];
    let phase = "recipe";
    let pourTimer = null;
    let pourPos = 0;
    let pourDir = 1;

    function pickOrder() {
      order = RECIPES[Math.floor(Math.random() * RECIPES.length)];
      stepIndex = 0;
      phase = "recipe";
    }

    function render() {
      if (!shell.stage.isConnected) return;
      if (phase === "pour") {
        shell.stage.innerHTML =
          '<div class="recipe">' +
            '<div class="recipe-title">第 ' + (orderIndex + 1) + ' / 3 杯 · ' + escape(order.name) + '</div>' +
            '<div class="small muted">配料完成，控制倒酒量：进入绿区时点击「停」。</div>' +
          '</div>' +
          '<div class="pour-track"><div class="pour-zone"></div><div class="pour-marker" data-marker></div></div>' +
          '<button type="button" class="pixel-btn primary block" data-pour>停</button>' +
          '<div class="game-tip">绿区中心最准，偏差越小分越高。</div>';
        const marker = $(shell.stage, "[data-marker]");
        pourPos = 0;
        pourDir = 1;
        pourTimer = setInterval(function () {
          pourPos += pourDir * 2.6;
          if (pourPos >= 100) { pourPos = 100; pourDir = -1; }
          if (pourPos <= 0) { pourPos = 0; pourDir = 1; }
          marker.style.left = "calc(" + pourPos + "% - 2px)";
        }, 30);
        $(shell.stage, "[data-pour]").addEventListener("click", stopPour);
        return;
      }

      const stepsHtml = order.steps.map(function (id, index) {
        const cls = index < stepIndex ? "done" : index === stepIndex ? "current" : "";
        return '<span class="recipe-step ' + cls + '">' + escape(ING_BY_ID[id].icon + " " + ING_BY_ID[id].name) + "</span>";
      }).join("");
      const gridHtml = INGREDIENTS.map(function (item) {
        return '<button type="button" class="ingredient" data-ing="' + item.id + '">' +
          '<span class="i-icon">' + item.icon + "</span><span>" + escape(item.name) + "</span></button>";
      }).join("");
      shell.stage.innerHTML =
        '<div class="recipe">' +
          '<div class="recipe-title">第 ' + (orderIndex + 1) + ' / 3 杯 · ' + escape(order.name) + '</div>' +
          '<div class="recipe-steps">' + stepsHtml + "</div>" +
        '</div>' +
        '<div class="ingredient-grid">' + gridHtml + "</div>" +
        '<div class="game-tip">按顺序点击：' + order.steps.map((id) => ING_BY_ID[id].name).join(" → ") + "</div>";

      shell.stage.querySelectorAll("[data-ing]").forEach(function (btn) {
        btn.addEventListener("click", function () { tapIngredient(btn.dataset.ing, btn); });
      });
    }

    function tapIngredient(id, btn) {
      if (phase !== "recipe") return;
      if (id === order.steps[stepIndex]) {
        btn.classList.add("right");
        shell.addScore(5);
        stepIndex += 1;
        if (stepIndex >= order.steps.length) {
          phase = "pour";
          setTimeout(render, 180);
        } else {
          setTimeout(render, 120);
        }
      } else {
        btn.classList.add("wrong");
        shell.addScore(-4);
        setTimeout(function () { btn.classList.remove("wrong"); }, 260);
      }
    }

    function stopPour() {
      if (phase !== "pour") return;
      phase = "result";
      clearInterval(pourTimer);
      const distance = Math.abs(pourPos - 50);
      if (distance <= 12) shell.addScore(20);
      else if (distance <= 25) shell.addScore(12);
      else shell.addScore(4);
      orderIndex += 1;
      if (orderIndex >= 3) {
        shell.finish({ score: shell.getScore(), perfect: shell.getScore() >= 90 });
        return;
      }
      pickOrder();
      render();
    }

    shell.addCleanup(function () { if (pourTimer) clearInterval(pourTimer); });
    pickOrder();
    render();
  }

  // ----------------------------------------------------------------- waiter
  function startWaiter(root, done) {
    const shell = createShell(root, {
      title: "露台快跑 · 服务员",
      subtitle: "Citrus · 服务员",
      tip: "看清桌号，点对桌子。别点到猫，它会耽误你。10 单，45 秒。",
      duration: 45,
      done,
    });
    const tables = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const catTable = tables[Math.floor(Math.random() * tables.length)];
    const orderTables = tables.filter(function (number) { return number !== catTable; });
    const orders = [];
    for (let i = 0; i < 10; i += 1) {
      let next = orderTables[Math.floor(Math.random() * orderTables.length)];
      if (orders.length && next === orders[orders.length - 1]) {
        next = orderTables[(orderTables.indexOf(next) + 1) % orderTables.length];
      }
      orders.push(next);
    }
    let orderIndex = 0;

    function render() {
      if (!shell.stage.isConnected) return;
      const current = orders[orderIndex];
      const remainder = orders.slice(orderIndex + 1, orderIndex + 4)
        .map((n) => n + " 号桌").join(" · ");
      shell.stage.innerHTML =
        '<div class="order-card"><span>送到 <b>' + current + ' 号桌</b></span><span class="mono small">第 ' + (orderIndex + 1) + '/10 单</span></div>' +
        '<div class="table-grid">' + tables.map(function (n) {
          return '<button type="button" class="table-cell" data-table="' + n + '">' +
            '<span class="t-emoji">🪑</span><span>' + n + '</span>' +
            (n === catTable ? '<span class="cat">🐈</span>' : "") +
            "</button>";
        }).join("") + "</div>" +
        '<div class="game-tip">托盘里还有：' + escape(remainder || "最后一单") + "</div>";
      shell.stage.querySelectorAll("[data-table]").forEach(function (btn) {
        btn.addEventListener("click", function () { tapTable(Number(btn.dataset.table), btn); });
      });
    }

    function tapTable(number, btn) {
      if (number === catTable) {
        shell.addScore(-8);
        btn.classList.add("wrong");
        setTimeout(function () { btn.classList.remove("wrong"); }, 260);
        return;
      }
      if (number === orders[orderIndex]) {
        shell.addScore(10);
        btn.classList.add("correct");
        orderIndex += 1;
        if (orderIndex >= orders.length) {
          shell.finish({ score: shell.getScore(), perfect: shell.getScore() >= 90 });
          return;
        }
        setTimeout(render, 140);
      } else {
        shell.addScore(-4);
        btn.classList.add("wrong");
        setTimeout(function () { btn.classList.remove("wrong"); }, 260);
      }
    }

    render();
  }

  // ---------------------------------------------------------------- cleaner
  function startCleaner(root, done) {
    const shell = createShell(root, {
      title: "打烊大扫除 · 清洁工",
      subtitle: "HiJack · 清洁工",
      tip: "点掉污渍和酒瓶，找到闪光失物。45 秒，越干净越好。",
      duration: 45,
      done,
    });
    const items = new Array(9).fill(null);
    let cleans = 0;
    let spawnTimer = null;

    function render() {
      if (!shell.stage.isConnected) return;
      shell.stage.innerHTML =
        '<div class="clean-grid">' + items.map(function (item, index) {
          const cls = item ? " " + item : "";
          const symbol = item === "stain" ? "🫧" : item === "bottle" ? "🍾" : item === "hidden" ? "✨" : "";
          return '<button type="button" class="clean-cell' + cls + '" data-cell="' + index + '">' + symbol + "</button>";
        }).join("") + "</div>" +
        '<div class="game-tip">污渍 🫧 +8 · 酒瓶 🍾 +5 · 失物 ✨ +15</div>';
      shell.stage.querySelectorAll("[data-cell]").forEach(function (btn) {
        btn.addEventListener("click", function () { tapCell(Number(btn.dataset.cell), btn); });
      });
    }

    function spawn() {
      const empty = [];
      items.forEach(function (item, index) { if (!item) empty.push(index); });
      if (!empty.length) return;
      const filled = items.filter(Boolean).length;
      if (filled >= 4) return;
      const index = empty[Math.floor(Math.random() * empty.length)];
      const roll = Math.random();
      if (cleans >= 5 && roll < 0.12) items[index] = "hidden";
      else if (roll < 0.62) items[index] = "stain";
      else items[index] = "bottle";
      render();
    }

    function tapCell(index, btn) {
      const item = items[index];
      if (!item) return;
      if (item === "stain") { shell.addScore(8); cleans += 1; }
      else if (item === "bottle") shell.addScore(5);
      else if (item === "hidden") shell.addScore(15);
      items[index] = null;
      btn.classList.add("correct");
      render();
    }

    spawnTimer = setInterval(spawn, 500);
    shell.addCleanup(function () { clearInterval(spawnTimer); });
    render();
    spawn();
    spawn();
    spawn();
  }

  // --------------------------------------------------------------- supplier
  const CRATES = [
    { id: "malt", name: "麦芽", icon: "🌾" },
    { id: "hops", name: "酒花", icon: "🌿" },
    { id: "barrel", name: "木桶", icon: "🛢️" },
    { id: "tank", name: "发酵罐", icon: "🏭" },
    { id: "pipe", name: "管道", icon: "🔧" },
    { id: "forklift", name: "叉车", icon: "🚜" },
  ];
  const CRATE_BY_ID = Object.fromEntries(CRATES.map((item) => [item.id, item]));

  function startSupplier(root, done) {
    const shell = createShell(root, {
      title: "进货线 · 酒水供应商",
      subtitle: "工厂 · 供应商",
      tip: "看订单，点对应货箱。10 单，60 秒，别配错货。",
      duration: 60,
      done,
    });
    const shelf = [];
    for (let i = 0; i < 9; i += 1) shelf.push(CRATES[i % CRATES.length].id);
    const orders = [];
    for (let i = 0; i < 10; i += 1) {
      orders.push({ id: CRATES[Math.floor(Math.random() * CRATES.length)].id, count: 1 + Math.floor(Math.random() * 3) });
    }
    let orderIndex = 0;
    let remaining = orders[0].count;

    function render() {
      if (!shell.stage.isConnected) return;
      const order = orders[orderIndex];
      const crate = CRATE_BY_ID[order.id];
      shell.stage.innerHTML =
        '<div class="order-card"><span>订单：<b>' + crate.icon + " " + escape(crate.name) + " ×" + remaining + '</b></span><span class="mono small">第 ' + (orderIndex + 1) + "/10 单</span></div>" +
        '<div class="crate-grid">' + shelf.map(function (id, index) {
          const item = CRATE_BY_ID[id];
          return '<button type="button" class="crate" data-crate="' + id + '" data-index="' + index + '">' +
            '<span class="c-icon">' + item.icon + "</span><span>" + escape(item.name) + "</span></button>";
        }).join("") + "</div>" +
        '<div class="game-tip">点对货箱完成配货；点错扣 4 分。</div>';
      shell.stage.querySelectorAll("[data-crate]").forEach(function (btn) {
        btn.addEventListener("click", function () { tapCrate(btn.dataset.crate, btn); });
      });
    }

    function tapCrate(id, btn) {
      const order = orders[orderIndex];
      if (id === order.id) {
        shell.addScore(10);
        remaining -= 1;
        if (remaining <= 0) {
          orderIndex += 1;
          if (orderIndex >= orders.length) {
            shell.finish({ score: shell.getScore(), perfect: shell.getScore() >= 90 });
            return;
          }
          remaining = orders[orderIndex].count;
          setTimeout(render, 140);
        } else {
          const orderEl = shell.stage.querySelector(".order-card b");
          if (orderEl) orderEl.textContent = CRATE_BY_ID[order.id].icon + " " + CRATE_BY_ID[order.id].name + " ×" + remaining;
        }
      } else {
        shell.addScore(-4);
        btn.classList.add("wrong");
        setTimeout(function () { btn.classList.remove("wrong"); }, 260);
      }
    }

    render();
  }

  window.BarStreetGames = {
    start: function (game, root, done) {
      const factories = {
        bartender: startBartender,
        waiter: startWaiter,
        cleaner: startCleaner,
        supplier: startSupplier,
      };
      (factories[game] || startBartender)(root, done);
    },
  };
})();
