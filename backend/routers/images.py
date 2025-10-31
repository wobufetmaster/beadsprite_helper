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
