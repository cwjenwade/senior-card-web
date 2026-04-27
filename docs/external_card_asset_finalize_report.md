# External Card Asset Finalize Report

Generated on 2026-04-27.

This report records the final verification pass for the external `image_url` card mode without changing product logic.

## A. Migration Result

`supabase login`:

- succeeded

`supabase db push --linked`:

- succeeded

Applied migration:

- `20260427143000_external_card_asset_mode.sql`

Conclusion:

- remote external-asset migration was formally applied through CLI

## B. Remote `card_catalog` Column Completeness

Remote columns confirmed present:

- `card_id`
- `card_title`
- `image_url`

Remote columns confirmed present through REST select:

- `image_provider`
- `image_key`
- `default_prompt`
- `uploaded_by`

Conclusion:

- remote `card_catalog` is now upgraded to the external-asset schema

## C. New External Test Card Added

Added through `/api/admin/cards`:

- `card_id`: `C0008`
- `card_title`: `正式驗收外部圖卡`
- `image_url`: `https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?auto=format&fit=crop&w=1200&q=80`
- `status`: `active`
- `style_main`: `勵志語`
- `style_sub`: `驗收上稿`
- `tone`: `明亮`
- `imagery`: `山林系列`
- `text_density`: `medium`
- `energy_level`: `uplift`

Remote row verification:

- row is present in remote `card_catalog`
- row is visible from the `/cards` admin page
- row now stores the new external-asset columns:
  - `image_provider = external`
  - `image_key = ''`
  - `uploaded_by = system`

Observed note:

- `default_prompt` is currently an empty string on `C0008`
- the migration created the column successfully, but the create flow still wrote an empty value for this specific row
- this does not block external image rendering

## D. M01 Verification

Verified:

- `/api/admin/system-check` now reports:
  - `Card source available with 8 cards.`

Interpretation:

- the running Next.js app is reading the remote `card_catalog`
- the new active external card increased the formal M01 card source from 7 to 8 cards

Result:

- `M01` can read external-image cards from the remote source
- running app reports `Card source available with 8 cards.`

## E. M03 Verification

Verified:

- the `/cards` page renders external image previews for active cards, including the new `C0008`
- M03’s card source is the same `listCards()` product path used by the running app
- the formal runtime no longer depends on generated CC0 images for liked-card display

Important note:

- current M03 logic still takes the first 6 active cards for the onboarding carousel
- because no M03 ordering logic was changed in this task, the newly added `C0008` is not guaranteed to appear in the first 6 shown choices

Result:

- `M03` can display external-image cards
- the newly added card is in the active source pool, but its actual appearance in the initial 6-card M03 carousel depends on current ordering

## F. Remaining CC0 Dependency Check

Formal runtime dependency:

- none for `M01` / `M03`

Retained legacy files:

- `src/lib/m01-cc0.ts`
- `/api/m01/cards/[cardId]/image`

Current legacy route behavior:

- formal runtime no longer depends on `/api/m01/cards/[cardId]/image`
- in this verification pass, the dev server returned `500` on `/api/m01/cards/C0008/image` because of a local Next.js route parsing issue
- this did not affect `M01` / `M03` verification because they now render from direct external `image_url`

Conclusion:

- CC0 remains only as retained legacy code in the repo
- no formal display path for `M01` / `M03` now depends on it

## G. Failure Point Summary

No blocker remains on remote schema application.

The only residual issue observed in this pass was:

- dev-only `500` on the retained legacy route `/api/m01/cards/[cardId]/image`

What still succeeded:

- remote schema application
- remote new-column verification
- `/cards` creation of a new external card
- remote `card_catalog` write verification
- M01 formal card source increased to 8 cards
- M03 external-image display path remains valid

## Verification Snapshot

Completed successfully:

- Supabase CLI login
- linked project ref confirmation
- `supabase db push --linked`
- remote new-column verification for `image_provider`, `image_key`, `default_prompt`, `uploaded_by`
- remote `card_catalog` row check
- `/cards` admin creation of new external card
- remote row verification for `C0008`
- runtime system check showing 8 available cards
- `/cards` page rendering of `C0008`

Residual limitation:

- the retained legacy route should be rechecked separately if you still want it available during local dev
