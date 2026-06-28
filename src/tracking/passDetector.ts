import type { Point } from '../types/geometry';
import type { TeamId, GameRules, PassEvent } from '../types/game';

type ControlSnapshot = {
  team: TeamId;
  ballPos: Point;
  time: number;
};

export class PassDetector {
  private lastControl: ControlSnapshot | null = null;
  private pendingLoss: ControlSnapshot | null = null;
  private pendingLossTime = 0;
  private onPass: (event: PassEvent) => void;

  constructor(onPass: (event: PassEvent) => void) {
    this.onPass = onPass;
  }

  update(
    possession: TeamId | null,
    state: string,
    ballPos: Point | null,
    rules: GameRules,
    ppm: number,
    now: number,
  ): void {
    if (!ballPos) return;

    const isContested = state === 'contested';

    if (isContested) {
      // Contested: freeze detection, don't award passes
      return;
    }

    if (!possession) {
      // Ball is free — track when the last controlling team lost the ball
      if (this.lastControl && !this.pendingLoss) {
        this.pendingLoss = { ...this.lastControl };
        this.pendingLossTime = now;
      }
      this.lastControl = null;
      return;
    }

    // A team has possession
    if (!this.lastControl) {
      // Fresh control — check if this follows a pending loss by the SAME team
      if (
        this.pendingLoss &&
        this.pendingLoss.team === possession &&
        now - this.pendingLossTime <= rules.maxReceiveTimeMs
      ) {
        // Same team regained control — check distance
        const dx = ballPos.x - this.pendingLoss.ballPos.x;
        const dy = ballPos.y - this.pendingLoss.ballPos.y;
        const distPx = Math.hypot(dx, dy);
        const distM = ppm > 0 ? distPx / ppm : 0;

        if (distM >= rules.minPassDistanceMeters) {
          this.onPass({
            teamId: possession,
            from: this.pendingLoss.ballPos,
            to: { ...ballPos },
            distanceMeters: distM,
            timestamp: now,
          });
        }
      }
      this.pendingLoss = null;
      this.lastControl = { team: possession, ballPos: { ...ballPos }, time: now };
      return;
    }

    if (this.lastControl.team === possession) {
      // Continued control — update ball position reference continuously
      this.lastControl.ballPos = { ...ballPos };
    } else {
      // Possession changed to other team — discard any pending pass
      this.pendingLoss = null;
      this.lastControl = { team: possession, ballPos: { ...ballPos }, time: now };
    }
  }

  reset(): void {
    this.lastControl = null;
    this.pendingLoss = null;
  }
}
