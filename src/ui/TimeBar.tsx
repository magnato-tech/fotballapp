type Props = {
  secondsRemaining: number;
  totalSeconds: number;
};

export function TimeBar({ secondsRemaining, totalSeconds }: Props) {
  const pct = Math.max(0, Math.min(1, secondsRemaining / totalSeconds));
  const m = Math.floor(secondsRemaining / 60);
  const s = Math.floor(secondsRemaining % 60);
  const label = `${m}:${String(s).padStart(2, '0')}`;
  const isUrgent = secondsRemaining <= 15;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span
          style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            color: isUrgent ? '#f97316' : 'var(--text)',
            transition: 'color 0.3s',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 5,
          background: 'var(--surface2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct * 100}%`,
            background: isUrgent ? '#f97316' : 'var(--accent)',
            transition: 'width 0.5s linear, background 0.3s',
            borderRadius: 5,
          }}
        />
      </div>
    </div>
  );
}
