import { readLocalTable, writeLocalTable } from "@/lib/local-table-store";
import { canUseSupabase, hasTable, supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/supabase-rest";

export type ParticipantRow = {
  id: string;
  display_name: string;
  age_band: string;
  wants_partner: boolean;
  created_at: string;
  updated_at: string;
};

export type CardPreferenceRow = {
  participant_id: string;
  preferred_style_main: string;
  preferred_tone: string;
  preferred_imagery: string;
  profile_confidence: number;
  updated_at: string;
};

export type CardInteractionRow = {
  id: string;
  participant_id: string;
  card_id: string;
  interaction_date: string;
  action_type: string;
  selected_as_main: boolean;
  diary_written: boolean;
  created_at: string;
};

export type DailyCardRecommendationRow = {
  id: string;
  participant_id: string;
  recommendation_date: string;
  card_id: string;
  rank_order: number;
  strategy_type: string;
  score_total: number;
  reason_text: string;
};

export type GuidedDiaryPromptRow = {
  id: string;
  participant_id: string;
  prompt_date: string;
  main_card_id: string;
  prompt_text: string;
  status: string;
};

export type DiaryEntryRow = {
  id: string;
  participant_id: string;
  entry_date: string;
  entry_text: string;
  linked_card_id: string;
  risk_label: string;
  need_type: string;
  priority_score: number;
  priority_reason: string;
  manual_review: boolean;
  semantic_risk_score: number;
  analysis_status: string;
  model_version?: string;
  rule_version?: string;
  analysis_run_at?: string;
  created_at: string;
};

export type EggProgressRow = {
  participant_id: string;
  window_start: string;
  window_end: string;
  days_completed: number;
  egg_box_eligible: boolean;
  updated_at: string;
};

export type PartnerLinkRow = {
  id: string;
  participant_id: string;
  partner_participant_id: string;
  status: string;
  created_at: string;
};

export type PartnerPromptQueueRow = {
  id: string;
  participant_id: string;
  partner_participant_id: string;
  trigger_type: string;
  trigger_reason: string;
  status: string;
  model_version?: string;
  rule_version?: string;
  created_at: string;
};

export type InternalReviewQueueRow = {
  id: string;
  participant_id: string;
  trigger_type: string;
  trigger_reason: string;
  priority_score: number;
  status: string;
  model_version?: string;
  rule_version?: string;
  created_at: string;
};

const TABLES = {
  participants: "participants",
  cardPreferences: "card_preferences",
  cardInteractions: "card_interactions",
  dailyCardRecommendations: "daily_card_recommendations",
  guidedDiaryPrompts: "guided_diary_prompts",
  diaryEntries: "diary_entries",
  eggProgress: "egg_progress",
  partnerLinks: "partner_links",
  partnerPromptQueue: "partner_prompt_queue",
  internalReviewQueue: "internal_review_queue",
} as const;

function nowIso() {
  return new Date().toISOString();
}

function toBoolean(value: unknown) {
  return value === true || value === "true" || value === "1" || value === 1;
}

async function tableAvailable(table: string) {
  return canUseSupabase() && (await hasTable(table));
}

async function readRows<T>(table: string) {
  if (await tableAvailable(table)) {
    return supabaseSelect<T>(table, "select=*&limit=1000");
  }
  return readLocalTable<T>(table);
}

async function upsertRows<T extends { [key: string]: unknown }>(table: string, rows: T[], keyField: keyof T) {
  if (await tableAvailable(table)) {
    return supabaseInsert(table, rows, true);
  }

  const existing = await readLocalTable<T>(table);
  const next = [...existing];
  for (const row of rows) {
    const index = next.findIndex((item) => item[keyField] === row[keyField]);
    if (index >= 0) {
      next[index] = row;
    } else {
      next.push(row);
    }
  }
  await writeLocalTable(table, next);
  return true;
}

async function patchRow<T extends { [key: string]: unknown }>(table: string, keyField: keyof T, keyValue: string, patch: Partial<T>) {
  if (await tableAvailable(table)) {
    return supabasePatch(table, `${String(keyField)}=eq.${encodeURIComponent(keyValue)}`, patch as Record<string, unknown>);
  }

  const existing = await readLocalTable<T>(table);
  const next = existing.map((row) => (row[keyField] === keyValue ? { ...row, ...patch } : row));
  await writeLocalTable(table, next);
  return true;
}

export async function listKnownTables() {
  const checks = await Promise.all(
    Object.values(TABLES).map(async (table) => ({
      table,
      available: await tableAvailable(table),
    })),
  );
  return checks;
}

export async function getParticipant(participantId: string) {
  const rows = await readRows<ParticipantRow>(TABLES.participants);
  return rows.find((row) => row.id === participantId) ?? null;
}

export async function listParticipants() {
  const rows = await readRows<ParticipantRow>(TABLES.participants);
  return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function upsertParticipant(participantId: string, patch: Partial<ParticipantRow>) {
  const now = nowIso();
  const existing = await getParticipant(participantId);
  const next: ParticipantRow = {
    id: participantId,
    display_name: patch.display_name ?? existing?.display_name ?? participantId,
    age_band: patch.age_band ?? existing?.age_band ?? "",
    wants_partner: patch.wants_partner ?? existing?.wants_partner ?? false,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  await upsertRows(TABLES.participants, [next], "id");
  return next;
}

export async function getCardPreference(participantId: string) {
  const rows = await readRows<CardPreferenceRow>(TABLES.cardPreferences);
  return rows.find((row) => row.participant_id === participantId) ?? null;
}

export async function upsertCardPreference(row: CardPreferenceRow) {
  await upsertRows(TABLES.cardPreferences, [{ ...row, updated_at: row.updated_at || nowIso() }], "participant_id");
  return row;
}

export async function recordCardInteraction(row: CardInteractionRow) {
  await upsertRows(TABLES.cardInteractions, [row], "id");
  return row;
}

export async function listCardInteractions(participantId: string) {
  const rows = await readRows<CardInteractionRow>(TABLES.cardInteractions);
  return rows
    .filter((row) => row.participant_id === participantId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function markCardInteractionDiaryWritten(participantId: string, cardId: string, interactionDate: string) {
  const rows = await listCardInteractions(participantId);
  const selected = rows.find((row) => row.card_id === cardId && row.interaction_date === interactionDate && row.selected_as_main);
  if (!selected) return false;
  return patchRow<CardInteractionRow>(TABLES.cardInteractions, "id", selected.id, {
    diary_written: true,
  });
}

export async function saveDailyRecommendations(rows: DailyCardRecommendationRow[]) {
  await upsertRows(TABLES.dailyCardRecommendations, rows, "id");
  return rows;
}

export async function getDailyRecommendations(participantId: string, date: string) {
  const rows = await readRows<DailyCardRecommendationRow>(TABLES.dailyCardRecommendations);
  return rows
    .filter((row) => row.participant_id === participantId && row.recommendation_date === date)
    .sort((a, b) => a.rank_order - b.rank_order);
}

export async function upsertGuidedDiaryPrompt(row: GuidedDiaryPromptRow) {
  await upsertRows(TABLES.guidedDiaryPrompts, [row], "id");
  return row;
}

export async function getGuidedDiaryPrompt(participantId: string, date: string) {
  const rows = await readRows<GuidedDiaryPromptRow>(TABLES.guidedDiaryPrompts);
  return rows.find((row) => row.participant_id === participantId && row.prompt_date === date) ?? null;
}

export async function upsertDiaryEntry(row: DiaryEntryRow) {
  await upsertRows(TABLES.diaryEntries, [row], "id");
  return row;
}

export async function getDiaryEntryForDate(participantId: string, date: string) {
  const rows = await readRows<DiaryEntryRow>(TABLES.diaryEntries);
  return rows.find((row) => row.participant_id === participantId && row.entry_date === date) ?? null;
}

export async function listDiaryEntries(participantId?: string) {
  const rows = await readRows<DiaryEntryRow>(TABLES.diaryEntries);
  const filtered = participantId ? rows.filter((row) => row.participant_id === participantId) : rows;
  return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function shiftDate(date: string, deltaDays: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return next.toISOString().slice(0, 10);
}

export async function recalculateEggProgress(participantId: string, today: string) {
  const windowStart = shiftDate(today, -13);
  const entries = (await listDiaryEntries(participantId))
    .filter((row) => row.entry_date >= windowStart && row.entry_date <= today)
    .map((row) => row.entry_date);
  const daysCompleted = new Set(entries).size;
  const row: EggProgressRow = {
    participant_id: participantId,
    window_start: windowStart,
    window_end: today,
    days_completed: daysCompleted,
    egg_box_eligible: daysCompleted >= 10,
    updated_at: nowIso(),
  };
  await upsertRows(TABLES.eggProgress, [row], "participant_id");
  return row;
}

export async function getEggProgress(participantId: string, today?: string) {
  const rows = await readRows<EggProgressRow>(TABLES.eggProgress);
  const existing = rows.find((row) => row.participant_id === participantId) ?? null;
  if (!existing && today) {
    return recalculateEggProgress(participantId, today);
  }
  return existing;
}

export async function upsertPartnerLink(row: PartnerLinkRow) {
  await upsertRows(TABLES.partnerLinks, [row], "id");
  return row;
}

export async function getPartnerLink(participantId: string) {
  const rows = await readRows<PartnerLinkRow>(TABLES.partnerLinks);
  return rows.find((row) => row.participant_id === participantId && row.status !== "closed") ?? null;
}

export async function listPartnerPromptQueue() {
  const rows = await readRows<PartnerPromptQueueRow>(TABLES.partnerPromptQueue);
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listInternalReviewQueue() {
  const rows = await readRows<InternalReviewQueueRow>(TABLES.internalReviewQueue);
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function enqueuePartnerPrompt(row: PartnerPromptQueueRow) {
  const existing = (await listPartnerPromptQueue()).find(
    (item) =>
      item.participant_id === row.participant_id &&
      item.trigger_type === row.trigger_type &&
      item.created_at.slice(0, 10) === row.created_at.slice(0, 10),
  );
  if (existing) return existing;
  await upsertRows(TABLES.partnerPromptQueue, [row], "id");
  return row;
}

export async function enqueueInternalReview(row: InternalReviewQueueRow) {
  const existing = (await listInternalReviewQueue()).find(
    (item) =>
      item.participant_id === row.participant_id &&
      item.trigger_type === row.trigger_type &&
      item.created_at.slice(0, 10) === row.created_at.slice(0, 10),
  );
  if (existing) return existing;
  await upsertRows(TABLES.internalReviewQueue, [row], "id");
  return row;
}

export async function updatePartnerPromptStatus(id: string, status: string) {
  return patchRow<PartnerPromptQueueRow>(TABLES.partnerPromptQueue, "id", id, { status });
}

export async function updateInternalReviewStatus(id: string, status: string) {
  return patchRow<InternalReviewQueueRow>(TABLES.internalReviewQueue, "id", id, { status });
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export async function runQueueDetection(today: string, versions?: { modelVersion?: string; ruleVersion?: string }) {
  const participants = await listParticipants();
  const summary = {
    partnerPromptCreated: 0,
    internalReviewCreated: 0,
  };

  for (const participant of participants) {
    const diaries = (await listDiaryEntries(participant.id)).sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    const latest = diaries.at(-1) ?? null;
    const partnerLink = await getPartnerLink(participant.id);

    if (participant.wants_partner && partnerLink) {
      const lastDate = latest?.entry_date ?? "";
      const silenceDays = lastDate ? Math.max(0, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastDate}T00:00:00Z`)) / 86400000)) : 999;
      const recentThree = diaries.slice(-3);
      const trendUp =
        recentThree.length === 3 &&
        recentThree[0].priority_score < recentThree[1].priority_score &&
        recentThree[1].priority_score < recentThree[2].priority_score;
      const semanticRise = recentThree.length >= 2 && recentThree.at(-1)!.semantic_risk_score > recentThree.at(-2)!.semantic_risk_score;
      const lowMoodCluster = average(recentThree.map((item) => item.semantic_risk_score)) >= 2;

      if (silenceDays >= 3 || trendUp || semanticRise || lowMoodCluster) {
        await enqueuePartnerPrompt({
          id: `ppq-${participant.id}-${today}-${silenceDays >= 3 ? "silence" : trendUp ? "trend" : semanticRise ? "semantic" : "low_mood"}`,
          participant_id: participant.id,
          partner_participant_id: partnerLink.partner_participant_id,
          trigger_type: silenceDays >= 3 ? "silence_gap" : trendUp ? "priority_rising" : semanticRise ? "semantic_risk_up" : "low_mood_cluster",
          trigger_reason: silenceDays >= 3
            ? `連續 ${silenceDays} 天未出現`
            : trendUp
              ? "最近三篇 priority_score 持續升高"
              : semanticRise
                ? "semantic_risk_score 近期提升"
                : "長期低落語意增加",
          status: "partner_prompt",
          model_version: versions?.modelVersion ?? "",
          rule_version: versions?.ruleVersion ?? "",
          created_at: nowIso(),
        });
        summary.partnerPromptCreated += 1;
      }
    }

    if (!latest) continue;

    const silenceDays = Math.max(0, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${latest.entry_date}T00:00:00Z`)) / 86400000));
    if (
      latest.priority_score >= 4 ||
      latest.manual_review ||
      latest.semantic_risk_score >= 4 ||
      silenceDays >= 5
    ) {
        await enqueueInternalReview({
          id: `irq-${participant.id}-${today}-${latest.id}`,
          participant_id: participant.id,
          trigger_type:
          latest.priority_score >= 4
            ? "high_priority"
            : latest.manual_review
              ? "manual_review"
              : latest.semantic_risk_score >= 4
                ? "semantic_high"
                : "silence_escalation",
        trigger_reason:
          latest.priority_score >= 4
            ? `priority_score = ${latest.priority_score}`
            : latest.manual_review
              ? "analysis flagged manual_review"
              : latest.semantic_risk_score >= 4
                ? `semantic_risk_score = ${latest.semantic_risk_score}`
                : `沉默 ${silenceDays} 天`,
        priority_score: latest.priority_score,
        status: silenceDays >= 5 ? "needs_manual_routing" : "pending_review",
        model_version: versions?.modelVersion ?? "",
        rule_version: versions?.ruleVersion ?? "",
        created_at: nowIso(),
      });
      summary.internalReviewCreated += 1;
    }
  }

  return summary;
}

export function normalizeDiaryAnalysis(raw: Partial<DiaryEntryRow>) {
  return {
    risk_label: String(raw.risk_label ?? ""),
    need_type: String(raw.need_type ?? ""),
    priority_score: Number(raw.priority_score ?? 0),
    priority_reason: String(raw.priority_reason ?? ""),
    manual_review: toBoolean(raw.manual_review),
    semantic_risk_score: Number(raw.semantic_risk_score ?? 0),
    analysis_status: String(raw.analysis_status ?? "pending"),
    model_version: String(raw.model_version ?? ""),
    rule_version: String(raw.rule_version ?? ""),
    analysis_run_at: String(raw.analysis_run_at ?? ""),
  };
}
