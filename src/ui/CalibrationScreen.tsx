import { useRef, useEffect, useState, useCallback } from 'react';
import type { Point } from '../types/geometry';
import type { TeamId, ColorProfile, HsvRange } from '../types/game';
import { CameraService } from '../camera/CameraService';
import { sampleRegionMeanHsv, buildHsvRange } from '../vision/colorUtils';
import { useGameStore } from '../game/gameState';

const SAMPLE_SIZE = 60; // px square used for color sampling

type ScanMode = 'idle' | 'ball' | 'teamA' | 'teamB';

const TEAM_DEFAULTS: Record<TeamId, { name: string; color: string }> = {
  A: { name: 'Rødt lag', color: '#e53e3e' },
  B: { name: 'Blått lag', color: '#3182ce' },
};

export function CalibrationScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef(new CameraService());

  const [cameraError, setCameraError] = useState<string | null>(null);

  // Court corners (in video display space)
  const [corners, setCorners] = useState<Point[]>([]);
  const [courtWidth, setCourtWidth] = useState(5);
  const [courtHeight, setCourtHeight] = useState(5);

  // Scan state
  const [scanMode, setScanMode] = useState<ScanMode>('idle');
  const [scanBox, setScanBox] = useState<{ x: number; y: number } | null>(null);

  // Results
  const [ballProfileReady, setBallProfileReady] = useState(false);
  const [teamAReady, setTeamAReady] = useState(false);
  const [teamBReady, setTeamBReady] = useState(false);

  const {
    setCourtCalib,
    setBallCalib,
    setTeams,
    courtCalib,
  } = useGameStore();

  // Start camera
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    cameraRef.current
      .start(vid)
      .catch((e) => setCameraError(String(e)));
    return () => { cameraRef.current.stop(); };
  }, []);

  // Draw overlay: corners + scan box
  useEffect(() => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const draw = () => {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw court corners
      corners.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), p.x, p.y);
      });

      // Draw court polygon if 4 corners
      if (corners.length === 4) {
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        corners.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw scan box
      if (scanMode !== 'idle' && scanBox) {
        const half = SAMPLE_SIZE / 2;
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(scanBox.x - half, scanBox.y - half, SAMPLE_SIZE, SAMPLE_SIZE);
      }

      requestAnimationFrame(draw);
    };
    const raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [corners, scanMode, scanBox]);

  const handleVideoTap = useCallback(
    (e: React.TouchEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
      const canvas = overlayRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0]?.clientX ?? e.changedTouches[0].clientX;
        clientY = e.touches[0]?.clientY ?? e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (scanMode !== 'idle') {
        setScanBox({ x, y });
        return;
      }

      // Court corner tapping
      if (corners.length < 4) {
        setCorners((prev) => [...prev, { x, y }]);
      }
    },
    [scanMode, corners],
  );

  const confirmScan = useCallback(() => {
    if (!scanBox || !videoRef.current) return;
    const video = videoRef.current;
    const scaleX = video.videoWidth / video.clientWidth;
    const scaleY = video.videoHeight / video.clientHeight;
    const half = SAMPLE_SIZE / 2;
    const sx = Math.round((scanBox.x - half) * scaleX);
    const sy = Math.round((scanBox.y - half) * scaleY);
    const sw = Math.round(SAMPLE_SIZE * scaleX);
    const sh = Math.round(SAMPLE_SIZE * scaleY);

    // Draw video frame to temp canvas
    const tmp = document.createElement('canvas');
    tmp.width = video.videoWidth;
    tmp.height = video.videoHeight;
    const ctx = tmp.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(sx, sy, sw, sh);

    const mean = sampleRegionMeanHsv(imageData, 0, 0, imageData.width, imageData.height);
    if (!mean) return;

    const range: HsvRange = buildHsvRange(mean);
    const profile: ColorProfile = { name: scanMode, ranges: [range] };

    if (scanMode === 'ball') {
      setBallCalib({ colorProfile: profile });
      setBallProfileReady(true);
    } else if (scanMode === 'teamA') {
      setTeams([
        {
          teamId: 'A',
          displayName: TEAM_DEFAULTS.A.name,
          colorProfile: profile,
          displayColor: TEAM_DEFAULTS.A.color,
        },
        ...(useGameStore.getState().teams.filter((t) => t.teamId !== 'A')),
      ]);
      setTeamAReady(true);
    } else if (scanMode === 'teamB') {
      const existingA = useGameStore.getState().teams.find((t) => t.teamId === 'A');
      setTeams([
        ...(existingA ? [existingA] : []),
        {
          teamId: 'B',
          displayName: TEAM_DEFAULTS.B.name,
          colorProfile: profile,
          displayColor: TEAM_DEFAULTS.B.color,
        },
      ]);
      setTeamBReady(true);
    }
    setScanMode('idle');
    setScanBox(null);
  }, [scanBox, scanMode, setBallCalib, setTeams]);

  const saveCourt = () => {
    if (corners.length < 4) return;
    setCourtCalib({
      imagePoints: corners as [Point, Point, Point, Point],
      realWidthMeters: courtWidth,
      realHeightMeters: courtHeight,
    });
  };

  const canProceed = courtCalib !== null && ballProfileReady && teamAReady && teamBReady;

  const proceed = () => {
    if (canProceed) {
      useGameStore.getState().resetRound();
      useGameStore.setState({ phase: 'setup' });
    }
  };

  return (
    <div className="screen" style={{ background: '#000' }}>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <canvas
          ref={overlayRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' }}
          onTouchStart={handleVideoTap}
          onClick={handleVideoTap}
        />

        {/* Scan mode instruction */}
        {scanMode !== 'idle' && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 0,
              right: 0,
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                background: 'rgba(0,0,0,0.7)',
                color: '#facc15',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: '0.9rem',
                fontWeight: 700,
              }}
            >
              Trykk på {scanMode === 'ball' ? 'ballen' : scanMode === 'teamA' ? 'rød vest' : 'blå vest'}
            </span>
          </div>
        )}

        {cameraError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.8)',
              color: '#f87171',
              padding: 24,
              textAlign: 'center',
              fontSize: '0.95rem',
            }}
          >
            Kamerafeil: {cameraError}
            <br />
            Åpne i Safari på iPhone og tillat kameratilgang.
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div
        style={{
          background: 'var(--surface)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxHeight: '55%',
          overflowY: 'auto',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent)' }}>
          Kalibrering
        </div>

        {/* Step 1: Court */}
        <Section title="1. Marker banehjeørner" done={corners.length >= 4 && courtCalib !== null}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
            Trykk 4 hjørner på bildet (TL → TR → BR → BL)
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Bredde (m):
              <input
                type="number"
                value={courtWidth}
                min={1} max={30} step={0.5}
                onChange={(e) => setCourtWidth(Number(e.target.value))}
                style={{ marginLeft: 6 }}
              />
            </label>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Høyde (m):
              <input
                type="number"
                value={courtHeight}
                min={1} max={30} step={0.5}
                onChange={(e) => setCourtHeight(Number(e.target.value))}
                style={{ marginLeft: 6 }}
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCorners([])}
              style={{ background: 'var(--surface2)', color: 'var(--text)', fontSize: '0.85rem' }}
            >
              Reset hjørner ({corners.length}/4)
            </button>
            <button
              onClick={saveCourt}
              disabled={corners.length < 4}
              style={{ background: courtCalib ? '#16a34a' : 'var(--accent)', color: '#0f172a', fontSize: '0.85rem' }}
            >
              {courtCalib ? '✓ Bane lagret' : 'Lagre bane'}
            </button>
          </div>
        </Section>

        {/* Step 2: Ball */}
        <Section title="2. Scan ball" done={ballProfileReady}>
          {scanMode === 'ball' && scanBox ? (
            <button onClick={confirmScan} style={{ background: '#16a34a', color: '#fff' }}>
              ✓ Bekreft farge
            </button>
          ) : (
            <button
              onClick={() => setScanMode('ball')}
              style={{ background: 'var(--surface2)', color: '#facc15', fontWeight: 700 }}
            >
              {ballProfileReady ? '✓ Lagret — scan igjen' : 'Scan ballmarkør'}
            </button>
          )}
        </Section>

        {/* Step 3: Team A */}
        <Section title="3. Scan rødt lag" done={teamAReady}>
          {scanMode === 'teamA' && scanBox ? (
            <button onClick={confirmScan} style={{ background: '#16a34a', color: '#fff' }}>
              ✓ Bekreft rød vest
            </button>
          ) : (
            <button
              onClick={() => setScanMode('teamA')}
              style={{ background: 'var(--surface2)', color: '#e53e3e', fontWeight: 700 }}
            >
              {teamAReady ? '✓ Lagret — scan igjen' : 'Scan rød vest'}
            </button>
          )}
        </Section>

        {/* Step 4: Team B */}
        <Section title="4. Scan blått lag" done={teamBReady}>
          {scanMode === 'teamB' && scanBox ? (
            <button onClick={confirmScan} style={{ background: '#16a34a', color: '#fff' }}>
              ✓ Bekreft blå vest
            </button>
          ) : (
            <button
              onClick={() => setScanMode('teamB')}
              style={{ background: 'var(--surface2)', color: '#3182ce', fontWeight: 700 }}
            >
              {teamBReady ? '✓ Lagret — scan igjen' : 'Scan blå vest'}
            </button>
          )}
        </Section>

        <button
          onClick={proceed}
          disabled={!canProceed}
          style={{
            background: canProceed ? '#16a34a' : 'var(--surface2)',
            color: canProceed ? '#fff' : 'var(--text-muted)',
            fontSize: '1.1rem',
            padding: '14px',
            marginTop: 4,
          }}
        >
          {canProceed ? 'Start spill ▶' : 'Fullfør kalibrering'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, done, children }: { title: string; done: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface2)',
        borderRadius: 10,
        padding: '10px 12px',
        borderLeft: `3px solid ${done ? '#16a34a' : 'var(--accent)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: done ? '#4ade80' : 'var(--text)' }}>
        {done ? '✓ ' : ''}{title}
      </div>
      {children}
    </div>
  );
}
