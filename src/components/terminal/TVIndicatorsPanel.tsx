import { useTradingStore } from '@/store/tradingStore';
import { TV_INDICATORS, TV_INDICATOR_MAP, type TVIndicatorDef } from '@/lib/tvIndicators';
import { X, Settings2, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

const TVIndicatorsPanel = () => {
  const { tvIndicators, addTvIndicator, removeTvIndicator, updateTvIndicator, showTvPanel, setShowTvPanel } = useTradingStore();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('All');

  const categories = ['All', 'Moving Average', 'Oscillator', 'Momentum', 'Trend', 'Volatility', 'Volume'];

  const filtered = useMemo(() => {
    return TV_INDICATORS.filter(i => {
      if (category !== 'All' && i.category !== category) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q);
    });
  }, [search, category]);

  if (!showTvPanel) return null;

  const handleAdd = (def: TVIndicatorDef) => {
    addTvIndicator({
      instanceId: `${def.id}_${Date.now()}`,
      defId: def.id,
      params: { ...def.defaultParams },
      enabled: true,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={() => setShowTvPanel(false)}>
      <div className="glass-panel w-full max-w-4xl h-[80vh] flex flex-col rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center text-xs font-bold">ƒ</div>
            <div>
              <h2 className="text-sm font-bold tracking-wide">TV INDICATORS</h2>
              <p className="text-[10px] text-muted-foreground">446+ technical indicators · PineScript v6 compatible</p>
            </div>
          </div>
          <button onClick={() => setShowTvPanel(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Active list */}
          <div className="w-72 border-r border-white/5 flex flex-col bg-black/30">
            <div className="px-4 py-3 border-b border-white/5">
              <h3 className="text-[10px] font-bold tracking-widest text-muted-foreground">ACTIVE ({tvIndicators.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {tvIndicators.length === 0 && (
                <div className="text-center text-[11px] text-muted-foreground p-6">
                  No indicators added.<br/>Click any indicator on the right to add it.
                </div>
              )}
              {tvIndicators.map(inst => {
                const def = TV_INDICATOR_MAP.get(inst.defId);
                if (!def) return null;
                const isEditing = editing === inst.instanceId;
                return (
                  <div key={inst.instanceId} className="bg-white/[0.03] border border-white/5 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-1 px-2 py-2">
                      <input
                        type="checkbox" checked={inst.enabled}
                        onChange={(e) => updateTvIndicator(inst.instanceId, { enabled: e.target.checked })}
                        className="w-3 h-3 accent-primary"
                      />
                      <span className="flex-1 text-[11px] font-medium truncate">{def.name}</span>
                      {def.params.length > 0 && (
                        <button onClick={() => setEditing(isEditing ? null : inst.instanceId)} className="p-1 rounded hover:bg-white/5">
                          <Settings2 className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                      <button onClick={() => removeTvIndicator(inst.instanceId)} className="p-1 rounded hover:bg-loss/20">
                        <X className="w-3 h-3 text-loss" />
                      </button>
                    </div>
                    {isEditing && def.params.length > 0 && (
                      <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2">
                        {def.params.map(p => (
                          <div key={p.key}>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">{p.label}</label>
                            {p.type === 'number' ? (
                              <input
                                type="number" min={p.min} max={p.max} step={p.step ?? 1}
                                value={inst.params[p.key] ?? p.default}
                                onChange={(e) => updateTvIndicator(inst.instanceId, {
                                  params: { ...inst.params, [p.key]: parseFloat(e.target.value) },
                                })}
                                className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[11px] font-mono"
                              />
                            ) : (
                              <select
                                value={inst.params[p.key] ?? p.default}
                                onChange={(e) => updateTvIndicator(inst.instanceId, {
                                  params: { ...inst.params, [p.key]: e.target.value },
                                })}
                                className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[11px] font-mono"
                              >
                                {p.options?.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Library */}
          <div className="flex-1 flex flex-col">
            <div className="p-3 border-b border-white/5 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search indicators..."
                  className="w-full bg-black/60 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {categories.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`px-2.5 py-1 text-[10px] rounded-md font-medium transition ${category === c ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2">
              {filtered.map(def => (
                <button key={def.id} onClick={() => handleAdd(def)}
                  className="text-left bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-primary/40 transition rounded-lg p-3 group">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">{def.name}</span>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="text-[10px] text-muted-foreground mb-1">{def.description}</div>
                  <div className="text-[9px] inline-block px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">{def.category}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TVIndicatorsPanel;
