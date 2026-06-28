import type { HsvRange } from '../types/game';

/**
 * Convert an RGB pixel (0-255 each) to HSV (H: 0-360, S: 0-1, V: 0-1).
 */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta > 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return [h, s, v];
}

/**
 * Returns true if the HSV value is within the given range.
 * Handles hue wraparound (e.g., red: 340-360 and 0-10).
 */
export function hsvInRange(h: number, s: number, v: number, range: HsvRange): boolean {
  if (s < range.sMin || s > range.sMax) return false;
  if (v < range.vMin || v > range.vMax) return false;
  if (range.hMin <= range.hMax) {
    return h >= range.hMin && h <= range.hMax;
  }
  // Wraparound case (e.g., red)
  return h >= range.hMin || h <= range.hMax;
}

/**
 * Sample a region of an ImageData and compute the mean HSV.
 * Returns null if the region is too dark/unsaturated to be useful.
 */
export function sampleRegionMeanHsv(
  data: ImageData,
  x: number,
  y: number,
  w: number,
  h: number,
): [number, number, number] | null {
  let sumH = 0, sumS = 0, sumV = 0, count = 0;
  const { data: pixels, width } = data;

  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      const idx = (row * width + col) * 4;
      const [hv, sv, vv] = rgbToHsv(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
      sumH += hv; sumS += sv; sumV += vv;
      count++;
    }
  }
  if (count === 0) return null;
  return [sumH / count, sumS / count, sumV / count];
}

/**
 * Build an HsvRange from a sampled mean, with generous tolerances.
 */
export function buildHsvRange(mean: [number, number, number], hTol = 25, sTol = 0.3, vTol = 0.35): HsvRange {
  const [h, s, v] = mean;
  return {
    hMin: (h - hTol + 360) % 360,
    hMax: (h + hTol) % 360,
    sMin: Math.max(0, s - sTol),
    sMax: Math.min(1, s + sTol),
    vMin: Math.max(0.1, v - vTol),
    vMax: Math.min(1, v + vTol),
  };
}
