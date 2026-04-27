# M03 / M04 LINE Trigger Audit

Date: 2026-04-27
Project: `/Users/wade/Developer/Jenny/senior-card-web`

## 1. Rich Menu Third / Fourth Slot Actual Binding

Source of truth checked from both:

- [scripts/create-rich-menu.mjs](/Users/wade/Developer/Jenny/senior-card-web/scripts/create-rich-menu.mjs:1)
- LINE Messaging API `GET /v2/bot/richmenu/list`

Current default rich menu:

- `richmenu-4b44735870c4863840c1843e11706e22`
- name: `Jenny Redefined M01-M04 Menu`

Third slot actual action:

- label: `關懷與配對`
- type: `postback`
- data: `module=m03&action=start`
- displayText: `關懷與配對`

Fourth slot actual action:

- label: `最新活動與政策`
- type: `postback`
- data: `module=m04&action=start`
- displayText: `最新活動與政策`

Also found older menus still exist in LINE:

- `richmenu-44c3476a031e16c437cc1c0250976f24`
  - third slot: `module=egg&action=start`
  - fourth slot: `module=m03&action=start` with display text `我的小檔案`
- `richmenu-c05e8ce6212f3d1f713b58fbd718a002`
  - only M01 / M02

But the currently bound default menu is already the new M01-M04 menu.

## 2. Webhook Event Types Actually Handled

Defined in [src/app/api/line/webhook/route.ts](/Users/wade/Developer/Jenny/senior-card-web/src/app/api/line/webhook/route.ts:1).

Handled event types:

- `message`
- `postback`
- `follow`

Other event types:

- not typed
- not explicitly handled
- would be ignored because `handleEvent()` only branches on `follow`, `postback`, and text `message`

## 3. M03 / M04 Supported Triggers

### M03

Text triggers:

- `關懷與配對`
- `關懷大使`
- `好友配對`
- `我的小檔案`
- `m03`

Defined at [route.ts](/Users/wade/Developer/Jenny/senior-card-web/src/app/api/line/webhook/route.ts:77).

Postback triggers:

- `module=m03&action=start`
- `module=m03&action=restart`
- `module=m03&action=set_option...`
- `module=m03&action=care_event...`

### M04

Text triggers:

- `最新活動與政策`
- `活動資訊`
- `政策資訊`
- `社區資訊`
- `m04`

Defined at [route.ts](/Users/wade/Developer/Jenny/senior-card-web/src/app/api/line/webhook/route.ts:78).

Postback triggers:

- `module=m04&action=start`
- `module=m04&action=category&category=policy`
- `module=m04&action=category&category=neighborhood`
- `module=m04&action=category&category=temple`
- `module=m04&action=category&category=community`

## 4. Which Code Returns the M03 Entry Message

Current M03 entry is returned by:

- `handleM03Start()`
- reference: [route.ts](/Users/wade/Developer/Jenny/senior-card-web/src/app/api/line/webhook/route.ts:893)

Current behaviors inside `handleM03Start()`:

- if remote schema not ready:
  - replies with M03 intro flex plus a schema-not-ready text
- if participant already completed M03:
  - replies summary text with quick reply actions
- otherwise:
  - writes M03 session to `waiting_for_name`
  - replies M03 intro flex plus the first onboarding text

## 5. Which Code Returns the M04 Entry Message

Current M04 entry is returned by:

- `handleM04Start()`
- reference: [route.ts](/Users/wade/Developer/Jenny/senior-card-web/src/app/api/line/webhook/route.ts:1073)

Current behaviors inside `handleM04Start()`:

- if category exists:
  - replies category list text plus quick reply
- otherwise:
  - loads four category previews
  - replies M04 overview flex plus summary text

## 6. Common Branches That Can Intercept or Return Early

### Event-level early returns

In `handleEvent()`:

- `follow` returns after welcome text
- `postback` returns after `handlePostback()`
- text `message` returns after `handleTextMessage()`

### Postback-level early returns

In `handlePostback()`:

- M01 branches return first if `module=m01`
- then M02
- then egg
- then M03
- then M04
- unknown postback falls back to `unknownMessage()`

Because M03 / M04 rich menu actions use unique modules, they are not intercepted by M01 / M02 postback branches.

### Text-level early returns

In `handleTextMessage()` the order is:

1. M01 text trigger
2. M02 text trigger
3. M03 text trigger
4. M04 text trigger
5. egg text trigger
6. M03 `waiting_for_name`
7. M02 `waiting_for_diary`
8. fallback `unknownMessage()`

This means:

- M03 / M04 named triggers are checked before waiting states
- a literal `關懷與配對` or `最新活動與政策` should not be swallowed by M03 onboarding or M02 diary waiting states

## 7. Fallback Branches

Fallback text comes from `unknownMessage()`:

- [route.ts](/Users/wade/Developer/Jenny/senior-card-web/src/app/api/line/webhook/route.ts:144)

Text:

- `我可以陪你看長輩圖、寫今天的一句話、看看關懷與配對狀態，或讀最新活動與政策。點選下方選單就可以開始。`

Branches that can reach fallback:

- invalid M01 select card
- invalid M01 favorite card
- `handleM02DiaryInput()` when session is not actually waiting
- invalid M03 care event intent
- unknown postback in `handlePostback()`
- unmatched text in `handleTextMessage()`

The screenshot text `請從下方選單選擇服務。` is not present in the current `route.ts`, so that screenshot came from:

- an older webhook version, or
- a different branch / server process than the current repo state

## 8. Session State Risk Audit

### M01 state

M01 stores session snapshots, but there is no M01 text waiting-state branch that hijacks arbitrary future text.

Result:

- M01 session does not block M03 / M04 entry

### M02 state

M02 has one waiting branch:

- `status === "waiting_for_diary"`

But this branch is checked only after M03 / M04 text triggers.

Result:

- literal M03 / M04 trigger text should still enter those modules
- random non-trigger text during M02 waiting will be treated as diary input

### M03 state

M03 has one free-text waiting branch:

- `step === "waiting_for_name"`

But this branch is checked only after M03 / M04 text triggers.

Result:

- literal M04 trigger text should still go to M04
- random non-trigger text during M03 waiting will be treated as display name input

## 9. Initial Audit Conclusion

From static audit alone:

- current rich menu default binding is already correct for M03 / M04
- current webhook trigger mapping is also correct for M03 / M04
- current text trigger order does not show an obvious session-state swallowing bug
- current fallback string does not match the user screenshot

So the likely failure is not just “trigger string missing”.
The next step must trace real requests and inspect:

- whether the actual running webhook process matches current repo code
- which handler is truly reached per event
- which reply payload is produced
- whether LINE reply API accepts or rejects that payload
