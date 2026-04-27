# M03 / M04 LINE Fix Report

Date: 2026-04-27

## A. 這次實際修改了哪些檔案

- [src/app/api/line/webhook/route.ts](/Users/wade/Developer/Jenny/senior-card-web/src/app/api/line/webhook/route.ts:1)
- [docs/m03_m04_line_trigger_audit.md](/Users/wade/Developer/Jenny/senior-card-web/docs/m03_m04_line_trigger_audit.md:1)
- [docs/m03_m04_line_root_cause.md](/Users/wade/Developer/Jenny/senior-card-web/docs/m03_m04_line_root_cause.md:1)

新增本報告：

- [docs/m03_m04_line_fix_report.md](/Users/wade/Developer/Jenny/senior-card-web/docs/m03_m04_line_fix_report.md:1)

## B. Rich Menu 第三格與第四格原本實際綁定什麼

依 LINE API `GET /v2/bot/richmenu/list` 與目前 default rich menu 檢查：

- default rich menu: `richmenu-4b44735870c4863840c1843e11706e22`
- 第三格
  - label: `關懷與配對`
  - type: `postback`
  - data: `module=m03&action=start`
  - displayText: `關懷與配對`
- 第四格
  - label: `最新活動與政策`
  - type: `postback`
  - data: `module=m04&action=start`
  - displayText: `最新活動與政策`

結論：

- rich menu 目前不是舊 action
- 第三格 / 第四格綁定本身正確

## C. Webhook 原本為何沒有正確回 M03 / M04

Tracing 結果顯示：

- webhook 其實有正確路由到 M03 / M04 handler
- M03 / M04 reply payload 也有實際產生
- 真正失敗發生在把 reply 送回 LINE 的 transport

舊版 `replyToLine()` 使用 Node `fetch`

在這台 webhook 執行環境中：

- `fetch('https://api.line.me/...')` 會出現 connect timeout / DNS failure
- 因此 handler 雖然命中，LINE 端仍收不到任何正式入口訊息

## D. 真正 root cause 是什麼

一句話：

- `replyToLine()` 的 Node `fetch` transport 在目前環境無法可靠連線到 `api.line.me`，不是 trigger 或 handler 對應錯誤。

補充：

- screenshot 裡的 `請從下方選單選擇服務。` 不在目前 repo 內，代表當時 LINE 客戶端看到的不是目前這份 webhook 程式碼

## E. 修正了哪幾段判斷順序或 trigger 對應

沒有修改 M03 / M04 trigger mapping。

這次保留原本 routing：

- rich menu postback:
  - `module=m03&action=start`
  - `module=m04&action=start`
- text trigger:
  - `關懷與配對`
  - `最新活動與政策`

這次真正修正的是：

- `replyToLine()` 從 Node `fetch` 改成使用 `curl` 呼叫 LINE reply API

另外為了 tracing 加了最小必要 log：

- event type
- text / postback data
- session state
- chosen handler
- reply payload summary
- reply API result

## F. 修正後如何驗證

### 1. 無 session state，點 rich menu 第三格

模擬 `postback data = module=m03&action=start`

結果：

- 命中 `handleM03Start`
- 產生 M03 入口 flex + onboarding text
- reply API 已真正連上 LINE，回 `400 Invalid reply token`

這裡的 `400` 是因為測試用 fake reply token，不是 transport failure。

### 2. 無 session state，點 rich menu 第四格

模擬 `postback data = module=m04&action=start`

結果：

- 命中 `handleM04Start`
- 產生 M04 overview flex + summary text
- reply API 已真正連上 LINE，回 `400 Invalid reply token`

### 3. 手動輸入 `關懷與配對`

結果：

- 命中 `handleM03Start`
- 產生 M03 入口訊息

### 4. 手動輸入 `最新活動與政策`

結果：

- 命中 `handleM04Start`
- 產生 M04 入口訊息

### 5. 在 M01 waiting state 時點 M03

結果：

- `message.received` 顯示已有 M01 session
- 仍命中 `handleM03Start`
- 沒有被 M01 state 攔截

### 6. 在 M02 waiting state 時點 M04

結果：

- `message.received` 顯示 `m02Status = waiting_for_diary`
- 仍命中 `handleM04Start`
- 沒有被 M02 diary waiting handler 吃掉

### 7. 在 M03 onboarding 中輸入 M04

結果：

- `message.received` 顯示 `m03Step = waiting_for_name`
- 仍命中 `handleM04Start`
- 沒有被 M03 name waiting state 吃掉

### 8. LINE payload 合法性

官方驗證：

- `POST /v2/bot/message/validate/reply` for M03 payload -> `200 {}`
- `POST /v2/bot/message/validate/reply` for M04 payload -> `200 {}`

### 9. Lint

- `npm run lint` 通過

### 10. Build

- `npm run build` 通過

## G. 還有哪些已知限制

- 這次模擬 webhook 使用的是 fake reply token，所以 LINE reply API 必然回 `400 Invalid reply token`
- 這個 `400` 反而證明 transport 已經成功打到 LINE，而不是還卡在 timeout / DNS
- 最後仍需要真實 LINE 客戶端點一次 rich menu，才能完成真人端驗證

## H. 若需要手動重建 rich menu，要執行什麼命令

從目前 API 查詢結果看，default rich menu 已是正確的 M01-M04 menu，所以這次修正不要求重建 rich menu。

若仍要手動重建，可執行：

```bash
cd /Users/wade/Developer/Jenny/senior-card-web
npm run line:create-rich-menu
```

但根據本次查核，rich menu 不是根因。
