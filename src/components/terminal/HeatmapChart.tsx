import { useEffect, useRef, useState } from 'react';
import { fetchFullDepth } from '@/services/binanceWebSocket';

interface Props {
  symbol: string;
}

const HeatmapChart = ({ symbol }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;

    async function renderHeatmap() {
      setLoading(true);
      try {
        const depth = await fetchFullDepth(symbol, 100);
        if (cancelled) return;
        drawHeatmap(depth);
      } catch (err) {
        console.error('[Heatmap] Error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    renderHeatmap();
    interval = setInterval(renderHeatmap, 2000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [symbol]);

  function drawHeatmap(depth: any) {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'hsl(220, 22%, 5%)';
    ctx.fillRect(0, 0, w, h);

    const bids: [number, number][] = depth.bids.map(([p, q]: string[]) => [parseFloat(p), parseFloat(q)]);
    const asks: [number, number][] = depth.asks.map(([p, q]: string[]) => [parseFloat(p), parseFloat(q)]);

    const allPrices = [...bids.map(b => b[0]), ...asks.map(a => a[0])];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const range = maxPrice - minPrice;

    const maxQty = Math.max(...bids.map(b => b[1]), ...asks.map(a => a[1]));

    const barHeight = Math.max(2, h / (bids.length + asks.length));

    // Draw bids (green)
    bids.forEach(([price, qty]) => {
      const y = h - ((price - minPrice) / range) * h;
      const barW = (qty / maxQty) * w * 0.8;
      const intensity = Math.min(qty / maxQty, 1);

      ctx.fillStyle = `rgba(34, 197, 94, ${0.1 + intensity * 0.6})`;
      ctx.fillRect(w / 2 - barW, y - barHeight / 2, barW, barHeight);

      if (intensity > 0.5) {
        ctx.fillStyle = `rgba(34, 197, 94, ${intensity})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(34, 197, 94, 0.5)';
        ctx.fillRect(w / 2 - barW, y - barHeight / 2, barW, barHeight);
        ctx.shadowBlur = 0;
      }
    });

    // Draw asks (red)
    asks.forEach(([price, qty]) => {
      const y = h - ((price - minPrice) / range) * h;
      const barW = (qty / maxQty) * w * 0.8;
      const intensity = Math.min(qty / maxQty, 1);

      ctx.fillStyle = `rgba(239, 68, 68, ${0.1 + intensity * 0.6})`;
      ctx.fillRect(w / 2, y - barHeight / 2, barW, barHeight);

      if (intensity > 0.5) {
        ctx.fillStyle = `rgba(239, 68, 68, ${intensity})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
        ctx.fillRect(w / 2, y - barHeight / 2, barW, barHeight);
        ctx.shadowBlur = 0;
      }
    });

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText('BIDS', 10, 15);
    ctx.textAlign = 'right';
    ctx.fillText('ASKS', w - 10, 15);

    // Mid price line
    const midPrice = ((bids[0]?.[0] ?? 0) + (asks[0]?.[0] ?? 0)) / 2;
    const midY = h - ((midPrice - minPrice) / range) * h;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText(midPrice.toFixed(2), w / 2, midY - 5);

    // Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.font = '48px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('DeepView', w / 2, h / 2);
  }

  return (
    <div ref={containerRef} className="flex-1 relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-terminal-bg/80 z-10">
          <div className="text-xs text-muted-foreground font-mono animate-pulse">Loading heatmap...</div>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default HeatmapChart;
