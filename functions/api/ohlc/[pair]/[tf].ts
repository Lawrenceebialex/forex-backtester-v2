/**
 * Proxies public R2 OHLC JSON so the browser is not blocked by missing CORS headers.
 * URL: /api/ohlc/EURUSD/15m  →  R2 EURUSD/15m.json
 */
const R2_BASE = 'https://pub-bae06cc5db21418c9699a28c5de315d1.r2.dev';

const PAIRS = new Set(['EURUSD', 'USDJPY']);
const TFS = new Set(['1m', '5m', '15m', '1h', '4h', '1d']);

export const onRequestGet: PagesFunction = async (context) => {
  const pair = String(context.params.pair ?? '').toUpperCase();
  const tf = String(context.params.tf ?? '').toLowerCase();

  if (!PAIRS.has(pair) || !TFS.has(tf)) {
    return new Response(JSON.stringify({ error: 'Invalid pair or timeframe' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const upstream = `${R2_BASE}/${pair}/${tf}.json`;
  try {
    const res = await fetch(upstream);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Upstream ${res.status}` }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
