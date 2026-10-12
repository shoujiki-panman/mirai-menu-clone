// デモ店舗「Trattoria Luce」のメニュー（教材用サンプル。実店舗のデータではありません）
// tags は「避けたいもの」の共通語彙。UI のチップ・ボットの avoid と同じ言葉を使う。
export const TAGS = [
  "えび", "いか", "貝", "魚卵", "卵", "乳", "小麦", "ナッツ",
  "牛", "豚", "鶏", "きのこ", "にんにく", "辛い", "アルコール", "カフェイン",
];

export const CATEGORIES = ["サラダ", "スープ", "前菜", "ドリア", "ピザ", "パスタ", "メイン", "パン・ライス", "デザート", "ドリンク"];

export const MENU = [
  { id: 101, cat: "サラダ", name: "小エビとアボカドのサラダ", price: 390, tags: ["えび", "卵"] },
  { id: 102, cat: "サラダ", name: "ルッコラと生ハムのサラダ", price: 420, tags: ["豚", "乳"] },
  { id: 103, cat: "サラダ", name: "彩り野菜のグリーンサラダ", price: 290, tags: [] },
  { id: 111, cat: "スープ", name: "かぼちゃのポタージュ", price: 220, tags: ["乳", "小麦"] },
  { id: 112, cat: "スープ", name: "ごろごろ野菜のミネストローネ", price: 280, tags: ["にんにく"] },
  { id: 201, cat: "前菜", name: "スパイシーチキンウィング", price: 320, tags: ["鶏", "辛い", "にんにく"], star: true },
  { id: 202, cat: "前菜", name: "生ガキのレモン添え", price: 480, tags: ["貝"] },
  { id: 203, cat: "前菜", name: "マッシュルームのアヒージョ", price: 380, tags: ["きのこ", "にんにく", "小麦"] },
  { id: 204, cat: "前菜", name: "いかのフリット", price: 350, tags: ["いか", "小麦", "卵"] },
  { id: 301, cat: "ドリア", name: "ミラノ風ドリア", price: 300, tags: ["牛", "豚", "乳", "小麦"] },
  { id: 401, cat: "ピザ", name: "マルゲリータ", price: 400, tags: ["乳", "小麦"] },
  { id: 402, cat: "ピザ", name: "きのこのクワトロピザ", price: 480, tags: ["きのこ", "乳", "小麦"] },
  { id: 501, cat: "パスタ", name: "ペペロンチーノ", price: 350, tags: ["小麦", "にんにく", "辛い"] },
  { id: 502, cat: "パスタ", name: "たらこクリームスパゲッティ", price: 420, tags: ["魚卵", "乳", "小麦"] },
  { id: 503, cat: "パスタ", name: "ボロネーゼ", price: 450, tags: ["牛", "豚", "小麦"] },
  { id: 601, cat: "メイン", name: "若鶏のグリル", price: 500, tags: ["鶏", "にんにく"] },
  { id: 602, cat: "メイン", name: "牛ハラミのステーキ", price: 780, tags: ["牛"] },
  { id: 701, cat: "パン・ライス", name: "フォカッチャ", price: 150, tags: ["小麦"] },
  { id: 702, cat: "パン・ライス", name: "ライス", price: 150, tags: [] },
  { id: 801, cat: "デザート", name: "ティラミス", price: 300, tags: ["乳", "卵", "小麦", "カフェイン", "アルコール"] },
  { id: 802, cat: "デザート", name: "ジェラート（ミルク）", price: 250, tags: ["乳"] },
  { id: 803, cat: "デザート", name: "フルーツシャーベット", price: 250, tags: [] },
  { id: 901, cat: "ドリンク", name: "生ビール", price: 400, tags: ["アルコール"] },
  { id: 902, cat: "ドリンク", name: "グラスワイン（赤・白）", price: 350, tags: ["アルコール"] },
  { id: 903, cat: "ドリンク", name: "ノンアルコールビール", price: 350, tags: [] },
  { id: 904, cat: "ドリンク", name: "ウーロン茶", price: 200, tags: ["カフェイン"] },
  { id: 905, cat: "ドリンク", name: "オレンジジュース", price: 200, tags: [] },
];

/** avoid（タグ配列）を1つも含まない料理だけを返す */
export function safeMenu(avoid = []) {
  const ng = new Set(avoid);
  return MENU.filter((m) => !m.tags.some((t) => ng.has(t)));
}
