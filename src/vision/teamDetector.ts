import type { Point } from '../types/geometry';
import type { TeamId, TeamCalibration } from '../types/game';
import { rgbToHsv, hsvInRange } from './colorUtils';

export type TeamBlob = {
  teamId: TeamId;
  /** Centroid of the color blob */
  center: Point;
  /** Estimated foot/control point (bottom-most point of blob) */
  controlPoint: Point;
  pixelCount: number;
};

const MIN_TEAM_PIXELS = 20;
const SEARCH_RADIUS_PX = 120;

/**
 * Find team color blobs near the ball position in the image.
 * Returns the nearest control point per team found.
 */
export function detectTeamBlobs(
  imageData: ImageData,
  teamCalibrations: TeamCalibration[],
  ballCenter: Point,
  courtMask?: (p: Point) => boolean,
): TeamBlob[] {
  const { data, width, height } = imageData;
  const results: TeamBlob[] = [];

  for (const team of teamCalibrations) {
    let sumX = 0, sumY = 0, maxY = -Infinity, count = 0;
    let bottomX = 0;

    const xMin = Math.max(0, Math.floor(ballCenter.x - SEARCH_RADIUS_PX));
    const xMax = Math.min(width - 1, Math.ceil(ballCenter.x + SEARCH_RADIUS_PX));
    const yMin = Math.max(0, Math.floor(ballCenter.y - SEARCH_RADIUS_PX));
    const yMax = Math.min(height - 1, Math.ceil(ballCenter.y + SEARCH_RADIUS_PX));

    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        if (courtMask && !courtMask({ x, y })) continue;
        const idx = (y * width + x) * 4;
        const [h, s, v] = rgbToHsv(data[idx], data[idx + 1], data[idx + 2]);
        const matched = team.colorProfile.ranges.some((r) => hsvInRange(h, s, v, r));
        if (matched) {
          sumX += x; sumY += y; count++;
          if (y > maxY) { maxY = y; bottomX = x; }
        }
      }
    }

    if (count >= MIN_TEAM_PIXELS) {
      results.push({
        teamId: team.teamId,
        center: { x: sumX / count, y: sumY / count },
        controlPoint: { x: bottomX, y: maxY },
        pixelCount: count,
      });
    }
  }

  return results;
}
