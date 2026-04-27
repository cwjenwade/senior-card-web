import Link from "next/link";

import { getTodayInTaipei } from "@/lib/m02-diary-store";
import { getEggProgress, listDiaryEntries, listParticipants } from "@/lib/jenny-product-store";

export const dynamic = "force-dynamic";

export default async function M02AdminPage() {
  const today = getTodayInTaipei();
  const [entries, participants] = await Promise.all([listDiaryEntries(), listParticipants()]);
  const participantMap = new Map(participants.map((participant) => [participant.id, participant]));
  const progressRows = await Promise.all(
    participants.map(async (participant) => ({
      participant,
      progress: await getEggProgress(participant.id, today),
    })),
  );

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="rounded-3xl border border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_35%),linear-gradient(135deg,_rgba(28,25,23,0.98),_rgba(17,24,39,0.98))] p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-amber-300">M02 Admin</p>
              <h1 className="mt-3 text-4xl font-semibold text-stone-50">日記與雞蛋監看</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">查看使用次數、日記內容與 14 天雞蛋進度。</p>
            </div>
            <Link className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-100" href="/">
              回 Dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
          <h2 className="text-xl font-semibold">14 天進度</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {progressRows.map(({ participant, progress }) => (
              <article className="rounded-3xl border border-stone-800 p-5" key={participant.id}>
                <h3 className="text-lg font-semibold">{participant.display_name || participant.id}</h3>
                <p className="mt-2 text-sm text-stone-300">14 天完成：{progress?.days_completed ?? 0} 天</p>
                <p className="mt-1 text-sm text-stone-300">雞蛋資格：{progress?.egg_box_eligible ? "已達標" : "未達標"}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
          <h2 className="text-xl font-semibold">日記紀錄</h2>
          <div className="mt-4 space-y-4">
            {entries.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-700 px-4 py-6 text-sm text-stone-400">目前還沒有日記紀錄。</p>
            ) : (
              entries.map((entry) => (
                <article className="rounded-3xl border border-stone-800 p-5" key={entry.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{participantMap.get(entry.participant_id)?.display_name || entry.participant_id}</h3>
                      <p className="text-xs text-stone-500">{entry.participant_id} · {entry.entry_date} · 第 {entry.entry_index || 1} 則</p>
                    </div>
                    <span className="rounded-full bg-stone-800 px-3 py-1 text-xs text-stone-200">{entry.analysis_status}</span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-300">{entry.entry_text}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
