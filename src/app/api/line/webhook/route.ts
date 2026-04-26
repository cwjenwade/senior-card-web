import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { listCards, recommendCards, textTypes, visualSeriesOptions, type TextType, type VisualSeries } from "@/lib/m01-cards";
import { getRecentShownCardIds, getSession, hasCompletedM01Today, markM01Completed, recordCardFeedback, updateSession } from "@/lib/m01-session-store";
import {
  countCjkCharacters,
  createDiaryEntry,
  getM02Session,
  getTodayEntry,
  getTodayInTaipei,
  hasCompletedToday,
  markM02Completed,
  recordM02RewardEvent,
  updateM02Session,
} from "@/lib/m02-diary-store";

export const runtime = "nodejs";

type LineEvent =
  | {
      type: "message";
      replyToken: string;
      source?: { userId?: string };
      message: { type: "text"; text: string };
    }
  | {
      type: "postback";
      replyToken: string;
      source?: { userId?: string };
      postback: { data: string };
    }
  | {
      type: "follow";
      replyToken: string;
      source?: { userId?: string };
    };

type M01Payload = {
  module: string;
  action: string;
  sessionId: string;
  mood: string;
  textType: string;
  visualSeries: string;
  cardId: string;
};

const M01_TEXT_TRIGGERS = new Set(["製作長輩圖", "長輩圖", "今日長輩圖", "m01"]);
const M02_TEXT_TRIGGERS = new Set(["寫日記換雞蛋", "寫日記", "今日日記", "m02"]);
const M01_MOODS = ["開心", "平靜", "累", "煩", "寂寞", "沮喪", "沒特別感覺"] as const;

function parsePostback(data: string) {
  const params = new URLSearchParams(data);
  return {
    module: params.get("module") ?? "",
    action: params.get("action") ?? "",
    sessionId: params.get("session_id") ?? "",
    mood: params.get("mood") ?? "",
    textType: params.get("text_type") ?? "",
    visualSeries: params.get("visual_series") ?? "",
    cardId: params.get("card_id") ?? "",
  };
}

function verifySignature(body: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const digest = crypto.createHmac("sha256", secret).update(body).digest("base64");
  const left = Buffer.from(digest);
  const right = Buffer.from(signature);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function replyToLine(replyToken: string, messages: unknown[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error("Missing env: LINE_CHANNEL_ACCESS_TOKEN");
    throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN");
  }

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`LINE reply failed: ${response.status} ${text}`);
    throw new Error(`LINE reply failed: ${response.status}`);
  }
}

function unknownMessage() {
  return {
    type: "text",
    text: "請從下方選單選擇服務。",
  };
}

function createM01SessionId(userId: string) {
  return `m01-${userId}-${Date.now()}`;
}

function createM02SessionId(userId: string) {
  return `m02-${userId}-${Date.now()}`;
}

function getBaseUrl(request: NextRequest) {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/+$/, "");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return request.nextUrl.origin;
}

function buildCardImageUrl(baseUrl: string, cardId: string) {
  return `${baseUrl}/api/m01/cards/${encodeURIComponent(cardId)}/image`;
}

function getM01Stage(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return "idle" as const;
  if (!session.mood_today) return "waiting_for_mood" as const;
  if (!session.text_type_preference) return "waiting_for_text_type" as const;
  if (!session.visual_series_preference) return "waiting_for_visual_series" as const;
  return "ready" as const;
}

function deriveM01PayloadFromText(text: string, session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return null;
  const stage = getM01Stage(session);

  if (stage === "waiting_for_mood" && M01_MOODS.includes(text as (typeof M01_MOODS)[number])) {
    return {
      module: "m01",
      action: "set_mood",
      sessionId: session.session_id,
      mood: text,
      textType: "",
      visualSeries: "",
      cardId: "",
    } satisfies M01Payload;
  }

  if (stage === "waiting_for_text_type" && textTypes.includes(text as TextType)) {
    return {
      module: "m01",
      action: "set_text_type",
      sessionId: session.session_id,
      mood: session.mood_today,
      textType: text,
      visualSeries: "",
      cardId: "",
    } satisfies M01Payload;
  }

  if (stage === "waiting_for_visual_series" && visualSeriesOptions.includes(text as VisualSeries)) {
    return {
      module: "m01",
      action: "set_visual_series",
      sessionId: session.session_id,
      mood: session.mood_today,
      textType: session.text_type_preference,
      visualSeries: text,
      cardId: "",
    } satisfies M01Payload;
  }

  return null;
}

function buildLargeOptionCarousel(title: string, options: Array<{ label: string; data: string; displayText: string }>) {
  const chunks: Array<typeof options> = [];
  for (let i = 0; i < options.length; i += 3) {
    chunks.push(options.slice(i, i + 3));
  }

  return {
    type: "flex",
    altText: title,
    contents: {
      type: "carousel",
      contents: chunks.map((chunk) => ({
        type: "bubble",
        size: "mega",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "lg",
          contents: [
            {
              type: "text",
              text: title,
              weight: "bold",
              size: "xxl",
              wrap: true,
            },
            ...chunk.map((option) => ({
              type: "button",
              style: "primary",
              height: "md",
              action: {
                type: "postback",
                label: option.label,
                data: option.data,
                displayText: option.displayText,
              },
            })),
          ],
        },
      })),
    },
  };
}

function moodSelectorMessage(sessionId: string) {
  return buildLargeOptionCarousel(
    "今天比較像哪一種心情？",
    M01_MOODS.map((mood) => ({
      label: mood,
      data: `module=m01&action=set_mood&session_id=${encodeURIComponent(sessionId)}&mood=${encodeURIComponent(mood)}`,
      displayText: mood,
    })),
  );
}

function textTypeSelectorMessage(sessionId: string, mood: string) {
  return buildLargeOptionCarousel(
    "今天想看哪一種話？",
    textTypes.map((textType) => ({
      label: textType,
      data: `module=m01&action=set_text_type&session_id=${encodeURIComponent(sessionId)}&mood=${encodeURIComponent(mood)}&text_type=${encodeURIComponent(textType)}`,
      displayText: textType,
    })),
  );
}

function visualSeriesSelectorMessage(sessionId: string, mood: string, textType: string) {
  return buildLargeOptionCarousel(
    "今天想看哪一種圖？",
    visualSeriesOptions.map((visualSeries) => ({
      label: visualSeries,
      data: `module=m01&action=set_visual_series&session_id=${encodeURIComponent(sessionId)}&mood=${encodeURIComponent(mood)}&text_type=${encodeURIComponent(textType)}&visual_series=${encodeURIComponent(visualSeries)}`,
      displayText: visualSeries,
    })),
  );
}

async function buildM01Recommendations(lineUserId: string, payload: M01Payload) {
  const recentShown = await getRecentShownCardIds(lineUserId);
  const excludeCardIds = [...new Set([...recentShown])];
  const picks = await recommendCards({
    textType: payload.textType as TextType,
    visualSeries: payload.visualSeries as VisualSeries,
    excludeCardIds,
  });

  const availableCards = await listCards();
  const fallbackPool = availableCards.filter((card) => !excludeCardIds.includes(card.id));

  const selected = [...picks];
  const used = new Set(selected.map((card) => card.id));

  const sameTextType = fallbackPool.filter((card) => !used.has(card.id) && card.textType === payload.textType);
  const sameVisualSeries = fallbackPool.filter((card) => !used.has(card.id) && card.visualSeries === payload.visualSeries);
  const randomPool = fallbackPool.filter((card) => !used.has(card.id)).sort(() => Math.random() - 0.5);

  for (const bucket of [sameTextType, sameVisualSeries, randomPool]) {
    for (const card of bucket) {
      if (selected.length >= 3) break;
      if (!used.has(card.id)) {
        selected.push(card);
        used.add(card.id);
      }
    }
  }

  return selected.slice(0, 3);
}

function buildM01Carousel(
  baseUrl: string,
  state: {
    sessionId: string;
    mood: string;
    textType: string;
    visualSeries: string;
  },
  cards: Awaited<ReturnType<typeof buildM01Recommendations>>,
) {
  return {
    type: "flex",
    altText: "長輩圖推薦",
    contents: {
      type: "carousel",
      contents: cards.map((card) => ({
        type: "bubble",
        hero: {
          type: "image",
          url: buildCardImageUrl(baseUrl, card.id),
          size: "full",
          aspectRatio: "4:5",
          aspectMode: "cover",
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "text",
              text: card.title,
              weight: "bold",
              size: "xl",
              wrap: true,
            },
            {
              type: "text",
              text: card.textType,
              size: "lg",
              color: "#475569",
              wrap: true,
            },
            {
              type: "text",
              text: card.visualSeries,
              size: "lg",
              color: "#475569",
              wrap: true,
            },
            {
              type: "text",
              text: card.caption,
              size: "md",
              color: "#334155",
              wrap: true,
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              height: "md",
              action: {
                type: "postback",
                label: "選這張",
                data: `module=m01&action=select&session_id=${encodeURIComponent(state.sessionId)}&mood=${encodeURIComponent(state.mood)}&text_type=${encodeURIComponent(state.textType)}&visual_series=${encodeURIComponent(state.visualSeries)}&card_id=${encodeURIComponent(card.id)}`,
                displayText: `選這張 ${card.title}`,
              },
            },
          ],
        },
      })),
    },
  };
}

function refreshQuickReply(sessionId: string, mood: string, textType: string, visualSeries: string) {
  return {
    items: [
      {
        type: "action",
        action: {
          type: "postback",
          label: "換一組",
          data: `module=m01&action=refresh&session_id=${encodeURIComponent(sessionId)}&mood=${encodeURIComponent(mood)}&text_type=${encodeURIComponent(textType)}&visual_series=${encodeURIComponent(visualSeries)}`,
          displayText: "換一組",
        },
      },
    ],
  };
}

function createM02StartMessage() {
  return {
    type: "text",
    text: "今天也來留下生活紀錄吧。\n請輸入：\n日記：今天早上吃了稀飯，下午去公園走走。",
  };
}

async function handleM01Start(replyToken: string, lineUserId: string) {
  const today = getTodayInTaipei();
  if (await hasCompletedM01Today(lineUserId, today)) {
    await replyToLine(replyToken, [
      {
        type: "text",
        text: "今天已經完成一張長輩圖，明天再來。",
      },
    ]);
    return;
  }

  const nextSession = await updateSession(lineUserId, {
    session_id: createM01SessionId(lineUserId),
    mood_today: "",
    text_type_preference: "",
    visual_series_preference: "",
    recommended_card_ids: [],
    selected_card_id: "",
    created_at: new Date().toISOString(),
  });

  await replyToLine(replyToken, [
    moodSelectorMessage(nextSession.session_id),
  ]);
}

async function handleM01Postback(request: NextRequest, replyToken: string, lineUserId: string, payload: M01Payload) {
  const session =
    (await getSession(lineUserId)) ??
    (await updateSession(lineUserId, { session_id: payload.sessionId || createM01SessionId(lineUserId), created_at: new Date().toISOString() }));
  const effectiveSessionId = payload.sessionId || session.session_id || createM01SessionId(lineUserId);
  const today = getTodayInTaipei();

  console.log("[m01] postback", {
    lineUserId,
    action: payload.action,
    sessionId: effectiveSessionId,
    mood: payload.mood,
    textType: payload.textType,
    visualSeries: payload.visualSeries,
    cardId: payload.cardId,
  });

  if (payload.action === "start") {
    await handleM01Start(replyToken, lineUserId);
    return;
  }

  if (await hasCompletedM01Today(lineUserId, today)) {
    await replyToLine(replyToken, [
      {
        type: "text",
        text: "今天已經完成一張長輩圖，明天再來。",
      },
    ]);
    return;
  }

  if (payload.action === "set_mood") {
    const nextSession = await updateSession(lineUserId, {
      session_id: effectiveSessionId,
      mood_today: payload.mood,
      selected_card_id: "",
    });
    await replyToLine(replyToken, [
      textTypeSelectorMessage(nextSession.session_id, payload.mood),
    ]);
    return;
  }

  if (payload.action === "set_text_type") {
    const nextSession = await updateSession(lineUserId, {
      session_id: effectiveSessionId,
      mood_today: payload.mood || session.mood_today,
      text_type_preference: payload.textType,
      selected_card_id: "",
    });
    await replyToLine(replyToken, [
      visualSeriesSelectorMessage(nextSession.session_id, payload.mood || nextSession.mood_today, payload.textType),
    ]);
    return;
  }

  if (payload.action === "set_visual_series" || payload.action === "refresh") {
    const nextVisualSeries = payload.visualSeries || session.visual_series_preference;
    const nextTextType = payload.textType || session.text_type_preference;
    const nextMood = payload.mood || session.mood_today;

    if (!nextTextType || !nextVisualSeries) {
      console.error("[m01] missing selection state", {
        lineUserId,
        sessionId: effectiveSessionId,
        action: payload.action,
        payload,
        session,
      });
      await replyToLine(replyToken, [unknownMessage()]);
      return;
    }

    const recommendations = await buildM01Recommendations(lineUserId, {
      ...payload,
      module: "m01",
      action: payload.action,
      mood: nextMood,
      textType: nextTextType,
      visualSeries: nextVisualSeries,
      cardId: payload.cardId,
    });

    await updateSession(lineUserId, {
      session_id: effectiveSessionId,
      mood_today: nextMood,
      text_type_preference: nextTextType,
      visual_series_preference: nextVisualSeries,
      recommended_card_ids: recommendations.map((card) => card.id),
      selected_card_id: "",
    });

    if (payload.action === "refresh") {
      await recordCardFeedback({
        line_user_id: lineUserId,
        session_id: effectiveSessionId,
        card_id: "",
        event_type: "refreshed",
        event_time: new Date().toISOString(),
        mood_today: nextMood,
        text_type_preference: nextTextType,
        visual_series_preference: nextVisualSeries,
      });
    }

    for (const card of recommendations) {
      await recordCardFeedback({
        line_user_id: lineUserId,
        session_id: effectiveSessionId,
        card_id: card.id,
        event_type: "shown",
        event_time: new Date().toISOString(),
        mood_today: nextMood,
        text_type_preference: nextTextType,
        visual_series_preference: nextVisualSeries,
      });
    }

    await replyToLine(replyToken, [
      {
        type: "text",
        text: `這是今天為你準備的三張長輩圖：${nextTextType} × ${nextVisualSeries}`,
      },
      buildM01Carousel(
        getBaseUrl(request),
        {
          sessionId: effectiveSessionId,
          mood: nextMood,
          textType: nextTextType,
          visualSeries: nextVisualSeries,
        },
        recommendations,
      ),
      {
        type: "text",
        text: "你可以選這張，或換一組。",
        quickReply: refreshQuickReply(effectiveSessionId, nextMood, nextTextType, nextVisualSeries),
      },
    ]);
    return;
  }

  if (payload.action === "select") {
    const card = (await listCards()).find((item) => item.id === payload.cardId);
    await updateSession(lineUserId, {
      session_id: effectiveSessionId,
      selected_card_id: payload.cardId,
      completed_date: today,
    });
    await recordCardFeedback({
      line_user_id: lineUserId,
      session_id: effectiveSessionId,
      card_id: payload.cardId,
      event_type: "selected",
      event_time: new Date().toISOString(),
      mood_today: payload.mood,
      text_type_preference: payload.textType,
      visual_series_preference: payload.visualSeries,
    });
    markM01Completed(lineUserId, today);
    await replyToLine(replyToken, [
      {
        type: "image",
        originalContentUrl: buildCardImageUrl(getBaseUrl(request), payload.cardId),
        previewImageUrl: buildCardImageUrl(getBaseUrl(request), payload.cardId),
      },
      {
        type: "text",
        text: card
          ? `長輩圖製作完成：${card.title}\n恭喜你選好今天的長輩圖，感謝你的使用。\n今天先到這裡，明天再來。`
          : "長輩圖製作完成，感謝你的使用。\n今天先到這裡，明天再來。",
      },
    ]);
    return;
  }

  await replyToLine(replyToken, [unknownMessage()]);
}

async function handleM02Start(replyToken: string, lineUserId: string) {
  const today = getTodayInTaipei();

  if (await hasCompletedToday(lineUserId, today)) {
    await recordM02RewardEvent({
      line_user_id: lineUserId,
      session_id: (await getM02Session(lineUserId))?.session_id ?? createM02SessionId(lineUserId),
      event_type: "duplicate_blocked",
      event_time: new Date().toISOString(),
    });
    await replyToLine(replyToken, [
      {
        type: "text",
        text: "今天已經完成紀錄，明天再來。",
      },
    ]);
    return;
  }

  const nextSession = await updateM02Session(lineUserId, {
    session_id: createM02SessionId(lineUserId),
    status: "waiting_for_diary",
    started_at: new Date().toISOString(),
  });

  await recordM02RewardEvent({
    line_user_id: lineUserId,
    session_id: nextSession.session_id,
    event_type: "started",
    event_time: new Date().toISOString(),
  });

  await replyToLine(replyToken, [createM02StartMessage()]);
}

async function handleM02DiaryInput(replyToken: string, lineUserId: string, rawText: string) {
  const session = await getM02Session(lineUserId);

  if (session?.status !== "waiting_for_diary") {
    await replyToLine(replyToken, [unknownMessage()]);
    return;
  }

  const today = getTodayInTaipei();
  if ((await hasCompletedToday(lineUserId, today)) || (await getTodayEntry(lineUserId))) {
    await updateM02Session(lineUserId, { status: "completed" });
    await recordM02RewardEvent({
      line_user_id: lineUserId,
      session_id: session.session_id,
      event_type: "duplicate_blocked",
      event_time: new Date().toISOString(),
    });
    await replyToLine(replyToken, [
      {
        type: "text",
        text: "今天已經完成紀錄，明天再來。",
      },
    ]);
    return;
  }

  const content = rawText.replace(/^日記：/, "").trim();
  if (!content) {
    await recordM02RewardEvent({
      line_user_id: lineUserId,
      session_id: session.session_id,
      event_type: "invalid_input",
      event_time: new Date().toISOString(),
    });
    await replyToLine(replyToken, [
      {
        type: "text",
        text: "請在「日記：」後面輸入今天的生活紀錄。",
      },
    ]);
    return;
  }

  const cjkLength = countCjkCharacters(content);

  if (cjkLength < 100) {
    await recordM02RewardEvent({
      line_user_id: lineUserId,
      session_id: session.session_id,
      event_type: "too_short",
      event_time: new Date().toISOString(),
    });
    await replyToLine(replyToken, [
      {
        type: "text",
        text: "內容還不夠，請至少寫滿 100 個字，才能完成今天的紀錄。",
      },
    ]);
    return;
  }

  if (cjkLength > 300) {
    await recordM02RewardEvent({
      line_user_id: lineUserId,
      session_id: session.session_id,
      event_type: "too_long",
      event_time: new Date().toISOString(),
    });
    await replyToLine(replyToken, [
      {
        type: "text",
        text: "內容太長，請縮短到 300 字以內。",
      },
    ]);
    return;
  }

  await createDiaryEntry({
    line_user_id: lineUserId,
    session_id: session.session_id,
    diary_text: content,
    diary_date: today,
    completed: true,
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  await recordM02RewardEvent({
    line_user_id: lineUserId,
    session_id: session.session_id,
    event_type: "diary_submitted",
    event_time: new Date().toISOString(),
  });

  markM02Completed(lineUserId, today);
  await updateM02Session(lineUserId, { status: "completed" });

  await recordM02RewardEvent({
    line_user_id: lineUserId,
    session_id: session.session_id,
    event_type: "completed",
    event_time: new Date().toISOString(),
  });

  await replyToLine(replyToken, [
    {
      type: "text",
      text: "已收到今天的日記。\n今日已完成一次紀錄。",
    },
  ]);
}

async function handleEvent(request: NextRequest, event: LineEvent) {
  if (!("replyToken" in event) || !event.replyToken) return;

  const lineUserId = event.source?.userId ?? "anonymous_user";

  if (event.type === "follow") {
    await replyToLine(event.replyToken, [
      {
        type: "text",
        text: "歡迎使用 Jenny。請從下方選單選擇服務。",
      },
    ]);
    return;
  }

  if (event.type === "postback") {
    const payload = parsePostback(event.postback.data);

    if (payload.module === "m01") {
      await handleM01Postback(request, event.replyToken, lineUserId, payload);
      return;
    }

    if (payload.module === "m02" && payload.action === "start") {
      await handleM02Start(event.replyToken, lineUserId);
      return;
    }

    await replyToLine(event.replyToken, [unknownMessage()]);
    return;
  }

  if (event.type === "message" && event.message.type === "text") {
    const text = event.message.text.trim();
    const lowerText = text.toLowerCase();

    if (M01_TEXT_TRIGGERS.has(text) || M01_TEXT_TRIGGERS.has(lowerText)) {
      await handleM01Start(event.replyToken, lineUserId);
      return;
    }

    if (M02_TEXT_TRIGGERS.has(text) || M02_TEXT_TRIGGERS.has(lowerText)) {
      await handleM02Start(event.replyToken, lineUserId);
      return;
    }

    const m01Session = await getSession(lineUserId);
    const derivedM01Payload = deriveM01PayloadFromText(text, m01Session);
    if (derivedM01Payload) {
      await handleM01Postback(request, event.replyToken, lineUserId, derivedM01Payload);
      return;
    }

    if (text.startsWith("日記：")) {
      await handleM02DiaryInput(event.replyToken, lineUserId, text);
      return;
    }

    if ((await getM02Session(lineUserId))?.status === "waiting_for_diary") {
      await recordM02RewardEvent({
        line_user_id: lineUserId,
        session_id: (await getM02Session(lineUserId))?.session_id ?? createM02SessionId(lineUserId),
        event_type: "invalid_input",
        event_time: new Date().toISOString(),
      });
      await replyToLine(event.replyToken, [
        {
          type: "text",
          text: "請用「日記：」開頭輸入今天的生活紀錄。",
        },
      ]);
      return;
    }

    await replyToLine(event.replyToken, [unknownMessage()]);
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/line/webhook",
    service: "line-webhook",
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) {
    console.error("Missing env: LINE_CHANNEL_SECRET");
    return NextResponse.json({ ok: false, error: "Missing LINE_CHANNEL_SECRET" }, { status: 500 });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error("Missing env: LINE_CHANNEL_ACCESS_TOKEN");
    return NextResponse.json({ ok: false, error: "Missing LINE_CHANNEL_ACCESS_TOKEN" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let body: { events?: LineEvent[] } = {};
  try {
    body = JSON.parse(rawBody) as { events?: LineEvent[] };
  } catch (error) {
    console.error("Invalid LINE webhook body", error);
    return NextResponse.json({ ok: true });
  }

  for (const event of body.events ?? []) {
    try {
      await handleEvent(req, event);
    } catch (error) {
      console.error("LINE event handling failed", error);
    }
  }

  return NextResponse.json({ ok: true });
}
