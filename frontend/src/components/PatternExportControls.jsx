import { useState, useRef, useMemo } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/uiStore';
import usePaletteStore from '../stores/paletteStore';
import PatternRenderer from './PatternRenderer';
import LabeledPatternRenderer from './LabeledPatternRenderer';
import { exportPNG, exportPDF, generateLegendData } from '../services/patternExporter';
import { generateColorLabels } from '../utils/labelGenerator';

export default function PatternExportControls() {
  const { beadGrid, backgroundMask, removeBackground, parsedPixels, colorMapping } = useProjectStore();
  const { isLoading } = useUIStore();
  const { getAllPalettes, selectedPalettes } = usePaletteStore();

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

  const [exportFormat, setExportFormat] = useState('png');
  const [beadShape, setBeadShape] = useState('square');
  const [showPegboardGrid, setShowPegboardGrid] = useState(true);
  const [pegboardSize, setPegboardSize] = useState(29);
  const [exportMirrored, setExportMirrored] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef(null);
  const labeledCanvasRef = useRef(null);
  const [colorLabels, setColorLabels] = useState(null);
  const [currentBeadGrid, setCurrentBeadGrid] = useState(null);

  // Helper to rebuild beadGrid from current colorMapping (respects user substitutions)
  const rebuildBeadGridFromMapping = (parsedPixels, colorMapping) => {
    if (!parsedPixels || !colorMapping) return null;

    const rgbToHex = (r, g, b) => {
      return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    };

    const newGrid = [];
    for (const row of parsedPixels.grid) {
      const beadRow = [];
      for (const pixel of row) {
        const pixelHex = rgbToHex(pixel.r, pixel.g, pixel.b);
        const beadId = colorMapping[pixelHex];
        beadRow.push(beadId || null);
      }
      newGrid.push(beadRow);
    }
    return newGrid;
  };

  const handleCanvasReady = (canvas) => {
    canvasRef.current = canvas;
  };

  const handleLabeledCanvasReady = (canvas) => {
    labeledCanvasRef.current = canvas;
  };

  const handleExport = async () => {
    if (!beadGrid && !parsedPixels) {
      alert('No pattern to export. Please upload an image first.');
      return;
    }

    try {
      setIsExporting(true);

      // Rebuild beadGrid from current colorMapping to respect user substitutions
      const rebuiltGrid = rebuildBeadGridFromMapping(parsedPixels, colorMapping) || beadGrid;
      setCurrentBeadGrid(rebuiltGrid);

      // Wait a moment for canvas to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      if (exportFormat === 'png') {
        if (!canvasRef.current) {
          alert('Pattern canvas not ready. Please try again.');
          return;
        }
        await exportPNG(canvasRef.current);
        console.log('Pattern exported as PNG');
      } else if (exportFormat === 'pdf') {
        // Generate legend data and labels using current beadGrid
        const legendData = generateLegendData(rebuiltGrid, beadColors, backgroundMask, removeBackground);
        const labels = generateColorLabels(legendData);
        setColorLabels(labels);

        // Wait for labeled canvas to render
        await new Promise(resolve => setTimeout(resolve, 200));

        if (!labeledCanvasRef.current) {
          alert('Labeled pattern canvas not ready. Please try again.');
          return;
        }

        await exportPDF(labeledCanvasRef.current, legendData, labels);
        console.log('Pattern exported as PDF with labels');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Failed to export pattern: ${error.message}`);
    } finally {
      setIsExporting(false);
      setCurrentBeadGrid(null); // Clear after export
    }
  };

  const hasProject = parsedPixels && beadGrid;

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4">
      <h2 className="text-lg font-semibold text-white mb-3">Export Pattern for Printing</h2>

      <div className="space-y-4">
        {/* Format Selection */}
        <div>
          <label htmlFor="export-format" className="block text-sm font-medium text-gray-300 mb-1">
            Export Format
          </label>
          <select
            id="export-format"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            disabled={!hasProject || isLoading || isExporting}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none
                     focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed
                     text-white"
          >
            <option value="png">PNG (Image only)</option>
            <option value="pdf">PDF (Pattern + Color Legend)</option>
          </select>
        </div>

        {/* Bead Shape Selection */}
        <div>
          <label htmlFor="bead-shape" className="block text-sm font-medium text-gray-300 mb-1">
            Bead Display
          </label>
          <select
            id="bead-shape"
            value={beadShape}
            onChange={(e) => setBeadShape(e.target.value)}
            disabled={!hasProject || isLoading || isExporting}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none
                     focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed
                     text-white"
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
            className="w-4 h-4 text-blue-600 border-gray-600 rounded focus:ring-blue-500
                     disabled:cursor-not-allowed"
          />
          <label htmlFor="pegboard-grid" className="ml-2 text-sm text-gray-300">
            Include pegboard grid overlay
          </label>
        </div>

        {/* Pegboard Size Selection */}
        {showPegboardGrid && (
          <div className="pl-6 space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Pegboard Size
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPegboardSize(29)}
                disabled={!hasProject || isLoading || isExporting}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors
                  ${pegboardSize === 29
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                  disabled:bg-gray-600 disabled:cursor-not-allowed`}
              >
                29×29
              </button>
              <button
                onClick={() => setPegboardSize(50)}
                disabled={!hasProject || isLoading || isExporting}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors
                  ${pegboardSize === 50
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                  disabled:bg-gray-600 disabled:cursor-not-allowed`}
              >
                50×50
              </button>
              <button
                onClick={() => setPegboardSize(57)}
                disabled={!hasProject || isLoading || isExporting}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors
                  ${pegboardSize === 57
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                  disabled:bg-gray-600 disabled:cursor-not-allowed`}
              >
                57×57
              </button>
              <input
                type="number"
                value={pegboardSize}
                onChange={(e) => setPegboardSize(parseInt(e.target.value) || 29)}
                disabled={!hasProject || isLoading || isExporting}
                min="1"
                max="200"
                className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         disabled:bg-gray-600 disabled:cursor-not-allowed"
                placeholder="Custom"
              />
            </div>
          </div>
        )}

        {/* Mirror Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="export-mirrored"
            checked={exportMirrored}
            onChange={(e) => setExportMirrored(e.target.checked)}
            disabled={!hasProject || isLoading || isExporting}
            className="w-4 h-4 text-yellow-600 border-gray-600 rounded focus:ring-yellow-500
                     disabled:cursor-not-allowed"
          />
          <label htmlFor="export-mirrored" className="ml-2 text-sm text-gray-300">
            Mirror horizontally (B-side for ironing)
          </label>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={!hasProject || isLoading || isExporting}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700
                   disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors
                   font-medium text-sm"
          title={!hasProject ? 'Load an image first' : 'Export pattern'}
        >
          {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
        </button>

        {!hasProject && (
          <p className="text-xs text-gray-400 text-center">
            Upload and process an image to enable pattern export
          </p>
        )}

        {hasProject && exportFormat === 'pdf' && (
          <p className="text-xs text-gray-400 text-center">
            PDF will include the pattern on page 1 and color legend on page 2
          </p>
        )}
      </div>

      {/* Hidden PatternRenderer component */}
      {(currentBeadGrid || beadGrid) && (
        <PatternRenderer
          beadGrid={currentBeadGrid || beadGrid}
          beadColors={beadColors}
          backgroundMask={backgroundMask}
          removeBackground={removeBackground}
          beadShape={beadShape}
          showPegboardGrid={showPegboardGrid}
          pegboardSize={pegboardSize}
          isMirrored={exportMirrored}
          onCanvasReady={handleCanvasReady}
        />
      )}

      {/* Labeled PatternRenderer for PDF exports */}
      {(currentBeadGrid || beadGrid) && colorLabels && (
        <LabeledPatternRenderer
          beadGrid={currentBeadGrid || beadGrid}
          beadColors={beadColors}
          colorLabels={colorLabels}
          backgroundMask={backgroundMask}
          removeBackground={removeBackground}
          beadShape={beadShape}
          showPegboardGrid={showPegboardGrid}
          pegboardSize={pegboardSize}
          isMirrored={exportMirrored}
          onCanvasReady={handleLabeledCanvasReady}
        />
      )}
    </div>
  );
}
