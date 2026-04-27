import { NextRequest, NextResponse } from "next/server";

import {
  getParticipant,
  hasRequiredTables,
  listPartnerLinks,
  recordCareEvent,
  syncM03Pairs,
  upsertParticipant,
  upsertPartnerLink,
  type PartnerLinkRow,
} from "@/lib/jenny-product-store";

export const runtime = "nodejs";

function asText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function findLink(links: PartnerLinkRow[], participantId: string, linkType: PartnerLinkRow["link_type"]) {
  return links.find((row) => row.participant_id === participantId && row.link_type === linkType && row.status !== "closed") ?? null;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const participantId = asText(formData.get("participantId"));
  const intent = asText(formData.get("intent"));
  const redirectTo = asText(formData.get("redirectTo")) || `/m03?participant=${encodeURIComponent(participantId)}`;

  if (!participantId) {
    return NextResponse.redirect(new URL("/m03?error=missing-participant", request.url), 303);
  }

  const remoteReady = await hasRequiredTables(["participants", "partner_links", "care_events"]);
  if (!remoteReady) {
    return NextResponse.redirect(new URL(`/m03?participant=${encodeURIComponent(participantId)}&error=remote-schema-not-ready`, request.url), 303);
  }

  const participant = await getParticipant(participantId, { allowFallback: false });
  if (!participant) {
    return NextResponse.redirect(new URL(`/m03?participant=${encodeURIComponent(participantId)}&error=participant-not-found`, request.url), 303);
  }

  const links = await listPartnerLinks(participantId, { allowFallback: false });
  const careLink = findLink(links, participantId, "care_pair");
  const chatLink = findLink(links, participantId, "chat_pair");
  const now = new Date().toISOString();

  if (intent === "send_greeting" || intent === "request_care" || intent === "willing_to_call" || intent === "mark_available") {
    const target =
      intent === "request_care"
        ? careLink?.partner_participant_id ?? "care-pool"
        : intent === "send_greeting" || intent === "willing_to_call"
          ? careLink?.partner_participant_id ?? "care-pool"
          : "care-pool";

    await recordCareEvent(
      {
        event_id: `care-event-${participantId}-${Date.now()}`,
        participant_id: participantId,
        target_participant_id: target,
        event_type: intent,
        note:
          intent === "send_greeting"
            ? "送出今天的問候"
            : intent === "request_care"
              ? "今天想找人聊聊"
              : intent === "willing_to_call"
                ? "今天願意打電話關心人"
                : "今天可以被安排關懷任務",
        created_at: now,
      },
      { allowFallback: false },
    );

    if (intent === "mark_available") {
      await syncM03Pairs(participantId, { allowFallback: false });
    }
    return NextResponse.redirect(new URL(redirectTo, request.url), 303);
  }

  if (intent === "pause_chat" && chatLink) {
    await upsertPartnerLink({ ...chatLink, status: "paused", match_status: "paused", updated_at: now }, { allowFallback: false });
    await recordCareEvent(
      {
        event_id: `care-event-${participantId}-${Date.now()}`,
        participant_id: participantId,
        target_participant_id: chatLink.partner_participant_id,
        event_type: "pause_matching",
        note: "暫停聊天配對",
        created_at: now,
      },
      { allowFallback: false },
    );
  }

  if (intent === "resume_chat") {
    if (chatLink) {
      await upsertPartnerLink({ ...chatLink, status: chatLink.partner_participant_id === "chat-pool" ? "pending" : "matched", match_status: chatLink.partner_participant_id === "chat-pool" ? "pending" : "matched", updated_at: now }, { allowFallback: false });
    }
    await syncM03Pairs(participantId, { allowFallback: false });
  }

  if (intent === "exit_chat") {
    await upsertParticipant(
      participantId,
      {
        wants_chat_matching: false,
      },
      { allowFallback: false },
    );
    if (chatLink) {
      await upsertPartnerLink({ ...chatLink, status: "closed", match_status: "closed", updated_at: now }, { allowFallback: false });
    }
  }

  return NextResponse.redirect(new URL(redirectTo, request.url), 303);
}
