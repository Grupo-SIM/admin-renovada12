"use client";
import React, { useEffect, useState } from "react";
import {
  CreditCard,
  RefreshCw,
  Filter,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { jsonToExcel } from "@/services/excel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/global";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/global";

interface Transaction {
  id: string;
  type_operation: string;
  created_at: string;
  updated_at: string;
  cod_external: string;
  amount: number;
  liquid_amount: number;
  status: string;
  status_details: string;
  payment_method: string;
  installments: number;
  card_bin: string;
  card_brand: string;
  card_code_auth: string;
  boleto_url: string | null;
  boleto_digitable_line: string | null;
  pix_qrcode: string | null;
  pix_content: string | null;
  pix_expire: string | null;
  customer_name: string;
  customer_document: string | null;
  customer_birthdate: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  product_first: string;
  postbackUrl: string | null;
  profit_minus_tax: number;
}

interface ApiResponse {
  transactions: Transaction[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ─── Status badge (glass translucent, rounded-md) ────────────────────────────
const statusBadge: Record<string, { cls: string; label: string }> = {
  completed: {
    label: "Aprovado",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 backdrop-blur-sm",
  },
  failed: {
    label: "Falhou",
    cls: "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 backdrop-blur-sm",
  },
  pending: {
    label: "Pendente",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 backdrop-blur-sm",
  },
  refunded: {
    label: "Estornado",
    cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 backdrop-blur-sm",
  },
};

const getStatusBadge = (status: string) =>
  statusBadge[status] ?? {
    label: status,
    cls: "bg-black/[0.06] dark:bg-white/[0.06] text-black/50 dark:text-white/50 border border-black/10 dark:border-white/10 backdrop-blur-sm",
  };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getPaymentMethodText = (method: string) => {
  switch (method) {
    case "debit": return "Débito";
    case "credit_card": return "Cartão de Crédito";
    case "pix": return "PIX";
    case "boleto": return "Boleto";
    default: return method;
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// ─── Main ─────────────────────────────────────────────────────────────────────
const MachinesPage = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const resetPage = () => setPage(1);

  const syncMachinesTransactions = async () => {
    try {
      throw new Error('Sincronização bloqueada: contrato autenticado e escopado de maquinetas ainda indisponível.');
    } catch (err) {
      console.error("Erro na sincronização:", err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      throw new Error('Maquinetas temporariamente indisponíveis: aguardando API autenticada e restrita à Renovada. Nenhum dado foi removido.');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    await syncMachinesTransactions();
    await fetchData();
  };

  useEffect(() => { fetchData(); }, []);

  const machines = [
    ...new Set(
      (data?.transactions || []).map((t: any) => t.terminal).filter(Boolean)
    ),
  ];

  const filteredTransactions =
    data?.transactions.filter((transaction: any) => {
      const machineMatch = !selectedMachine || transaction.terminal === selectedMachine;
      const statusMatch = !statusFilter || transaction.status === statusFilter;
      const txDate = new Date(transaction.createdAt || transaction.created_at);
      const startOk = !startDate || txDate >= startDate;
      const endOk = !endDate || txDate <= new Date(endDate.getTime() + 86399999);
      return machineMatch && statusMatch && startOk && endOk;
    }) || [];

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedTransactions = filteredTransactions.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleExportExcel = () => {
    if (!filteredTransactions.length) return;
    const columns = [
      { header: "ID", key: "id", width: 20 },
      { header: "Data", key: "data", width: 20 },
      { header: "Terminal", key: "terminal", width: 20 },
      { header: "Valor", key: "valor", width: 15 },
      { header: "Lucro Líquido", key: "lucro", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Método de Pagamento", key: "metodo", width: 20 },
      { header: "Bandeira", key: "bandeira", width: 15 },
      { header: "NSU", key: "nsu", width: 25 },
    ];
    const fmt = (d: Date) =>
      d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).replace(/\//g, "-");
    const dateRange = startDate && endDate
      ? `_${fmt(startDate)}_a_${fmt(endDate)}`
      : startDate ? `_${fmt(startDate)}` : endDate ? `_ate_${fmt(endDate)}` : "";

    jsonToExcel(
      filteredTransactions.map((t: any) => ({
        id: t.id,
        data: formatDate(t.createdAt || t.created_at),
        terminal: t.terminal || t.customer_name?.replace("Terminal: ", ""),
        valor: formatCurrency(t.amount || 0),
        lucro: formatCurrency(t.profit_minus_tax || 0),
        status: t.statusDetails || t.status_details,
        metodo: getPaymentMethodText(t.paymentMethod || t.payment_method),
        bandeira: t.cardBrand || t.card_brand,
        nsu: t.domTransactionId || t.cod_external,
      })),
      columns,
      `maquinetas${dateRange}_${new Date().toISOString().split("T")[0]}`
    );
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-black/50 dark:text-white/50">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando dados das maquinetas...</span>
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 max-w-xs w-full text-center p-6 rounded-xl bg-red-500/[0.06] border border-red-500/[0.15] backdrop-blur-sm">
          <CreditCard className="w-8 h-8 text-red-500/50" />
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">Erro ao carregar dados</p>
          <p className="text-xs text-red-600/70 dark:text-red-400/70">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchData}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" lang="pt-BR">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-black/[0.06] dark:bg-white/[0.06]">
            <CreditCard className="w-5 h-5 text-black dark:text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-black dark:text-white">Maquinetas</h1>
            <p className="text-xs text-black/50 dark:text-white/50">Transações das maquinetas de pagamento</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleUpdate}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={handleExportExcel}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-black/50 dark:text-white/50">
                Total de Transações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-black dark:text-white">{data.meta.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-black/50 dark:text-white/50">
                Maquinetas Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-black dark:text-white">{machines.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-black/40 dark:text-white/40" />
            <CardTitle className="text-sm font-medium">Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Terminal</Label>
              <Select value={selectedMachine || "ALL"} onValueChange={(v) => { setSelectedMachine(v === "ALL" ? "" : v); resetPage(); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os terminais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os terminais</SelectItem>
                  {machines.map((machine) => (
                    <SelectItem key={machine} value={machine}>
                      {machine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={statusFilter || "ALL"} onValueChange={(v) => { setStatusFilter(v === "ALL" ? "" : v); resetPage(); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status</SelectItem>
                  <SelectItem value="completed">Aprovado</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="refunded">Estornado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Data Inicial
              </Label>
              <DatePicker value={startDate} onChange={(d) => { setStartDate(d); resetPage(); }} placeholder="Data inicial" />
            </div>
            <div className="space-y-1.5">
              <Label>
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Data Final
              </Label>
              <DatePicker value={endDate} onChange={(d) => { setEndDate(d); resetPage(); }} placeholder="Data final" />
            </div>
          </div>
          {(startDate || endDate) && (
            <div className="mt-3 flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
                className="text-xs h-7"
              >
                Limpar datas
              </Button>
              <span className="text-xs text-black/50 dark:text-white/50">
                {startDate && endDate
                  ? `${startDate.toLocaleDateString("pt-BR")} até ${endDate.toLocaleDateString("pt-BR")}`
                  : startDate
                  ? `A partir de ${startDate.toLocaleDateString("pt-BR")}`
                  : `Até ${endDate?.toLocaleDateString("pt-BR")}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">
            Transações ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Terminal</TableHead>
                  <TableHead>Lucro Líquido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Bandeira</TableHead>
                  <TableHead>NSU</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction: any) => {
                  const badge = getStatusBadge(transaction.status);
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap text-xs text-black/60 dark:text-white/60">
                        {formatDate(transaction.createdAt || transaction.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {transaction.terminal || transaction.customer_name?.replace("Terminal: ", "")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatCurrency(transaction.profit_minus_tax)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                          {transaction.statusDetails || transaction.status_details || badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {getPaymentMethodText(transaction.paymentMethod || transaction.payment_method)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-black/60 dark:text-white/60">
                        {transaction.cardBrand || transaction.card_brand}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-black/50 dark:text-white/50 font-mono">
                        {transaction.domTransactionId || transaction.cod_external}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.06] px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} variant="outline" size="sm">Anterior</Button>
                <Button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} variant="outline" size="sm">Próxima</Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <p className="text-sm text-black/50 dark:text-white/50">
                  Mostrando{" "}
                  <span className="font-medium text-black dark:text-white">{(safePage - 1) * PAGE_SIZE + 1}</span>
                  {" "}até{" "}
                  <span className="font-medium text-black dark:text-white">{Math.min(safePage * PAGE_SIZE, filteredTransactions.length)}</span>
                  {" "}de{" "}
                  <span className="font-medium text-black dark:text-white">{filteredTransactions.length}</span> resultados
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let n = i + 1;
                    if (safePage > 3 && totalPages > 5) n = Math.max(Math.min(safePage - 2 + i, totalPages - 4 + i), i + 1);
                    return (
                      <Button key={n} variant={safePage === n ? "default" : "outline"} size="sm" onClick={() => setPage(n)}>
                        {n}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MachinesPage;
