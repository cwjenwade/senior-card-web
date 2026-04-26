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

export const cards: CardAsset[] = [
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

const CARD_TABLE = process.env.SUPABASE_CARD_TABLE || "card_catalog";

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

function mapCardRow(row: CardRow): CardAsset {
  return {
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
  };
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
  const picks: CardAsset[] = [];
  const used = new Set<string>();

  const first =
    pool.find((card) => card.textType === options.textType && card.visualSeries === options.visualSeries) ??
    pool.find((card) => card.textType === options.textType) ??
    pool.find((card) => card.visualSeries === options.visualSeries) ??
    pool[0];

  if (first) {
    picks.push(first);
    used.add(first.id);
  }

  const second =
    pool.find(
      (card) =>
        !used.has(card.id) &&
        card.textType === options.textType &&
        card.visualSeries !== (first?.visualSeries ?? options.visualSeries),
    ) ?? pool.find((card) => !used.has(card.id) && card.textType === options.textType) ?? pool.find((card) => !used.has(card.id));

  if (second) {
    picks.push(second);
    used.add(second.id);
  }

  const third =
    pool.find(
      (card) =>
        !used.has(card.id) &&
        card.visualSeries === options.visualSeries &&
        card.textType !== (first?.textType ?? options.textType),
    ) ?? pool.find((card) => !used.has(card.id) && card.visualSeries === options.visualSeries) ?? pool.find((card) => !used.has(card.id));

  if (third) {
    picks.push(third);
    used.add(third.id);
  }

  return picks;
}
