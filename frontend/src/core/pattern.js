import { detectGrid, sampleGrid, makeGrid } from './grid.js';
import { createMatcher, rgbToHex } from './colorMatch.js';
import { detectBackground } from './background.js';
import { mergeSimilarColors } from './quantize.js';
import { generateColorLabels } from '../utils/labelGenerator.js';

/**
 * Full image → bead pattern pipeline, no DOM required.
 * @param {{width, height, data}} image - RGBA pixels
 * @param {object} opts
 * @param {Array} opts.beads - bead colours to match against
 * @param {'lab'|'rgb'} [opts.colorMode]
 * @param {object} [opts.grid] - {cellWidth, cellHeight?, offsetX?, offsetY?} to skip detection
 * @param {boolean} [opts.removeBackground]
 * @param {number} [opts.mergeThreshold] - ΔE radius for merging noisy colours (0 = off)
 */
export function buildPattern(image, { beads, colorMode = 'lab', grid = null, removeBackground = true, mergeThreshold = 5 }) {
  const g = grid
    ? makeGrid(image, grid.cellWidth, grid.cellHeight ?? grid.cellWidth, grid.offsetX ?? 0, grid.offsetY ?? 0)
    : detectGrid(image);
  const cells = sampleGrid(image, g);
  if (mergeThreshold > 0) mergeSimilarColors(cells, mergeThreshold);
  const { width, height, data } = cells;

  const match = createMatcher(beads, colorMode);
  const beadGrid = [];
  const colorMapping = {};
  const alpha = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const hex = rgbToHex(data[i], data[i + 1], data[i + 2]);
      const { bead } = match(hex);
      colorMapping[hex] = bead.id;
      row.push(bead.id);
      alpha[y * width + x] = data[i + 3];
    }
    beadGrid.push(row);
  }

  const backgroundMask = detectBackground(beadGrid, alpha, width, height);
  const legend = legendFor(beadGrid, beads, removeBackground ? backgroundMask : null);
  return { grid: g, cells, beadGrid, backgroundMask, colorMapping, legend };
}

/**
 * Bead counts with display labels (A1, G3...), most-used first.
 * @returns {Array<{beadId, beadName, beadCode, hex, count, label}>}
 */
export function legendFor(beadGrid, beads, backgroundMask = null) {
  const counts = {};
  beadGrid.forEach((row, y) => row.forEach((id, x) => {
    if (id && !backgroundMask?.[y]?.[x]) counts[id] = (counts[id] || 0) + 1;
  }));
  const byId = Object.fromEntries(beads.map(b => [b.id, b]));
  const legend = Object.entries(counts)
    .map(([beadId, count]) => ({
      beadId,
      beadName: byId[beadId]?.name ?? beadId,
      beadCode: byId[beadId]?.code,
      hex: byId[beadId]?.hex ?? '#000000',
      count,
    }))
    .sort((a, b) => b.count - a.count);
  const labels = generateColorLabels(legend);
  return legend.map(item => ({ ...item, label: labels[item.beadId] ?? '??' }));
}

/** Bounding box of non-background cells, so exports skip empty margins. */
export function contentBounds(beadGrid, backgroundMask) {
  const h = beadGrid.length, w = beadGrid[0]?.length ?? 0;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (backgroundMask?.[y]?.[x]) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  if (maxX < 0) return { x: 0, y: 0, width: w, height: h };
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
