import logging
import io
from typing import List, Dict
from fastapi import APIRouter, File, UploadFile, HTTPException
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

        # Check dimensions (max 2000x2000 for beadsprite projects)
        width, height = image.size
        if width > 2000 or height > 2000:
            logger.warning(f"Image too large: {width}x{height}")
            raise HTTPException(
                status_code=400,
                detail=f"Image too large ({width}x{height}). Maximum 2000x2000 pixels."
            )

        logger.info(f"Image uploaded: {width}x{height}, format: {image.format}")

        # Extract pixels
        pixel_data = extract_pixels_simple(image)

        # Attempt grid detection
        grid_info = detect_grid(image)

        return ImageUploadResponse(
            success=True,
            width=width,
            height=height,
            format=image.format,
            pixels=PixelGrid(**pixel_data),
            grid=GridInfo(**grid_info) if grid_info else None,
            message=f"Image uploaded successfully: {width}x{height}"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")
