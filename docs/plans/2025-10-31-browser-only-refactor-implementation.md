# Browser-Only Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate from Python FastAPI backend to pure browser-based architecture using culori and Canvas API.

**Architecture:** All image processing and color conversion happens client-side. Canvas API extracts pixels, culori handles LAB color space conversions, no backend required.

**Tech Stack:** React 18, Vite, culori, Canvas API, Zustand

---

## Task 1: Install culori and create local dev script

**Files:**
- Modify: `frontend/package.json`
- Create: `serve-local.sh`

**Step 1: Install culori**

```bash
cd frontend
npm install culori
```

Expected: Package installed, package.json and package-lock.json updated

**Step 2: Create simple dev server script**

Create `serve-local.sh` at project root:

```bash
#!/bin/bash
cd frontend && npm run build && python3 -m http.server -d dist 5800
```

**Step 3: Make script executable**

```bash
chmod +x serve-local.sh
```

**Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json serve-local.sh
git commit -m "feat: add culori dependency and local server script"
```

---

## Task 2: Create Perler colors data file

**Files:**
- Create: `frontend/src/data/perlerColors.js`

**Step 1: Copy perler_colors.json data**

Read the current backend file:

```bash
cat backend/data/perler_colors.json
```

**Step 2: Create ES module with data**

Create `frontend/src/data/perlerColors.js`:

```javascript
export const PERLER_COLORS = [
  { id: "cherry_red", name: "Cherry Red", hex: "#B52946" },
  { id: "red", name: "Red", hex: "#CA3435" },
  { id: "orange", name: "Orange", hex: "#E95B0C" },
  { id: "cheddar", name: "Cheddar", hex: "#F7A838" },
  { id: "yellow", name: "Yellow", hex: "#FDD24E" },
  { id: "kiwi_lime", name: "Kiwi Lime", hex: "#B8D82D" },
  { id: "parrot_green", name: "Parrot Green", hex: "#3FBF3F" },
  { id: "dark_green", name: "Dark Green", hex: "#1F7A29" },
  { id: "pastel_blue", name: "Pastel Blue", hex: "#7AC5CD" },
  { id: "toothpaste", name: "Toothpaste", hex: "#4DB6AC" },
  { id: "light_blue", name: "Light Blue", hex: "#00B8E0" },
  { id: "periwinkle_blue", name: "Periwinkle Blue", hex: "#5270CD" },
  { id: "cobalt_blue", name: "Cobalt Blue", hex: "#2B5D9D" },
  { id: "dark_blue", name: "Dark Blue", hex: "#0F2F5F" },
  { id: "blush", name: "Blush", hex: "#F9A7B5" },
  { id: "bubblegum", name: "Bubblegum", hex: "#E860A5" },
  { id: "magenta", name: "Magenta", hex: "#DC0078" },
  { id: "plum", name: "Plum", hex: "#7D4B8D" },
  { id: "purple", name: "Purple", hex: "#5B3A8B" },
  { id: "white", name: "White", hex: "#FFFFFF" },
  { id: "cream", name: "Cream", hex: "#F4E8C4" },
  { id: "beige", name: "Beige", hex: "#D9B999" },
  { id: "light_brown", name: "Light Brown", hex: "#B07855" },
  { id: "rust", name: "Rust", hex: "#8B4513" },
  { id: "light_grey", name: "Light Grey", hex: "#B5B5B5" },
  { id: "dark_grey", name: "Dark Grey", hex: "#656565" },
  { id: "charcoal", name: "Charcoal", hex: "#404040" },
  { id: "black", name: "Black", hex: "#1C1C1C" }
];
```

**Step 3: Verify import works**

Test import by temporarily adding to `App.jsx`:

```javascript
import { PERLER_COLORS } from './data/perlerColors';
console.log('Perler colors loaded:', PERLER_COLORS.length);
```

**Step 4: Run dev server to verify**

```bash
cd frontend
npm run dev
```

Open browser console, verify "Perler colors loaded: 28" appears.

**Step 5: Remove test console.log**

Remove the test import from `App.jsx`.

**Step 6: Commit**

```bash
git add frontend/src/data/perlerColors.js
git commit -m "feat: add Perler colors as ES module"
```

---

## Task 3: Update colorUtils with culori

**Files:**
- Modify: `frontend/src/utils/colorUtils.js`

**Step 1: Read current implementation**

```bash
cat frontend/src/utils/colorUtils.js
```

Note the current functions and their signatures.

**Step 2: Replace with culori-based implementation**

Replace entire file with:

```javascript
import { lab, rgb, differenceDeltaE } from 'culori';

/**
 * Convert RGB values (0-255) to LAB color space
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {object} LAB color object { mode: 'lab', l, a, b }
 */
export function rgbToLab(r, g, b) {
  // culori expects RGB in 0-1 range
  return lab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 });
}

/**
 * Convert hex color to LAB color space
 * @param {string} hexColor - Hex color like "#FF0000"
 * @returns {object} LAB color object
 */
export function hexToLab(hexColor) {
  return lab(hexColor);
}

/**
 * Calculate Delta E (CIE2000) distance between two colors
 * @param {object} color1 - Color in any culori format
 * @param {object} color2 - Color in any culori format
 * @returns {number} Distance value (0 = identical)
 */
export function calculateColorDistance(color1, color2) {
  return differenceDeltaE(color1, color2);
}

/**
 * Calculate Euclidean distance in RGB space (fallback/legacy)
 * @param {object} rgb1 - {r, g, b} with values 0-255
 * @param {object} rgb2 - {r, g, b} with values 0-255
 * @returns {number} Euclidean distance
 */
export function calculateRgbDistance(rgb1, rgb2) {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Convert hex to RGB object
 * @param {string} hex - Hex color like "#FF0000"
 * @returns {object} {r, g, b} with values 0-255
 */
export function hexToRgb(hex) {
  const rgbColor = rgb(hex);
  return {
    r: Math.round(rgbColor.r * 255),
    g: Math.round(rgbColor.g * 255),
    b: Math.round(rgbColor.b * 255)
  };
}
```

**Step 3: Verify no syntax errors**

```bash
cd frontend
npm run dev
```

Check terminal for build errors. Should compile successfully.

**Step 4: Commit**

```bash
git add frontend/src/utils/colorUtils.js
git commit -m "refactor: replace color utils with culori-based implementation"
```

---

## Task 4: Add Canvas-based pixel extraction service

**Files:**
- Create: `frontend/src/services/imageProcessor.js`

**Step 1: Create image processor service**

Create `frontend/src/services/imageProcessor.js`:

```javascript
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
```

**Step 2: Verify no syntax errors**

```bash
cd frontend
npm run dev
```

Check for compilation errors.

**Step 3: Commit**

```bash
git add frontend/src/services/imageProcessor.js
git commit -m "feat: add Canvas-based image processing service"
```

---

## Task 5: Update colorMapper to use new utilities

**Files:**
- Modify: `frontend/src/services/colorMapper.js`

**Step 1: Read current implementation**

```bash
cat frontend/src/services/colorMapper.js
```

**Step 2: Replace with browser-only implementation**

Replace entire file with:

```javascript
import { hexToLab, calculateColorDistance } from '../utils/colorUtils';
import { PERLER_COLORS } from '../data/perlerColors';

/**
 * Find the closest Perler bead color to an RGB pixel
 * @param {object} rgbPixel - {r, g, b} with values 0-255
 * @returns {object} Closest Perler color object
 */
function findClosestBead(rgbPixel) {
  // Convert pixel to LAB for accurate color distance
  const targetLab = hexToLab(`rgb(${rgbPixel.r}, ${rgbPixel.g}, ${rgbPixel.b})`);

  let closest = null;
  let minDistance = Infinity;

  for (const bead of PERLER_COLORS) {
    const beadLab = hexToLab(bead.hex);
    const distance = calculateColorDistance(targetLab, beadLab);

    if (distance < minDistance) {
      minDistance = distance;
      closest = bead;
    }
  }

  return closest;
}

/**
 * Map a pixel grid to Perler bead colors
 * @param {array} pixelGrid - 2D array of {r, g, b} pixels
 * @returns {object} Map of bead_id -> count
 */
export function mapPixelsToBeads(pixelGrid) {
  const beadMap = {};

  for (const row of pixelGrid) {
    for (const pixel of row) {
      const closest = findClosestBead(pixel);
      beadMap[closest.id] = (beadMap[closest.id] || 0) + 1;
    }
  }

  return beadMap;
}

/**
 * Convert bead map to array with color details
 * @param {object} beadMap - Map of bead_id -> count
 * @returns {array} Array of {color, count, percentage}
 */
export function formatBeadList(beadMap, totalPixels) {
  return Object.entries(beadMap)
    .map(([beadId, count]) => {
      const color = PERLER_COLORS.find(c => c.id === beadId);
      return {
        color,
        count,
        percentage: ((count / totalPixels) * 100).toFixed(1)
      };
    })
    .sort((a, b) => b.count - a.count);
}
```

**Step 3: Verify compilation**

```bash
cd frontend
npm run dev
```

**Step 4: Commit**

```bash
git add frontend/src/services/colorMapper.js
git commit -m "refactor: update colorMapper for browser-only processing"
```

---

## Task 6: Update projectStore for browser-only image processing

**Files:**
- Modify: `frontend/src/stores/projectStore.js`

**Step 1: Read current implementation**

```bash
cat frontend/src/stores/projectStore.js
```

**Step 2: Update imports**

Replace the api import and add new service imports at the top:

```javascript
import { create } from 'zustand';
import { loadImage, extractPixels, validateImageFile, validateImageDimensions } from '../services/imageProcessor';
import { mapPixelsToBeads } from '../services/colorMapper';
```

Remove this line if it exists:
```javascript
import { uploadImage as apiUploadImage } from '../services/api';
```

**Step 3: Replace uploadImage action**

Find the `uploadImage` action and replace it with:

```javascript
uploadImage: async (file) => {
  try {
    set({ isLoading: true, error: null });

    // Validate file
    validateImageFile(file);

    // Load image
    const img = await loadImage(file);

    // Validate dimensions (warning only)
    const dimCheck = validateImageDimensions(img);
    if (!dimCheck.valid) {
      console.warn(dimCheck.message);
    }

    // Extract pixels using Canvas API
    const { width, height, grid } = extractPixels(img);

    // Map to Perler beads
    const colorMapping = mapPixelsToBeads(grid);

    // Update store
    set({
      uploadedImage: URL.createObjectURL(file),
      pixelGrid: grid,
      imageDimensions: { width, height },
      colorMapping,
      isLoading: false
    });

  } catch (error) {
    set({
      error: error.message || 'Failed to process image',
      isLoading: false
    });
  }
},
```

**Step 4: Verify compilation**

```bash
cd frontend
npm run dev
```

**Step 5: Commit**

```bash
git add frontend/src/stores/projectStore.js
git commit -m "refactor: update projectStore for browser-only image processing"
```

---

## Task 7: Remove API service file

**Files:**
- Delete: `frontend/src/services/api.js`

**Step 1: Delete API service**

```bash
rm frontend/src/services/api.js
```

**Step 2: Search for any remaining imports**

```bash
cd frontend
grep -r "from.*api" src/
```

If any matches found, need to remove those imports.

**Step 3: Verify app compiles**

```bash
npm run dev
```

**Step 4: Commit**

```bash
git add frontend/src/services/api.js
git commit -m "refactor: remove API service (no backend needed)"
```

---

## Task 8: Update App.jsx to load Perler colors locally

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Read current implementation**

```bash
cat frontend/src/App.jsx
```

**Step 2: Update imports**

Add import at the top:
```javascript
import { PERLER_COLORS } from './data/perlerColors';
```

**Step 3: Replace API fetch with local data**

Find any code that fetches colors from API (likely in a `useEffect` with `fetch` or similar) and replace with:

```javascript
useEffect(() => {
  // Load Perler colors from local data
  // If you have a state setter for perlerColors, use it here
  // Otherwise this data is already available via import
}, []);
```

If there's no perler colors state in App.jsx, you can remove the effect entirely.

**Step 4: Verify app loads**

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 and verify app loads without errors.

**Step 5: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "refactor: load Perler colors from local data"
```

---

## Task 9: Test with sample image

**Files:**
- Test file: `sample_image.png` (already exists in project root)

**Step 1: Start dev server**

```bash
cd frontend
npm run dev
```

**Step 2: Upload sample_image.png**

1. Open http://localhost:5173 in browser
2. Drag and drop `sample_image.png` into upload zone
3. Wait for processing

**Step 3: Verify results**

Check that:
- Image displays correctly
- Color mapping appears
- Bead counts show
- No console errors

**Step 4: Compare with old backend results (if available)**

If you have old screenshots or saved results, compare:
- Bead counts should match
- Color distributions should be similar
- Total beads should match

**Step 5: Test error handling**

Try uploading:
- Non-image file (should show error)
- Very large image (should show warning)

**Step 6: Document results**

If all tests pass, no commit needed. If issues found, note them for fixing.

---

## Task 10: Build production version and test static serving

**Files:**
- None (testing only)

**Step 1: Build production bundle**

```bash
cd frontend
npm run build
```

Expected: Build succeeds, `dist/` directory created

**Step 2: Check bundle size**

```bash
ls -lh dist/assets/*.js
```

Verify JavaScript bundle is reasonable size (< 500KB total).

**Step 3: Test static serving**

```bash
cd ..
./serve-local.sh
```

**Step 4: Test in browser**

Open http://localhost:5800 and verify:
- App loads correctly
- Upload works
- Processing works
- No console errors

**Step 5: Stop server**

Press Ctrl+C to stop server.

No commit needed for this task.

---

## Task 11: Update vite.config.js (remove proxy)

**Files:**
- Modify: `frontend/vite.config.js`

**Step 1: Read current config**

```bash
cat frontend/vite.config.js
```

**Step 2: Remove proxy configuration**

If there's a `server.proxy` section, remove it:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Proxy removed - no backend needed
})
```

**Step 3: Verify dev server still works**

```bash
cd frontend
npm run dev
```

**Step 4: Commit**

```bash
git add frontend/vite.config.js
git commit -m "refactor: remove backend proxy from Vite config"
```

---

## Task 12: Delete backend directory

**Files:**
- Delete: `backend/` (entire directory)

**Step 1: Verify frontend works without backend**

Make sure you've tested the frontend thoroughly first (Tasks 8-10).

**Step 2: Delete backend directory**

```bash
rm -rf backend/
```

**Step 3: Verify git status**

```bash
git status
```

Should show backend/ as deleted.

**Step 4: Commit**

```bash
git add backend/
git commit -m "refactor: remove Python backend (browser-only app)"
```

---

## Task 13: Delete old start script

**Files:**
- Delete: `start-dev.sh`

**Step 1: Delete script**

```bash
rm start-dev.sh
```

**Step 2: Commit**

```bash
git add start-dev.sh
git commit -m "refactor: remove old startup script"
```

---

## Task 14: Update CLAUDE.md documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Read current CLAUDE.md**

```bash
cat CLAUDE.md
```

**Step 2: Update implementation summary**

Add a new section at the end of the document:

```markdown

---

## Browser-Only Refactor (2025-10-31)

**Status:** Complete
**Branch:** master

### Changes

- **Removed:** Entire Python backend (FastAPI, routers, services)
- **Added:** culori library for color science
- **Refactored:** Image processing now uses Canvas API
- **Refactored:** Color mapping happens client-side
- **Benefit:** Zero backend costs, static hosting, faster development

### How to Run

```bash
# Development
cd frontend && npm run dev  # http://localhost:5173

# Production test
./serve-local.sh  # http://localhost:5800
```

### Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Zustand
- **Color Science:** culori (LAB, Delta E)
- **Image Processing:** Canvas API
- **Deployment:** Static hosting (Vercel, Netlify, GitHub Pages)

### Files Changed

- Added: `frontend/src/data/perlerColors.js`
- Added: `frontend/src/services/imageProcessor.js`
- Added: `serve-local.sh`
- Modified: `frontend/src/utils/colorUtils.js`
- Modified: `frontend/src/services/colorMapper.js`
- Modified: `frontend/src/stores/projectStore.js`
- Modified: `frontend/vite.config.js`
- Deleted: `frontend/src/services/api.js`
- Deleted: `backend/` (entire directory)
- Deleted: `start-dev.sh`
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with browser-only refactor details"
```

---

## Task 15: Create README for deployment

**Files:**
- Modify: `README.md` (or create if doesn't exist)

**Step 1: Check if README exists**

```bash
ls -la README.md
```

**Step 2: Create/update README**

Add deployment instructions:

```markdown
# Beadsprite Helper

A browser-based PWA for designing beadsprites from pixel art images.

## Features

- Upload pixel art images (PNG, JPG, GIF)
- Automatic color mapping to Perler bead colors
- Shopping list with bead counts
- Color distribution visualization
- Works entirely in browser (no server needed)

## Local Development

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Production Build

```bash
cd frontend
npm run build
```

Static files in `frontend/dist/` ready to deploy.

## Deploy to Vercel

```bash
cd frontend
vercel --prod
```

## Deploy to Netlify

```bash
cd frontend
netlify deploy --prod --dir=dist
```

## Deploy to GitHub Pages

```bash
cd frontend
npm run build
# Copy dist/ contents to gh-pages branch
```

## Technology

- React 18 + Vite
- Tailwind CSS
- Zustand (state management)
- culori (color science)
- Canvas API (image processing)

## License

MIT
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add deployment instructions to README"
```

---

## Verification Checklist

After completing all tasks:

- [ ] `npm run dev` works in frontend/
- [ ] Can upload and process images
- [ ] Color mapping produces results
- [ ] No console errors in browser
- [ ] `npm run build` succeeds
- [ ] `./serve-local.sh` serves static files correctly
- [ ] Bundle size is reasonable (< 500KB)
- [ ] Backend directory deleted
- [ ] Documentation updated

---

## Success Criteria

- ✅ No backend code remains
- ✅ App works completely client-side
- ✅ Color accuracy maintained (LAB + Delta E via culori)
- ✅ Bundle size < 500KB total
- ✅ Ready for static hosting deployment
- ✅ Development workflow simplified (single npm command)

---

## Future Enhancements

See `docs/plans/2025-10-31-browser-only-refactor-design.md` for:
- Phase 2: PWA features (service workers, offline support)
- Web Workers for large images
- Performance optimizations
