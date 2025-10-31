import json
import logging
from pathlib import Path
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
