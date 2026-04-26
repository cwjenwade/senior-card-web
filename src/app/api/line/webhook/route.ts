import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  getCardPreference,
  getDailyRecommendations,
  getDiaryEntryForDate,
  getEggProgress,
  getGuidedDiaryPrompt,
  getParticipant,
  listCardInteractions,
  normalizeDiaryAnalysis,
  recalculateEggProgress,
  recordCardInteraction,
  runQueueDetection,
  saveDailyRecommendations,
  upsertCardPreference,
  upsertDiaryEntry,
  upsertGuidedDiaryPrompt,
  upsertParticipant,
  upsertPartnerLink,
} from "@/lib/jenny-product-store";
import { listCards, type CardAsset } from "@/lib/m01-cards";
import { getRecentShownCardIds, getSession, hasCompletedM01Today, markM01Completed, recordCardFeedback, updateSession } from "@/lib/m01-session-store";
import { getM03Session, updateM03Session } from "@/lib/m03-session-store";
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

type ParsedPostback = {
  module: string;
  action: string;
  sessionId: string;
  cardId: string;
  partnerChoice: string;
};

const M01_TEXT_TRIGGERS = new Set(["製作長輩圖", "長輩圖", "今日長輩圖", "m01"]);
const M02_TEXT_TRIGGERS = new Set(["寫日記換雞蛋", "寫日記", "看圖寫一句", "今日日記", "m02"]);
const M03_TEXT_TRIGGERS = new Set(["我的小檔案", "小檔案", "我的簡單設定", "m03"]);
const EGG_TEXT_TRIGGERS = new Set(["我的雞蛋進度", "雞蛋進度", "egg"]);
const MIN_DIARY_CJK = 20;
const MAX_DIARY_CJK = 300;

function parsePostback(data: string): ParsedPostback {
  const params = new URLSearchParams(data);
  return {
    module: params.get("module") ?? "",
    action: params.get("action") ?? "",
    sessionId: params.get("session_id") ?? "",
    cardId: params.get("card_id") ?? "",
    partnerChoice: params.get("partner") ?? "",
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

  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ replyToken, messages }),
  });

  if (!response.ok) {
    throw new Error(`LINE reply failed: ${response.status} ${await response.text()}`);
  }
}

function unknownMessage() {
  return { type: "text", text: "請從下方選單選擇服務。" };
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
          ],
        },
      })),
    },
  };
}

function buildM03LikeCarousel(sessionId: string, cards: CardAsset[]) {
  return {
    type: "flex",
    altText: "選三張喜歡的圖",
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
            { type: "text", text: card.title, weight: "bold", size: "lg", wrap: true },
            { type: "text", text: `${card.textType} / ${card.visualSeries}`, size: "sm", color: "#475569", wrap: true },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "secondary",
              action: {
                type: "postback",
                label: "喜歡這張",
                data: `module=m03&action=like_card&session_id=${encodeURIComponent(sessionId)}&card_id=${encodeURIComponent(card.id)}`,
                displayText: `喜歡這張 ${card.title}`,
              },
            },
          ],
        },
      })),
    },
  };
}

function partnerChoiceMessage(sessionId: string) {
  return {
    type: "text",
    text: "如果之後比較久沒出現，願意有固定關懷夥伴先提醒一下嗎？",
    quickReply: buildFourButtonQuickReply([
      { label: "願意", data: `module=m03&action=set_partner&session_id=${encodeURIComponent(sessionId)}&partner=yes`, displayText: "願意" },
      { label: "先不要", data: `module=m03&action=set_partner&session_id=${encodeURIComponent(sessionId)}&partner=no`, displayText: "先不要" },
    ]),
  };
}

function summarizeEggProgress(daysCompleted: number, eligible: boolean) {
  return `兩週內已完成 ${daysCompleted} / 10 天。\n${eligible ? "已達成雞蛋資格。" : "再持續寫幾天就能達成。"} `;
}

function preferenceSummaryText(displayName: string, preferredStyleMain: string, preferredImagery: string, wantsPartner: boolean) {
  return `小檔案摘要\n稱呼：${displayName}\n喜歡的風格：${preferredStyleMain || "尚未設定"} / ${preferredImagery || "尚未設定"}\n固定關懷夥伴：${wantsPartner ? "願意" : "先不要"}`;
}

function derivePreference(cards: CardAsset[]) {
  const count = (values: string[]) =>
    [...new Set(values)].sort((left, right) => values.filter((value) => value === right).length - values.filter((value) => value === left).length)[0] ?? "";
  return {
    preferred_style_main: count(cards.map((card) => card.textType)),
    preferred_tone: count(cards.map((card) => card.tone)),
    preferred_imagery: count(cards.map((card) => card.visualSeries)),
    profile_confidence: cards.length / 3,
  };
}

async function buildTodayRecommendations(lineUserId: string, date: string, forceRefresh = false) {
  const existing = await getDailyRecommendations(lineUserId, date);
  if (!forceRefresh && existing.length >= 3) {
    const cards = await listCards();
    return existing
      .map((row) => cards.find((card) => card.id === row.card_id))
      .filter(Boolean) as CardAsset[];
  }

  const cards = (await listCards()).filter((card) => card.status === "active" && Boolean(card.imageUrl));
  const preference = await getCardPreference(lineUserId);
  const recentShown = new Set(await getRecentShownCardIds(lineUserId));
  const scored = cards
    .map((card) => {
      let score = 1;
      const reasons: string[] = [];
      if (preference?.preferred_style_main && card.textType === preference.preferred_style_main) {
        score += 3;
        reasons.push("符合文字風格");
      }
      if (preference?.preferred_imagery && card.visualSeries === preference.preferred_imagery) {
        score += 3;
        reasons.push("符合喜歡圖風");
      }
      if (preference?.preferred_tone && card.tone === preference.preferred_tone) {
        score += 2;
        reasons.push("符合情緒調性");
      }
      if (card.religiousContent === "none") {
        score += 1;
      }
      if (recentShown.has(card.id)) {
        score -= 2;
        reasons.push("近期看過");
      }
      return { card, score, reasonText: reasons.join("、") || "中性推薦" };
    })
    .sort((left, right) => right.score - left.score || left.card.id.localeCompare(right.card.id));

  const selected = scored.slice(0, 3);
  const rows = selected.map((item, index) => ({
    id: `${lineUserId}-${date}-${index + 1}`,
    participant_id: lineUserId,
    recommendation_date: date,
    card_id: item.card.id,
    rank_order: index + 1,
    strategy_type: preference ? "preference_rule" : "neutral_fallback",
    score_total: item.score,
    reason_text: item.reasonText,
  }));
  await saveDailyRecommendations(rows);
  return selected.map((item) => item.card);
}

async function ensureParticipantSeed(lineUserId: string) {
  const participant = await getParticipant(lineUserId);
  if (participant) return participant;
  return upsertParticipant(lineUserId, { display_name: lineUserId, age_band: "", wants_partner: false });
}

async function handleEggProgress(replyToken: string, lineUserId: string) {
  const today = getTodayInTaipei();
  const progress = await getEggProgress(lineUserId, today);
  await replyToLine(replyToken, [
    {
      type: "text",
      text: progress
        ? `我的雞蛋進度\n${summarizeEggProgress(progress.days_completed, progress.egg_box_eligible)}`
        : "目前還沒有兩週進度資料，今天先寫一句吧。",
    },
  ]);
}

async function handleM01Start(request: NextRequest, replyToken: string, lineUserId: string, forceRefresh = false) {
  const today = getTodayInTaipei();
  await ensureParticipantSeed(lineUserId);

  if (await hasCompletedM01Today(lineUserId, today)) {
    await replyToLine(replyToken, [{ type: "text", text: "今天已選好主圖。想寫一句的話，可以點「看圖寫一句」。" }]);
    return;
  }

  if (forceRefresh) {
    const refreshes = (await listCardInteractions(lineUserId)).filter((row) => row.interaction_date === today && row.action_type === "refresh").length;
    if (refreshes >= 1) {
      await replyToLine(replyToken, [{ type: "text", text: "今天已經換過一組推薦了，先從這三張挑一張吧。" }]);
      return;
    }
  }

  const sessionId = createM01SessionId(lineUserId);
  const cards = await buildTodayRecommendations(lineUserId, today, forceRefresh);
  const interactionTime = new Date().toISOString();
  await updateSession(lineUserId, {
    session_id: sessionId,
    recommended_card_ids: cards.map((card) => card.id),
    selected_card_id: "",
    completed_date: "",
    created_at: interactionTime,
  });

  if (forceRefresh) {
    await recordCardInteraction({
      id: `ci-${lineUserId}-${today}-refresh`,
      participant_id: lineUserId,
      card_id: "",
      interaction_date: today,
      action_type: "refresh",
      selected_as_main: false,
      diary_written: false,
      created_at: interactionTime,
    });
    await recordCardFeedback({
      line_user_id: lineUserId,
      session_id: sessionId,
      card_id: "",
      event_type: "refreshed",
      event_time: interactionTime,
    });
  }

  for (const card of cards) {
    await recordCardInteraction({
      id: `ci-${lineUserId}-${today}-${card.id}-view`,
      participant_id: lineUserId,
      card_id: card.id,
      interaction_date: today,
      action_type: "view",
      selected_as_main: false,
      diary_written: false,
      created_at: interactionTime,
    });
    await recordCardFeedback({
      line_user_id: lineUserId,
      session_id: sessionId,
      card_id: card.id,
      event_type: "shown",
      event_time: interactionTime,
    });
  }

  await replyToLine(replyToken, [
    { type: "text", text: "這是今天為你準備的三張長輩圖，選一張做今天的主圖吧。" },
    buildM01Carousel(sessionId, cards),
    {
      type: "text",
      text: "若今天想看另一組，可以換一次推薦。",
      quickReply: buildFourButtonQuickReply([
        { label: "換一組", data: "module=m01&action=refresh", displayText: "換一組" },
        { label: "看圖寫一句", data: "module=m02&action=start", displayText: "看圖寫一句" },
      ]),
    },
  ]);
  void request;
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
  await updateSession(lineUserId, {
    session_id: effectiveSessionId,
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
      text: `${card.title}\n今天的主圖已選定。\n接著可以點「看圖寫一句」，把今天的感受留下一句。`,
      quickReply: buildFourButtonQuickReply([
        { label: "看圖寫一句", data: "module=m02&action=start", displayText: "看圖寫一句" },
      ]),
    },
  ]);
  void request;
}

async function handleM02Start(replyToken: string, lineUserId: string) {
  const today = getTodayInTaipei();
  const prompt = await getGuidedDiaryPrompt(lineUserId, today);
  const progress = await getEggProgress(lineUserId, today);

  if (await hasCompletedToday(lineUserId, today)) {
    await recordM02RewardEvent({
      line_user_id: lineUserId,
      session_id: (await getM02Session(lineUserId))?.session_id ?? createM02SessionId(lineUserId),
      event_type: "duplicate_blocked",
      event_time: new Date().toISOString(),
    });
    await replyToLine(replyToken, [{ type: "text", text: `今天已完成日記。\n${progress ? summarizeEggProgress(progress.days_completed, progress.egg_box_eligible) : ""}` }]);
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
      text: `${prompt?.prompt_text ?? "今天想記下一件什麼小事？"}\n直接輸入一句就可以，至少 ${MIN_DIARY_CJK} 個中文字。`,
    },
  ]);
}

async function handleM02DiaryInput(replyToken: string, lineUserId: string, rawText: string) {
  const session = await getM02Session(lineUserId);
  if (session?.status !== "waiting_for_diary") {
    await replyToLine(replyToken, [unknownMessage()]);
    return;
  }

  const today = getTodayInTaipei();
  if ((await hasCompletedToday(lineUserId, today)) || (await getTodayEntry(lineUserId)) || (await getDiaryEntryForDate(lineUserId, today))) {
    await updateM02Session(lineUserId, { status: "completed" });
    await replyToLine(replyToken, [{ type: "text", text: "今天已經完成紀錄，不會重複計算雞蛋進度。" }]);
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
    await replyToLine(replyToken, [{ type: "text", text: `再多寫一點點吧，至少 ${MIN_DIARY_CJK} 個中文字就能完成今天的紀錄。` }]);
    return;
  }
  if (cjkLength > MAX_DIARY_CJK) {
    await replyToLine(replyToken, [{ type: "text", text: `內容太長了，請縮短到 ${MAX_DIARY_CJK} 字以內。` }]);
    return;
  }

  const selectedCardId = (await getSession(lineUserId))?.selected_card_id ?? "";
  const now = new Date().toISOString();

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
    id: `${lineUserId}-${today}`,
    participant_id: lineUserId,
    entry_date: today,
    entry_text: content,
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
  const participant = await ensureParticipantSeed(lineUserId);
  const preference = await getCardPreference(lineUserId);

  if (participant.display_name !== lineUserId && preference) {
    await replyToLine(replyToken, [
      {
        type: "text",
        text: preferenceSummaryText(participant.display_name, preference.preferred_style_main, preference.preferred_imagery, participant.wants_partner),
      },
    ]);
    return;
  }

  await updateM03Session(lineUserId, {
    session_id: createM03SessionId(lineUserId),
    step: "waiting_for_name",
    display_name: participant.display_name === lineUserId ? "" : participant.display_name,
    liked_card_ids: [],
    wants_partner: participant.wants_partner ? "yes" : "",
  });

  await replyToLine(replyToken, [{ type: "text", text: "我的小檔案\n先告訴我，想怎麼稱呼你？直接回覆名字或暱稱就可以。" }]);
  void request;
}

async function handleM03NameInput(request: NextRequest, replyToken: string, lineUserId: string, text: string) {
  const nextSession = await updateM03Session(lineUserId, {
    step: "waiting_for_cards",
    display_name: text.trim(),
  });
  const cards = (await listCards()).filter((card) => card.status === "active" && Boolean(card.imageUrl)).slice(0, 6);
  await replyToLine(replyToken, [
    { type: "text", text: "接下來請選三張你喜歡的圖，幫我知道你偏好的風格。" },
    buildM03LikeCarousel(nextSession.session_id, cards),
  ]);
  void request;
}

async function handleM03LikeCard(request: NextRequest, replyToken: string, lineUserId: string, payload: ParsedPostback) {
  const session = (await getM03Session(lineUserId)) ?? (await updateM03Session(lineUserId, { session_id: payload.sessionId || createM03SessionId(lineUserId), step: "waiting_for_cards" }));
  const nextLiked = [...new Set([...session.liked_card_ids, payload.cardId])];
  if (nextLiked.length === session.liked_card_ids.length) {
    await replyToLine(replyToken, [{ type: "text", text: "這張已經選過了，再挑別張看看。" }]);
    return;
  }

  const nextSession = await updateM03Session(lineUserId, {
    session_id: session.session_id,
    step: "waiting_for_cards",
    liked_card_ids: nextLiked,
  });

  if (nextLiked.length < 3) {
    const cards = (await listCards()).filter((card) => card.status === "active" && Boolean(card.imageUrl)).slice(0, 6);
    await replyToLine(replyToken, [
      { type: "text", text: `已選 ${nextLiked.length} / 3 張，再選 ${3 - nextLiked.length} 張就完成。` },
      buildM03LikeCarousel(nextSession.session_id, cards),
    ]);
    return;
  }

  const allCards = await listCards();
  const likedCards = nextLiked.map((cardId) => allCards.find((card) => card.id === cardId)).filter(Boolean) as CardAsset[];
  const derived = derivePreference(likedCards);
  await upsertParticipant(lineUserId, {
    display_name: nextSession.display_name || lineUserId,
  });
  await upsertCardPreference({
    participant_id: lineUserId,
    preferred_style_main: derived.preferred_style_main,
    preferred_tone: derived.preferred_tone,
    preferred_imagery: derived.preferred_imagery,
    profile_confidence: Number(derived.profile_confidence.toFixed(2)),
    updated_at: new Date().toISOString(),
  });
  await updateM03Session(lineUserId, {
    step: "waiting_for_partner",
    liked_card_ids: nextLiked,
  });
  await replyToLine(replyToken, [partnerChoiceMessage(nextSession.session_id)]);
  void request;
}

async function handleM03PartnerChoice(replyToken: string, lineUserId: string, choice: string) {
  const wantsPartner = choice === "yes";
  const participant = await upsertParticipant(lineUserId, { wants_partner: wantsPartner });
  if (wantsPartner) {
    await upsertPartnerLink({
      id: `plink-${lineUserId}`,
      participant_id: lineUserId,
      partner_participant_id: "internal-partner-pool",
      status: "active",
      created_at: new Date().toISOString(),
    });
  }

  const preference = await getCardPreference(lineUserId);
  await updateM03Session(lineUserId, {
    step: "idle",
    wants_partner: wantsPartner ? "yes" : "no",
  });

  await replyToLine(replyToken, [
    {
      type: "text",
      text: preference
        ? preferenceSummaryText(participant.display_name, preference.preferred_style_main, preference.preferred_imagery, participant.wants_partner)
        : "小檔案已完成。",
    },
  ]);
}

async function handlePostback(request: NextRequest, replyToken: string, lineUserId: string, payload: ParsedPostback) {
  if (payload.module === "m01" && payload.action === "start") {
    await handleM01Start(request, replyToken, lineUserId);
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
  if (payload.module === "m03" && payload.action === "like_card") {
    await handleM03LikeCard(request, replyToken, lineUserId, payload);
    return;
  }
  if (payload.module === "m03" && payload.action === "set_partner") {
    await handleM03PartnerChoice(replyToken, lineUserId, payload.partnerChoice);
    return;
  }

  await replyToLine(replyToken, [unknownMessage()]);
}

async function handleTextMessage(request: NextRequest, event: Extract<LineEvent, { type: "message" }>, lineUserId: string) {
  const text = event.message.text.trim();
  const lowerText = text.toLowerCase();

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
  if (EGG_TEXT_TRIGGERS.has(text) || EGG_TEXT_TRIGGERS.has(lowerText)) {
    await handleEggProgress(event.replyToken, lineUserId);
    return;
  }

  const m03Session = await getM03Session(lineUserId);
  if (m03Session?.step === "waiting_for_name") {
    await handleM03NameInput(request, event.replyToken, lineUserId, text);
    return;
  }

  if ((await getM02Session(lineUserId))?.status === "waiting_for_diary") {
    await handleM02DiaryInput(event.replyToken, lineUserId, text);
    return;
  }

  await replyToLine(event.replyToken, [unknownMessage()]);
}

async function handleEvent(request: NextRequest, event: LineEvent) {
  if (!("replyToken" in event) || !event.replyToken) return;

  const lineUserId = event.source?.userId ?? "anonymous_user";

  if (event.type === "follow") {
    await ensureParticipantSeed(lineUserId);
    await replyToLine(event.replyToken, [{ type: "text", text: "歡迎使用 Jenny。請從下方選單選擇服務。" }]);
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
    modules: ["m01", "m02", "m03", "egg"],
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
