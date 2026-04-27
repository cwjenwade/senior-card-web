import Link from "next/link";

import { getCardFilterOptions, listCardsForAdmin } from "@/lib/m01-cards";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  style_main?: string;
  tone?: string;
  status?: string;
  error?: string;
}>;

function valueOrAll(value?: string) {
  return value && value.length > 0 ? value : "";
}

export default async function CardManagementPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const filters = {
    styleMain: valueOrAll(searchParams.style_main),
    tone: valueOrAll(searchParams.tone),
    status: valueOrAll(searchParams.status),
  };

  const [cards, filterOptions] = await Promise.all([
    listCardsForAdmin(filters),
    getCardFilterOptions(),
  ]);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="rounded-3xl border border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(135deg,_rgba(28,25,23,0.98),_rgba(17,24,39,0.98))] p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Cloudinary Card Asset Mode</p>
              <h1 className="mt-3 text-4xl font-semibold text-stone-50">長輩圖管理後台</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
                圖片正式上傳到 Cloudinary，Supabase 只保留圖卡 metadata、`image_url` 與 `image_key`。不會把圖片檔存進 Vercel 或 Supabase Storage。
              </p>
            </div>
            <Link className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-100" href="/">
              回 Dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
          <h2 className="text-xl font-semibold">新增圖卡</h2>
          <p className="mt-2 text-sm text-stone-400">請直接上傳圖片到 Cloudinary，再把文字 metadata 寫進 `card_catalog`。</p>
          {searchParams.error === "missing-cloudinary-config" ? (
            <p className="mt-4 rounded-2xl border border-amber-700 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
              Cloudinary 環境變數尚未設定完成，所以這次沒有上傳成功。請先設定 `CLOUDINARY_CLOUD_NAME`、`CLOUDINARY_API_KEY`、`CLOUDINARY_API_SECRET`。
            </p>
          ) : null}
          <form action="/api/admin/cards" className="mt-6 grid gap-4 md:grid-cols-2" encType="multipart/form-data" method="post">
            <input name="intent" type="hidden" value="create" />
            <input name="redirectTo" type="hidden" value="/cards" />
            <input name="imageProvider" type="hidden" value="cloudinary" />
            <input name="uploadedBy" type="hidden" value="admin-ui" />

            <label className="flex flex-col gap-2 text-sm">
              <span>圖片檔案</span>
              <input accept="image/*" className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" name="imageFile" required type="file" />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>card_title</span>
              <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" name="cardTitle" placeholder="例如：晨光平安・花開暖暖" required />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>style_main</span>
              <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue="問安語" name="styleMain">
                <option value="問安語">問安語</option>
                <option value="勵志語">勵志語</option>
                <option value="神佛金句">神佛金句</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>style_sub</span>
              <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" name="styleSub" placeholder="例如：柔和晨光" />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>tone</span>
              <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue="溫和" name="tone">
                <option value="溫和">溫和</option>
                <option value="明亮">明亮</option>
                <option value="平靜">平靜</option>
                <option value="陪伴">陪伴</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>imagery</span>
              <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue="花系列" name="imagery">
                <option value="花系列">花系列</option>
                <option value="神明系列">神明系列</option>
                <option value="台灣花布系列">台灣花布系列</option>
                <option value="山系列">山系列</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>text_density</span>
              <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue="short" name="textDensity">
                <option value="short">short</option>
                <option value="medium">medium</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>energy_level</span>
              <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue="steady" name="energyLevel">
                <option value="steady">steady</option>
                <option value="uplift">uplift</option>
                <option value="calm">calm</option>
              </select>
            </label>
            <label className="md:col-span-2 flex flex-col gap-2 text-sm">
              <span>caption_text</span>
              <textarea className="min-h-24 rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" name="captionText" required />
            </label>
            <label className="md:col-span-2 flex flex-col gap-2 text-sm">
              <span>default_prompt</span>
              <textarea className="min-h-24 rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" name="defaultPrompt" required />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>status</span>
              <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue="active" name="status">
                <option value="active">active</option>
                <option value="draft">draft</option>
                <option value="inactive">inactive</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <div className="flex items-end">
              <button className="rounded-full bg-sky-300 px-5 py-3 text-sm font-medium text-stone-950" type="submit">
                上傳並新增圖卡
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">圖卡列表</h2>
              <p className="mt-2 text-sm text-stone-400">可依 `style_main` / `tone` / `status` 篩選，並直接編輯 metadata 或切換上架狀態。</p>
            </div>
            <form action="/cards" className="flex flex-wrap gap-3 text-sm" method="get">
              <select className="rounded-full border border-stone-700 bg-stone-950 px-4 py-2" defaultValue={filters.styleMain} name="style_main">
                <option value="">全部 style_main</option>
                {filterOptions.styleMain.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select className="rounded-full border border-stone-700 bg-stone-950 px-4 py-2" defaultValue={filters.tone} name="tone">
                <option value="">全部 tone</option>
                {filterOptions.tone.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select className="rounded-full border border-stone-700 bg-stone-950 px-4 py-2" defaultValue={filters.status} name="status">
                <option value="">全部 status</option>
                {filterOptions.status.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <button className="rounded-full border border-stone-700 px-4 py-2 text-stone-100" type="submit">
                套用篩選
              </button>
            </form>
          </div>

          <div className="mt-6 space-y-6">
            {cards.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-700 px-4 py-6 text-sm text-stone-400">目前沒有符合條件的圖卡。</p>
            ) : (
              cards.map((card) => (
                <article className="grid gap-6 rounded-3xl border border-stone-800 p-5 lg:grid-cols-[220px_1fr]" key={card.cardId}>
                  <div className="space-y-3">
                    {card.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={card.cardTitle}
                        className="h-[275px] w-full rounded-2xl border border-stone-800 object-cover"
                        src={card.imageUrl}
                      />
                    ) : (
                      <div className="flex h-[275px] items-center justify-center rounded-2xl border border-dashed border-stone-700 text-sm text-stone-500">
                        image_url 未設定
                      </div>
                    )}
                    <div className="rounded-2xl border border-sky-900/60 bg-sky-950/30 p-3 text-xs leading-6 text-sky-100">
                      Cloudinary 圖片
                      <br />
                      Supabase 只存 metadata
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{card.cardTitle}</h3>
                        <p className="mt-1 text-xs text-stone-500">{card.cardId} · provider: {card.imageProvider} · status: {card.status}</p>
                      </div>
                      <div className="flex gap-2">
                        {card.status !== "active" ? (
                          <form action="/api/admin/cards" method="post">
                            <input name="intent" type="hidden" value="set_status" />
                            <input name="cardId" type="hidden" value={card.cardId} />
                            <input name="status" type="hidden" value="active" />
                            <input name="redirectTo" type="hidden" value={`/cards?style_main=${encodeURIComponent(filters.styleMain)}&tone=${encodeURIComponent(filters.tone)}&status=${encodeURIComponent(filters.status)}`} />
                            <button className="rounded-full bg-emerald-300 px-4 py-2 text-xs font-medium text-stone-950" type="submit">
                              上架
                            </button>
                          </form>
                        ) : null}
                        {card.status !== "inactive" ? (
                          <form action="/api/admin/cards" method="post">
                            <input name="intent" type="hidden" value="set_status" />
                            <input name="cardId" type="hidden" value={card.cardId} />
                            <input name="status" type="hidden" value="inactive" />
                            <input name="redirectTo" type="hidden" value={`/cards?style_main=${encodeURIComponent(filters.styleMain)}&tone=${encodeURIComponent(filters.tone)}&status=${encodeURIComponent(filters.status)}`} />
                            <button className="rounded-full border border-stone-700 px-4 py-2 text-xs text-stone-100" type="submit">
                              下架
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>

                    <form action="/api/admin/cards" className="mt-4 grid gap-4 md:grid-cols-2" encType="multipart/form-data" method="post">
                      <input name="intent" type="hidden" value="update" />
                      <input name="cardId" type="hidden" value={card.cardId} />
                      <input name="imageProvider" type="hidden" value={card.imageProvider || "cloudinary"} />
                      <input name="uploadedBy" type="hidden" value={card.uploadedBy || "admin-ui"} />
                      <input name="redirectTo" type="hidden" value={`/cards?style_main=${encodeURIComponent(filters.styleMain)}&tone=${encodeURIComponent(filters.tone)}&status=${encodeURIComponent(filters.status)}`} />

                      <label className="flex flex-col gap-2 text-sm">
                        <span>目前 image_url</span>
                        <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-400" defaultValue={card.imageUrl} name="imageUrl" readOnly type="url" />
                      </label>
                      <label className="flex flex-col gap-2 text-sm">
                        <span>更換圖片檔案</span>
                        <input accept="image/*" className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" name="imageFile" type="file" />
                      </label>
                      <input name="imageKey" type="hidden" value={card.imageKey} />
                      <label className="flex flex-col gap-2 text-sm">
                        <span>card_title</span>
                        <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={card.cardTitle} name="cardTitle" required />
                      </label>
                      <label className="flex flex-col gap-2 text-sm">
                        <span>style_main</span>
                        <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={card.styleMain} name="styleMain">
                          <option value="問安語">問安語</option>
                          <option value="勵志語">勵志語</option>
                          <option value="神佛金句">神佛金句</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-2 text-sm">
                        <span>style_sub</span>
                        <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={card.styleSub} name="styleSub" />
                      </label>
                      <label className="flex flex-col gap-2 text-sm">
                        <span>tone</span>
                        <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={card.tone} name="tone">
                          <option value="溫和">溫和</option>
                          <option value="明亮">明亮</option>
                          <option value="平靜">平靜</option>
                          <option value="陪伴">陪伴</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-2 text-sm">
                        <span>imagery</span>
                        <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={card.imagery} name="imagery">
                          <option value="花系列">花系列</option>
                          <option value="神明系列">神明系列</option>
                          <option value="台灣花布系列">台灣花布系列</option>
                          <option value="山系列">山系列</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-2 text-sm">
                        <span>text_density</span>
                        <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={card.textDensity} name="textDensity">
                          <option value="short">short</option>
                          <option value="medium">medium</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-2 text-sm">
                        <span>energy_level</span>
                        <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={card.energyLevel} name="energyLevel">
                          <option value="steady">steady</option>
                          <option value="uplift">uplift</option>
                          <option value="calm">calm</option>
                        </select>
                      </label>
                      <label className="md:col-span-2 flex flex-col gap-2 text-sm">
                        <span>caption_text</span>
                        <textarea className="min-h-24 rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={card.captionText} name="captionText" required />
                      </label>
                      <label className="md:col-span-2 flex flex-col gap-2 text-sm">
                        <span>default_prompt</span>
                        <textarea className="min-h-24 rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={card.defaultPrompt} name="defaultPrompt" required />
                      </label>
                      <label className="flex flex-col gap-2 text-sm">
                        <span>status</span>
                        <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={card.status} name="status">
                          <option value="active">active</option>
                          <option value="draft">draft</option>
                          <option value="inactive">inactive</option>
                          <option value="archived">archived</option>
                        </select>
                      </label>
                      <div className="flex items-end">
                        <button className="rounded-full bg-stone-100 px-5 py-3 text-sm font-medium text-stone-950" type="submit">
                          儲存圖卡
                        </button>
                      </div>
                    </form>
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
