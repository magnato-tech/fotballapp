import { useGameStore } from '../game/gameState';
import { CalibrationScreen } from '../ui/CalibrationScreen';
import { SetupScreen } from '../ui/SetupScreen';
import { LiveGameScreen } from '../ui/LiveGameScreen';
import { EndScreen } from '../ui/EndScreen';

export default function App() {
  const { phase, score, teams } = useGameStore();

  if (phase === 'calibration') return <CalibrationScreen />;
  if (phase === 'setup') return <SetupScreen />;
  if (phase === 'playing' || phase === 'paused') return <LiveGameScreen />;
  if (phase === 'ended') {
    return (
      <EndScreen
        score={score}
        teams={teams}
        onPlayAgain={() => useGameStore.setState({ phase: 'setup' })}
        onRecalibrate={() =>
          useGameStore.setState({ phase: 'calibration', calibStep: 'court' })
        }
      />
    );
  }

  return <CalibrationScreen />;
}
