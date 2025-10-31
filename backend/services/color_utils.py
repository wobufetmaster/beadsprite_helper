import numpy as np
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

def rgb_to_xyz(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """Convert RGB to XYZ color space (intermediate for LAB)."""
    # Normalize RGB to 0-1
    r_norm = r / 255.0
    g_norm = g / 255.0
    b_norm = b / 255.0

    # Apply gamma correction
    def gamma_correct(val):
        if val > 0.04045:
            return ((val + 0.055) / 1.055) ** 2.4
        else:
            return val / 12.92

    r_linear = gamma_correct(r_norm)
    g_linear = gamma_correct(g_norm)
    b_linear = gamma_correct(b_norm)

    # Convert to XYZ using sRGB matrix
    x = r_linear * 0.4124564 + g_linear * 0.3575761 + b_linear * 0.1804375
    y = r_linear * 0.2126729 + g_linear * 0.7151522 + b_linear * 0.0721750
    z = r_linear * 0.0193339 + g_linear * 0.1191920 + b_linear * 0.9503041

    return x, y, z

def xyz_to_lab(x: float, y: float, z: float) -> Tuple[float, float, float]:
    """Convert XYZ to LAB color space."""
    # D65 standard illuminant
    x_n = 0.95047
    y_n = 1.00000
    z_n = 1.08883

    # Normalize by reference white
    x_norm = x / x_n
    y_norm = y / y_n
    z_norm = z / z_n

    # Apply LAB transformation function
    def f(t):
        delta = 6/29
        if t > delta ** 3:
            return t ** (1/3)
        else:
            return t / (3 * delta ** 2) + 4/29

    fx = f(x_norm)
    fy = f(y_norm)
    fz = f(z_norm)

    L = 116 * fy - 16
    a = 500 * (fx - fy)
    b = 200 * (fy - fz)

    return L, a, b

def rgb_to_lab(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """Convert RGB (0-255) to LAB color space."""
    x, y, z = rgb_to_xyz(r, g, b)
    return xyz_to_lab(x, y, z)

def lab_to_xyz(L: float, a: float, b: float) -> Tuple[float, float, float]:
    """Convert LAB to XYZ color space."""
    # D65 standard illuminant
    x_n = 0.95047
    y_n = 1.00000
    z_n = 1.08883

    fy = (L + 16) / 116
    fx = a / 500 + fy
    fz = fy - b / 200

    # Apply inverse transformation
    def f_inv(t):
        delta = 6/29
        if t > delta:
            return t ** 3
        else:
            return 3 * delta ** 2 * (t - 4/29)

    x = x_n * f_inv(fx)
    y = y_n * f_inv(fy)
    z = z_n * f_inv(fz)

    return x, y, z

def xyz_to_rgb(x: float, y: float, z: float) -> Tuple[int, int, int]:
    """Convert XYZ to RGB (0-255)."""
    # Convert XYZ to linear RGB
    r_linear = x * 3.2404542 + y * -1.5371385 + z * -0.4985314
    g_linear = x * -0.9692660 + y * 1.8760108 + z * 0.0415560
    b_linear = x * 0.0556434 + y * -0.2040259 + z * 1.0572252

    # Apply inverse gamma correction
    def gamma_inv(val):
        if val > 0.0031308:
            return 1.055 * (val ** (1/2.4)) - 0.055
        else:
            return 12.92 * val

    r_norm = gamma_inv(r_linear)
    g_norm = gamma_inv(g_linear)
    b_norm = gamma_inv(b_linear)

    # Convert to 0-255 range and clamp
    r = max(0, min(255, int(round(r_norm * 255))))
    g = max(0, min(255, int(round(g_norm * 255))))
    b = max(0, min(255, int(round(b_norm * 255))))

    return r, g, b

def lab_to_rgb(L: float, a: float, b: float) -> Tuple[int, int, int]:
    """Convert LAB to RGB (0-255)."""
    x, y, z = lab_to_xyz(L, a, b)
    return xyz_to_rgb(x, y, z)

def rgb_distance(rgb1: Tuple[int, int, int], rgb2: Tuple[int, int, int]) -> float:
    """Calculate Euclidean distance between two RGB colors."""
    r1, g1, b1 = rgb1
    r2, g2, b2 = rgb2
    return np.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)

def lab_distance(lab1: Tuple[float, float, float], lab2: Tuple[float, float, float]) -> float:
    """Calculate Delta E (CIE76) distance between two LAB colors."""
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    return np.sqrt((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2)

def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color string to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def rgb_to_hex(r: int, g: int, b: int) -> str:
    """Convert RGB tuple to hex color string."""
    return f"#{r:02x}{g:02x}{b:02x}"
