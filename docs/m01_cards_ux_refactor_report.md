# M01 Cards UX Refactor Report

Date: 2026-04-28
Project: `/Users/wade/Developer/Jenny/senior-card-web`

## 1. 改了哪些檔案

- `src/app/api/line/webhook/route.ts`
- `src/app/cards/page.tsx`
- `src/app/cards/cards-client.tsx`
- `src/app/api/admin/cards/route.ts`
- `src/lib/m01-cards.ts`
- `src/lib/supabase-rest.ts`

## 2. M01 心情 carousel 怎麼做

- 把原本一排小按鈕改成 LINE Flex carousel
- 一個心情一張卡
- 每張卡只放：
  - 大字心情名稱
  - 一句短說明
  - 一個明確按鈕
- 固定選項：
  - 開心
  - 平靜
  - 難過
  - 焦慮
  - 生氣
  - 孤單
  - 沒什麼特別感覺
- 文案改短成「今天心情選一個」

## 3. M01 系列 carousel 怎麼做

- 把原本 quick reply 改成 LINE Flex carousel
- 一個系列一張卡
- 每張卡只放：
  - 大字系列名稱
  - 一句短說明
  - 一個明確按鈕
- 固定系列：
  - 花系列
  - 神明系列
  - 台灣花布系列
  - 山系列
- 文案改短成「今天想看哪一類」

## 4. /cards 多張上傳怎麼做

- `/cards` 上方新增多檔上傳區
- 支援一次選多張圖片
- API `intent=batch_upload`
- 每張圖會：
  - 上傳到 Cloudinary
  - 自動建立一筆 `card_catalog` draft
  - 用檔名先生成暫時標題
- 不再要求一張一張手動新增

## 5. /cards 批次編輯怎麼做

- 新增 client-side 管理台 `[cards-client.tsx]`
- 勾選多張圖後，會出現批次 metadata 編輯區
- 可直接逐張改：
  - `card_title`
  - `series`
  - `status`
  - `caption_text`
  - `default_prompt`
- API `intent=batch_update`
- 會一次送出多筆編輯結果

## 6. /cards 批次操作有哪些

- 批次上架
- 批次下架
- 批次改系列
- 批次改狀態
- 批次刪除 draft
- 批次儲存 metadata

## 7. 哪些原本 UX 很差，現在怎麼改

### M01 前台

原本問題：

- 心情和系列是一排小按鈕
- 選項太擠
- 老人不容易點

現在改成：

- 一張卡只做一個選擇
- 大字
- 大按鈕
- 留白更多
- 三張圖畫面把圖放大
- 選圖畫面只保留主要按鈕，不再塞兩個操作

### /cards 後台

原本問題：

- 單張上傳
- 單張表單
- 編輯流程笨重
- 沒有批次整理

現在改成：

- 多張上傳先建立 draft
- 卡片清單直接看預覽、標題、系列、狀態、Cloudinary 成功與否、最後更新時間
- 可搜尋、篩選、排序
- 可勾選多張圖做批次整理
- 可開右側快速編輯抽屜做單張精修

## 8. 怎麼驗收

- M01
  - 點 LINE 的「今日長輩圖」
  - 第一個畫面應是心情 carousel
  - 第二個畫面應是系列 carousel
  - 第三個畫面應是三張大圖 carousel
- /cards
  - 一次選多張圖片上傳
  - 上傳後應看到多筆 draft
  - 勾選多張圖後可批次改系列與狀態
  - 可批次儲存 metadata
  - 可批次上架 / 下架 / 刪除 draft
- 技術驗證
  - `npm run lint`
  - `npm run build`

## 9. 還有哪裡下一輪可再優化

- `/cards` 可以再補真正的拖拉排序與 sticky bulk toolbar
- `/cards` 可以再補上傳進度條與失敗重試
- M01 第三步可再補更高齡友善的圖卡標題字級分級
- M01 可再補圖片語音提示或更明確的選中回饋
