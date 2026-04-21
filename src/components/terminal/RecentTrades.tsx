import { useTradingStore } from '@/store/tradingStore';

const RecentTrades = () => {
  const { recentTrades } = useTradingStore();

  return (
    <div className="flex flex-col h-full bg-terminal-panel">
      <div className="px-3 py-2 border-b border-terminal">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Trades</h3>
      </div>

      <div className="flex items-center px-3 py-1 text-[10px] text-muted-foreground uppercase border-b border-terminal">
        <span className="flex-1">Price</span>
        <span className="w-16 text-right">Size</span>
        <span className="w-16 text-right">Time</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {recentTrades.length === 0 && (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Waiting for trades...</div>
        )}
        {recentTrades.map((trade, i) => (
          <div key={i} className="flex items-center px-3 py-0.5 text-[11px] font-mono hover:bg-accent/30">
            <span className={`flex-1 ${trade.side === 'buy' ? 'text-profit' : 'text-loss'}`}>
              {trade.price.toFixed(2)}
            </span>
            <span className="w-16 text-right text-foreground/70">{trade.quantity.toFixed(4)}</span>
            <span className="w-16 text-right text-muted-foreground">{trade.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentTrades;
