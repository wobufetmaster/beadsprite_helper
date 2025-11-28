/**
 * Load an image file and return an Image element
 * @param {File} file - Image file from user upload
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Extract pixel grid from an image using Canvas API
 * @param {HTMLImageElement} img - Loaded image element
 * @returns {object} { width, height, grid: [[{r,g,b}]], alphaData: Uint8ClampedArray }
 */
export function extractPixels(img) {
  // Create canvas matching image dimensions
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  // Draw image to canvas
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const pixels = imageData.data; // RGBA array

  // Extract alpha channel (every 4th byte starting at index 3)
  const alphaData = new Uint8ClampedArray(img.width * img.height);
  for (let i = 0; i < img.width * img.height; i++) {
    alphaData[i] = pixels[i * 4 + 3];
  }

  // Convert to grid structure matching backend format
  const grid = [];
  for (let y = 0; y < img.height; y++) {
    const row = [];
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      row.push({
        r: pixels[i],
        g: pixels[i + 1],
        b: pixels[i + 2]
        // Skip alpha channel (pixels[i + 3])
      });
    }
    grid.push(row);
  }

  return {
    width: img.width,
    height: img.height,
    grid,
    alphaData
  };
}

/**
 * Validate image file before processing
 * @param {File} file - Image file to validate
 * @throws {Error} If validation fails
 */
export function validateImageFile(file) {
  // Check file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image (PNG, JPG, GIF, etc.)');
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Image must be smaller than 10MB');
  }
}

/**
 * Validate image dimensions after loading
 * @param {HTMLImageElement} img - Loaded image
 * @returns {object} { valid: boolean, message: string }
 */
export function validateImageDimensions(img) {
  const maxWidth = 200;
  const maxHeight = 200;

  if (img.width > maxWidth || img.height > maxHeight) {
    return {
      valid: false,
      message: `Image dimensions (${img.width}x${img.height}) exceed maximum (${maxWidth}x${maxHeight}). Grid detection will be used to downsample.`
    };
  }

  return { valid: true, message: '' };
}

/**
 * Detect grid size in an image using autocorrelation on edge profiles
 * @param {HTMLImageElement} img - The image
 * @returns {number} Detected grid size (pixels per cell)
 */
export function detectGridSize(img) {
  console.log('Starting grid detection for image:', img.width, 'x', img.height);

  // Sample image to reasonable size for analysis
  const canvas = document.createElement('canvas');
  const maxAnalysisSize = 400;
  const scale = Math.min(1, maxAnalysisSize / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // Maximum grid size to search (in scaled pixels)
  const maxGridSize = Math.min(64, Math.floor(Math.min(canvas.width, canvas.height) / 4));

  // Compute edge profiles in both directions
  const hProfile = computeEdgeProfile(pixels, canvas.width, canvas.height, 'horizontal');
  const vProfile = computeEdgeProfile(pixels, canvas.width, canvas.height, 'vertical');

  // Compute autocorrelation for both profiles
  const hCorrelations = computeAutocorrelation(hProfile, maxGridSize);
  const vCorrelations = computeAutocorrelation(vProfile, maxGridSize);

  // Find best grid size from each direction
  const hGridSize = findBestGridSize(hCorrelations);
  const vGridSize = findBestGridSize(vCorrelations);

  console.log('Horizontal grid size detected:', hGridSize);
  console.log('Vertical grid size detected:', vGridSize);

  // Use the size that appears in both directions, or the smaller valid one
  let detectedSize;
  if (hGridSize === vGridSize) {
    detectedSize = hGridSize;
  } else if (hGridSize === 1) {
    detectedSize = vGridSize;
  } else if (vGridSize === 1) {
    detectedSize = hGridSize;
  } else {
    // Both detected different sizes - use smaller (finer granularity)
    detectedSize = Math.min(hGridSize, vGridSize);
  }

  // Scale back to original image coordinates
  const originalGridSize = Math.round(detectedSize / scale);

  if (originalGridSize > 1) {
    console.log('✓ Detected grid size:', originalGridSize, '(scaled:', detectedSize, ')');
  } else {
    console.log('⚠ No grid detected, using size 1');
  }

  return Math.max(1, originalGridSize);
}

/**
 * Compute edge intensity profile along one axis
 * @param {Uint8ClampedArray} pixels - RGBA pixel data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} axis - 'horizontal' or 'vertical'
 * @returns {Float32Array} Edge intensity at each position along the axis
 */
function computeEdgeProfile(pixels, width, height, axis) {
  const isHorizontal = axis === 'horizontal';
  const length = isHorizontal ? width - 1 : height - 1;
  const profile = new Float32Array(length);

  // Sample multiple lines for robustness
  const numSamples = Math.min(isHorizontal ? height : width, 50);
  const step = Math.floor((isHorizontal ? height : width) / numSamples);

  for (let sample = 0; sample < numSamples; sample++) {
    const line = sample * step;

    for (let i = 0; i < length; i++) {
      let idx1, idx2;

      if (isHorizontal) {
        idx1 = (line * width + i) * 4;
        idx2 = (line * width + i + 1) * 4;
      } else {
        idx1 = (i * width + line) * 4;
        idx2 = ((i + 1) * width + line) * 4;
      }

      // Compute color difference (sum of absolute RGB differences)
      const diff = Math.abs(pixels[idx1] - pixels[idx2]) +
                   Math.abs(pixels[idx1 + 1] - pixels[idx2 + 1]) +
                   Math.abs(pixels[idx1 + 2] - pixels[idx2 + 2]);

      profile[i] += diff;
    }
  }

  // Normalize by number of samples
  for (let i = 0; i < length; i++) {
    profile[i] /= numSamples;
  }

  return profile;
}

/**
 * Compute autocorrelation of edge profile to find periodic patterns
 * @param {Float32Array} profile - Edge intensity profile
 * @param {number} maxShift - Maximum shift to test
 * @returns {Float32Array} Correlation value for each shift (1 to maxShift)
 */
function computeAutocorrelation(profile, maxShift) {
  const correlations = new Float32Array(maxShift);
  const n = profile.length;

  // Compute mean for normalization
  let mean = 0;
  for (let i = 0; i < n; i++) {
    mean += profile[i];
  }
  mean /= n;

  // Compute variance for normalization
  let variance = 0;
  for (let i = 0; i < n; i++) {
    variance += (profile[i] - mean) ** 2;
  }

  if (variance === 0) {
    return correlations; // Flat profile, no edges
  }

  // Compute normalized autocorrelation for each shift
  for (let shift = 1; shift <= maxShift; shift++) {
    let sum = 0;
    const validLength = n - shift;

    for (let i = 0; i < validLength; i++) {
      sum += (profile[i] - mean) * (profile[i + shift] - mean);
    }

    // Normalize to [-1, 1] range
    correlations[shift - 1] = sum / variance;
  }

  return correlations;
}

/**
 * Find the best grid size from autocorrelation results
 * @param {Float32Array} correlations - Autocorrelation values for shifts 1..N
 * @returns {number} Best grid size, or 1 if no clear pattern found
 */
function findBestGridSize(correlations) {
  const minGridSize = 2;
  const threshold = 0.3; // Minimum correlation to consider valid

  let bestSize = 1;
  let bestScore = 0;

  for (let size = minGridSize; size < correlations.length; size++) {
    const correlation = correlations[size - 1];

    // Must exceed threshold
    if (correlation < threshold) continue;

    // Check if this is a local maximum (peak)
    const prev = size > minGridSize ? correlations[size - 2] : 0;
    const next = size < correlations.length - 1 ? correlations[size] : 0;

    if (correlation > prev && correlation > next) {
      // Score combines correlation strength with preference for smaller grids
      // Smaller grids are preferred (they represent finer detail)
      const sizeBonus = 1 / Math.sqrt(size);
      const score = correlation * sizeBonus;

      if (score > bestScore) {
        bestScore = score;
        bestSize = size;
      }
    }
  }

  return bestSize;
}

/**
 * Extract pixels with grid downsampling
 * @param {HTMLImageElement} img - The image
 * @param {number} cellWidth - Cell width (pixels per cell)
 * @param {number} cellHeight - Cell height (pixels per cell)
 * @param {number} offsetX - Horizontal offset (pixels)
 * @param {number} offsetY - Vertical offset (pixels)
 * @returns {object} {width, height, grid, alphaData}
 */
export function extractPixelsWithGrid(img, cellWidth = 1, cellHeight = null, offsetX = 0, offsetY = 0) {
  // If only cellWidth is provided (backward compatibility), use it for both dimensions
  if (cellHeight === null) {
    cellHeight = cellWidth;
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const pixels = imageData.data;

  const gridWidth = Math.floor((img.width - offsetX) / cellWidth);
  const gridHeight = Math.floor((img.height - offsetY) / cellHeight);
  const grid = [];
  const alphaData = new Uint8ClampedArray(gridWidth * gridHeight);

  for (let gridY = 0; gridY < gridHeight; gridY++) {
    const row = [];
    for (let gridX = 0; gridX < gridWidth; gridX++) {
      // Sample center pixel of each grid cell
      const centerX = offsetX + gridX * cellWidth + Math.floor(cellWidth / 2);
      const centerY = offsetY + gridY * cellHeight + Math.floor(cellHeight / 2);
      const i = (centerY * img.width + centerX) * 4;

      row.push({
        r: pixels[i],
        g: pixels[i + 1],
        b: pixels[i + 2]
      });

      // Store alpha value for this grid cell
      alphaData[gridY * gridWidth + gridX] = pixels[i + 3];
    }
    grid.push(row);
  }

  console.log(`Downsampled from ${img.width}x${img.height} to ${gridWidth}x${gridHeight} (cell size: ${cellWidth}x${cellHeight}, offset: ${offsetX}x${offsetY})`);
  return { width: gridWidth, height: gridHeight, grid, alphaData };
}
