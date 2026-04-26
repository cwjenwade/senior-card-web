import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function storageDir() {
  return process.env.JENNY_DATA_DIR || (process.env.VERCEL ? "/tmp/jenny-product-store" : path.join(process.cwd(), "storage", "product-store"));
}

function tablePath(table: string) {
  return path.join(storageDir(), `${table}.json`);
}

async function ensureDir() {
  await mkdir(storageDir(), { recursive: true });
}

export async function readLocalTable<T>(table: string) {
  try {
    const content = await readFile(tablePath(table), "utf8");
    return JSON.parse(content) as T[];
  } catch {
    return [] as T[];
  }
}

export async function writeLocalTable<T>(table: string, rows: T[]) {
  await ensureDir();
  await writeFile(tablePath(table), JSON.stringify(rows, null, 2), "utf8");
}
