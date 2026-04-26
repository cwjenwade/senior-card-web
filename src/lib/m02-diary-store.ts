type M02Session = {
  line_user_id: string;
  session_id: string;
  status: "idle" | "waiting_for_diary" | "completed";
  started_at: string;
  updated_at: string;
};

type M02DiaryEntry = {
  line_user_id: string;
  session_id: string;
  diary_text: string;
  diary_date: string;
  completed: boolean;
  completed_at: string;
  created_at: string;
};

type M02RewardEvent = {
  line_user_id: string;
  session_id: string;
  event_type: "started" | "diary_submitted" | "completed" | "duplicate_blocked" | "invalid_input" | "too_short" | "too_long";
  event_time: string;
};

const sessions = new Map<string, M02Session>();
const diaryEntries = new Map<string, M02DiaryEntry[]>();
const rewardEvents = new Map<string, M02RewardEvent[]>();
const completedDays = new Map<string, Set<string>>();

function nowIso() {
  return new Date().toISOString();
}

function createDefaultSession(lineUserId: string): M02Session {
  const now = nowIso();
  return {
    line_user_id: lineUserId,
    session_id: `m02-${lineUserId}-${Date.now()}`,
    status: "idle",
    started_at: now,
    updated_at: now,
  };
}

export function getTodayInTaipei() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export function getTodayEntry(lineUserId: string) {
  const today = getTodayInTaipei();
  const entries = diaryEntries.get(lineUserId) ?? [];
  return entries.find((entry) => entry.diary_date === today) ?? null;
}

export function createDiaryEntry(payload: M02DiaryEntry) {
  // Vercel serverless does not guarantee in-memory persistence.
  // Production should move diary records to Supabase or another durable database.
  const entries = diaryEntries.get(payload.line_user_id) ?? [];
  entries.push(payload);
  diaryEntries.set(payload.line_user_id, entries);
  return payload;
}

export function markM02Completed(lineUserId: string, date: string) {
  const dates = completedDays.get(lineUserId) ?? new Set<string>();
  dates.add(date);
  completedDays.set(lineUserId, dates);
}

export function hasCompletedToday(lineUserId: string, date: string) {
  return completedDays.get(lineUserId)?.has(date) ?? false;
}

export function getM02Session(lineUserId: string) {
  return sessions.get(lineUserId) ?? null;
}

export function updateM02Session(lineUserId: string, patch: Partial<M02Session>) {
  // Vercel serverless does not guarantee in-memory persistence.
  // Production should move this store to Supabase or another durable database.
  const existing = sessions.get(lineUserId) ?? createDefaultSession(lineUserId);
  const next: M02Session = {
    ...existing,
    ...patch,
    line_user_id: lineUserId,
    updated_at: nowIso(),
  };
  sessions.set(lineUserId, next);
  return next;
}

export function recordM02RewardEvent(payload: M02RewardEvent) {
  // Vercel serverless does not guarantee in-memory persistence.
  // Production should move this event log to Supabase or another durable database.
  const events = rewardEvents.get(payload.line_user_id) ?? [];
  events.push(payload);
  rewardEvents.set(payload.line_user_id, events);
  return payload;
}

export function countCjkCharacters(text: string) {
  return (text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) ?? []).length;
}
