import Link from "next/link";

import { getTodayInTaipei } from "@/lib/m02-diary-store";
import { getUserDailyCheckin, getUserDailyMood, listParticipants } from "@/lib/jenny-product-store";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const today = getTodayInTaipei();
  const participants = await listParticipants();
  const rows = await Promise.all(
    participants.map(async (participant) => ({
      participant,
      mood: await getUserDailyMood(participant.id, today),
      checkin: await getUserDailyCheckin(participant.id, today),
    })),
  );

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="rounded-3xl border border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(135deg,_rgba(28,25,23,0.98),_rgba(17,24,39,0.98))] p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Users</p>
              <h1 className="mt-3 text-4xl font-semibold text-stone-50">使用者查詢</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">查看基本資料、行政區、今日心情，以及今天是否已打卡領取。</p>
            </div>
            <Link className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-100" href="/">
              回 Dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-700 px-4 py-6 text-sm text-stone-400">目前還沒有使用者資料。</p>
            ) : (
              rows.map(({ participant, mood, checkin }) => (
                <article className="rounded-3xl border border-stone-800 p-5" key={participant.id}>
                  <h2 className="text-lg font-semibold">{participant.display_name || participant.id}</h2>
                  <p className="mt-1 text-xs text-stone-500">{participant.id}</p>
                  <div className="mt-4 space-y-2 text-sm text-stone-300">
                    <p>行政區：{participant.district || "未設定"}</p>
                    <p>今日心情：{mood?.mood || "尚未選擇"}</p>
                    <p>今日打卡：{checkin ? "已建立" : "尚未建立"}</p>
                    <p>今日領取：{checkin?.claimed_today ? "已領取" : "尚未領取"}</p>
                    <p>季度：{checkin?.claim_season || "未建立"}</p>
                    <p>M03 角色：{participant.is_little_angel ? "小天使" : "未開啟"} / {participant.is_little_owner ? "小主人" : "未開啟"}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
