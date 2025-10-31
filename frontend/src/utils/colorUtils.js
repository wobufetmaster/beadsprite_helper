/**
 * Calculate Euclidean distance between two RGB colors
 */
export function rgbDistance(rgb1, rgb2) {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Calculate Delta E (CIE76) distance between two LAB colors
 */
export function labDistance(lab1, lab2) {
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// Alias for labDistance
export const calculateLabDistance = labDistance;

/**
 * Convert hex string to RGB object
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB object to hex string
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert RGB (0-255) to LAB color space
 * Based on D65 illuminant
 */
export function rgbToLab(r, g, b) {
  // Convert RGB to 0-1 range
  let rLinear = r / 255;
  let gLinear = g / 255;
  let bLinear = b / 255;

  // Apply gamma correction (sRGB to linear RGB)
  rLinear = rLinear > 0.04045 ? Math.pow((rLinear + 0.055) / 1.055, 2.4) : rLinear / 12.92;
  gLinear = gLinear > 0.04045 ? Math.pow((gLinear + 0.055) / 1.055, 2.4) : gLinear / 12.92;
  bLinear = bLinear > 0.04045 ? Math.pow((bLinear + 0.055) / 1.055, 2.4) : bLinear / 12.92;

  // Convert linear RGB to XYZ (D65 illuminant)
  let x = rLinear * 0.4124564 + gLinear * 0.3575761 + bLinear * 0.1804375;
  let y = rLinear * 0.2126729 + gLinear * 0.7151522 + bLinear * 0.0721750;
  let z = rLinear * 0.0193339 + gLinear * 0.1191920 + bLinear * 0.9503041;

  // Normalize for D65 white point
  x = x / 0.95047;
  y = y / 1.00000;
  z = z / 1.08883;

  // Convert XYZ to LAB
  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);

  const L = (116 * y) - 16;
  const a = 500 * (x - y);
  const B = 200 * (y - z);

  return { L, a, b: B };
}

/**
 * Group similar colors based on threshold
 */
export function groupSimilarColors(colors, threshold = 5, mode = 'lab') {
  const groups = [];
  const used = new Set();

  colors.forEach((color, index) => {
    if (used.has(index)) return;

    const group = [color];
    used.add(index);

    for (let i = index + 1; i < colors.length; i++) {
      if (used.has(i)) continue;

      const distance =
        mode === 'lab'
          ? labDistance(color.lab, colors[i].lab)
          : rgbDistance(color.rgb, colors[i].rgb);

      if (distance <= threshold) {
        group.push(colors[i]);
        used.add(i);
      }
    }

    groups.push(group);
  });

  return groups;
}
