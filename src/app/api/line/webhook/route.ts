import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  cards,
  getCardById,
  recommendCards,
  textTypes,
  visualSeriesOptions,
  type TextType,
  type VisualSeries,
} from "@/lib/m01-cards";
import {
  appendDiaryEntry,
  appendInteractionEvent,
  createDiaryRecord,
  createEventRecord,
  findLatestSelection,
  readDiaryEntries,
  readInteractionEvents,
} from "@/lib/m01-storage";

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

function parsePostback(data: string) {
  const params = new URLSearchParams(data);
  return {
    action: params.get("action") ?? "",
    sessionId: params.get("sessionId") ?? "",
    mood: params.get("mood") ?? "",
    textType: params.get("textType") ?? "",
    visualSeries: params.get("visualSeries") ?? "",
    cardId: params.get("cardId") ?? "",
    exclude: params.get("exclude") ?? "",
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
    throw new Error(`LINE reply failed: ${response.status} ${text}`);
  }
}

function createSessionId(userId: string) {
  return `S-${userId}-${Date.now()}`;
}

function moodQuickReply(sessionId: string) {
  const moods = ["開心", "平靜", "累", "煩", "寂寞", "沮喪", "沒特別感覺"];
  return {
    items: moods.map((mood) => ({
      type: "action",
      action: {
        type: "postback",
        label: mood,
        data: `action=mood&sessionId=${encodeURIComponent(sessionId)}&mood=${encodeURIComponent(mood)}`,
        displayText: mood,
      },
    })),
  };
}

function textTypeQuickReply(sessionId: string, mood: string) {
  return {
    items: textTypes.map((textType) => ({
      type: "action",
      action: {
        type: "postback",
        label: textType,
        data: `action=textType&sessionId=${encodeURIComponent(sessionId)}&mood=${encodeURIComponent(mood)}&textType=${encodeURIComponent(textType)}`,
        displayText: textType,
      },
    })),
  };
}

function visualSeriesQuickReply(sessionId: string, mood: string, textType: string) {
  return {
    items: visualSeriesOptions.map((visualSeries) => ({
      type: "action",
      action: {
        type: "postback",
        label: visualSeries,
        data: `action=visualSeries&sessionId=${encodeURIComponent(sessionId)}&mood=${encodeURIComponent(mood)}&textType=${encodeURIComponent(textType)}&visualSeries=${encodeURIComponent(visualSeries)}`,
        displayText: visualSeries,
      },
    })),
  };
}

function cardCarousel(options: {
  sessionId: string;
  mood: string;
  textType: TextType;
  visualSeries: VisualSeries;
  excludeCardIds?: string[];
}) {
  const picks = recommendCards({
    textType: options.textType,
    visualSeries: options.visualSeries,
    excludeCardIds: options.excludeCardIds,
  });

  const shownIds = picks.map((card) => card.id).join(",");

  return {
    type: "flex",
    altText: "今日長輩圖推薦",
    contents: {
      type: "carousel",
      contents: picks.map((card) => ({
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
          spacing: "md",
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
              text: `${card.textType}・${card.visualSeries}`,
              size: "sm",
              color: "#6b7280",
            },
            {
              type: "text",
              text: card.caption,
              wrap: true,
              size: "sm",
              color: "#334155",
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
                data: `action=selectCard&sessionId=${encodeURIComponent(options.sessionId)}&mood=${encodeURIComponent(options.mood)}&textType=${encodeURIComponent(options.textType)}&visualSeries=${encodeURIComponent(options.visualSeries)}&cardId=${encodeURIComponent(card.id)}`,
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
                data: `action=dislikeCard&sessionId=${encodeURIComponent(options.sessionId)}&mood=${encodeURIComponent(options.mood)}&textType=${encodeURIComponent(options.textType)}&visualSeries=${encodeURIComponent(options.visualSeries)}&cardId=${encodeURIComponent(card.id)}`,
                displayText: `不喜歡 ${card.title}`,
              },
            },
          ],
        },
      })),
    },
    shownIds,
  };
}

function reshuffleQuickReply(sessionId: string, mood: string, textType: TextType, visualSeries: VisualSeries, shownIds: string) {
  return {
    items: [
      {
        type: "action",
        action: {
          type: "postback",
          label: "換一組",
          data: `action=reshuffle&sessionId=${encodeURIComponent(sessionId)}&mood=${encodeURIComponent(mood)}&textType=${encodeURIComponent(textType)}&visualSeries=${encodeURIComponent(visualSeries)}&exclude=${encodeURIComponent(shownIds)}`,
          displayText: "換一組",
        },
      },
      {
        type: "action",
        action: {
          type: "postback",
          label: "重選文字",
          data: `action=mood&sessionId=${encodeURIComponent(sessionId)}&mood=${encodeURIComponent(mood)}`,
          displayText: "重選文字",
        },
      },
    ],
  };
}

function helpMessage() {
  return {
    type: "text",
    text: "輸入「長輩圖」或點按按鍵，我就會開始推薦三張圖卡。",
  };
}

async function handleEvent(event: LineEvent) {
  if (!("replyToken" in event) || !event.replyToken) return;
  const userId = event.source?.userId ?? "anonymous_user";

  if (event.type === "follow") {
    await replyToLine(event.replyToken, [
      {
        type: "text",
        text: "歡迎加入 Jenny 長輩圖。輸入「長輩圖」就可以開始選今天的心情、想看的話和圖。",
      },
    ]);
    return;
  }

  if (event.type === "message" && event.message.type === "text") {
    const text = event.message.text.trim();

    if (text === "長輩圖" || text === "今日長輩圖" || text.toLowerCase() === "m01") {
      const sessionId = createSessionId(userId);
      await appendInteractionEvent(
        createEventRecord({
          userId,
          sessionId,
          eventType: "keyword_triggered",
          payload: { keyword: text },
        }),
      );
      await replyToLine(event.replyToken, [
        {
          type: "text",
          text: "今天比較像哪一種心情？這個只做日記脈絡紀錄，不會拿來改變推薦排序。",
          quickReply: moodQuickReply(sessionId),
        },
      ]);
      return;
    }

    if (text.startsWith("日記：")) {
      const latestSelection = await findLatestSelection(userId);
      const entryText = text.replace(/^日記：/, "").trim();
      const diaryRecord = createDiaryRecord({
        userId,
        sessionId: latestSelection?.sessionId ?? createSessionId(userId),
        linkedCardId: latestSelection?.cardId ?? null,
        moodToday: latestSelection?.moodToday ?? "",
        textTypePreference: latestSelection?.textType ?? "",
        visualSeriesPreference: latestSelection?.visualSeries ?? "",
        entryText,
      });
      await appendDiaryEntry(diaryRecord);
      await appendInteractionEvent(
        createEventRecord({
          userId,
          sessionId: diaryRecord.sessionId,
          eventType: "used_for_diary",
          cardId: diaryRecord.linkedCardId,
          moodToday: diaryRecord.moodToday,
          textType: diaryRecord.textTypePreference,
          visualSeries: diaryRecord.visualSeriesPreference,
          payload: { diaryId: diaryRecord.id, length: entryText.length },
        }),
      );
      await replyToLine(event.replyToken, [
        {
          type: "text",
          text: "收到，今天的日記已經幫你記下來了。",
        },
      ]);
      return;
    }

    await replyToLine(event.replyToken, [helpMessage()]);
    return;
  }

  if (event.type === "postback") {
    const payload = parsePostback(event.postback.data);

    if (payload.action === "mood") {
      await appendInteractionEvent(
        createEventRecord({
          userId,
          sessionId: payload.sessionId,
          eventType: "mood_selected",
          moodToday: payload.mood,
          payload: { source: "postback" },
        }),
      );
      await replyToLine(event.replyToken, [
        {
          type: "text",
          text: `今天心情先記成「${payload.mood}」。接著想看哪一種話？`,
          quickReply: textTypeQuickReply(payload.sessionId, payload.mood),
        },
      ]);
      return;
    }

    if (payload.action === "textType") {
      await appendInteractionEvent(
        createEventRecord({
          userId,
          sessionId: payload.sessionId,
          eventType: "text_type_selected",
          moodToday: payload.mood,
          textType: payload.textType,
          payload: { source: "postback" },
        }),
      );
      await replyToLine(event.replyToken, [
        {
          type: "text",
          text: `你選了「${payload.textType}」。今天想看哪一種圖？`,
          quickReply: visualSeriesQuickReply(payload.sessionId, payload.mood, payload.textType),
        },
      ]);
      return;
    }

    if (payload.action === "visualSeries" || payload.action === "reshuffle") {
      const excludeCardIds = payload.exclude ? payload.exclude.split(",").filter(Boolean) : [];
      if (payload.action === "visualSeries") {
        await appendInteractionEvent(
          createEventRecord({
            userId,
            sessionId: payload.sessionId,
            eventType: "visual_series_selected",
            moodToday: payload.mood,
            textType: payload.textType,
            visualSeries: payload.visualSeries,
            payload: { source: "postback" },
          }),
        );
      } else {
        await appendInteractionEvent(
          createEventRecord({
            userId,
            sessionId: payload.sessionId,
            eventType: "reshuffled",
            moodToday: payload.mood,
            textType: payload.textType,
            visualSeries: payload.visualSeries,
            payload: { excludeCardIds },
          }),
        );
      }
      const carousel = cardCarousel({
        sessionId: payload.sessionId,
        mood: payload.mood,
        textType: payload.textType as TextType,
        visualSeries: payload.visualSeries as VisualSeries,
        excludeCardIds,
      });
      const shownIds = carousel.shownIds.split(",").filter(Boolean);
      for (const cardId of shownIds) {
        await appendInteractionEvent(
          createEventRecord({
            userId,
            sessionId: payload.sessionId,
            eventType: "shown",
            cardId,
            moodToday: payload.mood,
            textType: payload.textType,
            visualSeries: payload.visualSeries,
            payload: { shownIds },
          }),
        );
      }

      await replyToLine(event.replyToken, [
        {
          type: "text",
          text: `這是今天的三張長輩圖：${payload.textType} × ${payload.visualSeries}`,
        },
        carousel,
        {
          type: "text",
          text: "你可以直接選一張，也可以換一組。",
          quickReply: reshuffleQuickReply(
            payload.sessionId,
            payload.mood,
            payload.textType as TextType,
            payload.visualSeries as VisualSeries,
            carousel.shownIds,
          ),
        },
      ]);
      return;
    }

    if (payload.action === "selectCard") {
      const card = getCardById(payload.cardId);
      await appendInteractionEvent(
        createEventRecord({
          userId,
          sessionId: payload.sessionId,
          eventType: "selected",
          cardId: payload.cardId,
          moodToday: payload.mood,
          textType: payload.textType,
          visualSeries: payload.visualSeries,
          payload: { cardTitle: card?.title ?? "" },
        }),
      );
      await replyToLine(event.replyToken, [
        {
          type: "text",
          text: card
            ? `你選了「${card.title}」。如果要寫一句日記，直接輸入「日記：你的內容」就可以。`
            : "你選好了。若要寫一句日記，直接輸入「日記：你的內容」就可以。",
        },
      ]);
      return;
    }

    if (payload.action === "dislikeCard") {
      const card = getCardById(payload.cardId);
      await appendInteractionEvent(
        createEventRecord({
          userId,
          sessionId: payload.sessionId,
          eventType: "disliked",
          cardId: payload.cardId,
          moodToday: payload.mood,
          textType: payload.textType,
          visualSeries: payload.visualSeries,
          payload: { cardTitle: card?.title ?? "" },
        }),
      );
      await replyToLine(event.replyToken, [
        {
          type: "text",
          text: card ? `好，我先記下你暫時不喜歡「${card.title}」。` : "好，我先記下你暫時不喜歡這張。",
        },
      ]);
      return;
    }
  }
}

export async function GET() {
  const events = await readInteractionEvents();
  const diaries = await readDiaryEntries();
  return NextResponse.json({
    ok: true,
    route: "/api/line/webhook",
    cards: cards.length,
    interactionEvents: events.length,
    diaryEntries: diaries.length,
    message: "LINE webhook endpoint is ready.",
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Missing LINE_CHANNEL_SECRET" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as { events?: LineEvent[] };

  try {
    for (const event of body.events ?? []) {
      await handleEvent(event);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
