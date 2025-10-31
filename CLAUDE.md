# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Beadsprite Helper** - A browser-based PWA for designing beadsprites from pixel art images. The app processes images entirely client-side, maps pixels to Perler bead colors using perceptually accurate LAB color space, and generates shopping lists.

**Current Status:** Browser-only architecture (no backend). All processing happens in the browser using Canvas API and culori for color science.

## Development Commands

### Essential Commands

```bash
# Development server (http://localhost:5173)
cd frontend && npm run dev

# Production build
cd frontend && npm run build

# Lint code
cd frontend && npm run lint

# Test production build locally (http://localhost:5800)
./serve-local.sh
```

### Deployment

```bash
# Vercel
cd frontend && vercel --prod

# Netlify
cd frontend && netlify deploy --prod --dir=dist

# GitHub Pages
cd frontend && npm run build
# Then copy dist/ to gh-pages branch
```

## Architecture

### Data Flow

**Image Upload → Processing → Color Mapping → Display:**

1. **Image Upload** (`ImageUploadZone.jsx`)
   - User uploads image via drag-and-drop or file picker
   - Calls `projectStore.uploadImage(file)`

2. **Image Processing** (`services/imageProcessor.js`)
   - `loadImage()` - Creates HTMLImageElement from File
   - `extractPixels()` - Uses Canvas API to extract RGB pixel grid
   - Returns: `{ width, height, grid: [[{r, g, b}]] }`

3. **Color Mapping** (`services/colorMapper.js`)
   - `mapPixelsToBeads(grid)` - Maps each pixel to closest Perler bead
   - Uses culori's LAB color space + Delta E distance (CIE2000)
   - Returns: `{ bead_id: count }` object

4. **State Management** (`stores/projectStore.js`)
   - Stores pixel grid, color mapping, and image metadata
   - Persisted to localStorage (except File/Blob objects)
   - Automatically triggers color mapping on image upload

### State Architecture (Zustand)

**Three separate stores:**

1. **`projectStore`** - Project data and image processing
   - `uploadedImage` - Image metadata and preview URL
   - `parsedPixels` - 2D array of RGB pixels
   - `colorMapping` - Map of bead IDs to counts
   - `settings` - Color match mode, thresholds
   - Actions: `uploadImage()`, `setParsedPixels()`, `resetProject()`

2. **`inventoryStore`** - User's bead inventory (persisted)
   - `ownedColors` - Which bead colors the user owns
   - Actions: `addColor()`, `removeColor()`, `clearInventory()`

3. **`uiStore`** - UI state (loading, errors, zoom/pan)
   - `isLoading`, `error`, `zoomLevel`, `panOffset`
   - Actions: `setLoading()`, `setError()`, `clearError()`

### Color Science

**Color matching uses LAB color space for perceptual accuracy:**

- RGB → LAB conversion via `culori` library
- Delta E (CIE2000) distance metric
- More accurate than Euclidean RGB distance
- Implementation: `frontend/src/utils/colorUtils.js`

**Perler Color Database:**
- 107 Perler bead colors in `frontend/src/data/perlerColors.js`
- Format: `{ id, name, hex }`
- Loaded as ES module (no API calls)

### Component Hierarchy

```
App.jsx (main container)
├── ImageUploadZone.jsx (drag-drop uploader)
├── ImageDisplay.jsx (shows uploaded image)
├── GridAdjustmentControls.jsx (disabled - requires backend)
├── PixelGridDisplay.jsx (shows pixel grid with colors)
├── ColorPalette.jsx (interactive color selection)
└── ColorMappingDisplay.jsx (shopping list with bead counts)
```

## Key Implementation Details

### Browser-Only Constraints

- **No backend** - Everything runs client-side
- **Canvas API** - Used for image pixel extraction
- **File size limits** - 10MB max, 200×200px recommended
- **Grid detection** - Not available (would require backend processing)

### Image Processing Pipeline

```javascript
// projectStore.uploadImage() flow:
validateImageFile(file)           // Check type, size
→ loadImage(file)                 // Create HTMLImageElement
→ validateImageDimensions(img)    // Warn if > 200×200
→ extractPixels(img)              // Canvas API → RGB grid
→ mapPixelsToBeads(grid)          // LAB distance → bead IDs
→ set({ parsedPixels, colorMapping })  // Update store
```

### State Persistence

**Persisted (localStorage):**
- Project name, settings
- Parsed pixels grid
- Color mapping
- Uploaded image dimensions

**Not persisted:**
- File objects (can't serialize)
- Blob URLs (expire on page reload)
- Original uploaded image

## Execution Preferences

### Plan Execution
When executing implementation plans, **always use Subagent-Driven Development (option 1)**.

This means:
- Dispatch fresh subagent per task
- Code review between tasks
- Fast iteration with quality gates
- Stay in current session

Do NOT use Parallel Session execution unless explicitly requested by the user.

### Worktree Directory
Worktrees should be created in: `.worktrees/` (project-local, hidden)

## Design Documents

- **Browser-Only Refactor Design:** `docs/plans/2025-10-31-browser-only-refactor-design.md`
- **Implementation Plan:** `docs/plans/2025-10-31-browser-only-refactor-implementation.md`
- **Original Design:** `docs/plans/2025-10-30-beadsprite-helper-design.md`

## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management (with persistence middleware)
- **culori** - Color science library (LAB, Delta E)
- **Konva / react-konva** - Canvas manipulation (for future grid features)

## Future Enhancements

Per original plan, remaining features to implement:
- Canvas workspace with Konva for visual editing
- Enhanced color mapping with user overrides
- Inventory management with quantity tracking
- Project save/load functionality
- PWA features (service workers, offline support)
