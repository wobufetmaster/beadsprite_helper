import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loadImage, extractPixels, validateImageFile, validateImageDimensions } from '../services/imageProcessor';
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

      // Validate dimensions (warning only)
      const dimCheck = validateImageDimensions(img);
      if (!dimCheck.valid) {
        console.warn(dimCheck.message);
      }

      // Extract pixels using Canvas API
      const { width, height, grid } = extractPixels(img);

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
        gridInfo: null, // No automatic grid detection in browser-only version
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
