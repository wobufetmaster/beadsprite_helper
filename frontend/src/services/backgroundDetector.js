/**
 * Background detection service
 * Detects background pixels using alpha transparency or edge-connected regions
 */

/**
 * Main entry point - detects background using alpha or edge detection
 * @param {Array} beadGrid - 2D array of bead IDs
 * @param {Uint8ClampedArray} alphaData - Alpha channel data (flat array)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array} 2D boolean array (true = background pixel)
 */
export function detectBackground(beadGrid, alphaData, width, height) {
  // Phase 1: Check for alpha channel transparency
  const alphaBackground = detectAlphaTransparency(alphaData, width, height);
  if (alphaBackground) {
    return alphaBackground;
  }

  // Phase 2: Edge-based detection for opaque images
  return detectEdgeRegions(beadGrid, width, height);
}

/**
 * Phase 1: Detect transparency from alpha channel
 * @param {Uint8ClampedArray} alphaData - Alpha channel values
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array|null} 2D boolean array or null if no transparency
 */
function detectAlphaTransparency(alphaData, width, height) {
  if (!alphaData || alphaData.length === 0) {
    return null;
  }

  let hasTransparency = false;
  const mask = [];

  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const alpha = alphaData[y * width + x];
      const isBackground = alpha < 255;
      row.push(isBackground);
      if (isBackground) {
        hasTransparency = true;
      }
    }
    mask.push(row);
  }

  // Only return mask if we actually found transparent pixels
  return hasTransparency ? mask : null;
}

/**
 * Phase 2: Detect edge-connected regions for opaque images
 * Starts from all 4 corners and marks any regions with matching colors as background
 * @param {Array} beadGrid - 2D array of bead IDs
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {Array} 2D boolean array
 */
function detectEdgeRegions(beadGrid, width, height) {
  const visited = Array(height).fill(0).map(() => Array(width).fill(false));
  const backgroundMask = Array(height).fill(0).map(() => Array(width).fill(false));

  // Get the bead colors at all 4 corners
  const corners = [
    { x: 0, y: 0 },                    // top-left
    { x: width - 1, y: 0 },            // top-right
    { x: 0, y: height - 1 },           // bottom-left
    { x: width - 1, y: height - 1 }    // bottom-right
  ];

  // Find the most common corner color (likely the background)
  const cornerColors = corners.map(c => beadGrid[c.y][c.x]);
  const colorCounts = {};
  cornerColors.forEach(color => {
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  });

  // Find color that appears in most corners
  let backgroundColorId = null;
  let maxCount = 0;
  for (const [colorId, count] of Object.entries(colorCounts)) {
    if (count > maxCount) {
      maxCount = count;
      backgroundColorId = colorId;
    }
  }

  // If no corner has a matching color with another, fall back to largest edge region
  if (maxCount < 2) {
    return detectLargestEdgeRegion(beadGrid, width, height);
  }

  console.log(`Background detection: ${maxCount}/4 corners have color ${backgroundColorId}`);

  // Flood fill from each corner that has the background color
  for (const corner of corners) {
    if (beadGrid[corner.y][corner.x] == backgroundColorId && !visited[corner.y][corner.x]) {
      const region = floodFill(beadGrid, visited, corner.x, corner.y, width, height);
      region.forEach(({ x, y }) => {
        backgroundMask[y][x] = true;
      });
    }
  }

  return backgroundMask;
}

/**
 * Fallback: Find largest edge-touching region
 * @param {Array} beadGrid - 2D array of bead IDs
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {Array} 2D boolean array
 */
function detectLargestEdgeRegion(beadGrid, width, height) {
  const visited = Array(height).fill(0).map(() => Array(width).fill(false));
  const backgroundMask = Array(height).fill(0).map(() => Array(width).fill(false));

  let largestEdgeRegion = null;
  let largestSize = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!visited[y][x]) {
        const region = floodFill(beadGrid, visited, x, y, width, height);

        if (touchesEdge(region, width, height) && region.length > largestSize) {
          largestEdgeRegion = region;
          largestSize = region.length;
        }
      }
    }
  }

  if (largestEdgeRegion) {
    largestEdgeRegion.forEach(({ x, y }) => {
      backgroundMask[y][x] = true;
    });
  }

  return backgroundMask;
}

/**
 * Flood fill to find connected component of same bead color
 * @param {Array} beadGrid - 2D array of bead IDs
 * @param {Array} visited - 2D visited array
 * @param {number} startX - Starting X coordinate
 * @param {number} startY - Starting Y coordinate
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @returns {Array} Array of {x, y} coordinates in the region
 */
function floodFill(beadGrid, visited, startX, startY, width, height) {
  const targetBead = beadGrid[startY][startX];
  const region = [];
  const queue = [{ x: startX, y: startY }];

  while (queue.length > 0) {
    const { x, y } = queue.shift();

    // Skip if out of bounds or already visited
    if (x < 0 || x >= width || y < 0 || y >= height || visited[y][x]) {
      continue;
    }

    // Skip if different bead color
    if (beadGrid[y][x] !== targetBead) {
      continue;
    }

    // Mark as visited and add to region
    visited[y][x] = true;
    region.push({ x, y });

    // Add neighbors to queue (4-connectivity: up, down, left, right)
    queue.push({ x: x + 1, y });
    queue.push({ x: x - 1, y });
    queue.push({ x, y: y + 1 });
    queue.push({ x, y: y - 1 });
  }

  return region;
}

/**
 * Check if region touches any image edge
 * @param {Array} region - Array of {x, y} coordinates
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {boolean} True if region touches edge
 */
function touchesEdge(region, width, height) {
  return region.some(({ x, y }) =>
    x === 0 || x === width - 1 || y === 0 || y === height - 1
  );
}
