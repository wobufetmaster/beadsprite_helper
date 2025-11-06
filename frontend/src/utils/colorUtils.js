import { rgb, converter, differenceCiede2000 } from 'culori';

// Create a converter from RGB to LAB
const rgbToLabConverter = converter('lab');

// Create the Delta E 2000 difference function (culori returns a generator)
const deltaE2000 = differenceCiede2000();

/**
 * Convert RGB values (0-255) to LAB color space
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {object} LAB color object { mode: 'lab', l, a, b }
 */
export function rgbToLab(r, g, b) {
  // culori expects RGB in 0-1 range
  const rgbColor = { mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 };
  return rgbToLabConverter(rgbColor);
}

/**
 * Convert hex color to LAB color space
 * @param {string} hexColor - Hex color like "#FF0000"
 * @returns {object} LAB color object
 */
export function hexToLab(hexColor) {
  try {
    if (!hexColor || typeof hexColor !== 'string') {
      console.error('Invalid hex color input:', hexColor);
      return null;
    }
    const labColor = rgbToLabConverter(hexColor);
    if (!labColor || labColor.mode !== 'lab') {
      console.error('Failed to convert hex to LAB:', hexColor, labColor);
      return null;
    }
    return labColor;
  } catch (err) {
    console.error('Error converting hex to LAB:', err, hexColor);
    return null;
  }
}

/**
 * Calculate Delta E (CIE2000) distance between two colors
 * @param {object} color1 - Color in any culori format
 * @param {object} color2 - Color in any culori format
 * @returns {number} Distance value (0 = identical)
 */
export function calculateColorDistance(color1, color2) {
  try {
    // Ensure both colors are defined
    if (!color1 || !color2) {
      console.error('Invalid color input to calculateColorDistance:', { color1, color2 });
      return Infinity;
    }

    // Use the pre-generated Delta E 2000 function
    const distance = deltaE2000(color1, color2);

    // Check if result is valid
    if (distance === null || distance === undefined || isNaN(distance)) {
      console.error('Invalid distance calculated:', { color1, color2, distance });
      return Infinity;
    }

    return distance;
  } catch (err) {
    console.error('Error in calculateColorDistance:', err, { color1, color2 });
    return Infinity;
  }
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

/**
 * Calculate color distance using the specified color space
 * @param {string} imageColorHex - Image color in hex format
 * @param {string} beadColorHex - Bead color in hex format
 * @param {string} colorSpace - 'rgb' or 'lab'
 * @returns {number} Distance value
 */
export function calculateColorDistanceBySpace(imageColorHex, beadColorHex, colorSpace = 'lab') {
  try {
    if (colorSpace === 'rgb') {
      const imageRgb = hexToRgb(imageColorHex);
      const beadRgb = hexToRgb(beadColorHex);
      if (!imageRgb || !beadRgb) {
        console.error('Failed to convert colors to RGB:', { imageColorHex, beadColorHex });
        return Infinity;
      }
      return calculateRgbDistance(imageRgb, beadRgb);
    } else {
      // LAB color space with Delta E (CIE2000)
      const imageLab = hexToLab(imageColorHex);
      const beadLab = hexToLab(beadColorHex);
      if (!imageLab || !beadLab) {
        console.error('Failed to convert colors to LAB:', { imageColorHex, beadColorHex, imageLab, beadLab });
        return Infinity;
      }
      return calculateColorDistance(imageLab, beadLab);
    }
  } catch (err) {
    console.error('Error in calculateColorDistanceBySpace:', err, { imageColorHex, beadColorHex, colorSpace });
    return Infinity;
  }
}
