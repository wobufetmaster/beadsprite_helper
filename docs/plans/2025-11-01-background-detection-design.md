# Background Detection Design

**Date:** 2025-11-01
**Status:** Approved for implementation

## Overview

Add automatic background detection to the Beadsprite Helper app to identify and exclude background pixels from bead counts and rendering. Background pixels will be displayed with a checkerboard pattern and excluded from the shopping list.

## Requirements

### Functional Requirements
- Automatically detect background on image upload
- Support two detection methods:
  1. **Alpha transparency** - Use existing PNG transparency
  2. **Edge region detection** - Find edge-connected regions of same color
- Render background pixels with checkerboard pattern
- Exclude background pixels from bead count
- Provide toggle to disable background removal

### Success Criteria
- Images with alpha transparency use that as background mask
- Opaque images detect edge-connected single-color regions as background
- Background pixels visually distinct (checkerboard pattern)
- Bead counts exclude background pixels when feature is enabled
- User can toggle feature on/off without re-uploading image

## Architecture

### Data Flow

```
Image Upload → Extract Pixels → Map to Beads → Detect Background → Display
                     ↓               ↓              ↓
                pixelGrid      beadGrid      backgroundMask
                + alphaData
```

**Pipeline Integration:**
1. `extractPixels()` - Extract RGB grid + alpha channel from Canvas ImageData
2. `mapPixelsToBeads()` - Convert RGB pixels to bead IDs (existing)
3. `detectBackground()` - Generate boolean mask from alpha or edge detection
4. Store `backgroundMask` in projectStore
5. UI components check mask when rendering/counting

### Background Detection Algorithm

**Two-phase detection strategy:**

```javascript
function detectBackground(beadGrid, alphaData, width, height) {
  // Phase 1: Check for alpha channel transparency
  const alphaBackground = detectAlphaTransparency(alphaData, width, height);
  if (alphaBackground) {
    return alphaBackground; // Use existing transparency
  }

  // Phase 2: Edge-based detection for opaque images
  return detectEdgeRegions(beadGrid, width, height);
}
```

#### Phase 1: Alpha Transparency Detection

**For PNG images with transparency:**
- Extract alpha channel from Canvas ImageData (every 4th byte)
- Mark pixels with alpha < 255 (not fully opaque) as background
- Respects artist's original intent
- Simple and accurate

#### Phase 2: Edge Region Detection

**For opaque images:**
- Uses **connected components algorithm**
- Groups pixels by mapped bead color (not raw RGB)
- Marks regions touching image edges as background

**Algorithm:**
```javascript
function detectEdgeRegions(beadGrid, width, height) {
  const visited = Array(height).fill(0).map(() => Array(width).fill(false));
  const backgroundMask = Array(height).fill(0).map(() => Array(width).fill(false));

  // Find all connected components
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!visited[y][x]) {
        const region = floodFill(beadGrid, visited, x, y);

        // If region touches any edge, mark as background
        if (touchesEdge(region, width, height)) {
          region.forEach(({x, y}) => backgroundMask[y][x] = true);
        }
      }
    }
  }

  return backgroundMask;
}
```

**Helper functions:**
- `floodFill(beadGrid, visited, x, y)` - BFS/DFS to find connected pixels with same bead ID
- `touchesEdge(region, width, height)` - Check if any pixel in region is on image border

### State Management

**projectStore additions:**

```javascript
{
  // Existing state
  parsedPixels: [[{r, g, b}]],
  beadGrid: [[beadId]],
  colorMapping: { beadId: count },

  // New state
  backgroundMask: [[boolean]],     // 2D boolean array
  removeBackground: true,           // Toggle state (enabled by default)

  // New actions
  setBackgroundMask(mask) { /* ... */ },
  toggleBackgroundRemoval() { /* ... */ }
}
```

**Persistence:**
- `backgroundMask` - Persisted to localStorage (same as parsedPixels)
- `removeBackground` - Persisted user preference

### UI Integration

#### Visual Rendering

**PixelGridDisplay.jsx:**
- Check `backgroundMask[y][x]` when rendering each pixel
- If pixel is background AND `removeBackground` is true:
  - Render with checkerboard pattern (CSS or canvas)
- Otherwise render normal bead color

**Checkerboard implementation:**
```css
.background-pixel {
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
}
```

#### Bead Count Calculation

**ColorMappingDisplay.jsx:**
- When calculating bead counts, check `removeBackground` flag
- If enabled, skip pixels where `backgroundMask[y][x] === true`
- Display shows only non-background beads

**Count calculation:**
```javascript
const counts = {};
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    // Skip background pixels if feature enabled
    if (removeBackground && backgroundMask[y][x]) continue;

    const beadId = beadGrid[y][x];
    counts[beadId] = (counts[beadId] || 0) + 1;
  }
}
```

#### Toggle Control

**UI element:**
- Checkbox or toggle button near pixel grid
- Label: "Remove Background"
- Bound to `projectStore.toggleBackgroundRemoval()`
- Enabled by default

**Behavior:**
- When toggled, UI immediately updates
- No need to re-run detection (mask is cached)
- State persists across sessions

## Implementation Details

### File Structure

**New file:** `frontend/src/services/backgroundDetector.js`
```javascript
/**
 * Main entry point - detects background using alpha or edge detection
 */
export function detectBackground(beadGrid, alphaData, width, height) { }

/**
 * Phase 1: Detect transparency from alpha channel
 */
function detectAlphaTransparency(alphaData, width, height) { }

/**
 * Phase 2: Detect edge-connected regions for opaque images
 */
function detectEdgeRegions(beadGrid, width, height) { }

/**
 * Flood fill to find connected component
 */
function floodFill(beadGrid, visited, x, y) { }

/**
 * Check if region touches any image edge
 */
function touchesEdge(region, width, height) { }
```

**Modified files:**

1. **`frontend/src/services/imageProcessor.js`**
   - Update `extractPixels()` to return alpha channel data
   - Extract alpha from ImageData: `imageData.data.filter((_, i) => i % 4 === 3)`

2. **`frontend/src/stores/projectStore.js`**
   - Add `backgroundMask` and `removeBackground` state
   - Call `detectBackground()` in `uploadImage()` after `mapPixelsToBeads()`
   - Add `setBackgroundMask()` and `toggleBackgroundRemoval()` actions
   - Persist new state to localStorage

3. **`frontend/src/components/PixelGridDisplay.jsx`**
   - Check `backgroundMask` when rendering pixels
   - Apply checkerboard pattern to background pixels

4. **`frontend/src/components/ColorMappingDisplay.jsx`**
   - Filter out background pixels when calculating bead counts
   - Only filter when `removeBackground` is true

### Edge Cases

**Empty background mask:**
- If no background detected, `backgroundMask` is null or all false
- UI renders normally, no pixels excluded

**Partial transparency:**
- Pixels with 0 < alpha < 255 are treated as background
- No partial transparency rendering (background is binary)

**Toggle during session:**
- Toggling `removeBackground` only affects rendering/counting
- Background mask is preserved and reused

**Image with no edges:**
- Single pixel image: no background detected
- Images where subject touches all edges: may incorrectly mark as background (user can toggle off)

## Testing Strategy

**Manual testing scenarios:**

1. **PNG with transparency**
   - Upload PNG with alpha channel
   - Verify transparent pixels shown as checkerboard
   - Verify bead count excludes transparent pixels

2. **Opaque image with solid background**
   - Upload JPG or opaque PNG with single-color border
   - Verify edge regions detected as background
   - Verify toggle switches between modes

3. **Image with subject touching edges**
   - Upload image where subject extends to edges
   - Verify toggle allows disabling background removal

4. **Fully opaque image with no clear background**
   - Upload complex image with no single-color edges
   - Verify minimal/no background detection
   - Verify app still functions normally

**Unit testing (future):**
- `detectAlphaTransparency()` with various alpha patterns
- `floodFill()` with different grid sizes
- `touchesEdge()` with regions at different positions

## Future Enhancements

**Not included in initial implementation:**

- Adjustable sensitivity threshold for edge detection
- Manual background selection (click to mark/unmark regions)
- Minimum region size threshold (avoid removing small edge details)
- "Smart" detection combining alpha + edge methods
- Preview mode showing what will be removed before applying

These can be added based on user feedback if automatic detection proves insufficient.
