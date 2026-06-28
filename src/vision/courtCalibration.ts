import type { Point, Quad } from '../types/geometry';

/**
 * Returns true if a point is inside (or on the edge of) the given convex quad
 * using cross-product sign test.
 */
export function pointInQuad(p: Point, quad: Quad): boolean {
  for (let i = 0; i < 4; i++) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (cross < 0) return false;
  }
  return true;
}

/**
 * Estimate the pixel-per-meter scale from the court quad and real dimensions.
 * Uses the average of width and height ratios.
 */
export function pixelsPerMeter(quad: Quad, realWidthM: number, realHeightM: number): number {
  const topWidth = Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y);
  const botWidth = Math.hypot(quad[2].x - quad[3].x, quad[2].y - quad[3].y);
  const leftHeight = Math.hypot(quad[3].x - quad[0].x, quad[3].y - quad[0].y);
  const rightHeight = Math.hypot(quad[2].x - quad[1].x, quad[2].y - quad[1].y);
  const pxPerMW = ((topWidth + botWidth) / 2) / realWidthM;
  const pxPerMH = ((leftHeight + rightHeight) / 2) / realHeightM;
  return (pxPerMW + pxPerMH) / 2;
}

/**
 * Scale a pixel distance to meters given pixels-per-meter ratio.
 */
export function pixelsToMeters(pixelDistance: number, ppm: number): number {
  return ppm > 0 ? pixelDistance / ppm : 0;
}
