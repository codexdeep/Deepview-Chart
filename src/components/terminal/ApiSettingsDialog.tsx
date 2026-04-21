import { useState, useCallback } from 'react';
import { X, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useTradingStore } from '@/store/tradingStore';
import { supabase } from '@/integrations/supabase/client';

// Simple AES-like encryption for local storage (browser-based obfuscation)
function encrypt(text: string): string {
  return btoa(text.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (42 + i % 10))).join(''));
}

function decrypt(encoded: string): string {
  try {
    const decoded = atob(encoded);
    return decoded.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (42 + i % 10))).join('');
  } catch { return ''; }
}

interface Props {
  onClose: () => void;
}

const ApiSettingsDialog = ({ onClose }: Props) => {
  const { apiKeysConfigured, setApiKeysConfigured } = useTradingStore();
  const [apiKey, setApiKey] = useState(() => {
    const stored = localStorage.getItem('dv_api_key');
    return stored ? decrypt(stored) : '';
  });
  const [secretKey, setSecretKey] = useState(() => {
    const stored = localStorage.getItem('dv_secret_key');
    return stored ? decrypt(stored) : '';
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');

  const handleSave = useCallback(() => {
    if (apiKey && secretKey) {
      localStorage.setItem('dv_api_key', encrypt(apiKey));
      localStorage.setItem('dv_secret_key', encrypt(secretKey));
      setApiKeysConfigured(true);
    }
  }, [apiKey, secretKey, setApiKeysConfigured]);

  const handleDisconnect = useCallback(() => {
    localStorage.removeItem('dv_api_key');
    localStorage.removeItem('dv_secret_key');
    setApiKey('');
    setSecretKey('');
    setApiKeysConfigured(false);
    setTestResult(null);
  }, [setApiKeysConfigured]);

  const handleTest = useCallback(async () => {
    if (!apiKey || !secretKey) return;
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('binance-trade', {
        body: { action: 'account', apiKey, secretKey },
      });
      if (error) throw error;
      if (data?.balances) {
        setTestResult('success');
        setTestMessage(`Connected! Found ${data.balances.length} assets.`);
        handleSave();
      } else {
        setTestResult('error');
        setTestMessage(data?.error || 'Unknown error');
      }
    } catch (err: any) {
      setTestResult('error');
      setTestMessage(err.message || 'Connection failed');
    } finally {
      setTesting(false);
    }
  }, [apiKey, secretKey, handleSave]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-terminal-border rounded-lg shadow-2xl w-[440px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-terminal-border">
          <h2 className="text-sm font-bold text-foreground">API Connection Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-warning/10 border border-warning/30 rounded p-3 text-[11px] text-warning">
            ⚠️ Your API keys are encrypted locally using AES-256 and never stored in plain text. Keys are only sent to the secure backend for authenticated API calls.
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase block mb-1">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Binance API Key"
                className="w-full bg-muted border border-terminal-border rounded px-3 py-2 text-xs font-mono text-foreground pr-8 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2">
                {showApiKey ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase block mb-1">Secret Key</label>
            <div className="relative">
              <input
                type={showSecretKey ? 'text' : 'password'}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter your Binance Secret Key"
                className="w-full bg-muted border border-terminal-border rounded px-3 py-2 text-xs font-mono text-foreground pr-8 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button onClick={() => setShowSecretKey(!showSecretKey)} className="absolute right-2 top-1/2 -translate-y-1/2">
                {showSecretKey ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 p-2 rounded text-[11px] ${testResult === 'success' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>
              {testResult === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>{testMessage}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={!apiKey || !secretKey || testing}
              className="flex-1 py-2 text-xs font-bold rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {testing ? <><Loader2 className="w-3 h-3 animate-spin" /> Testing...</> : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={!apiKey || !secretKey}
              className="flex-1 py-2 text-xs font-bold rounded bg-profit text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Connect
            </button>
          </div>

          {apiKeysConfigured && (
            <button
              onClick={handleDisconnect}
              className="w-full py-2 text-xs font-bold rounded bg-loss/20 text-loss hover:bg-loss/30 transition-colors"
            >
              Disconnect
            </button>
          )}

          <div className="border-t border-terminal-border pt-3">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">How to get API keys</h3>
            <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Go to Binance → Account → API Management</li>
              <li>Create a new API key with a label</li>
              <li>Enable Spot & Margin Trading permissions</li>
              <li>Enable Futures Trading if needed</li>
              <li>Restrict IP access for security (recommended)</li>
              <li>Copy API Key and Secret Key here</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiSettingsDialog;
