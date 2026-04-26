type M01Session = {
  line_user_id: string;
  session_id: string;
  mood_today: string;
  text_type_preference: string;
  visual_series_preference: string;
  recommended_card_ids: string[];
  selected_card_id: string;
  created_at: string;
  updated_at: string;
};

type CardFeedbackEvent = {
  line_user_id: string;
  session_id: string;
  card_id: string;
  event_type: "shown" | "selected" | "disliked" | "refreshed";
  event_time: string;
};

const sessions = new Map<string, M01Session>();
const feedbackEvents = new Map<string, CardFeedbackEvent[]>();

function nowIso() {
  return new Date().toISOString();
}

function createDefaultSession(lineUserId: string): M01Session {
  const now = nowIso();
  return {
    line_user_id: lineUserId,
    session_id: `m01-${lineUserId}-${Date.now()}`,
    mood_today: "",
    text_type_preference: "",
    visual_series_preference: "",
    recommended_card_ids: [],
    selected_card_id: "",
    created_at: now,
    updated_at: now,
  };
}

export function getSession(lineUserId: string) {
  return sessions.get(lineUserId) ?? null;
}

export function updateSession(lineUserId: string, patch: Partial<M01Session>) {
  // Vercel serverless does not guarantee in-memory persistence.
  // Production should move this store to Supabase or another durable database.
  const existing = sessions.get(lineUserId) ?? createDefaultSession(lineUserId);
  const next: M01Session = {
    ...existing,
    ...patch,
    line_user_id: lineUserId,
    updated_at: nowIso(),
  };
  sessions.set(lineUserId, next);
  return next;
}

export function recordCardFeedback(payload: CardFeedbackEvent) {
  // Vercel serverless does not guarantee in-memory persistence.
  // Production should move this event log to Supabase or another durable database.
  const existing = feedbackEvents.get(payload.line_user_id) ?? [];
  existing.push(payload);
  feedbackEvents.set(payload.line_user_id, existing);
  return payload;
}

export function getRecentShownCardIds(lineUserId: string, limit = 12) {
  const events = feedbackEvents.get(lineUserId) ?? [];
  return [...events]
    .reverse()
    .filter((event) => event.event_type === "shown")
    .slice(0, limit)
    .map((event) => event.card_id);
}

export function getDislikedCardIds(lineUserId: string) {
  const events = feedbackEvents.get(lineUserId) ?? [];
  return [...new Set(events.filter((event) => event.event_type === "disliked").map((event) => event.card_id))];
}
