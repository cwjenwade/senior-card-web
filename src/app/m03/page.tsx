import Link from "next/link";

import {
  getParticipant,
  hasRequiredTables,
  listCareEvents,
  listParticipants,
  listPartnerLinks,
  type PartnerLinkRow,
} from "@/lib/jenny-product-store";
import { getTodayInTaipei, hasCompletedToday } from "@/lib/m02-diary-store";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  participant?: string;
  error?: string;
}>;

function findLink(links: PartnerLinkRow[], participantId: string, linkType: PartnerLinkRow["link_type"]) {
  return links.find((row) => row.participant_id === participantId && row.link_type === linkType && row.status !== "closed") ?? null;
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "matched":
      return "matched";
    case "paused":
      return "paused";
    case "closed":
      return "closed";
    default:
      return "pending";
  }
}

function statusColor(status?: string | null) {
  switch (status) {
    case "matched":
      return "bg-emerald-100 text-emerald-900";
    case "paused":
      return "bg-amber-100 text-amber-900";
    case "closed":
      return "bg-stone-300 text-stone-900";
    default:
      return "bg-sky-100 text-sky-900";
  }
}

export default async function M03Page(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const remoteReady = await hasRequiredTables(["participants", "partner_links", "care_events"]);
  const participants = await listParticipants({ allowFallback: false });
  const participantId = searchParams.participant || participants[0]?.id || "";
  const current = participantId ? await getParticipant(participantId, { allowFallback: false }) : null;
  const links = participantId ? await listPartnerLinks(participantId, { allowFallback: false }) : [];
  const events = participantId ? await listCareEvents(participantId, { allowFallback: false }) : [];
  const participantsById = new Map(participants.map((row) => [row.id, row]));
  const careLink = participantId ? findLink(links, participantId, "care_pair") : null;
  const chatLink = participantId ? findLink(links, participantId, "chat_pair") : null;
  const today = getTodayInTaipei();
  const completedToday = participantId ? await hasCompletedToday(participantId, today) : false;

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="rounded-3xl border border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.18),_transparent_35%),linear-gradient(135deg,_rgba(28,25,23,0.98),_rgba(17,24,39,0.98))] p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300">M03 Friend Care</p>
              <h1 className="mt-3 text-4xl font-semibold text-stone-50">好友關懷與配對服務</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
                這裡只做低門檻、低風險的關懷與配對。先設定提醒與角色，再看目前配對狀態，必要時送出一個問候或表示今天想聊聊。
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link className="rounded-full border border-stone-700 px-4 py-2 text-stone-100" href="/">
                回 Dashboard
              </Link>
            </div>
          </div>
        </header>

        {!remoteReady ? (
          <section className="rounded-3xl border border-amber-700 bg-amber-950/40 p-6 text-sm leading-7 text-amber-100">
            M03 目前需要 remote schema 已完成後才可正式使用。這一頁不會回落到 local fallback。
            <br />
            請先套用最新 Supabase migration，再重新整理。
          </section>
        ) : null}

        <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">選擇要查看的使用者</h2>
              <p className="mt-2 text-sm text-stone-400">目前沒有完整登入系統，所以 web 端用 participant id 切換查看。</p>
            </div>
            <form action="/m03" className="flex flex-wrap gap-3 text-sm" method="get">
              <select className="rounded-full border border-stone-700 bg-stone-950 px-4 py-2" defaultValue={participantId} name="participant">
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.display_name || participant.id}
                  </option>
                ))}
              </select>
              <button className="rounded-full border border-stone-700 px-4 py-2 text-stone-100" type="submit">
                切換
              </button>
            </form>
          </div>
          {searchParams.error ? (
            <p className="mt-4 rounded-2xl border border-amber-700 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
              {searchParams.error === "remote-schema-not-ready"
                ? "remote schema 還沒套好，所以 M03 不會寫進 local fallback。請先完成 migration。"
                : "這次操作沒有完成，請再試一次。"}
            </p>
          ) : null}
        </section>

        {current ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
                <h2 className="text-xl font-semibold">我的設定</h2>
                <form action="/api/m03/settings" className="mt-6 space-y-5" method="post">
                  <input name="participantId" type="hidden" value={current.id} />
                  <input name="redirectTo" type="hidden" value={`/m03?participant=${encodeURIComponent(current.id)}`} />
                  <label className="flex flex-col gap-2 text-sm">
                    <span>稱呼</span>
                    <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={current.display_name} name="displayName" />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span>行政區</span>
                    <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={current.district} name="district" placeholder="例如：大安區" />
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-2xl border border-stone-800 px-4 py-3 text-sm">
                      <input defaultChecked={current.wants_reminders} name="wantsReminders" type="checkbox" />
                      接受日記提醒
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-stone-800 px-4 py-3 text-sm">
                      <input defaultChecked={current.wants_to_help_others} name="wantsToHelpOthers" type="checkbox" />
                      願意成為關懷大使
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-stone-800 px-4 py-3 text-sm">
                      <input defaultChecked={current.wants_to_be_cared_for} name="wantsToBeCaredFor" type="checkbox" />
                      希望被關懷
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-stone-800 px-4 py-3 text-sm">
                      <input defaultChecked={current.wants_chat_matching} name="wantsChatMatching" type="checkbox" />
                      願意加入聊天配對
                    </label>
                  </div>
                  <button className="rounded-full bg-sky-300 px-5 py-3 text-sm font-medium text-stone-950" type="submit">
                    儲存設定
                  </button>
                </form>
              </section>

              <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
                <h2 className="text-xl font-semibold">今天的狀態</h2>
                <div className="mt-5 space-y-3 text-sm text-stone-300">
                  <p>今天日記：{completedToday ? "已完成" : "尚未完成"}</p>
                  <p>行政區：{current.district || "未設定"}</p>
                  <p>提醒狀態：{current.wants_reminders ? "開啟" : "關閉"}</p>
                  <p>關懷角色：{current.wants_to_help_others ? "可成為關懷大使" : "暫不擔任關懷大使"}</p>
                  <p>被關懷：{current.wants_to_be_cared_for ? "願意" : "先不要"}</p>
                  <p>聊天配對：{current.wants_chat_matching ? "願意加入" : "未加入"}</p>
                </div>
              </section>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
                <h2 className="text-xl font-semibold">我的配對狀態</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-stone-800 p-4">
                    <p className="text-sm text-stone-400">關懷夥伴</p>
                    <p className="mt-2 text-lg font-semibold">
                      {careLink && careLink.partner_participant_id !== "care-pool"
                        ? participantsById.get(careLink.partner_participant_id)?.display_name || careLink.partner_participant_id
                        : "尚未配到固定夥伴"}
                    </p>
                    <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColor(careLink?.status)}`}>
                      {statusLabel(careLink?.status)}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-stone-800 p-4">
                    <p className="text-sm text-stone-400">聊天夥伴</p>
                    <p className="mt-2 text-lg font-semibold">
                      {chatLink && chatLink.partner_participant_id !== "chat-pool"
                        ? participantsById.get(chatLink.partner_participant_id)?.display_name || chatLink.partner_participant_id
                        : "尚未配到聊天夥伴"}
                    </p>
                    <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColor(chatLink?.status)}`}>
                      {statusLabel(chatLink?.status)}
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
                <h2 className="text-xl font-semibold">今天的關懷</h2>
                <div className="mt-6 flex flex-wrap gap-3">
                  {[
                    ["send_greeting", "送出問候"],
                    ["request_care", "今天想聊聊"],
                    ["willing_to_call", "今天願意打電話"],
                    ["mark_available", "今天可被安排"],
                  ].map(([intent, label]) => (
                    <form action="/api/m03/actions" key={intent} method="post">
                      <input name="participantId" type="hidden" value={current.id} />
                      <input name="intent" type="hidden" value={intent} />
                      <input name="redirectTo" type="hidden" value={`/m03?participant=${encodeURIComponent(current.id)}`} />
                      <button className="rounded-full border border-sky-700 px-4 py-2 text-sm text-sky-100" type="submit">
                        {label}
                      </button>
                    </form>
                  ))}
                </div>
              </section>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
                <h2 className="text-xl font-semibold">聊天配對基礎</h2>
                <div className="mt-6 space-y-3 text-sm text-stone-300">
                  <p>是否加入聊天配對：{current.wants_chat_matching ? "是" : "否"}</p>
                  <p>目前聊天夥伴：{chatLink && chatLink.partner_participant_id !== "chat-pool" ? participantsById.get(chatLink.partner_participant_id)?.display_name || chatLink.partner_participant_id : "尚未配對"}</p>
                  <p>目前狀態：{statusLabel(chatLink?.status)}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  {chatLink?.status !== "paused" ? (
                    <form action="/api/m03/actions" method="post">
                      <input name="participantId" type="hidden" value={current.id} />
                      <input name="intent" type="hidden" value="pause_chat" />
                      <input name="redirectTo" type="hidden" value={`/m03?participant=${encodeURIComponent(current.id)}`} />
                      <button className="rounded-full border border-amber-700 px-4 py-2 text-sm text-amber-100" type="submit">
                        暫停
                      </button>
                    </form>
                  ) : (
                    <form action="/api/m03/actions" method="post">
                      <input name="participantId" type="hidden" value={current.id} />
                      <input name="intent" type="hidden" value="resume_chat" />
                      <input name="redirectTo" type="hidden" value={`/m03?participant=${encodeURIComponent(current.id)}`} />
                      <button className="rounded-full border border-emerald-700 px-4 py-2 text-sm text-emerald-100" type="submit">
                        恢復
                      </button>
                    </form>
                  )}
                  <form action="/api/m03/actions" method="post">
                    <input name="participantId" type="hidden" value={current.id} />
                    <input name="intent" type="hidden" value="exit_chat" />
                    <input name="redirectTo" type="hidden" value={`/m03?participant=${encodeURIComponent(current.id)}`} />
                    <button className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-100" type="submit">
                      退出
                    </button>
                  </form>
                </div>
              </section>

              <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
                <h2 className="text-xl font-semibold">志工 / 檢舉 / 封鎖</h2>
                <div className="mt-6 space-y-4">
                  <form action="/api/m03/actions" className="space-y-3" method="post">
                    <input name="participantId" type="hidden" value={current.id} />
                    <input name="intent" type="hidden" value="volunteer_request" />
                    <input name="redirectTo" type="hidden" value={`/m03?participant=${encodeURIComponent(current.id)}`} />
                    <textarea className="min-h-24 w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm" name="requestText" placeholder="想跟志工說什麼？" />
                    <button className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-100" type="submit">
                      送出志工需求
                    </button>
                  </form>
                  <form action="/api/m03/actions" className="space-y-3" method="post">
                    <input name="participantId" type="hidden" value={current.id} />
                    <input name="intent" type="hidden" value="report_user" />
                    <input name="redirectTo" type="hidden" value={`/m03?participant=${encodeURIComponent(current.id)}`} />
                    <input className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm" name="targetParticipantId" placeholder="要檢舉的對象 id" />
                    <textarea className="min-h-20 w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm" name="reason" placeholder="檢舉原因" />
                    <button className="rounded-full border border-amber-700 px-4 py-2 text-sm text-amber-100" type="submit">
                      送出檢舉
                    </button>
                  </form>
                  <form action="/api/m03/actions" className="space-y-3" method="post">
                    <input name="participantId" type="hidden" value={current.id} />
                    <input name="intent" type="hidden" value="block_user" />
                    <input name="redirectTo" type="hidden" value={`/m03?participant=${encodeURIComponent(current.id)}`} />
                    <input className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm" name="targetParticipantId" placeholder="要封鎖的對象 id" />
                    <button className="rounded-full border border-rose-700 px-4 py-2 text-sm text-rose-100" type="submit">
                      封鎖此人
                    </button>
                  </form>
                </div>
              </section>

              <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
                <h2 className="text-xl font-semibold">最近互動</h2>
                <div className="mt-6 space-y-3">
                  {events.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-stone-700 px-4 py-6 text-sm text-stone-400">目前還沒有 M03 關懷互動紀錄。</p>
                  ) : (
                    events.slice(0, 8).map((event) => (
                      <div className="rounded-2xl border border-stone-800 px-4 py-4" key={event.event_id}>
                        <p className="font-medium text-stone-100">{event.event_type}</p>
                        <p className="mt-1 text-sm text-stone-300">{event.note}</p>
                        <p className="mt-1 text-xs text-stone-500">{event.target_participant_id || "未指定對象"} · {event.created_at}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </section>
          </>
        ) : (
          <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6 text-sm text-stone-300">
            目前還沒有可查看的 participant。先從 LINE 進一次 M03，或先建立一位測試使用者。
          </section>
        )}
      </section>
    </main>
  );
}
