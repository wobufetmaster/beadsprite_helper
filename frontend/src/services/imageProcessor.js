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
      message: `Image dimensions (${img.width}x${img.height}) exceed maximum (${maxWidth}x${maxHeight}). Large images may be slow to process.`
    };
  }

  return { valid: true, message: '' };
}
