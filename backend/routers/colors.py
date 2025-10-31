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

class ColorMatchRequest(BaseModel):
    colors: List[str]  # List of hex colors from image
    method: str = "lab"  # "lab" or "rgb"
    available_colors: List[str] = []  # Optional: filter to only these bead color IDs

class ColorMatch(BaseModel):
    image_color: str  # Hex color from image
    bead_color_id: str  # Matched bead color ID
    bead_color_hex: str  # Hex color of matched bead
    bead_color_name: str  # Name of matched bead color
    distance: float  # Distance metric

class ColorMatchResponse(BaseModel):
    matches: List[ColorMatch]
    method: str

@router.post("/match", response_model=ColorMatchResponse)
async def match_colors(request: ColorMatchRequest):
    """Match image colors to closest available Perler bead colors."""
    from services.color_utils import rgb_distance, lab_distance, is_neutral_color, color_saturation

    try:
        # Filter available colors if specified
        available_perler_colors = PERLER_COLORS
        if request.available_colors:
            available_perler_colors = [
                c for c in PERLER_COLORS
                if c.id in request.available_colors
            ]
            logger.info(f"Filtering to {len(available_perler_colors)} available bead colors")

        if not available_perler_colors:
            raise HTTPException(status_code=400, detail="No available bead colors to match against")

        matches = []

        for image_hex in request.colors:
            # Parse image color
            img_r, img_g, img_b = hex_to_rgb(image_hex)
            img_is_neutral = is_neutral_color(img_r, img_g, img_b)

            # Find closest bead color
            best_match = None
            best_distance = float('inf')

            for bead_color in available_perler_colors:
                bead_r, bead_g, bead_b = hex_to_rgb(bead_color.hex)

                if request.method == "lab":
                    # Use LAB distance (perceptually uniform)
                    img_lab = rgb_to_lab(img_r, img_g, img_b)
                    bead_lab = rgb_to_lab(bead_r, bead_g, bead_b)
                    distance = lab_distance(img_lab, bead_lab)
                else:
                    # Use RGB Euclidean distance
                    distance = rgb_distance((img_r, img_g, img_b), (bead_r, bead_g, bead_b))

                # Apply neutrality penalty: if image color is neutral (grayscale),
                # penalize colored bead matches to prefer neutral beads
                if img_is_neutral:
                    bead_saturation = color_saturation(bead_r, bead_g, bead_b)
                    # Penalty scales with bead saturation (0 for neutral beads, up to 50 for saturated beads)
                    saturation_penalty = bead_saturation * 50
                    distance += saturation_penalty

                if distance < best_distance:
                    best_distance = distance
                    best_match = bead_color

            if best_match:
                matches.append(ColorMatch(
                    image_color=image_hex,
                    bead_color_id=best_match.id,
                    bead_color_hex=best_match.hex,
                    bead_color_name=best_match.name,
                    distance=best_distance
                ))

        logger.info(f"Matched {len(matches)} colors using {request.method} method")

        return ColorMatchResponse(
            matches=matches,
            method=request.method
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Color matching failed: {e}")
        raise HTTPException(status_code=500, detail=f"Color matching failed: {str(e)}")
