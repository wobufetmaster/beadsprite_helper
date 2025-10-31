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
 * @returns {object} { width, height, grid: [[{r,g,b}]] }
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
    grid
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
 * Detect grid size in an image (for upscaled pixel art)
 * @param {HTMLImageElement} img - The image
 * @returns {number} Detected grid size (pixels per cell)
 */
export function detectGridSize(img) {
  console.log('Starting grid detection for image:', img.width, 'x', img.height);

  const canvas = document.createElement('canvas');
  canvas.width = Math.min(img.width, 400);
  canvas.height = Math.min(img.height, 400);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // Try common grid sizes (starting with larger ones for screenshots)
  const gridSizesToTry = [32, 24, 20, 16, 15, 12, 10, 8, 6, 5, 4, 3, 2, 1];

  for (const gridSize of gridSizesToTry) {
    console.log('Trying grid size:', gridSize);
    if (isValidGridSize(pixels, canvas.width, canvas.height, gridSize)) {
      console.log('✓ Detected grid size:', gridSize);
      return gridSize;
    }
  }

  // Default to 1 (no grid)
  console.log('⚠ No grid detected, using size 1 (will be slow for large images)');
  return 1;
}

/**
 * Check if a grid size is valid for the image
 * @param {Uint8ClampedArray} pixels - Image pixel data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} gridSize - Grid size to test
 * @returns {boolean} True if valid grid size
 */
function isValidGridSize(pixels, width, height, gridSize) {
  if (width % gridSize !== 0 || height % gridSize !== 0) {
    return false;
  }

  // Sample a few grid cells and check if pixels within each cell are uniform
  const cellsToCheck = 10;
  const cellsPerRow = Math.floor(width / gridSize);
  const cellsPerCol = Math.floor(height / gridSize);

  for (let i = 0; i < cellsToCheck; i++) {
    const cellX = Math.floor(Math.random() * cellsPerRow);
    const cellY = Math.floor(Math.random() * cellsPerCol);

    if (!isCellUniform(pixels, width, cellX * gridSize, cellY * gridSize, gridSize)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a grid cell has uniform color
 * @param {Uint8ClampedArray} pixels - Image pixel data
 * @param {number} width - Image width
 * @param {number} startX - Cell start X
 * @param {number} startY - Cell start Y
 * @param {number} gridSize - Grid size
 * @returns {boolean} True if cell is uniform
 */
function isCellUniform(pixels, width, startX, startY, gridSize) {
  // Get first pixel color
  const firstIdx = (startY * width + startX) * 4;
  const r = pixels[firstIdx];
  const g = pixels[firstIdx + 1];
  const b = pixels[firstIdx + 2];

  // Check all pixels in cell
  for (let dy = 0; dy < gridSize; dy++) {
    for (let dx = 0; dx < gridSize; dx++) {
      const idx = ((startY + dy) * width + (startX + dx)) * 4;
      const dr = Math.abs(pixels[idx] - r);
      const dg = Math.abs(pixels[idx + 1] - g);
      const db = Math.abs(pixels[idx + 2] - b);

      // Allow small variations (5 per channel)
      if (dr > 5 || dg > 5 || db > 5) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Extract pixels with grid downsampling
 * @param {HTMLImageElement} img - The image
 * @param {number} gridSize - Grid size (pixels per cell)
 * @returns {object} {width, height, grid}
 */
export function extractPixelsWithGrid(img, gridSize = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const pixels = imageData.data;

  const gridWidth = Math.floor(img.width / gridSize);
  const gridHeight = Math.floor(img.height / gridSize);
  const grid = [];

  for (let gridY = 0; gridY < gridHeight; gridY++) {
    const row = [];
    for (let gridX = 0; gridX < gridWidth; gridX++) {
      // Sample center pixel of each grid cell
      const centerX = gridX * gridSize + Math.floor(gridSize / 2);
      const centerY = gridY * gridSize + Math.floor(gridSize / 2);
      const i = (centerY * img.width + centerX) * 4;

      row.push({
        r: pixels[i],
        g: pixels[i + 1],
        b: pixels[i + 2]
      });
    }
    grid.push(row);
  }

  console.log(`Downsampled from ${img.width}x${img.height} to ${gridWidth}x${gridHeight} (grid size: ${gridSize})`);
  return { width: gridWidth, height: gridHeight, grid };
}
