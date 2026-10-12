---
name: Mirai Menu cart
description: >-
  Use after a Mirai Menu negotiation reaches "agree", when the owner is seated at a
  Trattoria Luce table, to put the agreed order into that table's cart (ミライのメニュー カート連携).
---
# ミライのメニュー：合意した注文をカートに入れる

前提：mirai-menu-bot-link スキルで全員が agree した。持ち主が幹事で、テーブルを作成済み。

## 必要な秘密情報（チャットに貼らせない。秘密入力で受け取る）
- `MIRAI_SHOP_URL`：お店のURL（QRの飛び先）
- `MIRAI_TABLE_CODE`：4桁のテーブル番号（これは秘密ではないのでチャットでもよい）
- `MIRAI_TABLE_TOKEN`：テーブル作成時に表示された botToken（`tbl_...`）。秘密。

## 手順
1. 最後に agree した proposal を JSON ファイル（agree.json）に保存する。
2. `cart-push.sh agree.json` を実行する（トークンは表示しない）。
3. HTTP 200 なら、持ち主に「カートに入れました。合計 ¥X。注文ページで確認して『注文する』を押してください」と伝える。
   - 409（誰かの避けたいものを含む）→ その料理を外して mirai-menu-bot-link で再交渉（max 5 rounds を守る）。
   - 401 → トークンが違う。持ち主にテーブルを作り直してもらう。
4. 「注文する」（submit）はボットが勝手に押さない。最後の確定は人間がする。
