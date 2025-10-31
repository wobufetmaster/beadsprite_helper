import { lab, rgb, differenceCiede2000 } from 'culori';

/**
 * Convert RGB values (0-255) to LAB color space
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {object} LAB color object { mode: 'lab', l, a, b }
 */
export function rgbToLab(r, g, b) {
  // culori expects RGB in 0-1 range
  return lab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 });
}

/**
 * Convert hex color to LAB color space
 * @param {string} hexColor - Hex color like "#FF0000"
 * @returns {object} LAB color object
 */
export function hexToLab(hexColor) {
  return lab(hexColor);
}

/**
 * Calculate Delta E (CIE2000) distance between two colors
 * @param {object} color1 - Color in any culori format
 * @param {object} color2 - Color in any culori format
 * @returns {number} Distance value (0 = identical)
 */
export function calculateColorDistance(color1, color2) {
  return differenceCiede2000(color1, color2);
}

/**
 * Calculate Euclidean distance in RGB space (fallback/legacy)
 * @param {object} rgb1 - {r, g, b} with values 0-255
 * @param {object} rgb2 - {r, g, b} with values 0-255
 * @returns {number} Euclidean distance
 */
export function calculateRgbDistance(rgb1, rgb2) {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Convert hex to RGB object
 * @param {string} hex - Hex color like "#FF0000"
 * @returns {object} {r, g, b} with values 0-255
 */
export function hexToRgb(hex) {
  const rgbColor = rgb(hex);
  return {
    r: Math.round(rgbColor.r * 255),
    g: Math.round(rgbColor.g * 255),
    b: Math.round(rgbColor.b * 255)
  };
}
