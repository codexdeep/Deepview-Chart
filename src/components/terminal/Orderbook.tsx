import { useTradingStore } from '@/store/tradingStore';

const Orderbook = () => {
  const { asks, bids, selectedSymbol } = useTradingStore();
  const currentTicker = useTradingStore(s => s.watchlist.find(t => t.symbol === selectedSymbol));
  const maxTotal = Math.max(asks[asks.length - 1]?.total || 1, bids[bids.length - 1]?.total || 1);

  return (
    <div className="flex flex-col h-full bg-terminal-panel">
      <div className="px-3 py-2 border-b border-terminal">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Book</h3>
      </div>

      <div className="flex items-center px-3 py-1 text-[10px] text-muted-foreground uppercase border-b border-terminal">
        <span className="flex-1">Price</span>
        <span className="w-16 text-right">Size</span>
        <span className="w-16 text-right">Total</span>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Asks (reversed so lowest ask is at bottom) */}
        <div className="flex-1 overflow-hidden flex flex-col justify-end">
          {[...asks].reverse().slice(0, 10).map((entry, i) => (
            <div key={`ask-${i}`} className="relative flex items-center px-3 py-0.5 text-[11px] font-mono">
              <div
                className="absolute right-0 top-0 bottom-0 bg-loss/10"
                style={{ width: `${(entry.total / maxTotal) * 100}%` }}
              />
              <span className="flex-1 text-loss relative z-10">{entry.price.toFixed(2)}</span>
              <span className="w-16 text-right text-foreground/70 relative z-10">{entry.quantity.toFixed(4)}</span>
              <span className="w-16 text-right text-foreground/50 relative z-10">{entry.total.toFixed(4)}</span>
            </div>
          ))}
        </div>

        {/* Spread / Last Price */}
        <div className="px-3 py-1.5 border-y border-terminal bg-terminal-header">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-mono font-bold ${(currentTicker?.changePercent ?? 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
              {currentTicker?.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '-'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Spread: {((asks[0]?.price || 0) - (bids[0]?.price || 0)).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Bids */}
        <div className="flex-1 overflow-hidden">
          {bids.slice(0, 10).map((entry, i) => (
            <div key={`bid-${i}`} className="relative flex items-center px-3 py-0.5 text-[11px] font-mono">
              <div
                className="absolute right-0 top-0 bottom-0 bg-profit/10"
                style={{ width: `${(entry.total / maxTotal) * 100}%` }}
              />
              <span className="flex-1 text-profit relative z-10">{entry.price.toFixed(2)}</span>
              <span className="w-16 text-right text-foreground/70 relative z-10">{entry.quantity.toFixed(4)}</span>
              <span className="w-16 text-right text-foreground/50 relative z-10">{entry.total.toFixed(4)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Orderbook;
