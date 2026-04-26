import { NextRequest, NextResponse } from "next/server";

import { getSupabaseStorageConfig, runSupabaseKeepalive } from "@/lib/m01-storage";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = getSupabaseStorageConfig();
    const results = await runSupabaseKeepalive();

    return NextResponse.json({
      ok: true,
      route: "/api/cron/supabase-keepalive",
      storage: config,
      results,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        route: "/api/cron/supabase-keepalive",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
