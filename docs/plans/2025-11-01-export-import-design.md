# Export/Import Features Design

**Date:** 2025-11-01
**Status:** Approved for Implementation

## Overview

Add two export/import features to the Beadsprite Helper:
1. **Project Save/Load** - Export and import full project state as JSON
2. **Pattern Export** - Export printable bead pattern with color legend (PNG/PDF)

## Requirements

### Project Save/Load
- Export full project state to JSON file
- Download as `beadsprite-project-YYYY-MM-DD.json`
- Import validates structure before loading
- Preserves: pixel grid, color mappings, background mask, settings, selected palettes

### Pattern Export
- Export visual pattern with color legend
- Formats: PNG and PDF
- Layout: Pattern on page 1, legend on page 2 (PDF)
- Legend shows: Color swatch + bead name
- Respects current UI state:
  - Bead shape (circle/square)
  - Background removal toggle
  - Optional pegboard grid overlay

## Architecture

### File Structure
```
frontend/src/
├── services/
│   ├── projectExporter.js    # Project save/load
│   └── patternExporter.js     # Pattern PNG/PDF export
└── components/
    └── PatternRenderer.jsx    # Hidden canvas renderer for export
```

### Separation of Concerns
- **projectExporter.js** - Handles JSON serialization and file I/O
- **patternExporter.js** - Handles image/PDF generation
- **PatternRenderer.jsx** - Dedicated high-quality canvas rendering for export

## Project Save/Load Implementation

### projectExporter.js

**Functions:**
- `exportProject(projectStore)` - Serialize and download JSON
- `importProject(file)` - Validate and parse uploaded JSON

**Data Flow:**
1. User clicks "Save Project"
2. Call `projectStore.exportProject()` to get serialized state
3. Create blob and trigger download
4. User clicks "Load Project" → file input opens
5. User selects file → `importProject()` validates
6. Call `projectStore.loadProject(data)` to restore state
7. UI updates via Zustand subscriptions

**Validation Checks:**
- Valid JSON format
- Required fields present: `parsedPixels`, `colorMapping`
- Version compatibility check
- Data integrity (arrays are arrays, objects are objects)

**Error Handling:**
- Invalid JSON → "Invalid project file"
- Missing fields → "Incompatible project format"
- File read error → "Failed to read file"

## Pattern Export Implementation

### PatternRenderer.jsx

**Purpose:** Hidden component that renders pattern to canvas for export

**Rendering Strategy:**
- Create offscreen canvas with 300 DPI resolution
- Calculate pixel size: `pixelSize = Math.floor(3000 / Math.max(width, height))`
- Target max dimension: ~3000px for print quality

**Render Logic:**
- Respect current UI state:
  - `beadShape` from PixelGridDisplay (circle/square)
  - `removeBackground` from projectStore
  - `showPegboardGrid` from optional parameter
- Draw each bead:
  - **Square mode:** `ctx.fillRect()` with bead color
  - **Circle mode:** `ctx.arc()` with radial gradient for depth
  - **Background pixels:** Skip if `removeBackground` is true
- **Optional pegboard grid:** Draw blue lines at pegboard boundaries

### patternExporter.js

**Functions:**
- `exportPNG(canvas)` - Convert canvas to PNG blob and download
- `exportPDF(patternCanvas, legendData)` - Create PDF with pattern and legend

**PNG Export:**
1. Get canvas from PatternRenderer
2. Convert to blob: `canvas.toBlob()`
3. Download as `beadsprite-pattern-YYYY-MM-DD.png`

**PDF Export:**
1. Create jsPDF document
2. **Page 1:** Add pattern image (scale to fit page)
3. **Page 2:** Render color legend
   - Table format with rows for each color
   - Column 1: Color swatch (small filled rectangle)
   - Column 2: Bead name
4. Download as `beadsprite-pattern-YYYY-MM-DD.pdf`

**Legend Data Structure:**
```javascript
[
  { beadId: "kiwi_lime", beadName: "Kiwi Lime", hex: "#c3e991", count: 150 },
  // ... sorted by count descending
]
```

## UI Integration

### Project Controls
**Location:** New section in App.jsx (after header or in settings area)

**Layout:**
```
Project Management
[Save Project] [Load Project]
```

**Buttons:**
- **Save Project:** Direct click → downloads JSON immediately
- **Load Project:** Opens file input → validates → confirms before overwriting

### Pattern Export Controls
**Location:** New section after ColorMappingDisplay

**Layout:**
```
Export Pattern for Printing
Format: [PNG ▼] [PDF ▼]
☐ Include pegboard grid
[Export Pattern]
```

**Controls:**
- Format dropdown: PNG or PDF
- Checkbox: Include/exclude pegboard grid overlay
- Export button: Triggers download

**State:**
- Disabled when no project loaded
- Tooltip on disabled: "Load an image first"

### User Flow - Pattern Export
1. User adjusts view (bead shape, background toggle)
2. Select export format (PNG/PDF)
3. Toggle grid overlay if desired
4. Click "Export Pattern"
5. PatternRenderer creates canvas
6. Pattern exported as file
7. Success toast: "Pattern exported successfully"

## Dependencies

### New Package
- **jspdf** - PDF generation (~50KB gzipped)
- Install: `npm install jspdf`

## Error Handling

### Project Save/Load
- Invalid JSON format → "Invalid project file"
- Missing required fields → "Incompatible project format"
- File read errors → "Failed to read file"

### Pattern Export
- Canvas rendering fails → "Failed to generate pattern image"
- PDF generation fails → "Failed to create PDF"
- No project loaded → Disable export buttons

## Testing Considerations

### Project Save/Load
- Export then import preserves all state
- Invalid files show appropriate errors
- Large projects (200x200) handle correctly

### Pattern Export
- PNG quality sufficient for printing
- PDF legend accurate and readable
- Pegboard grid overlay aligns correctly
- Background removal respected
- Both bead shapes render correctly

## Future Enhancements (Out of Scope)
- Cloud storage integration
- Share projects via URL
- Multiple export templates
- Print preview before export
- Batch export (multiple formats at once)
