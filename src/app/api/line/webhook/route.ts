import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { NextRequest, NextResponse } from "next/server";

import {
  getEggProgress,
  getGuidedDiaryPrompt,
  getUserDailyCheckin,
  getUserDailyMood,
  hasRequiredTables,
  getParticipant,
  listCareEvents,
  listDiaryEntries,
  listUserDailyCheckins,
  listCommunityInfo,
  listPartnerLinks,
  normalizeDiaryAnalysis,
  recalculateEggProgress,
  recordCareEvent,
  recordCardInteraction,
  runQueueDetection,
  saveDailyRecommendations,
  syncM03Pairs,
  upsertDiaryEntry,
  upsertGuidedDiaryPrompt,
  upsertParticipant,
  upsertUserDailyCheckin,
  upsertUserDailyMood,
} from "@/lib/jenny-product-store";
import { listCards, type CardAsset } from "@/lib/m01-cards";
import { getRecentShownCardIds, getSession, hasCompletedM01Today, markM01Completed, recordCardFeedback, updateSession } from "@/lib/m01-session-store";
import { getM03Session, updateM03Session } from "@/lib/m03-session-store";
import {
  countCjkCharacters,
  createDiaryEntry,
  getM02Session,
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

type ParsedPostback = {
  module: string;
  action: string;
  sessionId: string;
  cardId: string;
  mood: string;
  series: string;
  partnerChoice: string;
  setting: string;
  value: string;
  category: string;
  intent: string;
};

const M01_TEXT_TRIGGERS = new Set(["製作長輩圖", "長輩圖", "今日長輩圖", "m01"]);
const M02_TEXT_TRIGGERS = new Set(["寫日記換雞蛋", "寫日記", "看圖寫一句", "今日日記", "m02"]);
const M03_TEXT_TRIGGERS = new Set(["關懷與配對", "關懷大使", "好友配對", "我的小檔案", "m03"]);
const M04_TEXT_TRIGGERS = new Set(["最新活動與政策", "活動資訊", "政策資訊", "社區資訊", "m04"]);
const EGG_TEXT_TRIGGERS = new Set(["我的雞蛋進度", "雞蛋進度", "egg"]);
const MIN_DIARY_CJK = 50;
const MOOD_OPTIONS = ["開心", "平靜", "感謝", "疲倦", "擔心", "孤單", "沒什麼特別感覺"] as const;
const M01_SERIES_OPTIONS = ["花系列", "神明系列", "台灣花布系列", "山系列"] as const;
const MAX_M02_ENTRIES_PER_USER = 10;
const LINE_WEBHOOK_TRACE = process.env.LINE_WEBHOOK_TRACE === "1";

function traceLineWebhook(event: string, payload: Record<string, unknown>) {
  if (!LINE_WEBHOOK_TRACE) return;
  console.log(`[line-webhook-trace] ${JSON.stringify({ event, ...payload })}`);
}

function summarizeReplyMessages(messages: unknown[]) {
  return messages.map((message) => {
    if (!message || typeof message !== "object") {
      return { type: typeof message };
    }

    const row = message as Record<string, unknown>;
    return {
      type: typeof row.type === "string" ? row.type : "unknown",
      altText: typeof row.altText === "string" ? row.altText : undefined,
      text: typeof row.text === "string" ? row.text.slice(0, 80) : undefined,
    };
  });
}

function parsePostback(data: string): ParsedPostback {
  const params = new URLSearchParams(data);
  return {
    module: params.get("module") ?? "",
    action: params.get("action") ?? "",
    sessionId: params.get("session_id") ?? "",
    cardId: params.get("card_id") ?? "",
    mood: params.get("mood") ?? "",
    series: params.get("series") ?? "",
    partnerChoice: params.get("partner") ?? "",
    setting: params.get("setting") ?? "",
    value: params.get("value") ?? "",
    category: params.get("category") ?? "",
    intent: params.get("intent") ?? "",
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
  if (!token) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN");

  traceLineWebhook("reply.attempt", {
    replyToken,
    messages: summarizeReplyMessages(messages),
    rawMessages: messages,
  });

  const payload = JSON.stringify({ replyToken, messages });

  const response = await new Promise<{ ok: boolean; status: number; statusText: string; body: string }>((resolve, reject) => {
    execFile(
      "curl",
      [
        "--silent",
        "--show-error",
        "--connect-timeout",
        "10",
        "--max-time",
        "30",
        "-X",
        "POST",
        "https://api.line.me/v2/bot/message/reply",
        "-H",
        `Authorization: Bearer ${token}`,
        "-H",
        "Content-Type: application/json",
        "--data-binary",
        payload,
        "-w",
        "\n%{http_code}",
      ],
      { maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }

        const output = stdout.trimEnd();
        const lastNewline = output.lastIndexOf("\n");
        const body = lastNewline >= 0 ? output.slice(0, lastNewline) : "";
        const statusText = "";
        const status = Number(lastNewline >= 0 ? output.slice(lastNewline + 1) : output) || 500;

        resolve({
          ok: status >= 200 && status < 300,
          status,
          statusText,
          body,
        });
      },
    );
  });

  traceLineWebhook("reply.result", {
    replyToken,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
  });

  if (!response.ok) {
    throw new Error(`LINE reply failed: ${response.status} ${response.body}`);
  }
}

function unknownMessage() {
  return {
    type: "text",
    text: "我可以陪你看長輩圖、寫今天的一句話、看看關懷與配對狀態，或讀最新活動與政策。點選下方選單就可以開始。",
  };
}

function createM01SessionId(userId: string) {
  return `m01-${userId}-${Date.now()}`;
}

function createM02SessionId(userId: string) {
  return `m02-${userId}-${Date.now()}`;
}

function createM03SessionId(userId: string) {
  return `m03-${userId}-${Date.now()}`;
}

function extractDiaryContent(rawText: string) {
  return rawText.replace(/^日記[:：]\s*/u, "").trim();
}

function buildFourButtonQuickReply(items: Array<{ label: string; data: string; displayText: string }>) {
  return {
    items: items.map((item) => ({
      type: "action",
      action: {
        type: "postback",
        label: item.label,
        data: item.data,
        displayText: item.displayText,
      },
    })),
  };
}

function buildM01MoodQuickReply() {
  return buildFourButtonQuickReply(
    MOOD_OPTIONS.map((mood) => ({
      label: mood,
      data: `module=m01&action=choose_mood&mood=${encodeURIComponent(mood)}`,
      displayText: mood,
    })),
  );
}

function buildM01SeriesQuickReply() {
  return buildFourButtonQuickReply(
    M01_SERIES_OPTIONS.map((series) => ({
      label: series,
      data: `module=m01&action=choose_series&series=${encodeURIComponent(series)}`,
      displayText: series,
    })),
  );
}

function buildM04CategoryCarousel(category: string, rows: Awaited<ReturnType<typeof listCommunityInfo>>) {
  const label = m04CategoryLabel(category);
  const contents = (rows.length ? rows : [{ info_id: `${category}-empty`, title: "目前還沒有上架中的資訊", description: `${label}目前還沒有上架中的資訊。`, event_date: null, location: "", district: "", contact: "", status: "active", category: category as "policy" | "neighborhood" | "temple" | "community", created_at: "", updated_at: "" }]).slice(0, 10);

  return {
    type: "flex",
    altText: label,
    contents: {
      type: "carousel",
      contents: contents.map((row) => ({
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            { type: "text", text: label, size: "xs", color: "#b45309", weight: "bold" },
            { type: "text", text: row.title, weight: "bold", size: "lg", wrap: true, color: "#111827" },
            { type: "text", text: row.description, size: "sm", wrap: true, color: "#334155" },
            { type: "text", text: [row.event_date, row.location, row.district].filter(Boolean).join("｜") || "尚未設定日期與地點", size: "xs", wrap: true, color: "#64748b" },
            { type: "text", text: row.contact ? `聯絡：${row.contact}` : "聯絡方式未提供", size: "xs", wrap: true, color: "#64748b" },
          ],
        },
        styles: {
          body: { backgroundColor: "#fffbeb" },
        },
      })),
    },
  };
}

function getSeasonKey(date: string) {
  const [year, month] = date.split("-").map(Number);
  const quarter = Math.floor((month - 1) / 3) + 1;
  return `${year}-Q${quarter}`;
}

function buildM01Carousel(sessionId: string, cards: CardAsset[]) {
  return {
    type: "flex",
    altText: "今日長輩圖",
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
            { type: "text", text: card.title, weight: "bold", size: "xl", wrap: true },
            { type: "text", text: `${card.textType} / ${card.visualSeries}`, size: "sm", color: "#475569", wrap: true },
            { type: "text", text: card.caption, size: "sm", color: "#334155", wrap: true },
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
              action: {
                type: "postback",
                label: "選這張",
                data: `module=m01&action=select&session_id=${encodeURIComponent(sessionId)}&card_id=${encodeURIComponent(card.id)}`,
                displayText: `選這張 ${card.title}`,
              },
            },
            {
              type: "button",
              style: "secondary",
              action: {
                type: "postback",
                label: "先收藏",
                data: `module=m01&action=favorite&session_id=${encodeURIComponent(sessionId)}&card_id=${encodeURIComponent(card.id)}`,
                displayText: `先收藏 ${card.title}`,
              },
            },
          ],
        },
      })),
    },
  };
}

function summarizeEggProgress(daysCompleted: number, eligible: boolean) {
  const remaining = Math.max(0, 14 - daysCompleted);
  return `14 天內已完成 ${daysCompleted} / 14 天。\n${eligible ? "已達成雞蛋資格。" : `距離雞蛋還差 ${remaining} 天。`}`;
}

function buildYesNoQuickReply(sessionId: string, setting: string) {
  return buildFourButtonQuickReply([
    { label: "願意", data: `module=m03&action=set_option&session_id=${encodeURIComponent(sessionId)}&setting=${encodeURIComponent(setting)}&value=yes`, displayText: "願意" },
    { label: "先不要", data: `module=m03&action=set_option&session_id=${encodeURIComponent(sessionId)}&setting=${encodeURIComponent(setting)}&value=no`, displayText: "先不要" },
  ]);
}

function buildM03SummaryText(
  displayName: string,
  settings: {
    wantsReminders: boolean;
    wantsToHelpOthers: boolean;
    wantsToBeCaredFor: boolean;
    wantsChatMatching: boolean;
  },
  linkSummary: string[],
) {
  return [
    "好友關懷與配對摘要",
    `稱呼：${displayName}`,
    `日記提醒：${settings.wantsReminders ? "開啟" : "關閉"}`,
    `願意關心別人：${settings.wantsToHelpOthers ? "願意" : "先不要"}`,
    `希望被關懷：${settings.wantsToBeCaredFor ? "願意" : "先不要"}`,
    `聊天配對：${settings.wantsChatMatching ? "願意加入" : "未加入"}`,
    `目前配對：${linkSummary.length ? linkSummary.join("、") : "尚未配對"}`,
  ].join("\n");
}

function buildM03ActionQuickReply() {
  return buildFourButtonQuickReply([
    { label: "送出問候", data: "module=m03&action=care_event&intent=send_greeting", displayText: "送出問候" },
    { label: "今天想聊聊", data: "module=m03&action=care_event&intent=request_care", displayText: "今天想聊聊" },
    { label: "願意打電話", data: "module=m03&action=care_event&intent=willing_to_call", displayText: "今天願意打電話" },
    { label: "重新設定", data: "module=m03&action=restart", displayText: "重新設定關懷與配對" },
  ]);
}

function buildM03IntroFlex(statusText: string) {
  return {
    type: "flex",
    altText: "關懷與配對",
    contents: {
      type: "bubble",
      size: "giga",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "關懷與配對",
            weight: "bold",
            size: "xl",
            color: "#0f172a",
          },
          {
            type: "text",
            text: statusText,
            size: "sm",
            color: "#0f766e",
            wrap: true,
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            margin: "md",
            contents: [
              { type: "text", text: "• 設定日記提醒", size: "sm", color: "#334155", wrap: true },
              { type: "text", text: "• 選擇是否願意關心別人", size: "sm", color: "#334155", wrap: true },
              { type: "text", text: "• 選擇是否希望被關懷", size: "sm", color: "#334155", wrap: true },
              { type: "text", text: "• 可加入聊天配對", size: "sm", color: "#334155", wrap: true },
            ],
          },
        ],
      },
      styles: {
        body: {
          backgroundColor: "#ecfeff",
        },
      },
    },
  };
}

function buildM04OverviewFlex(previews: Array<{ label: string; title: string }>) {
  return {
    type: "flex",
    altText: "最新活動與政策",
    contents: {
      type: "carousel",
      contents: previews.map((preview, index) => ({
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            { type: "text", text: preview.label, weight: "bold", size: "xl", color: "#111827" },
            { type: "text", text: preview.title, size: "sm", color: "#374151", wrap: true },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: index === 0 ? "primary" : "secondary",
              color: "#d97706",
              action: {
                type: "postback",
                label: `看${preview.label}`,
                data: `module=m04&action=category&category=${index === 0 ? "policy" : index === 1 ? "neighborhood" : index === 2 ? "temple" : "community"}`,
                displayText: `看${preview.label}`,
              },
            },
          ],
        },
        styles: {
          body: { backgroundColor: "#fffbeb" },
          footer: { backgroundColor: "#fff7ed" },
        },
      })),
    },
  };
}

function m03QuestionMessage(sessionId: string, step: "waiting_for_reminder" | "waiting_for_ambassador" | "waiting_for_care" | "waiting_for_chat") {
  const config = {
    waiting_for_reminder: "如果今天還沒寫日記，晚上提醒你一下，可以嗎？",
    waiting_for_ambassador: "你願意擔任關懷大使，偶爾關心別人嗎？",
    waiting_for_care: "如果一陣子沒出現，你希望有人先關心你一下嗎？",
    waiting_for_chat: "你願意參加好友配對，之後再安排聊天嗎？",
  } as const;

  const setting = {
    waiting_for_reminder: "reminder",
    waiting_for_ambassador: "ambassador",
    waiting_for_care: "care",
    waiting_for_chat: "chat",
  } as const;

  return {
    type: "text",
    text: config[step],
    quickReply: buildYesNoQuickReply(sessionId, setting[step]),
  };
}

function m04CategoryLabel(category: string) {
  switch (category) {
    case "policy":
      return "政策";
    case "neighborhood":
      return "鄰里活動";
    case "temple":
      return "宮廟活動";
    case "community":
      return "社區資訊";
    default:
      return "最新資訊";
  }
}

function buildM04QuickReply() {
  return buildFourButtonQuickReply([
    { label: "看政策", data: "module=m04&action=category&category=policy", displayText: "看政策" },
    { label: "看鄰里", data: "module=m04&action=category&category=neighborhood", displayText: "看鄰里活動" },
    { label: "看宮廟", data: "module=m04&action=category&category=temple", displayText: "看宮廟活動" },
    { label: "看社區", data: "module=m04&action=category&category=community", displayText: "看社區資訊" },
  ]);
}

function buildM04ListText(category: string, rows: Awaited<ReturnType<typeof listCommunityInfo>>) {
  const lines = rows.slice(0, 5).map((row, index) => {
    const dateText = row.event_date ? `｜${row.event_date}` : "";
    const locationText = row.location ? `｜${row.location}` : "";
    return `${index + 1}. ${row.title}${dateText}${locationText}\n${row.description}${row.contact ? `\n聯絡：${row.contact}` : ""}`;
  });

  return `${m04CategoryLabel(category)}\n${lines.length ? lines.join("\n\n") : "目前還沒有上架中的資訊。之後再來看看，我們會持續補上。"}\n\n你也可以再點一次下方按鈕看其他分類。`;
}

async function ensureParticipantSeed(lineUserId: string) {
  const participant = await getParticipant(lineUserId);
  if (participant) return participant;
  return upsertParticipant(lineUserId, {
    display_name: lineUserId,
    age_band: "",
    district: "",
    wants_partner: false,
    wants_reminders: false,
    wants_to_help_others: false,
    wants_to_be_cared_for: false,
    wants_chat_matching: false,
  });
}

async function buildSeriesRecommendations(lineUserId: string, date: string, series: string) {
  const recentShown = new Set(await getRecentShownCardIds(lineUserId));
  const cards = (await listCards())
    .filter((card) => card.status === "active" && Boolean(card.imageUrl))
    .filter((card) => card.visualSeries === series)
    .sort((left, right) => {
      const leftSeen = recentShown.has(left.id) ? 1 : 0;
      const rightSeen = recentShown.has(right.id) ? 1 : 0;
      if (leftSeen !== rightSeen) return leftSeen - rightSeen;
      return Math.random() - 0.5;
    })
    .slice(0, 3);

  const rows = cards.map((card, index) => ({
    id: `${lineUserId}-${date}-${index + 1}`,
    participant_id: lineUserId,
    recommendation_date: date,
    card_id: card.id,
    rank_order: index + 1,
    strategy_type: "series_random",
    score_total: 1,
    reason_text: `來自 ${series}`,
  }));

  if (rows.length > 0) {
    await saveDailyRecommendations(rows);
  }

  return cards;
}

async function ensureM03RemoteReady() {
  return hasRequiredTables(["participants", "partner_links", "care_events"]);
}

function summarizeM03Links(links: Awaited<ReturnType<typeof listPartnerLinks>>) {
  const careLink = links.find((row) => row.link_type === "care_pair" && row.status !== "closed") ?? null;
  const chatLink = links.find((row) => row.link_type === "chat_pair" && row.status !== "closed") ?? null;
  return [
    `關懷夥伴：${careLink ? `${careLink.status}${careLink.partner_participant_id && careLink.partner_participant_id !== "care-pool" ? `（${careLink.partner_participant_id}）` : ""}` : "未開啟"}`,
    `聊天夥伴：${chatLink ? `${chatLink.status}${chatLink.partner_participant_id && chatLink.partner_participant_id !== "chat-pool" ? `（${chatLink.partner_participant_id}）` : ""}` : "未開啟"}`,
  ];
}

async function handleEggProgress(replyToken: string, lineUserId: string) {
  const today = getTodayInTaipei();
  const progress = await getEggProgress(lineUserId, today);
  await replyToLine(replyToken, [
    {
      type: "text",
      text: progress
        ? `我的雞蛋進度\n今天是否完成：${(await hasCompletedToday(lineUserId, today)) ? "已完成" : "尚未完成"}\n${summarizeEggProgress(progress.days_completed, progress.egg_box_eligible)}`
        : "目前還沒有兩週進度資料，今天先寫一句吧。",
    },
  ]);
}

async function handleM01Start(request: NextRequest, replyToken: string, lineUserId: string, forceRefresh = false) {
  traceLineWebhook("handler.selected", { handler: "handleM01Start", lineUserId, forceRefresh });
  const today = getTodayInTaipei();
  await ensureParticipantSeed(lineUserId);
  const existingMood = await getUserDailyMood(lineUserId, today);
  const existingCheckin = await getUserDailyCheckin(lineUserId, today);
  const seasonKey = getSeasonKey(today);
  const seasonClaim = (await listUserDailyCheckins(lineUserId)).find((row) => row.claim_season === seasonKey && row.claimed_today);

  if (await hasCompletedM01Today(lineUserId, today)) {
    await replyToLine(replyToken, [{ type: "text", text: `今天已完成長輩圖打卡。\n今日心情：${existingMood?.mood || "已選擇"}\n今日領取：${existingCheckin?.claimed_today ? "已領取" : "未領取"}` }]);
    return;
  }

  if (seasonClaim) {
    await replyToLine(replyToken, [{ type: "text", text: `你這一季已經完成過長輩圖領取，會在 ${seasonKey} 這一季保留這次紀錄。今天仍可查看其他模組。` }]);
    return;
  }

  const sessionId = createM01SessionId(lineUserId);
  await updateSession(lineUserId, {
    session_id: sessionId,
    step: existingMood ? "waiting_for_series" : "waiting_for_mood",
    mood_today: existingMood?.mood || "",
    visual_series_preference: "",
    recommended_card_ids: [],
    selected_card_id: "",
    completed_date: "",
  });

  await replyToLine(replyToken, existingMood
    ? [
        {
          type: "text",
          text: `今天的心情已記錄為「${existingMood.mood}」。接著選一個你今天想看的系列。`,
          quickReply: buildM01SeriesQuickReply(),
        },
      ]
    : [
        {
          type: "text",
          text: "先選今天的心情，接著我會請你選長輩圖系列。",
          quickReply: buildM01MoodQuickReply(),
        },
      ]);
  void request;
}

async function handleM01MoodChoice(replyToken: string, lineUserId: string, payload: ParsedPostback) {
  const today = getTodayInTaipei();
  const selectedMood = payload.mood;
  const session = await updateSession(lineUserId, {
    session_id: (await getSession(lineUserId))?.session_id || createM01SessionId(lineUserId),
    step: "waiting_for_series",
    mood_today: selectedMood,
  });
  await upsertUserDailyMood({
    participant_id: lineUserId,
    selected_date: today,
    mood: selectedMood,
    created_at: new Date().toISOString(),
  });
  await replyToLine(replyToken, [
    {
      type: "text",
      text: `今天心情記下來了：${selectedMood}\n再選一個想看的長輩圖系列。`,
      quickReply: buildM01SeriesQuickReply(),
    },
  ]);
  void session;
}

async function handleM01SeriesChoice(replyToken: string, lineUserId: string, payload: ParsedPostback) {
  const today = getTodayInTaipei();
  const series = payload.series;
  const session = await getSession(lineUserId);
  const sessionId = session?.session_id || createM01SessionId(lineUserId);
  const cards = await buildSeriesRecommendations(lineUserId, today, series);
  const now = new Date().toISOString();

  await updateSession(lineUserId, {
    session_id: sessionId,
    step: "waiting_for_card_selection",
    visual_series_preference: series,
    recommended_card_ids: cards.map((card) => card.id),
  });

  for (const card of cards) {
    await recordCardInteraction({
      id: `ci-${lineUserId}-${today}-${card.id}-view`,
      participant_id: lineUserId,
      card_id: card.id,
      interaction_date: today,
      action_type: "view",
      selected_as_main: false,
      diary_written: false,
      created_at: now,
    });
    await recordCardFeedback({
      line_user_id: lineUserId,
      session_id: sessionId,
      card_id: card.id,
      event_type: "shown",
      event_time: now,
      mood_today: session?.mood_today,
      visual_series_preference: series,
    });
  }

  if (cards.length === 0) {
    await replyToLine(replyToken, [{ type: "text", text: `${series}目前沒有已上架圖卡，請先到 /cards 上架這個系列的 Cloudinary 圖卡。` }]);
    return;
  }

  await replyToLine(replyToken, [
    { type: "text", text: `以下是今天的 ${series} 三張圖，選一張做今天的主圖。` },
    buildM01Carousel(sessionId, cards),
  ]);
}

async function handleM01Select(request: NextRequest, replyToken: string, lineUserId: string, payload: ParsedPostback) {
  const today = getTodayInTaipei();
  const session = await getSession(lineUserId);
  const effectiveSessionId = payload.sessionId || session?.session_id || createM01SessionId(lineUserId);

  if (await hasCompletedM01Today(lineUserId, today)) {
    await replyToLine(replyToken, [{ type: "text", text: "今天已經選過主圖了，明天再來挑新的。" }]);
    return;
  }

  const card = (await listCards()).find((item) => item.id === payload.cardId);
  if (!card) {
    await replyToLine(replyToken, [unknownMessage()]);
    return;
  }

  const now = new Date().toISOString();
  await upsertUserDailyCheckin({
    participant_id: lineUserId,
    selected_date: today,
    claimed_today: true,
    claim_season: getSeasonKey(today),
    created_at: now,
    updated_at: now,
  });
  await updateSession(lineUserId, {
    session_id: effectiveSessionId,
    step: "completed",
    selected_card_id: card.id,
    completed_date: today,
  });
  await recordCardInteraction({
    id: `ci-${lineUserId}-${today}-${card.id}-select`,
    participant_id: lineUserId,
    card_id: card.id,
    interaction_date: today,
    action_type: "select",
    selected_as_main: true,
    diary_written: false,
    created_at: now,
  });
  await recordCardFeedback({
    line_user_id: lineUserId,
    session_id: effectiveSessionId,
    card_id: card.id,
    event_type: "selected",
    event_time: now,
  });
  await upsertGuidedDiaryPrompt({
    id: `${lineUserId}-${today}`,
    participant_id: lineUserId,
    prompt_date: today,
    main_card_id: card.id,
    prompt_text: card.prompt,
    status: "ready",
  });
  markM01Completed(lineUserId, today);

  await replyToLine(replyToken, [
    {
      type: "image",
      originalContentUrl: card.imageUrl,
      previewImageUrl: card.imageUrl,
    },
    {
      type: "text",
      text: `${card.title}\n今天的主圖已選定，已完成本季本日打卡領取。`,
    },
  ]);
  void request;
}

async function handleM01Favorite(replyToken: string, lineUserId: string, payload: ParsedPostback) {
  const today = getTodayInTaipei();
  const card = (await listCards()).find((item) => item.id === payload.cardId);
  if (!card) {
    await replyToLine(replyToken, [unknownMessage()]);
    return;
  }

  await recordCardInteraction({
    id: `ci-${lineUserId}-${today}-${card.id}-favorite`,
    participant_id: lineUserId,
    card_id: card.id,
    interaction_date: today,
    action_type: "favorite",
    selected_as_main: false,
    diary_written: false,
    created_at: new Date().toISOString(),
  });

  await replyToLine(replyToken, [{ type: "text", text: `已先幫你記下這張「${card.title}」。如果喜歡，也可以把它選成今天的主圖。` }]);
}

async function handleM02Start(replyToken: string, lineUserId: string) {
  traceLineWebhook("handler.selected", { handler: "handleM02Start", lineUserId });
  const today = getTodayInTaipei();
  const prompt = await getGuidedDiaryPrompt(lineUserId, today);
  const totalEntries = (await listDiaryEntries(lineUserId)).length;

  if (totalEntries >= MAX_M02_ENTRIES_PER_USER) {
    await replyToLine(replyToken, [{ type: "text", text: "這個帳號的日記紀錄已達 10 次上限，先保留目前內容，不再新增新對話。" }]);
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

  await replyToLine(replyToken, [
    {
      type: "text",
      text: `${prompt?.prompt_text ?? "今天想記下一件什麼小事？"}\n直接在對話框輸入 ${MIN_DIARY_CJK} 個中文字以上就會自動存成日記。`,
    },
  ]);
}

async function handleM02DiaryInput(replyToken: string, lineUserId: string, rawText: string) {
  traceLineWebhook("handler.selected", { handler: "handleM02DiaryInput", lineUserId });
  const existingSession = await getM02Session(lineUserId);
  const session =
    existingSession?.status === "waiting_for_diary"
      ? existingSession
      : await updateM02Session(lineUserId, {
          session_id: createM02SessionId(lineUserId),
          status: "waiting_for_diary",
          started_at: new Date().toISOString(),
        });

  const today = getTodayInTaipei();
  const totalEntries = (await listDiaryEntries(lineUserId)).length;
  if (totalEntries >= MAX_M02_ENTRIES_PER_USER) {
    await replyToLine(replyToken, [{ type: "text", text: "這個帳號的日記紀錄已達 10 次上限，今天先不再新增。" }]);
    return;
  }
  const content = extractDiaryContent(rawText);
  const cjkLength = countCjkCharacters(content);
  if (!content || cjkLength < MIN_DIARY_CJK) {
    await recordM02RewardEvent({
      line_user_id: lineUserId,
      session_id: session.session_id,
      event_type: "too_short",
      event_time: new Date().toISOString(),
    });
    await replyToLine(replyToken, [{ type: "text", text: `要寫滿 ${MIN_DIARY_CJK} 個中文字，才會被系統判定為日記，不然系統無法回應訊息。` }]);
    return;
  }

  const selectedCardId = (await getSession(lineUserId))?.selected_card_id ?? "";
  const now = new Date().toISOString();
  const entryIndex = totalEntries + 1;

  await createDiaryEntry({
    line_user_id: lineUserId,
    session_id: session.session_id,
    diary_text: content,
    diary_date: today,
    linked_card_id: selectedCardId,
    completed: true,
    completed_at: now,
    created_at: now,
  });

  await upsertDiaryEntry({
    id: `${lineUserId}-${today}-${Date.now()}`,
    participant_id: lineUserId,
    entry_date: today,
    entry_text: content,
    entry_index: entryIndex,
    linked_card_id: selectedCardId,
    ...normalizeDiaryAnalysis({ analysis_status: "pending" }),
    created_at: now,
  });

  if (selectedCardId) {
    await recordCardInteraction({
      id: `ci-${lineUserId}-${today}-${selectedCardId}-diary`,
      participant_id: lineUserId,
      card_id: selectedCardId,
      interaction_date: today,
      action_type: "diary_written",
      selected_as_main: false,
      diary_written: true,
      created_at: now,
    });
  }

  markM02Completed(lineUserId, today);
  await updateM02Session(lineUserId, { status: "completed" });
  await recordM02RewardEvent({
    line_user_id: lineUserId,
    session_id: session.session_id,
    event_type: "completed",
    event_time: now,
  });

  const progress = await recalculateEggProgress(lineUserId, today);
  await runQueueDetection(today);

  await replyToLine(replyToken, [
    {
      type: "text",
      text: `已收到今天的日記。\n今天已完成。\n${summarizeEggProgress(progress.days_completed, progress.egg_box_eligible)}`,
    },
  ]);
}

async function handleM03Start(request: NextRequest, replyToken: string, lineUserId: string) {
  traceLineWebhook("handler.selected", { handler: "handleM03Start", lineUserId });
  if (!(await ensureM03RemoteReady())) {
    await replyToLine(replyToken, [
      buildM03IntroFlex("服務還在整理中，正式上線前先用這個模板說明內容。"),
      { type: "text", text: "關懷與配對服務正在整理中，等一下再試試看。現在資料不會先存到暫存區，避免之後對不起來。" },
    ]);
    return;
  }

  const participant = await ensureParticipantSeed(lineUserId);
  const links = await listPartnerLinks(lineUserId, { allowFallback: false });
  const linkSummary = summarizeM03Links(links);

  if (participant.m03_completed_at) {
    const recentEvents = await listCareEvents(lineUserId, { allowFallback: false });
    const latestEventText = recentEvents[0] ? `\n最近互動：${recentEvents[0].event_type}` : "";
    await replyToLine(replyToken, [
      {
        type: "text",
        text: buildM03SummaryText(
          participant.display_name || lineUserId,
          {
            wantsReminders: participant.wants_reminders,
            wantsToHelpOthers: participant.wants_to_help_others,
            wantsToBeCaredFor: participant.wants_to_be_cared_for,
            wantsChatMatching: participant.wants_chat_matching,
          },
          linkSummary,
        ) + latestEventText,
        quickReply: buildM03ActionQuickReply(),
      },
    ]);
    return;
  }

  await updateM03Session(lineUserId, {
    session_id: createM03SessionId(lineUserId),
    step: "waiting_for_name",
    display_name: participant.display_name === lineUserId ? "" : participant.display_name,
    reminder_opt_in: participant.wants_reminders ? "yes" : "",
    care_ambassador_opt_in: participant.wants_to_help_others ? "yes" : "",
    wants_care: participant.wants_to_be_cared_for ? "yes" : "",
    chat_match_opt_in: participant.wants_chat_matching ? "yes" : "",
  });

  await replyToLine(replyToken, [
    buildM03IntroFlex("可以先從稱呼、提醒與配對偏好開始設定。"),
    { type: "text", text: "關懷與配對\n先告訴我，想怎麼稱呼你？直接回覆名字或暱稱就可以。" },
  ]);
  void request;
}

async function handleM03NameInput(request: NextRequest, replyToken: string, lineUserId: string, text: string) {
  traceLineWebhook("handler.selected", { handler: "handleM03NameInput", lineUserId });
  const nextSession = await updateM03Session(lineUserId, {
    step: "waiting_for_reminder",
    display_name: text.trim(),
  });
  await replyToLine(replyToken, [m03QuestionMessage(nextSession.session_id, "waiting_for_reminder")]);
  void request;
}

async function handleM03SettingChoice(replyToken: string, lineUserId: string, payload: ParsedPostback) {
  traceLineWebhook("handler.selected", { handler: "handleM03SettingChoice", lineUserId, setting: payload.setting, value: payload.value });
  const session = (await getM03Session(lineUserId)) ?? (await updateM03Session(lineUserId, { session_id: payload.sessionId || createM03SessionId(lineUserId), step: "waiting_for_reminder" }));
  const value = payload.value === "yes" ? "yes" : "no";

  if (payload.setting === "reminder") {
    const next = await updateM03Session(lineUserId, {
      session_id: session.session_id,
      reminder_opt_in: value,
      step: "waiting_for_ambassador",
    });
    await replyToLine(replyToken, [m03QuestionMessage(next.session_id, "waiting_for_ambassador")]);
    return;
  }

  if (payload.setting === "ambassador") {
    const next = await updateM03Session(lineUserId, {
      session_id: session.session_id,
      care_ambassador_opt_in: value,
      step: "waiting_for_care",
    });
    await replyToLine(replyToken, [m03QuestionMessage(next.session_id, "waiting_for_care")]);
    return;
  }

  if (payload.setting === "care") {
    const next = await updateM03Session(lineUserId, {
      session_id: session.session_id,
      wants_care: value,
      step: "waiting_for_chat",
    });
    await replyToLine(replyToken, [m03QuestionMessage(next.session_id, "waiting_for_chat")]);
    return;
  }

  const finalSession = await updateM03Session(lineUserId, {
    session_id: session.session_id,
    chat_match_opt_in: value,
    step: "idle",
  });
  const reminderOptIn = finalSession.reminder_opt_in === "yes";
  const ambassadorOptIn = finalSession.care_ambassador_opt_in === "yes";
  const wantsCare = finalSession.wants_care === "yes";
  const chatMatchOptIn = finalSession.chat_match_opt_in === "yes";
  const now = new Date().toISOString();

  const participant = await upsertParticipant(
    lineUserId,
    {
      display_name: finalSession.display_name || lineUserId,
      wants_reminders: reminderOptIn,
      wants_to_help_others: ambassadorOptIn,
      wants_to_be_cared_for: wantsCare,
      wants_chat_matching: chatMatchOptIn,
      is_little_angel: ambassadorOptIn,
      is_little_owner: wantsCare,
      m03_completed_at: now,
    },
    { allowFallback: false },
  );

  await syncM03Pairs(lineUserId, { allowFallback: false });
  const linkSummary = summarizeM03Links(await listPartnerLinks(lineUserId, { allowFallback: false }));

  await replyToLine(replyToken, [
    {
      type: "text",
      text: buildM03SummaryText(
        participant.display_name || lineUserId,
        {
          wantsReminders: reminderOptIn,
          wantsToHelpOthers: ambassadorOptIn,
          wantsToBeCaredFor: wantsCare,
          wantsChatMatching: chatMatchOptIn,
        },
        linkSummary,
      ),
      quickReply: buildM03ActionQuickReply(),
    },
  ]);
}

async function handleM03CareEvent(replyToken: string, lineUserId: string, payload: ParsedPostback) {
  traceLineWebhook("handler.selected", { handler: "handleM03CareEvent", lineUserId, intent: payload.intent });
  if (!(await ensureM03RemoteReady())) {
    await replyToLine(replyToken, [{ type: "text", text: "關懷與配對服務還沒完成正式設定，所以今天先不幫你留下這筆互動。稍後再試試看。" }]);
    return;
  }

  const intent = payload.intent;
  if (!["send_greeting", "request_care", "willing_to_call"].includes(intent)) {
    await replyToLine(replyToken, [unknownMessage()]);
    return;
  }

  const links = await listPartnerLinks(lineUserId, { allowFallback: false });
  const careLink = links.find((row) => row.link_type === "care_pair" && row.status !== "closed") ?? null;
  const targetParticipantId = careLink?.partner_participant_id ?? "care-pool";
  const note =
    intent === "send_greeting"
      ? "送出今天的問候"
      : intent === "request_care"
        ? "今天想找人聊聊"
        : "今天願意打電話關心人";

  await recordCareEvent(
    {
      event_id: `care-event-${lineUserId}-${Date.now()}`,
      participant_id: lineUserId,
      target_participant_id: targetParticipantId,
      event_type: intent as "send_greeting" | "request_care" | "willing_to_call",
      note,
      created_at: new Date().toISOString(),
    },
    { allowFallback: false },
  );

  await replyToLine(replyToken, [{ type: "text", text: `${note}，已經替你記下來了。` }]);
}

async function handleM04Start(replyToken: string, lineUserId: string, category = "") {
  traceLineWebhook("handler.selected", { handler: "handleM04Start", category, lineUserId });
  const participant = await ensureParticipantSeed(lineUserId);
  if (!participant.district) {
    await replyToLine(replyToken, [{ type: "text", text: "最新活動與政策需要先設定行政區。請先到 M03 或後台補上行政區後再查看。" }]);
    return;
  }
  if (category) {
    const rows = await listCommunityInfo({ category, status: "active", district: participant.district });
    await replyToLine(replyToken, [
      buildM04CategoryCarousel(category, rows),
      { type: "text", text: buildM04ListText(category, rows), quickReply: buildM04QuickReply() },
    ]);
    return;
  }

  const categories = ["policy", "neighborhood", "temple", "community"];
  const segments = await Promise.all(categories.map(async (item) => ({ category: item, rows: await listCommunityInfo({ category: item, status: "active", district: participant.district }) })));
  const text = [
    `最新活動與政策｜${participant.district}`,
    ...segments.map((segment) => `${m04CategoryLabel(segment.category)}：${segment.rows[0]?.title ?? "目前還沒有上架中的資訊"}`),
    "",
    "想看哪一類，可以點下方按鈕。",
  ].join("\n");
  await replyToLine(replyToken, [
    buildM04OverviewFlex(
      segments.map((segment) => ({
        label: m04CategoryLabel(segment.category),
        title: segment.rows[0]?.title ?? "目前還沒有上架中的資訊",
      })),
    ),
    { type: "text", text, quickReply: buildM04QuickReply() },
  ]);
}

async function handlePostback(request: NextRequest, replyToken: string, lineUserId: string, payload: ParsedPostback) {
  traceLineWebhook("postback.received", {
    lineUserId,
    module: payload.module,
    action: payload.action,
    category: payload.category,
    intent: payload.intent,
    setting: payload.setting,
    value: payload.value,
  });
  if (payload.module === "m01" && payload.action === "start") {
    await handleM01Start(request, replyToken, lineUserId);
    return;
  }
  if (payload.module === "m01" && payload.action === "choose_mood") {
    await handleM01MoodChoice(replyToken, lineUserId, payload);
    return;
  }
  if (payload.module === "m01" && payload.action === "choose_series") {
    await handleM01SeriesChoice(replyToken, lineUserId, payload);
    return;
  }
  if (payload.module === "m01" && payload.action === "refresh") {
    await handleM01Start(request, replyToken, lineUserId, true);
    return;
  }
  if (payload.module === "m01" && payload.action === "select") {
    await handleM01Select(request, replyToken, lineUserId, payload);
    return;
  }
  if (payload.module === "m01" && payload.action === "favorite") {
    await handleM01Favorite(replyToken, lineUserId, payload);
    return;
  }
  if (payload.module === "m02" && payload.action === "start") {
    await handleM02Start(replyToken, lineUserId);
    return;
  }
  if (payload.module === "egg") {
    await handleEggProgress(replyToken, lineUserId);
    return;
  }
  if (payload.module === "m03" && payload.action === "start") {
    await handleM03Start(request, replyToken, lineUserId);
    return;
  }
  if (payload.module === "m03" && payload.action === "restart") {
    await updateM03Session(lineUserId, {
      session_id: createM03SessionId(lineUserId),
      step: "waiting_for_name",
      display_name: "",
      reminder_opt_in: "",
      care_ambassador_opt_in: "",
      wants_care: "",
      chat_match_opt_in: "",
    });
    await replyToLine(replyToken, [{ type: "text", text: "我們重新來一次。想怎麼稱呼你呢？直接回覆名字或暱稱就可以。" }]);
    return;
  }
  if (payload.module === "m03" && payload.action === "set_option") {
    await handleM03SettingChoice(replyToken, lineUserId, payload);
    return;
  }
  if (payload.module === "m03" && payload.action === "care_event") {
    await handleM03CareEvent(replyToken, lineUserId, payload);
    return;
  }
  if (payload.module === "m04" && payload.action === "start") {
    await handleM04Start(replyToken, lineUserId);
    return;
  }
  if (payload.module === "m04" && payload.action === "category") {
    await handleM04Start(replyToken, lineUserId, payload.category);
    return;
  }

  await replyToLine(replyToken, [unknownMessage()]);
}

async function handleTextMessage(request: NextRequest, event: Extract<LineEvent, { type: "message" }>, lineUserId: string) {
  const text = event.message.text.trim();
  const lowerText = text.toLowerCase();
  const [m01Session, m02Session, m03Session] = await Promise.all([getSession(lineUserId), getM02Session(lineUserId), getM03Session(lineUserId)]);

  traceLineWebhook("message.received", {
    lineUserId,
    text,
    m01SessionId: m01Session?.session_id ?? null,
    m01CompletedDate: m01Session?.completed_date ?? null,
    m02Status: m02Session?.status ?? null,
    m03Step: m03Session?.step ?? null,
  });

  if (M01_TEXT_TRIGGERS.has(text) || M01_TEXT_TRIGGERS.has(lowerText)) {
    await handleM01Start(request, event.replyToken, lineUserId);
    return;
  }
  if (M02_TEXT_TRIGGERS.has(text) || M02_TEXT_TRIGGERS.has(lowerText)) {
    await handleM02Start(event.replyToken, lineUserId);
    return;
  }
  if (M03_TEXT_TRIGGERS.has(text) || M03_TEXT_TRIGGERS.has(lowerText)) {
    await handleM03Start(request, event.replyToken, lineUserId);
    return;
  }
  if (M04_TEXT_TRIGGERS.has(text) || M04_TEXT_TRIGGERS.has(lowerText)) {
    await handleM04Start(event.replyToken, lineUserId);
    return;
  }
  if (EGG_TEXT_TRIGGERS.has(text) || EGG_TEXT_TRIGGERS.has(lowerText)) {
    await handleEggProgress(event.replyToken, lineUserId);
    return;
  }

  if (m03Session?.step === "waiting_for_name") {
    await handleM03NameInput(request, event.replyToken, lineUserId, text);
    return;
  }

  if (m02Session?.status === "waiting_for_diary") {
    await handleM02DiaryInput(event.replyToken, lineUserId, text);
    return;
  }

  if (countCjkCharacters(extractDiaryContent(text)) >= MIN_DIARY_CJK) {
    await handleM02DiaryInput(event.replyToken, lineUserId, text);
    return;
  }

  await replyToLine(event.replyToken, [unknownMessage()]);
}

async function handleEvent(request: NextRequest, event: LineEvent) {
  if (!("replyToken" in event) || !event.replyToken) return;

  const lineUserId = event.source?.userId ?? "anonymous_user";
  traceLineWebhook("event.received", {
    eventType: event.type,
    lineUserId,
    hasMessage: "message" in event,
    hasPostback: "postback" in event,
  });

  if (event.type === "follow") {
    await ensureParticipantSeed(lineUserId);
    await replyToLine(event.replyToken, [{ type: "text", text: "歡迎來到 Jenny。今天想看長輩圖、寫一句心情、設定關懷與配對，或看看最新活動與政策，都可以從下方選單開始。" }]);
    return;
  }

  if (event.type === "postback") {
    await handlePostback(request, event.replyToken, lineUserId, parsePostback(event.postback.data));
    return;
  }

  if (event.type === "message" && event.message.type === "text") {
    await handleTextMessage(request, event, lineUserId);
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/line/webhook",
    modules: ["m01", "m02", "m03", "m04", "egg"],
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!secret || !token) {
    return NextResponse.json({ ok: false, error: "Missing LINE credentials" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let body: { events?: LineEvent[] } = {};
  try {
    body = JSON.parse(rawBody) as { events?: LineEvent[] };
  } catch {
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
