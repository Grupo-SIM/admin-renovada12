"use client";
import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Eye,
  Phone,
  AlignLeft,
  Clock,
  MessageCircle,
  Filter,
  Calendar,
  X,
} from "lucide-react";
import {
  Card,
  Badge,
  Button,
  CardContent,
  CardTitle,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Label,
} from "@/components/ui/global";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  prayerService,
  PrayerRequestStatus,
  PrayerRequest,
  PrayerStatistics,
} from "../services/prayer";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  zodResolver,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/ceckbox";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CreatePrayerRequestDto } from "../services/prayer";

// ─── Status badge styles (glass translucent) ─────────────────────────────────
const statusConfig: Record<
  PrayerRequestStatus,
  { label: string; className: string }
> = {
  [PrayerRequestStatus.PENDING]: {
    label: "Pendente",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 backdrop-blur-sm",
  },
  [PrayerRequestStatus.IN_PRAYER]: {
    label: "Em oração",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 backdrop-blur-sm",
  },
  [PrayerRequestStatus.COMPLETED]: {
    label: "Completado",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 backdrop-blur-sm",
  },
  [PrayerRequestStatus.ARCHIVED]: {
    label: "Arquivado",
    className:
      "bg-black/[0.06] dark:bg-white/[0.06] text-black/50 dark:text-white/50 border border-black/10 dark:border-white/10 backdrop-blur-sm",
  },
};

// ─── Create Modal ─────────────────────────────────────────────────────────────
const createPrayerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phoneNumber: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  subject: z.string().min(3, "Assunto deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  canContact: z.boolean().default(false),
});

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateModal: React.FC<CreateModalProps> = ({ open, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createPrayerSchema>>({
    resolver: zodResolver(createPrayerSchema),
    defaultValues: { name: "", phoneNumber: "", subject: "", description: "", canContact: false },
  });

  const onSubmit = async (values: z.infer<typeof createPrayerSchema>) => {
    try {
      setIsSubmitting(true);
      await prayerService.createPrayerRequest(values);
      toast({ title: "Sucesso", description: "Pedido de oração criado com sucesso!" });
      form.reset();
      onSuccess();
      onClose();
    } catch {
      toast({ title: "Erro", description: "Não foi possível criar o pedido de oração.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Oração</DialogTitle>
          <DialogDescription>Preencha os dados para criar um novo pedido de oração</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl><Input placeholder="Digite o nome" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phoneNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl><Input placeholder="Digite o telefone" type="tel" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="subject" render={({ field }) => (
              <FormItem>
                <FormLabel>Assunto</FormLabel>
                <FormControl><Input placeholder="Digite o assunto" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl><Textarea placeholder="Digite a descrição do pedido" className="h-32" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="canContact" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Permite contato</FormLabel>
                </div>
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar Pedido"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// ─── View / Edit Modal ────────────────────────────────────────────────────────
interface ViewModalProps {
  request: PrayerRequest | null;
  open: boolean;
  onClose: () => void;
  onStatusUpdate: (id: string, status: PrayerRequestStatus) => Promise<void>;
  readOnly?: boolean;
}

const ViewModal: React.FC<ViewModalProps> = ({ request, open, onClose, onStatusUpdate, readOnly = false }) => {
  const [status, setStatus] = useState<PrayerRequestStatus | null>(null);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => { if (request) setStatus(request.status); }, [request]);

  const handleStatusUpdate = async () => {
    if (!request || !status) return;
    try {
      setUpdating(true);
      await onStatusUpdate(request.id, status);
      toast({ title: "Sucesso", description: "Status atualizado com sucesso!" });
      onClose();
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar o status.", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  if (!request) return null;

  const fmt = (d: string) =>
    new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const cfg = statusConfig[request.status];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <DialogTitle className="text-base truncate">{request.name}</DialogTitle>
              <DialogDescription className="mt-0.5">{request.subject}</DialogDescription>
            </div>
            <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium flex-shrink-0 mt-0.5 ${cfg.className}`}>
              {cfg.label}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact info row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
              <Phone className="w-3.5 h-3.5 text-black/40 dark:text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-medium text-black/40 dark:text-white/40 uppercase tracking-wide mb-0.5">Telefone</p>
                <p className="text-sm text-black dark:text-white">{request.phoneNumber || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
              <MessageCircle className="w-3.5 h-3.5 text-black/40 dark:text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-medium text-black/40 dark:text-white/40 uppercase tracking-wide mb-0.5">Pode Contatar</p>
                <p className="text-sm text-black dark:text-white">{request.canContact ? "Sim" : "Não"}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
            <AlignLeft className="w-3.5 h-3.5 text-black/40 dark:text-white/40 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-black/40 dark:text-white/40 uppercase tracking-wide mb-1">Descrição</p>
              <p className="text-sm text-black dark:text-white whitespace-pre-wrap leading-relaxed">{request.description}</p>
            </div>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
              <Clock className="w-3.5 h-3.5 text-black/40 dark:text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-medium text-black/40 dark:text-white/40 uppercase tracking-wide mb-0.5">Criado em</p>
                <p className="text-xs text-black dark:text-white">{fmt(request.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
              <Clock className="w-3.5 h-3.5 text-black/40 dark:text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-medium text-black/40 dark:text-white/40 uppercase tracking-wide mb-0.5">Atualizado em</p>
                <p className="text-xs text-black dark:text-white">{fmt(request.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Status update — hidden in readOnly mode */}
          {!readOnly && (
            <div className="pt-1">
              <p className="text-xs font-medium text-black/50 dark:text-white/50 mb-2">Alterar status</p>
              <Select value={status as any} onValueChange={(v: PrayerRequestStatus) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PrayerRequestStatus.PENDING}>Pendente</SelectItem>
                  <SelectItem value={PrayerRequestStatus.IN_PRAYER}>Em Oração</SelectItem>
                  <SelectItem value={PrayerRequestStatus.COMPLETED}>Completado</SelectItem>
                  <SelectItem value={PrayerRequestStatus.ARCHIVED}>Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          {readOnly ? (
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleStatusUpdate} disabled={status === request.status || updating}>
                {updating ? "Atualizando..." : "Atualizar Status"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<PrayerStatistics | null>(null);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PrayerRequest | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewReadOnlyOpen, setViewReadOnlyOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, requestsData] = await Promise.all([
        prayerService.getStatistics(),
        prayerService.getPrayerRequests({ take: 10 }),
      ]);
      setStatistics(statsData);
      setPrayerRequests(requestsData.items);
      setSelectedIds(new Set());
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusUpdate = async (id: string, status: PrayerRequestStatus) => {
    await prayerService.updateStatus(id, status);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este pedido?")) return;
    try {
      await prayerService.deletePrayerRequest(id);
      toast({ title: "Sucesso", description: "Pedido excluído com sucesso!" });
      fetchData();
    } catch {
      toast({ title: "Erro", description: "Não foi possível excluir o pedido.", variant: "destructive" });
    }
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    setSelectedIds(checked === true ? new Set(filteredRequests.map((r) => r.id)) : new Set());
  };

  const handleSelectOne = (id: string, checked: boolean | "indeterminate") => {
    const next = new Set(selectedIds);
    checked === true ? next.add(id) : next.delete(id);
    setSelectedIds(next);
  };

  const handleDeleteSelected = async () => {
    const count = selectedIds.size;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => prayerService.deletePrayerRequest(id)));
      toast({ title: "Sucesso", description: `${count} pedido(s) excluído(s) com sucesso!` });
      setSelectedIds(new Set());
      fetchData();
    } catch {
      toast({ title: "Erro", description: "Não foi possível excluir os pedidos.", variant: "destructive" });
    }
  };

  const filteredRequests = prayerRequests.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    const d = new Date(r.createdAt);
    if (startDate && d < startDate) return false;
    if (endDate && d > new Date(endDate.getTime() + 86399999)) return false;
    return true;
  });

  const hasFilters = !!statusFilter || !!startDate || !!endDate;
  const clearFilters = () => { setStatusFilter(""); setStartDate(undefined); setEndDate(undefined); };

  const isAllSelected = filteredRequests.length > 0 && selectedIds.size === filteredRequests.length;

  // ─── Stats cards ─────────────────────────────────────────────────────────────
  const stats = [
    { label: "Pendentes", value: statistics?.byStatus.pending ?? 0 },
    { label: "Em Oração", value: statistics?.byStatus.inPrayer ?? 0 },
    { label: "Completados", value: statistics?.byStatus.completed ?? 0 },
    { label: "Arquivados", value: statistics?.byStatus.archived ?? 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white" />
      </div>
    );
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-black/50 dark:text-white/50">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-black dark:text-white">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-black/40 dark:text-white/40" />
            <CardTitle className="text-sm font-medium">Filtros</CardTitle>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
                Limpar
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os status</SelectItem>
                  <SelectItem value={PrayerRequestStatus.PENDING}>Pendente</SelectItem>
                  <SelectItem value={PrayerRequestStatus.IN_PRAYER}>Em Oração</SelectItem>
                  <SelectItem value={PrayerRequestStatus.COMPLETED}>Completado</SelectItem>
                  <SelectItem value={PrayerRequestStatus.ARCHIVED}>Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Data Inicial
              </Label>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="Data inicial" />
            </div>
            <div className="space-y-1.5">
              <Label>
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Data Final
              </Label>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="Data final" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
          <CardTitle className="text-base">Pedidos de Oração ({filteredRequests.length})</CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            {selectedIds.size > 0 && (
              <Button size="sm" variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir ({selectedIds.size})
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Novo Pedido
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-6">
                    <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
                  <TableHead className="pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="pl-6">
                      <Checkbox
                        checked={selectedIds.has(request.id)}
                        onCheckedChange={(c) => handleSelectOne(request.id, c)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-black dark:text-white">
                      {request.name}
                    </TableCell>
                    <TableCell className="text-black/70 dark:text-white/70">
                      {request.subject}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusConfig[request.status].className}`}
                      >
                        {statusConfig[request.status].label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-black/50 dark:text-white/50 text-xs">
                      {new Date(request.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setSelectedRequest(request); setViewReadOnlyOpen(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setSelectedRequest(request); setViewModalOpen(true); }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500/70 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => handleDelete(request.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ViewModal
        request={selectedRequest}
        open={viewReadOnlyOpen}
        onClose={() => { setSelectedRequest(null); setViewReadOnlyOpen(false); }}
        onStatusUpdate={handleStatusUpdate}
        readOnly
      />
      <ViewModal
        request={selectedRequest}
        open={viewModalOpen}
        onClose={() => { setSelectedRequest(null); setViewModalOpen(false); }}
        onStatusUpdate={handleStatusUpdate}
      />
      <CreateModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={fetchData} />
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir ${selectedIds.size} pedido(s)? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleDeleteSelected}
      />
    </>
  );
};

export default AdminDashboard;
