import type { Point } from './geometry';

export type TeamId = 'A' | 'B';

export type HsvRange = {
  hMin: number; hMax: number;
  sMin: number; sMax: number;
  vMin: number; vMax: number;
};

export type ColorProfile = {
  name: string;
  ranges: HsvRange[];
};

export type TeamCalibration = {
  teamId: TeamId;
  displayName: string;
  colorProfile: ColorProfile;
  /** CSS color used in the UI, e.g. '#e53e3e' */
  displayColor: string;
};

export type CourtCalibration = {
  /** 4 image-space points: TL, TR, BR, BL */
  imagePoints: [Point, Point, Point, Point];
  realWidthMeters: number;
  realHeightMeters: number;
};

export type BallCalibration = {
  colorProfile: ColorProfile;
};

export type PossessionState =
  | 'controlled_by_A'
  | 'controlled_by_B'
  | 'free'
  | 'contested'
  | 'lost';

export type PassEvent = {
  teamId: TeamId;
  from: Point;
  to: Point;
  distanceMeters: number;
  timestamp: number;
};

export type GameRules = {
  roundDurationSeconds: number;
  minPassDistanceMeters: number;
  maxReceiveTimeMs: number;
  controlRadiusMeters: number;
  takeoverRadiusMeters: number;
  takeoverMarginMeters: number;
  confirmMs: number;
  lostTimeoutMs: number;
  confidenceThreshold: number;
};

export const DEFAULT_RULES: GameRules = {
  roundDurationSeconds: 90,
  minPassDistanceMeters: 0.5,
  maxReceiveTimeMs: 2000,
  controlRadiusMeters: 0.5,
  takeoverRadiusMeters: 0.4,
  takeoverMarginMeters: 0.15,
  confirmMs: 300,
  lostTimeoutMs: 1500,
  confidenceThreshold: 0.4,
};

export type GamePhase = 'calibration' | 'setup' | 'playing' | 'paused' | 'ended';

export type Score = { A: number; B: number };
