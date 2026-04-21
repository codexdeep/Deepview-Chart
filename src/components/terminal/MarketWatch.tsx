import { useTradingStore, type MarketFilter } from '@/store/tradingStore';
import { Star, Search, TrendingUp, TrendingDown, X } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchSpotExchangeInfo, fetchFuturesExchangeInfo, fetch24hrTickers } from '@/services/binanceWebSocket';

const filters: { value: MarketFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'spot', label: 'Spot' },
  { value: 'futures', label: 'USDⓈ-M' },
  { value: 'coin-m', label: 'COIN-M' },
];

const MarketWatch = () => {
  const {
    watchlist, allMarkets, selectedSymbol, setSelectedSymbol,
    marketFilter, setMarketFilter, marketSearch, setMarketSearch, setAllMarkets,
    favorites, toggleFavorite,
  } = useTradingStore();
  const [tab, setTab] = useState<'favorites' | 'all'>('favorites');
  const [loading, setLoading] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);

  useEffect(() => {
    if (tab !== 'all' || allLoaded) return;
    let cancelled = false;
    setLoading(true);

    async function loadMarkets() {
      try {
        const [spotInfo, futuresInfo, tickers] = await Promise.all([
          fetchSpotExchangeInfo(),
          fetchFuturesExchangeInfo().catch(() => ({ symbols: [] })),
          fetch24hrTickers(),
        ]);
        const tickerMap = new Map<string, any>();
        for (const t of tickers) tickerMap.set(t.symbol, t);
        const spotSymbols = new Set<string>();
        const markets: any[] = [];
        for (const s of spotInfo.symbols) {
          if (s.status !== 'TRADING') continue;
          spotSymbols.add(s.symbol);
          const t = tickerMap.get(s.symbol);
          markets.push({
            symbol: s.symbol,
            price: t ? parseFloat(t.lastPrice) : 0,
            change24h: t ? parseFloat(t.priceChange) : 0,
            changePercent: t ? parseFloat(t.priceChangePercent) : 0,
            volume: t ? parseFloat(t.quoteVolume) : 0,
            high24h: t ? parseFloat(t.highPrice) : 0,
            low24h: t ? parseFloat(t.lowPrice) : 0,
            marketType: 'spot',
          });
        }
        for (const s of futuresInfo.symbols) {
          if (s.status !== 'TRADING' && s.contractStatus !== 'TRADING') continue;
          const t = tickerMap.get(s.symbol);
          if (!spotSymbols.has(s.symbol)) {
            markets.push({
              symbol: s.symbol,
              price: t ? parseFloat(t.lastPrice) : 0,
              change24h: t ? parseFloat(t.priceChange) : 0,
              changePercent: t ? parseFloat(t.priceChangePercent) : 0,
              volume: t ? parseFloat(t.quoteVolume) : 0,
              high24h: t ? parseFloat(t.highPrice) : 0,
              low24h: t ? parseFloat(t.lowPrice) : 0,
              marketType: 'futures',
            });
          }
        }
        if (!cancelled) { setAllMarkets(markets); setAllLoaded(true); }
      } catch (err) {
        console.error('[MarketWatch] Failed to load markets:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMarkets();
    return () => { cancelled = true; };
  }, [tab, allLoaded, setAllMarkets]);

  const displayList = useMemo(() => {
    let source: any[];
    if (tab === 'favorites') {
      const pool = allMarkets.length > 0 ? allMarkets : watchlist;
      source = pool.filter(m => favorites.includes(m.symbol));
      // Add missing favorites as placeholders
      for (const fav of favorites) {
        if (!source.find(s => s.symbol === fav)) {
          source.push({ symbol: fav, price: 0, change24h: 0, changePercent: 0, volume: 0, high24h: 0, low24h: 0, marketType: 'spot' });
        }
      }
    } else {
      source = allMarkets.length > 0 ? allMarkets : watchlist;
    }
    let filtered = source;
    if (tab === 'all' && marketFilter !== 'all') {
      filtered = filtered.filter(t => t.marketType === marketFilter);
    }
    if (marketSearch) {
      const q = marketSearch.toLowerCase();
      filtered = filtered.filter(t => t.symbol.toLowerCase().includes(q));
    }
    if (tab === 'all' && !marketSearch) {
      filtered = [...filtered].sort((a, b) => b.volume - a.volume);
    }
    return filtered.slice(0, 200);
  }, [tab, watchlist, allMarkets, marketFilter, marketSearch, favorites]);

  const handleSelect = useCallback((symbol: string) => setSelectedSymbol(symbol), [setSelectedSymbol]);

  const formatPrice = (price: number) => {
    if (price === 0) return '-';
    if (price < 0.001) return price.toFixed(8);
    if (price < 1) return price.toFixed(4);
    if (price < 100) return price.toFixed(2);
    return price.toLocaleString('en-US', { minimumFractionDigits: 2 });
  };

  return (
    <div className="flex flex-col h-full bg-terminal-panel">
      <div className="px-3 py-2 border-b border-terminal">
        <h3 className="text-xs font-semibold text-gradient uppercase tracking-wider mb-2">Markets</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            value={marketSearch}
            onChange={(e) => setMarketSearch(e.target.value)}
            placeholder="Search pairs..."
            className="w-full bg-muted border border-terminal-border rounded px-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          {marketSearch && (
            <button onClick={() => setMarketSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => setTab('favorites')}
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${tab === 'favorites' ? 'bg-primary/20 text-primary border border-primary/40' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Star className="w-3 h-3 fill-current" />Favorites
            <span className="text-[9px] opacity-60">({favorites.length})</span>
          </button>
          <button
            onClick={() => setTab('all')}
            className={`text-xs px-2 py-1 rounded ${tab === 'all' ? 'bg-primary/20 text-primary border border-primary/40' : 'text-muted-foreground hover:text-foreground'}`}
          >
            All Markets
          </button>
        </div>
        {tab === 'all' && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {filters.map(f => (
              <button
                key={f.value}
                onClick={() => setMarketFilter(f.value)}
                className={`text-[10px] px-1.5 py-0.5 rounded ${marketFilter === f.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center px-3 py-1.5 text-[10px] text-muted-foreground uppercase border-b border-terminal">
        <span className="w-5"></span>
        <span className="flex-1">Pair</span>
        <span className="w-20 text-right">Price</span>
        <span className="w-16 text-right">24h %</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground animate-pulse">Loading markets...</div>
        )}
        {displayList.map((ticker) => {
          const isFav = favorites.includes(ticker.symbol);
          return (
            <div
              key={ticker.symbol + ticker.marketType}
              className={`group w-full flex items-center px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors cursor-pointer ${
                selectedSymbol === ticker.symbol ? 'bg-accent border-l-2 border-l-primary' : ''
              }`}
              onClick={() => handleSelect(ticker.symbol)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(ticker.symbol); }}
                className="w-5 flex-shrink-0"
              >
                <Star className={`w-3 h-3 ${isFav ? 'text-primary fill-primary' : 'text-muted-foreground/40 hover:text-primary'}`} />
              </button>
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium text-foreground truncate">
                  {ticker.symbol.replace('USDT', '')}<span className="text-muted-foreground">/USDT</span>
                </div>
                {tab === 'all' && (
                  <span className={`text-[9px] px-1 rounded ${
                    ticker.marketType === 'futures' ? 'bg-info/20 text-info' :
                    ticker.marketType === 'coin-m' ? 'bg-warning/20 text-warning' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {ticker.marketType === 'futures' ? 'USDⓈ-M' : ticker.marketType === 'coin-m' ? 'COIN-M' : 'SPOT'}
                  </span>
                )}
              </div>
              <div className="w-20 text-right font-mono font-medium text-foreground">{formatPrice(ticker.price)}</div>
              <div className={`w-16 text-right font-mono font-medium flex items-center justify-end gap-0.5 ${ticker.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                {ticker.changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
              </div>
            </div>
          );
        })}
        {!loading && displayList.length === 0 && (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
            {tab === 'favorites' ? 'No favorites yet — click ⭐ on any pair' : 'No pairs found'}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketWatch;
