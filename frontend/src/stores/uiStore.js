import { create } from 'zustand';

const useUIStore = create((set) => ({
  // Active tool
  activeTool: 'select', // 'select', 'parse', 'manual-grid', 'color-picker'

  // Grid visibility
  showGrid: true,

  // Selected colors
  selectedImageColor: null,
  selectedBeadColor: null,

  // Preview mode
  previewMode: 'mapped', // 'original', 'mapped', 'split'

  // Loading state
  isLoading: false,
  loadingMessage: '',

  // Error state
  error: null,

  // Zoom/pan
  zoom: 1.0,
  pan: { x: 0, y: 0 },

  // Actions
  setActiveTool: (tool) => set({ activeTool: tool }),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  setSelectedImageColor: (color) => set({ selectedImageColor: color }),

  setSelectedBeadColor: (color) => set({ selectedBeadColor: color }),

  setPreviewMode: (mode) => set({ previewMode: mode }),

  setLoading: (isLoading, message = '') =>
    set({ isLoading, loadingMessage: message }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),

  setPan: (pan) => set({ pan }),

  resetView: () => set({ zoom: 1.0, pan: { x: 0, y: 0 } }),
}));

export default useUIStore;
