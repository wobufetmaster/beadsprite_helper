# Labeled PDF Export Design

**Date:** 2025-11-02
**Status:** Approved
**Author:** Claude Code

## Overview

Enhance PDF pattern exports to include color-coded labels on each pixel that correspond to entries in the legend. This makes it easier for users to follow printed patterns when assembling beadsprites.

## User Requirements

- Export PDF patterns with labels on every pixel showing which bead color to use
- Labels should use a letter-number system (e.g., A1, B2) grouped by color families
- Labels appear both on the pattern grid and in the legend for easy reference
- Pattern pixels must be large enough for labels to be readable (scale up if needed)
- Feature always enabled for PDF exports (no toggle needed)

## Label Generation System

### Color-to-Label Mapping Algorithm

**Function:** `generateColorLabels(beadIds)` in new file `utils/labelGenerator.js`

**Process:**

1. Convert each bead's hex color to HSL using culori library
2. Group colors by hue angle ranges into letter categories:
   - **A (Reds)**: 345-15°
   - **B (Oranges)**: 15-45°
   - **C (Yellows)**: 45-75°
   - **D (Yellow-Greens)**: 75-105°
   - **E (Greens)**: 105-165°
   - **F (Cyans)**: 165-195°
   - **G (Blues)**: 195-255°
   - **H (Purples)**: 255-285°
   - **I (Magentas)**: 285-315°
   - **J (Pinks)**: 315-345°
   - **K (Grays/Neutrals)**: Saturation < 10%
   - **L (Browns)**: Lightness < 40% and saturation 10-25%

3. Within each hue family, sort colors by lightness (light to dark)
4. Assign sequential numbers (A1, A2, A3, etc.)
5. Return mapping: `{ beadId: "A1", anotherBeadId: "B2", ... }`

**Example output:**
```javascript
{
  "mint_green": "E1",    // Green family, lightest
  "dark_green": "E5",    // Green family, darkest
  "light_blue": "G1",    // Blue family, lightest
  "dark_blue": "G4"      // Blue family, darker
}
```

### Label Consistency

- Labels are generated once per export and stay consistent throughout the PDF
- Same pattern exported multiple times will have identical labels (deterministic algorithm)
- Labels are based only on colors actually used in the pattern (not all 107 Perler colors)

## Labeled Pattern Renderer

### New Component: `LabeledPatternRenderer.jsx`

**Purpose:** Offscreen canvas renderer specifically for PDF exports with embedded labels.

**Key Features:**

1. **Pixel Size Calculation:**
   - Minimum pixel size: 20px (to fit 2-character labels comfortably)
   - Formula: `pixelSize = max(20, MIN_READABLE_SIZE)`
   - Canvas dimensions: `width × pixelSize, height × pixelSize`

2. **Text Rendering:**
   - Font: Bold monospace (e.g., "bold 10px 'Courier New'")
   - Color: Contrasting text based on background luminance
     - If luminance > 0.5: black text
     - If luminance ≤ 0.5: white text
   - Position: Centered within each pixel square/circle

3. **Rendering Logic:**
   - Iterate through beadGrid (2D array)
   - For each pixel:
     - Draw colored square or circle (based on beadShape prop)
     - Look up label code from colorLabels map
     - Render label centered on pixel
     - Apply contrasting text color
   - Optionally overlay pegboard grid

4. **Canvas Export:**
   - Return canvas via `onCanvasReady(canvas)` callback
   - Used by `exportPDF()` to generate pattern image

**Props:**
```javascript
{
  beadGrid: Array,           // 2D array of bead IDs
  colorLabels: Object,       // { beadId: "A1", ... }
  backgroundMask: Array,     // 2D array of booleans
  removeBackground: Boolean,
  beadShape: String,         // "square" | "circle"
  showPegboardGrid: Boolean,
  onCanvasReady: Function    // Callback with canvas
}
```

### Architecture Notes

- Separate component from PatternRenderer (cleaner separation of concerns)
- Not displayed on screen (offscreen rendering only)
- Instantiated only during PDF export process
- Reuses existing bead color lookup from PERLER_COLORS

## PDF Export Modifications

### Updated `exportPDF()` in `patternExporter.js`

**Enhanced workflow:**

1. **Generate label mapping:**
   ```javascript
   const colorLabels = generateColorLabels(legendData.map(item => item.beadId));
   ```

2. **Render labeled pattern:**
   ```javascript
   const labeledCanvas = await renderLabeledPattern(
     beadGrid,
     colorLabels,
     backgroundMask,
     removeBackground,
     beadShape,
     showPegboardGrid
   );
   ```

3. **Multi-page pattern handling:**
   - Calculate if pattern fits on single A4 page
   - If too large, split into tiles:
     - Each page shows portion of pattern (e.g., rows 1-30, cols 1-30)
     - Add page header: "Pattern Section: Rows 1-30, Columns 1-30"
     - Ensure tiles have slight overlap for alignment reference

4. **Add pattern pages:**
   - Page 1+: Pattern grid (possibly tiled across multiple pages)
   - Each page has margins and optional page numbers

5. **Add legend page:**
   - Final page contains color legend
   - Enhanced table with new "Code" column

### Legend Table Format

**New column layout:**

| Code | Color | Name | Count |
|------|-------|------|-------|
| A1   | ■     | Mint Green | 45 |
| A2   | ■     | Dark Green | 23 |
| B1   | ■     | Light Blue | 67 |

**Sorting:** By label code (A1, A2, ..., Z9)

**Styling:**
- Bold "Code" column for emphasis
- Color swatches remain with border
- Right-aligned count column

## Edge Cases & Error Handling

### Pattern Size Edge Cases

1. **Very small patterns (< 10×10):**
   - Still use minimum 20px per pixel
   - Pattern will appear quite large on page
   - No special handling needed

2. **Very large patterns (> 100×100):**
   - Automatically tile across multiple pages
   - Add clear section markers on each page
   - Include grid coordinates for assembly reference

3. **Aspect ratio extremes:**
   - Very wide patterns: tile horizontally
   - Very tall patterns: tile vertically
   - Maintain readable pixel size constraint

### Color Grouping Edge Cases

1. **Many colors in one hue family:**
   - If 15 greens exist: E1, E2, ... E15
   - Letter categories support unlimited numbers
   - Sorting by lightness prevents confusion

2. **Grayscale/monochrome patterns:**
   - All colors may fall into K (grays) or L (browns)
   - Labels: K1, K2, K3, etc.
   - Still provides unique identifier per shade

3. **Background removal enabled:**
   - Background pixels skipped in rendering
   - No labels on transparent/white areas
   - Legend excludes background color

### Text Contrast Issues

**Luminance calculation:**
```javascript
// Using relative luminance formula
const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
const textColor = (luminance > 0.5) ? '#000000' : '#FFFFFF';
```

**Fallback for edge cases:**
- Colors near luminance threshold (0.45-0.55): test both, use higher contrast
- Semi-transparent beads: calculate effective color over white background

## Implementation Files

### New Files

1. **`frontend/src/utils/labelGenerator.js`**
   - `generateColorLabels(beadIds)` - Main label generation function
   - `groupByHue(colors)` - HSL-based color grouping
   - `assignLabelCodes(groups)` - Letter-number assignment

2. **`frontend/src/components/LabeledPatternRenderer.jsx`**
   - React component for rendering labeled patterns
   - Canvas-based, offscreen rendering
   - Exports canvas via callback

### Modified Files

1. **`frontend/src/services/patternExporter.js`**
   - Update `exportPDF()` to use labeled renderer
   - Add multi-page pattern tiling logic
   - Enhance legend table with Code column

2. **`frontend/src/components/PatternExportControls.jsx`**
   - Instantiate LabeledPatternRenderer for PDF exports
   - Pass colorLabels to export functions
   - No UI changes (feature always enabled)

## Success Criteria

- PDF exports include readable labels on every pixel
- Labels use letter-number codes grouped by hue families
- Legend table includes Code column showing label mapping
- Labels are readable at minimum 20px pixel size
- Large patterns tile gracefully across multiple pages
- Text contrast ensures labels are visible on all bead colors
- Export process completes without errors for patterns up to 200×200 pixels

## Future Enhancements (Out of Scope)

- User-customizable label formats (e.g., pure numbers, custom abbreviations)
- Option to toggle labels on/off
- Export labeled patterns as PNG
- Interactive label editor to override auto-generated codes
