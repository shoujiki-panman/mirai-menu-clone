// Trattoria Luce バックエンド（Cloudflare Workers + KV）
// 教材用の再構築版。元リポジトリには Workers のソースが含まれていないため、
// README とスクリーンショットから設計し直したものです。
import { MENU, TAGS, CATEGORIES, safeMenu } from "./menu.js";

const TTL = 60 * 60 * 6; // テーブルは6時間で自動削除（KV の expirationTtl）
const MAX_SIZE = 8;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
const err = (status, message) => json({ ok: false, error: message }, status);

const key = (code) => `table:${code}`;
const load = async (env, code) => (/^\d{4}$/.test(code) ? env.TABLES.get(key(code), "json") : null);
const save = (env, t) => env.TABLES.put(key(t.code), JSON.stringify(t), { expirationTtl: TTL });

const randomCode = () => String(crypto.getRandomValues(new Uint16Array(1))[0] % 10000).padStart(4, "0");
const randomToken = () =>
  "tbl_" + [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");

const cleanAvoid = (avoid) => [...new Set((Array.isArray(avoid) ? avoid : []).filter((t) => TAGS.includes(t)))];

// テーブル全体の「避けるもの」= 全員の avoid の和集合。誰の NG かは返さない（プライバシー）
const avoidUnion = (t) => [...new Set(Object.values(t.members).flatMap((m) => m.avoid))].sort();

// 他の人に見せてよい情報だけに絞った「公開ビュー」
function publicView(t) {
  const union = avoidUnion(t);
  const cart = Object.entries(t.cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => {
      const item = MENU.find((m) => m.id === Number(id));
      return { id: item.id, name: item.name, price: item.price, qty, conflict: item.tags.some((x) => union.includes(x)) };
    });
  return {
    code: t.code,
    size: t.size,
    status: t.status,
    joined: Object.keys(t.members).length,
    nicknames: Object.values(t.members).map((m) => m.nickname),
    avoidUnion: union,
    cart,
    total: cart.reduce((s, c) => s + c.price * c.qty, 0),
    botNote: t.botNote || null,
  };
}

async function readBody(req) {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? b : {};
  } catch {
    return {};
  }
}

async function api(req, env, url) {
  const p = url.pathname.split("/").filter(Boolean); // ["api", ...]
  const m = req.method;

  // GET /api/menu?avoid=えび,乳
  if (p[1] === "menu" && m === "GET") {
    const avoid = cleanAvoid((url.searchParams.get("avoid") || "").split(",").filter(Boolean));
    return json({ ok: true, tags: TAGS, categories: CATEGORIES, items: avoid.length ? safeMenu(avoid) : MENU });
  }

  // POST /api/tables {size} → 4桁コードを発行
  if (p[1] === "tables" && p.length === 2 && m === "POST") {
    const { size } = await readBody(req);
    const n = Number(size);
    if (!Number.isInteger(n) || n < 1 || n > MAX_SIZE) return err(400, `size は 1〜${MAX_SIZE}`);
    let code;
    for (let i = 0; i < 20; i++) {
      const c = randomCode();
      if (!(await env.TABLES.get(key(c)))) { code = c; break; }
    }
    if (!code) return err(503, "空きコードがありません");
    const t = { code, size: n, status: "open", members: {}, cart: {}, botToken: randomToken(), createdAt: Date.now() };
    await save(env, t);
    // botToken は作成者にだけ一度返す（フェーズ7でボットに渡す。チャットに貼らない）
    return json({ ok: true, code, size: n, botToken: t.botToken }, 201);
  }

  if (p[1] !== "tables" || !p[2]) return err(404, "not found");
  const t = await load(env, p[2]);
  if (!t) return err(404, "テーブルが見つかりません");
  const sub = p[3];

  // GET /api/tables/:code
  if (!sub && m === "GET") return json({ ok: true, table: publicView(t) });

  // POST /api/tables/:code/join {nickname, avoid}
  if (sub === "join" && m === "POST") {
    const { nickname, avoid } = await readBody(req);
    if (Object.keys(t.members).length >= t.size) return err(409, "満席です");
    const id = crypto.randomUUID();
    t.members[id] = { nickname: String(nickname || "ゲスト").slice(0, 20), avoid: cleanAvoid(avoid) };
    await save(env, t);
    return json({ ok: true, memberId: id, table: publicView(t) }, 201);
  }

  // PUT /api/tables/:code/members/:id {avoid}  … 持ち主が後から訂正したとき
  if (sub === "members" && p[4] && m === "PUT") {
    const mem = t.members[p[4]];
    if (!mem) return err(404, "member not found");
    mem.avoid = cleanAvoid((await readBody(req)).avoid);
    await save(env, t);
    return json({ ok: true, table: publicView(t) });
  }

  // POST /api/tables/:code/cart {itemId, delta}
  if (sub === "cart" && m === "POST") {
    if (t.status !== "open") return err(409, "注文済みです");
    const { itemId, delta } = await readBody(req);
    const item = MENU.find((x) => x.id === Number(itemId));
    if (!item) return err(400, "unknown itemId");
    const d = Math.max(-10, Math.min(10, Number(delta) || 0));
    t.cart[item.id] = Math.max(0, (t.cart[item.id] || 0) + d);
    await save(env, t);
    const conflict = item.tags.filter((x) => avoidUnion(t).includes(x));
    return json({ ok: true, warning: conflict.length ? `テーブルの誰かが避けたいもの（${conflict.join("・")}）を含みます` : null, table: publicView(t) });
  }

  // POST /api/tables/:code/bot-order  … フェーズ7：合意した注文をボットがカートに入れる
  // Authorization: Bearer <botToken>
  // {protocol:"mirai-menu/v1", items:[{id, qty}], note}
  if (sub === "bot-order" && m === "POST") {
    const auth = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!auth || auth !== t.botToken) return err(401, "invalid bot token");
    if (t.status !== "open") return err(409, "注文済みです");
    const body = await readBody(req);
    if (body.protocol !== "mirai-menu/v1") return err(400, "protocol mismatch");
    const items = Array.isArray(body.items) ? body.items : [];
    const union = avoidUnion(t);
    const resolved = [];
    for (const it of items) {
      const item = MENU.find((x) => x.id === Number(it.id) || x.name === it.name);
      if (!item) return err(400, `unknown item: ${it.id ?? it.name}`);
      const bad = item.tags.filter((x) => union.includes(x));
      if (bad.length) return err(409, `${item.name} はテーブルの避けたいもの（${bad.join("・")}）を含みます`);
      resolved.push([item.id, Math.max(1, Math.min(10, Number(it.qty) || 1))]);
    }
    for (const [id, q] of resolved) t.cart[id] = (t.cart[id] || 0) + q;
    t.botNote = String(body.note || "").slice(0, 140) || null;
    await save(env, t);
    return json({ ok: true, table: publicView(t) });
  }

  // POST /api/tables/:code/submit
  if (sub === "submit" && m === "POST") {
    if (!Object.values(t.cart).some((q) => q > 0)) return err(400, "カートが空です");
    t.status = "ordered";
    t.orderedAt = Date.now();
    await save(env, t);
    return json({ ok: true, table: publicView(t) });
  }

  return err(404, "not found");
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await api(req, env, url);
      } catch (e) {
        return err(500, "internal error");
      }
    }
    // /t/1234 と /ipad?table=1234 は同じ注文ページ（order.html）を返す
    if (/^\/t\/\d{4}$/.test(url.pathname) || url.pathname === "/ipad") {
      return env.ASSETS.fetch(new Request(new URL("/order", url), req));
    }
    return env.ASSETS.fetch(req);
  },
};
