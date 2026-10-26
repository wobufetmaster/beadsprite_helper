import { PERLER_COLORS } from '../data/perlerColors.js';
import { HAMA_COLORS } from '../data/hamaColors.js';
import { ARTKAL_S_COLORS } from '../data/artkalSColors.js';

export const PALETTES = {
  perler: { id: 'perler', name: 'Perler', colors: PERLER_COLORS },
  hama: { id: 'hama', name: 'Hama', colors: HAMA_COLORS },
  artkal_s: { id: 'artkal_s', name: 'Artkal S', colors: ARTKAL_S_COLORS },
};

/** Combined bead colours for a list of palette ids. */
export function colorsForPalettes(paletteIds) {
  return paletteIds.flatMap(id => {
    if (!PALETTES[id]) throw new Error(`Unknown palette "${id}" (choose from ${Object.keys(PALETTES).join(', ')})`);
    return PALETTES[id].colors;
  });
}
