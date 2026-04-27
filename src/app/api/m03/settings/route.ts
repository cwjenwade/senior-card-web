import { NextRequest, NextResponse } from "next/server";

import { hasRequiredTables, syncM03Pairs, upsertParticipant } from "@/lib/jenny-product-store";

export const runtime = "nodejs";

function asText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function asBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true" || formData.get(key) === "1";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const participantId = asText(formData.get("participantId"));
  const redirectTo = asText(formData.get("redirectTo")) || `/m03?participant=${encodeURIComponent(participantId)}`;

  if (!participantId) {
    return NextResponse.redirect(new URL("/m03?error=missing-participant", request.url), 303);
  }

  const remoteReady = await hasRequiredTables(["participants", "partner_links", "care_events"]);
  if (!remoteReady) {
    return NextResponse.redirect(new URL(`/m03?participant=${encodeURIComponent(participantId)}&error=remote-schema-not-ready`, request.url), 303);
  }

  await upsertParticipant(
    participantId,
    {
      display_name: asText(formData.get("displayName")) || participantId,
      district: asText(formData.get("district")),
      wants_reminders: asBoolean(formData, "wantsReminders"),
      wants_to_help_others: asBoolean(formData, "wantsToHelpOthers"),
      wants_to_be_cared_for: asBoolean(formData, "wantsToBeCaredFor"),
      wants_chat_matching: asBoolean(formData, "wantsChatMatching"),
      is_little_angel: asBoolean(formData, "wantsToHelpOthers"),
      is_little_owner: asBoolean(formData, "wantsToBeCaredFor"),
      m03_completed_at: new Date().toISOString(),
    },
    { allowFallback: false },
  );

  await syncM03Pairs(participantId, { allowFallback: false });
  return NextResponse.redirect(new URL(redirectTo, request.url), 303);
}
