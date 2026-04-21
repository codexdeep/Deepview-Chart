import { useEffect, useRef } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { createSeriesMarkers } from 'lightweight-charts';

interface Props {
  candles: any[];
  chartRef: React.MutableRefObject<IChartApi | null>;
  candleSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>;
}

function calcUTBotSignals(candles: any[], atrPeriod: number, keyValue: number) {
  const parsed = candles.map((k: any) => ({
    time: k[0] / 1000,
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
  }));

  const trs: number[] = [];
  for (let i = 0; i < parsed.length; i++) {
    if (i === 0) { trs.push(parsed[i].high - parsed[i].low); continue; }
    const prevClose = parsed[i - 1].close;
    trs.push(Math.max(
      parsed[i].high - parsed[i].low,
      Math.abs(parsed[i].high - prevClose),
      Math.abs(parsed[i].low - prevClose),
    ));
  }
  // Wilder ATR
  const atr: number[] = [];
  let sum = 0;
  for (let i = 0; i < trs.length; i++) {
    if (i < atrPeriod) { sum += trs[i]; atr.push(sum / (i + 1)); continue; }
    const prev = atr[i - 1];
    atr.push((prev * (atrPeriod - 1) + trs[i]) / atrPeriod);
  }

  const signals: { time: number; type: 'buy' | 'sell'; price: number }[] = [];
  let xATRTrailingStop = 0;
  let pos = 0;

  for (let i = 1; i < parsed.length; i++) {
    const nLoss = keyValue * atr[i];
    const src = parsed[i].close;
    const prevSrc = parsed[i - 1].close;
    const prevStop = xATRTrailingStop;

    if (src > prevStop && prevSrc > prevStop) {
      xATRTrailingStop = Math.max(prevStop, src - nLoss);
    } else if (src < prevStop && prevSrc < prevStop) {
      xATRTrailingStop = Math.min(prevStop, src + nLoss);
    } else if (src > prevStop) {
      xATRTrailingStop = src - nLoss;
    } else {
      xATRTrailingStop = src + nLoss;
    }

    const above = prevSrc < prevStop && src > xATRTrailingStop;
    const below = prevSrc > prevStop && src < xATRTrailingStop;

    if (above && pos !== 1) {
      signals.push({ time: parsed[i].time, type: 'buy', price: parsed[i].low });
      pos = 1;
    } else if (below && pos !== -1) {
      signals.push({ time: parsed[i].time, type: 'sell', price: parsed[i].high });
      pos = -1;
    }
  }
  return signals;
}

const UTBotIndicator = ({ candles, chartRef, candleSeriesRef }: Props) => {
  const { utBotAtrPeriod, utBotKeyValue } = useTradingStore();
  const markersApiRef = useRef<any>(null);

  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series || candles.length < utBotAtrPeriod + 2) return;

    const signals = calcUTBotSignals(candles, utBotAtrPeriod, utBotKeyValue);

    const markers = signals.map(s => ({
      time: s.time as any,
      position: s.type === 'buy' ? 'belowBar' : 'aboveBar' as any,
      color: s.type === 'buy' ? 'hsl(158, 90%, 55%)' : 'hsl(348, 90%, 62%)',
      shape: s.type === 'buy' ? 'arrowUp' : 'arrowDown' as any,
      text: s.type === 'buy' ? 'BUY' : 'SELL',
    }));

    try {
      if (!markersApiRef.current) {
        markersApiRef.current = createSeriesMarkers(series, markers);
      } else {
        markersApiRef.current.setMarkers(markers);
      }
    } catch (e) {
      console.warn('[UTBot] markers failed', e);
    }

    return () => {
      try { markersApiRef.current?.setMarkers([]); } catch {}
    };
  }, [candles, utBotAtrPeriod, utBotKeyValue, candleSeriesRef]);

  return null;
};

export default UTBotIndicator;
