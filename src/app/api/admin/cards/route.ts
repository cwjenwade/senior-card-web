import { NextRequest, NextResponse } from "next/server";

import { isCloudinaryConfigured, uploadCardImageToCloudinary } from "@/lib/cloudinary";
import { deleteDraftCards, setCardCatalogStatus, upsertCardCatalog, type CardStatus, type TextType, type VisualSeries } from "@/lib/m01-cards";

export const runtime = "nodejs";

function asText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function slugToTitle(filename: string) {
  return filename
    .replace(/\.[^.]+$/u, "")
    .replace(/[_-]+/gu, " ")
    .trim() || "未命名圖卡";
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

  if (intent === "batch_set_status") {
    const cardIds = formData.getAll("cardIds").map((value) => String(value)).filter(Boolean);
    const status = asText(formData.get("status")) as CardStatus;
    for (const cardId of cardIds) {
      await setCardCatalogStatus(cardId, status);
    }
    return NextResponse.redirect(new URL(redirectTo, request.url), 303);
  }

  if (intent === "delete_drafts") {
    const cardIds = formData.getAll("cardIds").map((value) => String(value)).filter(Boolean);
    await deleteDraftCards(cardIds);
    return NextResponse.redirect(new URL(redirectTo, request.url), 303);
  }

  if (intent === "batch_update") {
    const rows = JSON.parse(asText(formData.get("rows")) || "[]") as Array<Record<string, string>>;
    for (const row of rows) {
      await upsertCardCatalog({
        cardId: row.cardId || undefined,
        cardTitle: row.cardTitle || "未命名圖卡",
        imageProvider: row.imageProvider || "cloudinary",
        imageUrl: row.imageUrl || "",
        imageKey: row.imageKey || "",
        styleMain: (row.styleMain || "問安語") as TextType,
        styleSub: row.styleSub || "",
        tone: (row.tone || "溫和") as "溫和" | "明亮" | "平靜" | "陪伴",
        imagery: (row.imagery || "花系列") as VisualSeries,
        textDensity: (row.textDensity || "short") as "short" | "medium",
        energyLevel: (row.energyLevel || "steady") as "steady" | "uplift" | "calm",
        captionText: row.captionText || "",
        defaultPrompt: row.defaultPrompt || "",
        status: (row.status || "draft") as CardStatus,
        uploadedBy: row.uploadedBy || "admin-ui",
      });
    }
    return NextResponse.redirect(new URL(redirectTo, request.url), 303);
  }

  if (intent === "batch_upload") {
    const files = formData.getAll("imageFiles").filter((value): value is File => value instanceof File && value.size > 0);
    if (!isCloudinaryConfigured()) {
      return NextResponse.redirect(new URL("/cards?error=missing-cloudinary-config", request.url), 303);
    }
    for (const file of files) {
      const uploaded = await uploadCardImageToCloudinary(file);
      await upsertCardCatalog({
        cardTitle: slugToTitle(file.name),
        imageProvider: uploaded.provider,
        imageUrl: uploaded.imageUrl,
        imageKey: uploaded.imageKey,
        styleMain: "問安語",
        styleSub: "",
        tone: "溫和",
        imagery: "花系列",
        textDensity: "short",
        energyLevel: "steady",
        captionText: "",
        defaultPrompt: "",
        status: "draft",
        uploadedBy: "cards-batch-upload",
      });
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
