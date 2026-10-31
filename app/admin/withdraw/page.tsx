"use client";
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/global';

const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
interface Summary { unit: string; balanceCents: number; availableBalanceCents: number; lockedBalanceCents: number; pendingPlatformWithdrawalsCents: number; walletScope: string }
interface Withdrawal { id: string; amountCents: number; feeCents: number; status: string; pixKey: string; rejectionReason?: string; createdAt: string; comprovanteVisivel?: boolean; receiptImage?: string }
interface Config { withdrawalsEnabled: boolean; unit: string; withdrawal: { minimumCents: number; fixedFeeCents: number; percentFee: number } }
const statuses: Record<string,string> = { PENDING: 'Pendente', APPROVED: 'Aprovado', COMPLETED: 'Concluído', FAILED: 'Falhou', REJECTED: 'Rejeitado', PROCESSING: 'Processando' };
async function read(resource: string) {
  const response = await fetch(`/api/internal/${resource}`, { cache: 'no-store' });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Serviço financeiro indisponível.');
  return value;
}
export default function WithdrawPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const intention = useRef<{ input: string; key: string } | null>(null);
  async function load(currentPage = page) {
    setLoading(true); setError('');
    try {
      const [wallet, fees, history] = await Promise.all([read('summary'), read('config'), read(`withdrawals?page=${currentPage}&limit=10`)]);
      if (!Number.isFinite(fees.withdrawal?.percentFee) || fees.withdrawal.percentFee < 0 || [wallet, fees, history].some(value => value.unit !== 'cents') || !Array.isArray(history.data) || !['owner', 'shared-owner'].includes(wallet.walletScope) || ![wallet.balanceCents, wallet.availableBalanceCents, wallet.lockedBalanceCents, wallet.pendingPlatformWithdrawalsCents, fees.withdrawal?.minimumCents, fees.withdrawal?.fixedFeeCents].every(Number.isSafeInteger)) throw new Error('Contrato financeiro inválido.');
      setSummary(wallet); setConfig(fees); setWithdrawals(history.data); setPage(currentPage); setTotalPages(history.meta.totalPages);
    } catch (failure) { setSummary(null); setConfig(null); setWithdrawals([]); setError(failure instanceof Error ? failure.message : 'Falha ao carregar finanças.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(1); }, []);
  async function withdraw(event: FormEvent) {
    event.preventDefault();
    if (!summary || !config?.withdrawalsEnabled || sending || loading) return;
    const normalized = amount.replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) { setError('Informe um valor com até duas casas decimais.'); return; }
    const amountCents = Math.round(Number(normalized) * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents < config.withdrawal.minimumCents || amountCents > summary.availableBalanceCents || !pixKey.trim()) { setError('Verifique valor mínimo, saldo disponível e chave PIX.'); return; }
    const input = JSON.stringify({ amountCents, pixKey: pixKey.trim() });
    if (intention.current?.input !== input) intention.current = { input, key: crypto.randomUUID() };
    setSending(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/internal/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountCents, pixKey: pixKey.trim(), idempotencyKey: intention.current.key }) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || 'Saque recusado.');
      intention.current = null; setAmount(''); setNotice('Solicitação registrada. Acompanhe o status no histórico.'); await load(1);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Falha ao solicitar saque.'); }
    finally { setSending(false); }
  }
  return <main className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
    <h1 className="text-2xl font-semibold">Financeiro Renovada</h1>
    <Button onClick={() => void load()} disabled={loading || sending}>Atualizar</Button>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{loading && <p role="status">Carregando finanças…</p>}
    {summary && <section className="space-y-2 border rounded-lg p-4"><h2 className="text-xl font-semibold">Carteira contábil</h2>
      <p>{summary.walletScope === 'shared-owner' ? 'Carteira compartilhada entre plataformas do titular.' : 'Carteira do titular Renovada.'} Saldo do ledger; não representa reconciliação econômica.</p>
      <dl className="grid sm:grid-cols-2 gap-4">{[['Saldo da carteira',summary.balanceCents],['Disponível',summary.availableBalanceCents],['Bloqueado',summary.lockedBalanceCents],['Saques pendentes desta plataforma',summary.pendingPlatformWithdrawalsCents]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd className="text-xl font-semibold">{money(Number(value))}</dd></div>)}</dl>
    </section>}
    {config && <section className="border rounded-lg p-4 space-y-3"><h2 className="text-xl font-semibold">Solicitar saque PIX</h2><p>O valor solicitado é o total debitado da carteira. A taxa é descontada do pagamento PIX.</p><p>Mínimo: {money(config.withdrawal.minimumCents)} · Taxa fixa: {money(config.withdrawal.fixedFeeCents)} · Taxa percentual: {config.withdrawal.percentFee * 100}%</p>
      {!config.withdrawalsEnabled && <p role="status">Saques indisponíveis até aprovação da reconciliação financeira.</p>}<form onSubmit={withdraw} className="space-y-3"><label className="block">Valor em reais<Input inputMode="decimal" value={amount} onChange={event => { setAmount(event.target.value); intention.current = null; }} disabled={sending} required /></label><label className="block">Chave PIX<Input value={pixKey} onChange={event => { setPixKey(event.target.value); intention.current = null; }} disabled={sending} required /></label><Button type="submit" disabled={sending || loading || !summary || !config.withdrawalsEnabled}>{sending ? 'Solicitando…' : 'Solicitar saque'}</Button></form>
    </section>}
    <section className="space-y-3"><h2 className="text-xl font-semibold">Histórico de saques</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Data','Valor','Taxa','Situação','PIX','Comprovante'].map(label => <th key={label} className="text-left p-2">{label}</th>)}</tr></thead><tbody>{withdrawals.map(item => <tr key={item.id}><td className="p-2">{new Date(item.createdAt).toLocaleString('pt-BR')}</td><td className="p-2 whitespace-nowrap">{money(item.amountCents)}</td><td className="p-2 whitespace-nowrap">{money(item.feeCents)}</td><td className="p-2">{statuses[item.status] || 'Situação desconhecida'}{item.rejectionReason && <p>{item.rejectionReason}</p>}</td><td className="p-2 break-all">{item.pixKey}</td><td className="p-2">{item.comprovanteVisivel && item.receiptImage && /^https:\/\//.test(item.receiptImage) ? <a href={item.receiptImage} target="_blank" rel="noopener noreferrer" className="underline">Ver comprovante</a> : 'Indisponível'}</td></tr>)}</tbody></table></div>{!loading && !error && withdrawals.length === 0 && <p>Nenhum saque encontrado.</p>}<div className="flex gap-4 items-center"><Button disabled={loading || sending || page <= 1} onClick={() => void load(page - 1)}>Anterior</Button><span>{page} / {Math.max(1,totalPages)}</span><Button disabled={loading || sending || page >= totalPages} onClick={() => void load(page + 1)}>Próxima</Button></div></section>
  </main>;
}
