import { useEffect, useRef, useState } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';

interface Drawing {
  id: string;
  tool: string;
  symbol: string;
  timeframe: string;
  // Two anchor points in (time, price)
  p1: { time: number; price: number };
  p2: { time: number; price: number };
  text?: string;
  brushPoints?: { time: number; price: number }[];
}

interface Props {
  chartRef: React.MutableRefObject<IChartApi | null>;
  candleSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>;
  symbol: string;
  timeframe: string;
}

const STORAGE_KEY = 'dv_drawings_v2';

function loadAll(): Drawing[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveAll(d: Drawing[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {}
}

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

const DrawingOverlay = ({ chartRef, candleSeriesRef, symbol, timeframe }: Props) => {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeDrawingTool, setActiveDrawingTool } = useTradingStore();
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [drafting, setDrafting] = useState<Drawing | null>(null);
  const draftRef = useRef<Drawing | null>(null);

  // Load filtered drawings for this symbol/tf
  useEffect(() => {
    const all = loadAll();
    setDrawings(all.filter(d => d.symbol === symbol && d.timeframe === timeframe));
  }, [symbol, timeframe]);

  // Listen for clear-all events
  useEffect(() => {
    const handler = () => {
      const all = loadAll().filter(d => !(d.symbol === symbol && d.timeframe === timeframe));
      saveAll(all);
      setDrawings([]);
    };
    window.addEventListener('dv-clear-drawings', handler);
    return () => window.removeEventListener('dv-clear-drawings', handler);
  }, [symbol, timeframe]);

  // Resize canvas to match parent
  useEffect(() => {
    const canvas = overlayRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ro = new ResizeObserver(() => {
      const parent = container.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      render();
    });
    if (container.parentElement) ro.observe(container.parentElement);
    return () => ro.disconnect();
  }, []);

  function coordToData(x: number, y: number): { time: number; price: number } | null {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return null;
    const time = chart.timeScale().coordinateToTime(x);
    const price = series.coordinateToPrice(y);
    if (time === null || price === null) return null;
    return { time: time as any as number, price: price as number };
  }

  function dataToCoord(time: number, price: number): { x: number; y: number } | null {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return null;
    const x = chart.timeScale().timeToCoordinate(time as any);
    const y = series.priceToCoordinate(price);
    if (x === null || y === null) return null;
    return { x, y };
  }

  function render() {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const all = drafting ? [...drawings, drafting] : drawings;

    for (const d of all) {
      drawShape(ctx, d);
    }
  }

  function drawShape(ctx: CanvasRenderingContext2D, d: Drawing) {
    const c1 = dataToCoord(d.p1.time, d.p1.price);
    const c2 = dataToCoord(d.p2.time, d.p2.price);
    if (!c1 || !c2) return;

    ctx.strokeStyle = 'hsl(270, 95%, 70%)';
    ctx.fillStyle = 'hsla(270, 95%, 70%, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    const w = overlayRef.current!.width;

    switch (d.tool) {
      case 'trendline':
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();
        break;
      case 'hline':
        ctx.beginPath();
        ctx.moveTo(0, c1.y);
        ctx.lineTo(w, c1.y);
        ctx.stroke();
        ctx.fillStyle = 'hsl(270, 95%, 70%)';
        ctx.font = '10px JetBrains Mono';
        ctx.fillText(d.p1.price.toFixed(2), 6, c1.y - 4);
        break;
      case 'vline':
        ctx.beginPath();
        ctx.moveTo(c1.x, 0);
        ctx.lineTo(c1.x, overlayRef.current!.height);
        ctx.stroke();
        break;
      case 'rectangle':
        ctx.fillRect(Math.min(c1.x, c2.x), Math.min(c1.y, c2.y), Math.abs(c2.x - c1.x), Math.abs(c2.y - c1.y));
        ctx.strokeRect(Math.min(c1.x, c2.x), Math.min(c1.y, c2.y), Math.abs(c2.x - c1.x), Math.abs(c2.y - c1.y));
        break;
      case 'fib': {
        const high = Math.max(d.p1.price, d.p2.price);
        const low = Math.min(d.p1.price, d.p2.price);
        const x1 = Math.min(c1.x, c2.x);
        const x2 = Math.max(c1.x, c2.x);
        ctx.font = '10px JetBrains Mono';
        FIB_LEVELS.forEach((lvl, i) => {
          const price = high - (high - low) * lvl;
          const y = candleSeriesRef.current!.priceToCoordinate(price);
          if (y === null) return;
          const colors = ['#a855f7', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#a855f7'];
          ctx.strokeStyle = colors[i];
          ctx.fillStyle = colors[i];
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
          ctx.fillText(`${(lvl * 100).toFixed(1)}% — ${price.toFixed(2)}`, x2 + 4, y + 3);
        });
        break;
      }
      case 'measure': {
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();
        const diff = d.p2.price - d.p1.price;
        const pct = (diff / d.p1.price) * 100;
        ctx.fillStyle = diff >= 0 ? 'hsl(158, 90%, 55%)' : 'hsl(348, 90%, 62%)';
        ctx.font = 'bold 11px JetBrains Mono';
        ctx.fillText(`${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${pct.toFixed(2)}%)`, (c1.x + c2.x) / 2, (c1.y + c2.y) / 2 - 6);
        break;
      }
      case 'text':
        ctx.fillStyle = 'hsl(270, 95%, 70%)';
        ctx.font = 'bold 12px Inter';
        ctx.fillText(d.text || 'Note', c1.x, c1.y);
        break;
      case 'brush':
        if (d.brushPoints && d.brushPoints.length > 1) {
          ctx.beginPath();
          d.brushPoints.forEach((pt, i) => {
            const c = dataToCoord(pt.time, pt.price);
            if (!c) return;
            if (i === 0) ctx.moveTo(c.x, c.y);
            else ctx.lineTo(c.x, c.y);
          });
          ctx.stroke();
        }
        break;
    }
  }

  // Re-render every frame while chart updates (cheap)
  useEffect(() => {
    let raf: number;
    const loop = () => { render(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [drawings, drafting]);

  function onPointerDown(e: React.PointerEvent) {
    if (!activeDrawingTool) return;
    const rect = overlayRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const data = coordToData(x, y);
    if (!data) return;

    if (activeDrawingTool === 'text') {
      const text = prompt('Enter text:');
      if (!text) return;
      const newD: Drawing = {
        id: `d_${Date.now()}`, tool: 'text', symbol, timeframe,
        p1: data, p2: data, text,
      };
      const all = [...loadAll(), newD];
      saveAll(all);
      setDrawings(prev => [...prev, newD]);
      setActiveDrawingTool(null);
      return;
    }

    if (activeDrawingTool === 'hline' || activeDrawingTool === 'vline') {
      const newD: Drawing = {
        id: `d_${Date.now()}`, tool: activeDrawingTool, symbol, timeframe,
        p1: data, p2: data,
      };
      const all = [...loadAll(), newD];
      saveAll(all);
      setDrawings(prev => [...prev, newD]);
      setActiveDrawingTool(null);
      return;
    }

    const draft: Drawing = {
      id: `d_${Date.now()}`, tool: activeDrawingTool, symbol, timeframe,
      p1: data, p2: data,
      brushPoints: activeDrawingTool === 'brush' ? [data] : undefined,
    };
    draftRef.current = draft;
    setDrafting(draft);
    overlayRef.current!.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draftRef.current) return;
    const rect = overlayRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const data = coordToData(x, y);
    if (!data) return;
    const updated: Drawing = { ...draftRef.current, p2: data };
    if (draftRef.current.tool === 'brush' && draftRef.current.brushPoints) {
      updated.brushPoints = [...draftRef.current.brushPoints, data];
      draftRef.current = updated;
    }
    draftRef.current = updated;
    setDrafting(updated);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!draftRef.current) return;
    try { overlayRef.current!.releasePointerCapture(e.pointerId); } catch {}
    const final = draftRef.current;
    draftRef.current = null;
    setDrafting(null);
    const all = [...loadAll(), final];
    saveAll(all);
    setDrawings(prev => [...prev, final]);
    if (final.tool !== 'brush') setActiveDrawingTool(null);
  }

  const cursorStyle = activeDrawingTool ? 'crosshair' : 'default';
  const pointerEvents = activeDrawingTool ? 'auto' : 'none';

  return (
    <div ref={containerRef} className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }}>
      <canvas
        ref={overlayRef}
        className="absolute inset-0"
        style={{ pointerEvents, cursor: cursorStyle }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </div>
  );
};

export default DrawingOverlay;
