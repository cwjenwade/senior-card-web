type OpenverseImage = {
  id: string;
  title: string;
  url: string;
  creator?: string;
  source?: string;
  license?: string;
  license_url?: string;
};

const OPENVERSE_BASE = "https://api.openverse.org/v1/images/";

const QUERY_MAP = {
  花系列: "flowers blossom garden",
  神佛系列: "temple shrine statue",
  山林系列: "forest mountain landscape",
} as const;

const cache = new Map<string, Promise<OpenverseImage[]>>();

export function getCc0Query(visualSeries: keyof typeof QUERY_MAP) {
  return QUERY_MAP[visualSeries];
}

async function fetchOpenverseImages(query: string) {
  const url = new URL(OPENVERSE_BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("license", "cc0");
  url.searchParams.set("license_type", "commercial");
  url.searchParams.set("page_size", "8");

  const response = await fetch(url.toString(), {
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(`Openverse fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as { results?: OpenverseImage[] };
  return (data.results ?? []).filter((item) => item.url);
}

export async function getCc0ImagesForSeries(visualSeries: keyof typeof QUERY_MAP) {
  const query = getCc0Query(visualSeries);
  if (!cache.has(query)) {
    cache.set(query, fetchOpenverseImages(query).catch(() => []));
  }
  return cache.get(query)!;
}

export async function pickCc0ImageForSeries(visualSeries: keyof typeof QUERY_MAP, variantSeed: number) {
  const items = await getCc0ImagesForSeries(visualSeries);
  if (!items.length) return null;
  return items[Math.abs(variantSeed) % items.length] ?? null;
}
