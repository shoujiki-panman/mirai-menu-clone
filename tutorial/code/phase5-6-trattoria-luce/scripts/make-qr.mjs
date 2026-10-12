// テーブル用QRを作る: node scripts/make-qr.mjs https://<your-worker>.workers.dev 0102
// 引数1つ（URLだけ）ならトップページ（テーブル作成画面）のQRになります
import QRCode from "qrcode";
const [base, code] = process.argv.slice(2);
if (!base) { console.error("usage: node scripts/make-qr.mjs <BASE_URL> [TABLE_CODE]"); process.exit(2); }
const url = code ? `${base.replace(/\/$/, "")}/t/${code}` : base;
const out = code ? `table-qr-${code}.png` : "table-qr.png";
await QRCode.toFile(out, url, { width: 600, margin: 2 });
console.log(`${out} ← ${url}`);
