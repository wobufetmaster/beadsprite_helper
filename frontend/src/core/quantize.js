import { converter } from 'culori';

const toLab = converter('lab');
const toRgb = converter('rgb');

/**
 * Merge near-identical cell colours (JPEG noise, blur) into one colour each.
 *
 * Without this, a sprite's single "brown" comes out as dozens of slightly
 * different browns, and the ones that sit near a palette boundary flip to a
 * different bead — speckle. Clustering first means each real sprite colour is
 * matched to a bead once.
 *
 * Greedy leader clustering in Lab (most frequent colours seed clusters), then
 * a couple of k-means passes. Clean pixel art with distinct colours is left
 * untouched.
 *
 * @param {{width, height, data: Uint8ClampedArray}} cells - RGBA, modified in place
 * @param {number} threshold - ΔE76 radius; colours closer than this merge
 * @returns {number} number of colours after merging
 */
export function mergeSimilarColors(cells, threshold = 8) {
  const { data } = cells;
  const counts = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const colors = [...counts].map(([key, n]) => {
    const lab = toLab({ mode: 'rgb', r: (key >> 16) / 255, g: ((key >> 8) & 255) / 255, b: (key & 255) / 255 });
    return { key, n, lab: [lab.l, lab.a, lab.b], cluster: -1 };
  }).sort((a, b) => b.n - a.n);

  const t2 = threshold * threshold;
  const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
  let centers = [];
  for (const c of colors) {
    let best = -1, bestD = t2;
    centers.forEach((center, k) => {
      const d = d2(c.lab, center);
      if (d < bestD) { bestD = d; best = k; }
    });
    if (best < 0) { best = centers.length; centers.push(c.lab); }
    c.cluster = best;
  }

  for (let pass = 0; pass < 3; pass++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const c of colors) {
      const s = sums[c.cluster];
      s[0] += c.lab[0] * c.n; s[1] += c.lab[1] * c.n; s[2] += c.lab[2] * c.n; s[3] += c.n;
    }
    centers = sums.map(s => [s[0] / s[3], s[1] / s[3], s[2] / s[3]]);
    for (const c of colors) {
      let best = c.cluster, bestD = d2(c.lab, centers[c.cluster]);
      centers.forEach((center, k) => {
        const d = d2(c.lab, center);
        if (d < bestD) { bestD = d; best = k; }
      });
      c.cluster = best;
    }
  }

  // A cluster of one exact colour keeps that colour; merged clusters use the mean.
  const members = centers.map(() => []);
  for (const c of colors) members[c.cluster].push(c);
  const replacement = new Map();
  members.forEach((group, k) => {
    if (group.length === 0) return;
    let rgb;
    if (group.length === 1) {
      rgb = [group[0].key >> 16, (group[0].key >> 8) & 255, group[0].key & 255];
    } else {
      const c = toRgb({ mode: 'lab', l: centers[k][0], a: centers[k][1], b: centers[k][2] });
      rgb = [c.r, c.g, c.b].map(v => Math.round(Math.min(1, Math.max(0, v)) * 255));
    }
    for (const c of group) replacement.set(c.key, rgb);
  });

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const rgb = replacement.get((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2];
  }
  return members.filter(g => g.length).length;
}
