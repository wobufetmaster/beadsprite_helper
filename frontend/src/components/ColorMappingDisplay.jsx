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

export default function ColorMappingDisplay({ beadList, totalBeads }) {
  if (!beadList || beadList.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 border border-gray-700">
        <h2 className="text-lg font-semibold mb-3 sm:mb-4 text-white">Color Mapping Results</h2>

        {/* Summary */}
        <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-3 sm:gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-300">Total beads needed:</span>
            <span className="ml-2 text-gray-400">{totalBeads}</span>
          </div>
          <div>
            <span className="font-medium text-gray-300">Unique colors:</span>
            <span className="ml-2 text-gray-400">{beadList.length}</span>
          </div>
        </div>

        {/* Bead list */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2 sm:mb-3">Bead Shopping List</h3>
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {beadList.map(({ color, count }) => (
                <div
                  key={color.id}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-700/50 rounded border border-gray-600 hover:bg-gray-700 transition-colors"
                >
                  {/* Color swatch */}
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded border-2 border-gray-500 flex-shrink-0"
                    style={{ backgroundColor: color.hex }}
                    title={color.hex}
                  />

                  {/* Color info and count */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-100 truncate">
                      {formatBeadName(color)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {color.hex}
                    </div>
                    <div className="text-sm mt-1">
                      <span className="font-semibold text-gray-100">{count} beads</span>
                      <span className="text-xs text-gray-400 ml-2">
                        ({((count / totalBeads) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Color distribution chart (simple bar chart) */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Color Distribution</h3>
          <div className="space-y-2">
            {beadList.slice(0, 10).map(({ color, count }) => (
              <div key={color.id} className="flex items-center gap-2">
                <div className="w-24 text-xs text-gray-400 truncate">
                  {formatBeadName(color)}
                </div>
                <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(count / totalBeads) * 100}%`,
                      backgroundColor: color.hex
                    }}
                  />
                </div>
                <div className="w-12 text-xs text-gray-400 text-right">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
