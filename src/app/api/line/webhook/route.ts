import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { listCards, recommendCards, textTypes, visualSeriesOptions, type TextType, type VisualSeries } from "@/lib/m01-cards";
import { getDislikedCardIds, getRecentShownCardIds, getSession, recordCardFeedback, updateSession } from "@/lib/m01-session-store";
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
  mood: string;
  textType: string;
  visualSeries: string;
  cardId: string;
};

const M01_TEXT_TRIGGERS = new Set(["製作長輩圖", "長輩圖", "今日長輩圖", "m01"]);
const M02_TEXT_TRIGGERS = new Set(["寫日記換雞蛋", "寫日記", "今日日記", "m02"]);

function parsePostback(data: string) {
  const params = new URLSearchParams(data);
  return {
    module: params.get("module") ?? "",
    action: params.get("action") ?? "",
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

function moodQuickReply() {
  const moods = ["開心", "平靜", "累", "煩", "寂寞", "沮喪", "沒特別感覺"];
  return {
    items: moods.map((mood) => ({
      type: "action",
      action: {
        type: "postback",
        label: mood,
        data: `module=m01&action=set_mood&mood=${encodeURIComponent(mood)}`,
        displayText: mood,
      },
    })),
  };
}

function textTypeQuickReply() {
  return {
    items: textTypes.map((textType) => ({
      type: "action",
      action: {
        type: "postback",
        label: textType,
        data: `module=m01&action=set_text_type&text_type=${encodeURIComponent(textType)}`,
        displayText: textType,
      },
    })),
  };
}

function visualSeriesQuickReply() {
  return {
    items: visualSeriesOptions.map((visualSeries) => ({
      type: "action",
      action: {
        type: "postback",
        label: visualSeries,
        data: `module=m01&action=set_visual_series&visual_series=${encodeURIComponent(visualSeries)}`,
        displayText: visualSeries,
      },
    })),
  };
}

async function buildM01Recommendations(lineUserId: string, payload: M01Payload) {
  const excludeCardIds = [...new Set([...getRecentShownCardIds(lineUserId), ...getDislikedCardIds(lineUserId)])];
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

function buildM01Carousel(cards: Awaited<ReturnType<typeof buildM01Recommendations>>) {
  return {
    type: "flex",
    altText: "長輩圖推薦",
    contents: {
      type: "carousel",
      contents: cards.map((card) => ({
        type: "bubble",
        hero: {
          type: "image",
          url: card.imageUrl,
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
              size: "lg",
              wrap: true,
            },
            {
              type: "text",
              text: card.textType,
              size: "sm",
              color: "#475569",
              wrap: true,
            },
            {
              type: "text",
              text: card.visualSeries,
              size: "sm",
              color: "#475569",
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
              height: "sm",
              action: {
                type: "postback",
                label: "選這張",
                data: `module=m01&action=select&card_id=${encodeURIComponent(card.id)}`,
                displayText: `選這張 ${card.title}`,
              },
            },
            {
              type: "button",
              style: "secondary",
              height: "sm",
              action: {
                type: "postback",
                label: "不喜歡這張",
                data: `module=m01&action=dislike&card_id=${encodeURIComponent(card.id)}`,
                displayText: `不喜歡 ${card.title}`,
              },
            },
          ],
        },
      })),
    },
  };
}

function refreshQuickReply() {
  return {
    items: [
      {
        type: "action",
        action: {
          type: "postback",
          label: "換一組",
          data: "module=m01&action=refresh",
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
  updateSession(lineUserId, {
    session_id: createM01SessionId(lineUserId),
    mood_today: "",
    text_type_preference: "",
    visual_series_preference: "",
    recommended_card_ids: [],
    selected_card_id: "",
    created_at: new Date().toISOString(),
  });

  await replyToLine(replyToken, [
    {
      type: "text",
      text: "今天比較像哪一種心情？",
      quickReply: moodQuickReply(),
    },
  ]);
}

async function handleM01Postback(replyToken: string, lineUserId: string, payload: M01Payload) {
  const session = getSession(lineUserId) ?? updateSession(lineUserId, { session_id: createM01SessionId(lineUserId), created_at: new Date().toISOString() });

  if (payload.action === "start") {
    await handleM01Start(replyToken, lineUserId);
    return;
  }

  if (payload.action === "set_mood") {
    updateSession(lineUserId, {
      mood_today: payload.mood,
      selected_card_id: "",
    });
    await replyToLine(replyToken, [
      {
        type: "text",
        text: "今天想看哪一種話？",
        quickReply: textTypeQuickReply(),
      },
    ]);
    return;
  }

  if (payload.action === "set_text_type") {
    updateSession(lineUserId, {
      mood_today: session.mood_today,
      text_type_preference: payload.textType,
      selected_card_id: "",
    });
    await replyToLine(replyToken, [
      {
        type: "text",
        text: "今天想看哪一種圖？",
        quickReply: visualSeriesQuickReply(),
      },
    ]);
    return;
  }

  if (payload.action === "set_visual_series" || payload.action === "refresh") {
    const nextVisualSeries = payload.action === "refresh" ? session.visual_series_preference : payload.visualSeries;
    const nextTextType = session.text_type_preference;

    if (!nextTextType || !nextVisualSeries) {
      await replyToLine(replyToken, [unknownMessage()]);
      return;
    }

    const recommendations = await buildM01Recommendations(lineUserId, {
      ...payload,
      module: "m01",
      action: payload.action,
      mood: session.mood_today,
      textType: nextTextType,
      visualSeries: nextVisualSeries,
      cardId: payload.cardId,
    });

    updateSession(lineUserId, {
      mood_today: session.mood_today,
      text_type_preference: nextTextType,
      visual_series_preference: nextVisualSeries,
      recommended_card_ids: recommendations.map((card) => card.id),
      selected_card_id: "",
    });

    if (payload.action === "refresh") {
      recordCardFeedback({
        line_user_id: lineUserId,
        session_id: session.session_id,
        card_id: "",
        event_type: "refreshed",
        event_time: new Date().toISOString(),
      });
    }

    for (const card of recommendations) {
      recordCardFeedback({
        line_user_id: lineUserId,
        session_id: session.session_id,
        card_id: card.id,
        event_type: "shown",
        event_time: new Date().toISOString(),
      });
    }

    await replyToLine(replyToken, [
      {
        type: "text",
        text: "這是今天的三張長輩圖。",
      },
      buildM01Carousel(recommendations),
      {
        type: "text",
        text: "你可以選這張，或換一組。",
        quickReply: refreshQuickReply(),
      },
    ]);
    return;
  }

  if (payload.action === "select") {
    updateSession(lineUserId, {
      selected_card_id: payload.cardId,
    });
    recordCardFeedback({
      line_user_id: lineUserId,
      session_id: session.session_id,
      card_id: payload.cardId,
      event_type: "selected",
      event_time: new Date().toISOString(),
    });
    await replyToLine(replyToken, [
      {
        type: "text",
        text: "已選好這張長輩圖。",
      },
    ]);
    return;
  }

  if (payload.action === "dislike") {
    recordCardFeedback({
      line_user_id: lineUserId,
      session_id: session.session_id,
      card_id: payload.cardId,
      event_type: "disliked",
      event_time: new Date().toISOString(),
    });
    await replyToLine(replyToken, [
      {
        type: "text",
        text: "好，先記下這張你不喜歡。",
      },
    ]);
    return;
  }

  await replyToLine(replyToken, [unknownMessage()]);
}

async function handleM02Start(replyToken: string, lineUserId: string) {
  const today = getTodayInTaipei();

  if (hasCompletedToday(lineUserId, today)) {
    recordM02RewardEvent({
      line_user_id: lineUserId,
      session_id: getM02Session(lineUserId)?.session_id ?? createM02SessionId(lineUserId),
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

  const nextSession = updateM02Session(lineUserId, {
    session_id: createM02SessionId(lineUserId),
    status: "waiting_for_diary",
    started_at: new Date().toISOString(),
  });

  recordM02RewardEvent({
    line_user_id: lineUserId,
    session_id: nextSession.session_id,
    event_type: "started",
    event_time: new Date().toISOString(),
  });

  await replyToLine(replyToken, [createM02StartMessage()]);
}

async function handleM02DiaryInput(replyToken: string, lineUserId: string, rawText: string) {
  const session = getM02Session(lineUserId);

  if (session?.status !== "waiting_for_diary") {
    await replyToLine(replyToken, [unknownMessage()]);
    return;
  }

  const today = getTodayInTaipei();
  if (hasCompletedToday(lineUserId, today) || getTodayEntry(lineUserId)) {
    updateM02Session(lineUserId, { status: "completed" });
    recordM02RewardEvent({
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
    recordM02RewardEvent({
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
    recordM02RewardEvent({
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
    recordM02RewardEvent({
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

  createDiaryEntry({
    line_user_id: lineUserId,
    session_id: session.session_id,
    diary_text: content,
    diary_date: today,
    completed: true,
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  recordM02RewardEvent({
    line_user_id: lineUserId,
    session_id: session.session_id,
    event_type: "diary_submitted",
    event_time: new Date().toISOString(),
  });

  markM02Completed(lineUserId, today);
  updateM02Session(lineUserId, { status: "completed" });

  recordM02RewardEvent({
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

async function handleEvent(event: LineEvent) {
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
      await handleM01Postback(event.replyToken, lineUserId, payload);
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

    if (text.startsWith("日記：")) {
      await handleM02DiaryInput(event.replyToken, lineUserId, text);
      return;
    }

    if (getM02Session(lineUserId)?.status === "waiting_for_diary") {
      recordM02RewardEvent({
        line_user_id: lineUserId,
        session_id: getM02Session(lineUserId)?.session_id ?? createM02SessionId(lineUserId),
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
      await handleEvent(event);
    } catch (error) {
      console.error("LINE event handling failed", error);
    }
  }

  return NextResponse.json({ ok: true });
}
