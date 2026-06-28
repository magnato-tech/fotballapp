import type { Point } from '../types/geometry';
import type { ColorProfile } from '../types/game';
import { rgbToHsv, hsvInRange } from './colorUtils';

export type BallDetection = {
  found: boolean;
  center: Point;
  confidence: number;
  pixelCount: number;
};

const MIN_BLOB_PIXELS = 8;
const MAX_BLOB_PIXELS = 2000;

/**
 * Find ball marker pixels in the given ImageData, cluster them,
 * and return the estimated ball center + confidence.
 */
export function detectBall(
  imageData: ImageData,
  ballProfile: ColorProfile,
  courtMask?: (p: Point) => boolean,
): BallDetection {
  const { data, width, height } = imageData;
  let sumX = 0, sumY = 0, count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (courtMask && !courtMask({ x, y })) continue;
      const idx = (y * width + x) * 4;
      const [h, s, v] = rgbToHsv(data[idx], data[idx + 1], data[idx + 2]);
      const matched = ballProfile.ranges.some((r) => hsvInRange(h, s, v, r));
      if (matched) {
        sumX += x; sumY += y; count++;
      }
    }
  }

  if (count < MIN_BLOB_PIXELS || count > MAX_BLOB_PIXELS) {
    return { found: false, center: { x: 0, y: 0 }, confidence: 0, pixelCount: count };
  }

  const cx = sumX / count;
  const cy = sumY / count;

  // Confidence: how well the pixel count sits in a plausible range
  const ideal = 60;
  const confidence = Math.min(1, count / ideal) * Math.min(1, ideal / Math.max(count, 1));

  return {
    found: true,
    center: { x: cx, y: cy },
    confidence: Math.min(1, confidence * 2),
    pixelCount: count,
  };
}
