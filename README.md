# DeepView Chart Trading

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind">
  <img src="https://img.shields.io/badge/Binance-API-F0B90B?logo=binance&logoColor=white" alt="Binance API">
</p>

<p align="center">
  <strong>A professional-grade crypto trading terminal featuring real-time market data, advanced charting, and demo/live trading modes.</strong>
</p>

---

## Overview

<img width="1920" height="929" alt="6fe33ebe-8c3f-485a-87b4-22f361887b1c" src="https://github.com/user-attachments/assets/a97929a6-ee0f-4da8-bedd-d4f39e9ae9a3" />

DeepView Chart is part of the DeepView trading terminal, a TradingView-inspired terminal built for crypto traders. It combines professional-grade charting with an intuitive interface, supporting both demo paper trading and live Binance API trading.

### Key Highlights

- **Real-time Market Data** - WebSocket streaming from Binance for ultra-low latency price updates
- **Advanced Charting** - TradingView Lightweight Charts with 25+ technical indicators
- **Multi-Chart Layouts** - View 1, 2, or 4 charts simultaneously with independent configurations
- **Smart Money Concepts** - Built-in SMC indicators (Order Blocks, Liquidity Zones, Break of Structure)
- **Demo Trading** - Practice with $10,000 virtual USDT before going live
- **Professional UI** - Matte black & glass-morphism design inspired by institutional trading platforms

---

## Features

### 📊 Charting & Analysis
<img width="1920" height="929" alt="4067ad72-7e14-4373-9cea-aa3e805d78c1" src="https://github.com/user-attachments/assets/85e37c79-8980-42dc-93cf-08d453f04bf1" />

| Feature | Description |
|---------|-------------|
| **Multi-Timeframe Charts** | Switch between 1m to 1M timeframes instantly |
| **25+ Technical Indicators** | RSI, MACD, EMA, SMA, Bollinger Bands, Supertrend, and more |
| **Smart Money Concepts** | Order Blocks, Fair Value Gaps, Liquidity Zones, Break of Structure |
| **UT Bot Signals** | Automated buy/sell signal arrows with real-time alerts |
| **Drawing Tools** | Trendlines, Fibonacci retracements, rectangles, rays - saved per symbol |
| **Multi-Chart Grid** | 1×1, 2×1, or 2×2 layouts with independent pair/timeframe per chart |

### 🔄 Market Data

| Feature | Description |
|---------|-------------|
| **All Binance Markets** | Spot, USDⓈ-M Futures, COIN-M Futures, Vanilla Options |
| **Live Orderbook** | Real-time L2 depth with bid/ask visualization |
| **Recent Trades** | Live trade feed with size highlighting |
| **Price Change Stats** | 24h change, high/low, volume |
| **Whale Detection** | Alerts for large orders (>10K USDT or 1 BTC) |

### 💰 Trading
<img width="1920" height="929" alt="d8ae3b68-4510-40a3-a330-de37d9674573" src="https://github.com/user-attachments/assets/9329bf06-c9ae-4987-929f-f75273e8e5af" />

| Feature | Description |
|---------|-------------|
| **Demo Mode** | Virtual $10,000 USDT balance for risk-free practice |
| **Live Trading** | Direct Binance API integration for real orders |
| **Order Types** | Market, Limit, Stop-Loss, Take-Profit |
| **Position Tracking** | Real-time PNL, entry price, unrealized gains |
| **Trade Visualization** | Entry/SL/TP lines displayed directly on chart |
| **One-Click Close** | Close positions instantly from positions panel |

### ⚙️ User Experience

| Feature | Description |
|---------|-------------|
| **Favorites System** | Star your favorite pairs for quick access |
| **Market Watch Toggle** | Show/hide sidebar with Ctrl+M hotkey |
| **Fully Themed UI** | Matte black with glass-morphism panels |
| **Responsive Design** | Works on desktop, tablet, and mobile |
| **Keyboard Shortcuts** | Quick navigation and trading actions |

---

## Tech Stack

```
Frontend:     React 18 + TypeScript 5 + Vite 5
Styling:      Tailwind CSS 3 + Shadcn UI Components
State:        Zustand (global state management)
Charts:       TradingView Lightweight Charts™
Data:         Binance WebSocket + REST API
Backend:      Supabase Edge Functions (API signing)
Build:        Bun / NPM
```

---

## Quick Start

### Prerequisites

- Node.js 18+ or Bun
- Binance API key (for live trading only)

### Installation

```bash
# Clone the repository
git clone https://github.com/codexdeep/Deepview-Chart.git
cd deepview

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

For live trading, configure your Binance API keys in the app settings (stored encrypted).

---

## Usage Guide

### Switching Trading Pairs

1. Click the pair selector in the top-left
2. Search for any Binance symbol (e.g., "BTC", "ETH")
3. Select from Spot, Futures, or Options markets
4. Chart auto-centers on current price

### Adding Indicators

1. Click the "Indicators" button on chart toolbar
2. Search for indicator (e.g., "RSI", "MACD")
3. Configure parameters (periods, colors)
4. Click Add - indicator appears on chart

### Demo Trading

1. Toggle "DEMO" mode in top-right header
2. Your virtual balance starts at $10,000 USDT
3. Place orders via the Order Entry panel
4. Monitor PNL in real-time on chart and positions panel

### Live Trading

1. Toggle "LIVE" mode in header
2. Configure Binance API keys in Settings
3. Select trading pair and order type
4. Execute real trades on Binance

### Drawing Tools

1. Click drawing tool icon on chart toolbar
2. Select tool: Trendline, Fibonacci, Rectangle, Ray
3. Draw on chart - drawings auto-save to localStorage
4. Each symbol maintains its own drawings

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl + M` | Toggle Market Watch panel |
| `F` | Toggle fullscreen chart |
| `+ / -` | Zoom in/out on chart |
| `← / →` | Pan chart left/right |

---

## Project Structure

```
deepview/
├── src/
│   ├── components/
│   │   ├── terminal/          # Trading terminal components
│   │   │   ├── TradingChart.tsx         # Main chart component
│   │   │   ├── TVIndicatorsPanel.tsx    # Indicator selector
│   │   │   ├── TVIndicatorsLayer.tsx    # Indicator rendering
│   │   │   ├── DrawingOverlay.tsx       # Drawing tools
│   │   │   ├── SMCIndicator.tsx         # Smart Money Concepts
│   │   │   ├── UTBotIndicator.tsx       # UT Bot signals
│   │   │   ├── OrderEntry.tsx           # Order placement
│   │   │   ├── PositionsPanel.tsx       # Active positions
│   │   │   ├── MarketWatch.tsx          # Symbol browser
│   │   │   ├── Orderbook.tsx            # L2 orderbook
│   │   │   ├── RecentTrades.tsx         # Trade feed
│   │   │   ├── MultiChartLayout.tsx     # Grid layouts
│   │   │   └── TerminalHeader.tsx       # Top navigation
│   │   └── ui/                # Shadcn UI components
│   ├── lib/
│   │   ├── tvIndicators.ts    # Indicator registry (25+ indicators)
│   │   └── utils.ts           # Utility functions
│   ├── store/
│   │   └── tradingStore.ts    # Zustand global state
│   ├── hooks/
│   │   └── useBinanceLiveData.ts  # WebSocket data hook
│   ├── services/
│   │   └── binanceWebSocket.ts    # WebSocket management
│   ├── pages/
│   │   └── Index.tsx          # Main trading page
│   └── index.css              # Global styles & theme
├── supabase/
│   └── functions/             # Supabase Edge Functions
│       ├── ai-analysis/       # AI market analysis
│       └── binance-trade/     # Secure trade execution
├── public/                    # Static assets
├── package.json
├── tailwind.config.ts
└── vite.config.ts
```

---

## Supported Markets

| Market | API Endpoint | Status |
|--------|-------------|--------|
| Spot | `/api/v3` | ✅ Live |
| USDⓈ-M Futures | `/fapi/v1` | ✅ Live |
| COIN-M Futures | `/dapi/v1` | ✅ Live |
| Vanilla Options | Options API | ✅ Live |

---

## Indicators Available

### Trend Indicators
- Simple Moving Average (SMA)
- Exponential Moving Average (EMA)
- Moving Average Convergence Divergence (MACD)
- Supertrend

### Momentum Indicators
- Relative Strength Index (RSI)
- Stochastic RSI
- Commodity Channel Index (CCI)
- Rate of Change (ROC)

### Volatility Indicators
- Bollinger Bands
- Average True Range (ATR)
- Keltner Channels

### Volume Indicators
- Volume Profile
- On-Balance Volume (OBV)
- Money Flow Index (MFI)

### Smart Money Concepts
- Order Blocks (Bullish/Bearish)
- Fair Value Gaps (FVG)
- Liquidity Zones
- Break of Structure (BOS)

### Signal Indicators
- UT Bot Alerts (Buy/Sell arrows)
- Whale Order Detection

---

## Security

- **API Key Encryption** - Binance keys encrypted via Supabase Edge Functions
- **No Keys in LocalStorage** - Sensitive data never stored client-side
- **HMAC Signatures** - All API requests signed server-side
- **Demo Mode** - Practice without risking real funds

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview"]
```

### Self-Hosting

Build static files and serve with any web server:

```bash
npm run build
# Output in dist/ folder
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Disclaimer

Trading cryptocurrencies carries significant risk. DeepView is provided for educational and informational purposes only. Always do your own research and never trade with funds you cannot afford to lose. Past performance does not guarantee future results.

---

<p align="center">
  <strong>Built with ❤️ for traders by traders</strong>
</p>
