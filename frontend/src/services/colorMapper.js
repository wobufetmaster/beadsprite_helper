import { createMatcher, rgbToHex } from '../core/colorMatch';
import { PERLER_COLORS } from '../data/perlerColors';

/**
 * Create a 2D grid of bead IDs from a pixel grid.
 * @param {array} pixelGrid - 2D array of {r, g, b} pixels
 * @param {array} beads - bead colours to match against (default: Perler)
 * @param {'lab'|'rgb'} mode
 * @returns {{beadGrid: string[][], colorMapping: Object<string, string>}} bead ids, and image hex → bead id
 */
export function createBeadGrid(pixelGrid, beads = PERLER_COLORS, mode = 'lab') {
  const match = createMatcher(beads, mode);
  const colorMapping = {};
  const beadGrid = pixelGrid.map(row => row.map(({ r, g, b }) => {
    const hex = rgbToHex(r, g, b);
    const id = match(hex).bead.id;
    colorMapping[hex] = id;
    return id;
  }));
  return { beadGrid, colorMapping };
}
