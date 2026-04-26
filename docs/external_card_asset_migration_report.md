# External Card Asset Migration Report

Generated on 2026-04-27.

This report records the switch from local / CC0-generated card images to external image URLs managed through `card_catalog`.

## A. CC0 / Local Card Dependencies Disabled

The following dependencies were stopped as formal runtime sources:

- `src/lib/m01-cards.ts`
  - no longer treats generated local cards as the formal source
  - now reads card metadata from `card_catalog`
- `src/app/api/line/webhook/route.ts`
  - `M01` carousel now uses `card.imageUrl`
  - `M03` liked-card carousel now uses `card.imageUrl`
  - M01 selection reply image now uses `card.imageUrl`
- `src/app/api/m01/cards/[cardId]/image/route.ts`
  - no longer generates CC0-based images
  - now acts only as a legacy redirect to the external `image_url`

Retained but no longer used as the formal source:

- `src/lib/m01-cc0.ts`

Current status:

- CC0 fallback is disabled as the official source for `M01` / `M03`
- external `image_url` is now the display path used by the live webhook flow

## B. `card_catalog` Field Changes

Formal target fields for external asset mode:

- `card_id`
- `card_title`
- `image_provider`
- `image_url`
- `image_key`
- `style_main`
- `style_sub`
- `tone`
- `imagery`
- `text_density`
- `energy_level`
- `caption_text`
- `default_prompt`
- `status`
- `uploaded_by`
- `created_at`
- `updated_at`

Compatibility fields still kept by runtime:

- `id`
- `title`
- `text_type`
- `visual_series`
- `caption`
- `prompt`
- `cc0_source`
- `font_size`
- `color_tone`
- `religious_content`

Files updated:

- `supabase/jenny_core_schema.sql`
- `supabase/migrations/20260426234000_jenny_core_schema.sql`
- `supabase/migrations/20260427143000_external_card_asset_mode.sql`
- `docs/data_dictionary.md`

Important current note:

- remote Supabase still does not have `image_provider`, `image_key`, `default_prompt`, `uploaded_by`
- the new migration file is prepared, but `supabase db push --linked` could not be executed on this machine because the Supabase CLI login token is missing
- runtime compatibility handling was added so the system can still operate using existing columns plus `image_url`

## C. New Admin Pages And APIs

Added:

- `/cards`
  - lightweight elder-card management page
  - shows external-image mode banner
  - create card
  - edit card metadata
  - preview card image
  - set active / inactive
  - filter by `style_main`, `tone`, `status`

- `/api/admin/cards`
  - handles create / update / status change
  - writes card metadata only
  - does not upload image files

Dashboard link added:

- `/` now links to `/cards`

## D. How `M01` / `M03` / `E01` Now Read External `image_url`

Source of truth:

- `src/lib/m01-cards.ts`
  - `listCards()` now resolves card rows from `card_catalog`
  - `getActiveCards()` filters to `status = active` and non-empty `imageUrl`

`M01`:

- `buildTodayRecommendations()` scores cards from `listCards()`
- `buildM01Carousel()` displays `card.imageUrl`
- M01 selection confirmation image uses `card.imageUrl`

`M03`:

- onboarding liked-card selection uses `listCards()`
- `buildM03LikeCarousel()` displays `card.imageUrl`

`E01` rule input:

- the current rule-based recommendation path still lives in webhook logic
- it now uses card metadata from `card_catalog` via `listCards()`
- recommendation and interaction linkage remain based on `card_id`

## E. Frontend Image Handling

`next.config.ts` was updated to allow remote images from:

- `images.unsplash.com`
- `res.cloudinary.com`
- `ik.imagekit.io`

Current rendering strategy:

- admin preview on `/cards` uses plain `<img>`
- this is intentional for v1 because the project is provider-agnostic and external hosts may expand over time
- `next/image` host allow-list is still prepared for common providers, but plain `img` avoids blocking preview during provider expansion

## F. Remaining Placeholders

- external provider upload APIs are not implemented
- `image_key` is reserved for future managed providers
- generic host onboarding is manual; new image domains must be added to `next.config.ts` when needed
- `src/lib/m01-cc0.ts` remains in the repo as a retained legacy file, but is not part of the formal runtime path
- remote schema migration for the new `card_catalog` columns is still pending because the local Supabase CLI is not currently authenticated

## G. How To Add A New External Card

From the UI:

1. Open `/cards`
2. Fill:
   - `image_url`
   - `card_title`
   - `style_main`
   - `style_sub`
   - `tone`
   - `imagery`
   - `text_density`
   - `energy_level`
   - `caption_text`
   - `default_prompt`
   - `status`
3. Submit `新增外部圖卡`

Current verification row created during testing:

- `card_id = C0007`
- `card_title = 測試外部圖卡`
- `status = inactive`

Because it is `inactive`, it does not enter `M01` recommendations.

## H. How To Verify It Appears In `M01` And `M03`

Admin verification:

1. Open `/cards`
2. Confirm the card preview renders from its external `image_url`
3. Change `status` to `active` if it should be eligible for recommendation

System verification:

- `curl http://localhost:3000/api/admin/system-check`
  - currently reports `Card source available with 7 cards.`

Legacy route verification:

- `curl -I http://localhost:3000/api/m01/cards/C0001/image`
  - now returns `307`
  - redirects to the external image host instead of generating a CC0 image

Runtime verification:

1. Ensure the card is `active`
2. Trigger `今日長輩圖` in LINE
3. Confirm the `M01` carousel displays the external image
4. Trigger `我的小檔案`
5. Confirm the `M03` liked-card step also shows the external image

## Remote Verification Snapshot

Confirmed against remote `card_catalog`:

- `C0001` to `C0006` now have non-empty external `image_url`
- a test row `C0007` was created through `/api/admin/cards`
- active rows remain eligible for M01 / M03
- inactive rows stay out of recommendation

## Pending Manual Step

To fully land the new `card_catalog` columns in remote Supabase:

1. authenticate Supabase CLI on this machine
2. run:

```bash
cd /Users/wade/Developer/Jenny/senior-card-web
supabase db push --linked
```

This will apply:

- `supabase/migrations/20260427143000_external_card_asset_mode.sql`

Until then, runtime stays compatible by writing through the older shared columns.
