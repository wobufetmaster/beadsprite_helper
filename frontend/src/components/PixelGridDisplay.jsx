import { useState, useMemo } from 'react';
import { useProjectStore } from '../stores/projectStore';
import usePaletteStore from '../stores/paletteStore';
import useUIStore from '../stores/uiStore';
import { calculateColorDistanceBySpace } from '../utils/colorUtils';
import CanvasPixelGrid from './CanvasPixelGrid';

// Custom styles for scrollbar
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #1f2937;
    border-radius: 5px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 5px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
  .scroll-fade::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 10px;
    height: 40px;
    background: linear-gradient(to bottom, transparent, #374151);
    pointer-events: none;
  }
`;

export default function PixelGridDisplay() {
  const { parsedPixels, gridInfo, colorMapping, updateColorMapping, backgroundMask, removeBackground, toggleBackgroundRemoval, colorMatchMode, updateSettings } = useProjectStore(state => ({
    parsedPixels: state.parsedPixels,
    gridInfo: state.gridInfo,
    colorMapping: state.colorMapping,
    updateColorMapping: state.updateColorMapping,
    backgroundMask: state.backgroundMask,
    removeBackground: state.removeBackground,
    toggleBackgroundRemoval: state.toggleBackgroundRemoval,
    colorMatchMode: state.settings.colorMatchMode,
    updateSettings: state.updateSettings
  }));

  const { getAllPalettes, selectedPalettes, isPaletteSelected, togglePalette } = usePaletteStore(state => ({
    getAllPalettes: state.getAllPalettes,
    selectedPalettes: state.selectedPalettes,
    isPaletteSelected: state.isPaletteSelected,
    togglePalette: state.togglePalette
  }));

  const { isMirrored, toggleMirror } = useUIStore(state => ({
    isMirrored: state.isMirrored,
    toggleMirror: state.toggleMirror
  }));

  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showMappedColors, setShowMappedColors] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [mappingHistory, setMappingHistory] = useState([]);

  // Pegboard grid state
  const [showPegboardGrid, setShowPegboardGrid] = useState(false);
  const [pegboardSize, setPegboardSize] = useState(29);

  // Bead display mode
  const [beadShape, setBeadShape] = useState('square'); // 'square' or 'circle'

  // Get bead colors from selected palettes
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

  // Calculate content dimensions (excluding background if enabled)
  const contentDimensions = useMemo(() => {
    if (!parsedPixels) return null;

    const { width, height } = parsedPixels;

    // If no background removal, use full dimensions
    if (!backgroundMask || !removeBackground) {
      return { width, height, offsetX: 0, offsetY: 0 };
    }

    // Find bounding box of non-background pixels
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let hasContent = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!backgroundMask[y] || !backgroundMask[y][x]) {
          // This is a non-background pixel
          hasContent = true;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (!hasContent) {
      return { width, height, offsetX: 0, offsetY: 0 };
    }

    return {
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      offsetX: minX,
      offsetY: minY
    };
  }, [parsedPixels, backgroundMask, removeBackground]);

  if (!parsedPixels) {
    return null;
  }

  const { width, height, grid } = parsedPixels;

  // Calculate cell size - aim for reasonable display
  const cellSize = Math.max(8, Math.min(24, Math.floor(800 / Math.max(width, height))));

  const handleCellClick = (x, y, color) => {
    setSelectedCell({ x, y, color });
  };

  const handleBeadColorSelect = (beadColorId) => {
    if (!selectedCell) return;

    const imageColorHex = rgbToHex(selectedCell.color.r, selectedCell.color.g, selectedCell.color.b);

    // Save current mapping to history for undo
    const previousMapping = colorMapping[imageColorHex];
    setMappingHistory(prev => [...prev, { hex: imageColorHex, previousBeadId: previousMapping }]);

    updateColorMapping(imageColorHex, beadColorId);
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

  const handleResetAll = () => {
    if (!parsedPixels || beadColors.length === 0) return;

    try {
      // Extract all unique colors from the pixel grid
      const colorSet = new Set();
      parsedPixels.grid.forEach(row => {
        row.forEach(pixel => {
          const hex = rgbToHex(pixel.r, pixel.g, pixel.b);
          colorSet.add(hex);
        });
      });

      // Re-match all colors using RGB distance
      const uniqueColors = Array.from(colorSet);
      console.log(`Resetting ${uniqueColors.length} colors to auto-matched values...`);

      uniqueColors.forEach(imageColorHex => {
        let closestBead = null;
        let minDistance = Infinity;

        for (const bead of beadColors) {
          const distance = calculateColorDistanceBySpace(imageColorHex, bead.hex, colorMatchMode);

          if (distance < minDistance) {
            minDistance = distance;
            closestBead = bead;
          }
        }

        if (closestBead) {
          updateColorMapping(imageColorHex, closestBead.id);
        }
      });

      // Clear undo history since we just reset everything
      setMappingHistory([]);

      // Don't close color picker - user might want to continue editing

      console.log('All colors reset to auto-matched values');
    } catch (error) {
      console.error('Failed to reset colors:', error);
    }
  };

  const handleClearPixel = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!selectedCell) return;

    const imageColorHex = rgbToHex(selectedCell.color.r, selectedCell.color.g, selectedCell.color.b);

    try {
      // Re-match just this specific color
      let closestBead = null;
      let minDistance = Infinity;

      for (const bead of beadColors) {
        const distance = calculateColorDistanceBySpace(imageColorHex, bead.hex, colorMatchMode);

        if (distance < minDistance) {
          minDistance = distance;
          closestBead = bead;
        }
      }

      if (closestBead) {
        updateColorMapping(imageColorHex, closestBead.id);
        // Side panel stays open for further adjustments
      }
    } catch (error) {
      console.error('Failed to clear pixel color:', error);
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

  // Format bead color code (just return as-is)
  const formatBeadCode = (code) => {
    if (!code) return '';
    return code;
  };

  // Format bead display name with code
  const formatBeadName = (color) => {
    if (!color) return '';
    const formattedCode = formatBeadCode(color.code);
    return formattedCode ? `${formattedCode} - ${color.name}` : color.name;
  };

  // Get the display color for a pixel (either original or mapped)
  const getDisplayColor = (pixel) => {
    const pixelHex = rgbToHex(pixel.r, pixel.g, pixel.b);

    if (!showMappedColors || Object.keys(colorMapping).length === 0) {
      return { hex: pixelHex, beadName: null, beadCode: null };
    }

    // Look up mapped bead color
    const beadColorId = colorMapping[pixelHex];
    if (beadColorId && beadColors.length > 0) {
      const beadColor = beadColors.find(c => c.id === beadColorId);
      if (beadColor) {
        return { hex: beadColor.hex, beadName: beadColor.name, beadCode: beadColor.code };
      }
    }

    return { hex: pixelHex, beadName: null, beadCode: null };
  };

  const hasMappedColors = Object.keys(colorMapping).length > 0;

  // Get filtered bead colors for color picker - search by name or code
  const filteredBeadColors = beadColors.filter(color =>
    color.name.toLowerCase().includes(filterText.toLowerCase()) ||
    (color.code && color.code.toLowerCase().includes(filterText.toLowerCase()))
  );

  return (
    <div className="w-full">
      <style>{scrollbarStyles}</style>
      <div className="bg-gray-800 rounded-lg shadow-lg p-3 sm:p-6 border border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Main grid section */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
              <h2 className="text-lg font-semibold text-white">Pixel Art Grid</h2>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                {/* Color Space Toggle */}
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 bg-gray-700 rounded text-xs sm:text-sm">
                  <span className="hidden sm:inline text-xs text-gray-400">Color Matching:</span>
                  <div className="flex bg-gray-800 rounded">
                    <button
                      onClick={() => updateSettings({ colorMatchMode: 'rgb' })}
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded transition-colors ${
                        colorMatchMode === 'rgb'
                          ? 'bg-orange-600 text-white'
                          : 'bg-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      RGB
                    </button>
                    <button
                      onClick={() => updateSettings({ colorMatchMode: 'lab' })}
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded transition-colors ${
                        colorMatchMode === 'lab'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      LAB
                    </button>
                  </div>
                </div>
                {hasMappedColors && (
                  <button
                    onClick={() => setShowMappedColors(!showMappedColors)}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors whitespace-nowrap"
                  >
                    {showMappedColors ? 'Show Original' : 'Show Mapped'}
                  </button>
                )}
                {backgroundMask && (
                  <button
                    onClick={toggleBackgroundRemoval}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors whitespace-nowrap ${
                      removeBackground
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                    title="Toggle background removal"
                  >
                    <span className="hidden sm:inline">{removeBackground ? 'Background: Hidden' : 'Background: Shown'}</span>
                    <span className="sm:hidden">{removeBackground ? 'BG: Hidden' : 'BG: Shown'}</span>
                  </button>
                )}
                <button
                  onClick={() => setBeadShape(beadShape === 'square' ? 'circle' : 'square')}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors whitespace-nowrap ${
                    beadShape === 'circle'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                  title="Toggle between square pixels and circular beads"
                >
                  {beadShape === 'circle' ? '● Beads' : '■ Pixels'}
                </button>
                <button
                  onClick={() => setShowPegboardGrid(!showPegboardGrid)}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors whitespace-nowrap ${
                    showPegboardGrid
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                  title="Toggle pegboard grid overlay"
                >
                  <span className="hidden sm:inline">Pegboard Grid</span>
                  <span className="sm:hidden">Pegboard</span>
                </button>
                <button
                  onClick={toggleMirror}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors whitespace-nowrap ${
                    isMirrored
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                  title="Mirror horizontally (flip for ironing B-side)"
                >
                  <span className="hidden sm:inline">{isMirrored ? '↔ Mirrored' : '↔ Mirror'}</span>
                  <span className="sm:hidden">{isMirrored ? '↔ Flip' : '↔'}</span>
                </button>
              </div>
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

        {/* Pegboard grid controls */}
        {showPegboardGrid && (
          <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-900/20 rounded border border-blue-500/30">
            <div className="mb-2 sm:mb-3">
              <label className="block text-sm font-medium text-blue-300 mb-2">
                Pegboard Size:
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setPegboardSize(29)}
                    className={`flex-1 sm:flex-none px-3 py-1.5 text-sm rounded transition-colors ${
                      pegboardSize === 29
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    29×29
                  </button>
                  <button
                    onClick={() => setPegboardSize(50)}
                    className={`flex-1 sm:flex-none px-3 py-1.5 text-sm rounded transition-colors ${
                      pegboardSize === 50
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    50×50
                  </button>
                  <button
                    onClick={() => setPegboardSize(57)}
                    className={`flex-1 sm:flex-none px-3 py-1.5 text-sm rounded transition-colors ${
                      pegboardSize === 57
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    57×57
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 whitespace-nowrap">Custom:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPegboardSize(Math.max(10, pegboardSize - 1))}
                      className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-lg"
                      aria-label="Decrease size"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={pegboardSize}
                      onChange={(e) => setPegboardSize(parseInt(e.target.value) || 29)}
                      className="w-16 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm text-center focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => setPegboardSize(Math.min(100, pegboardSize + 1))}
                      className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-lg"
                      aria-label="Increase size"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-sm text-blue-200">
              <span className="font-medium">Boards needed:</span>
              <span className="ml-2 text-white">
                {Math.ceil(contentDimensions.width / pegboardSize)} × {Math.ceil(contentDimensions.height / pegboardSize)} = {Math.ceil(contentDimensions.width / pegboardSize) * Math.ceil(contentDimensions.height / pegboardSize)} boards
              </span>
              <span className="ml-3 text-gray-400">
                ({pegboardSize}×{pegboardSize} beads per board)
              </span>
              {removeBackground && backgroundMask && (contentDimensions.width !== width || contentDimensions.height !== height) && (
                <div className="mt-2 text-xs text-blue-300">
                  Content area: {contentDimensions.width}×{contentDimensions.height} (background excluded)
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Interactive pixel grid - Canvas-based for performance */}
        <CanvasPixelGrid
          grid={grid}
          width={width}
          height={height}
          cellSize={cellSize}
          colorMapping={colorMapping}
          beadColors={beadColors}
          showMappedColors={showMappedColors}
          beadShape={beadShape}
          showPegboardGrid={showPegboardGrid}
          pegboardSize={pegboardSize}
          contentDimensions={contentDimensions}
          backgroundMask={backgroundMask}
          removeBackground={removeBackground}
          selectedCell={selectedCell}
          hoveredCell={hoveredCell}
          isMirrored={isMirrored}
          onCellClick={handleCellClick}
          onCellHover={handleCellHover}
          onCellLeave={() => setHoveredCell(null)}
        />

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
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Change Bead Color</h3>
                  <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                    <button
                      onClick={handleUndo}
                      disabled={mappingHistory.length === 0}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
                      title="Undo last change"
                    >
                      Undo
                    </button>
                    <button
                      onClick={(e) => handleClearPixel(e)}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                      title="Reset this pixel to auto-matched color"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleResetAll}
                      className="px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors whitespace-nowrap"
                      title="Reset ALL colors to auto-matched values"
                    >
                      Reset All
                    </button>
                  </div>
                </div>

                {/* Palette Selector */}
                <div className="mb-4 p-3 bg-gray-700/50 rounded border border-gray-600">
                  <div className="text-sm text-gray-300 mb-2">Bead Palettes:</div>
                  <div className="flex flex-wrap gap-2">
                    {getAllPalettes().map(palette => (
                      <button
                        key={palette.id}
                        onClick={() => togglePalette(palette.id)}
                        className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                          isPaletteSelected(palette.id)
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                        }`}
                      >
                        {palette.name}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    {beadColors.length} colors available
                  </div>
                </div>

                {/* Selected pixel info */}
                {(() => {
                  const selectedHex = rgbToHex(selectedCell.color.r, selectedCell.color.g, selectedCell.color.b);
                  const { beadName, beadCode } = getDisplayColor(selectedCell.color);

                  return (
                    <div className="mb-4 p-3 bg-gray-700/50 rounded border border-gray-600">
                      <div className="text-sm text-gray-300 mb-2">Selected pixel color:</div>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded border-2 border-gray-500"
                          style={{ backgroundColor: selectedHex }}
                        />
                        <div className="text-sm">
                          <div className="text-white font-medium">{selectedHex}</div>
                          {beadName && (
                            <div className="text-blue-400 mt-1">
                              Currently: {beadCode ? `${beadCode} - ${beadName}` : beadName}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Search filter */}
                <input
                  type="text"
                  placeholder="Filter colors by name or code..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full mb-3 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />

                {/* Scroll hint */}
                {filteredBeadColors.length > 6 && (
                  <div className="text-xs text-gray-400 italic mb-2 text-center">
                    Scroll for more colors ↓
                  </div>
                )}

                {/* Color grid */}
                <div className="relative scroll-fade">
                  <div className="max-h-96 overflow-y-auto custom-scrollbar pr-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                            {formatBeadName(color)}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}