import { useState, useEffect, useMemo } from 'react';
import { useProjectStore } from '../stores/projectStore';
import useInventoryStore from '../stores/inventoryStore';
import usePaletteStore from '../stores/paletteStore';
import { calculateColorDistanceBySpace } from '../utils/colorUtils';

export default function ColorPalette() {
  const { parsedPixels, updateColorMapping, colorMatchMode } = useProjectStore(state => ({
    parsedPixels: state.parsedPixels,
    updateColorMapping: state.updateColorMapping,
    colorMatchMode: state.settings.colorMatchMode
  }));

  const { ownedColors } = useInventoryStore(state => ({
    ownedColors: state.ownedColors
  }));

  const { getAllPalettes, selectedPalettes } = usePaletteStore(state => ({
    getAllPalettes: state.getAllPalettes,
    selectedPalettes: state.selectedPalettes
  }));

  // Compute available colors directly from selected palettes
  const beadColors = useMemo(() => {
    const allPalettes = getAllPalettes();
    const colors = [];
    selectedPalettes.forEach(paletteId => {
      const palette = allPalettes.find(p => p.id === paletteId);
      if (palette) {
        colors.push(...palette.colors);
      }
    });
    return colors;
  }, [selectedPalettes, getAllPalettes]);
  const [uniqueColors, setUniqueColors] = useState([]);
  const [colorMatches, setColorMatches] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract unique colors from parsed pixels
  useEffect(() => {
    if (!parsedPixels) return;

    const colorSet = new Set();
    parsedPixels.grid.forEach(row => {
      row.forEach(pixel => {
        const hex = rgbToHex(pixel.r, pixel.g, pixel.b);
        colorSet.add(hex);
      });
    });

    const colors = Array.from(colorSet);
    setUniqueColors(colors);

    // Auto-match colors if we don't have matches yet
    if (colors.length > 0 && Object.keys(colorMatches).length === 0 && beadColors.length > 0) {
      matchColors(colors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedPixels, beadColors]);

  // Re-match when palette selection changes
  useEffect(() => {
    if (uniqueColors.length > 0 && beadColors.length > 0) {
      matchColors(uniqueColors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPalettes]);

  // Re-match when color match mode changes
  useEffect(() => {
    if (uniqueColors.length > 0 && beadColors.length > 0) {
      matchColors(uniqueColors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorMatchMode]);

  // Match colors locally (browser-only)
  const matchColors = (colors) => {
    if (colors.length === 0 || beadColors.length === 0) return;

    setIsLoading(true);
    try {
      // Get available bead colors (filter by inventory if user has owned colors set)
      const availableBeads = ownedColors.length > 0
        ? beadColors.filter(bead => ownedColors.some(owned => owned.id === bead.id))
        : beadColors;

      // Build matches object and update color mapping
      const matches = {};

      colors.forEach(imageColorHex => {
        // Find closest bead for this image color using selected color space
        let closestBead = null;
        let minDistance = Infinity;

        for (const bead of availableBeads) {
          const distance = calculateColorDistanceBySpace(imageColorHex, bead.hex, colorMatchMode);

          if (distance < minDistance) {
            minDistance = distance;
            closestBead = bead;
          }
        }

        if (closestBead) {
          matches[imageColorHex] = {
            beadColorId: closestBead.id,
            beadColorHex: closestBead.hex,
            beadColorName: closestBead.name,
            beadColorCode: closestBead.code,
            distance: minDistance
          };

          // Update the store's color mapping
          updateColorMapping(imageColorHex, closestBead.id);
        }
      });

      setColorMatches(matches);
    } catch (error) {
      console.error('Failed to match colors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual color remapping
  const handleColorClick = (imageColor) => {
    setSelectedColor(imageColor);
    setShowColorPicker(true);
  };

  const handleBeadColorSelect = (beadColorId, beadColorHex, beadColorName, beadColorCode) => {
    if (!selectedColor) return;

    // Update the color match
    setColorMatches(prev => ({
      ...prev,
      [selectedColor]: {
        beadColorId,
        beadColorHex,
        beadColorName,
        beadColorCode,
        distance: 0 // Manual selection
      }
    }));

    // Update the store
    updateColorMapping(selectedColor, beadColorId);

    // Close picker
    setShowColorPicker(false);
    setSelectedColor(null);
  };

  // Count pixels per color
  const getColorCount = (hex) => {
    if (!parsedPixels) return 0;
    let count = 0;
    parsedPixels.grid.forEach(row => {
      row.forEach(pixel => {
        const pixelHex = rgbToHex(pixel.r, pixel.g, pixel.b);
        if (pixelHex === hex) count++;
      });
    });
    return count;
  };

  if (!parsedPixels) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="w-full bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-white">Color Palette</h2>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isExpanded && (
          <div className="px-6 pb-6">
            <div className="text-center text-gray-400 py-8">
              Matching colors to beads...
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Color Palette</h2>
          <div className="text-sm text-gray-400">
            {uniqueColors.length} unique colors
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          {/* Color matches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {uniqueColors.map(imageColor => {
          const match = colorMatches[imageColor];
          const count = getColorCount(imageColor);
          const percentage = ((count / (parsedPixels.width * parsedPixels.height)) * 100).toFixed(1);

          return (
            <div
              key={imageColor}
              className="flex flex-col gap-2 p-2 sm:p-3 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => handleColorClick(imageColor)}
            >
              {/* Color swatches */}
              <div className="flex items-center gap-2">
                {/* Image color swatch */}
                <div
                  className="w-12 h-12 rounded border-2 border-gray-600 flex-shrink-0"
                  style={{ backgroundColor: imageColor }}
                  title={imageColor}
                />

                {/* Arrow */}
                <div className="text-gray-400 text-lg">→</div>

                {/* Bead color swatch */}
                {match ? (
                  <div
                    className="w-12 h-12 rounded border-2 border-gray-600 flex-shrink-0"
                    style={{ backgroundColor: match.beadColorHex }}
                    title={match.beadColorName}
                  />
                ) : (
                  <div className="w-12 h-12 rounded border-2 border-gray-600 flex-shrink-0 bg-gray-600" />
                )}
              </div>

              {/* Color info */}
              <div className="min-w-0">
                <div className="text-xs text-gray-400 mb-1">
                  {imageColor} → {match ? match.beadColorHex : 'No match'}
                </div>
                <div className="text-sm font-medium text-white truncate">
                  {match ? (match.beadColorCode ? `${formatBeadCode(match.beadColorCode)} - ${match.beadColorName}` : match.beadColorName) : 'No match'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {count} beads ({percentage}%)
                  {match && match.distance > 0 && (
                    <span className="ml-2 text-gray-500">
                      Δ {match.distance.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
          </div>
        </div>
      )}

      {/* Color picker modal */}
      {showColorPicker && selectedColor && (
        <ColorPickerModal
          imageColor={selectedColor}
          currentMatch={colorMatches[selectedColor]}
          onSelect={handleBeadColorSelect}
          onClose={() => {
            setShowColorPicker(false);
            setSelectedColor(null);
          }}
        />
      )}
    </div>
  );
}

// Color picker modal component
function ColorPickerModal({ imageColor, currentMatch, onSelect, onClose }) {
  const [filter, setFilter] = useState('');

  // Get current bead colors from palette store - subscribe to selectedPalettes to trigger re-render
  const { selectedPalettes, getAllPalettes } = usePaletteStore(state => ({
    selectedPalettes: state.selectedPalettes,
    getAllPalettes: state.getAllPalettes
  }));

  // Compute available colors directly from selected palettes
  const beadColors = useMemo(() => {
    const allPalettes = getAllPalettes();
    const colors = [];
    selectedPalettes.forEach(paletteId => {
      const palette = allPalettes.find(p => p.id === paletteId);
      if (palette) {
        colors.push(...palette.colors);
      }
    });
    return colors;
  }, [selectedPalettes, getAllPalettes]);

  // Filter bead colors by name or code
  const filteredColors = beadColors.filter(color =>
    color.name.toLowerCase().includes(filter.toLowerCase()) ||
    (color.code && color.code.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Select Bead Color</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Image color display */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded border-2 border-gray-600"
              style={{ backgroundColor: imageColor }}
            />
            <div>
              <div className="text-sm font-medium text-gray-300">Image Color</div>
              <div className="text-xs text-gray-500">{imageColor}</div>
            </div>
          </div>

          {/* Search filter */}
          <input
            type="text"
            placeholder="Filter colors by name or code..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mt-3 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Color grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {filteredColors.map(color => (
              <button
                key={color.id}
                onClick={() => onSelect(color.id, color.hex, color.name, color.code)}
                className={`flex flex-col items-center gap-2 p-3 rounded transition-colors ${
                  currentMatch?.beadColorId === color.id
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div
                  className="w-full aspect-square rounded border-2 border-gray-600"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="text-xs text-center text-white truncate w-full">
                  {formatBeadName(color)}
                </div>
                {color.quantity !== undefined && (
                  <div className="text-xs text-gray-400">
                    {color.quantity > 0 ? `${color.quantity} in stock` : 'Out of stock'}
                  </div>
                )}
              </button>
            ))}
          </div>

          {filteredColors.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No colors found matching "{filter}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Format bead color code (just return as-is)
function formatBeadCode(code) {
  if (!code) return '';
  return code;
}

// Format bead display name with code
function formatBeadName(color) {
  if (!color) return '';
  const formattedCode = formatBeadCode(color.code);
  return formattedCode ? `${formattedCode} - ${color.name}` : color.name;
}
