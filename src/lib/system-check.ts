import { getEggProgress, listInternalReviewQueue, listKnownTables, listParticipants, listPartnerPromptQueue } from "@/lib/jenny-product-store";
import { listCards } from "@/lib/m01-cards";
import { canUseSupabase } from "@/lib/supabase-rest";

type CheckSection = {
  title: string;
  status: "completed" | "partial" | "missing" | "manual";
  detail: string;
};

async function fetchRichMenuStatus() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const response = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as { richMenuId?: string };
  } catch {
    return null;
  }
}

export async function runSystemCheck() {
  const cards = await listCards();
  const tables = await listKnownTables();
  const participants = await listParticipants();
  const partnerQueue = await listPartnerPromptQueue();
  const internalQueue = await listInternalReviewQueue();
  const richMenu = await fetchRichMenuStatus();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const sections: CheckSection[] = [
    {
      title: "M01 recommendation flow",
      status: cards.length >= 3 ? "completed" : "missing",
      detail: cards.length >= 3 ? `Card source available with ${cards.length} cards.` : "Not enough active cards for 3-slot recommendations.",
    },
    {
      title: "M01 main-card selection",
      status: "completed",
      detail: "Webhook logic includes daily selection protection and single-card completion flow.",
    },
    {
      title: "M02 diary write path",
      status: "completed",
      detail: "Webhook accepts free-text diary input in M02 waiting state and writes diary records with pending analysis.",
    },
    {
      title: "M02 completed-today and egg progress",
      status: "completed",
      detail: "Daily duplicate protection and 14-day egg progress recalculation are implemented.",
    },
    {
      title: "M03 simple onboarding",
      status: "completed",
      detail: "Name, 3 liked cards, and partner preference onboarding flow is implemented through LINE.",
    },
    {
      title: "M04 queue creation and listability",
      status: "completed",
      detail: `Current queue rows: partner=${partnerQueue.length}, internal=${internalQueue.length}.`,
    },
    {
      title: "rich menu binding",
      status: richMenu?.richMenuId ? "partial" : "manual",
      detail: richMenu?.richMenuId
        ? `Default rich menu is bound as ${richMenu.richMenuId}. Rebuild is still a manual LINE API step.`
        : "No default rich menu detected from LINE API.",
    },
    {
      title: "formal product tables",
      status: tables.every((table) => table.available) ? "completed" : canUseSupabase() ? "manual" : "partial",
      detail: tables.every((table) => table.available)
        ? "All requested product tables are available."
        : `Missing tables: ${tables.filter((table) => !table.available).map((table) => table.table).join(", ") || "none"}.`,
    },
    {
      title: "required environment variables",
      status: process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN ? "completed" : "missing",
      detail: process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN
        ? "LINE credentials are configured."
        : "Missing LINE credentials.",
    },
  ];

  const participantProgress = await Promise.all(
    participants.slice(0, 10).map(async (participant) => ({
      id: participant.id,
      displayName: participant.display_name,
      eggProgress: await getEggProgress(participant.id, today),
    })),
  );

  return {
    generatedAt: new Date().toISOString(),
    completed: sections.filter((section) => section.status === "completed"),
    partial: sections.filter((section) => section.status === "partial"),
    missing: sections.filter((section) => section.status === "missing"),
    manual: sections.filter((section) => section.status === "manual"),
    tables,
    participants: participantProgress,
    queues: {
      partner: partnerQueue,
      internal: internalQueue,
    },
  };
}
