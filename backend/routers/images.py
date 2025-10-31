import logging
import io
from typing import List, Dict, Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from pydantic import BaseModel
from PIL import Image
import base64
from services.pixel_extraction import extract_pixels_simple
from services.grid_detection import detect_grid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/images", tags=["images"])

class PixelGrid(BaseModel):
    width: int
    height: int
    grid: List[List[Dict[str, int]]]

class GridInfo(BaseModel):
    cell_width: int
    cell_height: int
    grid_cols: int
    grid_rows: int
    confidence: float

class ImageUploadResponse(BaseModel):
    success: bool
    width: int
    height: int
    format: str
    pixels: PixelGrid
    grid: GridInfo | None = None
    message: str

@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    manual_cell_width: Optional[int] = Form(None),
    manual_cell_height: Optional[int] = Form(None),
    manual_offset_x: Optional[int] = Form(None),
    manual_offset_y: Optional[int] = Form(None)
):
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

        # Check dimensions (max 2000x2000 for beadsprite projects)
        width, height = image.size
        if width > 2000 or height > 2000:
            logger.warning(f"Image too large: {width}x{height}")
            raise HTTPException(
                status_code=400,
                detail=f"Image too large ({width}x{height}). Maximum 2000x2000 pixels."
            )

        # Save format before any image manipulation (crop can lose this)
        image_format = image.format or "PNG"

        logger.info(f"Image uploaded: {width}x{height}, format: {image_format}")

        # Check if manual grid parameters provided
        if manual_cell_width and manual_cell_height:
            # Use manual grid parameters
            grid_info = {
                'cell_width': manual_cell_width,
                'cell_height': manual_cell_height,
                'grid_cols': (width - (manual_offset_x or 0)) // manual_cell_width,
                'grid_rows': (height - (manual_offset_y or 0)) // manual_cell_height,
                'confidence': 1.0  # Manual = 100% confidence
            }

            # Apply offset if provided
            if manual_offset_x or manual_offset_y:
                offset_x = manual_offset_x or 0
                offset_y = manual_offset_y or 0
                image = image.crop((offset_x, offset_y, width, height))
                logger.info(f"Applied offset: ({offset_x}, {offset_y})")

            logger.info(f"Using manual grid: {grid_info['grid_cols']}x{grid_info['grid_rows']} cells of {manual_cell_width}x{manual_cell_height}px")
        else:
            # Attempt automatic grid detection
            grid_info = detect_grid(image)

        # Extract pixels - use grid-based extraction if grid detected
        if grid_info:
            from services.pixel_extraction import extract_pixels_from_grid
            pixel_data = extract_pixels_from_grid(image, grid_info)
            logger.info(f"Using grid-based extraction: {pixel_data['width']}x{pixel_data['height']} cells")
        else:
            pixel_data = extract_pixels_simple(image)
            logger.info(f"Using simple extraction: {pixel_data['width']}x{pixel_data['height']} pixels")

        return ImageUploadResponse(
            success=True,
            width=width,
            height=height,
            format=image_format,
            pixels=PixelGrid(**pixel_data),
            grid=GridInfo(**grid_info) if grid_info else None,
            message=f"Image uploaded successfully: {width}x{height}"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")
