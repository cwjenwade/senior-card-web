import Link from "next/link";

import { getEggProgress, listInternalReviewQueue, listKnownTables, listParticipants, listPartnerPromptQueue } from "@/lib/jenny-product-store";
import { getTodayInTaipei } from "@/lib/m02-diary-store";

function StatusPill({ ready }: { ready: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
      {ready ? "ready" : "manual"}
    </span>
  );
}

export default async function HomePage() {
  const today = getTodayInTaipei();
  const [tables, participants, partnerQueue, internalQueue] = await Promise.all([
    listKnownTables(),
    listParticipants(),
    listPartnerPromptQueue(),
    listInternalReviewQueue(),
  ]);

  const participantRows = await Promise.all(
    participants.map(async (participant) => ({
      participant,
      eggProgress: await getEggProgress(participant.id, today),
    })),
  );

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="rounded-3xl border border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.24),_transparent_35%),linear-gradient(135deg,_rgba(28,25,23,0.98),_rgba(17,24,39,0.98))] p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Jenny M01-M04 Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-50">圖像日記、雞蛋進度、夥伴提醒與人工審核</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
            這個頁面提供目前最小可用的營運視圖。LINE 端負責長輩互動，這裡負責確認資料表、參與者、雞蛋進度與 M04 queue 狀態。
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link className="rounded-full bg-amber-300 px-4 py-2 font-medium text-stone-950" href="/api/admin/system-check">
              查看 system check JSON
            </Link>
            <Link className="rounded-full border border-sky-700 px-4 py-2 text-sky-100" href="/cards">
              長輩圖管理後台
            </Link>
            <form action="/api/admin/queues/run" method="post">
              <button className="rounded-full border border-stone-600 px-4 py-2 text-stone-100" type="submit">
                手動跑一次 queue 偵測
              </button>
            </form>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">資料表狀態</h2>
              <StatusPill ready={tables.every((table) => table.available)} />
            </div>
            <ul className="mt-4 space-y-3 text-sm text-stone-300">
              {tables.map((table) => (
                <li className="flex items-center justify-between rounded-2xl border border-stone-800 px-4 py-3" key={table.table}>
                  <span>{table.table}</span>
                  <StatusPill ready={table.available} />
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">參與者與雞蛋進度</h2>
              <span className="text-sm text-stone-400">{participantRows.length} participants</span>
            </div>
            <div className="mt-4 space-y-3">
              {participantRows.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-stone-700 px-4 py-6 text-sm text-stone-400">目前還沒有 participants 正式資料列。完成 M03 後會開始出現。</p>
              ) : (
                participantRows.map(({ participant, eggProgress }) => (
                  <div className="rounded-2xl border border-stone-800 px-4 py-4" key={participant.id}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-stone-100">{participant.display_name || participant.id}</p>
                        <p className="text-xs text-stone-500">{participant.id}</p>
                      </div>
                      <StatusPill ready={participant.wants_partner} />
                    </div>
                    <p className="mt-3 text-sm text-stone-300">
                      兩週進度：{eggProgress?.days_completed ?? 0} / 10
                      {eggProgress?.egg_box_eligible ? "，已達成" : "，未達成"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Partner Prompt Queue</h2>
              <span className="text-sm text-stone-400">{partnerQueue.length} rows</span>
            </div>
            <div className="mt-4 space-y-3">
              {partnerQueue.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-stone-700 px-4 py-6 text-sm text-stone-400">目前沒有 partner prompt queue 項目。</p>
              ) : (
                partnerQueue.map((item) => (
                  <div className="rounded-2xl border border-stone-800 px-4 py-4" key={item.id}>
                    <p className="font-medium text-stone-100">{item.participant_id}</p>
                    <p className="mt-1 text-sm text-stone-300">{item.trigger_type} / {item.trigger_reason}</p>
                    <p className="mt-1 text-xs text-stone-500">{item.status} · {item.created_at}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["partner_prompt", "closed", "needs_manual_routing"].map((status) => (
                        <form action="/api/admin/queues/update" key={status} method="post">
                          <input name="queueType" type="hidden" value="partner" />
                          <input name="id" type="hidden" value={item.id} />
                          <input name="status" type="hidden" value={status} />
                          <input name="redirectTo" type="hidden" value="/" />
                          <button className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-200" type="submit">
                            {status}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Internal Review Queue</h2>
              <span className="text-sm text-stone-400">{internalQueue.length} rows</span>
            </div>
            <div className="mt-4 space-y-3">
              {internalQueue.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-stone-700 px-4 py-6 text-sm text-stone-400">目前沒有 internal review queue 項目。</p>
              ) : (
                internalQueue.map((item) => (
                  <div className="rounded-2xl border border-stone-800 px-4 py-4" key={item.id}>
                    <p className="font-medium text-stone-100">{item.participant_id}</p>
                    <p className="mt-1 text-sm text-stone-300">{item.trigger_type} / {item.trigger_reason}</p>
                    <p className="mt-1 text-xs text-stone-500">{item.status} · priority {item.priority_score} · {item.created_at}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["pending_review", "closed", "needs_manual_routing"].map((status) => (
                        <form action="/api/admin/queues/update" key={status} method="post">
                          <input name="queueType" type="hidden" value="internal" />
                          <input name="id" type="hidden" value={item.id} />
                          <input name="status" type="hidden" value={status} />
                          <input name="redirectTo" type="hidden" value="/" />
                          <button className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-200" type="submit">
                            {status}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
