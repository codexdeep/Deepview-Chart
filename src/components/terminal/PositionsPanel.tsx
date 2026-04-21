import { useTradingStore } from '@/store/tradingStore';
import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import BalancePanel from './BalancePanel';

type Tab = 'positions' | 'orders' | 'history' | 'assets';

const PositionsPanel = () => {
  const { positions, tradeHistory, closePosition, tradingEnv, watchlist } = useTradingStore();
  const [tab, setTab] = useState<Tab>('positions');

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: 'positions', label: 'Positions', count: positions.length },
    { value: 'orders', label: 'Open Orders', count: 0 },
    { value: 'history', label: 'Trade History' },
    { value: 'assets', label: 'Portfolio' },
  ];

  const totalPnl = positions.reduce((acc, p) => acc + p.unrealizedPnl, 0);

  return (
    <div className="flex flex-col h-full bg-terminal-panel">
      <div className="flex items-center justify-between border-b border-terminal">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 text-xs font-medium transition-all border-b-2 ${
                tab === t.value ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-accent text-[10px]">{t.count}</span>
              )}
            </button>
          ))}
        </div>
        {tab === 'positions' && (
          <div className="pr-3 text-xs font-mono">
            Total uPnL: <span className={totalPnl >= 0 ? 'text-profit' : 'text-loss'}>{totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} USDT</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'positions' && (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground text-left border-b border-terminal">
                <th className="px-3 py-2 font-medium">Symbol</th>
                <th className="px-3 py-2 font-medium">Side</th>
                <th className="px-3 py-2 font-medium text-right">Size</th>
                <th className="px-3 py-2 font-medium text-right">Entry</th>
                <th className="px-3 py-2 font-medium text-right">Mark</th>
                <th className="px-3 py-2 font-medium text-right">Lev.</th>
                <th className="px-3 py-2 font-medium text-right">Liq. Price</th>
                <th className="px-3 py-2 font-medium text-right">Margin</th>
                <th className="px-3 py-2 font-medium text-right">uPnL</th>
                <th className="px-3 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 && (
                <tr><td colSpan={10} className="px-3 py-4 text-center text-muted-foreground">No open positions</td></tr>
              )}
              {positions.map((pos) => (
                <tr key={pos.id} className="border-b border-terminal-border/30 hover:bg-accent/50 transition-colors">
                  <td className="px-3 py-2 font-mono font-medium text-foreground">{pos.symbol}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pos.side === 'LONG' ? 'bg-buy/20 text-buy' : 'bg-sell/20 text-sell'}`}>{pos.side}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{pos.quantity}</td>
                  <td className="px-3 py-2 text-right font-mono">{pos.entryPrice.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono">{pos.markPrice.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-primary">{pos.leverage}x</td>
                  <td className="px-3 py-2 text-right font-mono text-warning">{pos.liquidationPrice.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono">{pos.margin.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right font-mono font-bold ${pos.unrealizedPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {pos.unrealizedPnl >= 0 ? '+' : ''}{pos.unrealizedPnl.toFixed(2)}
                    <div className="text-[9px] font-normal">{pos.unrealizedPnlPercent >= 0 ? '+' : ''}{pos.unrealizedPnlPercent.toFixed(2)}%</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => {
                        const ticker = watchlist.find(t => t.symbol === pos.symbol);
                        const exit = ticker?.price || pos.markPrice || pos.entryPrice;
                        closePosition(pos.id, exit);
                        toast.success(`Closed ${pos.side} ${pos.symbol} @ ${exit.toLocaleString()} · PnL ${pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}`);
                      }}
                      className="px-2 py-1 rounded-md bg-loss/10 hover:bg-loss/20 border border-loss/20 text-[10px] font-bold text-loss transition"
                      title="Close position"
                    >
                      Close
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'history' && (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground text-left border-b border-terminal">
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Symbol</th>
                <th className="px-3 py-2 font-medium">Side</th>
                <th className="px-3 py-2 font-medium text-right">Price</th>
                <th className="px-3 py-2 font-medium text-right">Qty</th>
                <th className="px-3 py-2 font-medium text-right">Fee</th>
                <th className="px-3 py-2 font-medium text-right">Realized PnL</th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No trade history</td></tr>
              )}
              {tradeHistory.map((trade) => (
                <tr key={trade.id} className="border-b border-terminal-border/30 hover:bg-accent/50">
                  <td className="px-3 py-2 font-mono text-muted-foreground">{trade.time}</td>
                  <td className="px-3 py-2 font-mono font-medium">{trade.symbol}</td>
                  <td className="px-3 py-2"><span className={trade.side === 'BUY' ? 'text-buy' : 'text-sell'}>{trade.side}</span></td>
                  <td className="px-3 py-2 text-right font-mono">{trade.price.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono">{trade.quantity}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{trade.fee.toFixed(2)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${trade.realizedPnl > 0 ? 'text-profit' : trade.realizedPnl < 0 ? 'text-loss' : 'text-muted-foreground'}`}>
                    {trade.realizedPnl !== 0 ? (trade.realizedPnl > 0 ? '+' : '') + trade.realizedPnl.toFixed(2) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'orders' && (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No open orders</div>
        )}

        {tab === 'assets' && <BalancePanel />}
      </div>
    </div>
  );
};

export default PositionsPanel;
