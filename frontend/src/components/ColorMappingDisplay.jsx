import { useProjectStore } from '../stores/projectStore';

export default function ColorMappingDisplay({ beadList, totalBeads }) {
  const parsedPixels = useProjectStore(state => state.parsedPixels);

  if (!beadList || beadList.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Color Mapping Results</h2>

        {/* Summary */}
        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Total beads needed:</span>
            <span className="ml-2 text-gray-600">{totalBeads}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Unique colors:</span>
            <span className="ml-2 text-gray-600">{beadList.length}</span>
          </div>
        </div>

        {/* Bead list */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Bead Shopping List</h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {beadList.map(({ color, count }) => (
              <div
                key={color.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                {/* Color swatch */}
                <div
                  className="w-10 h-10 rounded border-2 border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: color.hex }}
                  title={color.hex}
                />

                {/* Color info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {color.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {color.hex}
                  </div>
                </div>

                {/* Count */}
                <div className="flex-shrink-0">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500">
                      {((count / totalBeads) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Color distribution chart (simple bar chart) */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Color Distribution</h3>
          <div className="space-y-2">
            {beadList.slice(0, 10).map(({ color, count }) => (
              <div key={color.id} className="flex items-center gap-2">
                <div className="w-24 text-xs text-gray-600 truncate">{color.name}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(count / totalBeads) * 100}%`,
                      backgroundColor: color.hex
                    }}
                  />
                </div>
                <div className="w-12 text-xs text-gray-600 text-right">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
