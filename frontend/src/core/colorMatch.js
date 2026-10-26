import { converter, differenceCiede2000 } from 'culori';

const toLab = converter('lab');
const deltaE2000 = differenceCiede2000();
const deltaRgb = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Build a nearest-bead matcher for a set of bead colours.
 * Results are cached per input colour, since sprites reuse a handful of colours.
 * @param {Array<{id, hex}>} beads
 * @param {'lab'|'rgb'} mode - 'lab' uses CIEDE2000 (perceptual), 'rgb' plain Euclidean
 * @returns {(hex: string) => {bead, distance}}
 */
export function createMatcher(beads, mode = 'lab') {
  if (beads.length === 0) throw new Error('No bead colours to match against');
  const prepared = beads.map(bead => ({
    bead,
    lab: toLab(bead.hex),
    rgb: converter('rgb')(bead.hex),
  }));
  const cache = new Map();

  return hex => {
    let hit = cache.get(hex);
    if (hit) return hit;
    const lab = mode === 'lab' ? toLab(hex) : null;
    const rgb = mode === 'rgb' ? converter('rgb')(hex) : null;
    let best = null, bestD = Infinity;
    for (const p of prepared) {
      const d = mode === 'lab' ? deltaE2000(lab, p.lab) : deltaRgb(rgb, p.rgb) * 255;
      if (d < bestD) { bestD = d; best = p.bead; }
    }
    hit = { bead: best, distance: bestD };
    cache.set(hex, hit);
    return hit;
  };
}
