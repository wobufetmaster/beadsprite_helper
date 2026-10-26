import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loadImage, extractPixelsWithGrid, detectGridSize, validateImageFile } from '../services/imageProcessor';
import { createBeadGrid } from '../services/colorMapper';
import { detectBackground } from '../services/backgroundDetector';
import { useUIStore } from './uiStore';
import usePaletteStore from './paletteStore';
import { exportProject as exportProjectFile, importProject as importProjectFile } from '../services/projectExporter';

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

  // Bead grid (2D array of bead IDs)
  beadGrid: null, // [[beadId, ...]]

  // Background mask (2D boolean array)
  backgroundMask: null, // [[boolean, ...]]

  // Background removal toggle
  removeBackground: true, // true = exclude background from counts/rendering

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

  // Upload image: detect the grid, then process with it
  uploadImage: async (file) => {
    const { setLoading, setError, clearError } = useUIStore.getState();

    try {
      setLoading(true);
      clearError();

      // Validate file
      validateImageFile(file);

      // Load image
      const img = await loadImage(file);

      // Create preview URL
      const preview = URL.createObjectURL(file);

      // Detect the pixel grid on every image (upscaled art of any size).
      const detection = detectGridSize(img);
      let { cellWidth, cellHeight, offsetX, offsetY, cols, rows } = detection;
      let confidence = detection.confidence;

      // No grid found on a big image: downsample to ~150 cells so it stays workable.
      if (!detection.detected && img.width * img.height > 200 * 200) {
        cellWidth = cellHeight = Math.max(img.width, img.height) / 150;
        offsetX = offsetY = 0;
        cols = Math.floor(img.width / cellWidth);
        rows = Math.floor(img.height / cellHeight);
        confidence = 0;
      }

      const gridInfo = cellWidth > 1 || cellHeight > 1 ? {
        cell_width: cellWidth,
        cell_height: cellHeight,
        offset_x: offsetX,
        offset_y: offsetY,
        grid_cols: cols,
        grid_rows: rows,
        confidence: Math.round(confidence * 100),
        detected: detection.detected,
        original_width: img.width,
        original_height: img.height,
        // Shows the adjustment panel so the grid can be nudged after the fact
        requires_confirmation: true,
      } : null;

      set({
        uploadedImage: {
          preview,
          width: img.width,
          height: img.height,
          format: file.type.split('/')[1] || 'unknown',
        },
        originalImage: file,
        parsedPixels: null, // set by processImage
        colorMapping: {},
        gridInfo,
      });

      await get().processImage();

      return { width: img.width, height: img.height };
    } catch (error) {
      console.error('Image upload failed:', error);
      const errorMessage = error.message || 'Failed to upload image';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  },

  // Process image with detected grid size or custom parameters
  processImage: async (gridParams = null) => {
    const { setLoading, setError, clearError } = useUIStore.getState();
    const { originalImage, gridInfo } = get();

    if (!originalImage) {
      setError('No image to process');
      return;
    }

    try {
      setLoading(true);
      clearError();

      // Load image
      const img = await loadImage(originalImage);

      // Determine grid parameters
      let cellWidth, cellHeight, offsetX, offsetY;

      if (gridParams) {
        // Use custom parameters
        cellWidth = gridParams.cellWidth || 1;
        cellHeight = gridParams.cellHeight || cellWidth;
        offsetX = gridParams.offsetX || 0;
        offsetY = gridParams.offsetY || 0;
      } else {
        // Use detected grid parameters
        cellWidth = gridInfo?.cell_width || 1;
        cellHeight = gridInfo?.cell_height || cellWidth;
        offsetX = gridInfo?.offset_x || 0;
        offsetY = gridInfo?.offset_y || 0;
      }

      console.log('Processing image with grid parameters:', { cellWidth, cellHeight, offsetX, offsetY });

      const { width, height, grid, alphaData } = extractPixelsWithGrid(img, cellWidth, cellHeight, offsetX, offsetY);

      // Match against the selected palettes; ColorPalette refines this mapping afterwards
      const { beadGrid, colorMapping } = createBeadGrid(
        grid, usePaletteStore.getState().getAvailableColors(), get().settings.colorMatchMode
      );

      // Detect background
      const backgroundMask = detectBackground(beadGrid, alphaData, width, height);

      // Update store with processed data
      set({
        parsedPixels: { width, height, grid },
        beadGrid,
        backgroundMask,
        colorMapping,
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

  // Toggle background removal
  toggleBackgroundRemoval: () =>
    set((state) => ({
      removeBackground: !state.removeBackground,
    })),

  // Reset project
  resetProject: () =>
    set({
      projectName: 'Untitled Project',
      originalImage: null,
      uploadedImage: null,
      gridInfo: null,
      parsedPixels: null,
      beadGrid: null,
      backgroundMask: null,
      removeBackground: true,
      colorMapping: {},
      settings: {
        colorMatchMode: 'lab',
        similarityThreshold: 5,
        showGrid: true,
      },
    }),

  // Export project to JSON file
  exportProject: async () => {
    const state = get();
    const projectState = {
      version: state.version,
      projectName: state.projectName,
      parsedPixels: state.parsedPixels,
      beadGrid: state.beadGrid,
      backgroundMask: state.backgroundMask,
      removeBackground: state.removeBackground,
      colorMapping: state.colorMapping,
      settings: state.settings,
    };

    try {
      const result = exportProjectFile(projectState);
      return result;
    } catch (error) {
      console.error('Failed to export project:', error);
      useUIStore.getState().setError('Failed to export project');
      throw error;
    }
  },

  // Import project from JSON file
  importProject: async (file) => {
    const { setLoading, setError, clearError } = useUIStore.getState();

    try {
      setLoading(true);
      clearError();

      // Validate and parse file
      const projectData = await importProjectFile(file);

      // Regenerate beadGrid if missing (for backward compatibility)
      let beadGrid = projectData.beadGrid;
      if (!beadGrid && projectData.parsedPixels) {
        beadGrid = createBeadGrid(projectData.parsedPixels.grid, usePaletteStore.getState().getAvailableColors()).beadGrid;
      }

      // Load into store
      set({
        projectName: projectData.projectName || 'Untitled Project',
        parsedPixels: projectData.parsedPixels,
        beadGrid: beadGrid,
        backgroundMask: projectData.backgroundMask || null,
        removeBackground: projectData.removeBackground !== undefined ? projectData.removeBackground : true,
        colorMapping: projectData.colorMapping,
        settings: projectData.settings || {
          colorMatchMode: 'lab',
          similarityThreshold: 5,
          showGrid: true,
        },
        // Clear uploaded image since we can't restore File objects
        uploadedImage: projectData.parsedPixels ? {
          width: projectData.parsedPixels.width,
          height: projectData.parsedPixels.height,
          format: 'imported',
        } : null,
        originalImage: null,
        gridInfo: null,
      });

      return projectData;
    } catch (error) {
      console.error('Failed to import project:', error);
      setError(error.message || 'Failed to import project');
      throw error;
    } finally {
      setLoading(false);
    }
  },
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
        beadGrid: state.beadGrid,
        backgroundMask: state.backgroundMask,
        removeBackground: state.removeBackground,
        colorMapping: state.colorMapping,
        settings: state.settings,
        // originalImage is intentionally excluded - File objects can't be serialized
      }),
    }
  )
);

export { useProjectStore };
export default useProjectStore;
