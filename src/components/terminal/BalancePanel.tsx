import { useEffect, useState } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';

const BalancePanel = () => {
  const { apiKeysConfigured, balances, setBalances, setAccountInfo, totalEquity, availableBalance, futuresBalance, unrealizedPnlTotal } = useTradingStore();
  const [loading, setLoading] = useState(false);

  const fetchBalances = async () => {
    const apiKey = localStorage.getItem('dv_api_key');
    const secretKey = localStorage.getItem('dv_secret_key');
    if (!apiKey || !secretKey) return;

    // Decrypt
    const decrypt = (encoded: string) => {
      try { const decoded = atob(encoded); return decoded.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (42 + i % 10))).join(''); } catch { return ''; }
    };

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('binance-trade', {
        body: { action: 'account', apiKey: decrypt(apiKey), secretKey: decrypt(secretKey) },
      });
      if (error) throw error;
      if (data?.balances) {
        const nonZero = data.balances
          .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
          .map((b: any) => ({
            asset: b.asset,
            available: parseFloat(b.free),
            inOrder: parseFloat(b.locked),
            totalValue: parseFloat(b.free) + parseFloat(b.locked),
          }));
        setBalances(nonZero);
        
        const total = nonZero.reduce((s: number, b: any) => s + b.totalValue, 0);
        setAccountInfo({
          totalEquity: total,
          availableBalance: nonZero.reduce((s: number, b: any) => s + b.available, 0),
          futuresBalance: 0,
          unrealizedPnlTotal: 0,
        });
      }
    } catch (err) {
      console.error('[Balance] Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!apiKeysConfigured) return;
    fetchBalances();
    const interval = setInterval(fetchBalances, 5000);
    return () => clearInterval(interval);
  }, [apiKeysConfigured]);

  if (!apiKeysConfigured) {
    return (
      <div className="p-3 text-xs text-muted-foreground text-center">
        Connect your API keys to view balances
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary */}
      <div className="p-3 space-y-1.5 border-b border-terminal">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground uppercase">Portfolio</span>
          <button onClick={fetchBalances} disabled={loading} className="p-0.5 hover:bg-accent rounded">
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total Equity</span>
          <span className="font-mono font-bold text-foreground">${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Available</span>
          <span className="font-mono text-foreground">${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Unrealized PnL</span>
          <span className={`font-mono ${unrealizedPnlTotal >= 0 ? 'text-profit' : 'text-loss'}`}>
            {unrealizedPnlTotal >= 0 ? '+' : ''}{unrealizedPnlTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Balance table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-muted-foreground text-left border-b border-terminal">
              <th className="px-3 py-1.5 font-medium">Asset</th>
              <th className="px-3 py-1.5 font-medium text-right">Available</th>
              <th className="px-3 py-1.5 font-medium text-right">In Order</th>
              <th className="px-3 py-1.5 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.asset} className="border-b border-terminal-border/30 hover:bg-accent/30">
                <td className="px-3 py-1.5 font-mono font-medium text-foreground">{b.asset}</td>
                <td className="px-3 py-1.5 font-mono text-right text-foreground">{b.available.toFixed(8)}</td>
                <td className="px-3 py-1.5 font-mono text-right text-warning">{b.inOrder.toFixed(8)}</td>
                <td className="px-3 py-1.5 font-mono text-right font-medium text-foreground">{b.totalValue.toFixed(8)}</td>
              </tr>
            ))}
            {balances.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">{loading ? 'Loading...' : 'No balances'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BalancePanel;
