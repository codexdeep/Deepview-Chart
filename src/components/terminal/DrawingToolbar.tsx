import { useTradingStore } from '@/store/tradingStore';
import { TrendingUp, Minus, Square, Type, Pencil, Ruler, Hash, MousePointer, Trash2 } from 'lucide-react';

const tools = [
  { id: null, icon: MousePointer, label: 'Select', shortcut: 'V' },
  { id: 'trendline', icon: TrendingUp, label: 'Trend Line', shortcut: 'T' },
  { id: 'hline', icon: Minus, label: 'Horizontal Line', shortcut: 'H' },
  { id: 'vline', icon: Hash, label: 'Vertical Line', shortcut: 'L' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
  { id: 'fib', icon: Ruler, label: 'Fibonacci', shortcut: 'F' },
  { id: 'text', icon: Type, label: 'Text', shortcut: 'X' },
  { id: 'brush', icon: Pencil, label: 'Brush', shortcut: 'B' },
  { id: 'measure', icon: Ruler, label: 'Measure', shortcut: 'M' },
];

const DrawingToolbar = () => {
  const { activeDrawingTool, setActiveDrawingTool } = useTradingStore();

  const clearAll = () => {
    localStorage.removeItem('dv_drawings');
    setActiveDrawingTool(null);
    window.dispatchEvent(new CustomEvent('dv-clear-drawings'));
  };

  return (
    <div className="w-9 bg-terminal-panel border-r border-terminal flex flex-col items-center py-2 gap-0.5 flex-shrink-0">
      {tools.map((tool) => (
        <button
          key={tool.id ?? 'select'}
          onClick={() => setActiveDrawingTool(tool.id)}
          className={`w-7 h-7 flex items-center justify-center rounded transition-all group relative ${
            activeDrawingTool === tool.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
          title={`${tool.label} (${tool.shortcut})`}
        >
          <tool.icon className="w-3.5 h-3.5" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-popover border border-terminal-border rounded text-[10px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
            {tool.label}
          </span>
        </button>
      ))}

      <div className="w-5 border-t border-terminal-border my-1" />

      <button
        onClick={clearAll}
        className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-loss hover:bg-loss/10 transition-all group relative"
        title="Clear All Drawings"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span className="absolute left-full ml-2 px-2 py-1 bg-popover border border-terminal-border rounded text-[10px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
          Clear All
        </span>
      </button>
    </div>
  );
};

export default DrawingToolbar;
