import { useTradingStore, type TradingMode } from '@/store/tradingStore';
import { Activity, Wifi, WifiOff, Clock, Shield, AlertTriangle, Settings, PanelLeftClose, PanelLeftOpen, Zap, FlaskConical } from 'lucide-react';
import { useEffect, useState } from 'react';
import ApiSettingsDialog from './ApiSettingsDialog';

const modes: { value: TradingMode; label: string }[] = [
  { value: 'spot', label: 'Spot' },
  { value: 'futures', label: 'Futures' },
  { value: 'margin', label: 'Margin' },
  { value: 'options', label: 'Options' },
];

const TerminalHeader = () => {
  const { tradingMode, setTradingMode, wsStatus, latency, showMarketWatch, toggleMarketWatch, tradingEnv, setTradingEnv, demoBalance } = useTradingStore();
  const [time, setTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'm') { e.preventDefault(); toggleMarketWatch(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleMarketWatch]);

  const statusIcon = wsStatus === 'connected'
    ? <Wifi className="w-3 h-3 text-profit" />
    : wsStatus === 'connecting'
    ? <Wifi className="w-3 h-3 text-warning animate-pulse" />
    : wsStatus === 'error'
    ? <AlertTriangle className="w-3 h-3 text-loss" />
    : <WifiOff className="w-3 h-3 text-muted-foreground" />;

  const statusText = wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting...' : wsStatus === 'error' ? 'Error' : 'Offline';

  return (
    <>
      <header className="h-12 glass-panel border-b border-white/5 flex items-center justify-between px-4 select-none rounded-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center font-bold text-sm text-primary-foreground glow-primary">D</div>
            <span className="font-bold text-base text-gradient tracking-wider">DEEPVIEW</span>
          </div>

          <div className="h-5 w-px bg-terminal-border" />

          <button
            onClick={toggleMarketWatch}
            className="p-1 rounded hover:bg-accent transition-colors"
            title={showMarketWatch ? 'Hide Market Watch (Ctrl+M)' : 'Show Market Watch (Ctrl+M)'}
          >
            {showMarketWatch ? <PanelLeftClose className="w-4 h-4 text-muted-foreground" /> : <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />}
          </button>

          <div className="h-5 w-px bg-terminal-border" />

          <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg">
            {modes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setTradingMode(mode.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  tradingMode === mode.value
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          {/* LIVE / DEMO toggle */}
          <div className="flex items-center bg-muted/50 p-0.5 rounded-lg">
            <button
              onClick={() => setTradingEnv('live')}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                tradingEnv === 'live' ? 'bg-loss text-white shadow-md' : 'text-muted-foreground'
              }`}
            >
              <Zap className="w-3 h-3" />LIVE
            </button>
            <button
              onClick={() => setTradingEnv('demo')}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                tradingEnv === 'demo' ? 'bg-info text-white shadow-md' : 'text-muted-foreground'
              }`}
            >
              <FlaskConical className="w-3 h-3" />DEMO
            </button>
          </div>

          {tradingEnv === 'demo' && (
            <div className="px-2 py-1 bg-info/10 border border-info/30 rounded text-info text-[11px] font-bold">
              ${demoBalance.toFixed(2)}
            </div>
          )}

          <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            <Settings className="w-3 h-3" /><span>API</span>
          </button>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-profit" /><span>AES-256</span>
          </div>
          <div className="flex items-center gap-1.5">
            {statusIcon}
            <span className={wsStatus === 'connected' ? 'text-profit' : wsStatus === 'error' ? 'text-loss' : ''}>{statusText}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-profit" /><span>{latency}ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" /><span>{time.toLocaleTimeString('en-US', { hour12: false })}</span>
          </div>
        </div>
      </header>

      {showSettings && <ApiSettingsDialog onClose={() => setShowSettings(false)} />}
    </>
  );
};

export default TerminalHeader;
