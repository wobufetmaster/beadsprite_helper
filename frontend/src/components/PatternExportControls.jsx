import { useState, useRef } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/uiStore';
import PatternRenderer from './PatternRenderer';
import { exportPNG, exportPDF, generateLegendData } from '../services/patternExporter';

export default function PatternExportControls() {
  const { beadGrid, backgroundMask, removeBackground, parsedPixels } = useProjectStore();
  const { isLoading } = useUIStore();

  const [exportFormat, setExportFormat] = useState('png');
  const [beadShape, setBeadShape] = useState('square');
  const [showPegboardGrid, setShowPegboardGrid] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef(null);

  const handleCanvasReady = (canvas) => {
    canvasRef.current = canvas;
  };

  const handleExport = async () => {
    if (!canvasRef.current || !beadGrid) {
      alert('No pattern to export. Please upload an image first.');
      return;
    }

    try {
      setIsExporting(true);

      if (exportFormat === 'png') {
        await exportPNG(canvasRef.current);
        console.log('Pattern exported as PNG');
      } else if (exportFormat === 'pdf') {
        const legendData = generateLegendData(beadGrid, backgroundMask, removeBackground);
        await exportPDF(canvasRef.current, legendData);
        console.log('Pattern exported as PDF');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Failed to export pattern: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const hasProject = parsedPixels && beadGrid;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Export Pattern for Printing</h2>

      <div className="space-y-4">
        {/* Format Selection */}
        <div>
          <label htmlFor="export-format" className="block text-sm font-medium text-gray-700 mb-1">
            Export Format
          </label>
          <select
            id="export-format"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            disabled={!hasProject || isLoading || isExporting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                     focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="png">PNG (Image only)</option>
            <option value="pdf">PDF (Pattern + Color Legend)</option>
          </select>
        </div>

        {/* Bead Shape Selection */}
        <div>
          <label htmlFor="bead-shape" className="block text-sm font-medium text-gray-700 mb-1">
            Bead Display
          </label>
          <select
            id="bead-shape"
            value={beadShape}
            onChange={(e) => setBeadShape(e.target.value)}
            disabled={!hasProject || isLoading || isExporting}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                     focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="square">Square Pixels</option>
            <option value="circle">Circular Beads</option>
          </select>
        </div>

        {/* Pegboard Grid Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="pegboard-grid"
            checked={showPegboardGrid}
            onChange={(e) => setShowPegboardGrid(e.target.checked)}
            disabled={!hasProject || isLoading || isExporting}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500
                     disabled:cursor-not-allowed"
          />
          <label htmlFor="pegboard-grid" className="ml-2 text-sm text-gray-700">
            Include pegboard grid overlay (29×29 sections)
          </label>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={!hasProject || isLoading || isExporting}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700
                   disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors
                   font-medium text-sm"
          title={!hasProject ? 'Load an image first' : 'Export pattern'}
        >
          {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
        </button>

        {!hasProject && (
          <p className="text-xs text-gray-500 text-center">
            Upload and process an image to enable pattern export
          </p>
        )}

        {hasProject && exportFormat === 'pdf' && (
          <p className="text-xs text-gray-500 text-center">
            PDF will include the pattern on page 1 and color legend on page 2
          </p>
        )}
      </div>

      {/* Hidden PatternRenderer component */}
      {beadGrid && (
        <PatternRenderer
          beadGrid={beadGrid}
          backgroundMask={backgroundMask}
          removeBackground={removeBackground}
          beadShape={beadShape}
          showPegboardGrid={showPegboardGrid}
          onCanvasReady={handleCanvasReady}
        />
      )}
    </div>
  );
}
