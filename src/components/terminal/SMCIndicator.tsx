import { useEffect, useRef } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import type { IChartApi } from 'lightweight-charts';
import { LineSeries } from 'lightweight-charts';

interface Candle { time: number; open: number; high: number; low: number; close: number; }

interface SMCZone {
  type: 'bullish_ob' | 'bearish_ob' | 'fvg_bull' | 'fvg_bear' | 'bos_bull' | 'bos_bear' | 'choch_bull' | 'choch_bear';
  startTime: number;
  endTime: number;
  priceHigh: number;
  priceLow: number;
}

function detectSMC(candles: Candle[]): SMCZone[] {
  const zones: SMCZone[] = [];
  if (candles.length < 5) return zones;
  const lastTime = candles[candles.length - 1].time;

  // Only keep latest 30 zones for performance
  for (let i = 2; i < candles.length; i++) {
    const prev2 = candles[i - 2];
    const prev1 = candles[i - 1];
    const curr = candles[i];

    if (prev1.close < prev1.open && curr.close > curr.open && curr.close > prev1.high) {
      zones.push({ type: 'bullish_ob', startTime: prev1.time, endTime: lastTime, priceHigh: prev1.open, priceLow: prev1.close });
    }
    if (prev1.close > prev1.open && curr.close < curr.open && curr.close < prev1.low) {
      zones.push({ type: 'bearish_ob', startTime: prev1.time, endTime: lastTime, priceHigh: prev1.close, priceLow: prev1.open });
    }
    if (curr.low > prev2.high) {
      zones.push({ type: 'fvg_bull', startTime: prev1.time, endTime: lastTime, priceHigh: curr.low, priceLow: prev2.high });
    }
    if (curr.high < prev2.low) {
      zones.push({ type: 'fvg_bear', startTime: prev1.time, endTime: lastTime, priceHigh: prev2.low, priceLow: curr.high });
    }
  }

  // Limit recent zones
  return zones.slice(-30);
}

interface Props {
  candles: any[];
  chartRef: React.MutableRefObject<IChartApi | null>;
}

const SMCIndicator = ({ candles, chartRef }: Props) => {
  const seriesRef = useRef<Map<string, any>>(new Map());
  const { smcOrderBlocks, smcFVG, smcStructureBreaks, smcOpacity } = useTradingStore();

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || candles.length < 5) return;

    for (const [, s] of seriesRef.current) {
      try { chart.removeSeries(s); } catch {}
    }
    seriesRef.current.clear();

    const parsed: Candle[] = candles.map((k: any) => ({
      time: k[0] / 1000,
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
    }));

    const zones = detectSMC(parsed);
    const op = smcOpacity;

    let idx = 0;
    for (const zone of zones) {
      const isOB = zone.type.includes('ob');
      const isFVG = zone.type.includes('fvg');
      const isBOS = zone.type.includes('bos') || zone.type.includes('choch');

      if (isOB && !smcOrderBlocks) continue;
      if (isFVG && !smcFVG) continue;
      if (isBOS && !smcStructureBreaks) continue;

      const isBull = zone.type.includes('bull');
      const baseColor = isBull ? `158, 90%, 55%` : `348, 90%, 62%`;
      const lineColor = `hsla(${baseColor}, ${op})`;

      try {
        const upper = chart.addSeries(LineSeries, {
          color: lineColor, lineWidth: 2, lineStyle: isFVG ? 1 : 0,
          priceScaleId: 'right', lastValueVisible: false, priceLineVisible: false,
          title: idx === 0 ? (isOB ? 'OB' : isFVG ? 'FVG' : 'BOS') : undefined,
        });
        upper.setData([
          { time: zone.startTime as any, value: zone.priceHigh },
          { time: zone.endTime as any, value: zone.priceHigh },
        ]);
        seriesRef.current.set(`smc_${idx}_h`, upper);

        if (Math.abs(zone.priceHigh - zone.priceLow) > 0.0001) {
          const lower = chart.addSeries(LineSeries, {
            color: lineColor, lineWidth: 2, lineStyle: isFVG ? 1 : 0,
            priceScaleId: 'right', lastValueVisible: false, priceLineVisible: false,
          });
          lower.setData([
            { time: zone.startTime as any, value: zone.priceLow },
            { time: zone.endTime as any, value: zone.priceLow },
          ]);
          seriesRef.current.set(`smc_${idx}_l`, lower);
        }
      } catch {}
      idx++;
    }

    return () => {
      for (const [, s] of seriesRef.current) {
        try { chart?.removeSeries(s); } catch {}
      }
      seriesRef.current.clear();
    };
  }, [candles, chartRef, smcOrderBlocks, smcFVG, smcStructureBreaks, smcOpacity]);

  return null;
};

export default SMCIndicator;
