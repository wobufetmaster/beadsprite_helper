import { createCanvas, loadImage } from '@napi-rs/canvas';

/** Deterministic PRNG so failures are reproducible. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLORS = [
  [255, 255, 255], [20, 20, 30], [230, 60, 90], [250, 180, 200],
  [60, 120, 220], [250, 220, 70], [70, 170, 90], [150, 90, 60],
];

/** A sprite-ish cell grid: background plus overlapping rectangles. */
export function makeSprite(cols, rows, seed) {
  const rand = rng(seed);
  const cells = new Uint8Array(cols * rows); // colour index, 0 = background
  for (let n = 0; n < (cols * rows) / 12; n++) {
    const w = 1 + Math.floor(rand() * 5), h = 1 + Math.floor(rand() * 5);
    const x = Math.floor(rand() * (cols - w)), y = Math.floor(rand() * (rows - h));
    const c = 1 + Math.floor(rand() * (COLORS.length - 1));
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) cells[yy * cols + xx] = c;
  }
  return { cols, rows, cells };
}

/** Nearest-neighbour upscale with a (possibly fractional) scale and offset. */
export function renderSprite(sprite, scale, offsetX = 0, offsetY = 0) {
  const width = Math.round(sprite.cols * scale + offsetX + scale * 0.3);
  const height = Math.round(sprite.rows * scale + offsetY + scale * 0.3);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = Math.floor((x - offsetX) / scale), r = Math.floor((y - offsetY) / scale);
      const inside = c >= 0 && r >= 0 && c < sprite.cols && r < sprite.rows;
      const rgb = COLORS[inside ? sprite.cells[r * sprite.cols + c] : 0];
      const i = (y * width + x) * 4;
      data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

export async function jpegRoundTrip(image, quality = 70) {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  const id = ctx.createImageData(image.width, image.height);
  id.data.set(image.data);
  ctx.putImageData(id, 0, 0);
  const img = await loadImage(await canvas.encode('jpeg', quality));
  return imageDataOf(img);
}

export function imageDataOf(img) {
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
  return { width, height, data };
}

export const SPRITE_COLORS = COLORS;
