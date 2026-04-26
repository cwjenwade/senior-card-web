const tableExistenceCache = new Map<string, boolean>();

export function resolveSupabaseRestUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  return url.includes("/rest/v1") ? url.replace(/\/+$/, "") : `${url.replace(/\/+$/, "")}/rest/v1`;
}

export function supabaseHeaders() {
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!apiKey) return null;
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export function canUseSupabase() {
  return Boolean(resolveSupabaseRestUrl() && supabaseHeaders());
}

export async function hasTable(table: string) {
  if (tableExistenceCache.has(table)) {
    return tableExistenceCache.get(table)!;
  }

  const baseUrl = resolveSupabaseRestUrl();
  const headers = supabaseHeaders();
  if (!baseUrl || !headers) return false;

  const response = await fetch(`${baseUrl}/${table}?select=*&limit=1`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const exists = response.ok;
  tableExistenceCache.set(table, exists);
  return exists;
}

export async function supabaseSelect<T>(table: string, query: string) {
  const baseUrl = resolveSupabaseRestUrl();
  const headers = supabaseHeaders();
  if (!baseUrl || !headers) return [] as T[];

  const response = await fetch(`${baseUrl}/${table}?${query}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    return [] as T[];
  }

  return (await response.json()) as T[];
}

export async function supabaseInsert(table: string, rows: Record<string, unknown>[], upsert = false) {
  const baseUrl = resolveSupabaseRestUrl();
  const headers = supabaseHeaders();
  if (!baseUrl || !headers) return false;

  const response = await fetch(`${baseUrl}/${table}`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: upsert ? "resolution=merge-duplicates,return=minimal" : "return=minimal",
    },
    body: JSON.stringify(rows),
    cache: "no-store",
  });

  return response.ok;
}

export async function supabasePatch(table: string, filterQuery: string, patch: Record<string, unknown>) {
  const baseUrl = resolveSupabaseRestUrl();
  const headers = supabaseHeaders();
  if (!baseUrl || !headers) return false;

  const response = await fetch(`${baseUrl}/${table}?${filterQuery}`, {
    method: "PATCH",
    headers: {
      ...headers,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
    cache: "no-store",
  });

  return response.ok;
}
