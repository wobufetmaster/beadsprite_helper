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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Uploaded Image</h2>

        <div className="space-y-4">
          {/* Image preview */}
          <div className="flex justify-center">
            <img
              src={uploadedImage.preview}
              alt="Uploaded pixel art"
              className="max-w-full h-auto border border-gray-300 rounded"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Image info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Dimensions:</span>
              <span className="ml-2 text-gray-600">
                {uploadedImage.width} × {uploadedImage.height} pixels
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Format:</span>
              <span className="ml-2 text-gray-600">
                {uploadedImage.format}
              </span>
            </div>
          </div>

          {/* Pixel count */}
          {parsedPixels && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Total pixels:</span>
              <span className="ml-2 text-gray-600">
                {parsedPixels.width * parsedPixels.height}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
