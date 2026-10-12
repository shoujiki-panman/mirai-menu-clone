// wrangler なしで API の動きを確かめるテスト（KV をメモリで代用）: npm test
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const kv = () => {
  const m = new Map();
  return {
    get: async (k, type) => (m.has(k) ? (type === "json" ? JSON.parse(m.get(k)) : m.get(k)) : null),
    put: async (k, v) => void m.set(k, v),
  };
};
const env = { TABLES: kv(), ASSETS: { fetch: async () => new Response("asset") } };
const call = async (method, path, body, headers = {}) => {
  const r = await worker.fetch(new Request("http://x" + path, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: r.status, body: await r.json() };
};

test("テーブル作成 → 参加 → 和集合だけ公開 → ボット注文 → 確定", async () => {
  const t = await call("POST", "/api/tables", { size: 2 });
  assert.equal(t.status, 201);
  assert.match(t.body.code, /^\d{4}$/);
  const code = t.body.code, token = t.body.botToken;

  const a = await call("POST", `/api/tables/${code}/join`, { nickname: "A", avoid: ["えび", "謎タグ"] });
  assert.deepEqual(a.body.table.avoidUnion, ["えび"]); // 未知タグは捨てる
  await call("POST", `/api/tables/${code}/join`, { nickname: "B", avoid: ["きのこ"] });
  const full = await call("POST", `/api/tables/${code}/join`, { nickname: "C" });
  assert.equal(full.status, 409); // 満席

  const view = await call("GET", `/api/tables/${code}`);
  assert.ok(!JSON.stringify(view.body).includes("botToken")); // トークンは公開ビューに出ない
  assert.ok(!("members" in view.body.table)); // 誰が何を避けるかは出ない

  assert.equal((await call("POST", `/api/tables/${code}/bot-order`, { protocol: "mirai-menu/v1", items: [{ id: 103 }] }, { authorization: "Bearer nope" })).status, 401);
  assert.equal((await call("POST", `/api/tables/${code}/bot-order`, { protocol: "mirai-menu/v1", items: [{ id: 101 }] }, { authorization: `Bearer ${token}` })).status, 409);
  const ok = await call("POST", `/api/tables/${code}/bot-order`, { protocol: "mirai-menu/v1", items: [{ name: "マルゲリータ", qty: 2 }] }, { authorization: `Bearer ${token}` });
  assert.equal(ok.body.table.total, 800);

  assert.equal((await call("POST", `/api/tables/${code}/submit`)).body.table.status, "ordered");
});
