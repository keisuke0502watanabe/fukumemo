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

// FUポータルのサイトマップを整理したもの（2026-10-23、教職員アカウントのサイトマップから作成）
// ポータルのサイトマップは並びが分かりにくいので、用途ごとのタグを付け直した。
// staff: true は教職員向け（学生には表示されないもの）。設定でオンにしたときだけ出す。
// URL はポータルのサイトマップ（2026-10-23 取得）から取った。次のものは url: null にして、押すとポータルのトップ（ログイン経由）を開く：
//   - ポータルが POST で開くページ（acsf/acst.jsysneo の各システム、/AC/ 内のページ）：普通のリンクで開くとエラーページに飛ぶ
//   - Box の共有リンク・フォルダ、Microsoft Forms：学内向けに配られている資料。公開するアプリには載せない
//   - 教職員向けの業務システム（給与・勤怠・財務・旅費・研究費・薬品など）：学内のホスト名やテスト環境の URL を含むため
//   - サイトマップでは見出しだけでリンクがないもの（成績発表、Web履修登録など）
const PORTAL_TOP_PATH = "/AC/ptl20101/";
const PORTAL_TAGS = ["授業", "成績", "ガイド・便覧", "学生生活", "就職", "メール・ツール", "研究", "相談・安全", "規程・制度", "教職員事務"];
const PORTAL_LINKS = [
  // 授業・履修
  { id: "syllabus", name: "WEBシラバス", tags: ["授業"], url: null },
  { id: "timetable", name: "Web授業時間割", tags: ["授業"], url: null },
  { id: "risyu", name: "Web履修登録", tags: ["授業"], url: null },
  { id: "kyuko", name: "休講・補講", tags: ["授業"], url: null },
  { id: "kyoshitsu", name: "教室割公開", tags: ["授業"], url: null },
  { id: "shusseki", name: "出席管理", tags: ["授業"], url: null },
  { id: "kesseki", name: "欠席届", tags: ["授業"], url: null },
  { id: "shiken", name: "定期試験関係", tags: ["授業"], url: null },
  { id: "kouki", name: "後期授業関係", tags: ["授業"], url: null },
  { id: "moodle", name: "e-Learningシステム（Moodle）", tags: ["授業", "メール・ツール"], url: "https://fukuoka-u.resonantlms.com/" },
  { id: "webex", name: "遠隔授業システム（Webex Meetings）", tags: ["授業", "メール・ツール"], url: "https://fukuoka-u.webex.com/" },
  { id: "jugyo-enquete", name: "授業アンケート", tags: ["授業"], url: null },
  { id: "officehour", name: "オフィスアワー検索", tags: ["授業"], url: "https://acsf.jsysneo.fukuoka-u.ac.jp/kyogaku/syllabus/syllabus/mente/officehour.html" },
  { id: "campus", name: "福大キャンパス・授業教室等案内", tags: ["授業", "学生生活"], url: null },
  { id: "menkyo", name: "免許資格関連", tags: ["授業"], url: null },
  { id: "kyoshoku-karte", name: "教職課程履修カルテ", tags: ["授業"], url: null },
  // 成績
  { id: "seiseki", name: "成績発表", tags: ["成績"], url: null },
  { id: "gpa", name: "通算・年間GPA分布表（外部：Tableau Public）", tags: ["成績"], url: "https://public.tableau.com/app/profile/motomura.shinya/viz/GPA2025/GPA" },
  // ガイド・便覧
  { id: "gakushu-guide", name: "Web学修ガイド", tags: ["ガイド・便覧"], url: "https://www.fukuoka-u.ac.jp/support/institution/class/guide/index.html" },
  { id: "gakushu-navi", name: "福大生のための学習ナビ", tags: ["ガイド・便覧"], url: "https://www.idshe.fukuoka-u.ac.jp/navi/dbook/" },
  { id: "curriculum", name: "履修系統図（カリキュラム・ツリー／マップ）", tags: ["ガイド・便覧"], url: null },
  { id: "daigakuin-binran", name: "大学院便覧＜2026年度＞", tags: ["ガイド・便覧"], url: null },
  { id: "law-guide", name: "法科大学院学修ガイド＜2026年度＞", tags: ["ガイド・便覧"], url: "https://acsf.jsysneo.fukuoka-u.ac.jp/kyogaku/syllabus/syllabus/hokadaigakuin_gakushugaido_syllabus.pdf" },
  { id: "seikatsu-guide", name: "学生生活ガイド＜2026年度＞", tags: ["ガイド・便覧", "学生生活"], url: null },
  { id: "portal-manual", name: "FUポータル操作説明書（利用者編）", tags: ["ガイド・便覧"], url: null },
  // 学生生活
  { id: "gyoji", name: "行事予定", tags: ["学生生活"], url: null },
  { id: "gakuyukai", name: "学友会", tags: ["学生生活"], url: null },
  { id: "ryugaku", name: "交換留学・海外研修", tags: ["学生生活"], url: null },
  { id: "baito", name: "学生アルバイト情報ネットワーク", tags: ["学生生活"], url: "https://baitonet.jp/fukuoka-u/" },
  { id: "ryo", name: "学生寮（直営・指定）", tags: ["学生生活"], url: "https://www.fukuoka-u.ac.jp/support/life/singlelife.html" },
  { id: "geshuku", name: "マンション・アパート・一般下宿", tags: ["学生生活"], url: null },
  { id: "yoyaku-shogakukin", name: "イベント予約（奨学金書類点検予約）", tags: ["学生生活"], url: null },
  { id: "yoyaku-shinri", name: "イベント予約（学生心理相談）", tags: ["学生生活", "相談・安全"], url: null },
  { id: "stepup", name: "福大生ステップアッププログラム", tags: ["学生生活"], url: "https://www.fukuoka-u.ac.jp/fsp/index.html" },
  { id: "sotsugyo-enquete", name: "卒業予定生アンケート", tags: ["学生生活"], url: null },
  // 就職
  { id: "shushoku", name: "就職情報システム【学生】", tags: ["就職"], url: null },
  { id: "fcareer", name: "F-Career（求人検索NAVI）", tags: ["就職"], url: "https://www2.kyujin-navi.com/GAKUGAI/00402" },
  { id: "shushoku-guide", name: "就職情報システム利用ガイド", tags: ["就職"], url: null },
  { id: "fuspi", name: "FU-SPI（筆記試験対策サイト）", tags: ["就職"], url: "https://lines-spi.education.ne.jp/fukuoka-u" },
  { id: "fuspi-form", name: "FU-SPI アカウント申請フォーム（@cis でログイン）", tags: ["就職"], url: null },
  // メール・ツール
  { id: "mail-cis", name: "Webメール@cis", tags: ["メール・ツール"], url: "https://outlook.com/cis.fukuoka-u.ac.jp" },
  { id: "mail-staff", name: "教職員用メール@fukuoka-u", tags: ["メール・ツール"], url: "https://mail.google.com/a/fukuoka-u.ac.jp", staff: true },
  { id: "m365", name: "グループウェア（Microsoft365）", tags: ["メール・ツール"], url: "https://login.microsoftonline.com/" },
  { id: "m365-manual", name: "Microsoft365 マニュアル", tags: ["メール・ツール"], url: null },
  { id: "fubox", name: "FU_box（公認クラウドストレージ）", tags: ["メール・ツール"], url: "https://fukuoka-u.account.box.com/" },
  { id: "fubox-manual", name: "FU_box マニュアル", tags: ["メール・ツール"], url: null },
  { id: "mylibrary", name: "図書館 MyLibrary", tags: ["メール・ツール"], url: null },
  { id: "password", name: "「福大ID」パスワード変更", tags: ["メール・ツール"], url: "https://fukuokau.ex-tic.com/" },
  { id: "gakunai", name: "学内情報・学内サービス", tags: ["メール・ツール"], url: null },
  { id: "official", name: "本学公式WEBトップ", tags: ["メール・ツール"], url: "https://www.fukuoka-u.ac.jp/" },
  { id: "gakuho", name: "福岡大学学報", tags: ["メール・ツール"], url: null },
  // 研究
  { id: "kenkyusha", name: "研究者情報閲覧", tags: ["研究"], url: "https://kenkyusha-db.fukuoka-u.ac.jp/search/" },
  { id: "profile-search", name: "教員プロフィール検索", tags: ["研究"], url: null },
  { id: "researchmap", name: "研究者情報入力・更新（researchmap）", tags: ["研究"], url: "https://researchmap.jp/auth/login", staff: true },
  { id: "researchmap-manual", name: "researchmap 利用マニュアル", tags: ["研究"], url: "https://researchmap.jp/public/inquiry", staff: true },
  { id: "profile-edit", name: "教員プロフィール情報管理", tags: ["研究"], url: null, staff: true },
  { id: "profile-manual", name: "教員プロフィール操作マニュアル", tags: ["研究"], url: null, staff: true },
  { id: "kenkyuhi", name: "研究推進部（研究推進課）・研究費管理", tags: ["研究"], url: null, staff: true },
  { id: "yakuhin", name: "薬品管理システム", tags: ["研究"], url: null, staff: true },
  // 相談・安全
  { id: "toiawase", name: "システムに関する問合せ先", tags: ["相談・安全"], url: "https://acsf.jsysneo.fukuoka-u.ac.jp/kyoutu/portal/contactlist.htm" },
  { id: "incident", name: "情報インシデントの報告・連絡先", tags: ["相談・安全"], url: "https://fukuokadaigaku.sharepoint.com/sites/FU_CSIRT/SitePages/030_%E9%80%A3%E7%B5%A1%E5%85%88.aspx" },
  { id: "csirt", name: "情報セキュリティ FU-CSIRT 特設ページ", tags: ["相談・安全"], url: "https://fukuokadaigaku.sharepoint.com/sites/FU_CSIRT" },
  { id: "tokou", name: "学生の海外渡航に係る危機管理ガイドライン", tags: ["相談・安全"], url: null },
  { id: "harassment", name: "ハラスメント防止啓発パンフレット", tags: ["相談・安全"], url: "https://acsf.jsysneo.fukuoka-u.ac.jp/prevention/pamphlet.pdf" },
  { id: "saigai", name: "災害対策初動対応マニュアル", tags: ["相談・安全"], url: null },
  { id: "kinkyu", name: "緊急事態対応マニュアル", tags: ["相談・安全"], url: null },
  { id: "shikiten", name: "式典時の緊急事態対応マニュアル", tags: ["相談・安全"], url: null, staff: true },
  { id: "shobo", name: "福岡大学消防計画", tags: ["相談・安全"], url: null },
  { id: "koeki", name: "公益通報受付窓口の利用方法", tags: ["相談・安全"], url: null },
  { id: "koeki-sheet", name: "公益通報受付シート", tags: ["相談・安全"], url: null },
  // 規程・制度
  { id: "kitei", name: "学校法人福岡大学規程集", tags: ["規程・制度"], url: "https://sprb.legal-square.com/HAS-Shohin/page/SJLogin.jsf" },
  { id: "harassment-kitei", name: "ハラスメント防止・排除に関する規程・細則", tags: ["規程・制度"], url: null },
  { id: "koeki-kitei", name: "公益通報に関する規程・フローチャート", tags: ["規程・制度"], url: null },
  { id: "rijikai", name: "理事会・評議員会付議基準", tags: ["規程・制度"], url: null, staff: true },
  { id: "gakusoku", name: "学則の会議付議基準", tags: ["規程・制度"], url: null, staff: true },
  { id: "kifu", name: "ご支援のお願い・寄付申込方法（募金専用サイト）", tags: ["規程・制度"], url: "https://bokin.fukuoka-u.ac.jp/" },
  // 教職員事務
  { id: "kyuyo", name: "Web給与明細・Web年末調整（オフィスステーション）", tags: ["教職員事務"], url: null, staff: true },
  { id: "timepro-pc", name: "勤怠管理システム（TimePro）PC版 ※テスト環境", tags: ["教職員事務"], url: null, staff: true },
  { id: "timepro-sp", name: "勤怠管理システム（TimePro）スマホ版 ※テスト環境", tags: ["教職員事務"], url: null, staff: true },
  { id: "hasseigen", name: "人事発生源入力", tags: ["教職員事務"], url: null, staff: true },
  { id: "shukkin", name: "出勤管理システム", tags: ["教職員事務"], url: null, staff: true },
  { id: "fukuri", name: "福利厚生制度（私学共済・法人・子育て介護・健康増進）", tags: ["教職員事務"], url: null, staff: true },
  { id: "zaimu", name: "財務会計システム（調達申請／承認）", tags: ["教職員事務"], url: null, staff: true },
  { id: "ryohi", name: "出張申請・精算・承認（旅費システム Web旅費）", tags: ["教職員事務"], url: null, staff: true },
  { id: "kenko-staff", name: "教職員健康管理・健康診断結果閲覧", tags: ["教職員事務"], url: null, staff: true },
  { id: "fdsd", name: "FD・SD研修", tags: ["教職員事務"], url: "https://fukuoka-u.resonantlms.com/", staff: true },
  { id: "template", name: "福岡大学オリジナルテンプレート", tags: ["教職員事務"], url: null, staff: true },
  { id: "plusup", name: "FUプラスアップ授業（スケジュール・動画作成マニュアル・問い合わせ）", tags: ["教職員事務", "授業"], url: null, staff: true },
];
