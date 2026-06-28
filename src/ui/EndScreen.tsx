import type { Score, TeamCalibration } from '../types/game';

type Props = {
  score: Score;
  teams: TeamCalibration[];
  onPlayAgain: () => void;
  onRecalibrate: () => void;
};

export function EndScreen({ score, teams, onPlayAgain, onRecalibrate }: Props) {
  const teamA = teams.find((t) => t.teamId === 'A');
  const teamB = teams.find((t) => t.teamId === 'B');
  const nameA = teamA?.displayName ?? 'Lag A';
  const nameB = teamB?.displayName ?? 'Lag B';
  const colorA = teamA?.displayColor ?? '#e53e3e';
  const colorB = teamB?.displayColor ?? '#3182ce';

  let winner: string;
  let winnerColor: string;
  if (score.A > score.B) { winner = nameA; winnerColor = colorA; }
  else if (score.B > score.A) { winner = nameB; winnerColor = colorB; }
  else { winner = 'Uavgjort!'; winnerColor = 'var(--text)'; }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: 24,
        background: 'var(--bg)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: 8 }}>VINNER</div>
        <div style={{ fontSize: '3rem', fontWeight: 900, color: winnerColor }}>{winner}</div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 40,
          background: 'var(--surface)',
          borderRadius: 16,
          padding: '24px 40px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 900, color: colorA }}>{score.A}</div>
          <div style={{ fontSize: '0.9rem', color: colorA, fontWeight: 700 }}>{nameA}</div>
        </div>
        <div style={{ fontSize: '2rem', alignSelf: 'center', color: 'var(--text-muted)' }}>–</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 900, color: colorB }}>{score.B}</div>
          <div style={{ fontSize: '0.9rem', color: colorB, fontWeight: 700 }}>{nameB}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        <button
          onClick={onPlayAgain}
          style={{ background: 'var(--accent)', color: '#0f172a', fontSize: '1.1rem', padding: '14px' }}
        >
          Spill igjen ▶
        </button>
        <button
          onClick={onRecalibrate}
          style={{ background: 'var(--surface2)', color: 'var(--text)', padding: '12px' }}
        >
          Ny kalibrering
        </button>
      </div>
    </div>
  );
}
