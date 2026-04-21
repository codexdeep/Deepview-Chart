import { useEffect, useState } from 'react';

interface Props {
  timeframe: string;
  lastCandleOpenTime?: number; // ms
}

const TIMEFRAME_MS: Record<string, number> = {
  '1s': 1000,
  '1m': 60_000,
  '3m': 180_000,
  '5m': 300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '2h': 7_200_000,
  '4h': 14_400_000,
  '6h': 21_600_000,
  '12h': 43_200_000,
  '1d': 86_400_000,
  '1w': 604_800_000,
  '1M': 2_592_000_000,
};

function formatRemaining(ms: number, timeframe: string): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);

  if (timeframe === '1s') {
    return `0.${Math.floor((ms % 1000) / 100)}s`;
  }

  if (timeframe === '1m') {
    return `00:${String(totalSec % 60).padStart(2, '0')}`;
  }

  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const CandleTimer = ({ timeframe, lastCandleOpenTime }: Props) => {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const intervalMs = TIMEFRAME_MS[timeframe] || 60_000;

    const update = () => {
      const now = Date.now();
      let candleEnd: number;

      if (lastCandleOpenTime) {
        candleEnd = lastCandleOpenTime + intervalMs;
      } else {
        // Estimate based on current time
        candleEnd = Math.ceil(now / intervalMs) * intervalMs;
      }

      const diff = candleEnd - now;
      setRemaining(formatRemaining(Math.max(0, diff), timeframe));
    };

    update();
    const id = setInterval(update, timeframe === '1s' ? 100 : 500);
    return () => clearInterval(id);
  }, [timeframe, lastCandleOpenTime]);

  return (
    <div className="absolute right-2 top-12 z-20 bg-card/90 border border-terminal-border rounded px-2 py-1 pointer-events-none">
      <div className="text-[9px] text-muted-foreground uppercase">Closes in</div>
      <div className="text-xs font-mono font-bold text-primary">{remaining}</div>
    </div>
  );
};

export default CandleTimer;
