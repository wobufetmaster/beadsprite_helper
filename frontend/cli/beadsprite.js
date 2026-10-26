#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { buildPattern } from '../src/core/pattern.js';
import { colorsForPalettes, PALETTES } from '../src/core/palettes.js';
import { layoutPattern, renderPng, renderPdf } from './render.js';

const HELP = `Usage: beadsprite <image> [options]

Turns pixel art (PNG/JPEG/GIF/WebP, any upscale, JPEG noise is fine) into a
bead pattern: <name>-pattern.png and <name>-pattern.pdf.

Options:
  -o, --out <dir|file>    Output directory, or a .png/.pdf path (default: next to the image)
  -p, --palette <ids>     Comma-separated: ${Object.keys(PALETTES).join(', ')} (default: perler)
      --cell <w[xh]>      Skip detection; source pixels per bead, e.g. 8 or 6.4x6.5
      --offset <x,y>      Where the first cell starts, with --cell (default 0,0)
      --no-detect         Treat every pixel as one bead
      --keep-background   Don't strip the detected background
      --mirror            Mirror left↔right (for ironing from the back)
      --board <n>         Pegboard size for page splits/lines (default 29)
      --rgb               Match colours by RGB distance instead of CIEDE2000
      --merge <ΔE>        Merge source colours closer than this before matching,
                          cleans up JPEG noise (default 5, 0 = off)
      --title <text>      Title printed on the pattern
      --json              Also print the result as JSON
  -h, --help
`;

function fail(msg) {
  console.error(`beadsprite: ${msg}\n\n${HELP}`);
  process.exit(1);
}

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', short: 'o' },
    palette: { type: 'string', short: 'p', default: 'perler' },
    cell: { type: 'string' },
    offset: { type: 'string', default: '0,0' },
    'no-detect': { type: 'boolean', default: false },
    'keep-background': { type: 'boolean', default: false },
    mirror: { type: 'boolean', default: false },
    board: { type: 'string', default: '29' },
    rgb: { type: 'boolean', default: false },
    merge: { type: 'string', default: '5' },
    title: { type: 'string' },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (opts.help) { console.log(HELP); process.exit(0); }
if (positionals.length !== 1) fail('expected exactly one image');

const input = path.resolve(positionals[0]);
const base = path.basename(input, path.extname(input));

let img;
try {
  img = await loadImage(input);
} catch (err) {
  fail(`could not read ${input}: ${err.message}`);
}
const canvas = createCanvas(img.width, img.height);
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);
const image = ctx.getImageData(0, 0, img.width, img.height);

let grid = null;
if (opts['no-detect']) {
  grid = { cellWidth: 1 };
} else if (opts.cell) {
  const [cw, ch = cw] = opts.cell.split('x').map(Number);
  const [ox, oy = 0] = opts.offset.split(',').map(Number);
  if (!(cw > 0) || !(ch > 0) || Number.isNaN(ox) || Number.isNaN(oy)) fail(`bad --cell/--offset: ${opts.cell} ${opts.offset}`);
  grid = { cellWidth: cw, cellHeight: ch, offsetX: ox, offsetY: oy };
}

if (!(Number(opts.merge) >= 0)) fail(`bad --merge: ${opts.merge}`);

let beads;
try {
  beads = colorsForPalettes(opts.palette.split(',').map(s => s.trim()));
} catch (err) {
  fail(err.message);
}

const pattern = buildPattern(image, {
  beads,
  colorMode: opts.rgb ? 'rgb' : 'lab',
  grid,
  removeBackground: !opts['keep-background'],
  mergeThreshold: Number(opts.merge),
});
const g = pattern.grid;

if (!grid && !g.detected) {
  console.warn(`! No pixel grid found — using every pixel as a bead (${g.cols}×${g.rows}).`);
  if (g.cols * g.rows > 200 * 200) console.warn('  That is huge. If this is upscaled art, pass --cell <pixels-per-bead>.');
} else if (!grid && g.confidence < 0.6) {
  console.warn(`! Low-confidence grid (${(g.confidence * 100).toFixed(0)}%) — check the PNG, or pass --cell to override.`);
}

const layout = layoutPattern(pattern, { mirror: opts.mirror, keepBackground: opts['keep-background'] });
const board = Number(opts.board) || 29;
const title = opts.title ?? base;

// --out foo.png / foo.pdf → that prefix; anything else is a directory.
const prefix = opts.out && /\.(png|pdf)$/i.test(opts.out)
  ? opts.out.replace(/\.(png|pdf)$/i, '')
  : path.join(opts.out ?? path.dirname(input), `${base}-pattern`);
await mkdir(path.dirname(path.resolve(prefix)), { recursive: true });
const pngPath = `${prefix}.png`, pdfPath = `${prefix}.pdf`;
await writeFile(pngPath, await renderPng(layout, pattern.legend, { board, title }));
await writeFile(pdfPath, renderPdf(layout, pattern.legend, { board, title, mirror: opts.mirror }));

const total = pattern.legend.reduce((s, l) => s + l.count, 0);
const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(2));
console.log(`${path.basename(input)}: ${img.width}×${img.height} px`);
console.log(`  grid    ${fmt(g.cellWidth)}×${fmt(g.cellHeight)} px/bead, offset ${fmt(g.offsetX)},${fmt(g.offsetY)}` +
  (grid ? ' (manual)' : g.detected ? ` (detected, ${(g.confidence * 100).toFixed(0)}% confidence)` : ' (none)'));
console.log(`  pattern ${layout.width}×${layout.height} beads, ${total} beads, ${pattern.legend.length} colours`);
for (const item of pattern.legend) {
  console.log(`    ${item.label.padEnd(4)} ${String(item.count).padStart(5)}  ${item.beadCode ? item.beadCode + ' ' : ''}${item.beadName}`);
}
console.log(`  wrote   ${pngPath}\n          ${pdfPath}`);

if (opts.json) {
  console.log(JSON.stringify({ grid: g, width: layout.width, height: layout.height, legend: pattern.legend }, null, 2));
}
