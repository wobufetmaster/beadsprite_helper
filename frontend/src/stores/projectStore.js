import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loadImage, extractPixels, extractPixelsWithGrid, detectGridSize, validateImageFile, validateImageDimensions } from '../services/imageProcessor';
import { mapPixelsToBeads } from '../services/colorMapper';
import { useUIStore } from './uiStore';

const useProjectStore = create(
  persist(
    (set, get) => ({
  // Project metadata
  projectName: 'Untitled Project',
  version: '1.0',

  // Original uploaded image
  originalImage: null,

  // Uploaded image info
  uploadedImage: null, // { preview, width, height, format }

  // Detected grid info
  gridInfo: null, // { cell_width, cell_height, grid_cols, grid_rows, confidence }

  // Parsed pixel grid
  parsedPixels: null, // { width, height, grid: [[{r,g,b},...]] }

  // Color mapping from image colors to bead colors
  colorMapping: {}, // { "#ff0000": "cherry_red", ... }

  // Settings
  settings: {
    colorMatchMode: 'lab', // 'lab' or 'rgb'
    similarityThreshold: 5,
    showGrid: true,
  },

  // Actions
  setProjectName: (name) => set({ projectName: name }),

  setOriginalImage: (image) => set({ originalImage: image }),

  setParsedPixels: (pixels) => set({ parsedPixels: pixels }),

  // Process image in browser
  uploadImage: async (file) => {
    const { setLoading, setError, clearError } = useUIStore.getState();

    try {
      setLoading(true);
      clearError();

      // Validate file
      validateImageFile(file);

      // Load image
      const img = await loadImage(file);

      // Validate dimensions and detect grid if needed
      const dimCheck = validateImageDimensions(img);
      let gridSize = 1;
      let gridInfo = null;

      if (!dimCheck.valid) {
        console.warn(dimCheck.message);
        // Detect grid size for large images
        gridSize = detectGridSize(img);

        // Force downsampling if image is very large and no grid detected
        if (gridSize === 1) {
          const pixels = img.width * img.height;
          if (pixels > 200 * 200) {
            // Estimate a reasonable grid size to get under 200x200
            const targetSize = 150;
            gridSize = Math.max(
              Math.ceil(img.width / targetSize),
              Math.ceil(img.height / targetSize)
            );
            console.log(`⚠ Forcing grid size ${gridSize} to reduce from ${img.width}x${img.height} to ~${Math.floor(img.width/gridSize)}x${Math.floor(img.height/gridSize)}`);
          }
        }

        const gridCols = Math.floor(img.width / gridSize);
        const gridRows = Math.floor(img.height / gridSize);

        gridInfo = {
          detected_grid_size: gridSize,
          cell_width: gridSize,
          cell_height: gridSize,
          grid_cols: gridCols,
          grid_rows: gridRows,
          confidence: gridSize > 1 ? 95 : 0, // High confidence if grid detected, 0 if forced
          original_width: img.width,
          original_height: img.height
        };
      }

      // Extract pixels (with grid downsampling if needed)
      const { width, height, grid } = gridSize > 1
        ? extractPixelsWithGrid(img, gridSize)
        : extractPixels(img);

      // Map to Perler beads
      const colorMapping = mapPixelsToBeads(grid);

      // Create preview URL
      const preview = URL.createObjectURL(file);

      // Update store
      set({
        uploadedImage: {
          preview,
          width,
          height,
          format: file.type.split('/')[1] || 'unknown',
        },
        originalImage: file,
        parsedPixels: { width, height, grid },
        colorMapping,
        gridInfo, // Grid detection results
      });

      return { width, height, grid };
    } catch (error) {
      console.error('Image processing failed:', error);
      const errorMessage = error.message || 'Failed to process image';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  },

  setColorMapping: (mapping) => set({ colorMapping: mapping }),

  updateColorMapping: (imageColor, beadColorId) =>
    set((state) => ({
      colorMapping: {
        ...state.colorMapping,
        [imageColor]: beadColorId,
      },
    })),

  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  // Reset project
  resetProject: () =>
    set({
      projectName: 'Untitled Project',
      originalImage: null,
      uploadedImage: null,
      gridInfo: null,
      parsedPixels: null,
      colorMapping: {},
      settings: {
        colorMatchMode: 'lab',
        similarityThreshold: 5,
        showGrid: true,
      },
    }),

  // Load project from JSON
  loadProject: (projectData) =>
    set({
      projectName: projectData.name,
      originalImage: projectData.originalImage,
      parsedPixels: projectData.parsedPixels,
      colorMapping: projectData.colorMapping,
      settings: projectData.settings,
    }),

  // Export project to JSON
  exportProject: (state) => ({
    version: state.version,
    name: state.projectName,
    originalImage: state.originalImage,
    parsedPixels: state.parsedPixels,
    colorMapping: state.colorMapping,
    beadInventory: [], // Will be filled by inventoryStore
    settings: state.settings,
  }),
}),
    {
      name: 'beadsprite-project-storage',
      // Only persist certain fields (not blob URLs or File objects)
      partialize: (state) => ({
        projectName: state.projectName,
        // Don't persist uploadedImage.preview (it's a blob URL that expires)
        uploadedImage: state.uploadedImage ? {
          width: state.uploadedImage.width,
          height: state.uploadedImage.height,
          format: state.uploadedImage.format,
          // preview is intentionally excluded - can't persist blob URLs
        } : null,
        gridInfo: state.gridInfo,
        parsedPixels: state.parsedPixels,
        colorMapping: state.colorMapping,
        settings: state.settings,
        // originalImage is intentionally excluded - File objects can't be serialized
      }),
    }
  )
);

export { useProjectStore };
export default useProjectStore;
