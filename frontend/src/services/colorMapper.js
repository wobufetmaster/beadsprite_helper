import { calculateLabDistance, rgbToLab } from '../utils/colorUtils';

/**
 * Map image pixels to closest Perler bead colors
 * @param {Object} parsedPixels - { width, height, grid: [[{r,g,b}]] }
 * @param {Array} perlerColors - Array of Perler color objects with id, hex, rgb, lab
 * @param {string} mode - 'lab' or 'rgb' for distance calculation
 * @returns {Object} - { colorMapping: {hexColor: beadColorId}, beadCounts: {beadColorId: count} }
 */
export function mapPixelsToBeads(parsedPixels, perlerColors, mode = 'lab') {
  if (!parsedPixels || !perlerColors || perlerColors.length === 0) {
    return { colorMapping: {}, beadCounts: {} };
  }

  const colorMapping = {};
  const beadCounts = {};

  // Process each pixel
  for (let y = 0; y < parsedPixels.height; y++) {
    for (let x = 0; x < parsedPixels.width; x++) {
      const pixel = parsedPixels.grid[y][x];
      const pixelHex = rgbToHex(pixel.r, pixel.g, pixel.b);

      // Skip if we've already mapped this color
      if (colorMapping[pixelHex]) {
        beadCounts[colorMapping[pixelHex]]++;
        continue;
      }

      // Find closest Perler color
      const closestBead = findClosestColor(pixel, perlerColors, mode);

      // Store mapping
      colorMapping[pixelHex] = closestBead.id;

      // Update bead count
      beadCounts[closestBead.id] = (beadCounts[closestBead.id] || 0) + 1;
    }
  }

  return { colorMapping, beadCounts };
}

/**
 * Find the closest Perler color to a given RGB pixel
 * @param {Object} pixel - {r, g, b}
 * @param {Array} perlerColors - Array of Perler colors
 * @param {string} mode - 'lab' or 'rgb'
 * @returns {Object} - Closest Perler color object
 */
function findClosestColor(pixel, perlerColors, mode) {
  let minDistance = Infinity;
  let closestColor = perlerColors[0];

  const pixelLab = mode === 'lab' ? rgbToLab(pixel.r, pixel.g, pixel.b) : null;

  for (const perlerColor of perlerColors) {
    let distance;

    if (mode === 'lab') {
      // Use LAB color space for perceptually accurate matching
      const perlerLab = perlerColor.lab || rgbToLab(
        perlerColor.rgb.r,
        perlerColor.rgb.g,
        perlerColor.rgb.b
      );
      distance = calculateLabDistance(pixelLab, perlerLab);
    } else {
      // Use RGB Euclidean distance
      distance = Math.sqrt(
        Math.pow(pixel.r - perlerColor.rgb.r, 2) +
        Math.pow(pixel.g - perlerColor.rgb.g, 2) +
        Math.pow(pixel.b - perlerColor.rgb.b, 2)
      );
    }

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = perlerColor;
    }
  }

  return closestColor;
}

/**
 * Convert RGB to hex string
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} - Hex color string (e.g., "#ff0000")
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Get sorted bead list with counts
 * @param {Object} beadCounts - {beadColorId: count}
 * @param {Array} perlerColors - Array of Perler colors
 * @returns {Array} - Sorted array of {color, count} objects
 */
export function getBeadList(beadCounts, perlerColors) {
  return Object.entries(beadCounts)
    .map(([beadId, count]) => ({
      color: perlerColors.find(c => c.id === beadId),
      count
    }))
    .filter(item => item.color)
    .sort((a, b) => b.count - a.count);
}
