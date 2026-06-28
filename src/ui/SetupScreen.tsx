import { useGameStore } from '../game/gameState';

export function SetupScreen() {
  const { rules, setRules, startRound, teams } = useGameStore();
  const teamA = teams.find((t) => t.teamId === 'A');
  const teamB = teams.find((t) => t.teamId === 'B');

  const durations = [60, 90, 120] as const;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: 24,
        background: 'var(--bg)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>⚽ Passningsspill</div>
        <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.95rem' }}>
          Panna 2v2 · Poeng for pasninger
        </div>
      </div>

      {/* Teams display */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
        <TeamChip name={teamA?.displayName ?? 'Lag A'} color={teamA?.displayColor ?? '#e53e3e'} />
        <div style={{ alignSelf: 'center', color: 'var(--text-muted)', fontWeight: 700 }}>vs</div>
        <TeamChip name={teamB?.displayName ?? 'Lag B'} color={teamB?.displayColor ?? '#3182ce'} />
      </div>

      {/* Duration picker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
          RUNDETID
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {durations.map((d) => (
            <button
              key={d}
              onClick={() => setRules({ roundDurationSeconds: d })}
              style={{
                flex: 1,
                background:
                  rules.roundDurationSeconds === d ? 'var(--accent)' : 'var(--surface2)',
                color: rules.roundDurationSeconds === d ? '#0f172a' : 'var(--text)',
                fontWeight: rules.roundDurationSeconds === d ? 800 : 600,
                padding: '12px 0',
              }}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      {/* Min pass distance */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 300 }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
          MIN. PASNINGSLENGDE
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {[0.3, 0.5, 0.8].map((d) => (
            <button
              key={d}
              onClick={() => setRules({ minPassDistanceMeters: d })}
              style={{
                background: rules.minPassDistanceMeters === d ? 'var(--accent)' : 'var(--surface2)',
                color: rules.minPassDistanceMeters === d ? '#0f172a' : 'var(--text)',
                fontWeight: rules.minPassDistanceMeters === d ? 800 : 600,
                padding: '10px 14px',
              }}
            >
              {d}m
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={startRound}
        style={{ background: '#16a34a', color: '#fff', fontSize: '1.2rem', padding: '16px 40px', width: '100%', maxWidth: 300 }}
      >
        ▶ Start runde!
      </button>

      <button
        onClick={() => useGameStore.setState({ phase: 'calibration', calibStep: 'court' })}
        style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'underline' }}
      >
        Ny kalibrering
      </button>
    </div>
  );
}

function TeamChip({ name, color }: { name: string; color: string }) {
  return (
    <div
      style={{
        background: `${color}22`,
        border: `2px solid ${color}`,
        borderRadius: 10,
        padding: '8px 18px',
        color,
        fontWeight: 800,
        fontSize: '1rem',
      }}
    >
      {name}
    </div>
  );
}
