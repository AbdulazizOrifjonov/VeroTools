/**
 * OCKEAN — seed media generator.
 *
 * Vector illustrations (./tools/*.svg, ./decor/*.svg) are tinted per brand and rendered to PNG
 * with sharp (librsvg). Everything is drawn with paths — no <text>, no system fonts — so the
 * output is identical on a bare Linux/Docker image. Brand wordmarks use pre-extracted glyph
 * outlines (./fonts/wordmark-glyphs.json, see the LICENSE-*.txt files next to it).
 *
 * Tool SVGs use four colour placeholders that are replaced at render time:
 *   #BODY01 body base, #BODY02 lighter highlight, #BODY03 darker shadow, #ACC001 accent.
 * All sources are cached in memory after the first read.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import type { BannerArt, ToolType } from '../data/types';

export interface ToolColors {
  body: string;
  accent?: string;
}

/**
 * Focal points (0..1 of the 1000×1000 illustration frame) of the most characteristic detail of
 * each tool — chuck, disc, control panel, display… — used by the 'detail' product view.
 */
export const TOOL_FOCUS: Record<ToolType, { x: number; y: number }> = {
  drill_cordless: { x: 0.377, y: 0.249 },
  rotary_hammer: { x: 0.323, y: 0.254 },
  angle_grinder: { x: 0.342, y: 0.625 },
  circular_saw: { x: 0.322, y: 0.61 },
  jigsaw: { x: 0.266, y: 0.673 },
  impact_wrench: { x: 0.271, y: 0.222 },
  hammer: { x: 0.6, y: 0.24 },
  wrench: { x: 0.515, y: 0.189 },
  screwdriver_set: { x: 0.5, y: 0.74 },
  pliers: { x: 0.447, y: 0.221 },
  pump_submersible: { x: 0.738, y: 0.408 },
  pump_surface: { x: 0.297, y: 0.415 },
  compressor: { x: 0.758, y: 0.381 },
  generator_open: { x: 0.642, y: 0.443 },
  generator_inverter: { x: 0.351, y: 0.649 },
  welder_inverter: { x: 0.498, y: 0.48 },
  welding_helmet: { x: 0.5, y: 0.433 },
  concrete_mixer: { x: 0.253, y: 0.168 },
  tile_cutter: { x: 0.48, y: 0.608 },
  lawn_mower: { x: 0.387, y: 0.469 },
  grass_trimmer: { x: 0.272, y: 0.745 },
  chainsaw: { x: 0.541, y: 0.589 },
  pressure_washer: { x: 0.523, y: 0.459 },
  laser_level: { x: 0.5, y: 0.27 },
  rangefinder: { x: 0.486, y: 0.387 },
  tape_measure: { x: 0.394, y: 0.631 },
  multimeter: { x: 0.378, y: 0.336 },
  battery_charger: { x: 0.235, y: 0.471 },
  drill_bit_set: { x: 0.5, y: 0.398 },
  cutting_disc: { x: 0.442, y: 0.388 },
  welding_electrodes: { x: 0.479, y: 0.262 },
  saw_blade: { x: 0.62, y: 0.184 },
  carbon_brushes: { x: 0.403, y: 0.655 },
  drill_chuck: { x: 0.249, y: 0.5 },
  socket_set: { x: 0.442, y: 0.59 },
  tool_case: { x: 0.343, y: 0.489 },
  drill_press: { x: 0.359, y: 0.487 },
  bench_grinder: { x: 0.247, y: 0.413 },
};

// ─────────────────────────────────────────────────────────────── constants

const HOUSE: ToolColors = { body: '#FF4500', accent: '#1C1C1F' };
const DEFAULT_ACCENT = '#303338';
const PRODUCT_BG = '#F4F4F6';
const DETAIL_ZOOM = 1.9;
const FRAME = 1000;

// ─────────────────────────────────────────────────────────────── asset loading

let assetRoot: string | undefined;
const sourceCache = new Map<string, string>();

function moduleDir(): string | undefined {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return typeof __dirname === 'string' ? __dirname : undefined;
  }
}

/** Finds the folder holding tools/, decor/ and fonts/ (source tree, bundled dist or env override). */
function assetDir(): string {
  if (assetRoot) return assetRoot;
  const here = moduleDir();
  const candidates = [
    process.env.OCKEAN_SEED_ASSETS_DIR,
    here,
    here && path.join(here, 'assets'),
    here && path.join(here, 'seed-assets'),
    here && path.join(here, 'seed', 'assets'),
    here && path.join(here, '..', 'src', 'seed', 'assets'),
    path.resolve(process.cwd(), 'src/seed/assets'),
    path.resolve(process.cwd(), 'apps/api/src/seed/assets'),
  ].filter((p): p is string => typeof p === 'string' && p.length > 0);
  const found = candidates.find((dir) => existsSync(path.join(dir, 'tools', 'drill_cordless.svg')));
  if (!found) {
    throw new Error(
      `[seed/assets] illustration folder not found (looked in: ${candidates.join(', ')}). Set OCKEAN_SEED_ASSETS_DIR.`,
    );
  }
  assetRoot = found;
  return found;
}

function readAsset(rel: string): string {
  let src = sourceCache.get(rel);
  if (src === undefined) {
    src = readFileSync(path.join(assetDir(), rel), 'utf8');
    sourceCache.set(rel, src);
  }
  return src;
}

function assertTool(type: string): asserts type is ToolType {
  if (!Object.prototype.hasOwnProperty.call(TOOL_FOCUS, type))
    throw new Error(`[seed/assets] unknown tool type "${type}"`);
}

// ─────────────────────────────────────────────────────────────── colour (OKLCH)

type RGB = [number, number, number];

function parseHex(input: string | undefined): RGB | undefined {
  if (!input) return undefined;
  let h = input.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.replace(/./g, (c) => c + c);
  if (!/^[0-9a-f]{6}$/i.test(h)) return undefined;
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function rgbToOklch(rgb: RGB): [number, number, number] {
  const [r, g, b] = rgb.map(toLinear) as RGB;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const H = (Math.atan2(B, A) * 180) / Math.PI;
  return [L, Math.hypot(A, B), H < 0 ? H + 360 : H];
}

function oklchToLinear(L: number, C: number, H: number): RGB {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function oklchToHex(L: number, C: number, H: number): string {
  let chroma = C;
  let lin = oklchToLinear(L, chroma, H);
  // gamut map by reducing chroma
  for (let i = 0; i < 24 && lin.some((v) => v < -0.0005 || v > 1.0005); i++) {
    chroma *= 0.9;
    lin = oklchToLinear(L, chroma, H);
  }
  const hex = lin.map((v) => {
    const g = toGamma(Math.min(1, Math.max(0, v)));
    return Math.round(Math.min(1, Math.max(0, g)) * 255)
      .toString(16)
      .padStart(2, '0');
  });
  return `#${hex.join('')}`.toUpperCase();
}

function normalizeHex(input: string | undefined): string | undefined {
  const rgb = parseHex(input);
  return rgb ? oklchToHex(...rgbToOklch(rgb)) : undefined;
}

/** Base / highlight / shadow shades for a body colour (perceptual, hue-aware for yellows). */
function shades(hex: string): { base: string; light: string; dark: string } {
  const rgb = parseHex(hex) ?? parseHex(HOUSE.body)!;
  const [L, C, H] = rgbToOklch(rgb);
  const warm = H > 55 && H < 115; // yellows darken towards amber instead of olive
  return {
    base: oklchToHex(L, C, H),
    light: oklchToHex(Math.min(0.97, L + (1 - L) * (L < 0.45 ? 0.4 : 0.34)), C * 0.88, H + (warm ? 4 : 0)),
    dark: oklchToHex(L * 0.72, C * (warm ? 1.02 : 0.92), warm ? H - 14 : H),
  };
}

function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(toLinear) as RGB;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function shift(hex: string, dL: number, cMul = 1): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [L, C, H] = rgbToOklch(rgb);
  return oklchToHex(Math.max(0, Math.min(0.98, L + dL)), C * cMul, H);
}

function tint(svg: string, colors: ToolColors): string {
  const s = shades(normalizeHex(colors.body) ?? HOUSE.body);
  const accent = normalizeHex(colors.accent) ?? DEFAULT_ACCENT;
  return svg
    .replace(/#BODY01/gi, s.base)
    .replace(/#BODY02/gi, s.light)
    .replace(/#BODY03/gi, s.dark)
    .replace(/#ACC001/gi, accent);
}

/** Only allow plain colour syntax inside generated SVG attributes. */
function safeColor(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  const v = input.trim();
  return /^[#a-zA-Z0-9(),.%\s-]{1,40}$/.test(v) ? v : fallback;
}

// ─────────────────────────────────────────────────────────────── svg helpers

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const n = (v: number): string => (Math.round(v * 100) / 100).toString();
const n5 = (v: number): string => (Math.round(v * 100000) / 100000).toString();
let uidCounter = 0;
const uid = (): string => `u${(uidCounter++).toString(36)}`;

function viewBoxOf(svg: string): [number, number, number, number] {
  const m = /viewBox="([^"]+)"/.exec(svg);
  const parts = (m?.[1] ?? '0 0 1000 1000')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? FRAME, parts[3] ?? FRAME];
}

function declaredBounds(svg: string): Box | undefined {
  const m = /data-bounds="([^"]+)"/.exec(svg);
  if (!m) return undefined;
  const [x0, y0, x1, y1] = m[1]!.trim().split(/\s+/).map(Number);
  if ([x0, y0, x1, y1].some((v) => v === undefined || !Number.isFinite(v))) return undefined;
  return { x0: x0!, y0: y0!, x1: x1!, y1: y1! };
}

const boundsCache = new Map<string, Box>();

/** Visible bounds of an asset in its own viewBox units (declared, or measured once from alpha). */
async function assetBounds(rel: string): Promise<Box> {
  const cached = boundsCache.get(rel);
  if (cached) return cached;
  const src = readAsset(rel);
  let box = declaredBounds(src);
  if (!box) {
    const [vx, vy, vw, vh] = viewBoxOf(src);
    const probe = 256;
    const svg = setRootSize(
      tint(src, HOUSE).replace(/currentColor/g, '#000'),
      probe,
      Math.round((probe * vh) / vw),
    );
    const { data, info } = await sharp(Buffer.from(svg))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let x0 = info.width,
      y0 = info.height,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * info.channels + 3]! > 10) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    const kx = vw / info.width,
      ky = vh / info.height;
    box =
      x1 < 0
        ? { x0: vx, y0: vy, x1: vx + vw, y1: vy + vh }
        : { x0: vx + x0 * kx, y0: vy + y0 * ky, x1: vx + (x1 + 1) * kx, y1: vy + (y1 + 1) * ky };
  }
  boundsCache.set(rel, box);
  return box;
}

function setRootSize(svg: string, w: number, h: number): string {
  return svg.replace(/<svg\b[^>]*>/, (open) => {
    const cleaned = open.replace(/\s(width|height)="[^"]*"/g, '');
    return cleaned.replace('<svg', `<svg width="${Math.round(w)}" height="${Math.round(h)}"`);
  });
}

/** Turns a standalone SVG into a nested <svg> element with namespaced ids. */
function embed(svg: string, x: number, y: number, w: number, h: number, extra = ''): string {
  const p = `${uid()}_`;
  const body = svg
    .replace(/<\?xml[^>]*>/, '')
    .replace(/\sid="([^"]+)"/g, (_m, id: string) => ` id="${p}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_m, id: string) => `url(#${p}${id})`)
    .replace(/href="#([^"]+)"/g, (_m, id: string) => `href="#${p}${id}"`);
  return body.replace(/<svg\b[^>]*>/, (open) => {
    const vb = /viewBox="([^"]+)"/.exec(open)?.[1] ?? `0 0 ${FRAME} ${FRAME}`;
    return `<svg x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet"${extra}>`;
  });
}

function wrapSvg(width: number, height: number, viewBox: string, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width)}" height="${Math.round(height)}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${content}</svg>`;
}

async function toPng(svg: string, opaque = false): Promise<Buffer> {
  const img = sharp(Buffer.from(svg));
  return (opaque ? img.removeAlpha() : img).png({ compressionLevel: 8 }).toBuffer();
}

function clampSize(v: number | undefined, def: number, min = 16, max = 4096): number {
  if (v === undefined || !Number.isFinite(v)) return def;
  return Math.round(Math.min(max, Math.max(min, v)));
}

/** Soft elliptical ground shadow under a bounding box (radial gradients, no blur filter). */
function groundShadow(box: Box, strength = 1, spread = 1): string {
  const id = uid();
  const w = box.x1 - box.x0;
  const cx = (box.x0 + box.x1) / 2;
  const cy = box.y1;
  const a = (v: number) => n(Math.min(1, v * strength));
  return (
    `<defs><radialGradient id="${id}a"><stop offset="0" stop-color="#000" stop-opacity="${a(0.22)}"/><stop offset=".55" stop-color="#000" stop-opacity="${a(0.09)}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${id}b"><stop offset="0" stop-color="#000" stop-opacity="${a(0.26)}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>` +
    `<ellipse cx="${n(cx)}" cy="${n(cy + w * 0.012)}" rx="${n(w * 0.56 * spread)}" ry="${n(Math.max(10, w * 0.07) * spread)}" fill="url(#${id}a)"/>` +
    `<ellipse cx="${n(cx)}" cy="${n(cy + 2)}" rx="${n(w * 0.36 * spread)}" ry="${n(Math.max(5, w * 0.022))}" fill="url(#${id}b)"/>`
  );
}

// ─────────────────────────────────────────────────────────────── tools & product images

export function getToolSvg(type: ToolType, colors: ToolColors): string {
  assertTool(type);
  return tint(readAsset(`tools/${type}.svg`), colors ?? HOUSE);
}

function productBackdrop(bg: string): string {
  const id = uid();
  return (
    `<defs><radialGradient id="${id}l" cx=".42" cy=".34" r=".72"><stop offset="0" stop-color="#FFF" stop-opacity=".9"/><stop offset=".55" stop-color="#FFF" stop-opacity=".25"/><stop offset="1" stop-color="#FFF" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${id}v" cx=".5" cy=".46" r=".78"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></radialGradient></defs>` +
    `<rect width="${FRAME}" height="${FRAME}" fill="${bg}"/><rect width="${FRAME}" height="${FRAME}" fill="url(#${id}l)"/><rect width="${FRAME}" height="${FRAME}" fill="url(#${id}v)"/>`
  );
}

/** Places a tool (by its visible bounds) so that its bottom-centre lands on (cx, bottom) with the given visible height/width. */
async function placeTool(
  type: ToolType,
  colors: ToolColors,
  cx: number,
  bottom: number,
  size: { h?: number; w?: number },
  shadow = 1,
): Promise<{ svg: string; box: Box }> {
  const b = await assetBounds(`tools/${type}.svg`);
  const bw = b.x1 - b.x0,
    bh = b.y1 - b.y0;
  const k =
    size.h !== undefined && size.w !== undefined
      ? Math.min(size.h / bh, size.w / bw)
      : size.h !== undefined
        ? size.h / bh
        : (size.w ?? bw) / bw;
  const x = cx - ((b.x0 + b.x1) / 2) * k;
  const y = bottom - b.y1 * k;
  const box = { x0: x + b.x0 * k, y0: y + b.y0 * k, x1: x + b.x1 * k, y1: y + b.y1 * k };
  const svg =
    (shadow > 0 ? groundShadow(box, shadow) : '') +
    embed(getToolSvg(type, colors), x, y, FRAME * k, FRAME * k);
  return { svg, box };
}

export async function renderProductImage(
  type: ToolType,
  colors: ToolColors,
  opts: { size?: number; view?: 'main' | 'detail' | 'package'; background?: string } = {},
): Promise<Buffer> {
  assertTool(type);
  const size = clampSize(opts.size, 1200);
  const view = opts.view ?? 'main';
  const bg = safeColor(opts.background, PRODUCT_BG);
  const transparent = bg === 'transparent' || bg === 'none';
  let content = transparent ? '' : productBackdrop(bg);
  let viewBox = `0 0 ${FRAME} ${FRAME}`;

  if (view === 'package') {
    // retail box behind-right, the tool standing in front of it
    const boxRel = 'decor/package_box.svg';
    const pb = await assetBounds(boxRel);
    const pk = 600 / (pb.y1 - pb.y0);
    const px = 400 - pb.x0 * pk;
    const py = 200 - pb.y0 * pk;
    const packBox = { x0: px + pb.x0 * pk, y0: py + pb.y0 * pk, x1: px + pb.x1 * pk, y1: py + pb.y1 * pk };
    content += groundShadow(packBox, 0.9, 1.05);
    content += embed(tint(readAsset(boxRel), colors), px, py, FRAME * pk, FRAME * pk);
    const tool = await placeTool(type, colors, 400, 912, { w: 640, h: 590 }, 1);
    content += tool.svg;
  } else {
    const b = await assetBounds(`tools/${type}.svg`);
    content += groundShadow(b) + embed(getToolSvg(type, colors), 0, 0, FRAME, FRAME);
    if (view === 'detail') {
      const f = TOOL_FOCUS[type];
      const win = FRAME / DETAIL_ZOOM;
      const cx = Math.min(FRAME - win / 2, Math.max(win / 2, f.x * FRAME));
      const cy = Math.min(FRAME - win / 2, Math.max(win / 2, f.y * FRAME));
      viewBox = `${n(cx - win / 2)} ${n(cy - win / 2)} ${n(win)} ${n(win)}`;
    }
  }
  return toPng(wrapSvg(size, size, viewBox, content), !transparent);
}

export async function renderCategoryImage(type: ToolType, opts: { size?: number } = {}): Promise<Buffer> {
  assertTool(type);
  const size = clampSize(opts.size, 800);
  return toPng(setRootSize(getToolSvg(type, HOUSE), size, size));
}

// ─────────────────────────────────────────────────────────────── banners & promotions

type Theme = 'dark' | 'orange' | 'light';
type DecorKey =
  | 'delivery_van'
  | 'boxes'
  | 'package_box'
  | 'sparks'
  | 'splash'
  | 'drops'
  | 'grass'
  | 'leaves'
  | 'percent'
  | 'stripes'
  | 'rings'
  | 'grid'
  | 'bolt'
  | 'tag';

interface ToolLayer {
  kind: 'tool';
  tool: ToolType;
  x: number;
  y: number;
  h?: number;
  w?: number;
  shadow?: number;
}
interface DecorLayer {
  kind: 'decor';
  decor: DecorKey;
  x: number;
  y: number;
  w: number;
  rot?: number;
  opacity?: number;
  color?: string;
  anchor?: 'center' | 'bottom';
  tintBody?: string;
}
interface LineLayer {
  kind: 'lines';
  color: string;
  lines: Array<[number, number, number, number, number]>; // x, y, w, h, opacity
}
interface DiscLayer {
  kind: 'disc';
  x: number;
  y: number;
  r: number;
  variant?: 'water';
}
interface RectLayer {
  kind: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  opacity?: number;
  rx?: number;
}
type Layer = ToolLayer | DecorLayer | LineLayer | DiscLayer | RectLayer;
interface Layout {
  h: number; // design box is 1000 × h
  layers: Layer[];
}
interface Composition {
  theme: Theme;
  wide: Layout;
  compact: Layout;
}

const T = (tool: ToolType, x: number, y: number, h: number, extra: Partial<ToolLayer> = {}): ToolLayer => ({
  kind: 'tool',
  tool,
  x,
  y,
  h,
  ...extra,
});
const D = (
  decor: DecorKey,
  x: number,
  y: number,
  w: number,
  extra: Partial<DecorLayer> = {},
): DecorLayer => ({ kind: 'decor', decor, x, y, w, ...extra });
const DISC = (x: number, y: number, r: number, variant?: 'water'): DiscLayer => ({
  kind: 'disc',
  x,
  y,
  r,
  ...(variant ? { variant } : {}),
});

const ORANGE = '#FF4500';
const GRAPHITE = '#1C1C1F';

const lanes = (y: number, h: number, step: number, len: number): LineLayer => ({
  kind: 'lines',
  color: '#FFFFFF',
  lines: Array.from(
    { length: Math.ceil(1200 / step) },
    (_, i) => [-60 + i * step, y, len, h, 0.32] as [number, number, number, number, number],
  ),
});

const COMPOSITIONS: Record<BannerArt, Composition> = {
  'power-tools': {
    theme: 'dark',
    wide: {
      h: 580,
      layers: [
        D('rings', 560, 290, 820, { color: ORANGE, opacity: 0.35 }),
        DISC(560, 290, 280),
        T('drill_cordless', 600, 568, 540),
        T('circular_saw', 330, 578, 250),
        T('angle_grinder', 878, 580, 175),
      ],
    },
    compact: {
      h: 900,
      layers: [
        DISC(540, 450, 380),
        T('drill_cordless', 580, 872, 660),
        T('circular_saw', 300, 886, 290),
        T('angle_grinder', 850, 890, 210),
      ],
    },
  },
  garden: {
    theme: 'light',
    wide: {
      h: 580,
      layers: [
        DISC(600, 290, 280),
        D('leaves', 955, 80, 190, { rot: 16 }),
        T('grass_trimmer', 200, 560, 310),
        T('lawn_mower', 625, 568, 450),
        D('grass', 520, 604, 1300, { anchor: 'bottom' }),
      ],
    },
    compact: {
      h: 900,
      layers: [
        DISC(560, 450, 380),
        D('leaves', 900, 110, 240, { rot: 16 }),
        T('grass_trimmer', 250, 700, 380),
        T('lawn_mower', 570, 872, 560),
        T('chainsaw', 810, 890, 150),
        D('grass', 500, 916, 1300, { anchor: 'bottom' }),
      ],
    },
  },
  welding: {
    theme: 'dark',
    wide: {
      h: 580,
      layers: [
        D('sparks', 270, 430, 560),
        T('welding_helmet', 840, 560, 390),
        T('welder_inverter', 495, 568, 480),
        T('welding_electrodes', 125, 574, 330),
      ],
    },
    compact: {
      h: 900,
      layers: [
        D('sparks', 290, 640, 700),
        T('welding_helmet', 820, 850, 440),
        T('welder_inverter', 480, 872, 580),
        T('welding_electrodes', 145, 884, 380),
      ],
    },
  },
  measuring: {
    theme: 'light',
    wide: {
      h: 580,
      layers: [
        D('grid', 560, 290, 1000, { color: '#2B2E33', opacity: 0.5 }),
        {
          kind: 'lines',
          color: '#22D65F',
          lines: [
            [-40, 148, 1080, 5, 0.6],
            [468, -20, 5, 620, 0.4],
          ],
        },
        T('multimeter', 868, 566, 400),
        T('laser_level', 470, 568, 540),
        T('rangefinder', 700, 574, 320),
        T('tape_measure', 170, 576, 190),
      ],
    },
    compact: {
      h: 900,
      layers: [
        D('grid', 500, 450, 1000, { color: '#2B2E33', opacity: 0.5 }),
        {
          kind: 'lines',
          color: '#22D65F',
          lines: [
            [-40, 293, 1080, 6, 0.6],
            [457, -20, 6, 940, 0.4],
          ],
        },
        T('multimeter', 855, 868, 460),
        T('laser_level', 460, 872, 740),
        T('rangefinder', 680, 884, 380),
        T('tape_measure', 170, 888, 220),
      ],
    },
  },
  construction: {
    theme: 'orange',
    wide: {
      h: 580,
      layers: [
        DISC(430, 290, 280),
        D('stripes', 560, 612, 1150, { anchor: 'bottom', color: GRAPHITE, opacity: 0.55 }),
        T('rotary_hammer', 832, 568, 290),
        T('concrete_mixer', 430, 566, 550),
      ],
    },
    compact: {
      h: 900,
      layers: [
        DISC(440, 450, 390),
        D('stripes', 500, 924, 1150, { anchor: 'bottom', color: GRAPHITE, opacity: 0.55 }),
        T('rotary_hammer', 800, 868, 320),
        T('concrete_mixer', 420, 870, 760),
      ],
    },
  },
  water: {
    theme: 'light',
    wide: {
      h: 580,
      layers: [
        DISC(575, 290, 280, 'water'),
        D('drops', 355, 175, 230),
        D('splash', 575, 604, 760, { anchor: 'bottom', opacity: 0.85 }),
        T('pump_surface', 895, 574, 180),
        T('pump_submersible', 230, 570, 350),
        T('pressure_washer', 595, 568, 540),
      ],
    },
    compact: {
      h: 900,
      layers: [
        DISC(540, 450, 390, 'water'),
        D('drops', 300, 260, 280),
        D('splash', 540, 910, 900, { anchor: 'bottom', opacity: 0.85 }),
        T('pump_surface', 860, 884, 210),
        T('pump_submersible', 200, 876, 400),
        T('pressure_washer', 560, 872, 740),
      ],
    },
  },
  generators: {
    theme: 'dark',
    wide: {
      h: 580,
      layers: [
        D('rings', 450, 290, 820, { color: ORANGE, opacity: 0.3 }),
        DISC(450, 290, 280),
        D('bolt', 700, 200, 170, { color: ORANGE, rot: 10 }),
        T('generator_open', 420, 568, 500),
        T('generator_inverter', 832, 574, 380),
      ],
    },
    compact: {
      h: 900,
      layers: [
        DISC(440, 450, 390),
        D('bolt', 690, 280, 220, { color: ORANGE, rot: 10 }),
        T('generator_open', 400, 872, 640),
        T('generator_inverter', 790, 884, 460),
      ],
    },
  },
  'hand-tools': {
    theme: 'light',
    wide: {
      h: 580,
      layers: [
        D('rings', 555, 290, 820, { color: '#B9BBC3', opacity: 0.7 }),
        DISC(555, 290, 280),
        T('screwdriver_set', 170, 562, 330),
        T('wrench', 575, 560, 520),
        T('hammer', 545, 572, 530),
        T('pliers', 900, 576, 400),
      ],
    },
    compact: {
      h: 900,
      layers: [
        DISC(520, 440, 390),
        T('screwdriver_set', 160, 860, 380),
        T('wrench', 530, 860, 660),
        T('hammer', 500, 876, 680),
        T('pliers', 870, 884, 470),
      ],
    },
  },
  sale: {
    theme: 'orange',
    wide: {
      h: 580,
      layers: [
        DISC(360, 290, 265),
        D('percent', 800, 250, 400, { color: GRAPHITE, rot: -8 }),
        D('tag', 610, 70, 130, { color: '#FFFFFF', opacity: 0.92, rot: -14 }),
        T('drill_cordless', 360, 568, 490),
        T('angle_grinder', 860, 580, 190),
      ],
    },
    compact: {
      h: 900,
      layers: [
        DISC(400, 470, 380),
        D('percent', 760, 300, 480, { color: GRAPHITE, rot: -8 }),
        D('tag', 110, 120, 170, { color: '#FFFFFF', opacity: 0.92, rot: -18 }),
        T('drill_cordless', 400, 872, 640),
        T('angle_grinder', 820, 888, 250),
      ],
    },
  },
  delivery: {
    theme: 'dark',
    wide: {
      h: 580,
      layers: [
        { kind: 'rect', x: -60, y: 552, w: 1120, h: 56, fill: '#26262C', rx: 8 },
        lanes(577, 6, 160, 90),
        {
          kind: 'lines',
          color: ORANGE,
          lines: [
            [885, 262, 130, 10, 0.95],
            [920, 310, 95, 10, 0.65],
            [860, 358, 160, 10, 0.4],
          ],
        },
        D('boxes', 150, 562, 270, { anchor: 'bottom' }),
        D('delivery_van', 590, 574, 680, { anchor: 'bottom' }),
        D('package_box', 300, 590, 130, { anchor: 'bottom', tintBody: ORANGE }),
        T('tool_case', 912, 590, 165),
      ],
    },
    compact: {
      h: 900,
      layers: [
        { kind: 'rect', x: -60, y: 846, w: 1120, h: 74, fill: '#26262C', rx: 8 },
        lanes(880, 7, 180, 100),
        {
          kind: 'lines',
          color: ORANGE,
          lines: [
            [880, 380, 140, 13, 0.95],
            [915, 440, 105, 13, 0.65],
            [850, 500, 170, 13, 0.4],
          ],
        },
        D('boxes', 170, 856, 380, { anchor: 'bottom' }),
        D('delivery_van', 590, 878, 900, { anchor: 'bottom' }),
        D('package_box', 290, 900, 190, { anchor: 'bottom', tintBody: ORANGE }),
        T('tool_case', 880, 904, 240),
      ],
    },
  },
};

const THEME_TOOL_COLORS: Record<Theme, ToolColors> = {
  dark: HOUSE,
  light: HOUSE,
  orange: { body: '#34373D', accent: '#FF6A33' },
};

function themeBackground(theme: Theme, W: number, H: number, stage: Box): string {
  const id = uid();
  const scx = (stage.x0 + stage.x1) / 2,
    scy = (stage.y0 + stage.y1) / 2;
  const sw = stage.x1 - stage.x0,
    sh = stage.y1 - stage.y0;
  const sr = Math.max(sw, sh) * 0.62;
  const defs: string[] = [];
  const layers: string[] = [];
  const paint = (fill: string) => layers.push(`<rect width="${W}" height="${H}" fill="${fill}"/>`);
  const linear = (stops: Array<[number, string]>) => {
    const gid = `${id}l${defs.length}`;
    defs.push(
      `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`,
    );
    paint(`url(#${gid})`);
  };
  const glow = (color: string, op: number, cx = scx, cy = scy, r = sr) => {
    const gid = `${id}g${defs.length}`;
    defs.push(
      `<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset=".6" stop-color="${color}" stop-opacity="${n(op * 0.35)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`,
    );
    paint(`url(#${gid})`);
  };
  if (theme === 'dark') {
    linear([
      [0, '#1D1D22'],
      [0.55, '#141417'],
      [1, '#0D0D10'],
    ]);
    glow(ORANGE, 0.26);
    glow('#FFFFFF', 0.05, scx, stage.y0 + sh * 0.3, sr * 0.8);
  } else if (theme === 'orange') {
    linear([
      [0, '#FF6224'],
      [0.5, '#FF4500'],
      [1, '#D23800'],
    ]);
    glow('#FFFFFF', 0.22, scx - sw * 0.1, scy - sh * 0.15);
    glow('#7A1E00', 0.25, W, H, Math.max(W, H) * 0.55);
  } else {
    linear([
      [0, '#F7F7F9'],
      [1, '#EDEDF0'],
    ]);
    glow('#FFFFFF', 0.95);
    glow(ORANGE, 0.1, scx, scy + sh * 0.1, sr * 0.75);
  }
  return `<defs>${defs.join('')}</defs>${layers.join('')}`;
}

function discSvg(layer: DiscLayer, theme: Theme): string {
  const id = uid();
  const { x, y, r } = layer;
  if (layer.variant === 'water') {
    return (
      `<defs><radialGradient id="${id}" cx=".42" cy=".36"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#E4F4FD"/><stop offset="1" stop-color="#D2ECFA"/></radialGradient></defs>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#${id})"/>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 1.14)}" fill="none" stroke="#29A8E8" stroke-width="3" opacity=".45"/>`
    );
  }
  if (theme === 'dark') {
    return (
      `<defs><radialGradient id="${id}"><stop offset="0" stop-color="#34343B"/><stop offset=".7" stop-color="#232328"/><stop offset="1" stop-color="#1A1A1E"/></radialGradient>` +
      `<radialGradient id="${id}g"><stop offset=".55" stop-color="${ORANGE}" stop-opacity=".35"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/></radialGradient></defs>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 1.45)}" fill="url(#${id}g)"/>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#${id})"/>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="none" stroke="${ORANGE}" stroke-width="4"/>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 1.16)}" fill="none" stroke="${ORANGE}" stroke-width="2" stroke-dasharray="4 12" opacity=".6"/>`
    );
  }
  if (theme === 'orange') {
    return (
      `<defs><radialGradient id="${id}" cx=".4" cy=".35"><stop offset="0" stop-color="#FF6A2E"/><stop offset="1" stop-color="#E03C00"/></radialGradient></defs>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#${id})"/>` +
      `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 1.14)}" fill="none" stroke="#FFFFFF" stroke-width="3" opacity=".45"/>`
    );
  }
  return (
    `<defs><radialGradient id="${id}" cx=".42" cy=".36"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#FFEDE3"/><stop offset="1" stop-color="#FFE0CF"/></radialGradient></defs>` +
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#${id})"/>` +
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 1.14)}" fill="none" stroke="${ORANGE}" stroke-width="3" opacity=".5"/>`
  );
}

async function renderLayer(layer: Layer, theme: Theme): Promise<string> {
  if (layer.kind === 'disc') return discSvg(layer, theme);
  if (layer.kind === 'rect') {
    return `<rect x="${n(layer.x)}" y="${n(layer.y)}" width="${n(layer.w)}" height="${n(layer.h)}" rx="${n(layer.rx ?? 0)}" fill="${layer.fill}"${layer.opacity !== undefined ? ` opacity="${n(layer.opacity)}"` : ''}/>`;
  }
  if (layer.kind === 'lines') {
    return layer.lines
      .map(
        ([x, y, w, h, o]) =>
          `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(Math.min(w, h) / 2)}" fill="${layer.color}" opacity="${n(o)}"/>`,
      )
      .join('');
  }
  if (layer.kind === 'tool') {
    const shadowStrength = theme === 'dark' ? 2.2 : theme === 'orange' ? 1.4 : 1;
    const placed = await placeTool(
      layer.tool,
      THEME_TOOL_COLORS[theme],
      layer.x,
      layer.y,
      layer.h !== undefined ? { h: layer.h } : { w: layer.w ?? 300 },
      (layer.shadow ?? 1) * shadowStrength,
    );
    return placed.svg;
  }
  const rel = `decor/${layer.decor}.svg`;
  const src = readAsset(rel);
  const [, , vw, vh] = viewBoxOf(src);
  const w = layer.w;
  const h = (w * vh) / vw;
  const x = layer.x - w / 2;
  const y = layer.anchor === 'bottom' ? layer.y - h : layer.y - h / 2;
  const tinted = layer.tintBody ? tint(src, { body: layer.tintBody, accent: GRAPHITE }) : src;
  const attrs = `${layer.color ? ` color="${layer.color}"` : ''}${layer.opacity !== undefined ? ` opacity="${n(layer.opacity)}"` : ''}`;
  const el = embed(tinted, x, y, w, h, attrs);
  return layer.rot ? `<g transform="rotate(${n(layer.rot)} ${n(layer.x)} ${n(y + h / 2)})">${el}</g>` : el;
}

async function renderComposition(
  art: BannerArt,
  W: number,
  H: number,
  mode: 'banner' | 'card',
): Promise<Buffer> {
  const comp = COMPOSITIONS[art];
  if (!comp) throw new Error(`[seed/assets] unknown banner art "${art}"`);
  const aspect = W / H;
  let stage: Box;
  if (mode === 'card') stage = { x0: W * 0.33, y0: H * 0.08, x1: W * 0.965, y1: H * 0.93 };
  else if (aspect >= 1.25) stage = { x0: W * 0.455, y0: H * 0.07, x1: W * 0.98, y1: H * 0.94 };
  else stage = { x0: W * 0.05, y0: H * 0.44, x1: W * 0.95, y1: H * 0.955 };
  const sw = stage.x1 - stage.x0,
    sh = stage.y1 - stage.y0;
  const layout = sw / sh >= 1.35 ? comp.wide : comp.compact;
  const k = Math.min(sw / FRAME, sh / layout.h);
  const ox = stage.x0 + (sw - FRAME * k) / 2;
  const oy = stage.y1 - layout.h * k;
  const layers: string[] = [];
  for (const layer of layout.layers) layers.push(await renderLayer(layer, comp.theme));
  const content =
    themeBackground(comp.theme, W, H, stage) +
    `<g transform="translate(${n(ox)} ${n(oy)}) scale(${n5(k)})">${layers.join('')}</g>`;
  return toPng(wrapSvg(W, H, `0 0 ${W} ${H}`, content), true);
}

export async function renderBanner(art: BannerArt, opts: { width: number; height: number }): Promise<Buffer> {
  const W = clampSize(opts?.width, 1600, 64, 6000);
  const H = clampSize(opts?.height, 560, 64, 6000);
  return renderComposition(art, W, H, 'banner');
}

export async function renderPromotionImage(
  art: BannerArt,
  opts: { width?: number; height?: number } = {},
): Promise<Buffer> {
  const W = clampSize(opts.width, 1200, 64, 6000);
  const H = clampSize(opts.height, 800, 64, 6000);
  return renderComposition(art, W, H, W / H >= 1.1 ? 'card' : 'banner');
}

// ─────────────────────────────────────────────────────────────── brand wordmarks

interface GlyphFont {
  name: string;
  upm: number;
  asc: number;
  desc: number;
  cap: number;
  xh: number;
  glyphs: Record<string, [number, string]>;
  kern: Record<string, number>;
}
type FontKey = 'sans' | 'cond' | 'serif' | 'geo' | 'geoIt';
type Emblem =
  | 'tile'
  | 'hexnut'
  | 'loop'
  | 'anvil'
  | 'peaks'
  | 'spark'
  | 'wave'
  | 'bolt'
  | 'speed'
  | 'leaf'
  | 'orbit'
  | 'drop'
  | 'ublock'
  | 'monolith'
  | 'blade'
  | 'chevrons'
  | 'diamond';
interface BrandStyle {
  font: FontKey;
  textCase: 'upper' | 'lower' | 'asis';
  tracking: number; // em
  skew: number; // degrees, negative = oblique
  emblem: Emblem;
  /** characters from this index use the secondary text colour */
  split?: number;
  bar?: boolean; // accent bar under the wordmark
}

let glyphFonts: Record<FontKey, GlyphFont> | undefined;
function fonts(): Record<FontKey, GlyphFont> {
  if (!glyphFonts)
    glyphFonts = (
      JSON.parse(readAsset('fonts/wordmark-glyphs.json')) as { fonts: Record<FontKey, GlyphFont> }
    ).fonts;
  return glyphFonts;
}

const BRAND_STYLES: Record<string, BrandStyle> = {
  ockeanpro: { font: 'geo', textCase: 'upper', tracking: 0.02, skew: 0, emblem: 'tile', split: 5 },
  volkstark: { font: 'cond', textCase: 'upper', tracking: 0.07, skew: 0, emblem: 'hexnut' },
  kaizentech: { font: 'geo', textCase: 'lower', tracking: -0.01, skew: 0, emblem: 'loop', split: 6 },
  forgeline: { font: 'serif', textCase: 'upper', tracking: 0.06, skew: 0, emblem: 'anvil', bar: true },
  nordvik: { font: 'sans', textCase: 'upper', tracking: 0.2, skew: 0, emblem: 'peaks' },
  weldora: { font: 'geoIt', textCase: 'asis', tracking: 0, skew: 0, emblem: 'spark' },
  idrovia: { font: 'geo', textCase: 'lower', tracking: 0.01, skew: 0, emblem: 'wave' },
  voltaris: { font: 'sans', textCase: 'upper', tracking: 0.02, skew: -12, emblem: 'bolt' },
  aeroforce: { font: 'cond', textCase: 'upper', tracking: 0.04, skew: -11, emblem: 'speed' },
  bogbon: { font: 'geo', textCase: 'asis', tracking: 0.01, skew: 0, emblem: 'leaf' },
  mezon: { font: 'geo', textCase: 'upper', tracking: 0.16, skew: 0, emblem: 'orbit' },
  hydrostorm: { font: 'sans', textCase: 'upper', tracking: 0, skew: -9, emblem: 'drop' },
  usta: { font: 'sans', textCase: 'upper', tracking: 0.14, skew: 0, emblem: 'ublock' },
  monolit: { font: 'cond', textCase: 'upper', tracking: 0.12, skew: 0, emblem: 'monolith' },
  kesgich: { font: 'serif', textCase: 'asis', tracking: 0.01, skew: 0, emblem: 'blade' },
};

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function brandStyle(name: string): BrandStyle {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const known = BRAND_STYLES[key];
  if (known) return known;
  const h = hashString(key || name);
  const fontsList: FontKey[] = ['sans', 'cond', 'geo', 'serif', 'geoIt'];
  const emblems: Emblem[] = ['chevrons', 'diamond', 'hexnut', 'peaks', 'speed', 'orbit', 'tile', 'monolith'];
  const font = fontsList[h % fontsList.length]!;
  return {
    font,
    textCase: (h >>> 3) % 3 === 0 ? 'asis' : 'upper',
    tracking: [0, 0.04, 0.1][(h >>> 5) % 3]!,
    skew: font === 'geoIt' ? 0 : (h >>> 7) % 3 === 0 ? -10 : 0,
    emblem: emblems[(h >>> 9) % emblems.length]!,
  };
}

/** Maps typographic variants (and the Uzbek o'/g' apostrophe) onto available glyphs. */
function glyphFor(font: GlyphFont, text: string, i: number): [number, string] | undefined {
  const ch = text[i]!;
  const prev = i > 0 ? text[i - 1]!.toLowerCase() : '';
  const tries: string[] = [ch];
  if (ch === "'" || ch === '\u2019' || ch === '\u02BC' || ch === '\u02BB' || ch === '`' || ch === '\u2018') {
    // Uzbek Latin o'/g' take the turned comma (U+02BB, fallback U+2018); other apostrophes use U+2019
    tries.unshift(...(prev === 'o' || prev === 'g' ? ['\u02BB', '\u2018'] : ['\u2019']));
    tries.push('\u2019', "'");
  }
  tries.push(ch.toUpperCase(), ch.toLowerCase());
  for (const t of tries) {
    const g = font.glyphs[t];
    if (g) return g;
  }
  return font.glyphs['?'];
}

function layoutText(
  font: GlyphFont,
  text: string,
  tracking: number,
  split: number | undefined,
): { a: string; b: string; width: number } {
  let x = 0;
  const a: string[] = [];
  const b: string[] = [];
  const track = tracking * font.upm;
  for (let i = 0; i < text.length; i++) {
    const g = glyphFor(font, text, i);
    if (!g) continue;
    if (g[1])
      (split !== undefined && i >= split ? b : a).push(
        `<path transform="translate(${n(x)} 0)" d="${g[1]}"/>`,
      );
    x += g[0];
    if (i < text.length - 1) x += (font.kern[text[i]! + text[i + 1]!] ?? 0) + track;
  }
  return { a: a.join(''), b: b.join(''), width: x };
}

/** Emblem drawn inside a 100×100 box. */
function emblemSvg(kind: Emblem, c1: string, c2: string, c3: string): string {
  const light = shift(c1, 0.12);
  const dark = shift(c1, -0.12);
  switch (kind) {
    case 'tile':
      return `<rect x="4" y="4" width="92" height="92" rx="22" fill="${c2}"/><circle cx="50" cy="50" r="29" fill="${c1}"/><path d="M29.5 29.5A29 29 0 0 1 70.5 29.5A36 36 0 0 0 29.5 29.5Z" fill="#FFF" opacity=".35"/><circle cx="50" cy="50" r="29" fill="none" stroke="${light}" stroke-width="3" opacity=".6"/>`;
    case 'hexnut':
      return `<path fill-rule="evenodd" fill="${c1}" d="M50 4L90 27V73L50 96L10 73V27ZM50 32a18 18 0 1 0 0.01 0Z"/><path d="M50 4L90 27L50 50Z" fill="#FFF" opacity=".18"/>`;
    case 'loop':
      return `<path d="M84 34A38 38 0 1 0 88 58" fill="none" stroke="${c1}" stroke-width="16" stroke-linecap="round"/><circle cx="86" cy="18" r="10" fill="${c3}"/>`;
    case 'anvil':
      return `<path fill="${c1}" d="M2 24L26 16H94V36Q76 40 68 50L66 62H80Q86 70 88 90H12Q14 70 20 62H34L32 50Q28 42 24 38Q12 34 2 24Z"/><path d="M26 16H94V24H22Z" fill="#FFF" opacity=".3"/><rect x="10" y="84" width="80" height="10" rx="3" fill="${c3}"/>`;
    case 'peaks':
      return `<path d="M4 88L38 20L58 58L66 44L96 88Z" fill="${c1}"/><path d="M38 20L50 44L42 40L34 50L28 42Z" fill="#FFF" opacity=".9"/><path d="M66 44L96 88H78Z" fill="${dark}"/>`;
    case 'spark':
      return `<path fill="${c2}" d="M50 2C54 34 66 46 98 50C66 54 54 66 50 98C46 66 34 54 2 50C34 46 46 34 50 2Z"/><circle cx="50" cy="50" r="9" fill="#FFF" opacity=".7"/>`;
    case 'wave':
      return `<circle cx="50" cy="50" r="46" fill="${c1}"/><path d="M4 56Q27 38 50 54T96 52A46 46 0 0 1 4 56Z" fill="${light}"/><path d="M8 70Q29 56 50 68T92 68A46 46 0 0 1 8 70Z" fill="#FFF" opacity=".35"/>`;
    case 'bolt':
      return `<rect x="4" y="4" width="92" height="92" rx="26" fill="${c1}"/><path d="M58 12L26 56H48L40 88L74 42H52Z" fill="#FFF"/>`;
    case 'speed':
      return `<path d="M30 10H96L80 30H14Z" fill="${c1}"/><path d="M22 40H88L72 60H6Z" fill="${c1}" opacity=".75"/><path d="M14 70H80L64 90H-2Z" fill="${c1}" opacity=".5"/>`;
    case 'leaf':
      return `<path d="M12 88C8 40 40 8 92 8C92 60 60 92 12 88Z" fill="${c1}"/><path d="M12 88C8 40 40 8 92 8C60 30 36 56 12 88Z" fill="${light}"/><path d="M16 84Q44 48 84 16" stroke="#FFF" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>`;
    case 'orbit':
      return `<circle cx="50" cy="50" r="24" fill="${c1}"/><ellipse cx="50" cy="50" rx="46" ry="18" fill="none" stroke="${c1}" stroke-width="6" transform="rotate(-28 50 50)"/><circle cx="88" cy="30" r="8" fill="${dark}"/>`;
    case 'drop':
      return `<path d="M50 4C66 30 86 48 86 66A36 36 0 0 1 14 66C14 48 34 30 50 4Z" fill="${c1}"/><path d="M26 70Q40 56 54 66T78 62Q72 92 44 94Q24 90 26 70Z" fill="${c3}" opacity=".9"/><path d="M40 30Q30 44 28 58" stroke="#FFF" stroke-width="6" fill="none" stroke-linecap="round" opacity=".6"/>`;
    case 'ublock':
      return `<path fill-rule="evenodd" fill="${c1}" d="M24 4H76Q96 4 96 24V76Q96 96 76 96H24Q4 96 4 76V24Q4 4 24 4ZM30 20V56Q30 72 50 72Q70 72 70 56V20H56V54Q56 60 50 60Q44 60 44 54V20Z"/><rect x="30" y="80" width="40" height="8" rx="4" fill="${c2}"/>`;
    case 'monolith':
      return `<path d="M26 4H66L78 16V96H26Z" fill="${c1}"/><path d="M26 64L78 40V52L26 76Z" fill="${c2}"/><path d="M26 4H40V96H26Z" fill="#FFF" opacity=".16"/>`;
    case 'blade':
      return `<path d="M8 90L92 8L70 70Z" fill="${c1}"/><path d="M8 90L92 8L50 60Z" fill="${light}"/><rect x="4" y="84" width="30" height="12" rx="4" fill="${dark}" transform="rotate(-44 19 90)"/>`;
    case 'chevrons':
      return `<path d="M10 14H40L72 50L40 86H10L42 50Z" fill="${c1}"/><path d="M46 14H70L100 50L70 86H46L76 50Z" fill="${c1}" opacity=".6"/>`;
    case 'diamond':
    default:
      return `<path d="M50 4L96 50L50 96L4 50Z" fill="${c1}"/><path d="M50 4L96 50H50Z" fill="#FFF" opacity=".25"/><path d="M50 30L70 50L50 70L30 50Z" fill="#FFF" opacity=".9"/>`;
  }
}

export async function renderBrandLogo(
  name: string,
  colors: { primary: string; secondary?: string },
  opts: { width?: number; height?: number } = {},
): Promise<Buffer> {
  const W = clampSize(opts.width, 600, 32, 4000);
  const H = clampSize(opts.height, 200, 16, 4000);
  const style = brandStyle(name);
  const font = fonts()[style.font];
  const primary = normalizeHex(colors.primary) ?? ORANGE;
  const secondary = normalizeHex(colors.secondary);
  const lightPrimary = luminance(primary) > 0.42;
  // wordmarks must stay legible on white cards: very light primaries (yellows) set the text in the secondary/graphite colour
  const textMain = lightPrimary
    ? (secondary ?? '#1A1A1A')
    : luminance(primary) > 0.3
      ? shift(primary, -0.08)
      : primary;
  let firstColor = textMain;
  let secondColor = textMain;
  if (style.split !== undefined) {
    if (!lightPrimary && secondary && luminance(secondary) < 0.1) {
      firstColor = secondary;
      secondColor = primary;
    } else {
      secondColor = lightPrimary ? shift(primary, -0.1) : '#2B2E33';
    }
  }

  const label =
    (style.textCase === 'upper'
      ? name.toUpperCase()
      : style.textCase === 'lower'
        ? name.toLowerCase()
        : name
    ).trim() || '?';
  const run = layoutText(font, label, style.tracking, style.split);

  // geometry in a virtual 600×200 canvas, then fitted into W×H
  const capPx = 64;
  const s = capPx / font.cap;
  const skewPad = Math.abs(Math.tan((style.skew * Math.PI) / 180)) * capPx;
  const textW = run.width * s + skewPad;
  const emblemSize = 118;
  const gap = 26;
  const totalW = emblemSize + gap + textW;
  const totalH = Math.max(emblemSize, capPx + (style.bar ? 26 : 0));
  const pad = 22;
  const fit = Math.min((600 - pad * 2) / totalW, (200 - pad * 2) / totalH, 1.35);
  const ox = (600 - totalW * fit) / 2;
  const oy = (200 - totalH * fit) / 2;
  const emblemY = (totalH - emblemSize) / 2;
  const baseline = (totalH + capPx) / 2 - (style.bar ? 12 : 0);
  const tx = emblemSize + gap;
  const skew = style.skew ? ` skewX(${style.skew})` : '';
  const c2 = secondary ?? shift(primary, -0.14);
  const c3 = secondary && luminance(secondary) < 0.2 ? secondary : '#2B2E33';

  const content =
    `<g transform="translate(${n(ox)} ${n(oy)}) scale(${n5(fit)})">` +
    `<g transform="translate(0 ${n(emblemY)}) scale(${n(emblemSize / 100)})">${emblemSvg(style.emblem, primary, c2, c3)}</g>` +
    `<g transform="translate(${n(tx)} ${n(baseline)})${skew} scale(${n5(s)})"><g fill="${firstColor}">${run.a}</g>${run.b ? `<g fill="${secondColor}">${run.b}</g>` : ''}</g>` +
    (style.bar
      ? `<rect x="${n(tx)}" y="${n(baseline + 14)}" width="${n(Math.min(textW, 150))}" height="8" rx="4" fill="${primary}"/>`
      : '') +
    `</g>`;
  return toPng(wrapSvg(W, H, '0 0 600 200', content));
}
