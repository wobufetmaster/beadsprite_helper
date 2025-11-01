import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERLER_COLORS } from '../data/perlerColors';
import { HAMA_COLORS } from '../data/hamaColors';
import { ARTKAL_S_COLORS } from '../data/artkalSColors';

// Palette definitions
const PALETTES = {
  perler: {
    id: 'perler',
    name: 'Perler',
    colors: PERLER_COLORS
  },
  hama: {
    id: 'hama',
    name: 'Hama',
    colors: HAMA_COLORS
  },
  artkal_s: {
    id: 'artkal_s',
    name: 'Artkal S',
    colors: ARTKAL_S_COLORS
  }
};

const usePaletteStore = create(
  persist(
    (set, get) => ({
      // Selected palette IDs (array to support multi-selection)
      selectedPalettes: ['perler'],

      // Toggle palette selection
      togglePalette: (paletteId) => {
        const { selectedPalettes } = get();

        if (selectedPalettes.includes(paletteId)) {
          // Deselect - but ensure at least one palette remains selected
          const newSelection = selectedPalettes.filter(id => id !== paletteId);
          if (newSelection.length > 0) {
            set({ selectedPalettes: newSelection });
          }
        } else {
          // Select
          set({ selectedPalettes: [...selectedPalettes, paletteId] });
        }
      },

      // Get combined colors from all selected palettes
      getAvailableColors: () => {
        const { selectedPalettes } = get();
        const allColors = [];

        selectedPalettes.forEach(paletteId => {
          if (PALETTES[paletteId]) {
            allColors.push(...PALETTES[paletteId].colors);
          }
        });

        return allColors;
      },

      // Check if a palette is selected
      isPaletteSelected: (paletteId) => {
        return get().selectedPalettes.includes(paletteId);
      },

      // Get all available palettes
      getAllPalettes: () => {
        return Object.values(PALETTES);
      }
    }),
    {
      name: 'palette-storage', // LocalStorage key
      partialize: (state) => ({ selectedPalettes: state.selectedPalettes })
    }
  )
);

export default usePaletteStore;
