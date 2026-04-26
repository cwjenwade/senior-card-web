export type TextType =
  | "祝福語"
  | "問安語"
  | "勵志語"
  | "平安語"
  | "健康語"
  | "幽默語"
  | "陪伴語";

export type VisualSeries =
  | "花系列"
  | "山水系列"
  | "神佛系列"
  | "小孩系列"
  | "動物系列"
  | "茶水果系列"
  | "日出系列"
  | "節慶系列"
  | "書法字系列";

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

export const textTypes: TextType[] = ["祝福語", "問安語", "勵志語", "平安語", "健康語", "幽默語", "陪伴語"];

export const visualSeriesOptions: VisualSeries[] = [
  "花系列",
  "山水系列",
  "神佛系列",
  "小孩系列",
  "動物系列",
  "茶水果系列",
  "日出系列",
  "節慶系列",
  "書法字系列",
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
  祝福語: {
    tone: "溫和",
    fontSize: "large",
    textDensity: "short",
    colorTone: "warm",
    religiousContent: "none",
    titles: ["平安就是福", "福氣跟著來", "事事都順心"],
    captions: ["願你今天平安健康，事事順心。", "有我溫暖的祝福，願平安健康。", "心存感恩富足，福氣自然跟著來。"],
    prompt: "選一張你今天喜歡的祝福圖。",
  },
  問安語: {
    tone: "溫和",
    fontSize: "large",
    textDensity: "short",
    colorTone: "calm",
    religiousContent: "none",
    titles: ["早安", "日安", "輕聲問好"],
    captions: ["每日心轉念，福氣跟著來。", "歲月平靜好，平安是福。", "想跟你說聲早安，今天也要保重。"],
    prompt: "選一張今天的問安圖。",
  },
  勵志語: {
    tone: "明亮",
    fontSize: "medium",
    textDensity: "medium",
    colorTone: "bright",
    religiousContent: "none",
    titles: ["慢慢也很好", "日日都有光", "一步一步來"],
    captions: ["簡單生活，知足常樂。", "放慢步調，願心情平靜順心。", "好事慢慢來，日子慢慢走。"],
    prompt: "選一張今天的勵志圖。",
  },
  平安語: {
    tone: "平靜",
    fontSize: "large",
    textDensity: "short",
    colorTone: "calm",
    religiousContent: "none",
    titles: ["平安", "心安", "歲月靜好"],
    captions: ["願身體健康，事事順心。", "平安就是福，順心就是樂。", "願心情平靜，日日平安。"],
    prompt: "選一張讓人安心的圖。",
  },
  健康語: {
    tone: "平靜",
    fontSize: "large",
    textDensity: "short",
    colorTone: "calm",
    religiousContent: "none",
    titles: ["保重身體", "健康最要緊", "今天也保重"],
    captions: ["願身體健康，事事順心。", "平安就是福，健康最重要。", "好好休息，慢慢來就很好。"],
    prompt: "選一張今天的健康圖。",
  },
  幽默語: {
    tone: "明亮",
    fontSize: "large",
    textDensity: "short",
    colorTone: "bright",
    religiousContent: "none",
    titles: ["笑一下", "今天輕鬆點", "可愛一下"],
    captions: ["輕鬆過日子，開心最重要。", "今天先笑一下，福氣就來啦。", "可可愛愛，心情自然就放鬆。"],
    prompt: "選一張今天想笑一下的圖。",
  },
  陪伴語: {
    tone: "陪伴",
    fontSize: "large",
    textDensity: "short",
    colorTone: "warm",
    religiousContent: "none",
    titles: ["你辛苦了", "我陪你", "慢慢都會好"],
    captions: ["凡事量力而行，寬心自在生活。", "先休息一下，有人陪你慢慢走。", "今天辛苦了，願你安心自在。"],
    prompt: "選一張有陪伴感的圖。",
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
  山水系列: { emoji: "⛰️", bgStart: "#ecfeff", bgEnd: "#bae6fd", accent: "#0f766e", label: "山水安穩" },
  神佛系列: { emoji: "🙏", bgStart: "#fff7ed", bgEnd: "#fed7aa", accent: "#9a3412", label: "安心靜心" },
  小孩系列: { emoji: "🧒", bgStart: "#fef9c3", bgEnd: "#fde68a", accent: "#a16207", label: "童心可愛" },
  動物系列: { emoji: "🐶", bgStart: "#fef3c7", bgEnd: "#fdba74", accent: "#92400e", label: "動物陪伴" },
  茶水果系列: { emoji: "🍵", bgStart: "#f7fee7", bgEnd: "#bbf7d0", accent: "#166534", label: "茶果溫柔" },
  日出系列: { emoji: "🌅", bgStart: "#ffedd5", bgEnd: "#fdba74", accent: "#c2410c", label: "晨光希望" },
  節慶系列: { emoji: "🏮", bgStart: "#fee2e2", bgEnd: "#fca5a5", accent: "#b91c1c", label: "喜氣熱鬧" },
  書法字系列: { emoji: "墨", bgStart: "#f5f5f4", bgEnd: "#d6d3d1", accent: "#292524", label: "字韻穩重" },
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
    } catch (error) {
      console.error(error);
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
