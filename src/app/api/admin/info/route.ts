import { NextRequest, NextResponse } from "next/server";

import { getCommunityInfo, upsertCommunityInfo, type CommunityInfoRow } from "@/lib/jenny-product-store";

export const runtime = "nodejs";

function asText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const redirectTo = asText(formData.get("redirectTo")) || "/info-admin";
  const infoId = asText(formData.get("infoId"));
  const existing = infoId ? await getCommunityInfo(infoId) : null;
  const now = new Date().toISOString();

  const row: CommunityInfoRow = {
    info_id: infoId || `info-${Date.now()}`,
    title: asText(formData.get("title")),
    category: asText(formData.get("category")) as CommunityInfoRow["category"],
    description: asText(formData.get("description")),
    event_date: asText(formData.get("eventDate")) || null,
    location: asText(formData.get("location")),
    contact: asText(formData.get("contact")),
    status: asText(formData.get("status")) || "active",
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  await upsertCommunityInfo(row);
  return NextResponse.redirect(new URL(redirectTo, request.url), 303);
}
