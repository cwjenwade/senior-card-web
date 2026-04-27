# Jenny Product Spec Alignment Report

Date: 2026-04-27
Project: `/Users/wade/Developer/Jenny/senior-card-web`

## 已完成

### 頁面

- `/cards`
- `/users`
- `/m02-admin`
- `/m03`
- `/m03-admin`
- `/info-admin`

### Schema / Migration

已補齊並寫入：

- `supabase/jenny_core_schema.sql`
- `supabase/migrations/20260427233000_jenny_formal_product_alignment.sql`

已補表：

- `user_daily_mood`
- `user_daily_checkin`
- `care_messages`
- `volunteer_requests`
- `user_reports`
- `user_blocks`

已補欄位：

- `participants.district`
- `participants.is_little_angel`
- `participants.is_little_owner`
- `participants.free_owner_slots`
- `participants.extra_owner_slots`
- `partner_links.angel_participant_id`
- `partner_links.owner_participant_id`
- `diary_entries.entry_index`
- `community_info.district`

### M01

- LINE 入口改成先選心情
- 接著選系列
- 依系列隨機抽三張已上架圖卡
- 選圖後寫入 `user_daily_mood`
- 選圖後寫入 `user_daily_checkin`
- 已加季度判斷欄位 `claim_season`
- rich menu / text trigger 仍可進 M01

### M02

- 50 字以上自動判定為日記
- 未滿 50 字改成回正式規則提示
- `diary_entries` 已寫入 `entry_index`
- 已補每位 user 最高 10 次限制
- `/m02-admin` 可查日記與雞蛋進度
- 雞蛋規則改為 14 天

### M03

- `participants` 已可存小天使 / 小主人角色與行政區
- `/m03` 可編輯行政區
- `/m03-admin` 可看角色、配對、志工需求、檢舉、封鎖
- `/api/m03/actions` 已可寫入志工需求、檢舉、封鎖
- 配對邏輯已加免費名額欄位與 5 位上限判斷基礎

### M04

- `community_info` 已補 `district`
- `/info-admin` 已可編輯行政區
- LINE M04 已改為 carousel 呈現
- M04 會依使用者行政區讀取資料

### 圖片策略

- `/cards` 已改成 Cloudinary 上傳流程
- 圖片不再以手填 `image_url` 當唯一正式入口
- 上傳成功後會把 `image_url` / `image_key` 寫進 `card_catalog`

## 部分完成

### M01

- 系列值已對齊為 `花系列 / 神明系列 / 台灣花布系列 / 山系列`
- 舊資料 `神佛系列 / 山林系列` 已做相容映射
- 目前季度限制已可阻擋重複領取，但是否要保留「同季不可再領」或再細分補領規則，後續若有更明確營運規則仍可再細修

### M02

- 目前是 webhook 層自動判定 50 字以上文字為日記
- 後台已有列表可看，但尚未另外做 LINE carousel 歷史回顧輸出

### M03

- 已有名額欄位與基礎判斷
- 目前免費 5 位規則主要落在配對篩選
- 付費解鎖僅保留欄位概念，尚未接金流

## 尚未完成

- Cloudinary 需要正式環境變數才可真的上傳
- 尚未接金流
- 尚未做完整的 LINE 端 M03 志工 / 檢舉 / 封鎖互動按鈕流程
- M02 LINE 歷史 carousel 尚未補

## 已建資料表

- `participants`
- `card_catalog`
- `card_preferences`
- `card_interactions`
- `daily_card_recommendations`
- `guided_diary_prompts`
- `user_daily_mood`
- `user_daily_checkin`
- `diary_entries`
- `egg_progress`
- `partner_links`
- `care_events`
- `care_messages`
- `volunteer_requests`
- `user_reports`
- `user_blocks`
- `community_info`
- `partner_prompt_queue`
- `internal_review_queue`
- `line_interaction_events`
- `line_diary_entries`

## 下一輪仍可補的重點

- Cloudinary 正式環境設定與實際上傳驗證
- M03 LINE 端更多正式操作入口
- M02 歷史 carousel
- richer `/users` 篩選與統計
