import { useState, useEffect } from 'react';
import { colorApi } from './services/api';
import useProjectStore from './stores/projectStore';
import useInventoryStore from './stores/inventoryStore';
import useUIStore from './stores/uiStore';
import ImageUploadZone from './components/ImageUploadZone';
import ImageDisplay from './components/ImageDisplay';
import ColorMappingDisplay from './components/ColorMappingDisplay';
import { mapPixelsToBeads, getBeadList } from './services/colorMapper';

function App() {
  const [perlerColors, setPerlerColors] = useState([]);
  const [beadList, setBeadList] = useState([]);
  const [totalBeads, setTotalBeads] = useState(0);
  const { setError, setLoading } = useUIStore();
  const { uploadedImage, parsedPixels, settings, setColorMapping } = useProjectStore(state => ({
    uploadedImage: state.uploadedImage,
    parsedPixels: state.parsedPixels,
    settings: state.settings,
    setColorMapping: state.setColorMapping
  }));

  useEffect(() => {
    // Load Perler colors on mount
    const loadColors = async () => {
      try {
        setLoading(true, 'Loading Perler colors...');
        const response = await colorApi.getPerlerColors();
        setPerlerColors(response.data);
        console.log('Loaded Perler colors:', response.data.length);
      } catch (error) {
        console.error('Failed to load Perler colors:', error);
        setError('Failed to load Perler colors');
      } finally {
        setLoading(false);
      }
    };

    loadColors();
  }, []);

  // Perform color mapping when image is uploaded and colors are loaded
  useEffect(() => {
    if (!parsedPixels || !perlerColors || perlerColors.length === 0) {
      return;
    }

    console.log('Performing color mapping...');
    const { colorMapping, beadCounts } = mapPixelsToBeads(
      parsedPixels,
      perlerColors,
      settings.colorMatchMode
    );

    // Update store with mapping
    setColorMapping(colorMapping);

    // Calculate bead list and totals
    const list = getBeadList(beadCounts, perlerColors);
    setBeadList(list);

    const total = Object.values(beadCounts).reduce((sum, count) => sum + count, 0);
    setTotalBeads(total);

    console.log('Color mapping complete:', {
      uniqueColors: list.length,
      totalBeads: total
    });
  }, [parsedPixels, perlerColors, settings.colorMatchMode]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">Beadsprite Helper</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* Image Upload Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Pixel Art</h2>
          <ImageUploadZone />
        </div>

        {/* Image Display Section */}
        {uploadedImage && <ImageDisplay />}

        {/* Color Mapping Section */}
        {uploadedImage && beadList.length > 0 && (
          <ColorMappingDisplay beadList={beadList} totalBeads={totalBeads} />
        )}

        {/* Color Info Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Available Bead Colors</h2>
          <p className="text-gray-600 mb-4">
            Loaded {perlerColors.length} Perler bead colors
          </p>
          {perlerColors.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {perlerColors.slice(0, 14).map((color) => (
                <div
                  key={color.id}
                  className="flex flex-col items-center p-2 border rounded"
                >
                  <div
                    className="w-12 h-12 rounded border-2 border-gray-300"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-xs mt-1 text-center">{color.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
