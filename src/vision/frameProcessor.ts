import type { Point, Quad } from '../types/geometry';
import type { BallCalibration, TeamCalibration } from '../types/game';
import { detectBall, type BallDetection } from './ballDetector';
import { detectTeamBlobs, type TeamBlob } from './teamDetector';
import { pointInQuad } from './courtCalibration';

export type FrameResult = {
  ball: BallDetection;
  teams: TeamBlob[];
  fps: number;
};

const ANALYSIS_WIDTH = 320;
const ANALYSIS_HEIGHT = 180;

export class FrameProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastFrameTime = 0;
  private fpsSamples: number[] = [];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ANALYSIS_WIDTH;
    this.canvas.height = ANALYSIS_HEIGHT;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  process(
    video: HTMLVideoElement,
    ballCalib: BallCalibration,
    teams: TeamCalibration[],
    courtQuad: Quad | null,
  ): FrameResult {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Rolling FPS average over 10 frames
    if (delta > 0) {
      this.fpsSamples.push(1000 / delta);
      if (this.fpsSamples.length > 10) this.fpsSamples.shift();
    }
    const fps = this.fpsSamples.reduce((a, b) => a + b, 0) / (this.fpsSamples.length || 1);

    this.ctx.drawImage(video, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
    const imageData = this.ctx.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);

    // Scale the court quad to analysis resolution
    let scaledQuad: Quad | null = null;
    if (courtQuad && video.videoWidth > 0) {
      const scaleX = ANALYSIS_WIDTH / video.videoWidth;
      const scaleY = ANALYSIS_HEIGHT / video.videoHeight;
      scaledQuad = courtQuad.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY })) as Quad;
    }

    const courtMask = scaledQuad
      ? (p: Point) => pointInQuad(p, scaledQuad!)
      : undefined;

    const ball = detectBall(imageData, ballCalib.colorProfile, courtMask);

    const teamBlobs = ball.found
      ? detectTeamBlobs(imageData, teams, ball.center, courtMask)
      : [];

    return { ball, teams: teamBlobs, fps };
  }

  /** Scale a point from analysis-space back to video-display space. */
  toDisplayPoint(p: Point, video: HTMLVideoElement): Point {
    if (video.videoWidth === 0) return p;
    return {
      x: (p.x / ANALYSIS_WIDTH) * video.videoWidth,
      y: (p.y / ANALYSIS_HEIGHT) * video.videoHeight,
    };
  }
}
