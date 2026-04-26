import sharp from "sharp";

import { getCardById } from "@/lib/m01-cards";
import { pickCc0ImageForSeries } from "@/lib/m01-cc0";

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 1500;

type Params = {
  params: Promise<{
    cardId: string;
  }>;
};

function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function splitLines(text: string, maxChars: number) {
  const lines: string[] = [];
  let current = "";

  for (const char of text) {
    current += char;
    if (current.length >= maxChars) {
      lines.push(current);
      current = "";
    }
  }

  if (current) lines.push(current);
  return lines;
}

function buildOverlaySvg(args: {
  title: string;
  caption: string;
  textType: string;
  visualSeries: string;
  accent: string;
}) {
  const titleLines = splitLines(args.title, 4);
  const captionLines = splitLines(args.caption, 10);
  const titleSvg = titleLines
    .map(
      (line, index) =>
        `<text x="90" y="${250 + index * 130}" font-size="110" font-weight="700" fill="#fffdf5" letter-spacing="4">${escapeXml(line)}</text>`,
    )
    .join("");
  const captionSvg = captionLines
    .map(
      (line, index) =>
        `<text x="96" y="${980 + index * 70}" font-size="54" font-weight="500" fill="#f8fafc" letter-spacing="2">${escapeXml(line)}</text>`,
    )
    .join("");

  return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(10,17,28,0.12)"/>
          <stop offset="100%" stop-color="rgba(10,17,28,0.55)"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#veil)"/>
      <rect x="54" y="54" width="1092" height="1392" rx="42" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" stroke-width="4"/>
      <rect x="70" y="70" width="360" height="1360" rx="34" fill="rgba(15,23,42,0.28)"/>
      <text x="90" y="120" font-size="44" font-weight="700" fill="${escapeXml(args.accent)}">${escapeXml(args.textType)}</text>
      ${titleSvg}
      <line x1="90" y1="760" x2="360" y2="760" stroke="rgba(255,255,255,0.45)" stroke-width="3"/>
      ${captionSvg}
      <text x="90" y="1340" font-size="42" font-weight="600" fill="#dbeafe">${escapeXml(args.visualSeries)}</text>
      <text x="90" y="1400" font-size="30" font-weight="500" fill="#e2e8f0">祝你今天平安喜樂</text>
    </svg>
  `);
}

function buildFallbackSvg(args: {
  title: string;
  caption: string;
  bgStart: string;
  bgEnd: string;
  accent: string;
}) {
  return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${escapeXml(args.bgStart)}"/>
          <stop offset="100%" stop-color="${escapeXml(args.bgEnd)}"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect x="72" y="72" width="1056" height="1356" rx="50" fill="rgba(255,255,255,0.12)"/>
      <text x="100" y="220" font-size="120" font-weight="800" fill="${escapeXml(args.accent)}">${escapeXml(args.title)}</text>
      <text x="100" y="360" font-size="58" font-weight="600" fill="#334155">${escapeXml(args.caption)}</text>
      <text x="100" y="1320" font-size="46" font-weight="700" fill="#475569">Jenny 長輩圖</text>
    </svg>
  `);
}

async function fetchCc0Background(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "JennySeniorCard/1.0",
    },
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error(`CC0 image fetch failed: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function GET(_request: Request, { params }: Params) {
  const { cardId } = await params;
  const card = await getCardById(cardId);

  if (!card) {
    return new Response("Card not found", { status: 404 });
  }

  const numericSeed = Number(card.id.replace(/\D/g, "")) || 1;
  const cc0Image = await pickCc0ImageForSeries(card.visualSeries, numericSeed);

  try {
    let base = sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 3,
        background: card.bgStart,
      },
    });

    if (cc0Image?.url) {
      const backgroundBuffer = await fetchCc0Background(cc0Image.url);
      const normalizedBackground = await sharp(backgroundBuffer)
        .rotate()
        .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
        .jpeg({ quality: 88 })
        .toBuffer();

      base = sharp(normalizedBackground);
    }

    const composed = await base
      .composite([
        {
          input: cc0Image?.url
            ? buildOverlaySvg({
                title: card.title.split("・")[0],
                caption: card.caption,
                textType: card.textType,
                visualSeries: card.visualSeries,
                accent: card.accent,
              })
            : buildFallbackSvg({
                title: card.title,
                caption: card.caption,
                bgStart: card.bgStart,
                bgEnd: card.bgEnd,
                accent: card.accent,
              }),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    return new Response(new Uint8Array(composed), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("[m01-image] failed to render image", error);

    const fallback = await sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 3,
        background: card.bgEnd,
      },
    })
      .composite([
        {
          input: buildFallbackSvg({
            title: card.title,
            caption: card.caption,
            bgStart: card.bgStart,
            bgEnd: card.bgEnd,
            accent: card.accent,
          }),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    return new Response(new Uint8Array(fallback), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=600, s-maxage=3600",
      },
    });
  }
}
