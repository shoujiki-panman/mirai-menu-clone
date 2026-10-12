// ローカル専用の「相手ボットの webhook」もどき。外部には一切つながりません。
// 使い方: MOCK_KEY=crsr_test PASSPHRASE=test-pass node mock-peer.mjs
//   別ターミナルで: MIRAI_PEER_URL=http://127.0.0.1:8788/webhook MIRAI_PEER_KEY="Bearer crsr_test" ./send.sh msgs/preferences.json
import http from "node:http";

const KEY = process.env.MOCK_KEY || "crsr_test";
const PASS = process.env.PASSPHRASE || "test-pass";
const PORT = Number(process.env.PORT || 8788);

http
  .createServer((req, res) => {
    const reply = (code, obj) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(obj));
    };
    if (req.method !== "POST" || req.url !== "/webhook") return reply(404, { success: false });
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${KEY}`) return reply(401, { success: false, error: "bad key" });
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      let ev;
      try { ev = JSON.parse(raw); } catch { return reply(400, { success: false, error: "bad json" }); }
      // 受信側のルール：トップレベル → 無ければ context（JSON文字列）を読む
      const msg = ev.protocol ? ev : JSON.parse(ev.context || "{}");
      if (msg.protocol !== "mirai-menu/v1" || msg.passphrase !== PASS) {
        console.log("[mock] 無視しました（protocol / passphrase 不一致）");
        return reply(200, { success: true }); // webhook 自体は受理。ボットが何もしないだけ
      }
      const extra = Object.keys(msg).filter((k) => !["protocol", "passphrase", "from_bot", "table_id", "type", "constraints", "proposal", "note", "context"].includes(k));
      console.log(`[mock] ${msg.type} from=${msg.from_bot} table=${msg.table_id}`, msg.constraints ? JSON.stringify(msg.constraints) : "", msg.proposal ? JSON.stringify(msg.proposal) : "");
      if (extra.length) console.log("[mock] ⚠ 未定義のフィールド（個人情報が混ざっていない？）:", extra.join(", "));
      console.log("[mock] context フィールド:", typeof ev.context === "string" ? "あり" : "なし");
      reply(200, { success: true });
    });
  })
  .listen(PORT, "127.0.0.1", () => console.log(`mock peer: http://127.0.0.1:${PORT}/webhook  (key=${KEY.slice(0, 5)}…)`));
