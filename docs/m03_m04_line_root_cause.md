# M03 / M04 LINE Root Cause

Date: 2026-04-27

## A. 表面現象

使用者在 LINE 端點 rich menu 第三格 `關懷與配對`、第四格 `最新活動與政策`，或直接輸入相同文字時，沒有看到預期的 M03 / M04 正式入口訊息。

## B. 真正根因

真正根因不是 trigger 對不上，也不是 session state 把 M03 / M04 吃掉。

真正失效點是：

- webhook 已經正確進入 M03 / M04 handler
- reply payload 也已正確產生
- 但共用 `replyToLine()` 使用的 Node `fetch` / undici transport，在這台 webhook 執行環境中無法穩定連到 `api.line.me`
- 結果是 reply message 根本沒有成功送出到 LINE

因此使用者看不到預期入口訊息。

## C. 根因對應哪個檔案哪段邏輯

主要失效邏輯在：

- [src/app/api/line/webhook/route.ts](/Users/wade/Developer/Jenny/senior-card-web/src/app/api/line/webhook/route.ts:125)

具體是舊版 `replyToLine()` 這段：

- 直接用 `fetch("https://api.line.me/v2/bot/message/reply", ...)`

Tracing 證據：

- `module=m03&action=start` 確實命中 `handleM03Start()`
- `module=m04&action=start` 確實命中 `handleM04Start()`
- `關懷與配對` 文字 trigger 確實命中 `handleM03Start()`
- `最新活動與政策` 文字 trigger 確實命中 `handleM04Start()`
- 但 reply transport 在送出階段失敗，原先是 timeout / DNS resolution failure

## D. 為什麼前一版看起來像有模板但 LINE 端仍看不到

因為問題不在 template builder 本身。

Tracing 顯示：

- handler 已選對
- message payload 已組好
- 但訊息沒有成功送到 LINE

所以就算 route.ts 裡有 M03 / M04 入口訊息 builder，LINE 端仍然看不到。

另外，使用者截圖中的 `請從下方選單選擇服務。` 這句文字不在目前 repo 的 [route.ts](/Users/wade/Developer/Jenny/senior-card-web/src/app/api/line/webhook/route.ts:1) 中。
這表示那張圖不是由目前這份 webhook 程式碼產生，而是來自較舊的 webhook process / 較舊版本。

## E. 影響範圍

這不是只影響 M03 / M04 的獨立 bug，而是 LINE reply 的共用 transport 問題。

影響範圍：

- 所有透過 `replyToLine()` 回覆的 LINE 互動都會受影響
- 這次之所以先在 M03 / M04 被追出來，是因為要驗證正式入口訊息

但同時也已排除以下不是根因：

- rich menu 第三格 / 第四格 action 不一致
- postback `module` / `action` 對不上
- displayText 與文字 trigger 不一致
- M03 / M04 handler never reached
- M02 waiting state 吃掉 M04 trigger
- M03 onboarding state 吃掉 M04 trigger
- M01 state 吃掉 M03 trigger
- Flex payload 結構非法

已驗證的事實：

- LINE default rich menu 現在實際綁的是 `richmenu-4b44735870c4863840c1843e11706e22`
- 第三格實際是 `module=m03&action=start`
- 第四格實際是 `module=m04&action=start`
- M03 / M04 payload 送 `POST /v2/bot/message/validate/reply` 均回 `200 {}`
