import { readLocalTable, writeLocalTable } from "@/lib/local-table-store";
import { canUseSupabase, hasTable, resolveSupabaseRestUrl, supabaseDelete, supabaseHeaders, supabaseInsert, supabaseSelect } from "@/lib/supabase-rest";

export type TextType =
  | "問安語"
  | "勵志語"
  | "神佛金句";

export type VisualSeries =
  | "花系列"
  | "神明系列"
  | "台灣花布系列"
  | "山系列";

export type CardStatus = "active" | "draft" | "inactive" | "archived";

export type CardAsset = {
  id: string;
  cardId: string;
  title: string;
  cardTitle: string;
  imageProvider: string;
  imageUrl: string;
  imageKey: string;
  styleMain: TextType;
  styleSub: string;
  tone: "溫和" | "明亮" | "平靜" | "陪伴";
  imagery: VisualSeries;
  textDensity: "short" | "medium";
  energyLevel: "steady" | "uplift" | "calm";
  caption: string;
  captionText: string;
  prompt: string;
  defaultPrompt: string;
  status: CardStatus;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;

  textType: TextType;
  visualSeries: VisualSeries;
  cc0Source: string;
  fontSize: "large" | "medium";
  colorTone: "warm" | "calm" | "bright";
  religiousContent: "none" | "medium" | "high";
  emoji: string;
  bgStart: string;
  bgEnd: string;
  accent: string;
};

export type CardCatalogRow = {
  card_id: string;
  card_title: string;
  image_provider?: string;
  image_url: string;
  image_key?: string;
  series?: string;
  style_main: TextType;
  style_sub: string;
  tone: CardAsset["tone"];
  imagery: VisualSeries;
  text_density: CardAsset["textDensity"];
  energy_level: CardAsset["energyLevel"];
  caption_text: string;
  default_prompt?: string;
  status: CardStatus;
  uploaded_by?: string;
  created_at?: string;
  updated_at?: string;

  id?: string;
  title?: string;
  text_type?: TextType;
  visual_series?: VisualSeries;
  caption?: string;
  prompt?: string;
  cc0_source?: string;
  font_size?: CardAsset["fontSize"];
  color_tone?: CardAsset["colorTone"];
  religious_content?: CardAsset["religiousContent"];
};

export type CardCatalogUpsertInput = {
  cardId?: string;
  cardTitle: string;
  imageProvider?: string;
  imageUrl: string;
  imageKey?: string;
  styleMain: TextType;
  styleSub: string;
  tone: CardAsset["tone"];
  imagery: VisualSeries;
  textDensity: CardAsset["textDensity"];
  energyLevel: CardAsset["energyLevel"];
  captionText: string;
  defaultPrompt: string;
  status: CardStatus;
  uploadedBy?: string;
};

export type CardAdminFilters = {
  styleMain?: string;
  tone?: string;
  status?: string;
  imagery?: string;
  keyword?: string;
  sort?: "latest_upload" | "last_updated" | "title";
};

const CARD_TABLE = process.env.SUPABASE_CARD_TABLE || "card_catalog";
let extendedColumnsSupport: boolean | null = null;

export const textTypes: TextType[] = ["問安語", "勵志語", "神佛金句"];

export const visualSeriesOptions: VisualSeries[] = [
  "花系列",
  "神明系列",
  "台灣花布系列",
  "山系列",
];

const textTypeConfigs: Record<
  TextType,
  {
    fontSize: CardAsset["fontSize"];
    colorTone: CardAsset["colorTone"];
    religiousContent: CardAsset["religiousContent"];
  }
> = {
  問安語: {
    fontSize: "large",
    colorTone: "calm",
    religiousContent: "none",
  },
  勵志語: {
    fontSize: "medium",
    colorTone: "bright",
    religiousContent: "none",
  },
  神佛金句: {
    fontSize: "large",
    colorTone: "calm",
    religiousContent: "high",
  },
};

const visualSeriesConfigs: Record<
  VisualSeries,
  {
    emoji: string;
    bgStart: string;
    bgEnd: string;
    accent: string;
  }
> = {
  花系列: { emoji: "🌸", bgStart: "#fff1f2", bgEnd: "#fecdd3", accent: "#be123c" },
  神明系列: { emoji: "🙏", bgStart: "#fff7ed", bgEnd: "#fed7aa", accent: "#9a3412" },
  "台灣花布系列": { emoji: "🧵", bgStart: "#eff6ff", bgEnd: "#dbeafe", accent: "#1d4ed8" },
  山系列: { emoji: "🌿", bgStart: "#ecfccb", bgEnd: "#bbf7d0", accent: "#166534" },
};

const EXTERNAL_SEED_CARDS: CardCatalogRow[] = [
  {
    card_id: "C0001",
    card_title: "晨光平安・花開暖暖",
    image_provider: "external",
    image_url: "https://images.unsplash.com/photo-1468327768560-75b778cbb551?auto=format&fit=crop&w=1200&q=80",
    image_key: "",
    style_main: "問安語",
    style_sub: "溫柔晨光",
    tone: "溫和",
    imagery: "花系列",
    text_density: "short",
    energy_level: "steady",
    caption_text: "願你今天平安順心，心情輕鬆。",
    default_prompt: "看著這張花開的圖，寫一句今天想對自己說的話。",
    status: "active",
    uploaded_by: "system-seed",
  },
  {
    card_id: "C0002",
    card_title: "慢慢也很好・山林清氣",
    image_provider: "external",
    image_url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    image_key: "",
    style_main: "勵志語",
    style_sub: "舒心散步",
    tone: "明亮",
    imagery: "山系列",
    text_density: "medium",
    energy_level: "uplift",
    caption_text: "放慢腳步，今天也能有好心情。",
    default_prompt: "看著這片山林，寫一句今天最想記下的心情。",
    status: "active",
    uploaded_by: "system-seed",
  },
  {
    card_id: "C0003",
    card_title: "佛光護佑・安心靜心",
    image_provider: "external",
    image_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    image_key: "",
    style_main: "神佛金句",
    style_sub: "靜心平安",
    tone: "平靜",
    imagery: "神明系列",
    text_density: "short",
    energy_level: "calm",
    caption_text: "願你平安健康，福慧常伴左右。",
    default_prompt: "看著這張安靜的圖，寫一句今天想留下的祝福。",
    status: "active",
    uploaded_by: "system-seed",
  },
  {
    card_id: "C0004",
    card_title: "早安・花開暖暖",
    image_provider: "external",
    image_url: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=80",
    image_key: "",
    style_main: "問安語",
    style_sub: "柔和問候",
    tone: "溫和",
    imagery: "花系列",
    text_density: "short",
    energy_level: "steady",
    caption_text: "送上一句問安，願你今天舒服自在。",
    default_prompt: "這張圖讓你想到什麼？寫一句今天的問候。",
    status: "active",
    uploaded_by: "system-seed",
  },
  {
    card_id: "C0005",
    card_title: "日日都有光・山林清氣",
    image_provider: "external",
    image_url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
    image_key: "",
    style_main: "勵志語",
    style_sub: "向光而行",
    tone: "明亮",
    imagery: "山系列",
    text_density: "medium",
    energy_level: "uplift",
    caption_text: "願你心裡有光，日子一天比一天安穩。",
    default_prompt: "看著這張有光的圖，寫一句今天想鼓勵自己的話。",
    status: "active",
    uploaded_by: "system-seed",
  },
  {
    card_id: "C0006",
    card_title: "心安得福・安心靜心",
    image_provider: "external",
    image_url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80",
    image_key: "",
    style_main: "神佛金句",
    style_sub: "安心祝福",
    tone: "平靜",
    imagery: "神明系列",
    text_density: "short",
    energy_level: "calm",
    caption_text: "心安就是福，願福氣常在。",
    default_prompt: "看著這張平靜的圖，寫一句今天想守住的心情。",
    status: "active",
    uploaded_by: "system-seed",
  },
];

function normalizeVisualSeries(value: string): VisualSeries {
  switch (value) {
    case "神佛系列":
    case "神明系列":
      return "神明系列";
    case "山林系列":
    case "山系列":
      return "山系列";
    case "台灣花布系列":
      return "台灣花布系列";
    default:
      return "花系列";
  }
}

function normalizeRow(row: CardCatalogRow): CardCatalogRow {
  return {
    ...row,
    card_id: row.card_id || row.id || "",
    card_title: row.card_title || row.title || "",
    image_provider: row.image_provider || "external",
    image_url: row.image_url || "",
    image_key: row.image_key || "",
    series: normalizeVisualSeries(String(row.series || row.imagery || row.visual_series || "花系列")),
    style_main: row.style_main || row.text_type || "問安語",
    style_sub: row.style_sub || "",
    tone: row.tone || "溫和",
    imagery: normalizeVisualSeries(String(row.imagery || row.visual_series || "花系列")),
    text_density: row.text_density || "short",
    energy_level: row.energy_level || "steady",
    caption_text: row.caption_text || row.caption || "",
    default_prompt: row.default_prompt || row.prompt || "",
    status: row.status || "draft",
    uploaded_by: row.uploaded_by || "system",
    created_at: row.created_at,
    updated_at: row.updated_at,
    id: row.id || row.card_id || "",
    title: row.title || row.card_title || "",
    text_type: row.text_type || row.style_main || "問安語",
    visual_series: normalizeVisualSeries(String(row.visual_series || row.imagery || "花系列")),
    caption: row.caption || row.caption_text || "",
    prompt: row.prompt || row.default_prompt || "",
    cc0_source: row.cc0_source || "",
    font_size: row.font_size,
    color_tone: row.color_tone,
    religious_content: row.religious_content,
  };
}

function mapCardRow(row: CardCatalogRow): CardAsset {
  const normalized = normalizeRow(row);
  const textConfig = textTypeConfigs[normalized.style_main];
  const visualConfig = visualSeriesConfigs[normalized.imagery];

  return {
    id: normalized.card_id,
    cardId: normalized.card_id,
    title: normalized.card_title,
    cardTitle: normalized.card_title,
    imageProvider: normalized.image_provider || "external",
    imageUrl: normalized.image_url,
    imageKey: normalized.image_key || "",
    styleMain: normalized.style_main,
    styleSub: normalized.style_sub,
    tone: normalized.tone,
    imagery: normalized.imagery,
    textDensity: normalized.text_density,
    energyLevel: normalized.energy_level,
    caption: normalized.caption_text,
    captionText: normalized.caption_text,
    prompt: normalized.default_prompt || normalized.prompt || "",
    defaultPrompt: normalized.default_prompt || normalized.prompt || "",
    status: normalized.status,
    uploadedBy: normalized.uploaded_by || "system",
    createdAt: normalized.created_at || "",
    updatedAt: normalized.updated_at || "",

    textType: normalized.style_main,
    visualSeries: normalized.imagery,
    cc0Source: normalized.cc0_source || "",
    fontSize: normalized.font_size || textConfig.fontSize,
    colorTone: normalized.color_tone || textConfig.colorTone,
    religiousContent: normalized.religious_content || textConfig.religiousContent,
    emoji: visualConfig.emoji,
    bgStart: visualConfig.bgStart,
    bgEnd: visualConfig.bgEnd,
    accent: visualConfig.accent,
  };
}

function toRow(input: CardCatalogUpsertInput, existing?: CardCatalogRow): CardCatalogRow {
  const now = new Date().toISOString();
  const cardId = input.cardId || existing?.card_id || "";
  return normalizeRow({
    card_id: cardId,
    card_title: input.cardTitle,
    image_provider: input.imageProvider || existing?.image_provider || "external",
    image_url: input.imageUrl,
    image_key: input.imageKey || existing?.image_key || "",
    series: input.imagery,
    style_main: input.styleMain,
    style_sub: input.styleSub,
    tone: input.tone,
    imagery: input.imagery,
    text_density: input.textDensity,
    energy_level: input.energyLevel,
    caption_text: input.captionText,
    default_prompt: input.defaultPrompt,
    status: input.status,
    uploaded_by: input.uploadedBy || existing?.uploaded_by || "admin",
    created_at: existing?.created_at || now,
    updated_at: now,
  });
}

async function supabaseReadCards() {
  return supabaseSelect<CardCatalogRow>(CARD_TABLE, "select=*&order=card_id.asc");
}

async function supportsExtendedCardCatalogColumns() {
  if (extendedColumnsSupport !== null) {
    return extendedColumnsSupport;
  }

  const baseUrl = resolveSupabaseRestUrl();
  const headers = supabaseHeaders();
  if (!baseUrl || !headers) {
    extendedColumnsSupport = false;
    return extendedColumnsSupport;
  }

  const response = await fetch(`${baseUrl}/${CARD_TABLE}?select=image_provider&limit=1`, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  extendedColumnsSupport = response.ok;
  return extendedColumnsSupport;
}

async function localReadCards() {
  return readLocalTable<CardCatalogRow>(CARD_TABLE);
}

async function writeLocalCards(rows: CardCatalogRow[]) {
  await writeLocalTable(CARD_TABLE, rows);
}

export async function listCards() {
  if (canUseSupabase() && (await hasTable(CARD_TABLE))) {
    const liveRows = await supabaseReadCards();
    if (liveRows.length > 0) {
      return liveRows.map(mapCardRow);
    }
  }

  const localRows = await localReadCards();
  if (localRows.length > 0) {
    return localRows.map(mapCardRow);
  }

  return EXTERNAL_SEED_CARDS.map(mapCardRow);
}

export async function listCardsForAdmin(filters?: {
  styleMain?: string;
  tone?: string;
  status?: string;
  imagery?: string;
  keyword?: string;
  sort?: "latest_upload" | "last_updated" | "title";
}) {
  const cards = await listCards();
  const keyword = (filters?.keyword || "").trim().toLowerCase();
  return cards
    .filter((card) => {
      if (filters?.styleMain && card.styleMain !== filters.styleMain) return false;
      if (filters?.tone && card.tone !== filters.tone) return false;
      if (filters?.status && card.status !== filters.status) return false;
      if (filters?.imagery && card.imagery !== filters.imagery) return false;
      if (keyword) {
        const haystack = [card.cardTitle, card.captionText, card.cardId, card.imagery].join(" ").toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    })
    .sort((left, right) => {
      if (filters?.sort === "title") return left.cardTitle.localeCompare(right.cardTitle, "zh-Hant");
      if (filters?.sort === "last_updated") return right.updatedAt.localeCompare(left.updatedAt);
      return right.createdAt.localeCompare(left.createdAt) || right.updatedAt.localeCompare(left.updatedAt);
    });
}

export async function getActiveCards() {
  const allCards = await listCards();
  return allCards.filter((card) => card.status === "active" && Boolean(card.imageUrl));
}

export async function getCardById(cardId: string) {
  const allCards = await listCards();
  return allCards.find((card) => card.id === cardId);
}

export async function getCardCatalogRowById(cardId: string) {
  const cards = await listCards();
  const found = cards.find((card) => card.cardId === cardId);
  if (!found) return null;
  return normalizeRow({
    card_id: found.cardId,
    card_title: found.cardTitle,
    image_provider: found.imageProvider,
    image_url: found.imageUrl,
    image_key: found.imageKey,
    series: found.imagery,
    style_main: found.styleMain,
    style_sub: found.styleSub,
    tone: found.tone,
    imagery: found.imagery,
    text_density: found.textDensity,
    energy_level: found.energyLevel,
    caption_text: found.captionText,
    default_prompt: found.defaultPrompt,
    status: found.status,
    uploaded_by: found.uploadedBy,
    created_at: found.createdAt,
    updated_at: found.updatedAt,
  });
}

export async function generateNextCardId() {
  const cards = await listCards();
  const max = cards.reduce((current, card) => {
    const numeric = Number(card.cardId.replace(/^C/u, ""));
    return Number.isFinite(numeric) ? Math.max(current, numeric) : current;
  }, 0);
  return `C${String(max + 1).padStart(4, "0")}`;
}

export async function upsertCardCatalog(input: CardCatalogUpsertInput) {
  const cardId = input.cardId || (await generateNextCardId());
  const existing = await getCardCatalogRowById(cardId);
  const row = toRow({ ...input, cardId }, existing ?? undefined);

  if (canUseSupabase() && (await hasTable(CARD_TABLE))) {
    const payload = (await supportsExtendedCardCatalogColumns())
      ? row
      : {
          card_id: row.card_id,
          card_title: row.card_title,
          style_main: row.style_main,
          style_sub: row.style_sub,
          tone: row.tone,
          series: row.series,
          imagery: row.imagery,
          text_density: row.text_density,
          energy_level: row.energy_level,
          caption_text: row.caption_text,
          status: row.status,
          id: row.card_id,
          title: row.card_title,
          text_type: row.style_main,
          visual_series: row.imagery,
          caption: row.caption_text,
          prompt: row.default_prompt,
          cc0_source: "",
          image_url: row.image_url,
          font_size: row.style_main === "勵志語" ? "medium" : "large",
          color_tone: row.tone === "明亮" ? "bright" : "calm",
          religious_content: row.style_main === "神佛金句" ? "high" : "none",
        };
    const saved = await supabaseInsert(CARD_TABLE, [payload], true);
    if (!saved) {
      throw new Error("Unable to upsert card_catalog row in Supabase.");
    }
  } else {
    const existingRows = await localReadCards();
    const index = existingRows.findIndex((item) => normalizeRow(item).card_id === cardId);
    const nextRows = [...existingRows];
    if (index >= 0) {
      nextRows[index] = row;
    } else {
      nextRows.push(row);
    }
    await writeLocalCards(nextRows);
  }

  return mapCardRow(row);
}

export async function setCardCatalogStatus(cardId: string, status: CardStatus) {
  const existing = await getCardCatalogRowById(cardId);
  if (!existing) {
    throw new Error(`Card ${cardId} not found.`);
  }

  return upsertCardCatalog({
    cardId,
    cardTitle: existing.card_title,
    imageProvider: existing.image_provider,
    imageUrl: existing.image_url,
    imageKey: existing.image_key,
    styleMain: existing.style_main,
    styleSub: existing.style_sub,
    tone: existing.tone,
    imagery: existing.imagery,
    textDensity: existing.text_density,
    energyLevel: existing.energy_level,
    captionText: existing.caption_text,
    defaultPrompt: existing.default_prompt || "",
    status,
    uploadedBy: existing.uploaded_by,
  });
}

export async function getCardFilterOptions() {
  const cards = await listCards();
  return {
    styleMain: [...new Set(cards.map((card) => card.styleMain))].sort(),
    tone: [...new Set(cards.map((card) => card.tone))].sort(),
    status: [...new Set(cards.map((card) => card.status))].sort(),
    imagery: [...new Set(cards.map((card) => card.imagery))].sort(),
  };
}

export async function deleteDraftCards(cardIds: string[]) {
  const ids = [...new Set(cardIds.filter(Boolean))];
  if (ids.length === 0) return 0;

  if (canUseSupabase() && (await hasTable(CARD_TABLE))) {
    const query = ids.map((id) => `"${id}"`).join(",");
    const deleted = await supabaseDelete(CARD_TABLE, `card_id=in.(${encodeURIComponent(query)})&status=eq.draft`);
    return deleted ? ids.length : 0;
  }

  const existingRows = await localReadCards();
  const nextRows = existingRows.filter((row) => {
    const normalized = normalizeRow(row);
    return !(ids.includes(normalized.card_id) && normalized.status === "draft");
  });
  await writeLocalCards(nextRows);
  return existingRows.length - nextRows.length;
}

export async function recommendCards(options: {
  textType: TextType;
  visualSeries: VisualSeries;
  excludeCardIds?: string[];
}) {
  const pool = (await getActiveCards()).filter((card) => !(options.excludeCardIds ?? []).includes(card.id));

  const exact = pool.filter((card) => card.textType === options.textType && card.visualSeries === options.visualSeries);
  const sameTextType = pool.filter((card) => card.textType === options.textType && card.visualSeries !== options.visualSeries);
  const sameVisual = pool.filter((card) => card.visualSeries === options.visualSeries && card.textType !== options.textType);
  const randomPool = pool
    .filter((card) => card.textType !== options.textType && card.visualSeries !== options.visualSeries)
    .sort(() => Math.random() - 0.5);

  const selected: CardAsset[] = [];
  const used = new Set<string>();

  for (const bucket of [exact, sameTextType, sameVisual, randomPool]) {
    for (const card of bucket) {
      if (selected.length >= 3) break;
      if (!used.has(card.id)) {
        selected.push(card);
        used.add(card.id);
      }
    }
  }

  return selected.slice(0, 3);
}
