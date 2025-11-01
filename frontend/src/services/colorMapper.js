import { hexToRgb, calculateRgbDistance } from '../utils/colorUtils';
import { PERLER_COLORS } from '../data/perlerColors';

/**
 * Find the closest Perler bead color to an RGB pixel
 * @param {object} rgbPixel - {r, g, b} with values 0-255
 * @returns {object} Closest Perler color object
 */
function findClosestBead(rgbPixel) {
  if (!PERLER_COLORS || PERLER_COLORS.length === 0) {
    console.error('PERLER_COLORS is empty or undefined');
    throw new Error('No Perler colors available');
  }

  let closest = null;
  let minDistance = Infinity;

  // Use simple RGB Euclidean distance for now (LAB/Delta E was causing issues)
  for (const bead of PERLER_COLORS) {
    try {
      const beadRgb = hexToRgb(bead.hex);
      const distance = calculateRgbDistance(rgbPixel, beadRgb);

      if (distance < minDistance) {
        minDistance = distance;
        closest = bead;
      }
    } catch (err) {
      console.warn('Error processing bead color:', bead, err);
      continue;
    }
  }

  if (!closest && PERLER_COLORS.length > 0) {
    // Fallback to first color
    return PERLER_COLORS[0];
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
 * Create a 2D grid of bead IDs from pixel grid
 * @param {array} pixelGrid - 2D array of {r, g, b} pixels
 * @returns {array} 2D array of bead IDs
 */
export function createBeadGrid(pixelGrid) {
  const beadGrid = [];

  for (const row of pixelGrid) {
    const beadRow = [];
    for (const pixel of row) {
      const closest = findClosestBead(pixel);
      beadRow.push(closest.id);
    }
    beadGrid.push(beadRow);
  }

  return beadGrid;
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
