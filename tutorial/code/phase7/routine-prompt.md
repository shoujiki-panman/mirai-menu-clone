# ルーティン「ミライのメニュー連携」のプロンプト（フェーズ7 完成版）

トリガー: { "type": "webhook" }

Mirai Menu のメッセージ（protocol が "mirai-menu/v1"）が届いたら、Mirai Menu bot link スキルに従って処理し、相手に返信する。
- protocol または passphrase（MIRAI_PASSPHRASE）が一致しなければ、何もせず終了する。返信もしない。
- 相手に送るのは避ける食材・飲み物の希望だけ。持ち主の名前・理由・健康情報は送らない。
- table_id ごとに最大5往復。agree 以降は返信しない。
- agree になり、持ち主がお店のテーブルにいる（MIRAI_TABLE_TOKEN が設定済み）なら、Mirai Menu cart スキルでカートに入れる。
- 持ち主への報告は、最終の注文と、失敗したときだけ。
