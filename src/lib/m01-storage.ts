import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { type TextType, type VisualSeries } from "@/lib/m01-cards";

export type StoredInteractionEvent = {
  id: string;
  userId: string;
  sessionId: string;
  eventType:
    | "keyword_triggered"
    | "mood_selected"
    | "text_type_selected"
    | "visual_series_selected"
    | "shown"
    | "selected"
    | "disliked"
    | "reshuffled"
    | "used_for_diary";
  cardId: string | null;
  moodToday: string;
  textType: string;
  visualSeries: string;
  payload: Record<string, string | string[] | boolean | number | null>;
  createdAt: string;
};

export type StoredDiaryEntry = {
  id: string;
  userId: string;
  sessionId: string;
  linkedCardId: string | null;
  moodToday: string;
  textTypePreference: string;
  visualSeriesPreference: string;
  entryText: string;
  source: "line_text";
  createdAt: string;
};

const INTERACTIONS_TABLE = process.env.SUPABASE_INTERACTIONS_TABLE || "line_interaction_events";
const DIARY_TABLE = process.env.SUPABASE_DIARY_TABLE || "line_diary_entries";

function storageDir() {
  return process.env.M01_STORAGE_DIR || (process.env.VERCEL ? "/tmp/jenny-m01" : path.join(process.cwd(), "storage"));
}

function interactionsPath() {
  return path.join(storageDir(), "m01_line_events.jsonl");
}

function diaryPath() {
  return path.join(storageDir(), "m01_diary_entries.jsonl");
}

async function ensureStorageDir() {
  await mkdir(storageDir(), { recursive: true });
}

async function appendJsonl(filePath: string, record: unknown) {
  await ensureStorageDir();
  let existing = "";
  try {
    await stat(filePath);
    existing = await readFile(filePath, "utf8");
  } catch {
    existing = "";
  }
  const next = `${existing}${existing.endsWith("\n") || existing.length === 0 ? "" : "\n"}${JSON.stringify(record)}\n`;
  await writeFile(filePath, next, "utf8");
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  try {
    const content = await readFile(filePath, "utf8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
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

async function supabaseInsert(table: string, record: unknown) {
  const baseUrl = resolveSupabaseRestUrl();
  const headers = supabaseHeaders();
  if (!baseUrl || !headers) {
    throw new Error("Supabase env is not configured");
  }

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
    const text = await response.text();
    throw new Error(`Supabase insert failed for ${table}: ${response.status} ${text}`);
  }
}

async function supabaseRead<T>(table: string, query: string) {
  const baseUrl = resolveSupabaseRestUrl();
  const headers = supabaseHeaders();
  if (!baseUrl || !headers) {
    throw new Error("Supabase env is not configured");
  }

  const response = await fetch(`${baseUrl}/${table}?${query}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase read failed for ${table}: ${response.status} ${text}`);
  }

  return (await response.json()) as T[];
}

export async function appendInteractionEvent(event: StoredInteractionEvent) {
  if (canUseSupabase()) {
    try {
      await supabaseInsert(INTERACTIONS_TABLE, {
        id: event.id,
        session_id: event.sessionId,
        user_id: event.userId,
        card_id: event.cardId,
        event_type: event.eventType,
        mood_today: event.moodToday,
        text_type: event.textType,
        visual_series: event.visualSeries,
        payload: event.payload,
        created_at: event.createdAt,
      });
      return;
    } catch (error) {
      console.error(error);
    }
  }
  await appendJsonl(interactionsPath(), event);
}

export async function appendDiaryEntry(entry: StoredDiaryEntry) {
  if (canUseSupabase()) {
    try {
      await supabaseInsert(DIARY_TABLE, {
        id: entry.id,
        session_id: entry.sessionId,
        user_id: entry.userId,
        linked_card_id: entry.linkedCardId,
        mood_today: entry.moodToday,
        text_type_preference: entry.textTypePreference,
        visual_series_preference: entry.visualSeriesPreference,
        entry_text: entry.entryText,
        source: entry.source,
        created_at: entry.createdAt,
      });
      return;
    } catch (error) {
      console.error(error);
    }
  }
  await appendJsonl(diaryPath(), entry);
}

export async function readInteractionEvents() {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRead<{
        id: string;
        session_id: string;
        user_id: string;
        card_id: string | null;
        event_type: StoredInteractionEvent["eventType"];
        mood_today: string;
        text_type: string;
        visual_series: string;
        payload: Record<string, string | string[] | boolean | number | null>;
        created_at: string;
      }>(INTERACTIONS_TABLE, "select=*&order=created_at.asc");
      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        cardId: row.card_id,
        eventType: row.event_type,
        moodToday: row.mood_today,
        textType: row.text_type,
        visualSeries: row.visual_series,
        payload: row.payload || {},
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error(error);
    }
  }
  return readJsonl<StoredInteractionEvent>(interactionsPath());
}

export async function readDiaryEntries() {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRead<{
        id: string;
        session_id: string;
        user_id: string;
        linked_card_id: string | null;
        mood_today: string;
        text_type_preference: string;
        visual_series_preference: string;
        entry_text: string;
        source: "line_text";
        created_at: string;
      }>(DIARY_TABLE, "select=*&order=created_at.asc");
      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        linkedCardId: row.linked_card_id,
        moodToday: row.mood_today,
        textTypePreference: row.text_type_preference,
        visualSeriesPreference: row.visual_series_preference,
        entryText: row.entry_text,
        source: row.source,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error(error);
    }
  }
  return readJsonl<StoredDiaryEntry>(diaryPath());
}

export async function findLatestSelection(userId: string) {
  if (canUseSupabase()) {
    try {
      const rows = await supabaseRead<{
        id: string;
        session_id: string;
        user_id: string;
        card_id: string | null;
        event_type: StoredInteractionEvent["eventType"];
        mood_today: string;
        text_type: string;
        visual_series: string;
        payload: Record<string, string | string[] | boolean | number | null>;
        created_at: string;
      }>(
        INTERACTIONS_TABLE,
        `select=*&user_id=eq.${encodeURIComponent(userId)}&event_type=eq.selected&order=created_at.desc&limit=1`,
      );
      const row = rows[0];
      if (row) {
        return {
          id: row.id,
          userId: row.user_id,
          sessionId: row.session_id,
          cardId: row.card_id,
          eventType: row.event_type,
          moodToday: row.mood_today,
          textType: row.text_type,
          visualSeries: row.visual_series,
          payload: row.payload || {},
          createdAt: row.created_at,
        } satisfies StoredInteractionEvent;
      }
    } catch (error) {
      console.error(error);
    }
  }

  const events = await readInteractionEvents();
  return [...events].reverse().find((event) => event.userId === userId && event.eventType === "selected");
}

export function createEventRecord(input: {
  userId: string;
  sessionId: string;
  eventType: StoredInteractionEvent["eventType"];
  cardId?: string | null;
  moodToday?: string;
  textType?: TextType | string;
  visualSeries?: VisualSeries | string;
  payload?: Record<string, string | string[] | boolean | number | null>;
}) {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    sessionId: input.sessionId,
    eventType: input.eventType,
    cardId: input.cardId ?? null,
    moodToday: input.moodToday ?? "",
    textType: input.textType ?? "",
    visualSeries: input.visualSeries ?? "",
    payload: input.payload ?? {},
    createdAt: new Date().toISOString(),
  } satisfies StoredInteractionEvent;
}

export function createDiaryRecord(input: {
  userId: string;
  sessionId: string;
  linkedCardId?: string | null;
  moodToday?: string;
  textTypePreference?: string;
  visualSeriesPreference?: string;
  entryText: string;
}) {
  return {
    id: `dia_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    sessionId: input.sessionId,
    linkedCardId: input.linkedCardId ?? null,
    moodToday: input.moodToday ?? "",
    textTypePreference: input.textTypePreference ?? "",
    visualSeriesPreference: input.visualSeriesPreference ?? "",
    entryText: input.entryText,
    source: "line_text",
    createdAt: new Date().toISOString(),
  } satisfies StoredDiaryEntry;
}
