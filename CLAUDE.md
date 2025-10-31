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

**Branch:** `feature/implement-beadsprite-helper` (in `.worktrees/implement-beadsprite-helper`)

### Completed Work (Tasks 1-6)

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
# ✅ 5/5 tests passing

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

### Next Steps

From the implementation plan (`docs/plans/2025-10-30-beadsprite-helper-implementation.md`):

**Remaining Tasks (7-18):**
- Task 7: Image Upload and Parsing Endpoint
- Task 8: Automatic Grid Detection
- Task 9: Manual Grid Extraction Endpoint
- Task 10: Frontend Image Upload Component
- Task 11: Canvas Workspace with Konva
- Task 12: Color Mapping Algorithm
- Task 13: Color Palette Panel
- Task 14: Inventory Manager Component
- Task 15: Preview System
- Task 16: Project File Save/Load
- Task 17: Integration Testing
- Task 18: Start Dev Script Testing

**Note:** Tasks 7-18 are outlined in the plan but need detailed implementation steps added.

### Files Modified/Created

**Backend:**
- `backend/main.py` - FastAPI app with CORS and routers
- `backend/utils/logging_config.py` - Logging configuration
- `backend/routers/colors.py` - Color endpoints
- `backend/services/color_utils.py` - Color conversion utilities
- `backend/data/perler_colors.json` - Bead color database
- `backend/tests/test_color_utils.py` - Test suite
- `backend/pyproject.toml` - Dependencies and dev dependencies

**Frontend:**
- `frontend/src/App.jsx` - Main app component
- `frontend/src/services/api.js` - API client
- `frontend/src/stores/projectStore.js` - Project state
- `frontend/src/stores/inventoryStore.js` - Inventory state (persisted)
- `frontend/src/stores/uiStore.js` - UI state
- `frontend/src/utils/colorUtils.js` - Color utilities
- `frontend/vite.config.js` - Vite config with API proxy
- `frontend/tailwind.config.js` - Tailwind config

**Infrastructure:**
- `start-dev.sh` - Development startup script
- `backend/.gitignore` - Python gitignore
- `backend/logs/.gitkeep` - Logs directory

### Design Documents

- **Design:** `docs/plans/2025-10-30-beadsprite-helper-design.md`
- **Implementation Plan:** `docs/plans/2025-10-30-beadsprite-helper-implementation.md`
- **Original Requirements:** `instructions.md`
