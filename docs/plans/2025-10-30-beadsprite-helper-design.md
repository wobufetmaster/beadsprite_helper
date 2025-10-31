# Beadsprite Helper - Design Document

**Date:** 2025-10-30
**Status:** Approved for Implementation

## Overview

A Progressive Web App (PWA) that helps users design beadsprites by importing pixel art images, automatically parsing them into a grid, and mapping colors to available bead colors. Solves the problem of determining which bead colors best match pixel art when creating physical beadsprites.

## Architecture

### Technology Stack

**Frontend:**
- React 18 with Vite
- Zustand for state management
- Konva or Fabric.js for canvas rendering
- Tailwind CSS for styling
- PWA with service worker for offline capability

**Backend:**
- Python FastAPI server (localhost:8000)
- Pillow for image processing
- NumPy for color calculations
- scikit-image for grid detection
- WebSocket support for progress updates

**Dependency Management:**
- Python: `uv` for fast dependency management
- Frontend: `npm` for package management

### Architectural Approach: Hybrid Split Processing

**Python API Responsibilities:**
- Image upload and parsing
- Pixel extraction from screenshots
- Color space conversions (RGB ↔ LAB)
- Automatic grid detection
- Heavy CPU-intensive image processing

**React Frontend Responsibilities:**
- UI state management
- Color inventory management
- Bead-to-pixel color mapping
- Color substitution previews
- Manual grid overlay
- Project file I/O via File System Access API
- Grid rendering and visualization

## Data Models

### Project File Structure (.json)

```json
{
  "version": "1.0",
  "name": "My Beadsprite",
  "originalImage": "base64_or_path",
  "parsedPixels": {
    "width": 32,
    "height": 32,
    "grid": [[{"r": 255, "g": 0, "b": 0}, ...], ...]
  },
  "colorMapping": {
    "#ff0000": "perler_cherry_red",
    "#00ff00": "custom_lime_green"
  },
  "beadInventory": [
    {
      "id": "perler_cherry_red",
      "hex": "#c41e3a",
      "name": "Cherry Red",
      "source": "perler"
    },
    {
      "id": "custom_lime_green",
      "hex": "#32cd32",
      "name": "Lime",
      "source": "custom"
    }
  ],
  "settings": {
    "colorMatchMode": "lab",
    "similarityThreshold": 5,
    "showGrid": true
  }
}
```

### Frontend State (Zustand Stores)

- **projectStore**: Current project data, parsed pixels, color mappings
- **inventoryStore**: User's bead collection (persists across projects)
- **uiStore**: Grid visibility, selected colors, preview mode, active tool

### API Data Transfer

- Image upload: `multipart/form-data`
- Parsed result: JSON with pixel grid array
- Manual grid: Send corner coordinates, receive extracted pixels

## Image Processing Pipeline

### Automatic Grid Detection (Python)

1. Image uploaded via `/api/parse-image` endpoint
2. Convert to grayscale and detect edges (Canny algorithm)
3. Use Hough line detection to find grid lines
4. Calculate grid cell size from line intersections
5. Extract color from center of each cell (avoid border artifacts)
6. Return pixel grid as 2D array with RGB values

### Manual Grid Override

When automatic detection fails:

1. Frontend displays draggable grid overlay using Konva canvas
2. User adjusts grid size, position, rotation with mouse/touch
3. Send grid parameters to `/api/extract-pixels` endpoint
4. Python samples colors at specified grid coordinates
5. Return extracted pixel data

### Color Grouping

- Frontend calculates color similarity using threshold setting
- Groups nearly-identical colors (e.g., #ffffff and #fffffd)
- Reduces distinct color count before mapping to beads
- Uses either RGB distance or LAB Delta E based on user preference

## Color Mapping and Preview System

### Color Matching Process (Frontend)

1. Get distinct colors from parsed pixels (after grouping)
2. For each distinct color, calculate distance to all owned beads
3. Use LAB Delta E (perceptually uniform) or RGB Euclidean distance
4. Auto-assign closest bead color
5. Allow manual override for any color

### Color Distance Algorithms

- **RGB Euclidean**: `sqrt((r1-r2)² + (g1-g2)² + (b1-b2)²)` - Fast but not perceptually uniform
- **LAB Delta E**: Industry standard perceptual color difference - More accurate to human vision

### Live Preview Features

1. **Color substitution preview**: Click any color, select replacement bead, see instant preview
2. **Before/after view**: Toggle between original parsed colors and mapped bead colors
3. **Grid overlay**: Toggleable grid lines with customizable spacing and color
4. **Bead count display**: Shows quantity needed for each bead color

### Canvas Rendering (React + Konva)

- Main canvas shows current pixel grid
- Each pixel renders as colored square
- Grid lines drawn on separate layer for easy toggle
- Zoom and pan controls for large sprites
- Export view as PNG for reference

## User Workflow

### Main Application Flow

1. **Home Screen**: Create new project or load existing .json file
2. **Image Import**: Drag-drop or file picker, automatic parsing attempt
3. **Grid Adjustment** (if needed): Manual grid overlay with draggable controls
4. **Inventory Setup**: Select owned Perler beads from database, add custom colors
5. **Color Mapping**: Review auto-mapped colors, manually adjust mismatches
6. **Preview & Refine**: Toggle views, substitute colors, adjust settings
7. **Export**: Save project .json, export reference image with bead counts

### Key UI Components

- **Canvas Workspace**: Main viewing area with zoom/pan, grid overlay
- **Color Palette Panel**: Shows distinct colors and their bead mappings
- **Inventory Manager**: Checklist of Perler colors, custom color entry form
- **Settings Panel**: Color match mode, similarity threshold, grid options
- **Bead Counter**: Shopping list showing quantity needed per color

### Navigation Structure

- **Top toolbar**: File operations (new/open/save), undo/redo
- **Left sidebar**: Tool selection (parse, manual grid, color picker)
- **Right sidebar**: Color mappings, inventory, settings
- **Bottom status bar**: Pixel dimensions, zoom level, processing status

## Logging Strategy

### Frontend Logging

- Console logging with log levels (debug/info/warn/error)
- Structured logs for state changes, API calls, and file operations
- Development: Verbose logging enabled
- Production: Info level and above

### Backend Logging

- Python `logging` module with rotating file handler
- **Log files:**
  - `logs/beadsprite.log` - All logs (rotating, max 10MB, keep 5 backups)
  - `logs/errors.log` - Error-level and above only
- Structured JSON logs for production
- Detailed logging for image processing pipeline and color calculations
- Console output during development, file logging always enabled
- Log format: timestamp, level, module, message

### API Logging

- Request/response logging in FastAPI (development)
- Performance metrics for image processing times
- Error tracking with stack traces

## Error Handling and Validation

### Error Handling

**Frontend:**
- Try-catch blocks on all API calls
- User-friendly error messages
- Fallback UI states for loading/error conditions

**Backend:**
- FastAPI exception handlers
- Validation errors return 400 with detailed messages
- Image processing errors logged with full stack traces

**File Operations:**
- Validate .json structure on load
- Handle corrupt files gracefully with error messages
- Confirm before overwriting existing files

### Validation Rules

- **Image uploads**: Max 10MB, supported formats (PNG, JPG, BMP)
- **Grid parameters**: Min 1x1, max 200x200 pixels
- **Color hex codes**: Validate format (#RRGGBB)
- **Similarity threshold**: 0-100 range
- **Project files**: JSON schema validation on load

### Performance Considerations

- **Large images (>100x100)**: Show progress indicator during parsing
- **Canvas rendering**: Virtualization for very large grids
- **Color calculations**: Cache LAB conversions, memoize distance calculations
- **API requests**: Debounce manual grid adjustments, cancel in-flight requests

## Perler Bead Database

### Database Structure

- **Location**: `backend/data/perler_colors.json`
- **Format**:
  ```json
  [
    {
      "id": "cherry_red",
      "hex": "#c41e3a",
      "name": "Cherry Red"
    }
  ]
  ```
- **Size**: ~150 colors in current Perler lineup
- **Source**: Scrape from official Perler website or find existing community database

### Inventory Management

- Users can check/uncheck colors they own from database
- Allow custom color entries for other brands or mixed colors
- Inventory persists across projects in `inventoryStore`

## Development Setup

### Quick Start Script

A shell script `start-dev.sh` will handle installation and startup:

```bash
./start-dev.sh  # Installs dependencies and starts both servers
```

The script will:
1. Check for required tools (uv, node/npm)
2. Install backend dependencies with `uv sync`
3. Install frontend dependencies with `npm install`
4. Start both servers concurrently
5. Handle graceful shutdown on Ctrl+C

### Manual Setup

**Backend Setup:**
```bash
cd backend
uv sync  # Install dependencies
uv run uvicorn main:app --reload  # Start dev server on localhost:8000
```

**Frontend Setup:**
```bash
cd frontend
npm install  # Install dependencies
npm run dev  # Start Vite dev server
```

### Running Both Concurrently

Both servers run simultaneously during development:
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173` (Vite default)
- Frontend proxies API requests to backend

## MVP Scope: Core + Preview Features

### Included in First Version

✅ Import image (drag-drop or file picker)
✅ Automatic pixel parsing with grid detection
✅ Manual grid overlay as fallback
✅ Color inventory management (database + custom)
✅ Automatic color mapping to owned beads
✅ Color substitution preview
✅ Toggleable grid overlay
✅ Before/after view toggle
✅ Bead count display
✅ Save/load project .json files
✅ Export reference image

### Future Enhancements (Post-MVP)

- Multi-layer support for complex sprites
- Pattern templates and libraries
- Collaboration features (share projects)
- Print-optimized bead layout diagrams
- Mobile app version
- Cloud sync for projects

## API Endpoints

### Core Endpoints

- `POST /api/parse-image` - Upload image, get automatic grid extraction
- `POST /api/extract-pixels` - Manual grid extraction with user-defined parameters
- `POST /api/convert-color-space` - Convert between RGB and LAB
- `GET /api/perler-colors` - Get complete Perler bead database
- `WS /ws/progress` - WebSocket for long-running operation progress

## File Structure

```
perler_helper/
├── backend/
│   ├── main.py                 # FastAPI app
│   ├── routers/
│   │   ├── parse.py           # Image parsing endpoints
│   │   └── colors.py          # Color conversion endpoints
│   ├── services/
│   │   ├── grid_detection.py # Automatic grid detection
│   │   ├── pixel_extraction.py
│   │   └── color_utils.py    # Color space conversions
│   ├── data/
│   │   └── perler_colors.json # Bead color database
│   ├── logs/                   # Log files
│   ├── pyproject.toml         # uv config
│   └── uv.lock
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── stores/            # Zustand stores
│   │   ├── services/          # API client
│   │   └── utils/             # Color matching, etc.
│   ├── package.json
│   └── vite.config.js
├── docs/
│   └── plans/
│       └── 2025-10-30-beadsprite-helper-design.md
├── start-dev.sh                # Development startup script
└── instructions.md
```

## Success Criteria

The application is successful when users can:

1. Import a pixel art image (screenshot or file)
2. Successfully parse it into a grid automatically or manually
3. Select their owned bead colors from the database
4. See their image mapped to available bead colors
5. Preview color substitutions in real-time
6. Save and reload their projects
7. Get an accurate bead count for shopping/assembly

## Technical Risks and Mitigations

### Risk: Automatic grid detection fails on complex images

**Mitigation**: Provide robust manual grid overlay as fallback, make it intuitive and fast to use

### Risk: Color matching doesn't match user expectations

**Mitigation**: Provide both LAB and RGB modes, allow manual override of any color, show before/after preview

### Risk: Large images cause performance issues

**Mitigation**: Set reasonable limits (200x200), implement virtualization, show progress indicators

### Risk: PWA file access limitations

**Mitigation**: Use File System Access API (modern browsers), graceful degradation for unsupported browsers

## Next Steps

1. Create implementation plan with detailed tasks
2. Set up project structure (backend + frontend)
3. Implement backend API endpoints
4. Build frontend UI components
5. Integrate image processing pipeline
6. Test with provided test image
7. Iterate on UX based on testing
