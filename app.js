// フクメモ本体
// データはすべて localStorage（この端末内）に保存し、外部へは送信しない。

const STORE_KEY = "fukumemo.v1";

const defaultState = () => ({
  timetable: {},          // "曜日index-時限" → { name, room, note }
  tasks: [],              // { id, title, course, due, done, createdAt }
  settings: { showSat: false, periodCount: 5, showStaff: false, autoOrder: false },
  portal: { tag: "", stars: [], uses: {} },   // FUポータルのパネル：選んだタグ・★・押した回数
  panelUses: {},          // ホームのパネルごとに、中のリンクを押した回数
  panels: [],             // 自分で作るパネル { id, title, links: [{ id, name, url }] }
  home: [],               // ホームの並び順と表示 [{ key, show }]。key は組み込みの名前か "p:<パネルid>"
});

function mergeState(s) {
  const d = defaultState();
  return { ...d, ...s, settings: { ...d.settings, ...s.settings }, portal: { ...d.portal, ...s.portal } };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    return mergeState(s);
  } catch {
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    toast("保存できませんでした（プライベートモードなどでは保存できません）。");
  }
}

let state = loadState();

// ---------- 共通 ----------
const $ = (sel) => document.querySelector(sel);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c !== null && c !== undefined && c !== false) node.append(c);
  }
  return node;
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 月=0 … 土=5、日曜は -1
function todayDayIndex() {
  const js = new Date().getDay();
  return js === 0 ? -1 : js - 1;
}

function daysUntil(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due - today) / 86400000);
}

function dueLabel(iso) {
  if (!iso) return null;
  const n = daysUntil(iso);
  const [, m, d] = iso.split("-").map(Number);
  const md = `${m}/${d}`;
  if (n < 0) return el("span", { class: "overdue" }, `${md}（${-n}日超過）`);
  if (n === 0) return el("span", { class: "overdue" }, `${md}（今日）`);
  if (n === 1) return `${md}（明日）`;
  return `${md}（あと${n}日）`;
}

// ---------- タブ ----------
function showTab(name) {
  document.querySelectorAll(".tab").forEach((s) => (s.hidden = s.id !== `tab-${name}`));
  document.querySelectorAll(".tabbar button").forEach((b) => {
    if (b.dataset.tab === name) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  $("#page-title").textContent = $(`#tab-${name}`).dataset.title;
  try {
    if (location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
  } catch {}
  window.scrollTo(0, 0);
  if (name === "home") renderHome();
}

document.querySelectorAll(".tabbar button").forEach((b) =>
  b.addEventListener("click", () => showTab(b.dataset.tab))
);
document.querySelectorAll("[data-goto]").forEach((b) =>
  b.addEventListener("click", () => showTab(b.dataset.goto))
);

// ---------- リンク ----------
function linkTile(link) {
  const inner = [
    el("span", { class: "name" }, link.name),
    el("span", { class: "desc" }, link.desc),
    !link.verified ? el("span", { class: "badge" }, link.url ? "URL要確認" : "URL未登録") : null,
  ];
  if (!link.url) return el("div", { class: "link-tile disabled" }, inner);
  return el("a", { class: "link-tile", href: link.url, target: "_blank", rel: "noopener noreferrer" }, inner);
}

function renderLinks() {
  const root = $("#link-groups");
  root.replaceChildren(
    ...LINK_GROUPS.map((g) =>
      el("div", {}, el("h3", { class: "group-title" }, g.title), el("div", { class: "link-grid" }, g.links.map(linkTile)))
    )
  );
}

// ---------- ホーム ----------
function renderHome() {
  const di = todayDayIndex();
  const now = new Date();
  $("#today-label").textContent = `今日の授業（${now.getMonth() + 1}/${now.getDate()} ${di >= 0 ? DAYS[di] : "日"}）`;

  const todayList = $("#today-list");
  const items = [];
  if (di >= 0) {
    for (const p of PERIODS.slice(0, state.settings.periodCount)) {
      const c = state.timetable[`${di}-${p.no}`];
      if (c && c.name) {
        items.push(
          el("li", {},
            el("span", { class: "p" }, `${p.no}限`),
            el("div", {}, c.name, el("div", { class: "sub" }, [`${p.start}–${p.end}`, c.room].filter(Boolean).join("　")))
          )
        );
      }
    }
  }
  todayList.replaceChildren(...(items.length ? items : [el("li", { class: "empty" }, di < 0 ? "今日は日曜日です。" : "今日の授業は登録されていません。")]));

  const upcoming = state.tasks
    .filter((t) => !t.done)
    .sort(byDue)
    .slice(0, 5)
    .map((t) =>
      el("li", {},
        el("div", {}, t.title, el("div", { class: "sub" }, [t.course, t.due ? null : "締切なし"].filter(Boolean).join("　"), t.due ? [" ", dueLabel(t.due)] : null))
      )
    );
  $("#upcoming-list").replaceChildren(...(upcoming.length ? upcoming : [el("li", { class: "empty" }, "未完了の課題はありません。")]));

  const favs = LINK_GROUPS.flatMap((g) => g.links).filter((l) => l.fav);
  $("#fav-links").replaceChildren(...favs.map(linkTile));

  // パネルを並び順どおりに置き直す（組み込みのカードは index.html にあるものを動かす）
  const root = $("#home-panels");
  renderPortal();
  root.replaceChildren(
    ...orderedHome().map(({ key, show }) => {
      const card = key.startsWith("p:") ? customPanelCard(state.panels.find((p) => `p:${p.id}` === key)) : $(`[data-panel="${key}"]`);
      card.hidden = !show;
      return card;
    })
  );
}

// ---------- パネル ----------
const BUILTIN_PANELS = [
  { key: "today", title: "今日の授業" },
  { key: "tasks", title: "締切が近い課題" },
  { key: "portal", title: "FUポータル" },
  { key: "favs", title: "よく使うリンク" },
];

// 保存されている並び順に、足りないパネルを足し、消えたパネルを除く
function homeLayout() {
  const keys = [...BUILTIN_PANELS.map((b) => b.key), ...state.panels.map((p) => `p:${p.id}`)];
  const saved = (state.home || []).filter((h) => keys.includes(h.key));
  const missing = keys.filter((k) => !saved.some((h) => h.key === k)).map((key) => ({ key, show: true }));
  return [...saved, ...missing];
}

// 「よく使うパネルを自動で上に出す」がオンなら、押した回数の多い順（同じなら手動の並び順）
function orderedHome() {
  const list = homeLayout();
  if (!state.settings.autoOrder) return list;
  const uses = (k) => state.panelUses[k] || 0;
  return list.map((h, i) => ({ h, i })).sort((a, b) => uses(b.h.key) - uses(a.h.key) || a.i - b.i).map((x) => x.h);
}

function panelTitle(key) {
  if (key.startsWith("p:")) return state.panels.find((p) => `p:${p.id}` === key)?.title || "（名前なし）";
  return BUILTIN_PANELS.find((b) => b.key === key).title;
}

// 入力された URL を開ける形にする。http(s) 以外（javascript: など）は受け付けない
function normalizeUrl(raw) {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

// ポータルの画面はログイン入口を経由して開く（data.js の PORTAL_LOGIN を参照）
function openUrl(url) {
  const u = new URL(url);
  if (u.hostname === PORTAL_HOST && u.pathname.startsWith("/AC/") && !u.pathname.startsWith("/AC/saml2/")) {
    return PORTAL_LOGIN + encodeURIComponent(u.pathname + u.search);
  }
  return url;
}

function customPanelCard(panel) {
  const links = panel.links.map((l) =>
    el("a", { class: "link-tile", href: openUrl(l.url), target: "_blank", rel: "noopener noreferrer" },
      el("span", { class: "name" }, l.name || new URL(l.url).hostname),
      el("span", { class: "desc" }, new URL(l.url).hostname)
    )
  );
  return el("div", { class: "card", "data-panel": `p:${panel.id}` },
    el("div", { class: "card-head" },
      el("h2", {}, panel.title || "（名前なし）"),
      el("button", { class: "link-btn", type: "button", onclick: () => openPanel(panel.id) }, "編集")
    ),
    links.length
      ? el("div", { class: "link-grid" }, links)
      : el("p", { class: "empty" }, "「編集」からリンクを追加してください。")
  );
}

function moveHome(key, dir) {
  const list = homeLayout();
  const i = list.findIndex((h) => h.key === key);
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  state.home = list;
  saveState();
  renderPanelSettings();
}

function renderPanelSettings() {
  const list = homeLayout();
  $("#panel-order").replaceChildren(
    ...list.map((h, i) =>
      el("li", {},
        el("label", { class: "check" },
          el("input", {
            type: "checkbox",
            checked: h.show,
            onchange: (e) => {
              state.home = homeLayout().map((x) => (x.key === h.key ? { ...x, show: e.target.checked } : x));
              saveState();
            },
          }),
          panelTitle(h.key)
        ),
        el("span", { class: "order-btns" },
          h.key.startsWith("p:") ? el("button", { class: "link-btn", type: "button", onclick: () => openPanel(h.key.slice(2)) }, "編集") : null,
          el("button", { type: "button", class: "secondary icon", "aria-label": "上へ", disabled: state.settings.autoOrder || i === 0, onclick: () => moveHome(h.key, -1) }, "↑"),
          el("button", { type: "button", class: "secondary icon", "aria-label": "下へ", disabled: state.settings.autoOrder || i === list.length - 1, onclick: () => moveHome(h.key, 1) }, "↓")
        )
      )
    )
  );
}

// ---------- FUポータルのパネル ----------
const PORTAL_PAGE = 8;   // 絞り込みなしのときに最初に見せる件数
let portalExpanded = false;

function portalUrl(link) {
  return link.url ? openUrl(link.url) : PORTAL_LOGIN + encodeURIComponent(PORTAL_TOP_PATH);
}

// ★ → 押した回数 → data.js の並び順
function portalLinks() {
  const stars = state.portal.stars;
  const uses = (l) => state.portal.uses[l.id] || 0;
  return PORTAL_LINKS
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => state.settings.showStaff || !l.staff)
    .sort((a, b) => stars.includes(b.l.id) - stars.includes(a.l.id) || uses(b.l) - uses(a.l) || a.i - b.i)
    .map(({ l }) => l);
}

function renderPortal() {
  const all = portalLinks();
  const tags = PORTAL_TAGS.filter((t) => all.some((l) => l.tags.includes(t)));
  const tag = state.portal.tag === "★" || tags.includes(state.portal.tag) ? state.portal.tag : "";
  const chip = (value, label) =>
    el("button", {
      type: "button",
      class: "chip",
      "aria-pressed": String(tag === value),
      onclick: () => {
        state.portal.tag = value;
        portalExpanded = false;
        saveState();
        renderPortal();
      },
    }, label);
  $("#portal-tags").replaceChildren(chip("", "すべて"), chip("★", "★ お気に入り"), ...tags.map((t) => chip(t, t)));

  const hits = all.filter((l) => (tag === "★" ? state.portal.stars.includes(l.id) : !tag || l.tags.includes(tag)));
  const shown = tag || portalExpanded ? hits : hits.slice(0, PORTAL_PAGE);
  $("#portal-count").textContent = `${hits.length} 件`;
  $("#portal-list").replaceChildren(
    ...(shown.length ? shown.map(portalRow) : [el("p", { class: "empty" }, tag === "★" ? "☆ を押すとここに集まります。" : "該当するリンクはありません。")])
  );
  const more = $("#portal-more");
  more.hidden = shown.length === hits.length;
  more.textContent = `すべて表示（あと ${hits.length - shown.length} 件）`;

  // 教職員向けを隠しているときは、その件数と表示ボタンを出す（設定を探さなくて済むように）
  const staff = $("#portal-staff");
  staff.hidden = state.settings.showStaff;
  staff.textContent = `教職員向け ${PORTAL_LINKS.filter((l) => l.staff).length} 件を表示（給与・出張申請・研究費など）`;
}

$("#portal-staff").addEventListener("click", () => {
  state.settings.showStaff = true;
  saveState();
  syncSettingsForm();
  renderPortal();
  toast("教職員向けのリンクを表示しました。設定でいつでも隠せます。");
});

function portalRow(l) {
  const starred = state.portal.stars.includes(l.id);
  return el("div", { class: "portal-row" },
    el("a", {
      class: "link-tile",
      href: portalUrl(l),
      target: "_blank",
      rel: "noopener noreferrer",
      onclick: () => {
        state.portal.uses[l.id] = (state.portal.uses[l.id] || 0) + 1;
        saveState();
      },
    },
      el("span", { class: "name" }, l.name),
      el("span", { class: "desc" }, l.tags.join("・")),
      l.url ? null : el("span", { class: "badge via", title: "ポータルのトップを開きます。サイトマップからたどってください" }, "ポータルから")
    ),
    el("button", {
      type: "button",
      class: `star${starred ? " on" : ""}`,
      "aria-pressed": String(starred),
      "aria-label": starred ? "お気に入りから外す" : "お気に入りにする",
      onclick: () => {
        state.portal.stars = starred ? state.portal.stars.filter((x) => x !== l.id) : [...state.portal.stars, l.id];
        saveState();
        renderPortal();
      },
    }, starred ? "★" : "☆")
  );
}

$("#portal-more").addEventListener("click", () => {
  portalExpanded = true;
  renderPortal();
});

// ホームのリンクを押したら、そのパネルの回数を数える（自動の並び順に使う）
$("#home-panels").addEventListener("click", (e) => {
  const card = e.target.closest("a[href]") && e.target.closest("[data-panel]");
  if (!card) return;
  const key = card.dataset.panel;
  state.panelUses[key] = (state.panelUses[key] || 0) + 1;
  saveState();
});

// パネルの編集ダイアログ。id が null なら新しいパネル
let editingPanelId = null;

function linkRow(l = {}) {
  return el("li", { class: "link-row" },
    el("input", { type: "text", class: "ln", placeholder: "名前（例：成績）", maxlength: "40", value: l.name || "" }),
    el("input", { type: "text", class: "lu", placeholder: "URL", inputmode: "url", autocapitalize: "off", value: l.url || "" }),
    el("button", { type: "button", class: "del", "aria-label": "このリンクを消す", onclick: (e) => e.target.closest("li").remove() }, "×")
  );
}

function openPanel(id) {
  editingPanelId = id;
  const p = state.panels.find((x) => x.id === id) || { title: "", links: [] };
  $("#panel-dialog-title").textContent = id ? "パネルを編集" : "パネルを追加";
  $("#panel-title").value = p.title;
  $("#panel-links").replaceChildren(...(p.links.length ? p.links : [{}]).map(linkRow));
  $("#panel-delete").hidden = !id;
  $("#panel-dialog").showModal();
}

$("#panel-add-link").addEventListener("click", () => {
  const row = linkRow();
  $("#panel-links").append(row);
  row.querySelector("input").focus();
});

$("#panel-form").addEventListener("submit", async (e) => {
  const action = e.submitter ? e.submitter.value : "save";
  if (action === "delete") {
    e.preventDefault();
    const p = state.panels.find((x) => x.id === editingPanelId);
    if (!(await askConfirm(`パネル「${p.title || "（名前なし）"}」を消しますか？`, "消す"))) return;
    state.panels = state.panels.filter((x) => x.id !== editingPanelId);
    state.home = homeLayout();
  } else if (action === "save") {
    const links = [];
    for (const row of $("#panel-links").children) {
      const name = row.querySelector(".ln").value.trim();
      const raw = row.querySelector(".lu").value;
      if (!raw.trim() && !name) continue;
      const url = normalizeUrl(raw);
      if (!url) {
        e.preventDefault();
        row.querySelector(".lu").focus();
        return toast("URL を確かめてください（https:// で始まるもの）。");
      }
      const old = state.panels.find((x) => x.id === editingPanelId)?.links.find((l) => l.url === url);
      links.push({ id: old?.id || newId(), name, url });
    }
    const title = $("#panel-title").value.trim() || "マイリンク";
    const p = state.panels.find((x) => x.id === editingPanelId);
    if (p) Object.assign(p, { title, links });
    else state.panels.push({ id: newId(), title, links });
  } else {
    editingPanelId = null;
    return;
  }
  editingPanelId = null;
  $("#panel-dialog").close();
  saveState();
  renderHome();
  renderPanelSettings();
});

document.querySelectorAll("[data-add-panel]").forEach((b) => b.addEventListener("click", () => openPanel(null)));

// ---------- 時間割 ----------
let editingKey = null;

function renderTimetable() {
  const days = DAYS.slice(0, state.settings.showSat ? 6 : 5);
  const periods = PERIODS.slice(0, state.settings.periodCount);
  const di = todayDayIndex();

  const head = el("tr", {}, el("th", { class: "period" }), days.map((d, i) => el("th", { class: i === di ? "today" : null }, d)));
  const rows = periods.map((p) =>
    el("tr", {},
      el("th", { class: "period" }, String(p.no), el("small", {}, p.start)),
      days.map((d, i) => {
        const key = `${i}-${p.no}`;
        const c = state.timetable[key];
        return el("td",
          { class: c && c.name ? "filled" : null, onclick: () => openCell(key, d, p.no), "aria-label": `${d}曜${p.no}限` },
          c && c.name ? [el("span", { class: "n" }, c.name), c.room ? el("span", { class: "r" }, c.room) : null] : null
        );
      })
    )
  );
  $("#timetable").replaceChildren(el("thead", {}, head), el("tbody", {}, rows));
}

function openCell(key, day, period) {
  editingKey = key;
  const c = state.timetable[key] || {};
  $("#cell-dialog-title").textContent = `${day}曜 ${period}限`;
  $("#cell-name").value = c.name || "";
  $("#cell-room").value = c.room || "";
  $("#cell-note").value = c.note || "";
  $("#cell-dialog").showModal();
}

// close イベントは非同期で遅れることがあるので、submit の時点で保存する
$("#cell-form").addEventListener("submit", (e) => {
  const action = e.submitter ? e.submitter.value : "save";
  if (!editingKey) return;
  if (action === "save") {
    const name = $("#cell-name").value.trim();
    if (name) {
      state.timetable[editingKey] = { name, room: $("#cell-room").value.trim(), note: $("#cell-note").value.trim() };
    } else {
      delete state.timetable[editingKey];
    }
  } else if (action === "clear") {
    delete state.timetable[editingKey];
  }
  editingKey = null;
  saveState();
  renderTimetable();
});

// ---------- 課題 ----------
function byDue(a, b) {
  if (a.due && b.due) return a.due.localeCompare(b.due);
  if (a.due) return -1;
  if (b.due) return 1;
  return a.createdAt - b.createdAt;
}

function renderTasks() {
  const sorted = [...state.tasks].sort((a, b) => (a.done - b.done) || byDue(a, b));
  const items = sorted.map((t) =>
    el("li", { class: t.done ? "done" : null },
      el("input", {
        type: "checkbox",
        checked: t.done,
        "aria-label": "完了",
        onchange: (e) => { t.done = e.target.checked; saveState(); renderTasks(); },
      }),
      el("div", { class: "body" },
        el("div", { class: "t" }, t.title),
        el("div", { class: "meta" }, [t.course, " ", dueLabel(t.due)].filter(Boolean))
      ),
      el("button", {
        class: "del",
        type: "button",
        "aria-label": "削除",
        onclick: async () => {
          if (!(await askConfirm(`「${t.title}」を削除しますか？`, "削除"))) return;
          state.tasks = state.tasks.filter((x) => x.id !== t.id);
          saveState();
          renderTasks();
        },
      }, "×")
    )
  );
  $("#task-list").replaceChildren(...(items.length ? items : [el("li", { class: "empty" }, "課題はまだありません。")]));
}

$("#task-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = $("#task-title").value.trim();
  if (!title) return;
  state.tasks.push({
    id: newId(),
    title,
    course: $("#task-course").value.trim(),
    due: $("#task-due").value || null,
    done: false,
    createdAt: Date.now(),
  });
  saveState();
  e.target.reset();
  renderTasks();
});

$("#clear-done").addEventListener("click", async () => {
  const n = state.tasks.filter((t) => t.done).length;
  if (!n) return toast("完了した課題はありません。");
  if (!(await askConfirm(`完了した課題 ${n} 件を消しますか？`, "消す"))) return;
  state.tasks = state.tasks.filter((t) => !t.done);
  saveState();
  renderTasks();
  toast(`${n} 件を消しました。`);
});

// ---------- 設定 ----------
function syncSettingsForm() {
  $("#show-sat").checked = state.settings.showSat;
  $("#period-count").value = String(state.settings.periodCount);
  $("#show-staff").checked = state.settings.showStaff;
  $("#auto-order").checked = state.settings.autoOrder;
}
syncSettingsForm();

$("#show-sat").addEventListener("change", (e) => {
  state.settings.showSat = e.target.checked;
  saveState();
  renderTimetable();
});
$("#period-count").addEventListener("change", (e) => {
  state.settings.periodCount = Number(e.target.value);
  saveState();
  renderTimetable();
});

$("#show-staff").addEventListener("change", (e) => {
  state.settings.showStaff = e.target.checked;
  saveState();
  renderPortal();
});
$("#auto-order").addEventListener("change", (e) => {
  state.settings.autoOrder = e.target.checked;
  saveState();
  renderHome();
  renderPanelSettings();
});
$("#portal-reset-uses").addEventListener("click", async () => {
  if (!(await askConfirm("リンクとパネルを押した回数をリセットします（★ はそのまま）。", "リセット"))) return;
  state.portal.uses = {};
  state.panelUses = {};
  saveState();
  renderHome();
  toast("押した回数をリセットしました。");
});

$("#export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: `fukumemo-${todayISO()}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

// ダウンロードできない環境（埋め込み表示など）向けに、テキストでもコピーできるようにする
$("#copy-btn").addEventListener("click", async () => {
  const text = JSON.stringify(state);
  try {
    await navigator.clipboard.writeText(text);
    toast("データをコピーしました。メモ帳などに貼り付けて保存してください。");
  } catch {
    const box = $("#copy-fallback");
    box.hidden = false;
    box.value = text;
    box.select();
    toast("コピーできませんでした。下の枠の文字をすべて選んでコピーしてください。");
  }
});

function applyImported(data) {
  if (typeof data !== "object" || !data || !data.timetable || !Array.isArray(data.tasks)) throw new Error("フクメモのデータではありません");
  state = mergeState(data);
  saveState();
  syncSettingsForm();
  renderAll();
}

$("#import-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!(await askConfirm("いまのデータを、読み込んだデータで置き換えますか？", "置き換える"))) return;
    applyImported(data);
    toast("データを読み込みました。");
  } catch (err) {
    toast(`読み込めませんでした：${err.message}`);
  } finally {
    e.target.value = "";
  }
});

$("#reset-btn").addEventListener("click", async () => {
  if (!(await askConfirm("時間割・課題・パネル・設定をすべて消します。元に戻せません。", "すべて消す"))) return;
  try { localStorage.removeItem(STORE_KEY); } catch {}
  state = defaultState();
  syncSettingsForm();
  renderAll();
  toast("すべてのデータを消しました。");
});

// ---------- 確認ダイアログ・お知らせ ----------
// confirm()/alert() は埋め込み表示で使えないことがあるので、画面内で確認する
function askConfirm(message, okLabel = "OK") {
  const dlg = $("#confirm-dialog");
  $("#confirm-message").textContent = message;
  $("#confirm-ok").textContent = okLabel;
  dlg.returnValue = "";
  dlg.showModal();
  return new Promise((resolve) => {
    const done = (ok) => {
      $("#confirm-ok").removeEventListener("click", onOk);
      $("#confirm-cancel").removeEventListener("click", onCancel);
      dlg.removeEventListener("cancel", onCancel);
      dlg.close();
      resolve(ok);
    };
    const onOk = (e) => { e.preventDefault(); done(true); };
    const onCancel = (e) => { e.preventDefault(); done(false); };
    $("#confirm-ok").addEventListener("click", onOk);
    $("#confirm-cancel").addEventListener("click", onCancel);
    dlg.addEventListener("cancel", onCancel);
  });
}

let toastTimer = null;
function toast(message) {
  const t = $("#toast");
  t.textContent = message;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3500);
}

// ---------- 起動 ----------
function renderAll() {
  renderLinks();
  renderTimetable();
  renderTasks();
  renderHome();
  renderPanelSettings();
}

renderAll();
const initial = location.hash.slice(1);
showTab(document.getElementById(`tab-${initial}`) ? initial : "home");

if ("serviceWorker" in navigator && location.protocol !== "about:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
