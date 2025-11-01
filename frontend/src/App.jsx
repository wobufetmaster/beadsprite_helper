import { useState, useEffect, useMemo } from 'react';
import useProjectStore from './stores/projectStore';
import useInventoryStore from './stores/inventoryStore';
import useUIStore from './stores/uiStore';
import usePaletteStore from './stores/paletteStore';
import ImageUploadZone from './components/ImageUploadZone';
import ImageDisplay from './components/ImageDisplay';
import GridAdjustmentControls from './components/GridAdjustmentControls';
import PixelGridDisplay from './components/PixelGridDisplay';
import ColorMappingDisplay from './components/ColorMappingDisplay';
import ColorPalette from './components/ColorPalette';

function App() {
  const [beadList, setBeadList] = useState([]);
  const [totalBeads, setTotalBeads] = useState(0);
  const { setError, setLoading } = useUIStore();
  const { uploadedImage, parsedPixels, settings, setColorMapping } = useProjectStore(state => ({
    uploadedImage: state.uploadedImage,
    parsedPixels: state.parsedPixels,
    settings: state.settings,
    setColorMapping: state.setColorMapping
  }));

  const { getAvailableColors, selectedPalettes } = usePaletteStore(state => ({
    getAvailableColors: state.getAvailableColors,
    selectedPalettes: state.selectedPalettes
  }));

  const availableColors = useMemo(() => getAvailableColors(), [selectedPalettes]);

  // Calculate bead list from color mapping (mapping is done by projectStore)
  useEffect(() => {
    if (!parsedPixels) {
      setBeadList([]);
      setTotalBeads(0);
      return;
    }

    const colorMapping = useProjectStore.getState().colorMapping;
    if (!colorMapping || Object.keys(colorMapping).length === 0) {
      return;
    }

    // Convert mapping to bead list
    const beadCounts = Object.values(colorMapping).reduce((acc, beadId) => {
      acc[beadId] = (acc[beadId] || 0) + 1;
      return acc;
    }, {});

    const list = Object.entries(beadCounts)
      .map(([beadId, count]) => ({
        color: availableColors.find(c => c.id === beadId),
        count
      }))
      .filter(item => item.color)
      .sort((a, b) => b.count - a.count);

    setBeadList(list);
    setTotalBeads(Object.values(beadCounts).reduce((sum, count) => sum + count, 0));
  }, [parsedPixels, availableColors]);

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-white">Beadsprite Helper</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* Image Upload Section */}
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-white">Upload Pixel Art</h2>
          <ImageUploadZone />
        </div>

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
      </main>
    </div>
  );
}

export default App;
