import Link from "next/link";

import {
  listCareMessages,
  listParticipants,
  listPartnerLinks,
  listUserBlocks,
  listUserReports,
  listVolunteerRequests,
} from "@/lib/jenny-product-store";

export const dynamic = "force-dynamic";

export default async function M03AdminPage() {
  const [participants, links, careMessages, volunteerRequests, reports, blocks] = await Promise.all([
    listParticipants(),
    listPartnerLinks(),
    listCareMessages(),
    listVolunteerRequests(),
    listUserReports(),
    listUserBlocks(),
  ]);
  const participantMap = new Map(participants.map((participant) => [participant.id, participant]));

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="rounded-3xl border border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.18),_transparent_35%),linear-gradient(135deg,_rgba(28,25,23,0.98),_rgba(17,24,39,0.98))] p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">M03 Admin</p>
              <h1 className="mt-3 text-4xl font-semibold text-stone-50">配對、關懷、檢舉、封鎖管理</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">檢視小天使、小主人、配對關係、志工需求、檢舉與封鎖紀錄。</p>
            </div>
            <Link className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-100" href="/">
              回 Dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
          <h2 className="text-xl font-semibold">角色與配對</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {participants.map((participant) => {
              const ownLinks = links.filter((row) => row.participant_id === participant.id && row.status !== "closed");
              return (
                <article className="rounded-3xl border border-stone-800 p-5" key={participant.id}>
                  <h3 className="text-lg font-semibold">{participant.display_name || participant.id}</h3>
                  <p className="mt-1 text-xs text-stone-500">{participant.id}</p>
                  <div className="mt-4 space-y-2 text-sm text-stone-300">
                    <p>行政區：{participant.district || "未設定"}</p>
                    <p>小天使：{participant.is_little_angel ? "是" : "否"}</p>
                    <p>小主人：{participant.is_little_owner ? "是" : "否"}</p>
                    <p>免費名額：{participant.free_owner_slots + participant.extra_owner_slots}</p>
                    <p>目前配對數：{ownLinks.length}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
            <h2 className="text-xl font-semibold">志工需求</h2>
            <div className="mt-4 space-y-4">
              {volunteerRequests.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-stone-700 px-4 py-6 text-sm text-stone-400">目前沒有志工需求。</p>
              ) : (
                volunteerRequests.map((row) => (
                  <article className="rounded-3xl border border-stone-800 p-5" key={row.id}>
                    <h3 className="text-lg font-semibold">{participantMap.get(row.participant_id)?.display_name || row.participant_id}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-stone-300">{row.request_text}</p>
                    <p className="mt-2 text-xs text-stone-500">{row.status} · {row.created_at}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
            <h2 className="text-xl font-semibold">關懷訊息次數</h2>
            <div className="mt-4 space-y-4">
              {participants.map((participant) => {
                const sent = careMessages.filter((row) => row.sender_participant_id === participant.id).length;
                const received = careMessages.filter((row) => row.receiver_participant_id === participant.id).length;
                return (
                  <article className="rounded-3xl border border-stone-800 p-5" key={participant.id}>
                    <h3 className="text-lg font-semibold">{participant.display_name || participant.id}</h3>
                    <p className="mt-2 text-sm text-stone-300">發給別人：{sent} 次</p>
                    <p className="mt-1 text-sm text-stone-300">收到關懷：{received} 次</p>
                  </article>
                );
              })}
            </div>
          </section>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
            <h2 className="text-xl font-semibold">檢舉紀錄</h2>
            <div className="mt-4 space-y-4">
              {reports.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-stone-700 px-4 py-6 text-sm text-stone-400">目前沒有檢舉紀錄。</p>
              ) : (
                reports.map((row) => (
                  <article className="rounded-3xl border border-stone-800 p-5" key={row.id}>
                    <h3 className="text-lg font-semibold">
                      {participantMap.get(row.reporter_participant_id)?.display_name || row.reporter_participant_id}
                      {" → "}
                      {participantMap.get(row.target_participant_id)?.display_name || row.target_participant_id}
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-stone-300">{row.reason}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
            <h2 className="text-xl font-semibold">封鎖紀錄</h2>
            <div className="mt-4 space-y-4">
              {blocks.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-stone-700 px-4 py-6 text-sm text-stone-400">目前沒有封鎖紀錄。</p>
              ) : (
                blocks.map((row) => (
                  <article className="rounded-3xl border border-stone-800 p-5" key={row.id}>
                    <h3 className="text-lg font-semibold">
                      {participantMap.get(row.blocker_participant_id)?.display_name || row.blocker_participant_id}
                      {" 封鎖了 "}
                      {participantMap.get(row.target_participant_id)?.display_name || row.target_participant_id}
                    </h3>
                    <p className="mt-2 text-xs text-stone-500">{row.created_at}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
