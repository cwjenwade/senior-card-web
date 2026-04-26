export type TextType =
  | "問安語"
  | "勵志語"
  | "神佛金句";

export type VisualSeries =
  | "花系列"
  | "神佛系列"
  | "山林系列";

export type CardAsset = {
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
  emoji: string;
  bgStart: string;
  bgEnd: string;
  accent: string;
};

type CardRow = {
  id: string;
  title: string;
  text_type: TextType;
  visual_series: VisualSeries;
  tone: CardAsset["tone"];
  caption: string;
  prompt: string;
  status: CardAsset["status"];
  cc0_source: string;
  image_url: string;
  font_size: CardAsset["fontSize"];
  text_density: CardAsset["textDensity"];
  color_tone: CardAsset["colorTone"];
  religious_content: CardAsset["religiousContent"];
};

const CARD_TABLE = process.env.SUPABASE_CARD_TABLE || "card_catalog";

export const textTypes: TextType[] = ["問安語", "勵志語", "神佛金句"];

export const visualSeriesOptions: VisualSeries[] = [
  "花系列",
  "神佛系列",
  "山林系列",
];

const textTypeConfigs: Record<
  TextType,
  {
    tone: CardAsset["tone"];
    fontSize: CardAsset["fontSize"];
    textDensity: CardAsset["textDensity"];
    colorTone: CardAsset["colorTone"];
    religiousContent: CardAsset["religiousContent"];
    titles: string[];
    captions: string[];
    prompt: string;
  }
> = {
  問安語: {
    tone: "溫和",
    fontSize: "large",
    textDensity: "short",
    colorTone: "calm",
    religiousContent: "none",
    titles: ["早安", "午安", "平安問候"],
    captions: ["願你今天平安順心，心情輕鬆。", "送上一句問安，願你今天舒服自在。", "今天也記得照顧自己，慢慢來就好。"],
    prompt: "選一張今天的問安圖。",
  },
  勵志語: {
    tone: "明亮",
    fontSize: "medium",
    textDensity: "medium",
    colorTone: "bright",
    religiousContent: "none",
    titles: ["日日都有光", "一步一步來", "慢慢也很好"],
    captions: ["放慢腳步，今天也能有好心情。", "願你心裡有光，日子一天比一天安穩。", "好事慢慢來，福氣也會慢慢來。"],
    prompt: "選一張今天的勵志圖。",
  },
  神佛金句: {
    tone: "平靜",
    fontSize: "large",
    textDensity: "short",
    colorTone: "calm",
    religiousContent: "high",
    titles: ["佛光護佑", "福慧圓滿", "心安得福"],
    captions: ["願你平安健康，福慧常伴左右。", "一念清淨，願今天事事安好。", "心安就是福，願福氣常在。"],
    prompt: "選一張今天的神佛金句圖。",
  },
};

const visualSeriesConfigs: Record<
  VisualSeries,
  {
    emoji: string;
    bgStart: string;
    bgEnd: string;
    accent: string;
    label: string;
  }
> = {
  花系列: { emoji: "🌸", bgStart: "#fff1f2", bgEnd: "#fecdd3", accent: "#be123c", label: "花開暖暖" },
  神佛系列: { emoji: "🙏", bgStart: "#fff7ed", bgEnd: "#fed7aa", accent: "#9a3412", label: "安心靜心" },
  山林系列: { emoji: "🌿", bgStart: "#ecfccb", bgEnd: "#bbf7d0", accent: "#166534", label: "山林清氣" },
};

function createGeneratedCards() {
  const generated: CardAsset[] = [];
  let index = 1;

  for (const textType of textTypes) {
    const textConfig = textTypeConfigs[textType];
    for (const visualSeries of visualSeriesOptions) {
      const visualConfig = visualSeriesConfigs[visualSeries];
      for (let variant = 0; variant < 3; variant += 1) {
        const id = `C${String(index).padStart(4, "0")}`;
        generated.push({
          id,
          title: `${textConfig.titles[variant]}・${visualConfig.label}`,
          textType,
          visualSeries,
          tone: textConfig.tone,
          caption: textConfig.captions[variant],
          prompt: textConfig.prompt,
          status: "active",
          cc0Source: "Jenny generated card",
          imageUrl: `/api/m01/cards/${id}/image`,
          fontSize: textConfig.fontSize,
          textDensity: textConfig.textDensity,
          colorTone: textConfig.colorTone,
          religiousContent: textConfig.religiousContent,
          emoji: visualConfig.emoji,
          bgStart: visualConfig.bgStart,
          bgEnd: visualConfig.bgEnd,
          accent: visualConfig.accent,
        });
        index += 1;
      }
    }
  }

  return generated;
}

export const cards: CardAsset[] = createGeneratedCards();

function resolveSupabaseRestUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  if (url.includes("/rest/v1")) {
    return url.replace(/\/+$/, "");
  }
  return `${url.replace(/\/+$/, "")}/rest/v1`;
}

function supabaseHeaders() {
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!apiKey) return null;
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

function canUseSupabaseCards() {
  return Boolean(resolveSupabaseRestUrl() && supabaseHeaders());
}

function enrichCard(card: Omit<CardAsset, "emoji" | "bgStart" | "bgEnd" | "accent">) {
  const visualConfig = visualSeriesConfigs[card.visualSeries];
  return {
    ...card,
    emoji: visualConfig.emoji,
    bgStart: visualConfig.bgStart,
    bgEnd: visualConfig.bgEnd,
    accent: visualConfig.accent,
  } satisfies CardAsset;
}

function mapCardRow(row: CardRow): CardAsset {
  return enrichCard({
    id: row.id,
    title: row.title,
    textType: row.text_type,
    visualSeries: row.visual_series,
    tone: row.tone,
    caption: row.caption,
    prompt: row.prompt,
    status: row.status,
    cc0Source: row.cc0_source,
    imageUrl: row.image_url,
    fontSize: row.font_size,
    textDensity: row.text_density,
    colorTone: row.color_tone,
    religiousContent: row.religious_content,
  });
}

async function supabaseReadCards() {
  const baseUrl = resolveSupabaseRestUrl();
  const headers = supabaseHeaders();
  if (!baseUrl || !headers) {
    throw new Error("Supabase env is not configured");
  }

  const response = await fetch(`${baseUrl}/${CARD_TABLE}?select=*&order=id.asc`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase card read failed for ${CARD_TABLE}: ${response.status} ${text}`);
  }

  const rows = (await response.json()) as CardRow[];
  return rows.map(mapCardRow);
}

export async function listCards() {
  if (canUseSupabaseCards()) {
    try {
      const liveCards = await supabaseReadCards();
      if (liveCards.length > 0) {
        return liveCards;
      }
    } catch {
      // Fallback to generated cards until the formal Supabase card_catalog is provisioned.
    }
  }
  return cards;
}

export async function getActiveCards() {
  const allCards = await listCards();
  return allCards.filter((card) => card.status === "active");
}

export async function getCardById(cardId: string) {
  const allCards = await listCards();
  return allCards.find((card) => card.id === cardId);
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
