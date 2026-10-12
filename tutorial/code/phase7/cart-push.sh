#!/usr/bin/env bash
# フェーズ7：合意した注文（agree の proposal）を、お店のテーブルのカートに入れる
# Usage: cart-push.sh agree.json
# Env:   MIRAI_SHOP_URL   例 https://trattoria-luce-backend.<you>.workers.dev
#        MIRAI_TABLE_CODE 4桁のテーブル番号
#        MIRAI_TABLE_TOKEN テーブル作成時に発行された botToken（tbl_...）。表示しない
set -euo pipefail
: "${MIRAI_SHOP_URL:?}"; : "${MIRAI_TABLE_CODE:?}"; : "${MIRAI_TABLE_TOKEN:?}"
command -v jq >/dev/null || { echo "jq required" >&2; exit 2; }
MSG="$(cat "${1:-/dev/stdin}")"
# "生ビール x2" → {name:"生ビール", qty:2}
BODY="$(echo "$MSG" | jq -c '{
  protocol, note: ("ボット合意: " + (.note // "")),
  items: [.proposal[] | capture("^(?<name>.+?)(?: x(?<q>[0-9]+))?$") | {name, qty: ((.q // "1")|tonumber)}]
}')"
HDR="$(mktemp)"; OUT="$(mktemp)"; trap 'rm -f "$HDR" "$OUT"' EXIT
printf 'Authorization: Bearer %s\n' "$(printf %s "$MIRAI_TABLE_TOKEN" | tr -d '\r\n')" > "$HDR"
CODE="$(curl -sS -o "$OUT" -w '%{http_code}' -X POST "${MIRAI_SHOP_URL%/}/api/tables/${MIRAI_TABLE_CODE}/bot-order" \
  -H @"$HDR" -H 'Content-Type: application/json' --data-binary "$BODY" || true)"
echo "HTTP $CODE"
jq -c '{ok, error, total: .table.total, cart: [.table.cart[]? | "\(.name) x\(.qty)"]}' "$OUT" 2>/dev/null || head -c 300 "$OUT"
[[ "$CODE" == 2* ]]
