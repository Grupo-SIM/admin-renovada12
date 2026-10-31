import { NextRequest, NextResponse } from 'next/server';
import { authorizeFinance, FINANCE_COOKIE } from '@/services/finance-auth';

export const runtime = 'nodejs';
const allowedQueries = new Set(['page', 'limit', 'status', 'paymentMethod', 'startDate', 'endDate', 'search']);
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const resource = path.join('/');
  const receipt = request.method === 'GET' && /^withdrawals\/[a-zA-Z0-9-]+\/receipt$/.test(resource);
  const read = request.method === 'GET' && (/^(summary|config|transactions|machines|withdrawals)$/.test(resource) || /^withdrawals\/[a-zA-Z0-9-]+$/.test(resource));
  const write = request.method === 'POST' && resource === 'withdrawals';
  const reconcile = request.method === 'POST' && resource === 'reconcile';
  if (!read && !write && !receipt && !reconcile) return NextResponse.json({ error: 'Rota indisponível.' }, { status: 404 });
  try { await authorizeFinance(request.cookies.get(FINANCE_COOKIE)?.value); }
  catch { return NextResponse.json({ error: 'Sessão financeira inválida ou autorização indisponível. Entre novamente ou contate o administrador.' }, { status: 403 }); }
  if ((write || reconcile) && (request.headers.get('origin') !== request.nextUrl.origin || request.headers.get('sec-fetch-site') === 'cross-site')) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  try {
    const base = new URL(process.env.SIMINTPAY_API_URL || 'https://simpay-back.simintermediacoes.com');
    const token = process.env.SIMINTPAY_TOKEN;
    if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash || !token) throw new Error('Configuration unavailable');
    const url = new URL(`/platforms/RENOVADA/finance/${resource}`, base);
    const queries = !read ? new Set<string>() : resource === 'transactions' ? allowedQueries : resource === 'machines' ? new Set(['page', 'limit', 'startDate', 'endDate']) : resource === 'withdrawals' ? new Set(['page', 'limit', 'status']) : new Set<string>();
    for (const [name, value] of request.nextUrl.searchParams) {
      if (!queries.has(name) || request.nextUrl.searchParams.getAll(name).length !== 1 || ((name === 'page' || name === 'limit') && (!/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value)) || (name === 'limit' && Number(value) > 100))) || value.length > 250) return NextResponse.json({ error: 'Filtro inválido.' }, { status: 400 });
      url.searchParams.set(name, value);
    }
    let body: string | undefined;
    if (reconcile && (await request.text()).length) return NextResponse.json({ error: 'Solicitação inválida.' }, { status: 400 });
    if (write) {
      const value = await request.json();
      if (!Number.isSafeInteger(value.amountCents) || value.amountCents <= 0 || typeof value.pixKey !== 'string' || !value.pixKey.trim() || value.pixKey.length > 200 || typeof value.idempotencyKey !== 'string' || !/^[a-zA-Z0-9-]{16,100}$/.test(value.idempotencyKey) || Object.keys(value).some(name => !['amountCents', 'pixKey', 'idempotencyKey'].includes(name))) return NextResponse.json({ error: 'Dados de saque inválidos.' }, { status: 400 });
      body = JSON.stringify(value);
    }
    const upstream = await fetch(url, { method: request.method, headers: { 'x-access-token': token, 'Content-Type': 'application/json' }, body, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) return NextResponse.json({ error: 'Operação financeira recusada. Atualize os dados antes de tentar novamente.' }, { status: upstream.status });
    if (receipt) {
      const type = upstream.headers.get('content-type')?.split(';')[0];
      if (!type || !['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(type)) return NextResponse.json({ error: 'Comprovante inválido.' }, { status: 502 });
      return new NextResponse(upstream.body, { headers: { 'Cache-Control': 'no-store', 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" } });
    }
    const data = await upstream.json();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Serviço financeiro indisponível.' }, { status: 503 }); }
}
export const GET = proxy;
export const POST = proxy;
