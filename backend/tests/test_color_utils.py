import pytest
from services.color_utils import rgb_to_lab, lab_to_rgb, rgb_distance, lab_distance

def test_rgb_to_lab_white():
    """Test RGB to LAB conversion for white."""
    r, g, b = 255, 255, 255
    L, a, b_val = rgb_to_lab(r, g, b)

    # White should be L=100, a≈0, b≈0
    assert abs(L - 100.0) < 1.0
    assert abs(a) < 1.0
    assert abs(b_val) < 1.0

def test_rgb_to_lab_black():
    """Test RGB to LAB conversion for black."""
    r, g, b = 0, 0, 0
    L, a, b_val = rgb_to_lab(r, g, b)

    # Black should be L=0, a≈0, b≈0
    assert abs(L) < 1.0
    assert abs(a) < 1.0
    assert abs(b_val) < 1.0

def test_rgb_to_lab_red():
    """Test RGB to LAB conversion for red."""
    r, g, b = 255, 0, 0
    L, a, b_val = rgb_to_lab(r, g, b)

    # Red should have positive 'a' value
    assert L > 0
    assert a > 50  # Red has high positive 'a'

def test_rgb_distance():
    """Test Euclidean distance in RGB space."""
    # Same color
    assert rgb_distance((255, 0, 0), (255, 0, 0)) == 0.0

    # Red to blue - should be large distance
    dist = rgb_distance((255, 0, 0), (0, 0, 255))
    assert dist > 300  # sqrt(255^2 + 255^2)

def test_lab_distance():
    """Test Delta E distance in LAB space."""
    # Same color
    assert lab_distance((50, 0, 0), (50, 0, 0)) == 0.0

    # Different colors - should have non-zero distance
    dist = lab_distance((50, 50, 0), (50, -50, 0))
    assert dist > 0
