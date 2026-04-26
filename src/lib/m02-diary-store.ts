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
  linked_card_id?: string;
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

type SupabaseDiaryRow = {
  id: string;
  session_id: string;
  user_id: string;
  linked_card_id?: string | null;
  entry_text: string;
  created_at: string;
  source: string;
};

type SupabaseEventRow = {
  id: string;
  session_id: string;
  user_id: string;
  event_type: string;
  created_at: string;
  payload: Record<string, string | string[] | boolean | number | null> | null;
};

const sessions = new Map<string, M02Session>();
const diaryEntries = new Map<string, M02DiaryEntry[]>();
const rewardEvents = new Map<string, M02RewardEvent[]>();
const DIARY_TABLE = process.env.SUPABASE_DIARY_TABLE || "line_diary_entries";
const INTERACTIONS_TABLE = process.env.SUPABASE_INTERACTIONS_TABLE || "line_interaction_events";

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

function resolveSupabaseRestUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  if (url.includes("/rest/v1")) {
    return url.replace(/\/+$/, "");
  }
  return `${url.replace(/\/+$/, "")}/rest/v1`;
}

function supabaseHeaders() {
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!apiKey) return null;
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function canUseSupabase() {
  return Boolean(resolveSupabaseRestUrl() && supabaseHeaders());
}

async function supabaseInsert(table: string, record: Record<string, unknown>) {
  const baseUrl = resolveSupabaseRestUrl();
  const headers = supabaseHeaders();
  if (!baseUrl || !headers) return false;
  const response = await fetch(`${baseUrl}/${table}`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(record),
    cache: "no-store",
  });
  if (!response.ok) {
    console.error(`Supabase insert failed (${table}): ${response.status} ${await response.text()}`);
    return false;
  }
  return true;
}

async function supabaseRead<T>(table: string, query: string) {
  const baseUrl = resolveSupabaseRestUrl();
  const headers = supabaseHeaders();
  if (!baseUrl || !headers) return [] as T[];
  const response = await fetch(`${baseUrl}/${table}?${query}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    console.error(`Supabase read failed (${table}): ${response.status} ${await response.text()}`);
    return [] as T[];
  }
  return (await response.json()) as T[];
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

function startOfTaipeiDay(date: string) {
  return `${date}T00:00:00+08:00`;
}

function nextTaipeiDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextYear = next.getUTCFullYear();
  const nextMonth = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(next.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}T00:00:00+08:00`;
}

export async function getTodayEntry(lineUserId: string) {
  const today = getTodayInTaipei();
  if (canUseSupabase()) {
    const rows = await supabaseRead<SupabaseDiaryRow>(
      DIARY_TABLE,
      `select=*&user_id=eq.${encodeURIComponent(lineUserId)}&source=eq.m02&created_at=gte.${encodeURIComponent(startOfTaipeiDay(today))}&created_at=lt.${encodeURIComponent(nextTaipeiDay(today))}&limit=1`,
    );
    const row = rows[0];
    if (row) {
      return {
        line_user_id: row.user_id,
        session_id: row.session_id,
        diary_text: row.entry_text,
        diary_date: today,
        linked_card_id: String((row as SupabaseDiaryRow & { linked_card_id?: string }).linked_card_id ?? ""),
        completed: true,
        completed_at: row.created_at,
        created_at: row.created_at,
      } satisfies M02DiaryEntry;
    }
  }

  const entries = diaryEntries.get(lineUserId) ?? [];
  return entries.find((entry) => entry.diary_date === today) ?? null;
}

export async function createDiaryEntry(payload: M02DiaryEntry) {
  const entries = diaryEntries.get(payload.line_user_id) ?? [];
  entries.push(payload);
  diaryEntries.set(payload.line_user_id, entries);

  if (canUseSupabase()) {
    await supabaseInsert(DIARY_TABLE, {
      id: `dia_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      session_id: payload.session_id,
      user_id: payload.line_user_id,
      linked_card_id: payload.linked_card_id ?? null,
      mood_today: "",
      text_type_preference: "",
      visual_series_preference: "",
      entry_text: payload.diary_text,
      source: "m02",
      created_at: payload.created_at,
    });
  }

  return payload;
}

export function markM02Completed(lineUserId: string, _date: string) {
  void _date;
  const session = sessions.get(lineUserId);
  if (session) {
    session.status = "completed";
    session.updated_at = nowIso();
    sessions.set(lineUserId, session);
  }
}

export async function hasCompletedToday(lineUserId: string, date: string) {
  if (canUseSupabase()) {
    const rows = await supabaseRead<SupabaseDiaryRow>(
      DIARY_TABLE,
      `select=id&user_id=eq.${encodeURIComponent(lineUserId)}&source=eq.m02&created_at=gte.${encodeURIComponent(startOfTaipeiDay(date))}&created_at=lt.${encodeURIComponent(nextTaipeiDay(date))}&limit=1`,
    );
    return rows.length > 0;
  }

  const entries = diaryEntries.get(lineUserId) ?? [];
  return entries.some((entry) => entry.diary_date === date);
}

export async function getM02Session(lineUserId: string) {
  if (canUseSupabase()) {
    const rows = await supabaseRead<SupabaseEventRow>(
      INTERACTIONS_TABLE,
      `select=*&user_id=eq.${encodeURIComponent(lineUserId)}&payload->>module=eq.m02&event_type=eq.m02_session&order=created_at.desc&limit=1`,
    );
    const row = rows[0];
    if (row) {
      const status = String(row.payload?.status ?? "idle") as M02Session["status"];
      return {
        line_user_id: row.user_id,
        session_id: row.session_id,
        status,
        started_at: row.created_at,
        updated_at: row.created_at,
      } satisfies M02Session;
    }
  }

  return sessions.get(lineUserId) ?? null;
}

export async function updateM02Session(lineUserId: string, patch: Partial<M02Session>) {
  const existing = sessions.get(lineUserId) ?? createDefaultSession(lineUserId);
  const next: M02Session = {
    ...existing,
    ...patch,
    line_user_id: lineUserId,
    updated_at: nowIso(),
  };
  sessions.set(lineUserId, next);

  if (canUseSupabase()) {
    await supabaseInsert(INTERACTIONS_TABLE, {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      session_id: next.session_id,
      user_id: lineUserId,
      card_id: null,
      event_type: "m02_session",
      mood_today: "",
      text_type: "",
      visual_series: "",
      payload: {
        module: "m02",
        status: next.status,
      },
      created_at: next.updated_at,
    });
  }

  return next;
}

export async function recordM02RewardEvent(payload: M02RewardEvent) {
  const events = rewardEvents.get(payload.line_user_id) ?? [];
  events.push(payload);
  rewardEvents.set(payload.line_user_id, events);

  if (canUseSupabase()) {
    await supabaseInsert(INTERACTIONS_TABLE, {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      session_id: payload.session_id,
      user_id: payload.line_user_id,
      card_id: null,
      event_type: `m02_${payload.event_type}`,
      mood_today: "",
      text_type: "",
      visual_series: "",
      payload: {
        module: "m02",
        event_type: payload.event_type,
      },
      created_at: payload.event_time,
    });
  }

  return payload;
}

export function countCjkCharacters(text: string) {
  return (text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) ?? []).length;
}
