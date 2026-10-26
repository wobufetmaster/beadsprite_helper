/**
 * Background detection on a bead grid.
 * Transparent images: anything mostly transparent is background.
 * Opaque images: flood-fill the colour shared by most corners.
 */

/**
 * @param {string[][]} beadGrid - bead ids
 * @param {Uint8ClampedArray|null} alpha - one alpha value per cell (row-major)
 * @returns {boolean[][]} true = background
 */
export function detectBackground(beadGrid, alpha, width, height) {
  if (alpha && alpha.some(a => a < 128)) {
    return rowsOf(width, height, i => alpha[i] < 128);
  }
  return cornerFill(beadGrid, width, height);
}

function rowsOf(width, height, fn) {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => fn(y * width + x)));
}

function cornerFill(beadGrid, width, height) {
  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  const counts = {};
  for (const [x, y] of corners) counts[beadGrid[y][x]] = (counts[beadGrid[y][x]] || 0) + 1;
  const [bgId, bgCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  const mask = new Uint8Array(width * height);
  if (bgCount >= 2) {
    for (const [x, y] of corners) {
      if (beadGrid[y][x] === bgId) fill(beadGrid, mask, x, y, width, height);
    }
  } else {
    fillLargestEdgeRegion(beadGrid, mask, width, height);
  }
  return rowsOf(width, height, i => mask[i] === 1);
}

/** Flood-fill same-coloured cells from (sx, sy), marking them in mask. Returns region size. */
function fill(beadGrid, mask, sx, sy, width, height, mark = 1) {
  const target = beadGrid[sy][sx];
  if (mask[sy * width + sx]) return 0;
  const stack = [sy * width + sx];
  mask[sy * width + sx] = mark;
  let size = 0;
  while (stack.length) {
    const i = stack.pop();
    size++;
    const x = i % width, y = (i - x) / width;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const j = ny * width + nx;
      if (!mask[j] && beadGrid[ny][nx] === target) { mask[j] = mark; stack.push(j); }
    }
  }
  return size;
}

function fillLargestEdgeRegion(beadGrid, mask, width, height) {
  // Label every edge-touching region with a temporary id, keep the largest.
  const labels = new Uint8Array(width * height);
  let best = null, bestSize = 0;
  const edge = [];
  for (let x = 0; x < width; x++) edge.push([x, 0], [x, height - 1]);
  for (let y = 0; y < height; y++) edge.push([0, y], [width - 1, y]);
  for (const [x, y] of edge) {
    if (labels[y * width + x]) continue;
    const size = fill(beadGrid, labels, x, y, width, height, 2);
    if (size > bestSize) { bestSize = size; best = [x, y]; }
  }
  if (best) fill(beadGrid, mask, best[0], best[1], width, height);
}
