import { useEffect, useRef } from 'react';
import { binanceWs, fetch24hrTickers, fetchDepthSnapshot, fetchFundingRates } from '@/services/binanceWebSocket';
import { useTradingStore, WATCHED_SYMBOLS, type MarketTicker, type OrderbookEntry, type RecentTrade } from '@/store/tradingStore';

export function useBinanceLiveData() {
  const {
    selectedSymbol, setWsStatus, setLatency, updateWatchlist,
    updateTicker, setOrderbook, addRecentTrade, updatePositionsMark,
  } = useTradingStore();

  const prevSymbolRef = useRef(selectedSymbol);

  // 1. Initial REST load for 24hr tickers
  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const tickers = await fetch24hrTickers();
        const watchedSet = new Set(WATCHED_SYMBOLS);
        const mapped: MarketTicker[] = tickers
          .filter((t: any) => watchedSet.has(t.symbol))
          .map((t: any) => ({
            symbol: t.symbol,
            price: parseFloat(t.lastPrice),
            change24h: parseFloat(t.priceChange),
            changePercent: parseFloat(t.priceChangePercent),
            volume: parseFloat(t.quoteVolume),
            high24h: parseFloat(t.highPrice),
            low24h: parseFloat(t.lowPrice),
            marketType: 'spot' as const,
          }));

        mapped.sort((a, b) => WATCHED_SYMBOLS.indexOf(a.symbol) - WATCHED_SYMBOLS.indexOf(b.symbol));
        if (!cancelled) updateWatchlist(mapped);

        try {
          const rates = await fetchFundingRates();
          if (!cancelled) {
            for (const rate of rates) {
              if (watchedSet.has(rate.symbol)) {
                updateTicker(rate.symbol, { fundingRate: parseFloat(rate.fundingRate) });
              }
            }
          }
        } catch {}
      } catch (err) {
        console.error('[Binance] Failed to load initial data:', err);
      }
    }

    loadInitialData();
    return () => { cancelled = true; };
  }, []);

  // 2. WebSocket: all mini tickers
  useEffect(() => {
    const watchedSet = new Set(WATCHED_SYMBOLS);
    const unsubscribe = binanceWs.subscribeAllMiniTickers((tickers) => {
      const start = performance.now();
      for (const t of tickers) {
        if (watchedSet.has(t.s)) {
          const price = parseFloat(t.c);
          const open = parseFloat(t.o);
          updateTicker(t.s, {
            price, change24h: price - open,
            changePercent: open > 0 ? ((price - open) / open) * 100 : 0,
            volume: parseFloat(t.q), high24h: parseFloat(t.h), low24h: parseFloat(t.l),
          });
        }
      }
      // Update position mark prices for live PnL
      const marks: Record<string, number> = {};
      for (const t of tickers) marks[t.s] = parseFloat(t.c);
      updatePositionsMark(marks);
      setLatency(Math.round(performance.now() - start));
    });
    const unsubStatus = binanceWs.onStatusChange(setWsStatus);
    return () => { unsubscribe(); unsubStatus(); };
  }, []);

  // 3. Depth + trades for selected symbol
  useEffect(() => {
    fetchDepthSnapshot(selectedSymbol, 20)
      .then((data) => {
        const processEntries = (entries: [string, string][]): OrderbookEntry[] => {
          let total = 0;
          return entries.map(([p, q]) => {
            const qty = parseFloat(q); total += qty;
            return { price: parseFloat(p), quantity: qty, total };
          });
        };
        setOrderbook(processEntries(data.asks), processEntries(data.bids));
      })
      .catch((err) => console.error('[Binance] Depth snapshot error:', err));

    const unsubDepth = binanceWs.subscribeDepth(selectedSymbol, (data: any) => {
      const asks = data.asks || data.a;
      const bids = data.bids || data.b;
      if (!asks || !bids) return;
      const processEntries = (entries: [string, string][]): OrderbookEntry[] => {
        let total = 0;
        return entries.map(([p, q]) => {
          const qty = parseFloat(q); total += qty;
          return { price: parseFloat(p), quantity: qty, total };
        });
      };
      setOrderbook(processEntries(asks), processEntries(bids));
    });

    const unsubTrades = binanceWs.subscribeAggTrades(selectedSymbol, (trade) => {
      const t = new Date(trade.T);
      addRecentTrade({
        price: parseFloat(trade.p), quantity: parseFloat(trade.q),
        side: trade.m ? 'sell' : 'buy',
        time: t.toLocaleTimeString('en-US', { hour12: false }),
      });
    });

    prevSymbolRef.current = selectedSymbol;
    return () => { unsubDepth(); unsubTrades(); };
  }, [selectedSymbol]);

  return null;
}
