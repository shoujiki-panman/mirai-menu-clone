// フェーズ4：交渉ループのシミュレーター（ローカルだけで動く。webhook は使わない）
// 本番では各ボット（LLM）がスキルに従ってこの判断をしますが、
// ルールを「コードで」先に確かめておくと、ボットの挙動の良し悪しを判定できます。
//   node negotiate.mjs            … 通常シナリオ
//   node negotiate.mjs correction … 途中で持ち主が訂正するシナリオ（reject → 修正 → agree）
//   node negotiate.mjs intruder   … 合言葉が違うメッセージが混ざるシナリオ
import { safeMenu } from "../phase5-6-trattoria-luce/src/menu.js";

const PROTOCOL = "mirai-menu/v1";
const PASS = "demo-passphrase"; // 本番は MIRAI_PASSPHRASE（環境変数）
const MAX_ROUNDS = 5;
const TABLE = "trattoria-luce/0102";
const COURSE = ["サラダ", "前菜", "ピザ", "パスタ", "メイン"]; // 1カテゴリ1品ずつ取り分け

const log = [];
const bus = []; // 届いた順に処理するキュー（= webhook の代わり）
const send = (to, msg) => bus.push({ to, msg: { protocol: PROTOCOL, passphrase: PASS, table_id: TABLE, ...msg } });

class Bot {
  // memory = 持ち主から聞いた「本当の情報」。ここは外に出さない
  constructor(name, memory) { this.name = name; this.memory = memory; }
  // 外に出すのは避けるタグと飲み物の希望だけ（理由・健康情報・名前は出さない）
  constraints() { return { avoid: this.memory.avoid, allergy: this.memory.allergy, drinks: this.memory.drinks }; }
  accepts(msg) { return msg.protocol === PROTOCOL && msg.passphrase === PASS; }
  ok(dishName) {
    const d = dishName.replace(/ x\d+$/, "");
    return !safeMenu([]).find((m) => m.name === d)?.tags.some((t) => this.memory.avoid.includes(t));
  }
}

class Member extends Bot {
  receive(msg) {
    if (!this.accepts(msg)) return log.push(`  ${this.name}: 合言葉不一致 → 無視`);
    if (msg.type === "proposal") {
      const bad = msg.proposal.filter((d) => !this.ok(d));
      if (!bad.length) return send("幹事Bot", { from_bot: this.name, type: "agree", proposal: msg.proposal });
      // NG の料理を外した修正案＋最新の constraints を添えて reject
      send("幹事Bot", { from_bot: this.name, type: "reject", proposal: msg.proposal.filter((d) => this.ok(d)), constraints: this.constraints(), note: "一部食べられないので修正案" });
    }
    if (msg.type === "agree") log.push(`  ${this.name} → 持ち主へ: 注文が決まりました：${msg.proposal.join("、")}`);
  }
}

class Organizer extends Bot {
  constructor(name, memory, members) {
    super(name, memory);
    this.members = members; this.prefs = { [name]: this.constraints() }; this.round = 0; this.votes = {}; this.done = false;
  }
  build() {
    const avoid = [...new Set(Object.values(this.prefs).flatMap((c) => c.avoid))];
    const ok = safeMenu(avoid);
    const food = COURSE.map((cat) => ok.find((m) => m.cat === cat)?.name).filter(Boolean);
    // 飲み物：drinks に「ノンアル」を含む人はノンアル、それ以外は生ビール
    const n = Object.keys(this.prefs).length;
    const soft = Object.values(this.prefs).filter((c) => /ノンアル|飲めない/.test(c.drinks || "")).length;
    const drinks = [];
    if (n - soft > 0) drinks.push(`生ビール x${n - soft}`);
    if (soft > 0) drinks.push(`ノンアルコールビール x${soft}`);
    return [...food, ...drinks];
  }
  propose() {
    if (++this.round > MAX_ROUNDS) { this.done = true; return log.push(`  幹事Bot: ${MAX_ROUNDS}往復で合意できず → 持ち主に相談`); }
    this.votes = {};
    this.current = this.build();
    log.push(`  幹事Bot: round ${this.round} 提案 → ${this.current.join("、")}`);
    for (const m of this.members) send(m.name, { from_bot: this.name, type: "proposal", proposal: this.current, note: `round ${this.round}` });
  }
  receive(msg) {
    if (!this.accepts(msg)) return log.push(`  幹事Bot: 合言葉不一致 → 無視`);
    if (this.done) return;
    if (msg.type === "preferences") {
      this.prefs[msg.from_bot] = msg.constraints;
      log.push(`  幹事Bot: ${msg.from_bot} の避けるもの = ${msg.constraints.avoid.join("・") || "なし"}`);
      if (Object.keys(this.prefs).length === this.members.length + 1) this.propose();
    }
    if (msg.type === "agree" || msg.type === "reject") {
      if (msg.type === "reject") this.prefs[msg.from_bot] = msg.constraints || this.prefs[msg.from_bot];
      this.votes[msg.from_bot] = msg.type;
      if (Object.keys(this.votes).length < this.members.length) return;
      if (Object.values(this.votes).every((v) => v === "agree")) {
        this.done = true;
        log.push(`  幹事Bot: 全員 agree（${this.round}往復）→ カートへ`);
        for (const m of this.members) send(m.name, { from_bot: this.name, type: "agree", proposal: this.current });
      } else this.propose();
    }
  }
}

// ---- シナリオ ----
const scenario = process.argv[2] || "normal";
const A = new Member("飲み会メンバーA", { avoid: ["えび"], allergy: true, drinks: "なんでもOK", reason: "甲殻類アレルギー（外に出さない）" });
const B = new Member("飲み会メンバーB", { avoid: ["貝", "きのこ"], allergy: false, drinks: "ワインが好き" });
const C = new Member("飲み会メンバーC", { avoid: [], allergy: false, drinks: "ビール1杯まで、あとはノンアル" });
const H = new Organizer("幹事Bot", { avoid: [], allergy: false, drinks: "なんでもOK" }, [A, B, C]);
const bots = Object.fromEntries([A, B, C, H].map((b) => [b.name, b]));

log.push(`[scenario: ${scenario}]`);
for (const m of [A, B, C]) send("幹事Bot", { from_bot: m.name, type: "preferences", constraints: m.constraints() });
if (scenario === "intruder") bus.unshift({ to: "幹事Bot", msg: { protocol: PROTOCOL, passphrase: "wrong", from_bot: "?", table_id: TABLE, type: "preferences", constraints: { avoid: ["小麦"] } } });

let steps = 0;
while (bus.length && steps++ < 200) {
  const { to, msg } = bus.shift();
  // correction: 最初の提案が届いた直後に、Bの持ち主が「乳もダメだった」と訂正
  if (scenario === "correction" && to === B.name && msg.type === "proposal" && msg.note === "round 1") {
    B.memory.avoid = [...B.memory.avoid, "乳"];
    log.push(`  （Bの持ち主がチャットで訂正：「乳製品もダメでした」）`);
  }
  bots[to].receive(msg);
}
console.log(log.join("\n"));

// ---- 自己チェック（ゴール判定）----
const final = H.current || [];
const allOk = [A, B, C, H].every((b) => final.every((d) => b.ok(d)));
const leaked = JSON.stringify(log).includes("アレルギー（外に出さない）");
console.log(`\nチェック: 合意=${H.done && H.round <= MAX_ROUNDS} / 全員食べられる=${allOk} / 往復数=${H.round} / 理由の漏えいなし=${!leaked}`);
process.exit(H.done && allOk && !leaked ? 0 : 1);
