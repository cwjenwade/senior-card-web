"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type DashboardTab = "library" | "templates" | "rules" | "line";

type TextType =
  | "祝福語"
  | "問安語"
  | "勵志語"
  | "平安語"
  | "健康語"
  | "幽默語"
  | "陪伴語";

type VisualSeries =
  | "花系列"
  | "山水系列"
  | "神佛系列"
  | "小孩系列"
  | "動物系列"
  | "茶水果系列"
  | "日出系列"
  | "節慶系列"
  | "書法字系列";

type CardAsset = {
  id: string;
  title: string;
  textType: TextType;
  visualSeries: VisualSeries;
  tone: "溫和" | "明亮" | "平靜" | "陪伴";
  caption: string;
  prompt: string;
  status: "active" | "draft" | "archived";
  cc0Source: string;
  imageUrl: string;
  fontSize: "large" | "medium";
  textDensity: "short" | "medium";
  colorTone: "warm" | "calm" | "bright";
  religiousContent: "none" | "medium" | "high";
};

type TemplatePreset = {
  id: string;
  name: string;
  textType: TextType;
  visualSeries: VisualSeries;
  sourceMode: "cc0_pool" | "fixed_image" | "auto_variant";
  backgroundPool: string;
  phrasePool: string;
  fontPreset: string;
  colorPreset: string;
  encouragement: number;
  companionship: number;
  readyCount: number;
};

type RuleConfig = {
  textTypeWeight: number;
  visualSeriesWeight: number;
  likedBoost: number;
  dislikedPenalty: number;
  repetitionPenalty: number;
  reshuffleLimit: number;
  moodUsedForRecommendation: boolean;
};

type LineEvent = {
  sessionId: string;
  userId: string;
  moodToday: string;
  textType: TextType;
  visualSeries: VisualSeries;
  recommendedCards: string[];
  selectedCard: string;
  diaryWritten: boolean;
  favoriteAdded: boolean;
  dislikedCard: string | null;
  reshuffleCount: number;
  timestamp: string;
};

const tabs: { id: DashboardTab; label: string; note: string }[] = [
  { id: "library", label: "圖卡圖庫", note: "管理上架、停用、文案與素材標記" },
  { id: "templates", label: "模板工作台", note: "組裝 CC0 圖庫與句庫，做可控的長輩圖模板" },
  { id: "rules", label: "推薦規則", note: "設定 LINE 推薦配對與亂數池規則" },
  { id: "line", label: "LINE 互動", note: "看老人端按鍵流程與推薦結果紀錄" },
];

const cards: CardAsset[] = [
  {
    id: "C001",
    title: "晨光平安",
    textType: "平安語",
    visualSeries: "日出系列",
    tone: "平靜",
    caption: "今天也慢慢來，平平安安就很好。",
    prompt: "看到這張圖，今天想寫一句什麼？",
    status: "active",
    cc0Source: "Unsplash / sunrise coast",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    fontSize: "large",
    textDensity: "short",
    colorTone: "warm",
    religiousContent: "none",
  },
  {
    id: "C002",
    title: "蘭花問安",
    textType: "問安語",
    visualSeries: "花系列",
    tone: "溫和",
    caption: "今天過得還好嗎？寫一句也可以。",
    prompt: "今天心裡最想記下來的是什麼？",
    status: "active",
    cc0Source: "Unsplash / orchid macro",
    imageUrl:
      "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=80",
    fontSize: "large",
    textDensity: "short",
    colorTone: "calm",
    religiousContent: "none",
  },
  {
    id: "C003",
    title: "慢慢也很好",
    textType: "勵志語",
    visualSeries: "山水系列",
    tone: "明亮",
    caption: "今天不用急，往前一點點就很好。",
    prompt: "今天有哪件小事值得記下來？",
    status: "active",
    cc0Source: "Unsplash / mountain path",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    fontSize: "medium",
    textDensity: "medium",
    colorTone: "warm",
    religiousContent: "none",
  },
  {
    id: "C004",
    title: "你辛苦了",
    textType: "陪伴語",
    visualSeries: "茶水果系列",
    tone: "陪伴",
    caption: "今天先歇一下，也算在照顧自己。",
    prompt: "如果跟自己說一句溫柔的話，會是什麼？",
    status: "active",
    cc0Source: "Unsplash / tea table",
    imageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    fontSize: "large",
    textDensity: "short",
    colorTone: "calm",
    religiousContent: "none",
  },
  {
    id: "C005",
    title: "祝福常在",
    textType: "祝福語",
    visualSeries: "書法字系列",
    tone: "平靜",
    caption: "願今天順心，心裡也有一點光。",
    prompt: "今天有沒有想感謝或想念的人？",
    status: "draft",
    cc0Source: "Canva export / calligraphy background",
    imageUrl:
      "https://images.unsplash.com/photo-1516546453174-5e1098a4b4af?auto=format&fit=crop&w=1200&q=80",
    fontSize: "medium",
    textDensity: "medium",
    colorTone: "warm",
    religiousContent: "none",
  },
  {
    id: "C006",
    title: "平安心念",
    textType: "平安語",
    visualSeries: "神佛系列",
    tone: "平靜",
    caption: "願心安，身安，今天也平平順順。",
    prompt: "今天心裡安不安？一句話也可以。",
    status: "active",
    cc0Source: "Unsplash / temple hall",
    imageUrl:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80",
    fontSize: "large",
    textDensity: "short",
    colorTone: "calm",
    religiousContent: "high",
  },
  {
    id: "C007",
    title: "小狗來問安",
    textType: "問安語",
    visualSeries: "動物系列",
    tone: "明亮",
    caption: "今天有沒有吃飯喝水？寫一句就好。",
    prompt: "今天想簡單記一句什麼？",
    status: "active",
    cc0Source: "Unsplash / puppy portrait",
    imageUrl:
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80",
    fontSize: "large",
    textDensity: "short",
    colorTone: "bright",
    religiousContent: "none",
  },
  {
    id: "C008",
    title: "節日好心情",
    textType: "祝福語",
    visualSeries: "節慶系列",
    tone: "明亮",
    caption: "今天也值得有一點熱鬧和喜氣。",
    prompt: "今天有沒有讓你想到團圓或熱鬧的事？",
    status: "archived",
    cc0Source: "CC0 festive paper pack",
    imageUrl:
      "https://images.unsplash.com/photo-1482517967863-00e15c9b44be?auto=format&fit=crop&w=1200&q=80",
    fontSize: "medium",
    textDensity: "medium",
    colorTone: "bright",
    religiousContent: "none",
  },
];

const templates: TemplatePreset[] = [
  {
    id: "T001",
    name: "花系列安穩模板",
    textType: "祝福語",
    visualSeries: "花系列",
    sourceMode: "cc0_pool",
    backgroundPool: "orchid-soft / rose-light / white-bloom",
    phrasePool: "祝福短句 v2",
    fontPreset: "圓角大字",
    colorPreset: "暖米白 + 深灰",
    encouragement: 18,
    companionship: 72,
    readyCount: 14,
  },
  {
    id: "T002",
    name: "山水平安模板",
    textType: "平安語",
    visualSeries: "山水系列",
    sourceMode: "auto_variant",
    backgroundPool: "ridge-mist / sea-breeze / morning-lake",
    phrasePool: "平安語句庫 v1",
    fontPreset: "書感黑體",
    colorPreset: "青綠 + 米白",
    encouragement: 12,
    companionship: 58,
    readyCount: 11,
  },
  {
    id: "T003",
    name: "陪伴茶點模板",
    textType: "陪伴語",
    visualSeries: "茶水果系列",
    sourceMode: "fixed_image",
    backgroundPool: "tea-table-set-03",
    phrasePool: "陪伴語句庫 v3",
    fontPreset: "大字暖黑",
    colorPreset: "淺茶色 + 木炭灰",
    encouragement: 20,
    companionship: 88,
    readyCount: 9,
  },
];

const defaultRuleConfig: RuleConfig = {
  textTypeWeight: 45,
  visualSeriesWeight: 35,
  likedBoost: 18,
  dislikedPenalty: 28,
  repetitionPenalty: 16,
  reshuffleLimit: 3,
  moodUsedForRecommendation: false,
};

const lineEvents: LineEvent[] = [
  {
    sessionId: "S-2026-04-25-001",
    userId: "A001",
    moodToday: "平靜",
    textType: "祝福語",
    visualSeries: "花系列",
    recommendedCards: ["C005", "C002", "C003"],
    selectedCard: "C005",
    diaryWritten: true,
    favoriteAdded: true,
    dislikedCard: null,
    reshuffleCount: 0,
    timestamp: "2026-04-25 09:10",
  },
  {
    sessionId: "S-2026-04-25-002",
    userId: "A014",
    moodToday: "累",
    textType: "陪伴語",
    visualSeries: "茶水果系列",
    recommendedCards: ["C004", "C001", "C007"],
    selectedCard: "C004",
    diaryWritten: true,
    favoriteAdded: false,
    dislikedCard: "C007",
    reshuffleCount: 1,
    timestamp: "2026-04-25 10:42",
  },
  {
    sessionId: "S-2026-04-25-003",
    userId: "A026",
    moodToday: "寂寞",
    textType: "問安語",
    visualSeries: "動物系列",
    recommendedCards: ["C007", "C002", "C004"],
    selectedCard: "C007",
    diaryWritten: false,
    favoriteAdded: true,
    dislikedCard: null,
    reshuffleCount: 0,
    timestamp: "2026-04-25 11:25",
  },
  {
    sessionId: "S-2026-04-25-004",
    userId: "A031",
    moodToday: "沒特別感覺",
    textType: "平安語",
    visualSeries: "山水系列",
    recommendedCards: ["C001", "C006", "C003"],
    selectedCard: "C001",
    diaryWritten: true,
    favoriteAdded: false,
    dislikedCard: null,
    reshuffleCount: 2,
    timestamp: "2026-04-25 13:08",
  },
];

function metricValue(label: string, value: string, note: string) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
    </div>
  );
}

function chip(label: string, tone: "neutral" | "warm" | "green" | "amber" = "neutral") {
  const toneClass =
    tone === "warm"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : tone === "green"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-slate-100 text-slate-700";

  return <span className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium ${toneClass}`}>{label}</span>;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("library");
  const [selectedCardId, setSelectedCardId] = useState<string>(cards[0].id);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0].id);
  const [ruleConfig, setRuleConfig] = useState<RuleConfig>(defaultRuleConfig);

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0];
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];

  const activeCards = cards.filter((card) => card.status === "active").length;
  const draftCards = cards.filter((card) => card.status === "draft").length;
  const cc0Sources = new Set(cards.map((card) => card.cc0Source)).size;
  const diaryConversionRate = Math.round((lineEvents.filter((event) => event.diaryWritten).length / lineEvents.length) * 100);

  const lineSummary = useMemo(() => {
    const favoriteRate = Math.round((lineEvents.filter((event) => event.favoriteAdded).length / lineEvents.length) * 100);
    const averageReshuffle =
      lineEvents.reduce((total, event) => total + event.reshuffleCount, 0) / Math.max(lineEvents.length, 1);
    return {
      favoriteRate,
      averageReshuffle: averageReshuffle.toFixed(1),
    };
  }, []);

  const recommendationPreview = useMemo(() => {
    return cards
      .filter((card) => card.textType === selectedTemplate.textType || card.visualSeries === selectedTemplate.visualSeries)
      .slice(0, 3);
  }, [selectedTemplate]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4efe7_0%,#fffaf4_28%,#f1f5f7_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b border-slate-200 pb-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">Jenny / Vercel 後台</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">長輩圖營運工作台</h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600">
                老人端走 LINE 按鍵流程。這個網站只負責做圖、上架圖、管推薦規則、看互動紀錄。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {chip("LINE 端按鍵操作", "green")}
              {chip("後台支援 CC0 圖庫", "warm")}
              {chip("心情只記錄，不進排序", "amber")}
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricValue("上架圖卡", String(activeCards), "目前可被推薦的長輩圖數量")}
          {metricValue("草稿圖卡", String(draftCards), "待你確認後才會進推薦池")}
          {metricValue("CC0 素材來源", String(cc0Sources), "目前接入的免費素材來源組數")}
          {metricValue("日記轉換率", `${diaryConversionRate}%`, "老人選圖後願意寫一句的比例")}
        </section>

        <section className="grid gap-4 xl:grid-cols-[260px_1fr]">
          <aside className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                  activeTab === tab.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-semibold">{tab.label}</p>
                <p className={`mt-1 text-xs leading-5 ${activeTab === tab.id ? "text-white/75" : "text-slate-500"}`}>{tab.note}</p>
              </button>
            ))}
          </aside>

          <div className="space-y-6">
            {activeTab === "library" ? (
              <>
                <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-950">圖卡圖庫</h2>
                      <div className="flex gap-2">
                        {chip("active", "green")}
                        {chip("draft", "amber")}
                        {chip("archived")}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {cards.map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setSelectedCardId(card.id)}
                          className={`overflow-hidden rounded-lg border bg-white text-left shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)] transition ${
                            selectedCard.id === card.id
                              ? "border-slate-900 ring-1 ring-slate-900"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="relative aspect-[4/3] overflow-hidden">
                            <Image src={card.imageUrl} alt={card.title} fill sizes="(max-width: 767px) 100vw, 33vw" className="object-cover" />
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.62)_100%)]" />
                            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                              <div className="flex items-center justify-between text-xs font-medium">
                                <span>{card.id}</span>
                                <span>{card.status}</span>
                              </div>
                              <h3 className="mt-2 text-xl font-semibold">{card.title}</h3>
                              <p className="mt-1 text-sm leading-6 text-white/90">{card.caption}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 p-4">
                            {chip(card.textType, "warm")}
                            {chip(card.visualSeries, "neutral")}
                            {chip(card.colorTone === "bright" ? "亮色調" : card.colorTone === "calm" ? "穩定色調" : "暖色調", "green")}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">
                    <div className="space-y-5">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                        <Image src={selectedCard.imageUrl} alt={selectedCard.title} fill sizes="(max-width: 1279px) 100vw, 40vw" className="object-cover" />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.64)_100%)]" />
                        <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 text-white">
                          <p className="text-xs font-medium">{selectedCard.id}</p>
                          <h3 className="text-2xl font-semibold">{selectedCard.title}</h3>
                          <p className="text-sm leading-6 text-white/90">{selectedCard.caption}</p>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium text-slate-500">文字類型</p>
                          <p className="mt-1 text-base font-semibold text-slate-950">{selectedCard.textType}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">圖像系列</p>
                          <p className="mt-1 text-base font-semibold text-slate-950">{selectedCard.visualSeries}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">CC0 素材</p>
                          <p className="mt-1 text-base font-semibold text-slate-950">{selectedCard.cc0Source}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">提示句</p>
                          <p className="mt-1 text-base font-semibold text-slate-950">{selectedCard.prompt}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4">
                        <div>
                          <p className="text-xs font-medium text-slate-500">字體大小</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{selectedCard.fontSize}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">文字密度</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{selectedCard.textDensity}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">色調</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{selectedCard.colorTone}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">宗教元素</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{selectedCard.religiousContent}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800">儲存修改</button>
                        <button className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-400">另存變體</button>
                        <button className="h-10 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-medium text-amber-900 transition hover:border-amber-400">切換狀態</button>
                      </div>
                    </div>
                  </section>
                </section>
              </>
            ) : null}

            {activeTab === "templates" ? (
              <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-950">模板工作台</h2>
                  <div className="grid gap-3">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={`rounded-lg border bg-white p-4 text-left shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)] transition ${
                          selectedTemplate.id === template.id ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{template.name}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {template.textType} · {template.visualSeries}
                            </p>
                          </div>
                          {chip(`${template.readyCount} 張`, "green")}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {chip(template.sourceMode === "cc0_pool" ? "CC0 圖庫" : template.sourceMode === "fixed_image" ? "固定底圖" : "自動變體", "warm")}
                          {chip(template.fontPreset)}
                          {chip(template.colorPreset, "neutral")}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">
                  <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <div className="space-y-5">
                      <div>
                        <p className="text-sm font-medium text-slate-500">目前模板</p>
                        <h3 className="mt-1 text-2xl font-semibold text-slate-950">{selectedTemplate.name}</h3>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium text-slate-500">文字類型</p>
                          <p className="mt-1 text-base font-semibold text-slate-950">{selectedTemplate.textType}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">圖像系列</p>
                          <p className="mt-1 text-base font-semibold text-slate-950">{selectedTemplate.visualSeries}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">背景池</p>
                          <p className="mt-1 text-base font-semibold text-slate-950">{selectedTemplate.backgroundPool}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">句庫</p>
                          <p className="mt-1 text-base font-semibold text-slate-950">{selectedTemplate.phrasePool}</p>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <label className="space-y-2">
                          <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                            <span>鼓勵強度</span>
                            <span>{selectedTemplate.encouragement}</span>
                          </div>
                          <input type="range" min="0" max="100" value={selectedTemplate.encouragement} readOnly className="w-full accent-slate-900" />
                        </label>
                        <label className="space-y-2">
                          <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                            <span>陪伴強度</span>
                            <span>{selectedTemplate.companionship}</span>
                          </div>
                          <input type="range" min="0" max="100" value={selectedTemplate.companionship} readOnly className="w-full accent-emerald-700" />
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800">儲存模板</button>
                        <button className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-400">產生 3 張變體</button>
                        <button className="h-10 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-medium text-emerald-900 transition hover:border-emerald-400">上架到圖庫</button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-slate-950">推薦預覽</h4>
                      <div className="grid gap-3">
                        {recommendationPreview.map((card) => (
                          <div key={card.id} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            <div className="relative aspect-[4/3] overflow-hidden">
                              <Image src={card.imageUrl} alt={card.title} fill sizes="(max-width: 1279px) 100vw, 30vw" className="object-cover" />
                            </div>
                            <div className="space-y-1 p-3">
                              <p className="text-sm font-semibold text-slate-950">{card.title}</p>
                              <p className="text-sm leading-6 text-slate-600">{card.caption}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </section>
            ) : null}

            {activeTab === "rules" ? (
              <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">
                  <h2 className="text-lg font-semibold text-slate-950">推薦規則</h2>
                  <div className="mt-5 grid gap-5">
                    {[
                      ["文字類型命中", "textTypeWeight"],
                      ["圖像系列命中", "visualSeriesWeight"],
                      ["過去喜歡加分", "likedBoost"],
                      ["不喜歡扣分", "dislikedPenalty"],
                      ["近期重複扣分", "repetitionPenalty"],
                    ].map(([label, key]) => {
                      const value = ruleConfig[key as keyof RuleConfig] as number;
                      return (
                        <label key={key} className="space-y-2">
                          <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                            <span>{label}</span>
                            <span>{value}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="60"
                            value={value}
                            onChange={(event) =>
                              setRuleConfig((current) => ({
                                ...current,
                                [key]: Number(event.target.value),
                              }))
                            }
                            className="w-full accent-slate-900"
                          />
                        </label>
                      );
                    })}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700">最多連續換幾次</span>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          value={ruleConfig.reshuffleLimit}
                          onChange={(event) =>
                            setRuleConfig((current) => ({
                              ...current,
                              reshuffleLimit: Number(event.target.value),
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700">心情是否進排序</span>
                        <button
                          type="button"
                          onClick={() =>
                            setRuleConfig((current) => ({
                              ...current,
                              moodUsedForRecommendation: !current.moodUsedForRecommendation,
                            }))
                          }
                          className={`flex h-11 w-full items-center justify-between rounded-lg border px-3 text-sm font-medium transition ${
                            ruleConfig.moodUsedForRecommendation
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-300 bg-white text-slate-700"
                          }`}
                        >
                          <span>{ruleConfig.moodUsedForRecommendation ? "目前有使用" : "目前不使用"}</span>
                          <span>{ruleConfig.moodUsedForRecommendation ? "ON" : "OFF"}</span>
                        </button>
                      </label>
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">
                  <h2 className="text-lg font-semibold text-slate-950">LINE 配對邏輯</h2>
                  <div className="mt-5 space-y-5 text-sm leading-7 text-slate-700">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-950">老人端流程</p>
                      <p className="mt-2">今日心情 → 選文字類型 → 選圖像系列 → 系統回三張 → 選這張 → 寫一句日記</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-950">目前規則</p>
                      <ul className="mt-2 space-y-1">
                        <li>1. 先用文字類型命中做主篩選</li>
                        <li>2. 再用圖像系列命中做第二層篩選</li>
                        <li>3. 喜歡過的圖卡與同類型會加分</li>
                        <li>4. 不喜歡與近期重複會扣分</li>
                        <li>5. 心情僅留作日記脈絡，不影響排序</li>
                      </ul>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800">儲存規則</button>
                      <button className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-400">匯出配對表</button>
                    </div>
                  </div>
                </section>
              </section>
            ) : null}

            {activeTab === "line" ? (
              <section className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-950">LINE 互動紀錄</h2>
                    <div className="flex gap-2">
                      {chip(`收藏率 ${lineSummary.favoriteRate}%`, "warm")}
                      {chip(`平均換一組 ${lineSummary.averageReshuffle}`, "green")}
                    </div>
                  </div>
                  <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-medium">Session</th>
                          <th className="px-4 py-3 font-medium">心情</th>
                          <th className="px-4 py-3 font-medium">文字類型</th>
                          <th className="px-4 py-3 font-medium">圖像系列</th>
                          <th className="px-4 py-3 font-medium">選定圖卡</th>
                          <th className="px-4 py-3 font-medium">日記</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineEvents.map((event) => (
                          <tr key={event.sessionId} className="border-t border-slate-200">
                            <td className="px-4 py-3 align-top">
                              <p className="font-medium text-slate-900">{event.sessionId}</p>
                              <p className="text-xs text-slate-500">{event.timestamp}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{event.moodToday}</td>
                            <td className="px-4 py-3 text-slate-700">{event.textType}</td>
                            <td className="px-4 py-3 text-slate-700">{event.visualSeries}</td>
                            <td className="px-4 py-3 text-slate-700">{event.selectedCard}</td>
                            <td className="px-4 py-3">
                              {event.diaryWritten ? chip("已寫", "green") : chip("未寫", "neutral")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">
                  <h2 className="text-lg font-semibold text-slate-950">老人端卡片回傳預覽</h2>
                  <div className="mt-5 space-y-4">
                    {lineEvents[0].recommendedCards.map((cardId) => {
                      const card = cards.find((item) => item.id === cardId);
                      if (!card) return null;
                      return (
                        <div key={card.id} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          <div className="relative aspect-[16/9] overflow-hidden">
                            <Image src={card.imageUrl} alt={card.title} fill sizes="(max-width: 1279px) 100vw, 30vw" className="object-cover" />
                          </div>
                          <div className="space-y-2 p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-base font-semibold text-slate-950">{card.title}</p>
                              {chip(card.textType, "warm")}
                            </div>
                            <p className="text-sm leading-6 text-slate-600">{card.caption}</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button className="h-10 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white">選這張</button>
                              <button className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700">不喜歡這張</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
