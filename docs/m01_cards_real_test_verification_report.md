# M01 /cards Real Test Verification Report

日期：2026-04-28

## A. 實際測試步驟

1. 啟動本機 Next dev server：`LINE_WEBHOOK_TRACE=1 npm run dev`
2. 用三張臨時 PNG 透過 `/api/admin/cards` 的 `batch_upload` 實際上傳。
3. 查 Cloudinary URL 是否可讀，查 `card_catalog` 是否新增 draft。
4. 透過 `/api/admin/cards` 實際送出：
   - `batch_update`
   - `batch_set_status` to `inactive`
   - `batch_set_status` to `active`
   - `delete_drafts`
5. 用 headless Chrome + Chrome DevTools Protocol 打開 `http://localhost:3000/cards`，檢查 DOM 與 quick edit drawer。
6. 用簽章正確的 LINE webhook postback 模擬 M01：
   - `module=m01&action=start`
   - `module=m01&action=choose_mood&mood=開心`
   - `module=m01&action=choose_series&series=花系列`
   - `module=m01&action=select&session_id=...&card_id=C0011`
7. 查 Supabase REST：
   - `card_catalog`
   - `participants`
   - `card_interactions`
   - `user_daily_mood`
   - `user_daily_checkin`
8. 查本機 fallback：
   - `storage/product-store/user_daily_mood.json`
   - `storage/product-store/user_daily_checkin.json`
9. 跑 `npm run lint` 與 `npm run build`。

## B. M01 畫面實際長什麼樣

### 第一步：心情 carousel

Webhook 實際 reply payload：

- 第一則文字：`今天心情選一個。`
- 第二則訊息：Flex carousel，`altText` 是 `今天心情選一個`
- carousel 內容數：7 張 bubble
- 每張 bubble：`size: mega`
- 每張卡只有一個心情、一段短說明、一個 postback button

實際 7 個心情：

- `開心`
- `平靜`
- `難過`
- `焦慮`
- `生氣`
- `孤單`
- `沒什麼特別感覺`

### 第二步：系列 carousel

Webhook 實際 reply payload：

- 第一則文字：`今天心情記下來了：開心\n今天想看哪一類？`
- 第二則訊息：Flex carousel，`altText` 是 `今天想看哪一類`
- carousel 內容數：4 張 bubble
- 每張 bubble：`size: mega`
- 每張卡只有一個系列、一段短說明、一個 postback button

實際 4 個系列：

- `花系列`
- `神明系列`
- `台灣花布系列`
- `山系列`

### 第三步：三張大圖卡

Webhook 實際 reply payload：

- 第一則文字：`選一張今天喜歡的圖。`
- 第二則訊息：Flex carousel，`altText` 是 `選一張今天喜歡的圖`
- carousel 內容數：3 張 bubble
- 每張 bubble：`size: giga`
- 圖片在 `hero`
- 圖片比例：`aspectRatio: 1:1`
- 圖片模式：`aspectMode: cover`
- 每張卡只有一個主要按鈕：`選這張圖`

本次抽到的三張卡：

- `C0004`，外部圖，`早安・花開暖暖`
- `C0010`，Cloudinary 圖，`驗證花系列圖卡 2`
- `C0001`，外部圖，`晨光平安・花開暖暖`

## C. /cards 實際操作結果

### 多張上傳

實際呼叫：

- API：`POST /api/admin/cards`
- intent：`batch_upload`
- 檔案數：3
- HTTP 結果：`303 See Other`

結果：

- 建立 `C0009`
- 建立 `C0010`
- 建立 `C0011`
- 三筆一開始都是 `draft`
- 三筆都有 `image_provider: cloudinary`
- 三筆都有非空 `image_url`
- 三筆都有非空 `image_key`

### 批次整理

實際呼叫：

- API：`POST /api/admin/cards`
- intent：`batch_update`
- HTTP 結果：`303 See Other`

已驗證可批次改：

- `card_title`
- `imagery` / 系列
- `status`
- `caption_text`
- `default_prompt`

最後查到資料：

- `C0009`：`驗證花系列圖卡 3`，`active`，`花系列`，caption / prompt 非空
- `C0010`：`驗證花系列圖卡 2`，`active`，`花系列`，caption / prompt 非空
- `C0011`：`驗證花系列圖卡 1`，`active`，`花系列`，caption / prompt 非空

### 批次上下架

實際呼叫：

- `batch_set_status` to `inactive`：HTTP `303`
- `batch_set_status` to `active`：HTTP `303`

最後查表結果：

- `C0009`：`active`
- `C0010`：`active`
- `C0011`：`active`

### 批次刪除 draft

另外上傳兩張 draft：

- `C0012`
- `C0013`

實際呼叫：

- API：`POST /api/admin/cards`
- intent：`delete_drafts`
- HTTP 結果：`303 See Other`

刪除後查表：

- `C0012` 不存在
- `C0013` 不存在

### 單張快速編輯 drawer

原本檢查時發現 drawer 在有圖卡時會預設打開，這不符合「點一張圖後快速編輯」。

已修正為：

- 頁面初始：`aside` 數量為 `0`
- 點第一個 `快速編輯` 按鈕後：`aside` 數量為 `1`
- drawer 內容包含：
  - `Quick Edit`
  - `標題`
  - `系列`
  - `狀態`
  - `caption_text`
  - `default_prompt`
  - `儲存這張圖`

## D. Cloudinary 實際上傳結果

`card_catalog` 查到的 Cloudinary keys：

- `C0009`：`jenny/cards/hds0lhh3r3aepqf4yzxu`
- `C0010`：`jenny/cards/kix6pwch0p362r5qjnlm`
- `C0011`：`jenny/cards/b4wwjagqeqrrzxbqpc2f`

對三個 `image_url` 做 HEAD 檢查：

- `C0009`：HTTP `200`，`content-type: image/png`
- `C0010`：HTTP `200`，`content-type: image/png`
- `C0011`：HTTP `200`，`content-type: image/png`

結論：

- Cloudinary 真的有上傳成功。
- `image_url` 不是空值。
- `image_key` 不是空值。

## E. Supabase 實際查表結果

### `card_catalog`

已確認 remote Supabase 有寫入：

- `C0009`
- `C0010`
- `C0011`

三筆都有：

- `image_provider: cloudinary`
- `image_url`
- `image_key`
- `imagery: 花系列`
- `status: active`
- `caption_text`
- `default_prompt`

### `participants`

測試 user：

- `U_m01_real_test_final_1777309914081`

已確認 remote Supabase 有寫入：

- `id`
- `display_name`
- `created_at`
- `updated_at`

注意：

- 目前 remote `participants` 還是舊 schema，缺 `district`、`is_little_angel`、`free_owner_slots` 等新欄位。
- 已加相容修正：M01 seed participant 時，如果 remote 還是舊欄位，會只送舊欄位，讓 `card_interactions` FK 可以通過。

### `card_interactions`

測試 user：

- `U_m01_real_test_final_1777309914081`

已確認 remote Supabase 有寫入 4 筆：

- `C0004`：`view`
- `C0010`：`view`
- `C0001`：`view`
- `C0011`：`select`，`selected_as_main: true`

結論：

- 第三步抽出的 3 張圖有被記錄。
- 最後選定圖有被記錄。

### `user_daily_mood`

remote Supabase 查表結果：

- HTTP `404`
- 錯誤：`Could not find the table 'public.user_daily_mood' in the schema cache`

本機 fallback 查到：

- `participant_id: U_m01_real_test_final_1777309914081`
- `selected_date: 2026-04-28`
- `mood: 開心`

結論：

- M01 心情有被流程寫入，但目前不是 remote Supabase。
- remote Supabase 尚未套用 `user_daily_mood` migration 或 schema cache 尚未更新。

### `user_daily_checkin`

remote Supabase 查表結果：

- HTTP `404`
- 錯誤：`Could not find the table 'public.user_daily_checkin' in the schema cache`

本機 fallback 查到：

- `participant_id: U_m01_real_test_final_1777309914081`
- `selected_date: 2026-04-28`
- `claimed_today: true`
- `claim_season: 2026-Q2`

結論：

- M01 選圖後有寫入打卡/領取資料，但目前不是 remote Supabase。
- remote Supabase 尚未套用 `user_daily_checkin` migration 或 schema cache 尚未更新。

## F. 改前與改後差異

### M01

改前：

- 心情與系列是比較擠的小按鈕排法。
- 一個畫面會塞多個選項。
- 對高齡使用者來說辨識負擔較高。

改後：

- 心情變成 7 張 Flex carousel 卡。
- 系列變成 4 張 Flex carousel 卡。
- 一張卡只放一個選項。
- 文字變大，句子變短。
- 第三步是 3 張 `giga` 大圖卡。
- 圖片是大圖 `1:1` 呈現。

### /cards

改前：

- 偏單張新增表單。
- 批次整理大量圖卡不順。
- 單張編輯流程笨重。

改後：

- 可一次多張上傳到 Cloudinary。
- 上傳後自動建立多筆 draft。
- 可在同頁批次整理 metadata。
- 可批次上架、下架、刪除 draft。
- 可搜尋、篩選、排序。
- 可點快速編輯打開 drawer。

## G. 哪些是真的完成

- M01 第一畫面是真的心情 carousel。
- M01 心情 carousel 是 7 張卡。
- M01 第二畫面是真的系列 carousel。
- M01 系列 carousel 是 4 張卡。
- M01 第三步是真的 3 張大圖 carousel。
- `/cards` 真的可一次多張上傳到 Cloudinary。
- `/cards` 上傳後真的可建立多筆 `card_catalog` draft。
- `/cards` 真的可批次編輯 metadata。
- `/cards` 真的可批次上架。
- `/cards` 真的可批次下架。
- `/cards` 真的可批次刪除 draft。
- `/cards` quick edit drawer 真的可由按鈕打開。
- Cloudinary 真的有 `image_url` / `image_key`。
- Supabase remote `card_catalog` 真的有寫入。
- Supabase remote `participants` 真的有寫入。
- Supabase remote `card_interactions` 真的有寫入。
- `npm run lint` 通過。
- `npm run build` 通過。

## H. 哪些其實還沒到位

- remote Supabase 目前沒有 `user_daily_mood`。
- remote Supabase 目前沒有 `user_daily_checkin`。
- 因為缺表，M01 心情與每日打卡目前落在本機 fallback，不是 remote Supabase。
- 目前 `.env.local` 指向的 remote `card_catalog` 也缺 `series` 欄位；已用程式相容修正避免寫入失敗，但 schema 本身仍未對齊最新 SQL。
- 目前 `.env.local` 指向的 remote `participants` 缺 `district`、`is_little_angel`、`free_owner_slots` 等新欄位；已用 M01 participant seed 相容修正，但 schema 本身仍未對齊最新 SQL。
- headless 瀏覽器驗證使用 Chrome DevTools Protocol；`agent-browser` CLI 在這台環境不存在。
- LINE reply API 因使用 fake reply token 回 `400 Invalid reply token`，但 webhook 已在送出前產生完整 reply payload，且 LINE handler 確實走到對應分支。

## I. 若有任何一步和要求不符

不符項目：

- `user_daily_mood` 沒有寫進 remote Supabase，原因是 remote 缺表。
- `user_daily_checkin` 沒有寫進 remote Supabase，原因是 remote 缺表。

需要下一步：

- 套用 `supabase/migrations/20260427233000_jenny_formal_product_alignment.sql` 到目前 `.env.local` 指向的 Supabase project：`gnorzkedpzvgcrnzlqyq`
- 或至少在 remote 建立：
  - `public.user_daily_mood`
  - `public.user_daily_checkin`
  - `public.card_catalog.series`
  - `public.participants.district`
  - `public.participants.is_little_angel`
  - `public.participants.is_little_owner`
  - `public.participants.free_owner_slots`
  - `public.participants.extra_owner_slots`

目前 CLI 無法直接 push migration：

- `supabase migration list --linked` 回 `403`
- 訊息要求設定 `SUPABASE_DB_PASSWORD`

所以 migration 需要補 `SUPABASE_DB_PASSWORD` 或用 Supabase SQL Editor 套用。
