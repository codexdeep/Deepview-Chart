import { useTradingStore, type ChartLayout } from '@/store/tradingStore';
import TradingChart from './TradingChart';
import { LayoutGrid, Search, X } from 'lucide-react';
import { useState, useMemo } from 'react';

const layouts: { value: ChartLayout; label: string; cols: number; rows: number }[] = [
  { value: '1', label: '1', cols: 1, rows: 1 },
  { value: '2', label: '2', cols: 2, rows: 1 },
  { value: '4', label: '4', cols: 2, rows: 2 },
];

const COMMON_PAIRS = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','AVAXUSDT','DOTUSDT','LINKUSDT','MATICUSDT','LTCUSDT','TRXUSDT','SHIBUSDT','PEPEUSDT','ARBUSDT','OPUSDT','APTUSDT','SUIUSDT','TONUSDT'];
const ALL_TF = ['1m','3m','5m','15m','30m','1h','2h','4h','6h','12h','1d','1w','1M'];

const ChartInstancePicker = ({ instanceId, currentSymbol, currentTf }: { instanceId: string; currentSymbol: string; currentTf: string }) => {
  const updateChartInstance = useTradingStore(s => s.updateChartInstance);
  const allMarkets = useTradingStore(s => s.allMarkets);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const pool = allMarkets.length > 0 ? allMarkets.map(m => m.symbol) : COMMON_PAIRS;

  const results = useMemo(() => {
    if (!search) return pool.slice(0, 20);
    const q = search.toUpperCase();
    return pool.filter(s => s.includes(q)).slice(0, 20);
  }, [search, pool]);

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-terminal-border/50 bg-terminal-header relative">
      <button onClick={() => setOpen(!open)} className="text-[10px] font-mono font-bold text-foreground hover:text-primary cursor-pointer flex items-center gap-1">
        <Search className="w-2.5 h-2.5" />
        {currentSymbol}
      </button>
      <select
        value={currentTf}
        onChange={(e) => updateChartInstance(instanceId, { timeframe: e.target.value })}
        className="bg-transparent text-[10px] font-mono text-muted-foreground focus:outline-none cursor-pointer"
      >
        {ALL_TF.map(tf => <option key={tf} value={tf}>{tf}</option>)}
      </select>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-48 bg-popover border border-terminal-border rounded shadow-lg">
          <div className="relative p-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-muted border border-terminal-border rounded pl-6 pr-2 py-1 text-[11px] focus:outline-none"
            />
            <button onClick={() => setOpen(false)} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {results.map(s => (
              <button
                key={s}
                onClick={() => { updateChartInstance(instanceId, { symbol: s }); setOpen(false); setSearch(''); }}
                className="w-full text-left px-2 py-1 text-[11px] hover:bg-accent text-foreground"
              >{s}</button>
            ))}
            {results.length === 0 && <div className="px-2 py-2 text-[10px] text-muted-foreground">No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
};

const MultiChartLayout = () => {
  const { chartLayout, setChartLayout, chartInstances } = useTradingStore();

  const layout = layouts.find(l => l.value === chartLayout) || layouts[0];
  const count = parseInt(chartLayout);
  const instances = chartInstances.slice(0, count);

  if (chartLayout === '1') return <TradingChart />;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-2 py-1 border-b border-terminal bg-terminal-panel">
        <LayoutGrid className="w-3 h-3 text-primary" />
        <span className="text-[10px] text-muted-foreground uppercase">Layout</span>
        <div className="flex gap-0.5">
          {layouts.map(l => (
            <button
              key={l.value}
              onClick={() => setChartLayout(l.value)}
              className={`px-2 py-0.5 text-[10px] rounded ${
                chartLayout === l.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {l.label}×
            </button>
          ))}
        </div>
      </div>

      <div
        className="flex-1 grid gap-px bg-terminal-border"
        style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)`, gridTemplateRows: `repeat(${layout.rows}, 1fr)` }}
      >
        {instances.map((instance) => (
          <div key={instance.id} className="bg-terminal-panel flex flex-col min-h-0 overflow-hidden">
            <ChartInstancePicker instanceId={instance.id} currentSymbol={instance.symbol} currentTf={instance.timeframe} />
            <div className="flex-1 min-h-0">
              <TradingChart
                key={`${instance.id}_${instance.symbol}_${instance.timeframe}`}
                overrideSymbol={instance.symbol}
                overrideTimeframe={instance.timeframe}
                compact
                instanceId={instance.id}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiChartLayout;
