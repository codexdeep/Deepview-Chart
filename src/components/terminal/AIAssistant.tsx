import { useState, useRef, useEffect } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import { Brain, Send, Loader2, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant = () => {
  const { selectedSymbol, watchlist, asks, bids, showAIPanel, setShowAIPanel } = useTradingStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentTicker = watchlist.find(t => t.symbol === selectedSymbol);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const analyze = async (userMessage?: string) => {
    const msg = userMessage || `Analyze ${selectedSymbol} current market conditions`;

    const context = [
      `Symbol: ${selectedSymbol}`,
      `Price: ${currentTicker?.price || 'N/A'}`,
      `24h Change: ${currentTicker?.changePercent?.toFixed(2) || 'N/A'}%`,
      `24h High: ${currentTicker?.high24h || 'N/A'}`,
      `24h Low: ${currentTicker?.low24h || 'N/A'}`,
      `Volume: ${currentTicker?.volume ? (currentTicker.volume / 1e6).toFixed(2) + 'M' : 'N/A'}`,
      `Top Bid: ${bids[0]?.price || 'N/A'} (${bids[0]?.quantity || 0})`,
      `Top Ask: ${asks[0]?.price || 'N/A'} (${asks[0]?.quantity || 0})`,
      `Spread: ${asks[0] && bids[0] ? (asks[0].price - bids[0].price).toFixed(2) : 'N/A'}`,
    ].join('\n');

    const userMsg: Message = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: {
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          context,
        },
      });

      if (error) throw error;
      setMessages(prev => [...prev, { role: 'assistant', content: data?.analysis || data?.error || 'No response' }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input;
    setInput('');
    analyze(msg);
  };

  if (!showAIPanel) {
    return (
      <button
        onClick={() => setShowAIPanel(true)}
        className="fixed bottom-16 right-4 z-40 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition-all glow-primary"
        title="AI Assistant"
      >
        <Brain className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-16 right-4 z-40 w-80 h-96 bg-card border border-terminal-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border bg-terminal-header">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">AI Market Assistant</span>
        </div>
        <button onClick={() => setShowAIPanel(false)} className="p-0.5 hover:bg-accent rounded">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center space-y-3 pt-4">
            <Brain className="w-8 h-8 text-primary mx-auto opacity-50" />
            <p className="text-xs text-muted-foreground">AI-powered market analysis for {selectedSymbol}</p>
            <button
              onClick={() => analyze()}
              className="px-3 py-1.5 text-[10px] bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
            >
              Quick Analysis
            </button>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Analyzing...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-2 border-t border-terminal-border flex gap-1">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about the market..."
          className="flex-1 bg-muted border border-terminal-border rounded px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} className="p-1.5 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50">
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};

export default AIAssistant;
