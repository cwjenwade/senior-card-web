import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const tempDir = path.join(projectRoot, ".tmp");
const svgPath = path.join(tempDir, "rich-menu-m01-m02.svg");
const pngPath = path.join(publicDir, "rich-menu-m01-m02.png");
const envPath = path.join(projectRoot, ".env.local");

function loadEnvLocal() {
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function ensureDirs() {
  mkdirSync(publicDir, { recursive: true });
  mkdirSync(tempDir, { recursive: true });
}

function createSvg() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="2500" height="1686" viewBox="0 0 2500 1686" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1250" height="1686" fill="#F2A65A"/>
  <rect x="1250" width="1250" height="1686" fill="#7FB069"/>
  <rect x="1226" y="160" width="48" height="1366" rx="24" fill="rgba(255,255,255,0.45)"/>
  <text x="625" y="640" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="160" font-weight="800" fill="#FFFFFF">製作</text>
  <text x="625" y="860" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="160" font-weight="800" fill="#FFFFFF">長輩圖</text>
  <text x="625" y="1100" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="64" font-weight="600" fill="#FFF7ED">M01 Greeting Cards</text>
  <text x="1875" y="640" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="160" font-weight="800" fill="#FFFFFF">寫日記</text>
  <text x="1875" y="860" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="160" font-weight="800" fill="#FFFFFF">換雞蛋</text>
  <text x="1875" y="1100" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="64" font-weight="600" fill="#F7FFF0">M02 Daily Diary</text>
</svg>`;
  writeFileSync(svgPath, svg, "utf8");
}

function renderPng() {
  try {
    execFileSync("sips", ["-s", "format", "png", svgPath, "--out", pngPath], {
      stdio: "pipe",
    });
  } catch {
    throw new Error("Failed to generate PNG with sips. Please make sure sips is available on this machine.");
  }
}

async function createRichMenu(token) {
  const payload = {
    size: {
      width: 2500,
      height: 1686,
    },
    selected: true,
    name: "M01 M02 Test Menu",
    chatBarText: "服務選單",
    areas: [
      {
        bounds: {
          x: 0,
          y: 0,
          width: 1250,
          height: 1686,
        },
        action: {
          type: "postback",
          label: "製作長輩圖",
          data: "module=m01&action=start",
          displayText: "製作長輩圖",
        },
      },
      {
        bounds: {
          x: 1250,
          y: 0,
          width: 1250,
          height: 1686,
        },
        action: {
          type: "postback",
          label: "寫日記換雞蛋",
          data: "module=m02&action=start",
          displayText: "寫日記換雞蛋",
        },
      },
    ],
  };

  const payloadPath = path.join(tempDir, "rich-menu-create.json");
  writeFileSync(payloadPath, JSON.stringify(payload), "utf8");
  const output = execFileSync(
    "curl",
    [
      "--silent",
      "--show-error",
      "--connect-timeout",
      "30",
      "--max-time",
      "90",
      "-X",
      "POST",
      "https://api.line.me/v2/bot/richmenu",
      "-H",
      `Authorization: Bearer ${token}`,
      "-H",
      "Content-Type: application/json",
      "--data-binary",
      `@${payloadPath}`,
    ],
    { encoding: "utf8" },
  );

  const data = JSON.parse(output);
  if (!data.richMenuId) {
    throw new Error(`Create rich menu failed: ${output}`);
  }
  return data.richMenuId;
}

async function uploadRichMenuImage(token, richMenuId) {
  execFileSync(
    "curl",
    [
      "--silent",
      "--show-error",
      "--connect-timeout",
      "30",
      "--max-time",
      "90",
      "-X",
      "POST",
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      "-H",
      `Authorization: Bearer ${token}`,
      "-H",
      "Content-Type: image/png",
      "--data-binary",
      `@${pngPath}`,
    ],
    { encoding: "utf8" },
  );
}

async function setDefaultRichMenu(token, richMenuId) {
  execFileSync(
    "curl",
    [
      "--silent",
      "--show-error",
      "--connect-timeout",
      "30",
      "--max-time",
      "90",
      "-X",
      "POST",
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      "-H",
      `Authorization: Bearer ${token}`,
      "-H",
      "Content-Length: 0",
    ],
    { encoding: "utf8" },
  );
}

async function verifyDefaultRichMenu(token) {
  const output = execFileSync(
    "curl",
    [
      "--silent",
      "--show-error",
      "--connect-timeout",
      "30",
      "--max-time",
      "90",
      "https://api.line.me/v2/bot/user/all/richmenu",
      "-H",
      `Authorization: Bearer ${token}`,
    ],
    { encoding: "utf8" },
  );

  return JSON.parse(output);
}

async function main() {
  loadEnvLocal();
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    console.error("Missing env: LINE_CHANNEL_ACCESS_TOKEN");
    process.exit(1);
  }

  ensureDirs();
  createSvg();
  renderPng();

  const richMenuId = await createRichMenu(token);
  await uploadRichMenuImage(token, richMenuId);
  await setDefaultRichMenu(token, richMenuId);
  const verify = await verifyDefaultRichMenu(token);

  console.log(`richMenuId: ${richMenuId}`);
  console.log(`Default rich menu check: ${JSON.stringify(verify)}`);
  console.log("Test checklist:");
  console.log("1. Open the LINE OA chat.");
  console.log("2. Tap left area: 製作長輩圖 -> should enter M01.");
  console.log("3. Tap right area: 寫日記換雞蛋 -> should enter M02.");
  console.log("4. Confirm webhook replies on /api/line/webhook.");
  console.log(`Image generated at: ${pngPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
