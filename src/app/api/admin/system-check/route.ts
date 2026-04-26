import { NextResponse } from "next/server";

import { runSystemCheck } from "@/lib/system-check";

export const runtime = "nodejs";

export async function GET() {
  const report = await runSystemCheck();
  return NextResponse.json(report);
}
