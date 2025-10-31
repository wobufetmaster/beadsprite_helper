import { hexToLab, calculateColorDistance } from '../utils/colorUtils';
import { PERLER_COLORS } from '../data/perlerColors';

/**
 * Find the closest Perler bead color to an RGB pixel
 * @param {object} rgbPixel - {r, g, b} with values 0-255
 * @returns {object} Closest Perler color object
 */
function findClosestBead(rgbPixel) {
  // Convert pixel to LAB for accurate color distance
  const targetLab = hexToLab(`rgb(${rgbPixel.r}, ${rgbPixel.g}, ${rgbPixel.b})`);

  let closest = null;
  let minDistance = Infinity;

  for (const bead of PERLER_COLORS) {
    const beadLab = hexToLab(bead.hex);
    const distance = calculateColorDistance(targetLab, beadLab);

    if (distance < minDistance) {
      minDistance = distance;
      closest = bead;
    }
  }

  return closest;
}

/**
 * Map a pixel grid to Perler bead colors
 * @param {array} pixelGrid - 2D array of {r, g, b} pixels
 * @returns {object} Map of bead_id -> count
 */
export function mapPixelsToBeads(pixelGrid) {
  const beadMap = {};

  for (const row of pixelGrid) {
    for (const pixel of row) {
      const closest = findClosestBead(pixel);
      beadMap[closest.id] = (beadMap[closest.id] || 0) + 1;
    }
  }

  return beadMap;
}

/**
 * Convert bead map to array with color details
 * @param {object} beadMap - Map of bead_id -> count
 * @returns {array} Array of {color, count, percentage}
 */
export function formatBeadList(beadMap, totalPixels) {
  return Object.entries(beadMap)
    .map(([beadId, count]) => {
      const color = PERLER_COLORS.find(c => c.id === beadId);
      return {
        color,
        count,
        percentage: ((count / totalPixels) * 100).toFixed(1)
      };
    })
    .sort((a, b) => b.count - a.count);
}
