import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, type IChartApi, type ISeriesApi, ColorType, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { useTradingStore, ALL_TIMEFRAMES } from '@/store/tradingStore';
import { fetchKlines, binanceWs } from '@/services/binanceWebSocket';
import HeatmapChart from './HeatmapChart';
import UTBotIndicator from './UTBotIndicator';
import SMCIndicator from './SMCIndicator';
import CandleTimer from './CandleTimer';
import DrawingOverlay from './DrawingOverlay';
import TVIndicatorsLayer from './TVIndicatorsLayer';
import { Star, Sparkles } from 'lucide-react';

const tfLabels: Record<string, string> = {
  '1s': '1s', '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1H', '2h': '2H', '4h': '4H', '6h': '6H', '12h': '12H',
  '1d': '1D', '1w': '1W', '1M': '1M',
};

function calcSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j];
    result.push(sum / period);
  }
  return result;
}

function calcEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (prev === null) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[i - j];
      prev = sum / period;
    } else {
      prev = data[i] * k + prev * (1 - k);
    }
    result.push(prev);
  }
  return result;
}

function calcRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [null];
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (i <= period) {
      avgGain += Math.max(change, 0);
      avgLoss += Math.abs(Math.min(change, 0));
      if (i < period) { result.push(null); continue; }
      avgGain /= period; avgLoss /= period;
    } else {
      avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(Math.min(change, 0))) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}

function calcBollingerBands(closes: number[], period = 20, stdDev = 2) {
  const sma = calcSMA(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (sma[i] === null) { upper.push(null); lower.push(null); continue; }
    let variance = 0;
    for (let j = 0; j < period; j++) variance += (closes[i - j] - sma[i]!) ** 2;
    const std = Math.sqrt(variance / period);
    upper.push(sma[i]! + stdDev * std);
    lower.push(sma[i]! - stdDev * std);
  }
  return { sma, upper, lower };
}

type Indicator = 'ma' | 'ema' | 'rsi' | 'bb' | 'volume';

interface TradingChartProps {
  overrideSymbol?: string;
  overrideTimeframe?: string;
  compact?: boolean;
  instanceId?: string;
}

const TradingChart = ({ overrideSymbol, overrideTimeframe, compact, instanceId }: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const priceLinesRef = useRef<Map<string, any>>(new Map());
  const whaleMarkersRef = useRef<{ time: number; price: number; qty: number }[]>([]);
  const lastDataTimeRef = useRef<number>(Date.now());

  const {
    selectedSymbol, chartMode, setChartMode, selectedTimeframe, setSelectedTimeframe,
    utBotEnabled, smcEnabled, liquidationOverlay, maPeriod, emaPeriod,
    positions, whaleDetectionEnabled, whaleThresholdUsdt, toggleFavorite, favorites,
  } = useTradingStore();

  const symbol = overrideSymbol || selectedSymbol;
  const timeframe = overrideTimeframe || selectedTimeframe;
  const isFav = favorites.includes(symbol);

  const [loading, setLoading] = useState(true);
  const [activeIndicators, setActiveIndicators] = useState<Set<Indicator>>(new Set(['volume', 'ma', 'ema']));
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [rawCandles, setRawCandles] = useState<any[]>([]);
  const [lastCandleOpenTime, setLastCandleOpenTime] = useState<number | undefined>();
  const [reloadKey, setReloadKey] = useState(0);

  const toggleIndicator = useCallback((ind: Indicator) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (next.has(ind)) next.delete(ind); else next.add(ind);
      return next;
    });
  }, []);

  // Build chart
  useEffect(() => {
    if (!chartContainerRef.current || chartMode !== 'candlestick') return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'hsl(0, 0%, 3%)' },
        textColor: 'hsl(0, 0%, 65%)',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'hsl(0, 0%, 8%)' },
        horzLines: { color: 'hsl(0, 0%, 8%)' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: 'hsl(270, 95%, 70%)', width: 1, style: 2, labelBackgroundColor: 'hsl(270, 95%, 70%)' },
        horzLine: { color: 'hsl(270, 95%, 70%)', width: 1, style: 2, labelBackgroundColor: 'hsl(270, 95%, 70%)' },
      },
      rightPriceScale: { borderColor: 'hsl(0, 0%, 11%)', scaleMargins: { top: 0.1, bottom: 0.2 }, autoScale: true },
      timeScale: { borderColor: 'hsl(0, 0%, 11%)', timeVisible: true, rightOffset: 12 },
    });

    if (!compact) {
      const watermarkEl = document.createElement('div');
      watermarkEl.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:1;';
      watermarkEl.innerHTML = '<span style="font-family:JetBrains Mono,monospace;font-size:72px;font-weight:700;color:rgba(168,85,247,0.07);user-select:none;letter-spacing:0.05em;">DeepView</span>';
      chartContainerRef.current.style.position = 'relative';
      chartContainerRef.current.appendChild(watermarkEl);
    }

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: 'hsl(158, 90%, 55%)', downColor: 'hsl(348, 90%, 62%)',
      borderUpColor: 'hsl(158, 90%, 55%)', borderDownColor: 'hsl(348, 90%, 62%)',
      wickUpColor: 'hsl(158, 90%, 55%)', wickDownColor: 'hsl(348, 90%, 62%)',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' }, priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const observer = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    });
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      try { chart.remove(); } catch {}
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeriesRef.current.clear();
      priceLinesRef.current.clear();
    };
  }, [chartMode, compact, reloadKey]);

  // Load klines + subscribe
  useEffect(() => {
    if (chartMode !== 'candlestick') return;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const chart = chartRef.current;
    if (!candleSeries || !volumeSeries || !chart) return;

    let cancelled = false;

    async function loadKlines() {
      setLoading(true);
      try {
        const apiTf = timeframe === '1s' ? '1m' : timeframe;
        const raw = await fetchKlines(symbol, apiTf, 1000);
        if (cancelled) return;

        const candles = raw.map((k: any) => ({
          time: (k[0] / 1000) as any,
          open: parseFloat(k[1]), high: parseFloat(k[2]),
          low: parseFloat(k[3]), close: parseFloat(k[4]),
        }));
        const volumes = raw.map((k: any) => ({
          time: (k[0] / 1000) as any,
          value: parseFloat(k[5]),
          color: parseFloat(k[4]) >= parseFloat(k[1]) ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)',
        }));

        candleSeries.setData(candles);
        volumeSeries.setData(volumes);

        chart.timeScale().scrollToRealTime();
        chart.priceScale('right').applyOptions({ autoScale: true });

        setRawCandles(raw);
        if (raw.length > 0) setLastCandleOpenTime(raw[raw.length - 1][0]);
        lastDataTimeRef.current = Date.now();
      } catch (err) {
        console.error('[Chart] Failed to load klines:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadKlines();

    const apiTf = timeframe === '1s' ? '1m' : timeframe;
    const unsub = binanceWs.subscribeKline(symbol, apiTf, (k) => {
      if (cancelled) return;
      try {
        candleSeries.update({ time: (k.t / 1000) as any, open: parseFloat(k.o), high: parseFloat(k.h), low: parseFloat(k.l), close: parseFloat(k.c) });
        volumeSeries.update({ time: (k.t / 1000) as any, value: parseFloat(k.v), color: parseFloat(k.c) >= parseFloat(k.o) ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)' });
        setLastCandleOpenTime(k.t);
        lastDataTimeRef.current = Date.now();

        // Update last candle in rawCandles for indicator recalculation
        setRawCandles(prev => {
          if (!prev.length) return prev;
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (next[lastIdx][0] === k.t) {
            next[lastIdx] = [k.t, k.o, k.h, k.l, k.c, k.v];
          } else if (k.t > next[lastIdx][0]) {
            next.push([k.t, k.o, k.h, k.l, k.c, k.v]);
            if (next.length > 1000) next.shift();
          }
          return next;
        });
      } catch (e) {
        console.warn('[Chart] update failed', e);
      }
    });

    return () => { cancelled = true; unsub(); };
  }, [symbol, timeframe, chartMode, reloadKey]);

  // Apply indicators (recomputed with each candle update so EMA/MA show on latest)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !rawCandles.length || chartMode !== 'candlestick') return;

    for (const [, series] of indicatorSeriesRef.current) {
      try { chart.removeSeries(series); } catch {}
    }
    indicatorSeriesRef.current.clear();

    const closes = rawCandles.map((k: any) => parseFloat(k[4]));
    const times = rawCandles.map((k: any) => (k[0] / 1000) as any);

    const addLineSeries = (key: string, data: (number | null)[], color: string, lineWidth: 1 | 2 | 3 | 4 = 2) => {
      const series = chart.addSeries(LineSeries, {
        color, lineWidth,
        priceScaleId: key.startsWith('rsi') ? 'rsi' : 'right',
        lastValueVisible: true,
        priceLineVisible: false,
        title: key.toUpperCase(),
      });
      if (key.startsWith('rsi')) {
        series.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      }
      const lineData = data.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as any[];
      series.setData(lineData);
      indicatorSeriesRef.current.set(key, series);
    };

    if (activeIndicators.has('ma')) addLineSeries(`ma${maPeriod}`, calcSMA(closes, maPeriod), '#f59e0b');
    if (activeIndicators.has('ema')) addLineSeries(`ema${emaPeriod}`, calcEMA(closes, emaPeriod), '#a855f7');
    if (activeIndicators.has('rsi')) addLineSeries('rsi', calcRSI(closes), '#06b6d4', 1);
    if (activeIndicators.has('bb')) {
      const bb = calcBollingerBands(closes);
      addLineSeries('bb_upper', bb.upper, '#6366f1', 1);
      addLineSeries('bb_mid', bb.sma, '#6366f1', 1);
      addLineSeries('bb_lower', bb.lower, '#6366f1', 1);
    }
  }, [activeIndicators, rawCandles, chartMode, maPeriod, emaPeriod]);

  // Trade level lines (entry / SL / TP) for current symbol positions
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    for (const [, line] of priceLinesRef.current) {
      try { series.removePriceLine(line); } catch {}
    }
    priceLinesRef.current.clear();

    const symbolPositions = positions.filter(p => p.symbol === symbol);
    for (const p of symbolPositions) {
      const entryLine = series.createPriceLine({
        price: p.entryPrice,
        color: p.side === 'LONG' ? 'hsl(158, 90%, 55%)' : 'hsl(348, 90%, 62%)',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `${p.side} @ ${p.unrealizedPnl >= 0 ? '+' : ''}${p.unrealizedPnl.toFixed(2)}`,
      });
      priceLinesRef.current.set(`entry_${p.id}`, entryLine);

      if (p.stopLoss) {
        const sl = series.createPriceLine({
          price: p.stopLoss, color: 'hsl(348, 90%, 62%)', lineWidth: 1, lineStyle: 2,
          axisLabelVisible: true, title: 'SL',
        });
        priceLinesRef.current.set(`sl_${p.id}`, sl);
      }
      if (p.takeProfit) {
        const tp = series.createPriceLine({
          price: p.takeProfit, color: 'hsl(158, 90%, 55%)', lineWidth: 1, lineStyle: 2,
          axisLabelVisible: true, title: 'TP',
        });
        priceLinesRef.current.set(`tp_${p.id}`, tp);
      }
    }
  }, [positions, symbol, rawCandles.length]);

  // Whale detection via aggTrade subscription
  useEffect(() => {
    if (!whaleDetectionEnabled || chartMode !== 'candlestick') return;
    const series = candleSeriesRef.current;
    if (!series) return;
    const lines = new Map<string, any>();

    const unsub = binanceWs.subscribeAggTrades(symbol, (t) => {
      const price = parseFloat(t.p);
      const qty = parseFloat(t.q);
      const usdt = price * qty;
      if (usdt >= whaleThresholdUsdt) {
        const key = `whale_${t.T}`;
        try {
          const line = series.createPriceLine({
            price,
            color: t.m ? 'hsl(348, 90%, 62%)' : 'hsl(158, 90%, 55%)',
            lineWidth: 1, lineStyle: 1,
            axisLabelVisible: false,
            title: `🐋 ${(usdt / 1000).toFixed(0)}K`,
          });
          lines.set(key, line);
          // Auto-remove after 2 minutes
          setTimeout(() => {
            try { series.removePriceLine(line); } catch {}
            lines.delete(key);
          }, 120000);
        } catch {}
      }
    });

    return () => {
      unsub();
      for (const [, l] of lines) try { series.removePriceLine(l); } catch {}
    };
  }, [symbol, whaleDetectionEnabled, whaleThresholdUsdt, chartMode]);

  const currentTicker = useTradingStore(s => s.watchlist.find(t => t.symbol === symbol));

  if (chartMode === 'heatmap' && !compact) {
    return (
      <div className="flex flex-col h-full bg-terminal-panel relative">
        <ChartHeader
          selectedSymbol={symbol} currentTicker={currentTicker}
          selectedTf={timeframe} setSelectedTf={overrideTimeframe ? undefined : setSelectedTimeframe}
          chartMode={chartMode} setChartMode={setChartMode}
          activeIndicators={activeIndicators} toggleIndicator={toggleIndicator}
          showIndicatorMenu={showIndicatorMenu} setShowIndicatorMenu={setShowIndicatorMenu}
          compact={compact} isFav={isFav} onToggleFav={() => toggleFavorite(symbol)}
        />
        <HeatmapChart symbol={symbol} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-terminal-panel relative">
      {!compact && (
        <ChartHeader
          selectedSymbol={symbol} currentTicker={currentTicker}
          selectedTf={timeframe} setSelectedTf={overrideTimeframe ? undefined : setSelectedTimeframe}
          chartMode={chartMode} setChartMode={setChartMode}
          activeIndicators={activeIndicators} toggleIndicator={toggleIndicator}
          showIndicatorMenu={showIndicatorMenu} setShowIndicatorMenu={setShowIndicatorMenu}
          compact={compact} isFav={isFav} onToggleFav={() => toggleFavorite(symbol)}
        />
      )}

      {loading && (
        <div className="absolute inset-0 top-10 flex items-center justify-center bg-terminal-bg/80 z-10">
          <div className="text-xs text-primary font-mono animate-pulse">Loading {symbol} {timeframe}...</div>
        </div>
      )}

      <div className="flex-1 relative" ref={chartContainerRef}>
        <DrawingOverlay chartRef={chartRef} candleSeriesRef={candleSeriesRef} symbol={symbol} timeframe={timeframe} />
      </div>

      {!compact && <CandleTimer timeframe={timeframe} lastCandleOpenTime={lastCandleOpenTime} />}

      {utBotEnabled && rawCandles.length > 0 && (
        <UTBotIndicator candles={rawCandles} chartRef={chartRef} candleSeriesRef={candleSeriesRef} />
      )}

      {smcEnabled && rawCandles.length > 0 && (
        <SMCIndicator candles={rawCandles} chartRef={chartRef} />
      )}

      {rawCandles.length > 0 && (
        <TVIndicatorsLayer chartRef={chartRef} candles={rawCandles} />
      )}
    </div>
  );
};

function ChartHeader({
  selectedSymbol, currentTicker, selectedTf, setSelectedTf,
  chartMode, setChartMode, activeIndicators, toggleIndicator,
  showIndicatorMenu, setShowIndicatorMenu, compact, isFav, onToggleFav,
}: any) {
  const indicators: { value: Indicator; label: string }[] = [
    { value: 'ma', label: 'MA' },
    { value: 'ema', label: 'EMA' },
    { value: 'rsi', label: 'RSI' },
    { value: 'bb', label: 'Bollinger' },
    { value: 'volume', label: 'Volume' },
  ];

  const {
    utBotEnabled, setUtBotEnabled, smcEnabled, setSmcEnabled,
    liquidationOverlay, setLiquidationOverlay, chartLayout, setChartLayout,
    maPeriod, setMaPeriod, emaPeriod, setEmaPeriod,
    smcOpacity, setSmcSettings, whaleDetectionEnabled, setWhaleDetection,
  } = useTradingStore();

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-terminal flex-wrap gap-1">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button onClick={onToggleFav} className="hover:scale-110 transition-transform">
            <Star className={`w-4 h-4 ${isFav ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
          </button>
          <span className="font-bold text-sm text-foreground">{selectedSymbol}</span>
          {currentTicker && currentTicker.price > 0 && (
            <>
              <span className={`ml-2 text-sm font-mono font-bold ${currentTicker.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                {currentTicker.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-xs font-mono ${currentTicker.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                {currentTicker.changePercent >= 0 ? '+' : ''}{currentTicker.changePercent.toFixed(2)}%
              </span>
            </>
          )}
        </div>
        {!compact && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
            <span>H: <span className="text-foreground">{currentTicker?.high24h?.toLocaleString() || '-'}</span></span>
            <span>L: <span className="text-foreground">{currentTicker?.low24h?.toLocaleString() || '-'}</span></span>
            <span>Vol: <span className="text-foreground">{currentTicker ? (currentTicker.volume / 1e9).toFixed(2) + 'B' : '-'}</span></span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {!compact && (
          <div className="flex bg-muted rounded overflow-hidden">
            {(['1', '2', '4'] as const).map(l => (
              <button key={l} onClick={() => setChartLayout(l)}
                className={`px-1.5 py-0.5 text-[10px] ${chartLayout === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              >{l}×</button>
            ))}
          </div>
        )}

        <div className="flex bg-muted rounded overflow-hidden">
          <button onClick={() => setChartMode('candlestick')} className={`px-2 py-0.5 text-[10px] ${chartMode === 'candlestick' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Candles</button>
          <button onClick={() => setChartMode('heatmap')} className={`px-2 py-0.5 text-[10px] ${chartMode === 'heatmap' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Heatmap</button>
        </div>

        <button
          onClick={() => useTradingStore.getState().setShowTvPanel(true)}
          className="px-2 py-0.5 text-[10px] bg-primary/10 border border-primary/30 rounded text-primary hover:bg-primary/20 flex items-center gap-1 font-medium"
          title="TradingView Indicators (446+)"
        >
          <Sparkles className="w-3 h-3" /> TV
        </button>

        <div className="relative">
          <button onClick={() => setShowIndicatorMenu(!showIndicatorMenu)} className="px-2 py-0.5 text-[10px] bg-muted rounded text-muted-foreground hover:text-foreground">
            ƒ ({activeIndicators.size})
          </button>
          {showIndicatorMenu && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-terminal-border rounded shadow-lg z-50 p-2 min-w-[200px]">
              {indicators.map(ind => (
                <label key={ind.value} className="flex items-center gap-2 py-1 text-[11px] cursor-pointer hover:bg-accent px-1 rounded">
                  <input type="checkbox" checked={activeIndicators.has(ind.value)} onChange={() => toggleIndicator(ind.value)} className="w-3 h-3 accent-primary" />
                  <span className="text-foreground flex-1">{ind.label}</span>
                  {ind.value === 'ma' && (
                    <input type="number" value={maPeriod} onChange={e => setMaPeriod(parseInt(e.target.value) || 50)}
                      className="w-12 bg-muted border border-terminal-border rounded px-1 text-[10px]" />
                  )}
                  {ind.value === 'ema' && (
                    <input type="number" value={emaPeriod} onChange={e => setEmaPeriod(parseInt(e.target.value) || 20)}
                      className="w-12 bg-muted border border-terminal-border rounded px-1 text-[10px]" />
                  )}
                </label>
              ))}
              <div className="border-t border-terminal-border mt-1 pt-1">
                <label className="flex items-center gap-2 py-1 text-[11px] cursor-pointer hover:bg-accent px-1 rounded">
                  <input type="checkbox" checked={utBotEnabled} onChange={() => setUtBotEnabled(!utBotEnabled)} className="w-3 h-3 accent-primary" />
                  <span className="text-foreground">UT Bot</span>
                </label>
                <label className="flex items-center gap-2 py-1 text-[11px] cursor-pointer hover:bg-accent px-1 rounded">
                  <input type="checkbox" checked={smcEnabled} onChange={() => setSmcEnabled(!smcEnabled)} className="w-3 h-3 accent-primary" />
                  <span className="text-foreground">SMC</span>
                </label>
                {smcEnabled && (
                  <div className="px-1 py-1">
                    <label className="text-[10px] text-muted-foreground">SMC Opacity: {(smcOpacity * 100).toFixed(0)}%</label>
                    <input type="range" min={0.05} max={1} step={0.05} value={smcOpacity}
                      onChange={(e) => setSmcSettings({ opacity: parseFloat(e.target.value) })}
                      className="w-full accent-primary" />
                  </div>
                )}
                <label className="flex items-center gap-2 py-1 text-[11px] cursor-pointer hover:bg-accent px-1 rounded">
                  <input type="checkbox" checked={liquidationOverlay} onChange={() => setLiquidationOverlay(!liquidationOverlay)} className="w-3 h-3 accent-primary" />
                  <span className="text-foreground">Liq. Heatmap</span>
                </label>
                <label className="flex items-center gap-2 py-1 text-[11px] cursor-pointer hover:bg-accent px-1 rounded">
                  <input type="checkbox" checked={whaleDetectionEnabled} onChange={() => setWhaleDetection(!whaleDetectionEnabled)} className="w-3 h-3 accent-primary" />
                  <span className="text-foreground">🐋 Whale Detection</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {setSelectedTf && (
          <div className="flex items-center gap-0.5 overflow-x-auto max-w-[400px]">
            {ALL_TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTf(tf)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-all whitespace-nowrap ${
                  selectedTf === tf ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {tfLabels[tf] || tf}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TradingChart;
