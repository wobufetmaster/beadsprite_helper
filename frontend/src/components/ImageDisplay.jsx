import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/uiStore';

export default function ImageDisplay() {
  const { uploadedImage, parsedPixels, gridInfo, processImage } = useProjectStore(state => ({
    uploadedImage: state.uploadedImage,
    parsedPixels: state.parsedPixels,
    gridInfo: state.gridInfo,
    processImage: state.processImage
  }));

  const { loading } = useUIStore(state => ({
    loading: state.loading
  }));

  if (!uploadedImage) {
    return null;
  }

  return (
    <div className="w-full space-y-4">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-white">Uploaded Image</h2>

        <div className="space-y-4">
          {/* Image preview */}
          {uploadedImage.preview ? (
            <div className="flex justify-center">
              <img
                src={uploadedImage.preview}
                alt="Uploaded pixel art"
                className="max-w-full h-auto border border-gray-600 rounded"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          ) : (
            <div className="flex justify-center p-8 bg-gray-700/50 rounded border border-gray-600">
              <p className="text-sm text-gray-400">Image preview not available after page reload. Color mapping and pixel grid are preserved.</p>
            </div>
          )}

          {/* Image info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-300">Dimensions:</span>
              <span className="ml-2 text-gray-400">
                {uploadedImage.width} × {uploadedImage.height} pixels
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-300">Format:</span>
              <span className="ml-2 text-gray-400">
                {uploadedImage.format}
              </span>
            </div>
          </div>

          {/* Pixel count */}
          {parsedPixels && (
            <div className="text-sm">
              <span className="font-medium text-gray-300">Total pixels:</span>
              <span className="ml-2 text-gray-400">
                {parsedPixels.width * parsedPixels.height}
              </span>
            </div>
          )}

          {/* Grid detection info */}
          {gridInfo && (
            <div className="mt-4 p-4 bg-gray-700/50 rounded border border-gray-600">
              <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                Grid Pattern Detected
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">Grid size:</span>
                  <span className="ml-2 text-gray-200 font-medium">
                    {gridInfo.grid_cols} × {gridInfo.grid_rows}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Cell size:</span>
                  <span className="ml-2 text-gray-200 font-medium">
                    {gridInfo.cell_width} × {gridInfo.cell_height}px
                  </span>
                </div>
                {(gridInfo.offset_x > 0 || gridInfo.offset_y > 0) && (
                  <div>
                    <span className="text-gray-400">Offset:</span>
                    <span className="ml-2 text-gray-200 font-medium">
                      {gridInfo.offset_x} × {gridInfo.offset_y}px
                    </span>
                  </div>
                )}
                <div className={gridInfo.offset_x > 0 || gridInfo.offset_y > 0 ? 'col-span-1' : 'col-span-2'}>
                  <span className="text-gray-400">Confidence:</span>
                  <span className="ml-2 text-gray-200 font-medium">
                    {gridInfo.confidence.toFixed(0)}%
                  </span>
                  <div className="mt-1 w-full bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${gridInfo.confidence}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Process Image Button - show when grid requires confirmation and pixels not yet processed */}
              {gridInfo.requires_confirmation && !parsedPixels && (
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <button
                    onClick={() => processImage()}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Process Image with Detected Grid
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Or use Grid Adjustment below to customize the grid before processing
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
