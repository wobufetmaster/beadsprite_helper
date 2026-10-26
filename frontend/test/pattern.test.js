import { describe, it, expect } from 'vitest';
import { buildPattern } from '../src/core/pattern.js';
import { colorsForPalettes } from '../src/core/palettes.js';
import { makeSprite, renderSprite, jpegRoundTrip } from './helpers.js';

const beads = colorsForPalettes(['perler']);

describe('buildPattern', () => {
  it('maps each sprite colour to one bead despite JPEG noise', async () => {
    const art = renderSprite(makeSprite(32, 32, 42), 9.5, 3, 3);
    const counts = p => Object.fromEntries(p.legend.map(l => [l.beadId, l.count]));
    const clean = buildPattern(art, { beads });

    // Typical web JPEG: identical bead counts to the clean source
    const q70 = buildPattern(await jpegRoundTrip(art, 70), { beads });
    expect(counts(q70)).toEqual(counts(clean));

    // Heavy compression: merging still removes most of the stray beads
    const q50 = await jpegRoundTrip(art, 50);
    const merged = buildPattern(q50, { beads });
    const unmerged = buildPattern(q50, { beads, mergeThreshold: 0 });
    expect(merged.legend.length).toBeLessThan(unmerged.legend.length);
    expect(merged.legend.length).toBeLessThanOrEqual(clean.legend.length + 3);
  });

  it('strips a white background and labels every colour', () => {
    const p = buildPattern(renderSprite(makeSprite(20, 20, 3), 6), { beads });
    expect(p.legend.find(l => l.beadId === 'white')).toBeUndefined();
    for (const item of p.legend) expect(item.label).toMatch(/^[A-L]\d+$/);
  });

  it('honours a manual grid', () => {
    const p = buildPattern(renderSprite(makeSprite(20, 10, 3), 4), { beads, grid: { cellWidth: 4 } });
    expect(p.cells.width).toBe(20);
    expect(p.cells.height).toBe(10);
  });
});
