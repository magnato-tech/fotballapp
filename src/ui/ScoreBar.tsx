import type { Score } from '../types/game';

type Props = {
  score: Score;
  momentum: number; // 0-1, 1 = fully team A
  teamAColor: string;
  teamBColor: string;
  teamAName: string;
  teamBName: string;
};

export function ScoreBar({ score, momentum, teamAColor, teamBColor, teamAName, teamBName }: Props) {
  const pct = Math.round(momentum * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px' }}>
      {/* Score numbers */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '2.8rem', fontWeight: 900, color: teamAColor, lineHeight: 1 }}>
          {score.A}
        </span>
        <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>PASNINGER</span>
        <span style={{ fontSize: '2.8rem', fontWeight: 900, color: teamBColor, lineHeight: 1 }}>
          {score.B}
        </span>
      </div>

      {/* Momentum bar */}
      <div
        style={{
          position: 'relative',
          height: 28,
          borderRadius: 14,
          overflow: 'hidden',
          background: teamBColor,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            background: teamAColor,
            transition: 'width 0.3s ease',
          }}
        />
        {/* Team labels */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 10px',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
            {teamAName}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
            {teamBName}
          </span>
        </div>
      </div>
    </div>
  );
}
