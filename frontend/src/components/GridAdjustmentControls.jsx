import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../stores/projectStore';

export default function GridAdjustmentControls() {
  const { uploadedImage, originalImage, gridInfo, processImage } = useProjectStore(state => ({
    uploadedImage: state.uploadedImage,
    originalImage: state.originalImage,
    gridInfo: state.gridInfo,
    processImage: state.processImage
  }));

  const [isAdjusting, setIsAdjusting] = useState(true);
  const [cellWidth, setCellWidth] = useState(gridInfo?.cell_width || 16);
  const [cellHeight, setCellHeight] = useState(gridInfo?.cell_height || 16);
  const [offsetX, setOffsetX] = useState(gridInfo?.offset_x || 0);
  const [offsetY, setOffsetY] = useState(gridInfo?.offset_y || 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const canvasRef = useRef(null);

  // Update local state when gridInfo changes
  useEffect(() => {
    if (gridInfo) {
      setCellWidth(gridInfo.cell_width);
      setCellHeight(gridInfo.cell_height);
      setOffsetX(gridInfo.offset_x || 0);
      setOffsetY(gridInfo.offset_y || 0);
    }
  }, [gridInfo]);

  // Draw grid overlay on canvas
  useEffect(() => {
    if (!canvasRef.current || !uploadedImage || !uploadedImage.preview || !isAdjusting) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate display size (max 800px wide)
      const maxWidth = 800;
      const scale = Math.min(1, maxWidth / img.width);
      const displayWidth = img.width * scale;
      const displayHeight = img.height * scale;

      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Draw the image
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      // Draw grid overlay
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
      ctx.lineWidth = 1;

      const scaledCellWidth = cellWidth * scale;
      const scaledCellHeight = cellHeight * scale;
      const scaledOffsetX = offsetX * scale;
      const scaledOffsetY = offsetY * scale;

      // Draw vertical lines
      for (let x = scaledOffsetX; x < displayWidth; x += scaledCellWidth) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, displayHeight);
        ctx.stroke();
      }

      // Draw horizontal lines
      for (let y = scaledOffsetY; y < displayHeight; y += scaledCellHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(displayWidth, y);
        ctx.stroke();
      }

      // Highlight the offset with red lines
      if (offsetX > 0 || offsetY > 0) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;

        if (offsetX > 0) {
          ctx.beginPath();
          ctx.moveTo(scaledOffsetX, 0);
          ctx.lineTo(scaledOffsetX, displayHeight);
          ctx.stroke();
        }

        if (offsetY > 0) {
          ctx.beginPath();
          ctx.moveTo(0, scaledOffsetY);
          ctx.lineTo(displayWidth, scaledOffsetY);
          ctx.stroke();
        }
      }
    };

    img.src = uploadedImage.preview;
  }, [uploadedImage, cellWidth, cellHeight, offsetX, offsetY, isAdjusting]);

  // Only show for large images that require grid adjustment
  if (!uploadedImage || !gridInfo || !gridInfo.requires_confirmation) {
    return null;
  }

  const handleApply = async () => {
    if (!originalImage) {
      console.error('No original image file');
      return;
    }

    setIsProcessing(true);

    try {
      // Process image with custom grid parameters
      const result = await processImage({
        cellWidth,
        cellHeight,
        offsetX,
        offsetY
      });

      console.log('Grid adjusted successfully:', {
        cellWidth,
        cellHeight,
        offsetX,
        offsetY,
        resultGrid: `${result.width}x${result.height}`
      });

      // Close the adjustment panel after successful processing
      setIsAdjusting(false);
    } catch (error) {
      console.error('Failed to apply grid adjustment:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (!gridInfo) return;

    // Reset to detected grid values
    setCellWidth(gridInfo.cell_width);
    setCellHeight(gridInfo.cell_height);
    setOffsetX(gridInfo.offset_x || 0);
    setOffsetY(gridInfo.offset_y || 0);

    // Force re-render of inputs by changing key
    setResetKey(prev => prev + 1);
  };

  const gridCols = Math.floor((uploadedImage.width - offsetX) / cellWidth);
  const gridRows = Math.floor((uploadedImage.height - offsetY) / cellHeight);

  return (
    <div className="w-full">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Grid Adjustment</h2>
          <button
            onClick={() => setIsAdjusting(!isAdjusting)}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            {isAdjusting ? 'Hide Controls' : 'Show Controls'}
          </button>
        </div>

        {isAdjusting && (
          <div className="space-y-4">
            {/* Grid Overlay Preview */}
            <div className="bg-gray-900/50 rounded p-4">
              <div className="text-sm font-medium text-gray-300 mb-2">Grid Preview:</div>
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="border border-gray-600 rounded max-w-full"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-400 text-center">
                <span className="text-cyan-400">Cyan lines</span> = cell boundaries
                {(offsetX > 0 || offsetY > 0) && (
                  <span className="ml-3">
                    <span className="text-red-400">Red lines</span> = grid start (offset)
                  </span>
                )}
              </div>
            </div>

            {/* Cell Size Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cell Width: {cellWidth}px
                </label>
                <input
                  key={`cellWidth-${resetKey}`}
                  type="range"
                  min={1}
                  max={100}
                  value={cellWidth}
                  onChange={(e) => setCellWidth(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cell Height: {cellHeight}px
                </label>
                <input
                  key={`cellHeight-${resetKey}`}
                  type="range"
                  min={1}
                  max={100}
                  value={cellHeight}
                  onChange={(e) => setCellHeight(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Offset Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Offset X: {offsetX}px
                </label>
                <input
                  key={`offsetX-${resetKey}`}
                  type="range"
                  min={0}
                  max={cellWidth * 2}
                  value={offsetX}
                  onChange={(e) => setOffsetX(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Offset Y: {offsetY}px
                </label>
                <input
                  key={`offsetY-${resetKey}`}
                  type="range"
                  min={0}
                  max={cellHeight * 2}
                  value={offsetY}
                  onChange={(e) => setOffsetY(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Preview Info */}
            <div className="p-3 bg-gray-700/50 rounded border border-gray-600">
              <div className="text-sm text-gray-300">
                <span className="font-medium">Preview Grid:</span>
                <span className="ml-2 text-gray-400">
                  {gridCols} × {gridRows} cells
                </span>
                <span className="ml-4 text-gray-400">
                  ({cellWidth}×{cellHeight}px cells, {offsetX}×{offsetY}px offset)
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleApply}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-medium transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Apply Grid'}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
