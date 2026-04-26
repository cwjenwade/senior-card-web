import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const tempDir = path.join(projectRoot, ".tmp");
const svgPath = path.join(tempDir, "rich-menu-m01-m04-temp.svg");
const pngPath = path.join(publicDir, "rich-menu-m01-m04-temp.png");
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
  <rect width="1250" height="843" fill="#F2A65A"/>
  <rect x="1250" width="1250" height="843" fill="#7FB069"/>
  <rect y="843" width="1250" height="843" fill="#2A9D8F"/>
  <rect x="1250" y="843" width="1250" height="843" fill="#D97706"/>
  <rect x="1218" y="90" width="64" height="1506" rx="32" fill="rgba(255,255,255,0.42)"/>
  <rect x="120" y="811" width="2260" height="64" rx="32" fill="rgba(255,255,255,0.42)"/>
  <text x="625" y="300" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="120" font-weight="800" fill="#FFFFFF">今日</text>
  <text x="625" y="470" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="120" font-weight="800" fill="#FFFFFF">長輩圖</text>
  <text x="625" y="640" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="52" font-weight="600" fill="#FFF7ED">M01</text>
  <text x="1875" y="300" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="120" font-weight="800" fill="#FFFFFF">看圖</text>
  <text x="1875" y="470" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="120" font-weight="800" fill="#FFFFFF">寫一句</text>
  <text x="1875" y="640" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="52" font-weight="600" fill="#F7FFF0">M02</text>
  <text x="625" y="1140" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="120" font-weight="800" fill="#FFFFFF">我的雞蛋</text>
  <text x="625" y="1310" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="120" font-weight="800" fill="#FFFFFF">進度</text>
  <text x="625" y="1480" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="52" font-weight="600" fill="#ECFEFF">Progress</text>
  <text x="1875" y="1140" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="120" font-weight="800" fill="#FFFFFF">我的</text>
  <text x="1875" y="1310" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="120" font-weight="800" fill="#FFFFFF">小檔案</text>
  <text x="1875" y="1480" text-anchor="middle" font-family="PingFang TC, Noto Sans TC, Arial, sans-serif" font-size="52" font-weight="600" fill="#FFF7ED">M03</text>
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
    name: "Jenny Temp M01-M04 Menu",
    chatBarText: "服務選單",
    areas: [
      {
        bounds: {
          x: 0,
          y: 0,
          width: 1250,
          height: 843,
        },
        action: {
          type: "postback",
          label: "今日長輩圖",
          data: "module=m01&action=start",
          displayText: "今日長輩圖",
        },
      },
      {
        bounds: {
          x: 1250,
          y: 0,
          width: 1250,
          height: 843,
        },
        action: {
          type: "postback",
          label: "看圖寫一句",
          data: "module=m02&action=start",
          displayText: "看圖寫一句",
        },
      },
      {
        bounds: {
          x: 0,
          y: 843,
          width: 1250,
          height: 843,
        },
        action: {
          type: "postback",
          label: "我的雞蛋進度",
          data: "module=egg&action=start",
          displayText: "我的雞蛋進度",
        },
      },
      {
        bounds: {
          x: 1250,
          y: 843,
          width: 1250,
          height: 843,
        },
        action: {
          type: "postback",
          label: "我的小檔案",
          data: "module=m03&action=start",
          displayText: "我的小檔案",
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
  console.log("2. Tap top-left: 今日長輩圖 -> should enter M01.");
  console.log("3. Tap top-right: 看圖寫一句 -> should enter M02.");
  console.log("4. Tap bottom-left: 我的雞蛋進度 -> should show egg progress.");
  console.log("5. Tap bottom-right: 我的小檔案 -> should enter M03.");
  console.log("6. Confirm webhook replies on /api/line/webhook.");
  console.log(`Image generated at: ${pngPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
