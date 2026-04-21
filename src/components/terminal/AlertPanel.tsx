import { useState, useEffect } from 'react';
import { useTradingStore, type Alert } from '@/store/tradingStore';
import { Bell, BellRing, Plus, X, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

const AlertPanel = () => {
  const { alerts, addAlert, removeAlert, triggerAlert, selectedSymbol, watchlist } = useTradingStore();
  const [showForm, setShowForm] = useState(false);
  const [alertType, setAlertType] = useState<Alert['type']>('price_above');
  const [alertValue, setAlertValue] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const currentTicker = watchlist.find(t => t.symbol === selectedSymbol);

  // Check alerts against live prices
  useEffect(() => {
    if (!currentTicker || currentTicker.price === 0) return;
    const price = currentTicker.price;

    for (const alert of alerts) {
      if (!alert.active || alert.triggered) continue;
      if (alert.symbol !== selectedSymbol) continue;

      let shouldTrigger = false;
      if (alert.type === 'price_above' && price >= alert.value) shouldTrigger = true;
      if (alert.type === 'price_below' && price <= alert.value) shouldTrigger = true;

      if (shouldTrigger) {
        triggerAlert(alert.id);
        // Popup notification
        toast.success(`🚨 ALERT: ${alert.symbol} ${alert.type === 'price_above' ? 'crossed above' : 'crossed below'} ${alert.value}`, {
          description: alert.message || `Price: ${price}`,
          duration: 10000,
        });
        // Desktop notification
        if (Notification.permission === 'granted') {
          new Notification(`🚨 ${alert.symbol} Alert`, {
            body: `${alert.type === 'price_above' ? 'Above' : 'Below'} ${alert.value} — Price: ${price}`,
          });
        }
        // Sound
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.1;
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch {}
      }
    }
  }, [currentTicker?.price]);

  const handleAdd = () => {
    if (!alertValue) return;
    addAlert({
      id: Date.now().toString(),
      symbol: selectedSymbol,
      type: alertType,
      value: parseFloat(alertValue),
      message: alertMessage,
      active: true,
      triggered: false,
      createdAt: Date.now(),
    });
    setAlertValue('');
    setAlertMessage('');
    setShowForm(false);
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const activeAlerts = alerts.filter(a => a.active && !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-terminal flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase">Alerts</span>
          {activeAlerts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">{activeAlerts.length}</span>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="p-1 hover:bg-accent rounded">
          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {showForm && (
        <div className="p-3 border-b border-terminal space-y-2">
          <div className="flex gap-1">
            {(['price_above', 'price_below'] as const).map(t => (
              <button key={t} onClick={() => setAlertType(t)}
                className={`px-2 py-1 text-[10px] rounded ${alertType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {t === 'price_above' ? '↑ Above' : '↓ Below'}
              </button>
            ))}
          </div>
          <input type="number" placeholder={`Price (${selectedSymbol})`} value={alertValue} onChange={e => setAlertValue(e.target.value)}
            className="w-full bg-muted border border-terminal-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <input type="text" placeholder="Message (optional)" value={alertMessage} onChange={e => setAlertMessage(e.target.value)}
            className="w-full bg-muted border border-terminal-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <button onClick={handleAdd} className="w-full py-1.5 text-xs font-bold rounded bg-primary text-primary-foreground hover:opacity-90">
            Create Alert
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {activeAlerts.map(a => (
          <div key={a.id} className="flex items-center justify-between px-3 py-2 border-b border-terminal-border/30 hover:bg-accent/30">
            <div>
              <div className="flex items-center gap-1.5">
                <BellRing className="w-3 h-3 text-primary" />
                <span className="text-xs font-mono font-medium text-foreground">{a.symbol}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {a.type === 'price_above' ? '↑' : '↓'} {a.value.toLocaleString()}
                {a.message && <span className="ml-1">— {a.message}</span>}
              </div>
            </div>
            <button onClick={() => removeAlert(a.id)} className="p-1 hover:bg-loss/10 rounded">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        ))}
        {triggeredAlerts.length > 0 && (
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase border-b border-terminal">Triggered</div>
        )}
        {triggeredAlerts.map(a => (
          <div key={a.id} className="flex items-center justify-between px-3 py-2 border-b border-terminal-border/30 opacity-50">
            <div>
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-3 h-3 text-profit" />
                <span className="text-xs font-mono text-foreground">{a.symbol}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">{a.type === 'price_above' ? '↑' : '↓'} {a.value.toLocaleString()}</div>
            </div>
            <button onClick={() => removeAlert(a.id)} className="p-1 hover:bg-loss/10 rounded">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground py-8">No alerts set</div>
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
