import type { Point } from '../types/geometry';
import type { TeamId, PossessionState, GameRules } from '../types/game';
import type { TeamBlob } from '../vision/teamDetector';

export type PossessionResult = {
  state: PossessionState;
  team: TeamId | null;
  confidence: number;
  nearestDistancePx: number;
};

export class PossessionTracker {
  private candidateTeam: TeamId | null = null;
  private candidateSince = 0;
  private confirmedTeam: TeamId | null = null;
  private lastSeenBallTime = 0;

  update(
    ballPos: Point | null,
    ballConfidence: number,
    teamBlobs: TeamBlob[],
    rules: GameRules,
    ppm: number, // pixels per meter
    now: number,
  ): PossessionResult {
    if (!ballPos || ballConfidence < rules.confidenceThreshold) {
      const timeSinceSeen = now - this.lastSeenBallTime;
      if (timeSinceSeen > rules.lostTimeoutMs) {
        this.candidateTeam = null;
        this.confirmedTeam = null;
        return { state: 'lost', team: null, confidence: 0, nearestDistancePx: Infinity };
      }
      return { state: 'free', team: null, confidence: ballConfidence, nearestDistancePx: Infinity };
    }

    this.lastSeenBallTime = now;

    const controlPx = rules.controlRadiusMeters * ppm;
    const takeoverPx = rules.takeoverRadiusMeters * ppm;
    const marginPx = rules.takeoverMarginMeters * ppm;

    // Find distances from each team blob control point to ball
    const distances = teamBlobs.map((b) => ({
      teamId: b.teamId,
      dist: Math.hypot(b.controlPoint.x - ballPos.x, b.controlPoint.y - ballPos.y),
    }));
    distances.sort((a, b) => a.dist - b.dist);

    const nearest = distances[0] ?? null;
    const second = distances[1] ?? null;

    const nearestDist = nearest?.dist ?? Infinity;

    // Both teams inside control zone → contested
    if (nearest && second && nearest.dist < controlPx && second.dist < controlPx) {
      // Only contested if the difference is within margin
      if (second.dist - nearest.dist < marginPx) {
        return {
          state: 'contested',
          team: this.confirmedTeam,
          confidence: ballConfidence,
          nearestDistancePx: nearestDist,
        };
      }
    }

    // No one in control zone
    if (!nearest || nearest.dist > controlPx) {
      this.candidateTeam = null;
      if (!nearest || nearest.dist > controlPx * 2) {
        this.confirmedTeam = null;
      }
      return {
        state: 'free',
        team: this.confirmedTeam,
        confidence: ballConfidence,
        nearestDistancePx: nearestDist,
      };
    }

    // Nearest team is in control zone
    const incoming = nearest.teamId;

    // Takeover hysteresis: require extra closeness to switch possession
    if (this.confirmedTeam && this.confirmedTeam !== incoming) {
      if (nearest.dist > takeoverPx) {
        // Not close enough to take over yet
        return {
          state: `controlled_by_${this.confirmedTeam}` as PossessionState,
          team: this.confirmedTeam,
          confidence: ballConfidence,
          nearestDistancePx: nearestDist,
        };
      }
    }

    // Candidate confirmation
    if (this.candidateTeam !== incoming) {
      this.candidateTeam = incoming;
      this.candidateSince = now;
    }

    if (now - this.candidateSince >= rules.confirmMs) {
      this.confirmedTeam = incoming;
    }

    const effectiveTeam = this.confirmedTeam ?? this.candidateTeam;

    return {
      state: effectiveTeam
        ? (`controlled_by_${effectiveTeam}` as PossessionState)
        : 'free',
      team: effectiveTeam,
      confidence: ballConfidence,
      nearestDistancePx: nearestDist,
    };
  }

  reset(): void {
    this.candidateTeam = null;
    this.candidateSince = 0;
    this.confirmedTeam = null;
    this.lastSeenBallTime = 0;
  }
}
