import { readLocalTable, writeLocalTable } from "@/lib/local-table-store";
import { canUseSupabase, hasTable, supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/supabase-rest";

export type ParticipantRow = {
  id: string;
  display_name: string;
  age_band: string;
  district: string;
  wants_partner: boolean;
  wants_reminders: boolean;
  wants_to_help_others: boolean;
  wants_to_be_cared_for: boolean;
  wants_chat_matching: boolean;
  is_little_angel: boolean;
  is_little_owner: boolean;
  free_owner_slots: number;
  extra_owner_slots: number;
  reminder_opt_in: boolean;
  care_ambassador_opt_in: boolean;
  wants_care: boolean;
  chat_match_opt_in: boolean;
  m03_completed_at?: string | null;
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
  entry_index: number;
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
  analysis_run_at?: string | null;
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
  link_id?: string;
  participant_id: string;
  partner_participant_id: string;
  angel_participant_id?: string;
  owner_participant_id?: string;
  status: "pending" | "matched" | "paused" | "closed";
  link_type: "care_pair" | "chat_pair";
  match_status?: "pending" | "matched" | "paused" | "closed";
  chat_enabled?: boolean;
  updated_at?: string;
  created_at: string;
};

export type CareEventRow = {
  event_id: string;
  participant_id: string;
  target_participant_id: string;
  event_type: "send_greeting" | "request_care" | "willing_to_call" | "mark_available" | "pause_matching";
  note: string;
  created_at: string;
};

export type CommunityInfoRow = {
  info_id: string;
  title: string;
  category: "policy" | "neighborhood" | "temple" | "community";
  description: string;
  event_date?: string | null;
  location: string;
  district: string;
  contact: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type UserDailyMoodRow = {
  participant_id: string;
  selected_date: string;
  mood: string;
  created_at: string;
};

export type UserDailyCheckinRow = {
  participant_id: string;
  selected_date: string;
  claimed_today: boolean;
  claim_season: string;
  created_at: string;
  updated_at: string;
};

export type CareMessageRow = {
  id: string;
  sender_participant_id: string;
  receiver_participant_id: string;
  message_type: string;
  message_text: string;
  created_at: string;
};

export type VolunteerRequestRow = {
  id: string;
  participant_id: string;
  request_text: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type UserReportRow = {
  id: string;
  reporter_participant_id: string;
  target_participant_id: string;
  reason: string;
  created_at: string;
};

export type UserBlockRow = {
  id: string;
  blocker_participant_id: string;
  target_participant_id: string;
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
  userDailyMood: "user_daily_mood",
  userDailyCheckin: "user_daily_checkin",
  diaryEntries: "diary_entries",
  eggProgress: "egg_progress",
  partnerLinks: "partner_links",
  careEvents: "care_events",
  careMessages: "care_messages",
  volunteerRequests: "volunteer_requests",
  userReports: "user_reports",
  userBlocks: "user_blocks",
  communityInfo: "community_info",
  partnerPromptQueue: "partner_prompt_queue",
  internalReviewQueue: "internal_review_queue",
} as const;

type DataAccessOptions = {
  allowFallback?: boolean;
};

function nowIso() {
  return new Date().toISOString();
}

function toBoolean(value: unknown) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function normalizeParticipantRow(raw: Partial<ParticipantRow> & Record<string, unknown>) {
  const wantsReminders = toBoolean(raw.wants_reminders ?? raw.reminder_opt_in);
  const wantsToHelpOthers = toBoolean(raw.wants_to_help_others ?? raw.care_ambassador_opt_in);
  const wantsToBeCaredFor = toBoolean(raw.wants_to_be_cared_for ?? raw.wants_care ?? raw.wants_partner);
  const wantsChatMatching = toBoolean(raw.wants_chat_matching ?? raw.chat_match_opt_in);
  const isLittleAngel = toBoolean(raw.is_little_angel ?? raw.wants_to_help_others ?? raw.care_ambassador_opt_in);
  const isLittleOwner = toBoolean(raw.is_little_owner ?? raw.wants_to_be_cared_for ?? raw.wants_care ?? raw.wants_partner);

  return {
    id: String(raw.id ?? ""),
    display_name: String(raw.display_name ?? ""),
    age_band: String(raw.age_band ?? ""),
    district: String(raw.district ?? ""),
    wants_partner: wantsToBeCaredFor,
    wants_reminders: wantsReminders,
    wants_to_help_others: wantsToHelpOthers,
    wants_to_be_cared_for: wantsToBeCaredFor,
    wants_chat_matching: wantsChatMatching,
    is_little_angel: isLittleAngel,
    is_little_owner: isLittleOwner,
    free_owner_slots: Number(raw.free_owner_slots ?? 5),
    extra_owner_slots: Number(raw.extra_owner_slots ?? 0),
    reminder_opt_in: wantsReminders,
    care_ambassador_opt_in: wantsToHelpOthers,
    wants_care: wantsToBeCaredFor,
    chat_match_opt_in: wantsChatMatching,
    m03_completed_at: raw.m03_completed_at ? String(raw.m03_completed_at) : null,
    created_at: String(raw.created_at ?? nowIso()),
    updated_at: String(raw.updated_at ?? nowIso()),
  } satisfies ParticipantRow;
}

function normalizePartnerLinkRow(raw: Partial<PartnerLinkRow> & Record<string, unknown>) {
  const rawLinkType = String(raw.link_type ?? "care_pair");
  const linkType: PartnerLinkRow["link_type"] =
    rawLinkType === "chat" || rawLinkType === "chat_pair" ? "chat_pair" : "care_pair";
  const rawStatus = String(raw.status ?? raw.match_status ?? "pending");
  const status: PartnerLinkRow["status"] =
    rawStatus === "matched" || rawStatus === "paused" || rawStatus === "closed"
      ? rawStatus
      : rawStatus === "active"
        ? "matched"
        : "pending";

  return {
    id: String(raw.id ?? raw.link_id ?? ""),
    link_id: String(raw.link_id ?? raw.id ?? ""),
    participant_id: String(raw.participant_id ?? ""),
    partner_participant_id: String(raw.partner_participant_id ?? ""),
    angel_participant_id: String(raw.angel_participant_id ?? ""),
    owner_participant_id: String(raw.owner_participant_id ?? ""),
    status,
    link_type: linkType,
    match_status: status,
    chat_enabled: toBoolean(raw.chat_enabled ?? linkType === "chat_pair"),
    updated_at: String(raw.updated_at ?? raw.created_at ?? nowIso()),
    created_at: String(raw.created_at ?? nowIso()),
  } satisfies PartnerLinkRow;
}

async function tableAvailable(table: string) {
  return canUseSupabase() && (await hasTable(table));
}

async function readRows<T>(table: string, options: DataAccessOptions = {}) {
  if (await tableAvailable(table)) {
    return supabaseSelect<T>(table, "select=*&limit=1000");
  }
  if (options.allowFallback === false) {
    return [] as T[];
  }
  return readLocalTable<T>(table);
}

async function upsertRows<T extends { [key: string]: unknown }>(table: string, rows: T[], keyField: keyof T, options: DataAccessOptions = {}) {
  if (await tableAvailable(table)) {
    return supabaseInsert(table, rows, true);
  }
  if (options.allowFallback === false) {
    return false;
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

async function patchRow<T extends { [key: string]: unknown }>(
  table: string,
  keyField: keyof T,
  keyValue: string,
  patch: Partial<T>,
  options: DataAccessOptions = {},
) {
  if (await tableAvailable(table)) {
    return supabasePatch(table, `${String(keyField)}=eq.${encodeURIComponent(keyValue)}`, patch as Record<string, unknown>);
  }
  if (options.allowFallback === false) {
    return false;
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

export async function hasRequiredTables(tableNames: string[]) {
  const checks = await Promise.all(tableNames.map((table) => tableAvailable(table)));
  return checks.every(Boolean);
}

export async function getParticipant(participantId: string, options: DataAccessOptions = {}) {
  const rows = await readRows<Record<string, unknown>>(TABLES.participants, options);
  return rows.map(normalizeParticipantRow).find((row) => row.id === participantId) ?? null;
}

export async function listParticipants(options: DataAccessOptions = {}) {
  const rows = await readRows<Record<string, unknown>>(TABLES.participants, options);
  return rows.map(normalizeParticipantRow).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function upsertParticipant(participantId: string, patch: Partial<ParticipantRow>, options: DataAccessOptions = {}) {
  const now = nowIso();
  const existing = await getParticipant(participantId, options);
  const wantsReminders = patch.wants_reminders ?? patch.reminder_opt_in ?? existing?.wants_reminders ?? existing?.reminder_opt_in ?? false;
  const wantsToHelpOthers =
    patch.wants_to_help_others ?? patch.care_ambassador_opt_in ?? existing?.wants_to_help_others ?? existing?.care_ambassador_opt_in ?? false;
  const wantsToBeCaredFor =
    patch.wants_to_be_cared_for ?? patch.wants_care ?? patch.wants_partner ?? existing?.wants_to_be_cared_for ?? existing?.wants_care ?? existing?.wants_partner ?? false;
  const wantsChatMatching =
    patch.wants_chat_matching ?? patch.chat_match_opt_in ?? existing?.wants_chat_matching ?? existing?.chat_match_opt_in ?? false;
  const isLittleAngel = patch.is_little_angel ?? wantsToHelpOthers;
  const isLittleOwner = patch.is_little_owner ?? wantsToBeCaredFor;
  const next: ParticipantRow = {
    id: participantId,
    display_name: patch.display_name ?? existing?.display_name ?? participantId,
    age_band: patch.age_band ?? existing?.age_band ?? "",
    district: patch.district ?? existing?.district ?? "",
    wants_partner: wantsToBeCaredFor,
    wants_reminders: wantsReminders,
    wants_to_help_others: wantsToHelpOthers,
    wants_to_be_cared_for: wantsToBeCaredFor,
    wants_chat_matching: wantsChatMatching,
    is_little_angel: isLittleAngel,
    is_little_owner: isLittleOwner,
    free_owner_slots: patch.free_owner_slots ?? existing?.free_owner_slots ?? 5,
    extra_owner_slots: patch.extra_owner_slots ?? existing?.extra_owner_slots ?? 0,
    reminder_opt_in: wantsReminders,
    care_ambassador_opt_in: wantsToHelpOthers,
    wants_care: wantsToBeCaredFor,
    chat_match_opt_in: wantsChatMatching,
    m03_completed_at: patch.m03_completed_at ?? existing?.m03_completed_at ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  const ok = await upsertRows(TABLES.participants, [next], "id", options);
  if (!ok && options.allowFallback === false) {
    throw new Error("M03 participant write requires remote participants columns to be ready.");
  }
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

export async function upsertUserDailyMood(row: UserDailyMoodRow) {
  const next = { ...row, created_at: row.created_at || nowIso() };
  if (await tableAvailable(TABLES.userDailyMood)) {
    await supabaseInsert(TABLES.userDailyMood, [next], true);
    return next;
  }
  const existing = await readLocalTable<UserDailyMoodRow>(TABLES.userDailyMood);
  const index = existing.findIndex((item) => item.participant_id === next.participant_id && item.selected_date === next.selected_date);
  const rows = [...existing];
  if (index >= 0) rows[index] = next;
  else rows.push(next);
  await writeLocalTable(TABLES.userDailyMood, rows);
  return next;
}

export async function getUserDailyMood(participantId: string, date: string) {
  const rows = await readRows<UserDailyMoodRow>(TABLES.userDailyMood);
  return rows.find((row) => row.participant_id === participantId && row.selected_date === date) ?? null;
}

export async function listUserDailyMood(participantId?: string) {
  const rows = await readRows<UserDailyMoodRow>(TABLES.userDailyMood);
  const filtered = participantId ? rows.filter((row) => row.participant_id === participantId) : rows;
  return filtered.sort((a, b) => b.selected_date.localeCompare(a.selected_date));
}

export async function upsertUserDailyCheckin(row: UserDailyCheckinRow) {
  const next = { ...row, created_at: row.created_at || nowIso(), updated_at: row.updated_at || nowIso() };
  if (await tableAvailable(TABLES.userDailyCheckin)) {
    await supabaseInsert(TABLES.userDailyCheckin, [next], true);
    return next;
  }
  const existing = await readLocalTable<UserDailyCheckinRow>(TABLES.userDailyCheckin);
  const index = existing.findIndex((item) => item.participant_id === next.participant_id && item.selected_date === next.selected_date);
  const rows = [...existing];
  if (index >= 0) rows[index] = next;
  else rows.push(next);
  await writeLocalTable(TABLES.userDailyCheckin, rows);
  return next;
}

export async function getUserDailyCheckin(participantId: string, date: string) {
  const rows = await readRows<UserDailyCheckinRow>(TABLES.userDailyCheckin);
  return rows.find((row) => row.participant_id === participantId && row.selected_date === date) ?? null;
}

export async function listUserDailyCheckins(participantId?: string) {
  const rows = await readRows<UserDailyCheckinRow>(TABLES.userDailyCheckin);
  const filtered = participantId ? rows.filter((row) => row.participant_id === participantId) : rows;
  return filtered.sort((a, b) => b.selected_date.localeCompare(a.selected_date));
}

export async function upsertDiaryEntry(row: DiaryEntryRow) {
  const next = {
    ...row,
    entry_index: row.entry_index || 1,
  };
  await upsertRows(TABLES.diaryEntries, [next], "id");
  return next;
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
    egg_box_eligible: daysCompleted >= 14,
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

export async function upsertPartnerLink(row: PartnerLinkRow, options: DataAccessOptions = {}) {
  const next: PartnerLinkRow = {
    ...row,
    id: row.id || row.link_id || `link-${Date.now()}`,
    link_id: row.link_id ?? row.id,
    angel_participant_id:
      row.angel_participant_id ??
      (row.link_type === "care_pair" ? row.partner_participant_id : row.participant_id),
    owner_participant_id:
      row.owner_participant_id ??
      (row.link_type === "care_pair" ? row.participant_id : row.partner_participant_id),
    link_type: row.link_type,
    status: row.status,
    match_status: row.match_status ?? row.status,
    chat_enabled: row.chat_enabled ?? row.link_type === "chat_pair",
    updated_at: row.updated_at ?? nowIso(),
  };
  const ok = await upsertRows(TABLES.partnerLinks, [next], "id", options);
  if (!ok && options.allowFallback === false) {
    throw new Error("M03 partner link write requires remote partner_links columns to be ready.");
  }
  return next;
}

export async function getPartnerLink(participantId: string, options: DataAccessOptions = {}) {
  const rows = await readRows<Record<string, unknown>>(TABLES.partnerLinks, options);
  const normalized = rows.map(normalizePartnerLinkRow);
  return (
    normalized.find((row) => row.participant_id === participantId && row.link_type === "care_pair" && row.status !== "closed") ??
    normalized.find((row) => row.participant_id === participantId && row.status !== "closed") ??
    null
  );
}

export async function listPartnerLinks(participantId?: string, options: DataAccessOptions = {}) {
  const rows = (await readRows<Record<string, unknown>>(TABLES.partnerLinks, options)).map(normalizePartnerLinkRow);
  const filtered = participantId ? rows.filter((row) => row.participant_id === participantId) : rows;
  return filtered.sort((a, b) => (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at));
}

export async function listCareEvents(participantId?: string, options: DataAccessOptions = {}) {
  const rows = await readRows<CareEventRow>(TABLES.careEvents, options);
  const filtered = participantId ? rows.filter((row) => row.participant_id === participantId) : rows;
  return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function recordCareEvent(row: CareEventRow, options: DataAccessOptions = {}) {
  const ok = await upsertRows(TABLES.careEvents, [row], "event_id", options);
  if (!ok && options.allowFallback === false) {
    throw new Error("M03 care event write requires remote care_events table to be ready.");
  }
  return row;
}

export async function listCareMessages(participantId?: string, options: DataAccessOptions = {}) {
  const rows = await readRows<CareMessageRow>(TABLES.careMessages, options);
  const filtered = participantId
    ? rows.filter((row) => row.sender_participant_id === participantId || row.receiver_participant_id === participantId)
    : rows;
  return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function recordCareMessage(row: CareMessageRow, options: DataAccessOptions = {}) {
  const ok = await upsertRows(TABLES.careMessages, [row], "id", options);
  if (!ok && options.allowFallback === false) {
    throw new Error("M03 care message write requires remote care_messages table to be ready.");
  }
  return row;
}

export async function listVolunteerRequests(participantId?: string, options: DataAccessOptions = {}) {
  const rows = await readRows<VolunteerRequestRow>(TABLES.volunteerRequests, options);
  const filtered = participantId ? rows.filter((row) => row.participant_id === participantId) : rows;
  return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function upsertVolunteerRequest(row: VolunteerRequestRow, options: DataAccessOptions = {}) {
  const ok = await upsertRows(TABLES.volunteerRequests, [row], "id", options);
  if (!ok && options.allowFallback === false) {
    throw new Error("M03 volunteer request write requires remote volunteer_requests table to be ready.");
  }
  return row;
}

export async function listUserReports(participantId?: string, options: DataAccessOptions = {}) {
  const rows = await readRows<UserReportRow>(TABLES.userReports, options);
  const filtered = participantId
    ? rows.filter((row) => row.reporter_participant_id === participantId || row.target_participant_id === participantId)
    : rows;
  return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function recordUserReport(row: UserReportRow, options: DataAccessOptions = {}) {
  const ok = await upsertRows(TABLES.userReports, [row], "id", options);
  if (!ok && options.allowFallback === false) {
    throw new Error("M03 report write requires remote user_reports table to be ready.");
  }
  return row;
}

export async function listUserBlocks(participantId?: string, options: DataAccessOptions = {}) {
  const rows = await readRows<UserBlockRow>(TABLES.userBlocks, options);
  const filtered = participantId
    ? rows.filter((row) => row.blocker_participant_id === participantId || row.target_participant_id === participantId)
    : rows;
  return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function recordUserBlock(row: UserBlockRow, options: DataAccessOptions = {}) {
  const ok = await upsertRows(TABLES.userBlocks, [row], "id", options);
  if (!ok && options.allowFallback === false) {
    throw new Error("M03 block write requires remote user_blocks table to be ready.");
  }
  return row;
}

function poolIdForLinkType(linkType: PartnerLinkRow["link_type"]) {
  return linkType === "chat_pair" ? "chat-pool" : "care-pool";
}

function findPairLink(
  rows: PartnerLinkRow[],
  participantId: string,
  linkType: PartnerLinkRow["link_type"],
) {
  return rows.find((row) => row.participant_id === participantId && row.link_type === linkType && row.status !== "closed") ?? null;
}

async function setPairedLinks(
  participantId: string,
  partnerId: string,
  linkType: PartnerLinkRow["link_type"],
  createdAt: string,
  options: DataAccessOptions,
) {
  const angelParticipantId = linkType === "care_pair" ? partnerId : participantId;
  const ownerParticipantId = linkType === "care_pair" ? participantId : partnerId;
  const leftId = `${linkType}-${participantId}-${partnerId}`;
  const rightId = `${linkType}-${partnerId}-${participantId}`;
  await upsertPartnerLink(
    {
      id: leftId,
      link_id: leftId,
      participant_id: participantId,
      partner_participant_id: partnerId,
      angel_participant_id: angelParticipantId,
      owner_participant_id: ownerParticipantId,
      link_type: linkType,
      status: "matched",
      match_status: "matched",
      chat_enabled: linkType === "chat_pair",
      created_at: createdAt,
      updated_at: createdAt,
    },
    options,
  );
  await upsertPartnerLink(
    {
      id: rightId,
      link_id: rightId,
      participant_id: partnerId,
      partner_participant_id: participantId,
      angel_participant_id: angelParticipantId,
      owner_participant_id: ownerParticipantId,
      link_type: linkType,
      status: "matched",
      match_status: "matched",
      chat_enabled: linkType === "chat_pair",
      created_at: createdAt,
      updated_at: createdAt,
    },
    options,
  );
}

export async function syncM03Pairs(participantId: string, options: DataAccessOptions = {}) {
  const participants = await listParticipants(options);
  const current = participants.find((row) => row.id === participantId);
  if (!current) return null;

  const now = nowIso();
  const links = await listPartnerLinks(undefined, options);

  const currentCareLink = findPairLink(links, participantId, "care_pair");
  const currentChatLink = findPairLink(links, participantId, "chat_pair");

  if (current.wants_to_be_cared_for) {
    if (!currentCareLink) {
      await upsertPartnerLink(
        {
          id: `care_pair-${participantId}-pending`,
          link_id: `care_pair-${participantId}-pending`,
          participant_id: participantId,
          partner_participant_id: poolIdForLinkType("care_pair"),
          link_type: "care_pair",
          status: "pending",
          match_status: "pending",
          chat_enabled: false,
          created_at: now,
          updated_at: now,
        },
        options,
      );
    }

    const helperCandidates = participants
      .filter((row) => row.id !== participantId && row.wants_to_help_others)
      .filter((row) => {
        const activeOwnerCount = links.filter((link) => link.link_type === "care_pair" && link.status === "matched" && link.angel_participant_id === row.id).length;
        return activeOwnerCount < (row.free_owner_slots + row.extra_owner_slots);
      })
      .sort((a, b) => a.updated_at.localeCompare(b.updated_at));

    const helper = helperCandidates[0];
    if (helper) {
      await setPairedLinks(participantId, helper.id, "care_pair", now, options);
    }
  } else if (currentCareLink) {
    await upsertPartnerLink(
      {
        ...currentCareLink,
        partner_participant_id: currentCareLink.partner_participant_id || poolIdForLinkType("care_pair"),
        status: "closed",
        match_status: "closed",
        updated_at: now,
      },
      options,
    );
  }

  if (current.wants_chat_matching) {
    if (!currentChatLink) {
      await upsertPartnerLink(
        {
          id: `chat_pair-${participantId}-pending`,
          link_id: `chat_pair-${participantId}-pending`,
          participant_id: participantId,
          partner_participant_id: poolIdForLinkType("chat_pair"),
          link_type: "chat_pair",
          status: "pending",
          match_status: "pending",
          chat_enabled: true,
          created_at: now,
          updated_at: now,
        },
        options,
      );
    }

    const chatCandidates = participants
      .filter((row) => row.id !== participantId && row.wants_chat_matching)
      .filter((row) => !findPairLink(links, row.id, "chat_pair") || findPairLink(links, row.id, "chat_pair")?.status !== "matched")
      .sort((a, b) => a.updated_at.localeCompare(b.updated_at));

    const chatPartner = chatCandidates[0];
    if (chatPartner) {
      await setPairedLinks(participantId, chatPartner.id, "chat_pair", now, options);
    }
  } else if (currentChatLink) {
    await upsertPartnerLink(
      {
        ...currentChatLink,
        partner_participant_id: currentChatLink.partner_participant_id || poolIdForLinkType("chat_pair"),
        status: "closed",
        match_status: "closed",
        updated_at: now,
      },
      options,
    );
  }

  return {
    care: await listPartnerLinks(participantId, options),
    participant: await getParticipant(participantId, options),
  };
}

export async function listCommunityInfo(filters?: {
  category?: string;
  status?: string;
  district?: string;
}) {
  const rows = await readRows<CommunityInfoRow>(TABLES.communityInfo);
  return rows
    .filter((row) => {
      if (filters?.category && row.category !== filters.category) return false;
      if (filters?.status && row.status !== filters.status) return false;
      if (filters?.district && row.district !== filters.district && row.district !== "") return false;
      return true;
    })
    .sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? "") || b.updated_at.localeCompare(a.updated_at));
}

export async function getCommunityInfo(infoId: string) {
  const rows = await readRows<CommunityInfoRow>(TABLES.communityInfo);
  return rows.find((row) => row.info_id === infoId) ?? null;
}

export async function upsertCommunityInfo(row: CommunityInfoRow) {
  await upsertRows(TABLES.communityInfo, [{ ...row, district: row.district || "", updated_at: row.updated_at || nowIso(), created_at: row.created_at || nowIso() }], "info_id");
  return row;
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

    if (participant.wants_to_be_cared_for && partnerLink) {
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
    analysis_run_at: raw.analysis_run_at ? String(raw.analysis_run_at) : null,
  };
}
