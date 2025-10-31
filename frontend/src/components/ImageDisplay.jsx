import { useProjectStore } from '../stores/projectStore';

export default function ImageDisplay() {
  const { uploadedImage, parsedPixels } = useProjectStore(state => ({
    uploadedImage: state.uploadedImage,
    parsedPixels: state.parsedPixels
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
        </div>
      </div>
    </div>
  );
}
