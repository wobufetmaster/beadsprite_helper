import { create } from 'zustand';
import api from '../services/api';
import { useUIStore } from './uiStore';

const useProjectStore = create((set) => ({
  // Project metadata
  projectName: 'Untitled Project',
  version: '1.0',

  // Original uploaded image
  originalImage: null,

  // Uploaded image info
  uploadedImage: null, // { preview, width, height, format }

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

  // Upload image to backend
  uploadImage: async (file) => {
    const { setLoading, setError, clearError } = useUIStore.getState();

    try {
      setLoading(true);
      clearError();

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload to backend
      const response = await api.post('/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;

      // Create preview URL
      const preview = URL.createObjectURL(file);

      // Update store
      set({
        uploadedImage: {
          preview,
          width: data.width,
          height: data.height,
          format: data.format,
        },
        originalImage: file,
        parsedPixels: data.pixels,
      });

      return data;
    } catch (error) {
      console.error('Image upload failed:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to upload image';
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

export { useProjectStore };
export default useProjectStore;
