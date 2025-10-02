"use client";
import React, { useEffect, useState } from "react";
import { Wallet, RefreshCw, DollarSign, ArrowUpRight, ArrowDownLeft, History, FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/global";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/global";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from 'react-toastify';

interface FinancialSummary {
    availableBalance: number;
    pendingWithdraws: number;
    lockedBalance: number;
    wallet: {
        id: string;
        userId: string;
        version: number;
        updatedAt: string;
        lastWithDrawDate: string;
    };
}

interface Withdrawal {
    id: string;
    userId: string;
    amount: number;
    status: "PENDING" | "COMPLETED" | "FAILED" | "APPROVED";
    pixKey: string;
    receiptImage?: string;
    fee?: string;
    createdAt: string;
    updatedAt: string;
    user: {
        name: string;
        email: string;
    };
}

interface WithdrawalResponse {
    withdrawals: Withdrawal[];
    meta: {
        currentPage: number;
        itemsPerPage: number;
        totalItems: number;
        totalPages: number;
    };
}

const WithdrawPage = () => {
    const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [withdrawalsPaginationMeta, setWithdrawalsPaginationMeta] = useState({
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0,
        totalPages: 1,
    });
    const [activeTab, setActiveTab] = useState("summary");

    // Estados para saque
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [withdrawalAmount, setWithdrawalAmount] = useState("");
    const [pixKey, setPixKey] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [noDiaUtilModal, setNoDiaUtilModal] = useState(false);
    const [feriadoInfo, setFeriadoInfo] = useState<{ name: string } | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [selectedReceiptImage, setSelectedReceiptImage] = useState("");
    const [hasPendingWithdrawal, setHasPendingWithdrawal] = useState(false);
    const [pendingWithdrawal, setPendingWithdrawal] = useState<Withdrawal | null>(null);

    const fetchFinancialSummary = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch("https://api-dom.jbmidia.com/payments/summary", {
                headers: {
                    "x-access-token": "4a29df01-a980-45e3-b3c7-1a8b8eb7850f",
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Erro ao carregar dados financeiros");
            }

            const result: FinancialSummary = await response.json();
            setFinancialSummary(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinancialSummary();
        fetchWithdrawals(1);
    }, []);

    const fetchWithdrawals = async (page = 1) => {
        try {
            const response = await fetch(
                `https://api-dom.jbmidia.com/payments/withdrawals?page=${page}&limit=${withdrawalsPaginationMeta.itemsPerPage}`,
                {
                    headers: {
                        accept: "*/*",
                        "x-access-token": "4a29df01-a980-45e3-b3c7-1a8b8eb7850f",
                        "Content-Type": "application/json",
                    },
                }
            );
            const data: WithdrawalResponse = await response.json();
            setWithdrawals(data.withdrawals);
            setWithdrawalsPaginationMeta(data.meta);

            // Verificar se há saque pendente
            checkPendingWithdrawal(data.withdrawals);
        } catch (error) {
            console.error("Erro ao carregar histórico de saques:", error);
        }
    };

    const checkPendingWithdrawal = (withdrawals: Withdrawal[]) => {
        // Procurar por saque pendente (apenas PENDING)
        const pending = withdrawals.find(w => w.status === "PENDING");

        if (pending) {
            setHasPendingWithdrawal(true);
            setPendingWithdrawal(pending);
        } else {
            setHasPendingWithdrawal(false);
            setPendingWithdrawal(null);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const downloadImage = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || 'nota-fiscal.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Erro ao baixar imagem:', error);
            toast.error('Erro ao baixar a nota fiscal');
        }
    };

    const openReceiptModal = (imageUrl: string) => {
        setSelectedReceiptImage(imageUrl);
        setIsReceiptModalOpen(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("pt-BR");
    };

    const formatCPFCNPJ = (value: string) => {
        const numbersOnly = value.replace(/\D/g, "");

        if (numbersOnly.length <= 11) {
            return numbersOnly
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        } else {
            return numbersOnly
                .replace(/^(\d{2})(\d)/, "$1.$2")
                .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
                .replace(/\.(\d{3})(\d)/, ".$1/$2")
                .replace(/(\d{4})(\d)/, "$1-$2");
        }
    };

    const getFeriados = async () => {
        const ano = new Date().getFullYear();
        try {
            const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
            const data = await response.json();
            return data.map((feriado: any) => ({
                date: feriado.date,
                name: feriado.name
            }));
        } catch (error) {
            console.error('Erro ao buscar feriados:', error);
            return [];
        }
    };

    const isWeekend = (date: Date) => {
        const day = date.getDay();
        return day === 0 || day === 6; // 0 = domingo, 6 = sábado
    };

    useEffect(() => {
        const checkDiaUtil = async () => {
            const hoje = new Date();
            const dataHoje = hoje.toISOString().split('T')[0];

            if (isWeekend(hoje)) {
                setNoDiaUtilModal(true);
                return;
            }

            const feriados = await getFeriados();
            interface Feriado {
                date: string;
                name: string;
            }

            const feriado = feriados.find((f: Feriado) => f.date === dataHoje);

            if (feriado) {
                setFeriadoInfo(feriado);
                setNoDiaUtilModal(true);
            }
        };

        checkDiaUtil();
    }, []);

    const handleWithdrawalRequest = async () => {
        if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
            toast.error("Por favor, insira um valor válido.");
            return;
        }

        if (!pixKey.trim()) {
            toast.error("Por favor, insira uma chave PIX válida.");
            return;
        }

        if (parseFloat(withdrawalAmount) < 100) {
            toast.error("O valor mínimo para saque deve ser de R$ 100,00");
            return;
        }

        if (parseFloat(withdrawalAmount) > financialSummary!.availableBalance - 2) {
            toast.error("Valor insuficiente para saque (considere a taxa de R$ 2,00)");
            return;
        }

        setIsWithdrawing(true);
        try {
            const response = await fetch("https://api-dom.jbmidia.com/payments/withdraw", {
                method: "POST",
                headers: {
                    accept: "*/*",
                    "x-access-token": "4a29df01-a980-45e3-b3c7-1a8b8eb7850f",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amount: parseFloat(withdrawalAmount),
                    pixKey: pixKey.trim(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Falha ao solicitar saque");
            }

            toast.success(`PIX enviado com sucesso! ✅ Seu saque de ${formatCurrency(parseFloat(withdrawalAmount))} foi processado e está sendo transferido para sua conta.`);

            setIsModalOpen(false);
            setWithdrawalAmount("");
            setPixKey("");
            fetchFinancialSummary(); // Atualiza os dados após o saque
            fetchWithdrawals(1); // Atualiza o histórico de saques
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Não foi possível solicitar o saque.";
            toast.error(errorMessage);
        } finally {
            setIsWithdrawing(false);
        }
    };

    const handlePixKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedValue = formatCPFCNPJ(e.target.value);
        setPixKey(formattedValue);
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, "");
        const formattedValue = (parseInt(value || "0") / 100).toFixed(2);
        setWithdrawalAmount(formattedValue);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center space-x-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-gray-600">Carregando dados financeiros...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center space-x-2">
                    <Wallet className="w-6 h-6 text-red-600" />
                    <h3 className="text-lg font-semibold text-red-800">Erro ao carregar dados</h3>
                </div>
                <p className="text-red-600 mt-2">{error}</p>
                <button
                    onClick={fetchFinancialSummary}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Wallet className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Saque</h1>
                        <p className="text-gray-600">Gerencie seus saques e visualize seu saldo</p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={fetchFinancialSummary}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Atualizar</span>
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        disabled={hasPendingWithdrawal}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${hasPendingWithdrawal
                            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                            : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                    >
                        <Wallet className="w-4 h-4" />
                        <span>{hasPendingWithdrawal ? "Saque Pendente" : "Solicitar Saque"}</span>
                    </button>
                </div>
            </div>

            {/* Aviso sobre dias úteis */}
            <div className="w-full bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-blue-800">
                            Atenção: As solicitações de saque são processadas em até 48 horas apenas em dias úteis.
                        </p>
                    </div>
                </div>
            </div>

            {/* Banner de Saque Pendente */}
            {hasPendingWithdrawal && pendingWithdrawal && (
                <div className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                                Saque Pendente de Aprovação
                            </h3>
                            <div className="mt-1 text-sm text-yellow-700">
                                <p>Você possui um saque de <strong>{formatCurrency(pendingWithdrawal.amount)}</strong> aguardando aprovação.</p>
                                {/* <p className="mt-1">Status: <span className="font-semibold text-yellow-800">{pendingWithdrawal.status === "PENDING" ? "Aguardando Aprovação" : "Aprovado - Processando"}</span></p> */}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Abas */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab("summary")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "summary"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                    >
                        <div className="flex items-center space-x-2">
                            <Wallet className="w-4 h-4" />
                            <span>Resumo</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "history"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                    >
                        <div className="flex items-center space-x-2">
                            <History className="w-4 h-4" />
                            <span>Histórico de Saques</span>
                        </div>
                    </button>
                </nav>
            </div>

            {/* Conteúdo das Abas */}
            {activeTab === "summary" && (
                <>
                    {/* Cards de Saldo */}
                    {financialSummary && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="flex items-center">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <DollarSign className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Saldo disponível</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {formatCurrency(financialSummary.availableBalance)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="flex items-center">
                                    <div className="p-2 bg-yellow-100 rounded-lg">
                                        <ArrowUpRight className="w-6 h-6 text-yellow-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Saque em processo</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {formatCurrency(financialSummary.pendingWithdraws)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow">
                                <div className="flex items-center">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <ArrowDownLeft className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Saldo em processamento</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {formatCurrency(financialSummary.lockedBalance)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Informações da Carteira */}
                    {financialSummary && (
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações da Carteira</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Última atualização</p>
                                    <p className="text-gray-900">{formatDate(financialSummary.wallet.updatedAt)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Último saque</p>
                                    <p className="text-gray-900">
                                        {financialSummary.wallet.lastWithDrawDate
                                            ? formatDate(financialSummary.wallet.lastWithDrawDate)
                                            : "Nenhum saque realizado"
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeTab === "history" && (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Histórico de Saques</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Data
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nome
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Valor
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Chave PIX
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nota Fiscal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {withdrawals.map((withdrawal) => (
                                        <tr key={withdrawal.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(withdrawal.createdAt).toLocaleDateString("pt-BR")}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {withdrawal.user.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {withdrawal.user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatCurrency(withdrawal.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {withdrawal.pixKey}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${withdrawal.status === "COMPLETED"
                                                        ? "bg-green-100 text-green-800"
                                                        : withdrawal.status === "PENDING"
                                                            ? "bg-yellow-100 text-yellow-800"
                                                            : withdrawal.status === "APPROVED"
                                                                ? "bg-blue-100 text-blue-800"
                                                                : withdrawal.status === "FAILED"
                                                                    ? "bg-red-100 text-red-800"
                                                                    : "bg-gray-100 text-gray-800"
                                                        }`}
                                                >
                                                    {withdrawal.status === "COMPLETED" ? "Concluído" :
                                                        withdrawal.status === "PENDING" ? "Aguardando Aprovação" :
                                                            withdrawal.status === "APPROVED" ? "Aprovado - Processando" :
                                                                withdrawal.status === "FAILED" ? "Falhou" : withdrawal.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {withdrawal.receiptImage ? (
                                                    <div className="flex items-center space-x-3">
                                                        {/* Botões de Ação */}
                                                        <div className="flex space-x-2">
                                                            {/* Botão Visualizar */}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openReceiptModal(withdrawal.receiptImage!)}
                                                                className="flex items-center space-x-1 text-xs px-3 py-1.5 h-8 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                                <span>Ver</span>
                                                            </Button>

                                                            {/* Botão Download */}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => downloadImage(withdrawal.receiptImage!, `nota-fiscal-${withdrawal.id.slice(-8)}.png`)}
                                                                className="flex items-center space-x-1 text-xs px-3 py-1.5 h-8 bg-white hover:bg-green-50 border-green-300 text-green-700 hover:text-green-900"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                                <span>Baixar</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2">
                                                        <div className="flex items-center justify-center w-10 h-10 bg-gray-50 rounded-lg border border-gray-200">
                                                            <FileText className="w-5 h-5 text-gray-400" />
                                                        </div>
                                                        <span className="text-gray-400 text-sm">Não disponível</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {withdrawals.length === 0 && (
                                <div className="text-center py-8">
                                    <History className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum saque encontrado</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Não há histórico de saques para exibir.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Saque */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Solicitar Saque</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {hasPendingWithdrawal && (
                            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                                <p className="text-yellow-600 font-medium text-center">
                                    Você já possui um saque pendente. Por favor, aguarde a aprovação antes de solicitar um novo saque.
                                </p>
                            </div>
                        )}

                        {(isWeekend(new Date()) || feriadoInfo) && !hasPendingWithdrawal && (
                            <div className="p-3 bg-red-50 border border-red-300 rounded-md">
                                <p className="text-red-600 font-medium text-center">
                                    {isWeekend(new Date())
                                        ? "Atenção! Hoje é final de semana. O processamento do seu saque só iniciará no próximo dia útil."
                                        : `Atenção! Hoje é ${feriadoInfo?.name || 'feriado'}. O processamento do seu saque só iniciará no próximo dia útil.`}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">
                                Valor
                            </Label>
                            <div className="col-span-3 relative">
                                <div className="flex items-center justify-center gap-2">
                                    <span className="absolute left-3">R$</span>
                                    <Input
                                        id="amount"
                                        type="text"
                                        value={withdrawalAmount}
                                        onChange={handleAmountChange}
                                        disabled={hasPendingWithdrawal}
                                        className={`pl-8 ${hasPendingWithdrawal ? "bg-gray-100 cursor-not-allowed" : ""} ${parseFloat(withdrawalAmount) > (financialSummary?.availableBalance || 0) - 2
                                            ? "border-red-500 focus:ring-red-500"
                                            : ""
                                            }`}
                                        placeholder="0,00"
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    Saldo disponível: {formatCurrency(financialSummary?.availableBalance || 0)}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="pixKey" className="text-right">
                                PIX (CPF/CNPJ)
                            </Label>
                            <div className="col-span-3">
                                <Input
                                    id="pixKey"
                                    type="text"
                                    value={pixKey}
                                    onChange={handlePixKeyChange}
                                    disabled={hasPendingWithdrawal}
                                    className={hasPendingWithdrawal ? "bg-gray-100 cursor-not-allowed" : ""}
                                    placeholder="Digite seu CPF ou CNPJ"
                                />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 text-center">
                            Será cobrada uma taxa de R$ 2,00 por saque
                        </p>
                        <p className="text-sm text-red-500 font-medium text-center mt-1">
                            O valor mínimo para saque deve ser de R$ 100,00
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsModalOpen(false);
                                setPixKey("");
                                setWithdrawalAmount("");
                            }}
                            disabled={isWithdrawing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleWithdrawalRequest}
                            disabled={
                                hasPendingWithdrawal ||
                                isWithdrawing ||
                                !withdrawalAmount ||
                                !pixKey ||
                                parseFloat(withdrawalAmount) < 100 ||
                                parseFloat(withdrawalAmount) > (financialSummary?.availableBalance || 0) - 2
                            }
                            className={`${hasPendingWithdrawal
                                ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700"
                                } text-white`}
                        >
                            {isWithdrawing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Processando...
                                </>
                            ) : hasPendingWithdrawal ? (
                                "Saque Pendente"
                            ) : (
                                "Confirmar"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Dia Não Útil */}
            <Dialog open={noDiaUtilModal} onOpenChange={setNoDiaUtilModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Aviso Importante</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <p className="text-gray-700 text-center">
                            {isWeekend(new Date())
                                ? "Hoje é final de semana. Saques só podem ser solicitados em dias úteis."
                                : `Hoje é ${feriadoInfo?.name || 'feriado'}. Saques só podem ser solicitados em dias úteis.`}
                        </p>
                        <p className="text-sm text-gray-500 text-center">
                            Por favor, aguarde o próximo dia útil para solicitar seu saque.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => setNoDiaUtilModal(false)}
                            className="w-full"
                        >
                            Entendi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Visualização da Nota Fiscal */}
            <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <span>Nota Fiscal</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center space-y-4 py-4">
                        {selectedReceiptImage && (
                            <div className="w-full flex justify-center">
                                <img
                                    src={selectedReceiptImage}
                                    alt="Nota Fiscal"
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg border shadow-lg"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                                <div className="hidden items-center justify-center p-8 text-center">
                                    <FileText className="w-16 h-16 text-gray-400 mb-4" />
                                    <p className="text-gray-500 text-lg">Erro ao carregar a imagem</p>
                                    <p className="text-gray-400 text-sm">A nota fiscal não pôde ser exibida</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="flex space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsReceiptModalOpen(false)}
                            className="flex-1"
                        >
                            Fechar
                        </Button>
                        {selectedReceiptImage && (
                            <Button
                                onClick={() => downloadImage(selectedReceiptImage, `nota-fiscal-${Date.now()}.png`)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Baixar
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WithdrawPage;
