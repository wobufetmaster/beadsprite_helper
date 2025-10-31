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
