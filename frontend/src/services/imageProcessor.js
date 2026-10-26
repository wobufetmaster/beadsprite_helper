import { detectGrid, sampleGrid, makeGrid } from '../core/grid';
import { mergeSimilarColors } from '../core/quantize';

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
 * Read an image's RGBA pixels.
 * @param {HTMLImageElement} img
 * @returns {{width:number, height:number, data:Uint8ClampedArray}}
 */
export function imageToRgba(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

/**
 * Detect the pixel-art grid (fractional cell size + offset). See core/grid.js.
 * @param {HTMLImageElement} img
 */
export function detectGridSize(img) {
  return detectGrid(imageToRgba(img));
}

/**
 * Sample one colour per grid cell, merging JPEG-noise variants of the same colour.
 * @returns {object} { width, height, grid: [[{r,g,b}]], alphaData }
 */
export function extractPixelsWithGrid(img, cellWidth = 1, cellHeight = cellWidth, offsetX = 0, offsetY = 0) {
  const image = imageToRgba(img);
  const cells = sampleGrid(image, makeGrid(image, cellWidth, cellHeight, offsetX, offsetY));
  mergeSimilarColors(cells, 5);
  const { width, height, data } = cells;
  const grid = [];
  const alphaData = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
      alphaData[y * width + x] = data[i + 3];
    }
    grid.push(row);
  }
  return { width, height, grid, alphaData };
}

/** One bead per pixel. */
export function extractPixels(img) {
  return extractPixelsWithGrid(img, 1, 1, 0, 0);
}
