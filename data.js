// フクメモの静的データ（リンク集・時限）
// verified: false のものは URL が未確認。公式サイトで確認してから true にする。

// FUポータルの画面はログインしないと開けない（直接開くと /AC/error/ に飛ぶ）。
// 利用者が登録したポータルの URL は、ログイン入口に ?next=<画面のパス> を付けて開く。ログイン後にその画面へ戻る。
// （2026-10-23 確認：next は SAML の RelayState に渡る。/AC/ 以外の URL は大学側で無視される）
const PORTAL_HOST = "acpt.jsysneo.fukuoka-u.ac.jp";
const PORTAL_LOGIN = "https://acpt.jsysneo.fukuoka-u.ac.jp/AC/saml2/login/?next=";

const LINK_GROUPS = [
  {
    title: "授業・学務",
    links: [
      { id: "portal", name: "FUポータル", desc: "履修・成績・休講などの学務情報", url: "https://portal.fukuoka-u.ac.jp/", verified: true, fav: true },
      // 2026-10-20 渡邊さん確認
      { id: "moodle", name: "Moodle", desc: "授業支援システム", url: "https://fukuoka-u.resonantlms.com/", verified: true, fav: true },
    ],
  },
  {
    title: "メール・Office",
    links: [
      { id: "outlook", name: "大学メール（Outlook）", desc: "Microsoft 365 の学生メール", url: "https://outlook.office.com/mail/", verified: true, fav: true },
      { id: "m365", name: "Microsoft 365", desc: "Word・Excel・Teams・OneDrive", url: "https://www.microsoft365.com/", verified: true, fav: false },
    ],
  },
  {
    title: "図書館",
    links: [
      // 2026-10-20 渡邊さん確認
      { id: "library", name: "図書館", desc: "蔵書検索・貸出状況", url: "https://www.lib.fukuoka-u.ac.jp/", verified: true, fav: true },
    ],
  },
  {
    title: "大学の公式情報",
    links: [
      { id: "official", name: "福岡大学 公式サイト", desc: "ニュース・お知らせ・学年暦", url: "https://www.fukuoka-u.ac.jp/", verified: true, fav: false },
    ],
  },
];

// 授業時間（要確認：福岡大学の公式な時限表で確かめること）
const PERIODS = [
  { no: 1, start: "9:00", end: "10:30" },
  { no: 2, start: "10:40", end: "12:10" },
  { no: 3, start: "13:00", end: "14:30" },
  { no: 4, start: "14:40", end: "16:10" },
  { no: 5, start: "16:20", end: "17:50" },
  { no: 6, start: "18:00", end: "19:30" },
  { no: 7, start: "19:40", end: "21:10" },
];

const DAYS = ["月", "火", "水", "木", "金", "土"];
