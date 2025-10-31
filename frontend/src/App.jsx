import { useState, useEffect } from 'react';
import { colorApi } from './services/api';
import useProjectStore from './stores/projectStore';
import useInventoryStore from './stores/inventoryStore';
import useUIStore from './stores/uiStore';

function App() {
  const [perlerColors, setPerlerColors] = useState([]);
  const { setError, setLoading } = useUIStore();

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

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">Beadsprite Helper</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600">
            Loaded {perlerColors.length} Perler bead colors
          </p>
          {perlerColors.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
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
