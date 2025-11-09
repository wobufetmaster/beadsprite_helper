import { useState } from 'react';

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
  const [isExpanded, setIsExpanded] = useState(true);
  if (!beadList || beadList.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Color Mapping Results</h2>
          <div className="text-sm text-gray-400">
            {totalBeads} beads, {beadList.length} colors
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
          {/* Bead list */}
          <div>
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
      )}
    </div>
  );
}
