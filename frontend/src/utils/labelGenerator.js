import { converter } from 'culori';

// HSL converter for hue-based grouping
const toHsl = converter('hsl');

/**
 * Hue angle ranges for letter categories
 * Each category represents a color family
 */
const HUE_RANGES = {
  A: { name: 'Reds', min: 345, max: 15 },
  B: { name: 'Oranges', min: 15, max: 45 },
  C: { name: 'Yellows', min: 45, max: 75 },
  D: { name: 'Yellow-Greens', min: 75, max: 105 },
  E: { name: 'Greens', min: 105, max: 165 },
  F: { name: 'Cyans', min: 165, max: 195 },
  G: { name: 'Blues', min: 195, max: 255 },
  H: { name: 'Purples', min: 255, max: 285 },
  I: { name: 'Magentas', min: 285, max: 315 },
  J: { name: 'Pinks', min: 315, max: 345 },
  K: { name: 'Grays/Neutrals', saturation: 'low' }, // Saturation < 10%
  L: { name: 'Browns', lightness: 'dark', saturation: 'medium' } // Lightness < 40%, Sat 10-25%
};

/**
 * Determine hue category letter based on HSL values
 * @param {object} hsl - HSL color object from culori
 * @returns {string} Category letter (A-L)
 */
function getHueCategory(hsl) {
  const { h, s, l } = hsl;

  // Handle achromatic colors (grays/blacks/whites)
  if (s === undefined || s < 0.10) {
    return 'K'; // Grays/Neutrals
  }

  // Handle browns (dark colors with low-medium saturation)
  if (l < 0.40 && s >= 0.10 && s < 0.25) {
    return 'L'; // Browns
  }

  // Chromatic colors - categorize by hue
  const hue = h || 0; // Default to 0 if hue is undefined

  if (hue >= 345 || hue < 15) return 'A'; // Reds
  if (hue >= 15 && hue < 45) return 'B';  // Oranges
  if (hue >= 45 && hue < 75) return 'C';  // Yellows
  if (hue >= 75 && hue < 105) return 'D'; // Yellow-Greens
  if (hue >= 105 && hue < 165) return 'E'; // Greens
  if (hue >= 165 && hue < 195) return 'F'; // Cyans
  if (hue >= 195 && hue < 255) return 'G'; // Blues
  if (hue >= 255 && hue < 285) return 'H'; // Purples
  if (hue >= 285 && hue < 315) return 'I'; // Magentas
  if (hue >= 315 && hue < 345) return 'J'; // Pinks

  return 'K'; // Default to grays
}

/**
 * Generate color labels for bead colors used in pattern
 * @param {Array} legendData - Array of {beadId, beadName, hex, count} objects
 * @returns {Object} Map of beadId to label code (e.g., { "mint_green": "E1", "dark_blue": "G3" })
 */
export function generateColorLabels(legendData) {
  if (!legendData || legendData.length === 0) {
    return {};
  }

  // Group colors by hue category
  const groups = {};

  legendData.forEach(item => {
    const hsl = toHsl(item.hex);
    const category = getHueCategory(hsl);

    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push({
      beadId: item.beadId,
      hex: item.hex,
      hsl,
      count: item.count
    });
  });

  // Sort colors within each group by lightness (light to dark)
  Object.keys(groups).forEach(category => {
    groups[category].sort((a, b) => {
      // Sort by lightness descending (lighter colors first)
      return (b.hsl.l || 0) - (a.hsl.l || 0);
    });
  });

  // Assign letter-number codes
  const labelMap = {};

  Object.keys(groups).sort().forEach(category => {
    groups[category].forEach((color, index) => {
      const number = index + 1;
      labelMap[color.beadId] = `${category}${number}`;
    });
  });

  return labelMap;
}

/**
 * Calculate text color (black or white) for maximum contrast on background
 * @param {string} hex - Background color in hex format
 * @returns {string} Text color ("#000000" or "#FFFFFF")
 */
export function getContrastTextColor(hex) {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Calculate relative luminance
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Return black for light backgrounds, white for dark
  return luminance > 127.5 ? '#000000' : '#FFFFFF';
}
