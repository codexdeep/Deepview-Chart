import { useTradingStore } from '@/store/tradingStore';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import type { OrderType } from '@/store/tradingStore';

const orderTypes: { value: OrderType; label: string }[] = [
  { value: 'limit', label: 'Limit' },
  { value: 'market', label: 'Market' },
  { value: 'stop-limit', label: 'Stop Limit' },
  { value: 'oco', label: 'OCO' },
  { value: 'trailing-stop', label: 'Trailing' },
];

const OrderEntry = () => {
  const {
    selectedSymbol, leverage, setLeverage, tradingMode, apiKeysConfigured,
    tradingEnv, demoBalance, setDemoBalance, addPosition,
  } = useTradingStore();
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('0.01');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [sliderValue, setSliderValue] = useState(25);
  const [submitting, setSubmitting] = useState(false);

  const currentTicker = useTradingStore(s => s.watchlist.find(t => t.symbol === selectedSymbol));
  const displayPrice = price || (currentTicker?.price?.toFixed(2) ?? '0');

  const handleDemoOrder = () => {
    const px = parseFloat(displayPrice);
    const qty = parseFloat(quantity);
    if (!px || !qty) { toast.error('Invalid price or quantity'); return; }
    const margin = (px * qty) / (tradingMode === 'futures' ? leverage : 1);
    if (margin > demoBalance) { toast.error('Insufficient demo balance'); return; }
    setDemoBalance(demoBalance - margin);
    addPosition({
      id: `demo_${Date.now()}`,
      symbol: selectedSymbol,
      side: side === 'buy' ? 'LONG' : 'SHORT',
      entryPrice: px,
      markPrice: px,
      quantity: qty,
      leverage: tradingMode === 'futures' ? leverage : 1,
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
      liquidationPrice: side === 'buy' ? px * (1 - 1 / leverage) : px * (1 + 1 / leverage),
      margin,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
    });
    toast.success(`✅ DEMO ${side.toUpperCase()} ${qty} ${selectedSymbol} @ ${px}`);
  };

  const handleSubmit = async () => {
    if (tradingEnv === 'demo') { handleDemoOrder(); return; }
    if (!apiKeysConfigured) { toast.error('API keys not configured. Open settings.'); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('binance-trade', {
        body: {
          symbol: selectedSymbol,
          side: side.toUpperCase(),
          type: orderType === 'market' ? 'MARKET' : orderType === 'limit' ? 'LIMIT' : 'STOP_LOSS_LIMIT',
          quantity: parseFloat(quantity),
          price: orderType !== 'market' ? parseFloat(displayPrice) : undefined,
          leverage: tradingMode === 'futures' ? leverage : undefined,
          tradingMode,
        },
      });
      if (error) throw error;
      toast.success(`Order placed: ${side.toUpperCase()} ${quantity} ${selectedSymbol}`);
    } catch (err: any) {
      toast.error(`Order failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-terminal-panel">
      <div className="px-3 py-2 border-b border-terminal flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Entry</h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tradingEnv === 'demo' ? 'bg-info/20 text-info' : 'bg-loss/20 text-loss'}`}>
          {tradingEnv === 'demo' ? '🧪 DEMO' : '⚡ LIVE'}
        </span>
      </div>

      <div className="flex px-3 pt-3 gap-1">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 text-xs font-bold rounded transition-all ${
            side === 'buy' ? 'bg-buy text-white shadow-lg shadow-buy/30' : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          {tradingMode === 'futures' ? 'LONG' : 'BUY'}
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 text-xs font-bold rounded transition-all ${
            side === 'sell' ? 'bg-sell text-white shadow-lg shadow-sell/30' : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          {tradingMode === 'futures' ? 'SHORT' : 'SELL'}
        </button>
      </div>

      <div className="flex px-3 pt-3 gap-1 flex-wrap">
        {orderTypes.map((ot) => (
          <button
            key={ot.value}
            onClick={() => setOrderType(ot.value)}
            className={`px-2 py-1 text-[10px] rounded transition-all ${
              orderType === ot.value ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {ot.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3 space-y-3">
        {tradingMode === 'futures' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-muted-foreground uppercase">Leverage</label>
              <span className="text-xs font-mono font-bold text-primary">{leverage}x</span>
            </div>
            <input type="range" min={1} max={125} value={leverage} onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-primary" />
          </div>
        )}

        {orderType !== 'market' && (
          <div>
            <label className="text-[10px] text-muted-foreground uppercase block mb-1">Price (USDT)</label>
            <input type="text" value={displayPrice} onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-muted border border-terminal-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
        )}

        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-1">Amount ({selectedSymbol.replace('USDT', '')})</label>
          <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-muted border border-terminal-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-loss uppercase block mb-1">Stop Loss</label>
            <input type="text" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="optional"
              className="w-full bg-muted border border-terminal-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-loss/50" />
          </div>
          <div>
            <label className="text-[10px] text-profit uppercase block mb-1">Take Profit</label>
            <input type="text" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="optional"
              className="w-full bg-muted border border-terminal-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-profit/50" />
          </div>
        </div>

        <div>
          <input type="range" min={0} max={100} value={sliderValue} onChange={(e) => setSliderValue(Number(e.target.value))}
            className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-primary" />
          <div className="flex justify-between mt-1">
            {[25, 50, 75, 100].map(pct => (
              <button key={pct} onClick={() => setSliderValue(pct)}
                className={`text-[10px] px-2 py-0.5 rounded ${sliderValue === pct ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}>
                {pct}%
              </button>
            ))}
          </div>
        </div>

        <div className="bg-muted rounded p-2 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Est. Cost</span>
            <span className="font-mono text-foreground">
              {(parseFloat(displayPrice || '0') * parseFloat(quantity || '0') / (tradingMode === 'futures' ? leverage : 1)).toFixed(2)} USDT
            </span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Fee (0.04%)</span>
            <span className="font-mono text-foreground">
              {(parseFloat(displayPrice || '0') * parseFloat(quantity || '0') * 0.0004).toFixed(2)} USDT
            </span>
          </div>
          {tradingEnv === 'demo' && (
            <div className="flex justify-between text-[10px] pt-1 border-t border-terminal-border">
              <span className="text-info">Demo Balance</span>
              <span className="font-mono font-bold text-info">${demoBalance.toFixed(2)}</span>
            </div>
          )}
        </div>

        {tradingEnv === 'live' && !apiKeysConfigured && (
          <div className="bg-warning/10 border border-warning/30 rounded p-2 text-[10px] text-warning">
            ⚠️ Connect Binance API keys to trade live. Switch to DEMO to practice risk-free.
          </div>
        )}
      </div>

      <div className="px-3 py-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || (tradingEnv === 'live' && !apiKeysConfigured)}
          className={`w-full py-3 rounded font-bold text-sm transition-all disabled:opacity-50 ${
            side === 'buy' ? 'bg-buy text-white hover:opacity-90 shadow-lg shadow-buy/20' : 'bg-sell text-white hover:opacity-90 shadow-lg shadow-sell/20'
          }`}
        >
          {submitting ? 'Placing...' : (
            side === 'buy' ? (tradingMode === 'futures' ? 'Open Long' : 'Buy') : (tradingMode === 'futures' ? 'Open Short' : 'Sell')
          )} {selectedSymbol.replace('USDT', '')}
        </button>
      </div>
    </div>
  );
};

export default OrderEntry;
