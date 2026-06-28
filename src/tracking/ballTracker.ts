import type { Point } from '../types/geometry';

const SMOOTHING = 0.6; // 0 = no smoothing, 1 = never updates

export class BallTracker {
  private smoothed: Point | null = null;

  update(detected: Point | null): Point | null {
    if (!detected) {
      this.smoothed = null;
      return null;
    }
    if (!this.smoothed) {
      this.smoothed = { ...detected };
    } else {
      this.smoothed = {
        x: this.smoothed.x * SMOOTHING + detected.x * (1 - SMOOTHING),
        y: this.smoothed.y * SMOOTHING + detected.y * (1 - SMOOTHING),
      };
    }
    return { ...this.smoothed };
  }

  get position(): Point | null {
    return this.smoothed ? { ...this.smoothed } : null;
  }

  reset(): void {
    this.smoothed = null;
  }
}
