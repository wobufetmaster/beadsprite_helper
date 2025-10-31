import { create } from 'zustand';

const useProjectStore = create((set) => ({
  // Project metadata
  projectName: 'Untitled Project',
  version: '1.0',

  // Original uploaded image
  originalImage: null,

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
}));

export default useProjectStore;
