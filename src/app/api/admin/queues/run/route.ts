import { NextRequest, NextResponse } from "next/server";

import { runQueueDetection } from "@/lib/jenny-product-store";
import { getTodayInTaipei } from "@/lib/m02-diary-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  await runQueueDetection(getTodayInTaipei());
  return NextResponse.redirect(new URL("/", request.url), 303);
}
