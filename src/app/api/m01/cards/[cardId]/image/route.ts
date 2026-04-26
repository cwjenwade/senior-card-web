import { NextRequest, NextResponse } from "next/server";

import { getCardById } from "@/lib/m01-cards";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await context.params;
  const card = await getCardById(cardId);

  if (!card?.imageUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "Card image is not available. CC0 fallback has been disabled.",
      },
      { status: 410 },
    );
  }

  return NextResponse.redirect(new URL(card.imageUrl), 307);
}
