import { useProjectStore } from '../stores/projectStore';

export default function ImageDisplay() {
  const { uploadedImage, parsedPixels, gridInfo } = useProjectStore(state => ({
    uploadedImage: state.uploadedImage,
    parsedPixels: state.parsedPixels,
    gridInfo: state.gridInfo
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
          <div className="flex justify-center">
            <img
              src={uploadedImage.preview}
              alt="Uploaded pixel art"
              className="max-w-full h-auto border border-gray-600 rounded"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

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
                <div className="col-span-2">
                  <span className="text-gray-400">Confidence:</span>
                  <span className="ml-2 text-gray-200 font-medium">
                    {(gridInfo.confidence * 100).toFixed(0)}%
                  </span>
                  <div className="mt-1 w-full bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${gridInfo.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
