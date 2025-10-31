# Claude Code Project Configuration

## Execution Preferences

### Plan Execution
When executing implementation plans, **always use Subagent-Driven Development (option 1)**.

This means:
- Dispatch fresh subagent per task
- Code review between tasks
- Fast iteration with quality gates
- Stay in current session

Do NOT use Parallel Session execution unless explicitly requested by the user.

## Worktree Directory
Worktrees should be created in: `.worktrees/` (project-local, hidden)

---

## Implementation Summary

### Project: Beadsprite Helper PWA

A Progressive Web App that helps users design beadsprites by parsing pixel art images and mapping colors to available bead inventory.

**Branch:** All work merged to `master` (feature branch deleted)

### Completed Work (Tasks 1-10)

#### ✅ Task 1: Project Structure Setup
- **Backend:** Python 3.11 + FastAPI + uv dependency management
- **Frontend:** React 18 + Vite + Tailwind CSS + Zustand + Konva + Axios
- **Dev Script:** `start-dev.sh` - runs both servers concurrently
- **Commits:** `4f1a39e`, `054ba12` (code review fixes)

#### ✅ Task 2: Backend Logging Infrastructure
- Rotating file handlers: `logs/beadsprite.log` and `logs/errors.log`
- 10MB max file size, 5 backup files
- Structured logging with module/function/line info
- **Commit:** `711a311`

#### ✅ Task 3: Perler Bead Color Database
- 28 common Perler bead colors with hex codes
- API endpoints:
  - `GET /api/colors/perler` - all colors
  - `GET /api/colors/perler/{id}` - specific color
- Pydantic models for type safety
- **Commit:** `6125843`

#### ✅ Task 4: Color Space Conversion Utilities
- RGB ↔ LAB conversion (via XYZ intermediate)
- RGB Euclidean distance calculation
- LAB Delta E distance calculation
- Hex ↔ RGB conversion helpers
- **Test suite:** 5 tests, all passing (pytest)
- Gamma correction and D65 illuminant support
- **Commit:** `525f657`

#### ✅ Task 5: Color Conversion API Endpoint
- `POST /api/colors/convert` - converts hex → RGB + LAB
- Pydantic request/response models
- Error handling for invalid hex colors
- **Commit:** `45e1372`

#### ✅ Task 6: Frontend Project Structure
- **Zustand stores:**
  - `projectStore` - project data, parsed pixels, color mappings
  - `inventoryStore` - user's bead collection (persisted)
  - `uiStore` - UI state, loading, errors, zoom/pan
- **API client:** Axios with request/response logging
- **Color utilities:** Distance calculation, color grouping
- **App component:** Loads and displays Perler colors with swatches
- **Commit:** `d71fc5e`

#### ✅ Task 7: Image Upload Endpoint
- `POST /api/images/upload` - accepts multipart/form-data image uploads
- Validates image files (type, size max 10MB, dimensions max 200×200)
- Returns image metadata (width, height, format)
- Integrated with images router
- **Commit:** `7e308aa`

#### ✅ Task 8: Simple Pixel Extraction Service
- `extract_pixels_simple()` service converts PIL images to RGB pixel grids
- Returns structured grid data: `{width, height, grid: [[{r,g,b}]]}`
- Automatically converts images to RGB mode
- Integrated into image upload endpoint response
- **Test suite:** 6 tests, all passing (5 color utils + 1 pixel extraction)
- **Commit:** `4f0830f`

#### ✅ Task 9: Frontend Image Upload Component
- **ImageUploadZone:** Drag-and-drop zone with file picker
- **ImageDisplay:** Shows uploaded image with metadata
- Updated `projectStore` with `uploadImage()` action
- Automatic image upload to backend with FormData
- Error handling and loading states
- Named exports for store imports
- **Commit:** `f175415`

#### ✅ Task 10: Basic Color Mapping Display
- **colorMapper service:** Maps pixels to closest Perler beads using LAB/RGB distance
- **ColorMappingDisplay:** Shopping list with bead counts and percentages
- Color distribution visualization with horizontal bar chart
- Added `rgbToLab()` conversion to frontend colorUtils
- Automatic color mapping triggered on image upload
- Displays unique colors count and total beads needed
- **Commit:** `cd5548f`

### How to Run

```bash
# Start both servers
./start-dev.sh

# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Testing

```bash
# Backend tests
cd backend
uv run pytest tests/ -v
# ✅ 6/6 tests passing

# Manual API testing
curl http://localhost:8000/health
curl http://localhost:8000/api/colors/perler/cherry_red
curl -X POST http://localhost:8000/api/colors/convert \
  -H "Content-Type: application/json" \
  -d '{"hex":"#ff0000"}'
```

### Architecture

**Hybrid Split Processing:**
- **Python API:** Heavy image processing (parsing, grid detection, color conversion)
- **React Frontend:** UI state, color matching, previews, project management

**Tech Stack:**
- Backend: FastAPI, Pillow, NumPy, scikit-image, uv
- Frontend: React 18, Vite, Zustand, Konva, Tailwind CSS, Axios

### MVP Status

**Completed MVP Features (Tasks 1-10):**
- ✅ Image upload with drag-and-drop
- ✅ Pixel extraction from uploaded images
- ✅ Automatic color mapping to Perler beads
- ✅ Shopping list with bead counts
- ✅ Color distribution visualization
- ✅ LAB and RGB color distance matching
- ✅ 28 Perler bead colors database

**Next Steps:**

Remaining tasks from original plan (`docs/plans/2025-10-31-beadsprite-mvp-continuation.md`):
- Task 11: Canvas Workspace with Konva
- Task 12: Enhanced Color Mapping Features
- Task 13: Color Palette Panel
- Task 14: Inventory Manager Component
- Task 15: Preview System
- Task 16: Project File Save/Load
- Task 17: Integration Testing
- Task 18: Performance Optimization

### Files Modified/Created

**Backend:**
- `backend/main.py` - FastAPI app with CORS and routers
- `backend/utils/logging_config.py` - Logging configuration
- `backend/routers/colors.py` - Color endpoints
- `backend/routers/images.py` - Image upload endpoint (NEW)
- `backend/services/color_utils.py` - Color conversion utilities
- `backend/services/pixel_extraction.py` - Pixel extraction service (NEW)
- `backend/data/perler_colors.json` - Bead color database
- `backend/tests/test_color_utils.py` - Color utils test suite
- `backend/tests/test_pixel_extraction.py` - Pixel extraction test (NEW)
- `backend/pyproject.toml` - Dependencies and dev dependencies

**Frontend:**
- `frontend/src/App.jsx` - Main app with image upload and color mapping
- `frontend/src/components/ImageUploadZone.jsx` - Drag-drop upload (NEW)
- `frontend/src/components/ImageDisplay.jsx` - Image preview (NEW)
- `frontend/src/components/ColorMappingDisplay.jsx` - Bead shopping list (NEW)
- `frontend/src/services/api.js` - API client
- `frontend/src/services/colorMapper.js` - Color mapping service (NEW)
- `frontend/src/stores/projectStore.js` - Project state with uploadImage
- `frontend/src/stores/inventoryStore.js` - Inventory state (persisted)
- `frontend/src/stores/uiStore.js` - UI state
- `frontend/src/utils/colorUtils.js` - Color utilities with rgbToLab
- `frontend/vite.config.js` - Vite config with API proxy
- `frontend/tailwind.config.js` - Tailwind config

**Infrastructure:**
- `start-dev.sh` - Development startup script
- `backend/.gitignore` - Python gitignore
- `backend/logs/.gitkeep` - Logs directory

### Design Documents

- **Design:** `docs/plans/2025-10-30-beadsprite-helper-design.md`
- **Implementation Plan (Tasks 1-6):** `docs/plans/2025-10-30-beadsprite-helper-implementation.md`
- **Continuation Plan (Tasks 7-10):** `docs/plans/2025-10-31-beadsprite-mvp-continuation.md`
- **Original Requirements:** `instructions.md`

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
- Modified: `frontend/src/App.jsx`
- Modified: `frontend/src/components/PixelGridDisplay.jsx`
- Modified: `frontend/src/components/ColorPalette.jsx`
- Deleted: `frontend/src/services/api.js`
- Deleted: `backend/` (entire directory)
- Deleted: `start-dev.sh`
