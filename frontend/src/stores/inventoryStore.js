import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useInventoryStore = create(
  persist(
    (set) => ({
      // Owned bead colors
      ownedColors: [],

      // Add a color to inventory
      addColor: (color) =>
        set((state) => ({
          ownedColors: [...state.ownedColors, color],
        })),

      // Remove a color from inventory
      removeColor: (colorId) =>
        set((state) => ({
          ownedColors: state.ownedColors.filter((c) => c.id !== colorId),
        })),

      // Toggle a color in inventory
      toggleColor: (color) =>
        set((state) => {
          const exists = state.ownedColors.some((c) => c.id === color.id);
          if (exists) {
            return {
              ownedColors: state.ownedColors.filter((c) => c.id !== color.id),
            };
          } else {
            return {
              ownedColors: [...state.ownedColors, color],
            };
          }
        }),

      // Check if color is owned
      isOwned: (colorId) => (state) =>
        state.ownedColors.some((c) => c.id === colorId),

      // Clear all owned colors
      clearInventory: () => set({ ownedColors: [] }),

      // Set owned colors (bulk)
      setOwnedColors: (colors) => set({ ownedColors: colors }),
    }),
    {
      name: 'beadsprite-inventory',
    }
  )
);

export default useInventoryStore;
