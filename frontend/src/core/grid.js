/**
 * Grid detection and sampling for upscaled pixel art.
 *
 * Works on plain RGBA buffers ({ width, height, data }) so it runs the same in
 * the browser (canvas ImageData) and in Node (CLI).
 *
 * Detection: build an edge profile along each axis, then scan candidate cell
 * sizes (fractional, not just integers) and measure how well the edges line up
 * on a lattice of that period (phase coherence). The true cell size and every
 * divisor of it line up perfectly, multiples of it do not, so we take the
 * largest well-aligned period. Thresholding edge strength against the image's
 * own noise level keeps JPEG ringing from creating fake edges.
 */

const MIN_PERIOD = 1.4;
const MIN_CELLS = 6; // a sprite narrower than this many cells is not plausible
const NO_GRID_COHERENCE = 0.35;
const HARMONIC_RATIO = 0.75;
const MAX_LINES = 1000; // rows/cols sampled when building edge profiles

/**
 * Edge strength at every pixel boundary along both axes.
 * cols[x] = how much colour changes between pixel x-1 and x (summed over rows).
 */
function edgeProfiles({ width, height, data }) {
  const rowStep = Math.max(1, Math.floor(height / MAX_LINES));
  const colStep = Math.max(1, Math.floor(width / MAX_LINES));

  // Pass 1: noise floor from the distribution of neighbour differences.
  const hist = new Uint32Array(1021);
  const diff = (i, j) =>
    Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) +
    Math.abs(data[i + 2] - data[j + 2]) + Math.abs(data[i + 3] - data[j + 3]);

  for (let y = 0; y < height; y += rowStep) {
    for (let x = 1; x < width; x++) {
      const i = (y * width + x) * 4;
      hist[diff(i, i - 4)]++;
    }
  }
  let total = 0;
  for (const c of hist) total += c;
  let median = 0;
  for (let acc = 0; median < hist.length; median++) {
    acc += hist[median];
    if (acc >= total / 2) break;
  }
  const noise = Math.max(12, median * 3);

  // Pass 2: accumulate only the part of each difference above the noise floor.
  const cols = new Float64Array(width + 1);
  const rows = new Float64Array(height + 1);
  for (let y = 0; y < height; y += rowStep) {
    for (let x = 1; x < width; x++) {
      const i = (y * width + x) * 4;
      const w = diff(i, i - 4) - noise;
      if (w > 0) cols[x] += w;
    }
  }
  for (let x = 0; x < width; x += colStep) {
    for (let y = 1; y < height; y++) {
      const i = (y * width + x) * 4;
      const w = diff(i, i - width * 4) - noise;
      if (w > 0) rows[y] += w;
    }
  }
  return { cols, rows, noise };
}

/** Phase coherence of edge positions at period q: 1 = every edge on the lattice. */
function coherence(positions, weights, totalWeight, q) {
  let re = 0, im = 0;
  const k = (2 * Math.PI) / q;
  for (let i = 0; i < positions.length; i++) {
    const a = positions[i] * k;
    re += weights[i] * Math.cos(a);
    im += weights[i] * Math.sin(a);
  }
  return { c: Math.hypot(re, im) / totalWeight, phase: Math.atan2(im, re) };
}

/**
 * Scan candidate periods along one axis.
 * @returns {{ candidates: Array<{q, c, phase}>, best: number }} peaks strong
 *   enough to be the grid (largest q last), and the strongest coherence seen.
 */
function scanAxis(profile, length) {
  const positions = [], weights = [];
  let totalWeight = 0;
  for (let i = 1; i < length; i++) {
    if (profile[i] > 0) {
      positions.push(i);
      weights.push(profile[i]);
      totalWeight += profile[i];
    }
  }
  if (positions.length < 3) return { candidates: [], best: 0 };

  const maxPeriod = length / MIN_CELLS;
  const samples = [];
  // Step small enough that the phase drifts < 1/8 turn across the whole axis.
  for (let q = MIN_PERIOD; q <= maxPeriod; q += Math.max(q * q / (8 * length), 0.0005)) {
    samples.push({ q, ...coherence(positions, weights, totalWeight, q) });
  }

  const peaks = [];
  for (let i = 1; i < samples.length - 1; i++) {
    const s = samples[i];
    if (s.c >= samples[i - 1].c && s.c > samples[i + 1].c) peaks.push(s);
  }
  if (peaks.length === 0) return { candidates: [], best: 0 };

  const best = Math.max(...peaks.map(p => p.c));
  if (best < NO_GRID_COHERENCE) return { candidates: [], best };

  const candidates = peaks
    .filter(p => p.c >= best * HARMONIC_RATIO)
    .map(p => refinePeak(positions, weights, totalWeight, p, length))
    .sort((a, b) => a.q - b.q);
  return { candidates, best };
}

/** Golden-section refine a coarse peak to sub-0.001 px precision. */
function refinePeak(positions, weights, totalWeight, peak, length) {
  const span = Math.max(peak.q * peak.q / (8 * length), 0.0005) * 1.5;
  let lo = peak.q - span, hi = peak.q + span;
  const g = (Math.sqrt(5) - 1) / 2;
  const f = q => coherence(positions, weights, totalWeight, q).c;
  let a = hi - g * (hi - lo), b = lo + g * (hi - lo);
  let fa = f(a), fb = f(b);
  for (let i = 0; i < 30; i++) {
    if (fa > fb) { hi = b; b = a; fb = fa; a = hi - g * (hi - lo); fa = f(a); }
    else { lo = a; a = b; fa = fb; b = lo + g * (hi - lo); fb = f(b); }
  }
  const q = (lo + hi) / 2;
  return { q, ...coherence(positions, weights, totalWeight, q) };
}

/** Lattice phase → where the first (mostly visible) cell starts, and how many fit. */
function placeCells(q, phase, length) {
  let start = (((phase / (2 * Math.PI)) * q) % q + q) % q;
  if (start >= q / 2) start -= q; // keep a leading cell that is at least half visible
  const count = Math.max(1, Math.floor((length - start) / q + 0.5));
  return { start, count };
}

/**
 * Pick the grid period on each axis. Cells are almost always square, so when
 * both axes have a candidate in common we use it for both.
 */
function choosePeriods(xs, ys) {
  const close = (a, b) => Math.abs(a.q - b.q) / Math.max(a.q, b.q) < 0.02;
  for (let i = xs.length - 1; i >= 0; i--) {
    const match = [...ys].reverse().find(y => close(xs[i], y));
    if (match) return [xs[i], match];
  }
  return [xs.at(-1) ?? null, ys.at(-1) ?? null];
}

/**
 * Detect the pixel-art grid in an image.
 * @param {{width:number, height:number, data:Uint8ClampedArray}} image RGBA
 * @returns {{cellWidth:number, cellHeight:number, offsetX:number, offsetY:number,
 *   cols:number, rows:number, confidence:number, detected:boolean}}
 *   cellWidth/Height are fractional pixels; offsetX/Y is where the first cell
 *   starts (may be slightly negative for a clipped leading cell).
 */
export function detectGrid(image) {
  const { width, height } = image;
  const { cols, rows } = edgeProfiles(image);
  const xs = scanAxis(cols, width);
  const ys = scanAxis(rows, height);
  let [x, y] = choosePeriods(xs.candidates, ys.candidates);

  // One axis can lack edges (e.g. a sprite of vertical stripes); borrow the other.
  if (!x && y) x = { q: y.q, ...phaseOnly(cols, width, y.q) };
  if (!y && x) y = { q: x.q, ...phaseOnly(rows, height, x.q) };

  if (!x || !y) {
    return { cellWidth: 1, cellHeight: 1, offsetX: 0, offsetY: 0, cols: width, rows: height, confidence: 0, detected: false };
  }

  const px = placeCells(x.q, x.phase, width);
  const py = placeCells(y.q, y.phase, height);
  return {
    cellWidth: x.q,
    cellHeight: y.q,
    offsetX: px.start,
    offsetY: py.start,
    cols: px.count,
    rows: py.count,
    confidence: Math.min(x.c, y.c),
    detected: true,
  };
}

function phaseOnly(profile, length, q) {
  const positions = [], weights = [];
  let totalWeight = 0;
  for (let i = 1; i < length; i++) {
    if (profile[i] > 0) { positions.push(i); weights.push(profile[i]); totalWeight += profile[i]; }
  }
  if (totalWeight === 0) return { c: 0, phase: 0 };
  return coherence(positions, weights, totalWeight, q);
}

/** Grid that keeps every pixel as its own cell (for 1:1 pixel art). */
export function identityGrid({ width, height }) {
  return { cellWidth: 1, cellHeight: 1, offsetX: 0, offsetY: 0, cols: width, rows: height, confidence: 1, detected: false };
}

/** Fill in cols/rows for a manually specified cell size and offset. */
export function makeGrid({ width, height }, cellWidth, cellHeight = cellWidth, offsetX = 0, offsetY = 0) {
  return {
    cellWidth, cellHeight, offsetX, offsetY,
    cols: Math.max(1, Math.floor((width - offsetX) / cellWidth + 0.5)),
    rows: Math.max(1, Math.floor((height - offsetY) / cellHeight + 0.5)),
    confidence: 1,
    detected: false,
  };
}

function median(values, n) {
  const sub = values.subarray(0, n).sort();
  return sub[n >> 1];
}

/**
 * Sample one colour per grid cell. Uses the per-channel median of the cell's
 * interior (edges trimmed), which ignores JPEG ringing, anti-aliasing and thin
 * grid lines that a single centre pixel would pick up.
 * @returns {{width:number, height:number, data:Uint8ClampedArray}} RGBA, one pixel per cell
 */
export function sampleGrid(image, grid) {
  const { width, height, data } = image;
  const { cellWidth, cellHeight, offsetX, offsetY, cols, rows } = grid;
  const out = new Uint8ClampedArray(cols * rows * 4);

  if (cellWidth === 1 && cellHeight === 1 && offsetX === 0 && offsetY === 0) {
    out.set(data.subarray(0, cols * rows * 4));
    return { width: cols, height: rows, data: out };
  }

  const marginX = cellWidth >= 3 ? cellWidth * 0.2 : 0;
  const marginY = cellHeight >= 3 ? cellHeight * 0.2 : 0;
  const maxSamples = 1024;
  const buf = [0, 1, 2, 3].map(() => new Uint8Array(maxSamples));

  for (let r = 0; r < rows; r++) {
    const top = offsetY + r * cellHeight;
    let y0 = Math.max(0, Math.ceil(top + marginY - 0.5));
    let y1 = Math.min(height - 1, Math.floor(top + cellHeight - marginY - 0.5));
    if (y1 < y0) y0 = y1 = clamp(Math.floor(top + cellHeight / 2), 0, height - 1);

    for (let c = 0; c < cols; c++) {
      const left = offsetX + c * cellWidth;
      let x0 = Math.max(0, Math.ceil(left + marginX - 0.5));
      let x1 = Math.min(width - 1, Math.floor(left + cellWidth - marginX - 0.5));
      if (x1 < x0) x0 = x1 = clamp(Math.floor(left + cellWidth / 2), 0, width - 1);

      // Subsample big cells so we never collect more than maxSamples pixels.
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const stride = Math.max(1, Math.ceil(Math.sqrt(area / maxSamples)));
      let n = 0;
      for (let y = y0; y <= y1; y += stride) {
        for (let x = x0; x <= x1; x += stride) {
          const i = (y * width + x) * 4;
          buf[0][n] = data[i]; buf[1][n] = data[i + 1]; buf[2][n] = data[i + 2]; buf[3][n] = data[i + 3];
          n++;
        }
      }
      const o = (r * cols + c) * 4;
      for (let ch = 0; ch < 4; ch++) out[o + ch] = median(buf[ch], n);
    }
  }
  return { width: cols, height: rows, data: out };
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
