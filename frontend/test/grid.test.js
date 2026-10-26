import { describe, it, expect } from 'vitest';
import { loadImage } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
import { detectGrid, sampleGrid } from '../src/core/grid.js';
import { makeSprite, renderSprite, jpegRoundTrip, imageDataOf, SPRITE_COLORS } from './helpers.js';

/** Fraction of sampled cells whose nearest sprite colour is the source cell's colour (what palette matching would see). */
function cellAccuracy(sprite, sampled, grid, scale, offX, offY) {
  let good = 0, total = 0;
  for (let r = 0; r < sampled.height; r++) {
    for (let c = 0; c < sampled.width; c++) {
      // Which source cell does this sampled cell's centre land in?
      const cx = grid.offsetX + (c + 0.5) * grid.cellWidth;
      const cy = grid.offsetY + (r + 0.5) * grid.cellHeight;
      const sc = Math.floor((cx - offX) / scale), sr = Math.floor((cy - offY) / scale);
      if (sc < 0 || sr < 0 || sc >= sprite.cols || sr >= sprite.rows) continue;
      const i = (r * sampled.width + c) * 4;
      const dist = rgb => Math.abs(sampled.data[i] - rgb[0]) + Math.abs(sampled.data[i + 1] - rgb[1]) + Math.abs(sampled.data[i + 2] - rgb[2]);
      const nearest = SPRITE_COLORS.reduce((best, rgb, k) => (dist(rgb) < dist(SPRITE_COLORS[best]) ? k : best), 0);
      total++;
      if (nearest === sprite.cells[sr * sprite.cols + sc]) good++;
    }
  }
  return good / total;
}

const CASES = [
  // [scale, offsetX, offsetY, cols, rows]
  [8, 0, 0, 24, 20],
  [10, 3, 7, 32, 32],
  [4, 1, 2, 40, 30],
  [3, 0, 0, 48, 48],
  [2.5, 1, 1, 40, 40],
  [6.4, 2, 5, 29, 29],
  [12.75, 6, 0, 20, 26],
  [16, 9, 4, 16, 16],
  [33.3, 10, 20, 24, 24],
  [7, 0, 0, 64, 12],
];

describe('detectGrid on JPEG-compressed upscaled sprites', () => {
  for (const [scale, offX, offY, cols, rows] of CASES) {
    it(`scale ${scale}, offset ${offX},${offY}, ${cols}x${rows}`, async () => {
      const sprite = makeSprite(cols, rows, Math.round(scale * 100) + cols);
      const image = await jpegRoundTrip(renderSprite(sprite, scale, offX, offY), 60);
      const grid = detectGrid(image);

      expect(grid.detected).toBe(true);
      expect(Math.abs(grid.cellWidth - scale) / scale).toBeLessThan(0.01);
      expect(Math.abs(grid.cellHeight - scale) / scale).toBeLessThan(0.01);

      const sampled = sampleGrid(image, grid);
      expect(Math.abs(sampled.width - cols)).toBeLessThanOrEqual(1);
      expect(Math.abs(sampled.height - rows)).toBeLessThanOrEqual(1);
      // Below 3 px per cell, JPEG's 2x2 chroma subsampling bleeds colour across cells.
      const minAccuracy = scale < 3 ? 0.95 : 0.98;
      expect(cellAccuracy(sprite, sampled, grid, scale, offX, offY)).toBeGreaterThan(minAccuracy);
    });
  }

  it('reports no grid for 1:1 pixel art', () => {
    const sprite = makeSprite(40, 40, 7);
    const grid = detectGrid(renderSprite(sprite, 1));
    expect(grid.detected).toBe(false);
    expect(grid.cellWidth).toBe(1);
  });

  it('finds the grid in the bundled sample image', async () => {
    const path = fileURLToPath(new URL('../../sample_image.png', import.meta.url));
    const image = imageDataOf(await loadImage(path));
    const grid = detectGrid(image);
    expect(grid.detected).toBe(true);
    console.log('sample_image.png grid:', grid);
  });
});
