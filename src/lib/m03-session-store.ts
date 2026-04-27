import { canUseSupabase, supabaseInsert, supabaseSelect } from "@/lib/supabase-rest";

type M03Session = {
  line_user_id: string;
  session_id: string;
  step: "idle" | "waiting_for_name" | "waiting_for_reminder" | "waiting_for_ambassador" | "waiting_for_care" | "waiting_for_chat";
  display_name: string;
  reminder_opt_in: string;
  care_ambassador_opt_in: string;
  wants_care: string;
  chat_match_opt_in: string;
  updated_at: string;
};

type SupabaseEventRow = {
  session_id: string;
  user_id: string;
  payload: Record<string, string | string[] | boolean | number | null> | null;
  created_at: string;
};

const sessions = new Map<string, M03Session>();
const INTERACTIONS_TABLE = process.env.SUPABASE_INTERACTIONS_TABLE || "line_interaction_events";

function nowIso() {
  return new Date().toISOString();
}

function createDefault(lineUserId: string): M03Session {
  return {
    line_user_id: lineUserId,
    session_id: `m03-${lineUserId}-${Date.now()}`,
    step: "idle",
    display_name: "",
    reminder_opt_in: "",
    care_ambassador_opt_in: "",
    wants_care: "",
    chat_match_opt_in: "",
    updated_at: nowIso(),
  };
}

export async function getM03Session(lineUserId: string) {
  if (canUseSupabase()) {
    const rows = await supabaseSelect<SupabaseEventRow>(
      INTERACTIONS_TABLE,
      `select=*&user_id=eq.${encodeURIComponent(lineUserId)}&event_type=eq.m03_session&order=created_at.desc&limit=1`,
    );
    const row = rows[0];
    if (row) {
      return {
        line_user_id: row.user_id,
        session_id: row.session_id,
        step: String(row.payload?.step ?? "idle") as M03Session["step"],
        display_name: String(row.payload?.display_name ?? ""),
        reminder_opt_in: String(row.payload?.reminder_opt_in ?? ""),
        care_ambassador_opt_in: String(row.payload?.care_ambassador_opt_in ?? ""),
        wants_care: String(row.payload?.wants_care ?? ""),
        chat_match_opt_in: String(row.payload?.chat_match_opt_in ?? ""),
        updated_at: row.created_at,
      } satisfies M03Session;
    }
  }

  return sessions.get(lineUserId) ?? null;
}

export async function updateM03Session(lineUserId: string, patch: Partial<M03Session>) {
  const existing = sessions.get(lineUserId) ?? createDefault(lineUserId);
  const next: M03Session = {
    ...existing,
    ...patch,
    line_user_id: lineUserId,
    updated_at: nowIso(),
  };
  sessions.set(lineUserId, next);

  if (canUseSupabase()) {
    await supabaseInsert(
      INTERACTIONS_TABLE,
      [
        {
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          session_id: next.session_id,
          user_id: lineUserId,
          card_id: null,
          event_type: "m03_session",
          mood_today: "",
          text_type: "",
          visual_series: "",
          payload: {
            module: "m03",
            step: next.step,
            display_name: next.display_name,
            reminder_opt_in: next.reminder_opt_in,
            care_ambassador_opt_in: next.care_ambassador_opt_in,
            wants_care: next.wants_care,
            chat_match_opt_in: next.chat_match_opt_in,
          },
          created_at: next.updated_at,
        },
      ],
      false,
    );
  }

  return next;
}
