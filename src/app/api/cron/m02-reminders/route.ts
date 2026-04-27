import { NextRequest, NextResponse } from "next/server";

import { listParticipants } from "@/lib/jenny-product-store";
import { getTodayInTaipei, hasCompletedToday, hasReminderBeenSent, recordM02RewardEvent } from "@/lib/m02-diary-store";

export const runtime = "nodejs";

function taipeiHour() {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Taipei",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
}

async function pushLineMessage(userId: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return false;

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text }],
    }),
  });

  return response.ok;
}

export async function GET(request: NextRequest) {
  const today = getTodayInTaipei();
  const dryRun = request.nextUrl.searchParams.get("dry_run") === "1";
  const forcedHour = Number(request.nextUrl.searchParams.get("hour") ?? "");
  const hour = forcedHour === 18 || forcedHour === 20 ? forcedHour : taipeiHour();

  if (hour !== 18 && hour !== 20) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      detail: "Reminder route only runs at 18:00 or 20:00 Taipei time.",
      hour,
    });
  }

  const reminderText =
    hour === 18
      ? "今天如果還沒寫一句日記，晚餐後記得來寫一下喔。慢慢寫，滿 50 字就算完成今天的進度。"
      : "晚上八點了，如果今天還沒留下心情，現在補一段也來得及。寫滿 50 字，就能算進今天的雞蛋進度。";

  const participants = await listParticipants();
  const eligible = [];

  for (const participant of participants) {
    if (!participant.reminder_opt_in) continue;
    if (await hasCompletedToday(participant.id, today)) continue;
    if (await hasReminderBeenSent(participant.id, today, hour as 18 | 20)) continue;
    eligible.push(participant);
  }

  const results = [];
  for (const participant of eligible) {
    const sent = dryRun ? true : await pushLineMessage(participant.id, reminderText);
    if (sent) {
      await recordM02RewardEvent({
        line_user_id: participant.id,
        session_id: `m02-reminder-${participant.id}-${today}-${hour}`,
        event_type: hour === 18 ? "reminder_18" : "reminder_20",
        event_time: new Date().toISOString(),
      });
    }
    results.push({
      participantId: participant.id,
      sent,
      dryRun,
      hour,
    });
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    hour,
    today,
    eligibleCount: eligible.length,
    results,
  });
}
