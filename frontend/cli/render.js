import { createCanvas } from '@napi-rs/canvas';
import { jsPDF } from 'jspdf';
import { contentBounds } from '../src/core/pattern.js';
import { getContrastTextColor } from '../src/utils/labelGenerator.js';

/**
 * Crop to the beads that matter and optionally mirror (for ironing the back).
 * @returns {{width, height, cell(x, y) → legend item | null}}
 */
export function layoutPattern(pattern, { mirror = false, keepBackground = false } = {}) {
  const mask = keepBackground ? null : pattern.backgroundMask;
  const box = contentBounds(pattern.beadGrid, mask);
  const byId = Object.fromEntries(pattern.legend.map(item => [item.beadId, item]));
  return {
    width: box.width,
    height: box.height,
    cell(x, y) {
      const sx = box.x + (mirror ? box.width - 1 - x : x);
      const sy = box.y + y;
      if (mask?.[sy]?.[sx]) return null;
      return byId[pattern.beadGrid[sy][sx]] ?? null;
    },
  };
}

/**
 * Single PNG: labelled bead grid with pegboard lines, legend underneath.
 */
export function renderPng(layout, legend, { board = 29, title = '' } = {}) {
  const cell = 24;
  const pad = 24;
  const gridW = layout.width * cell, gridH = layout.height * cell;
  const swatchRow = 30;
  const legendCols = Math.max(1, Math.floor((gridW + pad) / 260));
  const legendRows = Math.ceil(legend.length / legendCols);
  const width = Math.max(gridW, 260 * Math.min(legendCols, legend.length)) + pad * 2;
  const height = pad + 32 + gridH + pad + 30 + legendRows * swatchRow + pad;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const total = legend.reduce((s, l) => s + l.count, 0);
  ctx.fillStyle = '#222';
  ctx.font = 'bold 20px sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${title}  ${layout.width}×${layout.height} beads · ${total} total · ${legend.length} colours`, pad, pad + 18);

  const gx = pad, gy = pad + 32;
  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) {
      const item = layout.cell(x, y);
      const cx = gx + x * cell + cell / 2, cy = gy + y * cell + cell / 2;
      if (!item) {
        ctx.fillStyle = '#e4e4e4';
        ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      ctx.fillStyle = item.hex;
      ctx.beginPath(); ctx.arc(cx, cy, cell / 2 - 1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = getContrastTextColor(item.hex);
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(item.label, cx, cy + 0.5);
    }
  }
  drawBoardLines(ctx, gx, gy, cell, layout, board);

  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const ly = gy + gridH + pad + 15;
  ctx.fillStyle = '#222'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Legend', pad, ly);
  sortByLabel(legend).forEach((item, i) => {
    const col = i % legendCols, row = Math.floor(i / legendCols);
    const x = pad + col * 260, y = ly + 26 + row * swatchRow;
    ctx.fillStyle = item.hex;
    ctx.beginPath(); ctx.arc(x + 11, y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = getContrastTextColor(item.hex); ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(item.label, x + 11, y + 0.5);
    ctx.fillStyle = '#222'; ctx.font = '13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${item.beadCode ? item.beadCode + ' ' : ''}${item.beadName} × ${item.count}`, x + 30, y);
  });

  return canvas.encode('png');
}

function drawBoardLines(ctx, gx, gy, cell, layout, board) {
  if (!board || (layout.width <= board && layout.height <= board)) return;
  ctx.strokeStyle = 'rgba(220, 40, 120, 0.8)';
  ctx.lineWidth = 2;
  for (let x = board; x < layout.width; x += board) {
    ctx.beginPath(); ctx.moveTo(gx + x * cell, gy); ctx.lineTo(gx + x * cell, gy + layout.height * cell); ctx.stroke();
  }
  for (let y = board; y < layout.height; y += board) {
    ctx.beginPath(); ctx.moveTo(gx, gy + y * cell); ctx.lineTo(gx + layout.width * cell, gy + y * cell); ctx.stroke();
  }
}

const sortByLabel = legend =>
  [...legend].sort((a, b) => a.label[0].localeCompare(b.label[0]) || parseInt(a.label.slice(1)) - parseInt(b.label.slice(1)));

/**
 * Printable US Letter PDF, all vector:
 *   1. overview of the whole design (with pegboard divisions)
 *   2. labelled bead chart — one page, or one page per pegboard if it won't fit legibly
 *   3. legend / shopping list
 */
export function renderPdf(layout, legend, { board = 29, title = 'Beadsprite pattern', mirror = false } = {}) {
  const pdf = new jsPDF({ unit: 'mm', format: 'letter' });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
  const M = 12;
  const total = legend.reduce((s, l) => s + l.count, 0);
  const boardsX = Math.ceil(layout.width / board), boardsY = Math.ceil(layout.height / board);

  // Page 1: overview
  header(pdf, title, `${layout.width} × ${layout.height} beads · ${total} beads · ${legend.length} colours · ` +
    `${boardsX * boardsY} pegboard${boardsX * boardsY > 1 ? 's' : ''} (${board}×${board})${mirror ? ' · MIRRORED' : ''}`, M);
  const top = M + 16;
  const size = Math.min((W - 2 * M) / layout.width, (H - top - M) / layout.height);
  drawChart(pdf, layout, { x0: (W - size * layout.width) / 2, y0: top, size, labels: false, board });

  // Page 2+: labelled chart
  const MIN_CELL = 5.5; // mm — readable label on a laser printer
  const fitsOne = (W - 2 * M - 8) / layout.width >= MIN_CELL && (H - top - M - 8) / layout.height >= MIN_CELL;
  const tiles = fitsOne
    ? [{ x: 0, y: 0, w: layout.width, h: layout.height, name: 'Chart' }]
    : boardTiles(layout, board);
  for (const t of tiles) {
    pdf.addPage();
    header(pdf, title, `${t.name} — columns ${t.x + 1}–${t.x + t.w}, rows ${t.y + 1}–${t.y + t.h}`, M);
    const s = Math.min((W - 2 * M - 8) / t.w, (H - top - M - 8) / t.h, 9);
    drawChart(pdf, layout, { x0: M + 8, y0: top + 6, size: s, labels: true, tile: t, board });
  }

  // Legend
  pdf.addPage();
  header(pdf, title, 'Legend & shopping list', M);
  let y = top + 4;
  pdf.setFontSize(10);
  for (const item of sortByLabel(legend)) {
    if (y > H - M - 12) { pdf.addPage(); header(pdf, title, 'Legend (continued)', M); y = top + 4; }
    pdf.setFillColor(item.hex); pdf.setDrawColor(80); pdf.setLineWidth(0.2);
    pdf.circle(M + 4, y, 3.2, 'FD');
    pdf.setTextColor(getContrastTextColor(item.hex)); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5);
    pdf.text(item.label, M + 4, y, { align: 'center', baseline: 'middle' });
    pdf.setTextColor(0); pdf.setFontSize(10);
    pdf.text(item.label, M + 11, y, { baseline: 'middle' });
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${item.beadCode ? item.beadCode + '  ' : ''}${item.beadName}`, M + 22, y, { baseline: 'middle' });
    pdf.text(String(item.count), W - M, y, { align: 'right', baseline: 'middle' });
    y += 8;
  }
  pdf.setLineWidth(0.3); pdf.line(M, y - 3, W - M, y - 3);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Total', M + 22, y + 2, { baseline: 'middle' });
  pdf.text(String(total), W - M, y + 2, { align: 'right', baseline: 'middle' });

  return Buffer.from(pdf.output('arraybuffer'));
}

function header(pdf, title, subtitle, M) {
  pdf.setTextColor(0);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15);
  pdf.text(title, M, M + 4);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5);
  pdf.text(subtitle, M, M + 10);
}

function boardTiles(layout, board) {
  const tiles = [];
  for (let by = 0; by * board < layout.height; by++) {
    for (let bx = 0; bx * board < layout.width; bx++) {
      tiles.push({
        x: bx * board, y: by * board,
        w: Math.min(board, layout.width - bx * board), h: Math.min(board, layout.height - by * board),
        name: `Board ${String.fromCharCode(65 + by)}${bx + 1}`,
      });
    }
  }
  return tiles;
}

function drawChart(pdf, layout, { x0, y0, size, labels, tile = null, board }) {
  const t = tile ?? { x: 0, y: 0, w: layout.width, h: layout.height };
  pdf.setLineWidth(0.1);
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      const item = layout.cell(t.x + x, t.y + y);
      const px = x0 + x * size, py = y0 + y * size;
      if (labels) { pdf.setDrawColor(200); pdf.rect(px, py, size, size, 'S'); }
      if (!item) continue;
      pdf.setFillColor(item.hex);
      pdf.setDrawColor(90);
      if (labels) {
        pdf.rect(px, py, size, size, 'FD');
        pdf.setTextColor(getContrastTextColor(item.hex));
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(size * 1.25);
        pdf.text(item.label, px + size / 2, py + size / 2, { align: 'center', baseline: 'middle' });
      } else {
        pdf.circle(px + size / 2, py + size / 2, size * 0.47, size > 2 ? 'FD' : 'F');
      }
    }
  }

  // Heavier line every 5 beads makes counting easy; pegboard edges heaviest.
  pdf.setDrawColor(60);
  for (let i = 0; i <= t.w; i++) {
    const abs = t.x + i;
    const w = abs % board === 0 || i === t.w ? 0.6 : abs % 5 === 0 ? (labels ? 0.35 : 0) : 0;
    if (w) { pdf.setLineWidth(w); pdf.line(x0 + i * size, y0, x0 + i * size, y0 + t.h * size); }
  }
  for (let j = 0; j <= t.h; j++) {
    const abs = t.y + j;
    const w = abs % board === 0 || j === t.h ? 0.6 : abs % 5 === 0 ? (labels ? 0.35 : 0) : 0;
    if (w) { pdf.setLineWidth(w); pdf.line(x0, y0 + j * size, x0 + t.w * size, y0 + j * size); }
  }

  if (labels) {
    // Row/column numbers along the edges (every 5)
    pdf.setTextColor(90); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5);
    for (let i = 0; i < t.w; i++) {
      const n = t.x + i + 1;
      if (n % 5 === 0 || i === 0) pdf.text(String(n), x0 + (i + 0.5) * size, y0 - 1.5, { align: 'center' });
    }
    for (let j = 0; j < t.h; j++) {
      const n = t.y + j + 1;
      if (n % 5 === 0 || j === 0) pdf.text(String(n), x0 - 1.5, y0 + (j + 0.5) * size, { align: 'right', baseline: 'middle' });
    }
  }
}
