import Link from "next/link";

import { listCommunityInfo } from "@/lib/jenny-product-store";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  category?: string;
  status?: string;
  district?: string;
}>;

function valueOrAll(value?: string) {
  return value && value.length > 0 ? value : "";
}

const categories = [
  { value: "policy", label: "政策" },
  { value: "neighborhood", label: "鄰里活動" },
  { value: "temple", label: "宮廟活動" },
  { value: "community", label: "社區資訊" },
];

const statuses = ["active", "draft", "inactive"];

export default async function InfoAdminPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const filters = {
    category: valueOrAll(searchParams.category),
    status: valueOrAll(searchParams.status),
    district: valueOrAll(searchParams.district),
  };

  const rows = await listCommunityInfo(filters);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="rounded-3xl border border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_35%),linear-gradient(135deg,_rgba(28,25,23,0.98),_rgba(17,24,39,0.98))] p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">M04 Info Service</p>
              <h1 className="mt-3 text-4xl font-semibold text-stone-50">政策與活動資訊後台</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
                這裡管理長輩端會看到的政策、鄰里活動、宮廟與社區資訊。M04 現在是資訊服務模組，不再代表 queue。
              </p>
            </div>
            <Link className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-100" href="/">
              回 Dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
          <h2 className="text-xl font-semibold">新增資訊</h2>
          <form action="/api/admin/info" className="mt-6 grid gap-4 md:grid-cols-2" method="post">
            <input name="redirectTo" type="hidden" value="/info-admin" />
            <label className="flex flex-col gap-2 text-sm">
              <span>title</span>
              <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" name="title" required />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>category</span>
              <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue="policy" name="category">
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2 flex flex-col gap-2 text-sm">
              <span>description</span>
              <textarea className="min-h-24 rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" name="description" required />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>event_date</span>
              <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" name="eventDate" type="date" />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>location</span>
              <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" name="location" />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>district</span>
              <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" name="district" placeholder="例如：大安區" />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>contact</span>
              <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" name="contact" />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span>status</span>
              <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue="active" name="status">
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button className="rounded-full bg-emerald-300 px-5 py-3 text-sm font-medium text-stone-950" type="submit">
                新增資訊
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">資訊列表</h2>
              <p className="mt-2 text-sm text-stone-400">可依 category / status 篩選，並直接更新內容或下架。</p>
            </div>
            <form action="/info-admin" className="flex flex-wrap gap-3 text-sm" method="get">
              <select className="rounded-full border border-stone-700 bg-stone-950 px-4 py-2" defaultValue={filters.category} name="category">
                <option value="">全部 category</option>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <select className="rounded-full border border-stone-700 bg-stone-950 px-4 py-2" defaultValue={filters.status} name="status">
                <option value="">全部 status</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <input className="rounded-full border border-stone-700 bg-stone-950 px-4 py-2" defaultValue={filters.district} name="district" placeholder="行政區" />
              <button className="rounded-full border border-stone-700 px-4 py-2 text-stone-100" type="submit">
                套用篩選
              </button>
            </form>
          </div>

          <div className="mt-6 space-y-6">
            {rows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-700 px-4 py-6 text-sm text-stone-400">目前沒有符合條件的資訊。</p>
            ) : (
              rows.map((row) => (
                <article className="rounded-3xl border border-stone-800 p-5" key={row.info_id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{row.title}</h3>
                      <p className="mt-1 text-xs text-stone-500">{row.info_id} · {row.category} · {row.status}</p>
                    </div>
                  </div>
                  <form action="/api/admin/info" className="mt-4 grid gap-4 md:grid-cols-2" method="post">
                    <input name="infoId" type="hidden" value={row.info_id} />
                      <input name="redirectTo" type="hidden" value={`/info-admin?category=${encodeURIComponent(filters.category)}&status=${encodeURIComponent(filters.status)}&district=${encodeURIComponent(filters.district)}`} />
                    <label className="flex flex-col gap-2 text-sm">
                      <span>title</span>
                      <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={row.title} name="title" required />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span>category</span>
                      <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={row.category} name="category">
                        {categories.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="md:col-span-2 flex flex-col gap-2 text-sm">
                      <span>description</span>
                      <textarea className="min-h-24 rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={row.description} name="description" required />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span>event_date</span>
                      <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={row.event_date ?? ""} name="eventDate" type="date" />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span>location</span>
                      <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={row.location} name="location" />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span>district</span>
                      <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={row.district} name="district" />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span>contact</span>
                      <input className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={row.contact} name="contact" />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span>status</span>
                      <select className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3" defaultValue={row.status} name="status">
                        {statuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-end">
                      <button className="rounded-full bg-stone-100 px-5 py-3 text-sm font-medium text-stone-950" type="submit">
                        儲存資訊
                      </button>
                    </div>
                  </form>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
