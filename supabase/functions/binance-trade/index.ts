import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const BINANCE_API_KEY = Deno.env.get('BINANCE_API_KEY');
    if (!BINANCE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'BINANCE_API_KEY is not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const BINANCE_SECRET_KEY = Deno.env.get('BINANCE_SECRET_KEY');
    if (!BINANCE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'BINANCE_SECRET_KEY is not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { symbol, side, type, quantity, price, leverage, tradingMode, action } = body;

    const baseUrl = tradingMode === 'futures'
      ? 'https://fapi.binance.com'
      : 'https://api.binance.com';

    // Helper to sign and fetch
    const signedFetch = async (endpoint: string, params: string, method = 'GET') => {
      const timestamp = Date.now();
      const qs = params ? `${params}&timestamp=${timestamp}` : `timestamp=${timestamp}`;
      const signature = createHmac('sha256', BINANCE_SECRET_KEY).update(qs).digest('hex');
      const url = `${baseUrl}${endpoint}?${qs}&signature=${signature}`;

      if (method === 'POST') {
        return fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'X-MBX-APIKEY': BINANCE_API_KEY,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `${qs}&signature=${signature}`,
        });
      }

      return fetch(url, { headers: { 'X-MBX-APIKEY': BINANCE_API_KEY } });
    };

    const jsonResponse = async (resp: Response) => {
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.ok ? 200 : resp.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    };

    // Account info
    if (action === 'account') {
      const endpoint = tradingMode === 'futures' ? '/fapi/v2/account' : '/api/v3/account';
      return jsonResponse(await signedFetch(endpoint, ''));
    }

    // Positions (futures only)
    if (action === 'positions') {
      return jsonResponse(await signedFetch('/fapi/v2/positionRisk', ''));
    }

    // Open orders
    if (action === 'openOrders') {
      const endpoint = tradingMode === 'futures' ? '/fapi/v1/openOrders' : '/api/v3/openOrders';
      return jsonResponse(await signedFetch(endpoint, ''));
    }

    // Trade history
    if (action === 'tradeHistory') {
      const endpoint = tradingMode === 'futures' ? '/fapi/v1/userTrades' : '/api/v3/myTrades';
      return jsonResponse(await signedFetch(endpoint, `symbol=${symbol}&limit=50`));
    }

    // Cancel order
    if (action === 'cancelOrder') {
      const { orderId } = body;
      const endpoint = tradingMode === 'futures' ? '/fapi/v1/order' : '/api/v3/order';
      const resp = await signedFetch(endpoint, `symbol=${symbol}&orderId=${orderId}`, 'DELETE' as any);
      return jsonResponse(resp);
    }

    // Cancel all orders
    if (action === 'cancelAllOrders') {
      const endpoint = tradingMode === 'futures' ? '/fapi/v1/allOpenOrders' : '/api/v3/openOrders';
      const resp = await signedFetch(endpoint, `symbol=${symbol}`, 'DELETE' as any);
      return jsonResponse(resp);
    }

    // Set leverage (futures)
    if (tradingMode === 'futures' && leverage) {
      await signedFetch('/fapi/v1/leverage', `symbol=${symbol}&leverage=${leverage}`, 'POST');
    }

    // Place order
    if (!symbol || !side || !type || !quantity) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: symbol, side, type, quantity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const endpoint = tradingMode === 'futures' ? '/fapi/v1/order' : '/api/v3/order';
    let params = `symbol=${symbol}&side=${side}&type=${type}&quantity=${quantity}`;
    if (type === 'LIMIT' && price) {
      params += `&price=${price}&timeInForce=GTC`;
    }
    if (type === 'STOP_LOSS_LIMIT' && price) {
      params += `&price=${price}&stopPrice=${price}&timeInForce=GTC`;
    }

    const response = await signedFetch(endpoint, params, 'POST');
    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Binance order error [${response.status}]: ${JSON.stringify(data)}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, order: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in binance-trade:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
