# LINE Production Root Cause Fix Report

Date: 2026-04-27
Project: `/Users/wade/Developer/Jenny/senior-card-web`
Production alias: `https://v0-jennyforold.vercel.app`

## A. 舊 fallback 真正來自哪個檔案哪個分支

目前工作樹全文搜尋 `請從下方選單選擇服務`，正式程式碼中已不存在。

但 git 歷史確認這句話曾經存在於舊版 webhook：

- commit `c2c0ab6e36f2edf686975b34dfc9124004b621b7`
- file: `src/app/api/line/webhook/route.ts`
- line: `return { type: "text", text: "請從下方選單選擇服務。" };`

同類舊版也存在於：

- `04f4ecaacccef36beb0801e49f6c27c6c7ca5d59`
- `fd0458f9f2c393331c5c81a423377aa66dc57b66`
- 更早的 `d485cdf2175e3a0e053453c35a5586d27e5ddfc0`
- 更早的 `fdb36ae51e731983a28ede1723f1723d66b172a4`
- 更早的 `d0daab4453b67b6a07c65c9ee54d3193ec172f61`

因此，使用者在 LINE 客戶端實際看到的舊 fallback，確實是歷史版 `src/app/api/line/webhook/route.ts` 的 fallback 分支，不是目前 repo 這版。

## B. 正式 LINE 原本實際打到哪裡

LINE Messaging API 實查：

- `GET /v2/bot/channel/webhook/endpoint`
- result: `https://v0-jennyforold.vercel.app/api/line/webhook`

正式 webhook URL 對應到 Vercel：

- project: `v0-line-senior-card`
- linked project id: `prj_cU4DyvrwACPzMx1JJT6Hcki3OuzC`
- organization: `wade-jens-projects`

在修正前，production alias `v0-jennyforold.vercel.app` 指到舊 deployment：

- `dpl_rm71ir6KZcAwpsfrYHypPkfUy7bu`
- preview URL: `https://v0-line-senior-card-5889f33l1-wade-jens-projects.vercel.app`

舊 deployment 的正式 `GET /api/line/webhook` 回應為：

```json
{"ok":true,"route":"/api/line/webhook","service":"line-webhook"}
```

而且它的 build 輸出只包含：

- `/`
- `/_not-found`
- `/api/cron/supabase-keepalive`
- `/api/line/webhook`
- `/api/m01/cards/[cardId]/image`

沒有目前 repo 裡的：

- `/api/admin/system-check`
- `/api/m03/actions`
- `/api/m03/settings`
- `/cards`
- `/info-admin`
- `/m03`

這證明正式 LINE 路徑原本打到的是舊版 production deployment。

## C. 真正根因是什麼

真正根因有兩層，但主因只有一個：

### 主因

- LINE Console 的 webhook URL 沒有指錯
- rich menu 第三格 / 第四格 action 也沒有綁錯
- 真正問題是 `v0-jennyforold.vercel.app` 原本 alias 到舊 deployment
- 那個 deployment 裡跑的是歷史版 webhook，仍會走舊 fallback `請從下方選單選擇服務。`

### 次要修補

在目前新版 webhook 裡，`replyToLine()` 原本使用 Node `fetch`
在本地偵查環境中，對 `api.line.me` 曾出現 connect timeout / DNS failure。

這不是真正造成正式 LINE 客戶端看到舊 fallback 的主因，但我仍一併修成 `curl` transport，避免 reply transport 成為下一個不穩定點。

## D. 你實際改了哪些檔案

實際修正與追查涉及：

- `src/app/api/line/webhook/route.ts`
  - 保留並部署新版 M03 / M04 入口邏輯
  - 補最小必要 trace
  - 將 `replyToLine()` 改成 `curl` transport
- `docs/m03_m04_line_trigger_audit.md`
- `docs/m03_m04_line_root_cause.md`
- `docs/m03_m04_line_fix_report.md`
- `docs/line_production_root_cause_fix_report.md`

## E. 是否重建 rich menu

沒有重建。

原因：

- LINE API `GET /v2/bot/richmenu/list` 已確認 default rich menu 正確
- current default rich menu: `richmenu-4b44735870c4863840c1843e11706e22`

第三格目前實際是：

- label: `關懷與配對`
- type: `postback`
- data: `module=m03&action=start`
- displayText: `關懷與配對`

第四格目前實際是：

- label: `最新活動與政策`
- type: `postback`
- data: `module=m04&action=start`
- displayText: `最新活動與政策`

所以 rich menu 不是根因，不需要重建。

## F. 是否重新部署 Vercel

有，且最後完成了正式 production alias 切換。

過程：

1. 先確認舊 production alias 指向舊 deployment
2. 直接把目前工作樹用 `vercel --prod --yes` 部署到 production
3. 一度開 `LINE_WEBHOOK_TRACE=1` 做正式 runtime tracing
4. 驗證後將該 env 移除，再做一次乾淨 production deploy

最終正式 deployment：

- deployment id: `dpl_3Ewa3r2LTYhgDDXCv3ygBZu61BwP`
- preview URL: `https://v0-line-senior-card-msv0cbgge-wade-jens-projects.vercel.app`
- aliased to: `https://v0-jennyforold.vercel.app`

正式 `GET /api/line/webhook` 現在回應為：

```json
{"ok":true,"route":"/api/line/webhook","modules":["m01","m02","m03","m04","egg"]}
```

這已與目前 repo 版本一致。

## G. 是否需要我手動改 LINE Console 設定

不需要。

已確認：

- webhook URL 本來就是正確的正式 alias
- rich menu 綁定本來就是正確的 M03 / M04 action

這次不需要你手動改 LINE Console 的任何值。

## H. 修完後的正式驗證結果

### 正式鏈路驗證

1. LINE webhook endpoint 實查：
   - `https://v0-jennyforold.vercel.app/api/line/webhook`

2. 正式 alias 對應 deployment 實查：
   - 已切到 `dpl_3Ewa3r2LTYhgDDXCv3ygBZu61BwP`

3. 正式 `GET /api/line/webhook`：
   - 回新版 `modules` 結果

4. 正式 runtime tracing
   - 已短暫開 production trace 後送簽名 webhook
   - `message text = 最新活動與政策`
     - 正式 logs 顯示命中新版 message 路徑
     - 顯示 `reply.attempt` 的 message 為新版 M04 flex + text
   - `postback data = module=m03&action=start`
     - 正式 logs 顯示命中 `handleM03Start`
     - 顯示 `reply.attempt` 為新版 M03 入口回覆

5. 正式 reply path
   - fake reply token 測試回 `400 Invalid reply token`
   - 這表示正式 webhook 已成功把 reply 送到 LINE reply API
   - 不再是舊 deployment 的 fallback 行為

6. rich menu 設定一致性
   - 第三格 -> `module=m03&action=start`
   - 第四格 -> `module=m04&action=start`
   - 與目前 production webhook trigger 一致

7. 本地品質驗證
   - `npm run lint` 通過
   - `npm run build` 通過

## I. 還有沒有任何殘留風險

有兩個已知殘留風險，但都不是這次「舊 fallback」問題：

1. M03 在 production 目前仍可能顯示「服務正在整理中」
   - 正式 tracing 顯示 `handleM03Start` 已命中
   - 但因 production 端 remote-ready 檢查未通過，所以回的是新版 M03 正式入口 + not-ready 訊息
   - 這已不是舊 fallback 問題，而是 M03 production remote schema / data readiness 問題

2. Production logs 顯示 `line_interaction_events` 在 Supabase schema cache 中找不到
   - 這會影響部分 session / interaction tracing
   - 但不會把 M03 / M04 打回舊 fallback

總結：

- 「請從下方選單選擇服務」的正式問題已修掉
- rich menu / text trigger 現在都會進新版 production webhook
- 正式 alias 已切到目前 repo 對應的新版 deployment
