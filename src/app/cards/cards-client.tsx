"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { CardAsset, VisualSeries } from "@/lib/m01-cards";

type FilterOptions = {
  styleMain: string[];
  tone: string[];
  status: string[];
  imagery: string[];
};

type Props = {
  cards: CardAsset[];
  filterOptions: FilterOptions;
  notice?: string;
  error?: string;
};

type EditableCard = {
  cardId: string;
  cardTitle: string;
  imagery: VisualSeries;
  status: "draft" | "active" | "inactive" | "archived";
  captionText: string;
  defaultPrompt: string;
  imageProvider: string;
  imageUrl: string;
  imageKey: string;
  styleMain: CardAsset["styleMain"];
  styleSub: string;
  tone: CardAsset["tone"];
  textDensity: CardAsset["textDensity"];
  energyLevel: CardAsset["energyLevel"];
  uploadedBy: string;
};

const seriesOptions: VisualSeries[] = ["花系列", "神明系列", "台灣花布系列", "山系列"];
const statusOptions: Array<"draft" | "active" | "inactive"> = ["draft", "active", "inactive"];

function statusTone(status: string) {
  if (status === "active") return "bg-emerald-300/20 text-emerald-200 border-emerald-500/40";
  if (status === "inactive") return "bg-stone-300/10 text-stone-200 border-stone-500/30";
  if (status === "draft") return "bg-amber-300/20 text-amber-200 border-amber-500/40";
  return "bg-rose-300/20 text-rose-200 border-rose-500/40";
}

function formatTime(value: string) {
  if (!value) return "未記錄";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toEditable(card: CardAsset): EditableCard {
  return {
    cardId: card.cardId,
    cardTitle: card.cardTitle,
    imagery: card.imagery,
    status: card.status,
    captionText: card.captionText,
    defaultPrompt: card.defaultPrompt,
    imageProvider: card.imageProvider,
    imageUrl: card.imageUrl,
    imageKey: card.imageKey,
    styleMain: card.styleMain,
    styleSub: card.styleSub,
    tone: card.tone,
    textDensity: card.textDensity,
    energyLevel: card.energyLevel,
    uploadedBy: card.uploadedBy,
  };
}

export default function CardsClient({ cards, filterOptions, notice, error }: Props) {
  const [query, setQuery] = useState("");
  const [series, setSeries] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<"latest_upload" | "last_updated" | "title">("latest_upload");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedCardId, setFocusedCardId] = useState<string>("");
  const [draftEdits, setDraftEdits] = useState<Record<string, EditableCard>>(
    Object.fromEntries(cards.map((card) => [card.cardId, toEditable(card)])),
  );

  const filteredCards = useMemo(() => {
    return cards
      .filter((card) => {
        if (series && card.imagery !== series) return false;
        if (status && card.status !== status) return false;
        if (query.trim()) {
          const haystack = [card.cardTitle, card.captionText, card.cardId, card.imagery].join(" ").toLowerCase();
          if (!haystack.includes(query.trim().toLowerCase())) return false;
        }
        return true;
      })
      .sort((left, right) => {
        if (sort === "title") return left.cardTitle.localeCompare(right.cardTitle, "zh-Hant");
        if (sort === "last_updated") return right.updatedAt.localeCompare(left.updatedAt);
        return right.createdAt.localeCompare(left.createdAt) || right.updatedAt.localeCompare(left.updatedAt);
      });
  }, [cards, query, series, status, sort]);

  const focusedCard = focusedCardId ? cards.find((card) => card.cardId === focusedCardId) ?? null : null;
  const selectedCards = selectedIds.map((id) => draftEdits[id]).filter(Boolean);

  function toggleSelect(cardId: string) {
    setSelectedIds((current) => (current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]));
  }

  function selectAllVisible() {
    setSelectedIds(filteredCards.map((card) => card.cardId));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function patchEdit(cardId: string, patch: Partial<EditableCard>) {
    setDraftEdits((current) => ({
      ...current,
      [cardId]: {
        ...current[cardId],
        ...patch,
      },
    }));
  }

  function applySeriesToSelected(nextSeries: VisualSeries) {
    setDraftEdits((current) => {
      const next = { ...current };
      for (const cardId of selectedIds) {
        if (next[cardId]) next[cardId] = { ...next[cardId], imagery: nextSeries };
      }
      return next;
    });
  }

  function applyStatusToSelected(nextStatus: EditableCard["status"]) {
    setDraftEdits((current) => {
      const next = { ...current };
      for (const cardId of selectedIds) {
        if (next[cardId]) next[cardId] = { ...next[cardId], status: nextStatus };
      }
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-6 py-10">
        <header className="rounded-[2rem] border border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(135deg,_rgba(28,25,23,0.98),_rgba(17,24,39,0.98))] p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Cloudinary Card CMS</p>
              <h1 className="mt-3 text-4xl font-semibold text-stone-50">長輩圖管理後台</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
                一次上傳多張圖，先自動變成草稿，再在同一頁批次整理、快速編輯、批次上架。
              </p>
            </div>
            <Link className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-100" href="/">
              回 Dashboard
            </Link>
          </div>
        </header>

        {notice ? (
          <p className="rounded-2xl border border-emerald-700 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">{notice}</p>
        ) : null}
        {error ? (
          <p className="rounded-2xl border border-amber-700 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
            {error === "missing-cloudinary-config"
              ? "Cloudinary 還沒準備好，這次沒有成功上傳。"
              : "這次操作沒有完成，請再試一次。"}
          </p>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <form action="/api/admin/cards" className="rounded-[2rem] border border-stone-800 bg-stone-900/80 p-6" encType="multipart/form-data" method="post">
            <input name="intent" type="hidden" value="batch_upload" />
            <input name="redirectTo" type="hidden" value="/cards?notice=上傳完成，已建立草稿圖卡" />
            <h2 className="text-2xl font-semibold">一次上傳多張圖</h2>
            <p className="mt-2 text-sm text-stone-400">選多張圖片後，系統會一起上傳到 Cloudinary，並自動建立 draft。</p>
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-sky-700/50 bg-sky-950/20 p-6">
              <input accept="image/*" className="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-4 text-sm" multiple name="imageFiles" required type="file" />
              <p className="mt-3 text-xs leading-6 text-stone-400">預設會先用檔名建立標題、系列先放花系列、狀態先放 draft，之後可在下方批次整理。</p>
            </div>
            <button className="mt-6 rounded-full bg-sky-300 px-6 py-3 text-sm font-medium text-stone-950" type="submit">
              上傳並建立草稿
            </button>
          </form>

          <section className="rounded-[2rem] border border-stone-800 bg-stone-900/80 p-6">
            <h2 className="text-2xl font-semibold">批次整理工作區</h2>
            <p className="mt-2 text-sm text-stone-400">先勾選要整理的圖卡，再批次改系列、狀態，或一次儲存多筆 metadata。</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-full border border-stone-700 px-4 py-2 text-sm" onClick={selectAllVisible} type="button">
                全選目前畫面
              </button>
              <button className="rounded-full border border-stone-700 px-4 py-2 text-sm" onClick={clearSelection} type="button">
                清除勾選
              </button>
              <span className="rounded-full bg-stone-800 px-4 py-2 text-sm text-stone-300">已選 {selectedIds.length} 張</span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span>批次改系列</span>
                <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue="" onChange={(event) => event.target.value && applySeriesToSelected(event.target.value as VisualSeries)}>
                  <option value="">選擇系列</option>
                  {seriesOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span>批次改狀態</span>
                <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue="" onChange={(event) => event.target.value && applyStatusToSelected(event.target.value as EditableCard["status"])}>
                  <option value="">選擇狀態</option>
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>
            </div>

            <form action="/api/admin/cards" className="mt-6" method="post">
              <input name="intent" type="hidden" value="batch_update" />
              <input name="redirectTo" type="hidden" value="/cards?notice=批次儲存完成" />
              <input name="rows" type="hidden" value={JSON.stringify(selectedCards)} />
              <button className="rounded-full bg-stone-100 px-6 py-3 text-sm font-medium text-stone-950" disabled={selectedCards.length === 0} type="submit">
                批次儲存
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-3">
              <form action="/api/admin/cards" method="post">
                <input name="intent" type="hidden" value="batch_set_status" />
                <input name="redirectTo" type="hidden" value="/cards?notice=已批次上架" />
                <input name="status" type="hidden" value="active" />
                {selectedIds.map((cardId) => <input key={cardId} name="cardIds" type="hidden" value={cardId} />)}
                <button className="rounded-full border border-emerald-600 px-4 py-2 text-sm text-emerald-200" disabled={selectedIds.length === 0} type="submit">
                  批次上架
                </button>
              </form>
              <form action="/api/admin/cards" method="post">
                <input name="intent" type="hidden" value="batch_set_status" />
                <input name="redirectTo" type="hidden" value="/cards?notice=已批次下架" />
                <input name="status" type="hidden" value="inactive" />
                {selectedIds.map((cardId) => <input key={cardId} name="cardIds" type="hidden" value={cardId} />)}
                <button className="rounded-full border border-stone-600 px-4 py-2 text-sm text-stone-200" disabled={selectedIds.length === 0} type="submit">
                  批次下架
                </button>
              </form>
              <form action="/api/admin/cards" method="post">
                <input name="intent" type="hidden" value="delete_drafts" />
                <input name="redirectTo" type="hidden" value="/cards?notice=已刪除選取的 draft" />
                {selectedIds.map((cardId) => <input key={cardId} name="cardIds" type="hidden" value={cardId} />)}
                <button className="rounded-full border border-rose-700 px-4 py-2 text-sm text-rose-200" disabled={selectedIds.length === 0} type="submit">
                  批次刪除 draft
                </button>
              </form>
            </div>
          </section>
        </section>

        <section className="rounded-[2rem] border border-stone-800 bg-stone-900/80 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">圖卡清單</h2>
              <p className="mt-2 text-sm text-stone-400">支援關鍵字搜尋、系列篩選、狀態篩選、依最新上傳或最後更新排序。</p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <input className="rounded-full border border-stone-700 bg-stone-950 px-4 py-2 text-sm" onChange={(event) => setQuery(event.target.value)} placeholder="搜尋標題 / 內容 / 卡號" value={query} />
              <select className="rounded-full border border-stone-700 bg-stone-950 px-4 py-2 text-sm" onChange={(event) => setSeries(event.target.value)} value={series}>
                <option value="">全部系列</option>
                {filterOptions.imagery.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select className="rounded-full border border-stone-700 bg-stone-950 px-4 py-2 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}>
                <option value="">全部狀態</option>
                {filterOptions.status.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select className="rounded-full border border-stone-700 bg-stone-950 px-4 py-2 text-sm" onChange={(event) => setSort(event.target.value as "latest_upload" | "last_updated" | "title")} value={sort}>
                <option value="latest_upload">依最新上傳</option>
                <option value="last_updated">依最後更新</option>
                <option value="title">依標題</option>
              </select>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCards.map((card) => {
              const checked = selectedIds.includes(card.cardId);
              return (
                <article className={`rounded-[1.75rem] border p-4 transition ${checked ? "border-sky-400 bg-sky-950/20" : "border-stone-800 bg-stone-950/60"}`} key={card.cardId}>
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-center gap-3 text-sm text-stone-300">
                      <input checked={checked} onChange={() => toggleSelect(card.cardId)} type="checkbox" />
                      選取
                    </label>
                    <button className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-100" onClick={() => setFocusedCardId(card.cardId)} type="button">
                      快速編輯
                    </button>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-stone-800">
                    {card.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={card.cardTitle} className="h-64 w-full object-cover" src={card.imageUrl} />
                    ) : (
                      <div className="flex h-64 items-center justify-center text-sm text-stone-500">尚無預覽圖</div>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    <h3 className="text-lg font-semibold text-stone-50">{card.cardTitle}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(card.status)}`}>{card.status}</span>
                      <span className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-300">{card.imagery}</span>
                      <span className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-300">
                        {card.imageProvider === "cloudinary" && card.imageUrl ? "Cloudinary 成功" : "待確認"}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">{card.cardId}</p>
                    <p className="text-xs text-stone-400">最後更新：{formatTime(card.updatedAt)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {selectedCards.length > 0 ? (
          <section className="rounded-[2rem] border border-stone-800 bg-stone-900/80 p-6">
            <h2 className="text-2xl font-semibold">批次 metadata 編輯</h2>
            <p className="mt-2 text-sm text-stone-400">你可以直接在這裡連續整理多張圖，再一次儲存。</p>
            <div className="mt-6 space-y-5">
              {selectedCards.map((card) => (
                <article className="rounded-[1.5rem] border border-stone-800 bg-stone-950/50 p-4" key={card.cardId}>
                  <div className="grid gap-4 xl:grid-cols-[180px_1fr]">
                    <div className="overflow-hidden rounded-[1.25rem] border border-stone-800">
                      {card.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={card.cardTitle} className="h-40 w-full object-cover" src={card.imageUrl} />
                      ) : (
                        <div className="flex h-40 items-center justify-center text-xs text-stone-500">無圖</div>
                      )}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="flex flex-col gap-2 text-sm">
                        <span>標題</span>
                        <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" onChange={(event) => patchEdit(card.cardId, { cardTitle: event.target.value })} value={card.cardTitle} />
                      </label>
                      <label className="flex flex-col gap-2 text-sm">
                        <span>系列</span>
                        <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" onChange={(event) => patchEdit(card.cardId, { imagery: event.target.value as VisualSeries })} value={card.imagery}>
                          {seriesOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-2 text-sm">
                        <span>狀態</span>
                        <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" onChange={(event) => patchEdit(card.cardId, { status: event.target.value as EditableCard["status"] })} value={card.status}>
                          {statusOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label className="md:col-span-2 flex flex-col gap-2 text-sm">
                        <span>caption_text</span>
                        <textarea className="min-h-24 rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" onChange={(event) => patchEdit(card.cardId, { captionText: event.target.value })} value={card.captionText} />
                      </label>
                      <label className="md:col-span-2 flex flex-col gap-2 text-sm">
                        <span>default_prompt</span>
                        <textarea className="min-h-24 rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" onChange={(event) => patchEdit(card.cardId, { defaultPrompt: event.target.value })} value={card.defaultPrompt} />
                      </label>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {focusedCard ? (
          <aside className="fixed inset-y-0 right-0 z-20 w-full max-w-2xl overflow-y-auto border-l border-stone-800 bg-stone-950/98 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-sky-300">Quick Edit</p>
                <h2 className="mt-2 text-2xl font-semibold">{focusedCard.cardTitle}</h2>
              </div>
              <button className="rounded-full border border-stone-700 px-4 py-2 text-sm" onClick={() => setFocusedCardId("")} type="button">
                關閉
              </button>
            </div>
            <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-stone-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={focusedCard.cardTitle} className="h-80 w-full object-cover" src={focusedCard.imageUrl} />
            </div>
            <form action="/api/admin/cards" className="mt-6 grid gap-4" encType="multipart/form-data" method="post">
              <input name="intent" type="hidden" value="update" />
              <input name="redirectTo" type="hidden" value="/cards?notice=圖卡已儲存" />
              <input name="cardId" type="hidden" value={focusedCard.cardId} />
              <input name="imageProvider" type="hidden" value={focusedCard.imageProvider || "cloudinary"} />
              <input name="imageUrl" type="hidden" value={focusedCard.imageUrl} />
              <input name="imageKey" type="hidden" value={focusedCard.imageKey} />
              <input name="uploadedBy" type="hidden" value={focusedCard.uploadedBy || "admin-ui"} />
              <input name="styleMain" type="hidden" value={focusedCard.styleMain} />
              <input name="styleSub" type="hidden" value={focusedCard.styleSub} />
              <input name="tone" type="hidden" value={focusedCard.tone} />
              <input name="textDensity" type="hidden" value={focusedCard.textDensity} />
              <input name="energyLevel" type="hidden" value={focusedCard.energyLevel} />

              <label className="flex flex-col gap-2 text-sm">
                <span>標題</span>
                <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={focusedCard.cardTitle} name="cardTitle" />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span>系列</span>
                <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={focusedCard.imagery} name="imagery">
                  {seriesOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span>狀態</span>
                <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={focusedCard.status} name="status">
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span>更換圖片</span>
                <input accept="image/*" className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" name="imageFile" type="file" />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span>caption_text</span>
                <textarea className="min-h-24 rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={focusedCard.captionText} name="captionText" />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span>default_prompt</span>
                <textarea className="min-h-24 rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={focusedCard.defaultPrompt} name="defaultPrompt" />
              </label>
              <button className="rounded-full bg-sky-300 px-6 py-3 text-sm font-medium text-stone-950" type="submit">
                儲存這張圖
              </button>
            </form>
          </aside>
        ) : null}
      </section>
    </main>
  );
}
