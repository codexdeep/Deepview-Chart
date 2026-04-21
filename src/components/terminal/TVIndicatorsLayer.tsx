import { useEffect, useRef } from 'react';
import { LineSeries, HistogramSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { useTradingStore } from '@/store/tradingStore';
import { TV_INDICATOR_MAP, calculateTVIndicator } from '@/lib/tvIndicators';

interface Props {
  chartRef: React.MutableRefObject<IChartApi | null>;
  candles: any[]; // raw klines
}

const TVIndicatorsLayer = ({ chartRef, candles }: Props) => {
  const { tvIndicators } = useTradingStore();
  const seriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !candles.length) return;

    // remove old
    for (const [, s] of seriesRef.current) {
      try { chart.removeSeries(s); } catch {}
    }
    seriesRef.current.clear();

    // build bars in oakscriptjs Bar format
    const bars = candles.map((k: any) => ({
      time: Math.floor(k[0] / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    for (const inst of tvIndicators) {
      if (!inst.enabled) continue;
      const def = TV_INDICATOR_MAP.get(inst.defId);
      if (!def) continue;
      const result: any = calculateTVIndicator(def, bars, inst.params);
      if (!result?.plots) continue;

      def.plots.forEach((plot, idx) => {
        const data = result.plots[plot.key];
        if (!Array.isArray(data) || data.length === 0) return;
        const isOscillator = plot.pane === 'separate';
        const priceScaleId = isOscillator ? `osc_${def.id}` : 'right';
        try {
          const series = plot.type === 'histogram'
            ? chart.addSeries(HistogramSeries, {
                color: plot.color,
                priceScaleId,
                priceFormat: { type: 'volume' },
                title: `${def.name} ${plot.label}`,
              })
            : chart.addSeries(LineSeries, {
                color: plot.color,
                lineWidth: plot.lineWidth ?? 2,
                priceScaleId,
                lastValueVisible: true,
                priceLineVisible: false,
                title: `${def.name} ${plot.label}`,
              });
          if (isOscillator) {
            series.priceScale().applyOptions({
              scaleMargins: { top: 0.75 + idx * 0.03, bottom: 0.02 },
            });
          }
          // sanitize: data may be { time, value } or numbers
          const cleaned = data
            .filter((d: any) => d != null && (typeof d === 'number' ? !isNaN(d) : d.value != null && !isNaN(d.value)))
            .map((d: any) => typeof d === 'number'
              ? { time: bars[bars.length - data.length + data.indexOf(d)]?.time, value: d }
              : d);
          series.setData(cleaned);
          seriesRef.current.set(`${inst.instanceId}_${plot.key}`, series);
        } catch (e) {
          console.warn('[TVIndicatorsLayer] failed to add', def.name, plot.label, e);
        }
      });
    }

    return () => {
      const c = chartRef.current;
      if (!c) return;
      for (const [, s] of seriesRef.current) {
        try { c.removeSeries(s); } catch {}
      }
      seriesRef.current.clear();
    };
  }, [tvIndicators, candles, chartRef]);

  return null;
};

export default TVIndicatorsLayer;
