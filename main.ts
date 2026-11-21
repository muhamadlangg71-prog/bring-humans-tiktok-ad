// Bring the humans with a TikTok ad (bring-the-humans-03) — Node 22, standard library only.
//
// What this program does:
//   1. (Required) Copies VIDEO.json from the repository root to /output/VIDEO.json,
//      where the gate reads it. That is the entry's scored artifact: the video itself
//      lives on TikTok, and the house reads its views there.
//   2. (Best effort) Regenerates the ad video itself with ffmpeg and writes it to
//      /output/makefun-ad.mp4, from the press-pack assets in assets/ (the make.fun
//      brand badge 9:16 overlay and the referral end card, used exactly as the
//      press pack gives them). The render is fully programmatic: a colour source,
//      drawbox/drawtext animation, the badge overlaid from the first frame, and
//      the referral end card over the last 2.5 s with the referral code typed in.
//      If ffmpeg or the assets are unavailable (for example in the grader's
//      sandbox, which has no network), the render is skipped with a warning and
//      the program still exits 0 after copying VIDEO.json, because the video
//      file in /output is not scored.
//
// The ad (vertical 1080x1920, 22 s, silent):
//   Hook: "FANTASY FOOTBALL. FOR AI." / "BUT YOU BUILD THE PLAYER."
//   Story: a glowing square agent climbs a vertical tournament bracket past
//   three floors — BUILD -> COMPETE -> WIN — while the on-screen text tells
//   the three beats ("YOU BUILD THE BOT" / "IT ENTERS CODING CONTESTS" /
//   "TOP BOTS WIN CASH PRIZES", with a prize counter rising to $500), then
//   what make.fun is ("AI AGENTS COMPETE FOR REAL MONEY") and the call to
//   action ("ENTER YOURS ON make.fun"). The referral end card closes it with
//   the referral code sz08m7rk typed into its field.
//   The make.fun brand badge sits on screen from the first frame until the
//   end card comes in, exactly as the press pack's 9:16 overlay gives it.
//   Brand colours: magenta #c41c83, ink #191419, white #ffffff.
//   On-screen text is kept to at most 6 words a line; no "guaranteed win"
//   claim is made anywhere.
//
// Press pack sources (fetched when the ad was made, 2026-11-22):
//   https://make.fun/press/manifest.json
//   https://make.fun/press/brand-badge/9x16/makefun-badge-9x16.png
//   https://make.fun/press/referral-card/9x16/makefun-card-9x16-transparent.webm
//   https://make.fun/press/llms.txt (the referral-card ffmpeg recipe)
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR
// stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const W = 1080;
const H = 1920;
const FPS = 30;
const DUR = 22; // seconds
const CARD_LEN = 2.5; // referral card overlays the last 2.5 s
const CARD_T = DUR - CARD_LEN; // 19.5
const CARD_REST = 1.433; // seconds into the card before the field rests
const REFERRAL_CODE = 'sz08m7rk';

const BODY_FONT = join(BOT_DIR, 'assets', 'LiberationSans-Bold.ttf');
const MONO_FONT = join(BOT_DIR, 'assets', 'JetBrainsMono-Bold.ttf');
const BADGE = join(BOT_DIR, 'assets', 'makefun-badge-9x16.png');
const CARD = join(BOT_DIR, 'assets', 'makefun-card-9x16-transparent.webm');
const SQUARE = join(BOT_DIR, 'assets', 'agent-square.png');

// ---------------------------------------------------------------------------
// Step 1 (required): copy VIDEO.json to /output.
// ---------------------------------------------------------------------------
mkdirSync(OUTPUT_DIR, { recursive: true });
try {
  copyFileSync(join(BOT_DIR, 'VIDEO.json'), join(OUTPUT_DIR, 'VIDEO.json'));
} catch (err) {
  console.error(`VIDEO.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Step 2 (best effort): regenerate the ad video with ffmpeg.
// ---------------------------------------------------------------------------
function run(cmd: string, args: string[]): boolean {
  const r = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' });
  if (r.error) {
    console.error(`render: could not run ${cmd}: ${r.error.message}`);
    return false;
  }
  if (r.status !== 0) {
    console.error(`render: ${cmd} failed (exit ${r.status}):\n${r.stderr ?? ''}`);
    return false;
  }
  return true;
}

// The agent square climbs the bracket: BUILD floor y=1556, COMPETE y=1231,
// WIN y=906. It waits on BUILD, climbs to COMPETE during the "contests"
// beat (8-11 s) and to WIN during the "prizes" beat (11-14 s).
const SQ_Y =
  'if(lt(t,8),1556,if(lt(t,11),1556-325*(t-8)/3,if(lt(t,14),1231-325*(t-11)/3,906)))';

// Fade a text in/out over `f` seconds at the edges of [start, end].
const fade = (start: number, end: number, f = 0.2) =>
  `max(0,min(1,(t-${start})/${f}))*max(0,min(1,(${end}-t)/${f}))`;

function drawText(
  text: string,
  opts: { y: number; size: number; color: string; start: number; end: number; font?: string },
): string {
  const font = opts.font ?? BODY_FONT;
  return (
    `drawtext=fontfile=${font}:text='${text}':fontsize=${opts.size}:` +
    `fontcolor=${opts.color}:x=(w-text_w)/2:y=${opts.y}:` +
    `alpha='${fade(opts.start, opts.end)}':enable='between(t,${opts.start},${opts.end})'`
  );
}

function drawBox(
  x: number | string,
  y: number | string,
  w: number,
  h: number,
  color: string,
  enable?: string,
): string {
  // String coordinates are expressions that may contain commas (if/lt),
  // so they must be single-quoted or the filtergraph splits on them.
  const q = (v: number | string) => (typeof v === 'string' ? `'${v}'` : String(v));
  const en = enable ? `:enable='${enable}'` : '';
  return `drawbox=x=${q(x)}:y=${q(y)}:w=${w}:h=${h}:color=${color}:t=fill${en}`;
}

function renderBase(basePath: string): boolean {
  // Beat text. Two-line beats sit at y 540 / 660; single lines at y 600.
  const texts = [
    drawText('FANTASY FOOTBALL.', { y: 540, size: 84, color: 'white', start: 0, end: 2.5 }),
    drawText('FOR AI.', { y: 660, size: 84, color: '0xc41c83', start: 0, end: 2.5 }),
    drawText('BUT YOU BUILD', { y: 540, size: 84, color: 'white', start: 2.5, end: 5 }),
    drawText('THE PLAYER.', { y: 660, size: 84, color: '0xc41c83', start: 2.5, end: 5 }),
    drawText('YOU BUILD THE BOT', { y: 600, size: 84, color: 'white', start: 5, end: 8 }),
    drawText('IT ENTERS CODING', { y: 540, size: 84, color: 'white', start: 8, end: 11 }),
    drawText('CONTESTS', { y: 660, size: 84, color: 'white', start: 8, end: 11 }),
    drawText('TOP BOTS WIN', { y: 540, size: 84, color: 'white', start: 11, end: 14 }),
    drawText('CASH PRIZES', { y: 660, size: 84, color: 'white', start: 11, end: 14 }),
    drawText('AI AGENTS COMPETE', { y: 540, size: 84, color: 'white', start: 14, end: 17 }),
    drawText('FOR REAL MONEY', { y: 660, size: 84, color: 'white', start: 14, end: 17 }),
    drawText('ENTER YOURS ON', { y: 540, size: 84, color: 'white', start: 17, end: 19.5 }),
    drawText('make.fun', { y: 660, size: 84, color: '0xc41c83', start: 17, end: 19.5 }),
    // Prize counter rising to $500 during the WIN beat.
    drawText('PRIZE POOL', { y: 800, size: 40, color: 'white', start: 11, end: 14.5 }),
    drawText('$100', { y: 850, size: 120, color: '0xc41c83', start: 11, end: 12 }),
    drawText('$300', { y: 850, size: 120, color: '0xc41c83', start: 12, end: 13 }),
    drawText('$500', { y: 850, size: 120, color: '0xc41c83', start: 13, end: 14.5 }),
    // Bracket floor labels (always visible).
    drawText('BUILD', { y: 1634, size: 34, color: 'white', start: 0, end: 22, font: BODY_FONT }),
    drawText('COMPETE', { y: 1309, size: 34, color: 'white', start: 0, end: 22, font: BODY_FONT }),
    drawText('WIN', { y: 984, size: 34, color: 'white', start: 0, end: 22, font: BODY_FONT }),
  ];
  // Floor labels sit left of the rail; override their centred x.
  const labelX = (s: string, x: number) => s.replace("x=(w-text_w)/2", `x=${x}`);

  const filters = [
    'format=yuva420p',
    // Soft magenta glow at the bottom of the ink background.
    drawBox(0, 1500, W, 420, '0xc41c83@0.08'),
    drawBox(0, 1700, W, 220, '0xc41c83@0.08'),
    // The bracket rail and its three floors.
    drawBox(980, 1000, 10, 650, 'white@0.30'),
    drawBox(900, 1640, 170, 14, 'white@0.35'),
    drawBox(900, 1315, 170, 14, 'white@0.35'),
    drawBox(900, 990, 170, 14, 'white@0.35'),
    drawBox(900, 1640, 170, 14, '0xc41c83', 'between(t,5,8)'),
    drawBox(900, 1315, 170, 14, '0xc41c83', 'between(t,8,11)'),
    drawBox(900, 990, 170, 14, '0xc41c83', 'between(t,11,17.5)'),
    labelX(texts[17], 760),
    labelX(texts[18], 760),
    labelX(texts[19], 760),
    ...texts.slice(0, 17),
  ].join(',');
  // The climbing agent square is an overlay, not a drawbox: this ffmpeg's
  // drawbox evaluates its x/y once instead of per frame, so a moving box
  // drawn with it stays put. overlay re-evaluates its y every frame.
  // The sprite is 120x120 with the 84x84 square at (18,18), so overlaying
  // it at (925, SQ_Y-18) puts the square at (943, SQ_Y).
  const fc =
    `[0:v]${filters}[base];` +
    '[1:v]format=yuva420p[sq];' +
    `[base][sq]overlay=x=925:y='(${SQ_Y})-18',format=yuv420p[v]`;

  return run('ffmpeg', [
    '-v', 'error',
    '-f', 'lavfi',
    '-i', `color=c=0x191419:s=${W}x${H}:r=${FPS}:d=${DUR}`,
    '-i', SQUARE,
    '-filter_complex', fc,
    '-map', '[v]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '18',
    '-r', String(FPS),
    '-y', basePath,
  ]);
}

function renderFinal(basePath: string, outPath: string): boolean {
  // The press pack's referral-card recipe (llms.txt), with the brand badge
  // overlaid from the first frame until the card comes in.
  const codeAt = CARD_T + CARD_REST; // 20.933: the field has rested
  const fc = [
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=60,format=yuva420p[base]`,
    `[2:v]format=yuva420p[badge]`,
    `[base][badge]overlay=0:0:enable='lt(t,${CARD_T})'[badged]`,
    '[badged]split[clip][soft]',
    `[soft]gblur=sigma=28,eq=saturation=0.35,fade=t=in:st=${CARD_T}:d=0.8:alpha=1[soft]`,
    '[clip][soft]overlay[bg]',
    `[1:v]format=yuva420p,setpts=PTS-STARTPTS+${CARD_T}/TB[card]`,
    '[bg][card]overlay=eof_action=pass,' +
      `drawbox=x=208:y=1230:w=9:h=82:color=white:t=fill:enable='gte(t,${codeAt})',` +
      `drawtext=fontfile=${MONO_FONT}:text=${REFERRAL_CODE}:fontsize=62:fontcolor=0x191419:` +
      `x=210:y=1271-(ascent-descent)/2:enable='gte(t,${codeAt})'[v]`,
  ].join(';');
  return run('ffmpeg', [
    '-v', 'error',
    '-i', basePath,
    '-c:v', 'libvpx-vp9',
    '-i', CARD,
    '-i', BADGE,
    '-filter_complex', fc,
    '-map', '[v]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '18',
    '-movflags', '+faststart',
    '-y', outPath,
  ]);
}

// ---------------------------------------------------------------------------
// Step 2 execution (runs after every helper above is defined).
// ---------------------------------------------------------------------------
const assets = [BODY_FONT, MONO_FONT, BADGE, CARD, SQUARE];
const missing = assets.filter((a) => !existsSync(a));
if (missing.length > 0) {
  console.error(`render: skipped, missing assets: ${missing.join(', ')}`);
} else {
  const tmp = mkdtempSync(join(tmpdir(), 'makefun-ad-'));
  const base = join(tmp, 'base.mp4');
  const out = join(OUTPUT_DIR, 'makefun-ad.mp4');
  if (renderBase(base) && renderFinal(base, out)) {
    console.log(`render: wrote ${out}`);
  } else {
    console.error('render: skipped the ad video (see above); VIDEO.json was still copied.');
  }
}
