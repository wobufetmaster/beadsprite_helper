# Browser-Only Architecture Refactor Design

**Date:** 2025-10-31
**Status:** Design Approved
**Author:** Claude Code

## Overview

Refactor the Beadsprite Helper PWA from a Python FastAPI backend + React frontend architecture to a pure browser-based static web application. This eliminates server dependencies while maintaining all existing features.

## Motivation

Moving to a browser-only architecture provides:
- **Easier deployment:** Static hosting (GitHub Pages, Netlify, Vercel) with no backend server management
- **Offline capability:** Foundation for true PWA with service workers (Phase 2)
- **Cost reduction:** Zero backend hosting costs
- **Simplicity:** Single codebase in one language, fewer moving parts

## Architecture

### What Gets Removed

- **Backend:**
  - Entire `backend/` directory (FastAPI application, routers, services)
  - Python dependencies: FastAPI, Pillow, NumPy, scikit-image, pytest
  - Complex startup orchestration (`start-dev.sh`)

### What Stays

- **Frontend:**
  - Current React 18 + Vite + Tailwind CSS stack
  - Zustand stores (projectStore, inventoryStore, uiStore)
  - Existing UI components and user workflows
  - All visual design and interactions

### New Dependencies

- **culori** (~40KB): Modern color science library
  - LAB color space conversions
  - Delta E distance calculations
  - Tree-shakeable, actively maintained
  - Replaces hand-coded Python color_utils.py

### Data Migration

- Move `backend/data/perler_colors.json` → `frontend/src/data/perlerColors.js`
- Import as ES module constant (no API calls)

### Local Development

```bash
# Development mode with hot reload
npm run dev  # http://localhost:5173

# Production testing
npm run build
python -m http.server -d dist 5800  # http://localhost:5800
```

### Deployment

```bash
npm run build  # Produces static files in dist/
# Deploy dist/ to any static host
```

## Component Changes

### Files to Modify

#### 1. `frontend/src/utils/colorUtils.js`
**Current:** Hand-coded RGB↔LAB conversion matching Python implementation
**New:** Use culori library

```javascript
import { lab, rgb, differenceDeltaE } from 'culori';

// Replace rgbToLab() with culori.lab()
export function rgbToLab(r, g, b) {
  return lab({ mode: 'rgb', r: r/255, g: g/255, b: b/255 });
}

// Replace manual Delta E calculation
export function calculateColorDistance(color1, color2) {
  return differenceDeltaE(color1, color2);
}
```

#### 2. `frontend/src/services/colorMapper.js`
**Current:** Depends on backend color conversion API
**New:** Calculate LAB distances directly in browser

```javascript
import { lab, differenceDeltaE } from 'culori';
import { PERLER_COLORS } from '../data/perlerColors';

export function mapPixelsToBeds(pixelGrid) {
  const beadMap = {};

  for (const row of pixelGrid) {
    for (const pixel of row) {
      const closest = findClosestBead(pixel);
      beadMap[closest.id] = (beadMap[closest.id] || 0) + 1;
    }
  }

  return beadMap;
}

function findClosestBead(rgbPixel) {
  const targetLab = lab({ mode: 'rgb', ...rgbPixel });

  let closest = null;
  let minDistance = Infinity;

  for (const bead of PERLER_COLORS) {
    const beadLab = lab(bead.hex);
    const distance = differenceDeltaE(targetLab, beadLab);

    if (distance < minDistance) {
      minDistance = distance;
      closest = bead;
    }
  }

  return closest;
}
```

#### 3. `frontend/src/stores/projectStore.js`
**Current:** API call to upload image and get pixel grid
**New:** Process image directly with Canvas API

```javascript
async function uploadImage(file) {
  try {
    set({ isLoading: true, error: null });

    // Load image
    const img = await loadImage(file);

    // Extract pixels using Canvas API
    const { width, height, grid } = extractPixels(img);

    // Map to beads
    const colorMapping = mapPixelsToBeds(grid);

    set({
      uploadedImage: URL.createObjectURL(file),
      pixelGrid: grid,
      imageDimensions: { width, height },
      colorMapping,
      isLoading: false
    });
  } catch (error) {
    set({ error: error.message, isLoading: false });
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function extractPixels(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const pixels = imageData.data; // RGBA array

  // Convert to grid structure
  const grid = [];
  for (let y = 0; y < img.height; y++) {
    const row = [];
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      row.push({
        r: pixels[i],
        g: pixels[i + 1],
        b: pixels[i + 2]
        // Skip alpha channel
      });
    }
    grid.push(row);
  }

  return { width: img.width, height: img.height, grid };
}
```

#### 4. `frontend/src/data/perlerColors.js` (New File)
**Purpose:** Import Perler color database as ES module

```javascript
export const PERLER_COLORS = [
  { id: "cherry_red", name: "Cherry Red", hex: "#B52946" },
  { id: "red", name: "Red", hex: "#CA3435" },
  // ... all 28 colors
];
```

### Files to Delete

- `frontend/src/services/api.js` - No API calls needed
- Entire `backend/` directory
- `start-dev.sh` - Replaced by simple npm commands

## Data Flow

**Old Flow (Backend-Dependent):**
```
User uploads → API POST /api/images/upload →
Python Pillow processes → Returns pixel grid →
Frontend maps colors
```

**New Flow (Browser-Only):**
```
User uploads → FileReader API →
Canvas API extracts pixels →
culori calculates distances →
Zustand stores results → UI updates
```

All processing happens synchronously in the browser, no network calls.

## Error Handling

### File Validation
- Check file type: `image/*` (PNG, JPG, GIF)
- Size limit: 10MB maximum
- Dimension limit: 200×200 pixels (warn or auto-resize)

### Canvas Errors
- Try-catch around Canvas API calls
- Handle corrupt images, unsupported formats
- Clear error messages to user

### Memory Management
- Process large images in chunks if needed
- Consider auto-resize for images > 200×200
- Web Workers for large images (future enhancement)

### User Feedback
- Show progress during processing
- Display clear error messages
- Loading states in UI

## Performance Considerations

- **Target:** < 1 second processing for typical images (50×50 pixels)
- **Maximum:** < 2 seconds for 200×200 images
- **Color mapping complexity:** O(n×m) where n=pixels, m=28 perler colors
- **Bundle size:** +40KB for culori, acceptable trade-off for reliability

## Testing & Validation

### Visual Regression Testing
1. Upload same test images before/after refactor
2. Compare color mappings with Python backend results
3. Verify bead counts match exactly

### Color Accuracy
1. Test culori against backend `color_utils.py` LAB conversions
2. Verify Delta E calculations within tolerance (< 0.01)
3. Use known RGB→LAB test cases

### Browser Compatibility
- Test Canvas API: Chrome, Firefox, Safari
- Verify FileReader API cross-browser
- Check culori bundle size and tree-shaking

### Performance Testing
- Measure processing time for various image sizes
- Profile memory usage for edge cases
- Ensure no UI blocking for typical images

## Migration Strategy

### Phase 1: Browser-Only Refactor (This Design)
1. Install culori dependency
2. Migrate color utilities to culori
3. Implement Canvas-based pixel extraction
4. Update stores to remove API dependencies
5. Delete backend code
6. Test thoroughly

### Phase 2: PWA Features (Future)
- Service workers for offline support
- App manifest for installability
- Cache strategies for assets
- Background sync capabilities

## Success Criteria

- ✅ Same color mappings as Python backend
- ✅ Bundle size increase < 50KB
- ✅ Processing time < 2 seconds for 200×200 images
- ✅ No backend required
- ✅ Works in all modern browsers
- ✅ Deployable to static hosting

## Backward Compatibility

- **Zustand store structure:** Unchanged, components don't need updates
- **Data shapes:** Same pixel grid and color mapping formats
- **UI components:** No changes needed, only data source changes
- **Git history:** Backend code preserved for reference

## Deployment Options

### GitHub Pages
```bash
npm run build
# Push dist/ to gh-pages branch
```

### Netlify
```bash
npm run build
# Deploy dist/ directory
```

### Vercel
```bash
npm run build
# Deploy frontend/ directory
```

All options support custom domains, HTTPS, and CDN.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Color accuracy differences | Thorough testing against Python backend, accept <0.01 Delta E tolerance |
| Browser compatibility | Test Canvas API in all major browsers, provide fallback messages |
| Performance issues | Profile and optimize, add Web Workers if needed, limit image sizes |
| Bundle size growth | Use tree-shaking, only import needed culori functions |

## Future Enhancements

1. **PWA Features:** Service workers, offline support, installability
2. **Web Workers:** Offload processing for large images
3. **WebAssembly:** Port color calculations to WASM for speed
4. **Progressive Image Loading:** Process images in tiles
5. **Advanced Color Matching:** User-configurable distance thresholds

## References

- [culori documentation](https://culorijs.org/)
- [Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [FileReader API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/FileReader)
