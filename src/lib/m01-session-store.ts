type M01Session = {
  line_user_id: string;
  session_id: string;
  step: "idle" | "waiting_for_mood" | "waiting_for_series" | "waiting_for_card_selection" | "completed";
  mood_today: string;
  text_type_preference: string;
  visual_series_preference: string;
  recommended_card_ids: string[];
  selected_card_id: string;
  completed_date: string;
  created_at: string;
  updated_at: string;
};

type CardFeedbackEvent = {
  line_user_id: string;
  session_id: string;
  card_id: string;
  event_type: "shown" | "selected" | "refreshed";
  event_time: string;
  mood_today?: string;
  text_type_preference?: string;
  visual_series_preference?: string;
};

type SupabaseEventRow = {
  id: string;
  session_id: string;
  user_id: string;
  card_id: string | null;
  event_type: string;
  mood_today: string | null;
  text_type: string | null;
  visual_series: string | null;
  payload: Record<string, string | string[] | boolean | number | null> | null;
  created_at: string;
};

const sessions = new Map<string, M01Session>();
const feedbackEvents = new Map<string, CardFeedbackEvent[]>();
const INTERACTIONS_TABLE = process.env.SUPABASE_INTERACTIONS_TABLE || "line_interaction_events";

function nowIso() {
  return new Date().toISOString();
}

function createDefaultSession(lineUserId: string): M01Session {
  const now = nowIso();
  return {
    line_user_id: lineUserId,
    session_id: `m01-${lineUserId}-${Date.now()}`,
    step: "idle",
    mood_today: "",
    text_type_preference: "",
    visual_series_preference: "",
    recommended_card_ids: [],
    selected_card_id: "",
    completed_date: "",
    created_at: now,
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

async function supabaseInsert(record: Record<string, unknown>) {
  const baseUrl = resolveSupabaseRestUrl();
  const headers = supabaseHeaders();
  if (!baseUrl || !headers) return false;

  const response = await fetch(`${baseUrl}/${INTERACTIONS_TABLE}`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(record),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(`Supabase insert failed: ${response.status} ${await response.text()}`);
    return false;
  }

  return true;
}

async function supabaseRead(query: string) {
  const baseUrl = resolveSupabaseRestUrl();
  const headers = supabaseHeaders();
  if (!baseUrl || !headers) return [] as SupabaseEventRow[];

  const response = await fetch(`${baseUrl}/${INTERACTIONS_TABLE}?${query}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(`Supabase read failed: ${response.status} ${await response.text()}`);
    return [] as SupabaseEventRow[];
  }

  return (await response.json()) as SupabaseEventRow[];
}

function startOfTaipeiDay(date: string) {
  return `${date}T00:00:00+08:00`;
}

export async function getSession(lineUserId: string) {
  if (canUseSupabase()) {
    const rows = await supabaseRead(
      `select=*&user_id=eq.${encodeURIComponent(lineUserId)}&event_type=eq.m01_session&order=created_at.desc&limit=1`,
    );
    const row = rows[0];
    if (row) {
      const payload = row.payload ?? {};
      return {
        line_user_id: row.user_id,
        session_id: row.session_id,
        step: String(payload.step ?? "idle") as M01Session["step"],
        mood_today: String(payload.mood_today ?? ""),
        text_type_preference: String(payload.text_type_preference ?? ""),
        visual_series_preference: String(payload.visual_series_preference ?? ""),
        recommended_card_ids: Array.isArray(payload.recommended_card_ids)
          ? payload.recommended_card_ids.map((value) => String(value))
          : [],
        selected_card_id: String(payload.selected_card_id ?? ""),
        completed_date: String(payload.completed_date ?? ""),
        created_at: row.created_at,
        updated_at: row.created_at,
      } satisfies M01Session;
    }
  }

  return sessions.get(lineUserId) ?? null;
}

export async function updateSession(lineUserId: string, patch: Partial<M01Session>) {
  // Vercel serverless does not guarantee in-memory persistence.
  // Production should use durable storage if true session snapshots are required.
  const existing = sessions.get(lineUserId) ?? createDefaultSession(lineUserId);
  const next: M01Session = {
    ...existing,
    ...patch,
    line_user_id: lineUserId,
    updated_at: nowIso(),
  };
  sessions.set(lineUserId, next);

  if (canUseSupabase()) {
    await supabaseInsert({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      session_id: next.session_id,
      user_id: lineUserId,
      card_id: null,
      event_type: "m01_session",
      mood_today: next.mood_today,
      text_type: next.text_type_preference,
      visual_series: next.visual_series_preference,
      payload: {
        module: "m01",
        step: next.step,
        mood_today: next.mood_today,
        text_type_preference: next.text_type_preference,
        visual_series_preference: next.visual_series_preference,
        recommended_card_ids: next.recommended_card_ids,
        selected_card_id: next.selected_card_id,
        completed_date: next.completed_date,
      },
      created_at: next.updated_at,
    });
  }

  return next;
}

export async function recordCardFeedback(payload: CardFeedbackEvent) {
  const localEvents = feedbackEvents.get(payload.line_user_id) ?? [];
  localEvents.push(payload);
  feedbackEvents.set(payload.line_user_id, localEvents);

  if (canUseSupabase()) {
    await supabaseInsert({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      session_id: payload.session_id,
      user_id: payload.line_user_id,
      card_id: payload.card_id,
      event_type: payload.event_type,
      mood_today: payload.mood_today ?? "",
      text_type: payload.text_type_preference ?? "",
      visual_series: payload.visual_series_preference ?? "",
      payload: {
        module: "m01",
      },
      created_at: payload.event_time,
    });
  }

  return payload;
}

export async function getRecentShownCardIds(lineUserId: string, limit = 12) {
  if (canUseSupabase()) {
    const rows = await supabaseRead(
      `select=card_id,event_type,user_id,created_at&user_id=eq.${encodeURIComponent(lineUserId)}&event_type=eq.shown&order=created_at.desc&limit=${limit}`,
    );
    return rows.map((row) => row.card_id).filter(Boolean) as string[];
  }

  const events = feedbackEvents.get(lineUserId) ?? [];
  return [...events]
    .reverse()
    .filter((event) => event.event_type === "shown")
    .slice(0, limit)
    .map((event) => event.card_id);
}

export async function hasCompletedM01Today(lineUserId: string, date: string) {
  if (canUseSupabase()) {
    const rows = await supabaseRead(
      `select=id&user_id=eq.${encodeURIComponent(lineUserId)}&event_type=eq.selected&created_at=gte.${encodeURIComponent(startOfTaipeiDay(date))}&limit=1`,
    );
    return rows.length > 0;
  }

  return sessions.get(lineUserId)?.completed_date === date;
}

export function markM01Completed(lineUserId: string, date: string) {
  const session = sessions.get(lineUserId);
  if (session) {
    session.completed_date = date;
    session.updated_at = nowIso();
    sessions.set(lineUserId, session);
  }
}
