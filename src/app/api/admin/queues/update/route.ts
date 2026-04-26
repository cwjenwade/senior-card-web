import { NextRequest, NextResponse } from "next/server";

import { updateInternalReviewStatus, updatePartnerPromptStatus } from "@/lib/jenny-product-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const queueType = String(formData.get("queueType") ?? "");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  if (!id || !status) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 303);
  }

  if (queueType === "partner") {
    await updatePartnerPromptStatus(id, status);
  } else {
    await updateInternalReviewStatus(id, status);
  }

  return NextResponse.redirect(new URL(redirectTo, request.url), 303);
}
