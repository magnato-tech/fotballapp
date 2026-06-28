import { useRef, useEffect, useState } from 'react';
import type { Quad } from '../types/geometry';
import { CameraService } from '../camera/CameraService';
import { FrameProcessor } from '../vision/frameProcessor';
import { BallTracker } from '../tracking/ballTracker';
import { PossessionTracker } from '../tracking/possessionTracker';
import { PassDetector } from '../tracking/passDetector';
import { pixelsPerMeter } from '../vision/courtCalibration';
import { useGameStore } from '../game/gameState';
import { ScoreBar } from './ScoreBar';
import { TimeBar } from './TimeBar';
import type { PassEvent } from '../types/game';

const FRAME_INTERVAL_MS = 50; // ~20 fps analysis

export function LiveGameScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef(new CameraService());
  const processorRef = useRef(new FrameProcessor());
  const ballTrackerRef = useRef(new BallTracker());
  const possTrackerRef = useRef(new PossessionTracker());
  const passDetectorRef = useRef<PassDetector | null>(null);
  const animRef = useRef<number>(0);
  const lastAnalysisRef = useRef(0);

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  const {
    courtCalib, ballCalib, teams, rules, phase, score, momentumA,
    possession, fps, ballConfidence, showDebug, eventLog,
    updateLive, recordPass, adjustScore, startRound, pauseRound,
    resumeRound, resetRound, endRound, toggleDebug,
  } = useGameStore();

  const teamA = teams.find((t) => t.teamId === 'A');
  const teamB = teams.find((t) => t.teamId === 'B');
  const colorA = teamA?.displayColor ?? '#e53e3e';
  const colorB = teamB?.displayColor ?? '#3182ce';
  const nameA = teamA?.displayName ?? 'Lag A';
  const nameB = teamB?.displayName ?? 'Lag B';

  // Pass handler
  useEffect(() => {
    passDetectorRef.current = new PassDetector((event: PassEvent) => {
      recordPass(event);
      const name = event.teamId === 'A' ? nameA : nameB;
      setFlash(`⚽ ${name} — pasning!`);
      setTimeout(() => setFlash(null), 1500);
    });
  }, [recordPass, nameA, nameB]);

  // Camera
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    cameraRef.current.start(vid).catch(console.error);
    return () => { cameraRef.current.stop(); cancelAnimationFrame(animRef.current); };
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    const startTime = useGameStore.getState().roundStartTime ?? Date.now();
    const total = rules.roundDurationSeconds * 1000;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (total - elapsed) / 1000);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        endRound();
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [phase, rules.roundDurationSeconds, endRound]);

  // Analysis loop
  const ppm = courtCalib
    ? pixelsPerMeter(
        courtCalib.imagePoints as Quad,
        courtCalib.realWidthMeters,
        courtCalib.realHeightMeters,
      )
    : 100;

  useEffect(() => {
    const loop = (now: number) => {
      animRef.current = requestAnimationFrame(loop);

      const video = videoRef.current;
      const canvas = overlayRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      // Throttle analysis
      const shouldAnalyze =
        phase === 'playing' && now - lastAnalysisRef.current >= FRAME_INTERVAL_MS;

      if (shouldAnalyze && ballCalib) {
        lastAnalysisRef.current = now;
        const result = processorRef.current.process(
          video,
          ballCalib,
          teams,
          courtCalib?.imagePoints as Quad ?? null,
        );

        const rawBallPos = result.ball.found ? result.ball.center : null;
        // Scale from analysis space to video space
        const ballDisplayPos = rawBallPos
          ? processorRef.current.toDisplayPoint(rawBallPos, video)
          : null;

        // Scale team blobs to display space
        const scaledTeams = result.teams.map((b) => ({
          ...b,
          controlPoint: processorRef.current.toDisplayPoint(b.controlPoint, video),
          center: processorRef.current.toDisplayPoint(b.center, video),
        }));

        const smoothedBall = ballTrackerRef.current.update(ballDisplayPos);

        const possResult = possTrackerRef.current.update(
          smoothedBall,
          result.ball.confidence,
          scaledTeams,
          rules,
          ppm,
          now,
        );

        passDetectorRef.current?.update(
          possResult.team,
          possResult.state,
          smoothedBall,
          rules,
          ppm,
          now,
        );

        updateLive({
          possession: possResult.state,
          ballPos: smoothedBall,
          fps: result.fps,
          ballConfidence: result.ball.confidence,
        });

        // Draw overlay
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Court polygon
        if (courtCalib) {
          const scaleX = video.clientWidth / video.videoWidth;
          const scaleY = video.clientHeight / video.videoHeight;
          ctx.beginPath();
          courtCalib.imagePoints.forEach((p, i) => {
            const px = p.x * scaleX, py = p.y * scaleY;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          });
          ctx.closePath();
          ctx.strokeStyle = 'rgba(56,189,248,0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Team blobs
        scaledTeams.forEach((b) => {
          const col = b.teamId === 'A' ? colorA : colorB;
          // Control point
          ctx.beginPath();
          ctx.arc(b.controlPoint.x, b.controlPoint.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.globalAlpha = 0.8;
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        // Ball
        if (smoothedBall) {
          const possColor =
            possResult.state === 'controlled_by_A'
              ? colorA
              : possResult.state === 'controlled_by_B'
              ? colorB
              : possResult.state === 'contested'
              ? '#facc15'
              : '#ffffff';

          ctx.beginPath();
          ctx.arc(smoothedBall.x, smoothedBall.y, 14, 0, Math.PI * 2);
          ctx.fillStyle = possColor;
          ctx.globalAlpha = 0.85;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Debug overlay
        if (showDebug) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(8, 8, 200, 100);
          ctx.fillStyle = '#fff';
          ctx.font = '13px monospace';
          ctx.fillText(`FPS: ${result.fps.toFixed(1)}`, 16, 28);
          ctx.fillText(`Ball conf: ${(result.ball.confidence * 100).toFixed(0)}%`, 16, 46);
          ctx.fillText(`State: ${possResult.state}`, 16, 64);
          ctx.fillText(`Dist: ${possResult.nearestDistancePx.toFixed(0)}px`, 16, 82);
          ctx.fillText(`PPM: ${ppm.toFixed(1)}`, 16, 100);
        }
      }
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, ballCalib, teams, courtCalib, rules, ppm, updateLive, showDebug, colorA, colorB]);

  // Reset trackers on round start
  useEffect(() => {
    if (phase === 'playing') {
      ballTrackerRef.current.reset();
      possTrackerRef.current.reset();
      passDetectorRef.current?.reset?.();
    }
  }, [phase]);

  const possColor =
    possession === 'controlled_by_A'
      ? colorA
      : possession === 'controlled_by_B'
      ? colorB
      : possession === 'contested'
      ? '#facc15'
      : 'var(--text-muted)';

  const possLabel =
    possession === 'controlled_by_A'
      ? nameA
      : possession === 'controlled_by_B'
      ? nameB
      : possession === 'contested'
      ? 'Duell'
      : possession === 'lost'
      ? 'Ingen ball'
      : 'Fri';

  return (
    <div className="screen">
      {/* Camera + overlay — top half */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: '#000' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <canvas
          ref={overlayRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />

        {/* Possession badge */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.65)',
            borderRadius: 20,
            padding: '4px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: possColor, display: 'inline-block' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: possColor }}>{possLabel}</span>
        </div>

        {/* Pass flash */}
        {flash && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.8)',
              color: '#4ade80',
              borderRadius: 20,
              padding: '6px 20px',
              fontWeight: 800,
              fontSize: '1rem',
              whiteSpace: 'nowrap',
            }}
          >
            {flash}
          </div>
        )}
      </div>

      {/* Bottom HUD */}
      <div
        style={{
          background: 'var(--surface)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <ScoreBar
          score={score}
          momentum={momentumA}
          teamAColor={colorA}
          teamBColor={colorB}
          teamAName={nameA}
          teamBName={nameB}
        />

        <TimeBar
          secondsRemaining={secondsLeft}
          totalSeconds={rules.roundDurationSeconds}
        />

        {/* Manual correction */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => adjustScore('A', -1)}
              style={{ background: 'var(--surface2)', color: colorA, padding: '6px 12px', fontSize: '0.85rem' }}
            >−1</button>
            <button
              onClick={() => adjustScore('A', 1)}
              style={{ background: 'var(--surface2)', color: colorA, padding: '6px 12px', fontSize: '0.85rem' }}
            >+1</button>
          </div>

          {/* Control buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            {phase === 'setup' && (
              <button
                onClick={startRound}
                style={{ background: '#16a34a', color: '#fff', padding: '8px 18px' }}
              >
                ▶ Start
              </button>
            )}
            {phase === 'playing' && (
              <button
                onClick={pauseRound}
                style={{ background: '#ca8a04', color: '#fff', padding: '8px 14px' }}
              >
                ⏸ Pause
              </button>
            )}
            {phase === 'paused' && (
              <button
                onClick={resumeRound}
                style={{ background: '#16a34a', color: '#fff', padding: '8px 14px' }}
              >
                ▶ Fortsett
              </button>
            )}
            <button
              onClick={resetRound}
              style={{ background: 'var(--surface2)', color: 'var(--text)', padding: '8px 12px' }}
            >
              ↺
            </button>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => adjustScore('B', 1)}
              style={{ background: 'var(--surface2)', color: colorB, padding: '6px 12px', fontSize: '0.85rem' }}
            >+1</button>
            <button
              onClick={() => adjustScore('B', -1)}
              style={{ background: 'var(--surface2)', color: colorB, padding: '6px 12px', fontSize: '0.85rem' }}
            >−1</button>
          </div>
        </div>

        {/* Debug toggle */}
        <button
          onClick={toggleDebug}
          style={{
            background: 'transparent',
            color: showDebug ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: '0.75rem',
            padding: '2px 6px',
            textDecoration: 'underline',
            alignSelf: 'center',
          }}
        >
          {showDebug ? 'Skjul debug' : 'Vis debug (trener)'}
        </button>

        {showDebug && (
          <div
            style={{
              background: 'var(--surface2)',
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: '0.72rem',
              fontFamily: 'monospace',
              color: 'var(--text-muted)',
              maxHeight: 100,
              overflowY: 'auto',
            }}
          >
            <div>FPS: {fps.toFixed(1)} | Conf: {(ballConfidence * 100).toFixed(0)}%</div>
            {eventLog.slice(0, 6).map((e, i) => (
              <div key={i}>
                {new Date(e.timestamp).toLocaleTimeString()} — {e.teamId === 'A' ? nameA : nameB} {e.distanceMeters.toFixed(1)}m
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
