# Beadsprite Helper MVP Continuation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use @superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the MVP by adding image upload, basic pixel extraction, color mapping display, and bead counting.

**Architecture:** Building on the existing foundation (Tasks 1-6 complete), add image processing endpoints and UI components to create a minimally viable beadsprite design tool.

**Tech Stack:** FastAPI, Pillow, NumPy, React 18, Zustand, Konva

**Status:** Tasks 1-6 complete and merged to master. Continuing with Tasks 7-10 for MVP completion.

---

## Task 7: Image Upload Endpoint

**Files:**
- Create: `backend/routers/images.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_images.py`

**Step 1: Create images router**

Create `backend/routers/images.py`:

```python
import logging
import io
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from PIL import Image
import base64

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/images", tags=["images"])

class ImageUploadResponse(BaseModel):
    success: bool
    width: int
    height: int
    format: str
    message: str

@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(file: UploadFile = File(...)):
    """Upload and validate an image file."""
    try:
        # Read file contents
        contents = await file.read()

        # Validate it's an image
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            logger.error(f"Invalid image file: {e}")
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Check file size (max 10MB)
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image file too large (max 10MB)")

        # Check dimensions (max 200x200 for MVP)
        width, height = image.size
        if width > 200 or height > 200:
            logger.warning(f"Image too large: {width}x{height}")
            raise HTTPException(
                status_code=400,
                detail=f"Image too large ({width}x{height}). Maximum 200x200 pixels."
            )

        logger.info(f"Image uploaded: {width}x{height}, format: {image.format}")

        return ImageUploadResponse(
            success=True,
            width=width,
            height=height,
            format=image.format,
            message=f"Image uploaded successfully: {width}x{height}"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")
```

**Step 2: Register images router**

Edit `backend/main.py`, add after colors router import:

```python
from routers import colors, images
```

Add after colors router inclusion:

```python
app.include_router(images.router)
```

**Step 3: Test image upload endpoint**

```bash
cd backend
uv run uvicorn main:app --reload
```

Test with curl:
```bash
# This will fail without an actual image, but verifies endpoint exists
curl -X POST http://127.0.0.1:8000/api/images/upload \
  -F "file=@/path/to/test/image.png"
```

Expected: 200 response with image info, or 400 if invalid

**Step 4: Commit image upload endpoint**

```bash
git add backend/routers/images.py backend/main.py
git commit -m "feat: add image upload endpoint

- POST /api/images/upload validates and accepts images
- Max 10MB file size, max 200x200 pixels
- Returns image dimensions and format
- Error handling for invalid files"
```

---

## Task 8: Simple Pixel Extraction Service

**Files:**
- Create: `backend/services/pixel_extraction.py`
- Create: `backend/tests/test_pixel_extraction.py`
- Modify: `backend/routers/images.py`

**Step 1: Write test for pixel extraction (TDD)**

Create `backend/tests/test_pixel_extraction.py`:

```python
import pytest
from PIL import Image
import numpy as np
from services.pixel_extraction import extract_pixels_simple

def test_extract_pixels_simple():
    """Test simple pixel extraction from a small image."""
    # Create a 2x2 test image
    img = Image.new('RGB', (2, 2))
    pixels = [
        (255, 0, 0),    # Red
        (0, 255, 0),    # Green
        (0, 0, 255),    # Blue
        (255, 255, 255) # White
    ]
    img.putdata(pixels)

    result = extract_pixels_simple(img)

    assert result['width'] == 2
    assert result['height'] == 2
    assert len(result['grid']) == 2  # 2 rows
    assert len(result['grid'][0]) == 2  # 2 cols

    # Check first pixel is red
    assert result['grid'][0][0]['r'] == 255
    assert result['grid'][0][0]['g'] == 0
    assert result['grid'][0][0]['b'] == 0
```

**Step 2: Run test to verify it fails**

```bash
cd backend
uv run pytest tests/test_pixel_extraction.py -v
```

Expected: FAIL - ModuleNotFoundError

**Step 3: Implement pixel extraction**

Create `backend/services/pixel_extraction.py`:

```python
import logging
from PIL import Image
from typing import Dict, List

logger = logging.getLogger(__name__)

def extract_pixels_simple(image: Image.Image) -> Dict:
    """
    Extract all pixels from an image as a grid.

    Args:
        image: PIL Image object

    Returns:
        Dict with width, height, and grid of RGB values
    """
    width, height = image.size

    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')

    # Extract all pixels
    pixels = list(image.getdata())

    # Organize into grid (row-major order)
    grid = []
    for y in range(height):
        row = []
        for x in range(width):
            idx = y * width + x
            r, g, b = pixels[idx]
            row.append({'r': r, 'g': g, 'b': b})
        grid.append(row)

    logger.info(f"Extracted {width}x{height} pixel grid")

    return {
        'width': width,
        'height': height,
        'grid': grid
    }
```

**Step 4: Run tests to verify they pass**

```bash
cd backend
uv run pytest tests/test_pixel_extraction.py -v
```

Expected: PASS

**Step 5: Add pixel extraction to upload endpoint**

Edit `backend/routers/images.py`, add imports:

```python
from services.pixel_extraction import extract_pixels_simple
```

Update `ImageUploadResponse`:

```python
class PixelGrid(BaseModel):
    width: int
    height: int
    grid: List[List[Dict[str, int]]]

class ImageUploadResponse(BaseModel):
    success: bool
    width: int
    height: int
    format: str
    pixels: PixelGrid
    message: str
```

Update the upload endpoint to extract pixels:

```python
@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(file: UploadFile = File(...)):
    """Upload an image and extract its pixels."""
    try:
        contents = await file.read()

        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            logger.error(f"Invalid image file: {e}")
            raise HTTPException(status_code=400, detail="Invalid image file")

        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image file too large (max 10MB)")

        width, height = image.size
        if width > 200 or height > 200:
            logger.warning(f"Image too large: {width}x{height}")
            raise HTTPException(
                status_code=400,
                detail=f"Image too large ({width}x{height}). Maximum 200x200 pixels."
            )

        # Extract pixels
        pixel_data = extract_pixels_simple(image)

        logger.info(f"Image uploaded and processed: {width}x{height}, format: {image.format}")

        return ImageUploadResponse(
            success=True,
            width=width,
            height=height,
            format=image.format,
            pixels=PixelGrid(**pixel_data),
            message=f"Image uploaded and processed: {width}x{height}"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")
```

**Step 6: Test full endpoint**

```bash
cd backend
uv run pytest tests/ -v
```

Expected: All tests pass

**Step 7: Commit pixel extraction**

```bash
git add backend/services/pixel_extraction.py backend/tests/test_pixel_extraction.py backend/routers/images.py
git commit -m "feat: add simple pixel extraction service

- Extract all pixels from uploaded images
- Return as row-major grid of RGB values
- Include in image upload response
- Test suite with pytest"
```

---

## Task 9: Frontend Image Upload Component

**Files:**
- Create: `frontend/src/components/ImageUpload.jsx`
- Modify: `frontend/src/services/api.js`
- Modify: `frontend/src/App.jsx`

**Step 1: Add image API to api.js**

Edit `frontend/src/services/api.js`, add to exports:

```javascript
export const imageApi = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};
```

**Step 2: Create ImageUpload component**

Create `frontend/src/components/ImageUpload.jsx`:

```jsx
import { useState } from 'react';
import { imageApi } from '../services/api';
import useProjectStore from '../stores/projectStore';
import useUIStore from '../stores/uiStore';

function ImageUpload() {
  const [dragActive, setDragActive] = useState(false);
  const { setParsedPixels } = useProjectStore();
  const { setLoading, setError, clearError } = useUIStore();

  const handleFile = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    try {
      clearError();
      setLoading(true, 'Uploading image...');

      const response = await imageApi.uploadImage(file);
      const { pixels } = response.data;

      setParsedPixels(pixels);
      console.log('Image uploaded:', pixels);

    } catch (error) {
      console.error('Upload failed:', error);
      setError(error.response?.data?.detail || 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <form
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />

        <label
          htmlFor="file-upload"
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-10 h-10 mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG up to 10MB (max 200x200px)</p>
          </div>
        </label>
      </form>
    </div>
  );
}

export default ImageUpload;
```

**Step 3: Add ImageUpload to App.jsx**

Edit `frontend/src/App.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { colorApi } from './services/api';
import useProjectStore from './stores/projectStore';
import useInventoryStore from './stores/inventoryStore';
import useUIStore from './stores/uiStore';
import ImageUpload from './components/ImageUpload';

function App() {
  const [perlerColors, setPerlerColors] = useState([]);
  const { parsedPixels } = useProjectStore();
  const { setError, setLoading, error, isLoading, loadingMessage } = useUIStore();

  useEffect(() => {
    const loadColors = async () => {
      try {
        setLoading(true, 'Loading Perler colors...');
        const response = await colorApi.getPerlerColors();
        setPerlerColors(response.data);
        console.log('Loaded Perler colors:', response.data.length);
      } catch (error) {
        console.error('Failed to load Perler colors:', error);
        setError('Failed to load Perler colors');
      } finally {
        setLoading(false);
      }
    };

    loadColors();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">Beadsprite Helper</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading Display */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">{loadingMessage}</p>
          </div>
        )}

        {/* Image Upload */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Pixel Art</h2>
          <ImageUpload />
        </div>

        {/* Parsed Pixels Display */}
        {parsedPixels && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Parsed Image: {parsedPixels.width}x{parsedPixels.height}
            </h2>
            <p className="text-gray-600">
              Total pixels: {parsedPixels.width * parsedPixels.height}
            </p>
          </div>
        )}

        {/* Perler Colors */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Available Colors ({perlerColors.length})
          </h2>
          {perlerColors.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {perlerColors.slice(0, 14).map((color) => (
                <div
                  key={color.id}
                  className="flex flex-col items-center p-2 border rounded"
                >
                  <div
                    className="w-12 h-12 rounded border-2 border-gray-300"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-xs mt-1 text-center">{color.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
```

**Step 4: Test image upload in browser**

```bash
./start-dev.sh
```

Visit http://localhost:5173
- Upload a small pixel art image
- Verify it shows "Parsed Image: WxH"
- Check console for upload logs

**Step 5: Commit frontend image upload**

```bash
git add frontend/src/components/ frontend/src/services/api.js frontend/src/App.jsx
git commit -m "feat: add frontend image upload component

- Drag-and-drop image upload
- File picker fallback
- Display uploaded image dimensions
- Error and loading states
- Integration with Zustand stores"
```

---

## Task 10: Basic Color Mapping Display

**Files:**
- Create: `frontend/src/components/ColorMapping.jsx`
- Create: `frontend/src/utils/colorMapping.js`
- Modify: `frontend/src/App.jsx`

**Step 1: Create color mapping utility**

Create `frontend/src/utils/colorMapping.js`:

```javascript
import { labDistance, rgbDistance } from './colorUtils';

/**
 * Find the closest bead color for a given pixel color
 */
export function findClosestBead(pixelRgb, beadColors, mode = 'lab') {
  if (!beadColors || beadColors.length === 0) {
    return null;
  }

  let closestBead = beadColors[0];
  let minDistance = Infinity;

  for (const bead of beadColors) {
    // Convert hex to RGB for bead
    const beadRgb = hexToRgb(bead.hex);

    let distance;
    if (mode === 'lab') {
      // For LAB mode, we'd need to convert both to LAB first
      // For now, use RGB distance as placeholder
      distance = rgbDistance(pixelRgb, beadRgb);
    } else {
      distance = rgbDistance(pixelRgb, beadRgb);
    }

    if (distance < minDistance) {
      minDistance = distance;
      closestBead = bead;
    }
  }

  return closestBead;
}

/**
 * Convert hex string to RGB object
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Get unique colors from pixel grid
 */
export function getUniqueColors(pixelGrid) {
  const colorMap = new Map();

  for (const row of pixelGrid) {
    for (const pixel of row) {
      const key = `${pixel.r},${pixel.g},${pixel.b}`;
      if (!colorMap.has(key)) {
        colorMap.set(key, pixel);
      }
    }
  }

  return Array.from(colorMap.values());
}

/**
 * Map all pixels to their closest bead colors
 */
export function mapPixelsToBead(parsedPixels, beadColors, mode = 'lab') {
  const uniqueColors = getUniqueColors(parsedPixels.grid);
  const mapping = {};

  for (const pixel of uniqueColors) {
    const key = `${pixel.r},${pixel.g},${pixel.b}`;
    const closestBead = findClosestBead(pixel, beadColors, mode);
    if (closestBead) {
      mapping[key] = closestBead.id;
    }
  }

  return mapping;
}

/**
 * Count beads needed for the design
 */
export function countBeads(parsedPixels, colorMapping) {
  const counts = {};

  for (const row of parsedPixels.grid) {
    for (const pixel of row) {
      const key = `${pixel.r},${pixel.g},${pixel.b}`;
      const beadId = colorMapping[key];

      if (beadId) {
        counts[beadId] = (counts[beadId] || 0) + 1;
      }
    }
  }

  return counts;
}
```

**Step 2: Create ColorMapping component**

Create `frontend/src/components/ColorMapping.jsx`:

```jsx
import { useEffect, useState } from 'react';
import useProjectStore from '../stores/projectStore';
import { mapPixelsToBead, countBeads } from '../utils/colorMapping';

function ColorMapping({ beadColors }) {
  const { parsedPixels } = useProjectStore();
  const [beadCounts, setBeadCounts] = useState({});

  useEffect(() => {
    if (parsedPixels && beadColors.length > 0) {
      // Map pixels to beads
      const mapping = mapPixelsToBead(parsedPixels, beadColors, 'rgb');

      // Count beads needed
      const counts = countBeads(parsedPixels, mapping);
      setBeadCounts(counts);

      console.log('Bead counts:', counts);
    }
  }, [parsedPixels, beadColors]);

  if (!parsedPixels || Object.keys(beadCounts).length === 0) {
    return null;
  }

  // Get bead info for display
  const beadList = Object.entries(beadCounts).map(([beadId, count]) => {
    const bead = beadColors.find(b => b.id === beadId);
    return { ...bead, count };
  }).sort((a, b) => b.count - a.count);

  const totalBeads = Object.values(beadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Bead Count</h2>
      <p className="text-gray-600 mb-4">Total beads needed: {totalBeads}</p>

      <div className="space-y-2">
        {beadList.map((bead) => (
          <div key={bead.id} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center space-x-3">
              <div
                className="w-8 h-8 rounded border-2 border-gray-300"
                style={{ backgroundColor: bead.hex }}
              />
              <span className="font-medium">{bead.name}</span>
            </div>
            <span className="text-gray-600">{bead.count} beads</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ColorMapping;
```

**Step 3: Add ColorMapping to App.jsx**

Edit `frontend/src/App.jsx`, add import:

```jsx
import ColorMapping from './components/ColorMapping';
```

Add before closing `</main>`:

```jsx
        {/* Color Mapping */}
        {parsedPixels && <ColorMapping beadColors={perlerColors} />}
```

**Step 4: Test color mapping**

```bash
./start-dev.sh
```

- Upload a small pixel art image
- Verify bead count appears
- Check that colors are mapped correctly

**Step 5: Commit color mapping**

```bash
git add frontend/src/components/ColorMapping.jsx frontend/src/utils/colorMapping.js frontend/src/App.jsx
git commit -m "feat: add basic color mapping and bead counting

- Map uploaded pixels to closest Perler bead colors
- Display bead count sorted by usage
- Show which colors are needed
- Calculate total beads required"
```

---

## Summary

**These 4 tasks create a minimally functional MVP:**

Tasks 7-10 complete:
- ✅ Upload images via API
- ✅ Extract pixels from images
- ✅ Display uploaded image info
- ✅ Map pixels to bead colors
- ✅ Show bead count

**To test the complete flow:**
1. Run `./start-dev.sh`
2. Visit http://localhost:5173
3. Upload a small pixel art image
4. See the image dimensions
5. See which bead colors are needed and how many

**Next steps for full MVP (Tasks 11-18):**
- Canvas visualization with Konva
- Inventory management UI
- Color substitution preview
- Project save/load
- Grid detection improvements

