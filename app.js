// フクメモ本体
// データはすべて localStorage（この端末内）に保存し、外部へは送信しない。

const STORE_KEY = "fukumemo.v1";

const defaultState = () => ({
  timetable: {},          // "曜日index-時限" → { name, room, note }
  tasks: [],              // { id, title, course, due, done, createdAt }
  settings: { showSat: false, periodCount: 5 },
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    return { ...defaultState(), ...s, settings: { ...defaultState().settings, ...s.settings } };
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
}

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
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
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
  state = { ...defaultState(), ...data, settings: { ...defaultState().settings, ...data.settings } };
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
  if (!(await askConfirm("時間割・課題・設定をすべて消します。元に戻せません。", "すべて消す"))) return;
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
}

renderAll();
const initial = location.hash.slice(1);
showTab(document.getElementById(`tab-${initial}`) ? initial : "home");

if ("serviceWorker" in navigator && location.protocol !== "about:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
