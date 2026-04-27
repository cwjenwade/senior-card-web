import { NextRequest, NextResponse } from "next/server";

import { isCloudinaryConfigured, uploadCardImageToCloudinary } from "@/lib/cloudinary";
import { setCardCatalogStatus, upsertCardCatalog, type CardStatus, type TextType, type VisualSeries } from "@/lib/m01-cards";

export const runtime = "nodejs";

function asText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const intent = asText(formData.get("intent"));
  const redirectTo = asText(formData.get("redirectTo")) || "/cards";

  if (intent === "set_status") {
    const cardId = asText(formData.get("cardId"));
    const status = asText(formData.get("status")) as CardStatus;

    if (cardId && status) {
      await setCardCatalogStatus(cardId, status);
    }

    return NextResponse.redirect(new URL(redirectTo, request.url), 303);
  }

  const uploadFile = formData.get("imageFile");
  let imageProvider = asText(formData.get("imageProvider")) || "cloudinary";
  let imageUrl = asText(formData.get("imageUrl"));
  let imageKey = asText(formData.get("imageKey"));

  if (uploadFile instanceof File && uploadFile.size > 0) {
    if (!isCloudinaryConfigured()) {
      return NextResponse.redirect(new URL("/cards?error=missing-cloudinary-config", request.url), 303);
    }
    const uploaded = await uploadCardImageToCloudinary(uploadFile);
    imageProvider = uploaded.provider;
    imageUrl = uploaded.imageUrl;
    imageKey = uploaded.imageKey;
  }

  await upsertCardCatalog({
    cardId: asText(formData.get("cardId")) || undefined,
    cardTitle: asText(formData.get("cardTitle")),
    imageProvider,
    imageUrl,
    imageKey,
    styleMain: asText(formData.get("styleMain")) as TextType,
    styleSub: asText(formData.get("styleSub")),
    tone: asText(formData.get("tone")) as "溫和" | "明亮" | "平靜" | "陪伴",
    imagery: asText(formData.get("imagery")) as VisualSeries,
    textDensity: asText(formData.get("textDensity")) as "short" | "medium",
    energyLevel: asText(formData.get("energyLevel")) as "steady" | "uplift" | "calm",
    captionText: asText(formData.get("captionText")),
    defaultPrompt: asText(formData.get("defaultPrompt")),
    status: asText(formData.get("status")) as CardStatus,
    uploadedBy: asText(formData.get("uploadedBy")) || "admin-ui",
  });

  return NextResponse.redirect(new URL(redirectTo, request.url), 303);
}
