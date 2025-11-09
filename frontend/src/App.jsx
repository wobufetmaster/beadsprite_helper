import { useState, useEffect, useMemo } from 'react';
import useProjectStore from './stores/projectStore';
import usePaletteStore from './stores/paletteStore';
import ImageUploadZone from './components/ImageUploadZone';
import ImageDisplay from './components/ImageDisplay';
import GridAdjustmentControls from './components/GridAdjustmentControls';
import PixelGridDisplay from './components/PixelGridDisplay';
import ColorMappingDisplay from './components/ColorMappingDisplay';
import ColorPalette from './components/ColorPalette';
import ProjectControls from './components/ProjectControls';
import PatternExportControls from './components/PatternExportControls';

function App() {
  const [beadList, setBeadList] = useState([]);
  const [totalBeads, setTotalBeads] = useState(0);
  const { uploadedImage, parsedPixels, backgroundMask, removeBackground } = useProjectStore(state => ({
    uploadedImage: state.uploadedImage,
    parsedPixels: state.parsedPixels,
    backgroundMask: state.backgroundMask,
    removeBackground: state.removeBackground
  }));

  const { selectedPalettes, getAllPalettes } = usePaletteStore(state => ({
    selectedPalettes: state.selectedPalettes,
    getAllPalettes: state.getAllPalettes
  }));

  // Get available colors from selected palettes
  const availableColors = useMemo(() => {
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

  // Helper function to convert RGB to hex
  const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  // Calculate bead list from color mapping (memoized for performance)
  const { beadList: calculatedBeadList, totalBeads: calculatedTotalBeads } = useMemo(() => {
    if (!parsedPixels) {
      return { beadList: [], totalBeads: 0 };
    }

    const colorMapping = useProjectStore.getState().colorMapping;
    if (!colorMapping || Object.keys(colorMapping).length === 0) {
      return { beadList: [], totalBeads: 0 };
    }

    // Count beads by iterating through the pixel grid
    const beadCounts = {};
    let total = 0;

    parsedPixels.grid.forEach((row, y) => {
      row.forEach((pixel, x) => {
        // Skip background pixels if removeBackground is true
        if (backgroundMask && removeBackground && backgroundMask[y] && backgroundMask[y][x]) {
          return;
        }

        // Get the bead ID for this pixel
        const pixelHex = rgbToHex(pixel.r, pixel.g, pixel.b);
        const beadId = colorMapping[pixelHex];

        if (beadId) {
          beadCounts[beadId] = (beadCounts[beadId] || 0) + 1;
          total++;
        }
      });
    });

    const list = Object.entries(beadCounts)
      .map(([beadId, count]) => ({
        color: availableColors.find(c => c.id === beadId),
        count
      }))
      .filter(item => item.color)
      .sort((a, b) => b.count - a.count);

    return { beadList: list, totalBeads: total };
  }, [parsedPixels, availableColors, backgroundMask, removeBackground]);

  // Update state when calculations change
  useEffect(() => {
    setBeadList(calculatedBeadList);
    setTotalBeads(calculatedTotalBeads);
  }, [calculatedBeadList, calculatedTotalBeads]);

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Beadsprite Helper</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-3 sm:py-6 px-3 sm:px-4 space-y-4 sm:space-y-6">
        {/* Image Upload Section */}
        <div className="bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6 border border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white">Upload Pixel Art</h2>
          <ImageUploadZone />
        </div>

        {/* Project Controls */}
        <ProjectControls />

        {/* Image Display Section */}
        {uploadedImage && <ImageDisplay />}

        {/* Grid Adjustment Controls */}
        {uploadedImage && <GridAdjustmentControls />}

        {/* Pixel Grid Display Section */}
        {parsedPixels && <PixelGridDisplay />}

        {/* Color Palette - Interactive color mapping */}
        {parsedPixels && <ColorPalette />}

        {/* Color Mapping Section - Shopping list */}
        {uploadedImage && beadList.length > 0 && (
          <ColorMappingDisplay beadList={beadList} totalBeads={totalBeads} />
        )}

        {/* Pattern Export Controls */}
        {parsedPixels && <PatternExportControls />}
      </main>
    </div>
  );
}

export default App;
