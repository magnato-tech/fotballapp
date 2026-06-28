import { create } from 'zustand';
import type { Point } from '../types/geometry';
import type {
  TeamCalibration,
  CourtCalibration,
  BallCalibration,
  PossessionState,
  PassEvent,
  GameRules,
  GamePhase,
  Score,
  TeamId,
} from '../types/game';
import { DEFAULT_RULES } from '../types/game';

const MAX_EVENT_LOG = 30;

export type CalibStep = 'court' | 'ball' | 'teamA' | 'teamB' | 'done';

export type AppState = {
  // Calibration
  calibStep: CalibStep;
  courtCalib: CourtCalibration | null;
  ballCalib: BallCalibration | null;
  teams: TeamCalibration[];

  // Game config
  rules: GameRules;
  phase: GamePhase;
  roundStartTime: number | null;
  roundEndTime: number | null;

  // Live state
  score: Score;
  possession: PossessionState;
  ballPos: Point | null;
  fps: number;
  ballConfidence: number;
  eventLog: PassEvent[];
  momentumA: number; // 0-1 (1 = fully A)

  // Debug
  showDebug: boolean;
};

type Actions = {
  setCalibStep: (step: CalibStep) => void;
  setCourtCalib: (c: CourtCalibration) => void;
  setBallCalib: (c: BallCalibration) => void;
  setTeams: (teams: TeamCalibration[]) => void;
  setRules: (r: Partial<GameRules>) => void;

  startRound: () => void;
  pauseRound: () => void;
  resumeRound: () => void;
  resetRound: () => void;
  endRound: () => void;

  recordPass: (event: PassEvent) => void;
  adjustScore: (team: TeamId, delta: number) => void;

  updateLive: (data: {
    possession: PossessionState;
    ballPos: Point | null;
    fps: number;
    ballConfidence: number;
  }) => void;

  toggleDebug: () => void;
};

export const useGameStore = create<AppState & Actions>((set) => ({
  calibStep: 'court',
  courtCalib: null,
  ballCalib: null,
  teams: [],

  rules: DEFAULT_RULES,
  phase: 'calibration',
  roundStartTime: null,
  roundEndTime: null,

  score: { A: 0, B: 0 },
  possession: 'free',
  ballPos: null,
  fps: 0,
  ballConfidence: 0,
  eventLog: [],
  momentumA: 0.5,

  showDebug: false,

  setCalibStep: (step) => set({ calibStep: step }),
  setCourtCalib: (c) => set({ courtCalib: c }),
  setBallCalib: (c) => set({ ballCalib: c }),
  setTeams: (teams) => set({ teams }),
  setRules: (r) => set((s) => ({ rules: { ...s.rules, ...r } })),

  startRound: () =>
    set({ phase: 'playing', roundStartTime: Date.now(), roundEndTime: null, score: { A: 0, B: 0 }, eventLog: [], momentumA: 0.5 }),

  pauseRound: () => set({ phase: 'paused' }),

  resumeRound: () => set({ phase: 'playing' }),

  resetRound: () =>
    set({ phase: 'setup', roundStartTime: null, roundEndTime: null, score: { A: 0, B: 0 }, eventLog: [], momentumA: 0.5 }),

  endRound: () => set({ phase: 'ended', roundEndTime: Date.now() }),

  recordPass: (event) =>
    set((s) => {
      const newScore = { ...s.score, [event.teamId]: s.score[event.teamId] + 1 };
      const newLog = [event, ...s.eventLog].slice(0, MAX_EVENT_LOG);
      // Shift momentum slightly toward scoring team
      const newMomentum =
        event.teamId === 'A'
          ? Math.min(1, s.momentumA + 0.08)
          : Math.max(0, s.momentumA - 0.08);
      return { score: newScore, eventLog: newLog, momentumA: newMomentum };
    }),

  adjustScore: (team, delta) =>
    set((s) => ({
      score: { ...s.score, [team]: Math.max(0, s.score[team] + delta) },
    })),

  updateLive: ({ possession, ballPos, fps, ballConfidence }) =>
    set((s) => {
      // Drift momentum toward current possession
      let momentum = s.momentumA;
      if (possession === 'controlled_by_A') momentum = Math.min(1, momentum + 0.01);
      else if (possession === 'controlled_by_B') momentum = Math.max(0, momentum - 0.01);
      else momentum += (0.5 - momentum) * 0.005; // drift to center when free
      return { possession, ballPos, fps, ballConfidence, momentumA: momentum };
    }),

  toggleDebug: () => set((s) => ({ showDebug: !s.showDebug })),
}));
