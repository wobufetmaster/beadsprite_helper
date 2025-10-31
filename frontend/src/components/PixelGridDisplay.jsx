import { useState, useEffect } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { PERLER_COLORS } from '../data/perlerColors';
import { hexToRgb, calculateRgbDistance } from '../utils/colorUtils';

export default function PixelGridDisplay() {
  const { parsedPixels, gridInfo, colorMapping, updateColorMapping } = useProjectStore(state => ({
    parsedPixels: state.parsedPixels,
    gridInfo: state.gridInfo,
    colorMapping: state.colorMapping,
    updateColorMapping: state.updateColorMapping
  }));

  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showMappedColors, setShowMappedColors] = useState(true);
  const [beadColors, setBeadColors] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [mappingHistory, setMappingHistory] = useState([]);

  // Load bead colors for name lookup
  useEffect(() => {
    setBeadColors(PERLER_COLORS);
  }, []);

  if (!parsedPixels) {
    return null;
  }

  const { width, height, grid } = parsedPixels;

  // Calculate cell size - aim for reasonable display
  const cellSize = Math.max(8, Math.min(24, Math.floor(800 / Math.max(width, height))));

  const handleCellClick = (x, y, color) => {
    setSelectedCell({ x, y, color });
    console.log(`Clicked cell (${x}, ${y}):`, color);
  };

  const handleBeadColorSelect = (beadColorId) => {
    if (!selectedCell) return;

    const originalHex = rgbToHex(selectedCell.color.r, selectedCell.color.g, selectedCell.color.b);

    // Save current mapping to history for undo
    const previousMapping = colorMapping[originalHex];
    setMappingHistory(prev => [...prev, { hex: originalHex, previousBeadId: previousMapping }]);

    updateColorMapping(originalHex, beadColorId);
  };

  const handleUndo = () => {
    if (mappingHistory.length === 0) return;

    // Get the last change
    const lastChange = mappingHistory[mappingHistory.length - 1];

    // Remove it from history
    setMappingHistory(prev => prev.slice(0, -1));

    // Restore previous mapping
    if (lastChange.previousBeadId) {
      updateColorMapping(lastChange.hex, lastChange.previousBeadId);
    } else {
      // If there was no previous mapping, we'd need to remove it
      // For now, we'll just keep it (could enhance this later)
      updateColorMapping(lastChange.hex, lastChange.previousBeadId);
    }
  };

  const handleReset = () => {
    if (!selectedCell) return;

    const originalHex = rgbToHex(selectedCell.color.r, selectedCell.color.g, selectedCell.color.b);

    try {
      // Re-match this specific color using RGB distance (browser-only)
      const imageRgb = hexToRgb(originalHex);
      let closestBead = null;
      let minDistance = Infinity;

      for (const bead of beadColors) {
        const beadRgb = hexToRgb(bead.hex);
        const distance = calculateRgbDistance(imageRgb, beadRgb);

        if (distance < minDistance) {
          minDistance = distance;
          closestBead = bead;
        }
      }

      if (closestBead) {
        // Update to auto-matched color (DON'T add to history - reset is not undoable)
        updateColorMapping(originalHex, closestBead.id);

        // Clear the selection after reset
        setSelectedCell(null);
      }
    } catch (error) {
      console.error('Failed to reset color:', error);
    }
  };

  const handleCellHover = (x, y, color) => {
    setHoveredCell({ x, y, color });
  };

  const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  // Get the display color for a pixel (either original or mapped)
  const getDisplayColor = (pixel) => {
    const originalHex = rgbToHex(pixel.r, pixel.g, pixel.b);

    if (!showMappedColors || Object.keys(colorMapping).length === 0) {
      return { hex: originalHex, beadName: null };
    }

    // Look up mapped bead color
    const beadColorId = colorMapping[originalHex];
    if (beadColorId && beadColors.length > 0) {
      const beadColor = beadColors.find(c => c.id === beadColorId);
      if (beadColor) {
        return { hex: beadColor.hex, beadName: beadColor.name };
      }
    }

    return { hex: originalHex, beadName: null };
  };

  const hasMappedColors = Object.keys(colorMapping).length > 0;

  // Get filtered bead colors for color picker
  const filteredBeadColors = beadColors.filter(color =>
    color.name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="w-full">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <div className="flex gap-6">
          {/* Main grid section */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Pixel Art Grid</h2>
              {hasMappedColors && (
                <button
                  onClick={() => setShowMappedColors(!showMappedColors)}
                  className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  {showMappedColors ? 'Show Original' : 'Show Mapped'}
                </button>
              )}
            </div>

        {/* Grid info */}
        <div className="mb-4 text-sm text-gray-300">
          <span className="font-medium">Grid Size:</span>
          <span className="ml-2 text-gray-400">{width} × {height} pixels</span>
          {gridInfo && (
            <span className="ml-4 text-green-400">
              (Extracted from {gridInfo.cell_width}×{gridInfo.cell_height}px cells)
            </span>
          )}
          {hasMappedColors && showMappedColors && (
            <span className="ml-4 text-blue-400">
              Showing bead colors
            </span>
          )}
        </div>

        {/* Hover info - fixed height to prevent layout shift */}
        <div className="mb-4 h-16">
          {hoveredCell && (() => {
            const originalHex = rgbToHex(hoveredCell.color.r, hoveredCell.color.g, hoveredCell.color.b);
            const { hex: displayHex, beadName } = getDisplayColor(hoveredCell.color);

            return (
              <div className="p-3 bg-gray-700/50 rounded border border-gray-600 text-sm">
                <div className="flex items-center gap-3">
                  {/* Original color swatch */}
                  <div
                    className="w-8 h-8 rounded border-2 border-gray-500"
                    style={{ backgroundColor: originalHex }}
                    title="Original color"
                  />

                  {/* Arrow and mapped color if applicable */}
                  {showMappedColors && beadName && (
                    <>
                      <div className="text-gray-400">→</div>
                      <div
                        className="w-8 h-8 rounded border-2 border-blue-400"
                        style={{ backgroundColor: displayHex }}
                        title={`Mapped to ${beadName}`}
                      />
                    </>
                  )}

                  <div>
                    <div className="text-gray-300">
                      Position: ({hoveredCell.x}, {hoveredCell.y})
                      {beadName && <span className="ml-2 text-blue-400">{beadName}</span>}
                    </div>
                    <div className="text-gray-400">
                      {showMappedColors && beadName ? (
                        <>Original: {originalHex} → Bead: {displayHex}</>
                      ) : (
                        <>RGB: ({hoveredCell.color.r}, {hoveredCell.color.g}, {hoveredCell.color.b}) · {originalHex}</>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Interactive pixel grid */}
        <div className="flex justify-center items-center bg-gray-900/50 rounded p-4 overflow-auto">
          <div
            className="inline-grid gap-0"
            style={{
              gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
            }}
          >
            {grid.map((row, y) =>
              row.map((pixel, x) => {
                const { hex, beadName } = getDisplayColor(pixel);
                const originalHex = rgbToHex(pixel.r, pixel.g, pixel.b);
                const isSelected = selectedCell && selectedCell.x === x && selectedCell.y === y;
                const isHovered = hoveredCell && hoveredCell.x === x && hoveredCell.y === y;

                return (
                  <button
                    key={`${x}-${y}`}
                    className={`
                      border border-gray-700/50 transition-all cursor-pointer
                      hover:border-white hover:z-10 hover:scale-110
                      ${isSelected ? 'ring-2 ring-blue-400 z-20' : ''}
                      ${isHovered ? 'border-white' : ''}
                    `}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      backgroundColor: hex,
                    }}
                    onClick={() => handleCellClick(x, y, pixel)}
                    onMouseEnter={() => handleCellHover(x, y, pixel)}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={beadName ? `${beadName} (${hex})` : `(${x}, ${y}): ${hex}`}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Display info */}
        <div className="mt-4 text-xs text-gray-400 text-center">
          Each square represents one bead. Hover to see color info, click to select.
        </div>

        {/* Selected cell info */}
        {selectedCell && (() => {
          const originalHex = rgbToHex(selectedCell.color.r, selectedCell.color.g, selectedCell.color.b);
          const { hex: displayHex, beadName } = getDisplayColor(selectedCell.color);

          return (
            <div className="mt-4 p-3 bg-blue-900/30 rounded border border-blue-500/50">
              <div className="text-sm text-blue-300 font-medium mb-2">Selected Cell:</div>
              <div className="flex items-center gap-3">
                {/* Original color swatch */}
                <div
                  className="w-12 h-12 rounded border-2 border-gray-400"
                  style={{ backgroundColor: originalHex }}
                  title="Original color"
                />

                {/* Arrow and mapped color if applicable */}
                {showMappedColors && beadName && (
                  <>
                    <div className="text-blue-400 text-lg">→</div>
                    <div
                      className="w-12 h-12 rounded border-2 border-blue-400"
                      style={{ backgroundColor: displayHex }}
                      title={`Mapped to ${beadName}`}
                    />
                  </>
                )}

                <div className="text-sm">
                  <div className="text-gray-300">
                    Position: ({selectedCell.x}, {selectedCell.y})
                    {beadName && <span className="ml-2 text-blue-400 font-medium">{beadName}</span>}
                  </div>
                  <div className="text-gray-400">
                    Original: RGB({selectedCell.color.r}, {selectedCell.color.g}, {selectedCell.color.b}) · {originalHex}
                  </div>
                  {showMappedColors && beadName && (
                    <div className="text-blue-300 mt-1">
                      Bead: {displayHex}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
          </div>

          {/* Color picker side panel */}
          {selectedCell && (
            <div className="w-80 flex-shrink-0">
              <div className="sticky top-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Change Bead Color</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUndo}
                      disabled={mappingHistory.length === 0}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
                      title="Undo last change"
                    >
                      Undo
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                      title="Reset to auto-matched color"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Selected pixel info */}
                {(() => {
                  const originalHex = rgbToHex(selectedCell.color.r, selectedCell.color.g, selectedCell.color.b);
                  const { hex: displayHex, beadName } = getDisplayColor(selectedCell.color);

                  return (
                    <div className="mb-4 p-3 bg-gray-700/50 rounded border border-gray-600">
                      <div className="text-sm text-gray-300 mb-2">Selected pixel color:</div>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded border-2 border-gray-500"
                          style={{ backgroundColor: originalHex }}
                        />
                        <div className="text-sm">
                          <div className="text-white font-medium">{originalHex}</div>
                          {beadName && (
                            <div className="text-blue-400 mt-1">Currently: {beadName}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Search filter */}
                <input
                  type="text"
                  placeholder="Filter colors..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full mb-3 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />

                {/* Color grid */}
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2">
                    {filteredBeadColors.map(color => {
                      const originalHex = rgbToHex(selectedCell.color.r, selectedCell.color.g, selectedCell.color.b);
                      const isCurrentMapping = colorMapping[originalHex] === color.id;

                      return (
                        <button
                          key={color.id}
                          onClick={() => handleBeadColorSelect(color.id)}
                          className={`flex flex-col items-center gap-1 p-2 rounded transition-colors ${
                            isCurrentMapping
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                          title={color.name}
                        >
                          <div
                            className="w-full aspect-square rounded border-2 border-gray-600"
                            style={{ backgroundColor: color.hex }}
                          />
                          <div className="text-xs text-center text-white truncate w-full">
                            {color.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {filteredBeadColors.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      No colors found
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}