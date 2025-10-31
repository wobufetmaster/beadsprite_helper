import json
import logging
from pathlib import Path
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.color_utils import rgb_to_lab, hex_to_rgb, rgb_to_hex

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/colors", tags=["colors"])

class BeadColor(BaseModel):
    id: str
    hex: str
    name: str

# Load perler colors on module import
COLORS_FILE = Path(__file__).parent.parent / "data" / "perler_colors.json"

def load_perler_colors() -> List[BeadColor]:
    """Load Perler bead colors from JSON file."""
    try:
        with open(COLORS_FILE, 'r') as f:
            data = json.load(f)
        colors = [BeadColor(**item) for item in data]
        logger.info(f"Loaded {len(colors)} Perler bead colors")
        return colors
    except Exception as e:
        logger.error(f"Failed to load Perler colors: {e}")
        return []

PERLER_COLORS = load_perler_colors()

@router.get("/perler", response_model=List[BeadColor])
async def get_perler_colors():
    """Get all Perler bead colors from database."""
    logger.info(f"Returning {len(PERLER_COLORS)} Perler colors")
    return PERLER_COLORS

@router.get("/perler/{color_id}", response_model=BeadColor)
async def get_perler_color(color_id: str):
    """Get a specific Perler bead color by ID."""
    color = next((c for c in PERLER_COLORS if c.id == color_id), None)
    if not color:
        logger.warning(f"Color not found: {color_id}")
        raise HTTPException(status_code=404, detail=f"Color {color_id} not found")
    logger.info(f"Returning color: {color_id}")
    return color

class RGBColor(BaseModel):
    r: int
    g: int
    b: int

class LABColor(BaseModel):
    L: float
    a: float
    b: float

class ColorConversionRequest(BaseModel):
    hex: str

class ColorConversionResponse(BaseModel):
    hex: str
    rgb: RGBColor
    lab: LABColor

@router.post("/convert", response_model=ColorConversionResponse)
async def convert_color(request: ColorConversionRequest):
    """Convert hex color to RGB and LAB color spaces."""
    try:
        # Parse hex to RGB
        r, g, b = hex_to_rgb(request.hex)

        # Convert RGB to LAB
        L, a, b_val = rgb_to_lab(r, g, b)

        logger.info(f"Converted {request.hex} to RGB({r},{g},{b}) and LAB({L:.2f},{a:.2f},{b_val:.2f})")

        return ColorConversionResponse(
            hex=request.hex,
            rgb=RGBColor(r=r, g=g, b=b),
            lab=LABColor(L=L, a=a, b=b_val)
        )
    except Exception as e:
        logger.error(f"Color conversion failed: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid color format: {str(e)}")
