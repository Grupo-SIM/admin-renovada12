"use client";
import React, { useEffect, useState } from "react";
import { CreditCard, RefreshCw, Filter, Download } from "lucide-react";
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
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    machines: string[];
}

const MachinesPage = () => {
    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMachine, setSelectedMachine] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("");

    // Estados para saque
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [withdrawalAmount, setWithdrawalAmount] = useState("");
    const [pixKey, setPixKey] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [noDiaUtilModal, setNoDiaUtilModal] = useState(false);
    const [feriadoInfo, setFeriadoInfo] = useState<{ name: string } | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                "https://api-dom.jbmidia.com/payments/dom/specific-machines-transactions",
                {
                    headers: {
                        "x-access-token": "4a29df01-a980-45e3-b3c7-1a8b8eb7850f",
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Erro ao carregar dados das maquinetas");
            }

            const result: ApiResponse = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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

            if (!response.ok) throw new Error("Falha ao solicitar saque");

            toast.success(`PIX enviado com sucesso! ✅ Seu saque de ${formatCurrency(parseFloat(withdrawalAmount))} foi processado e está sendo transferido para sua conta.`);

            setIsModalOpen(false);
            setWithdrawalAmount("");
            setPixKey("");
        } catch (error) {
            toast.error("Não foi possível solicitar o saque.");
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case "paid":
                return "bg-green-100 text-green-800";
            case "not_authorized":
                return "bg-red-100 text-red-800";
            case "pending":
                return "bg-yellow-100 text-yellow-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getPaymentMethodText = (method: string) => {
        switch (method) {
            case "debit":
                return "Débito";
            case "credit_card":
                return "Cartão de Crédito";
            case "pix":
                return "PIX";
            case "boleto":
                return "Boleto";
            default:
                return method;
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
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

    const filteredTransactions = data?.transactions.filter((transaction) => {
        const machineMatch = !selectedMachine ||
            transaction.customer_name.includes(`Terminal: ${selectedMachine}`);
        const statusMatch = !statusFilter || transaction.status === statusFilter;
        return machineMatch && statusMatch;
    }) || [];

    const exportToCSV = () => {
        if (!filteredTransactions.length) return;

        const headers = [
            "ID",
            "Data",
            "Terminal",
            "Valor",
            "Lucro Líquido",
            "Status",
            "Método de Pagamento",
            "Bandeira",
            "NSU"
        ];

        const csvContent = [
            headers.join(","),
            ...filteredTransactions.map(transaction => [
                transaction.id,
                formatDate(transaction.created_at),
                transaction.customer_name.replace("Terminal: ", ""),
                transaction.profit_minus_tax,
                transaction.status_details,
                getPaymentMethodText(transaction.payment_method),
                transaction.card_brand,
                transaction.cod_external
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `maquinetas_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center space-x-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-gray-600">Carregando dados das maquinetas...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center space-x-2">
                    <CreditCard className="w-6 h-6 text-red-600" />
                    <h3 className="text-lg font-semibold text-red-800">Erro ao carregar dados</h3>
                </div>
                <p className="text-red-600 mt-2">{error}</p>
                <button
                    onClick={fetchData}
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
                    <CreditCard className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Maquinetas</h1>
                        <p className="text-gray-600">Transações das maquinetas de pagamento</p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={fetchData}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Atualizar</span>
                    </button>
                    <div className="relative group">
                        <button
                            disabled
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-400 text-gray-200 rounded-lg cursor-not-allowed opacity-50"
                        >
                            <CreditCard className="w-4 h-4" />
                            <span>Solicitar Saque</span>
                        </button>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            Em breve
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                        </div>
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span>Exportar CSV</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            {data && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <CreditCard className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total de Transações</p>
                                <p className="text-2xl font-bold text-gray-900">{data.total}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CreditCard className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Maquinetas Ativas</p>
                                <p className="text-2xl font-bold text-gray-900">{data.machines.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <CreditCard className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Valor Total (Lucro Líquido)</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(
                                        data.transactions.reduce((sum, t) => sum + t.profit_minus_tax, 0)
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center space-x-4">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Terminal
                        </label>
                        <select
                            value={selectedMachine}
                            onChange={(e) => setSelectedMachine(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Todos os terminais</option>
                            {data?.machines.map((machine) => (
                                <option key={machine} value={machine}>
                                    {machine}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Todos os status</option>
                            <option value="paid">Aprovado</option>
                            <option value="not_authorized">Não Autorizado</option>
                            <option value="pending">Pendente</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Transações ({filteredTransactions.length})
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Data/Hora
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Terminal
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Lucro Líquido
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Método
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Bandeira
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    NSU
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTransactions.map((transaction) => (
                                <tr key={transaction.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDate(transaction.created_at)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {transaction.customer_name.replace("Terminal: ", "")}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="font-medium">{formatCurrency(transaction.profit_minus_tax)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                                transaction.status
                                            )}`}
                                        >
                                            {transaction.status_details}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {getPaymentMethodText(transaction.payment_method)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {transaction.card_brand}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {transaction.cod_external}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Saque */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Solicitar Saque</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {(isWeekend(new Date()) || feriadoInfo) && (
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
                                        className="pl-8"
                                        placeholder="0,00"
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    Saldo disponível: {formatCurrency(
                                        data?.transactions.reduce((sum, t) => sum + t.profit_minus_tax, 0) || 0
                                    )}
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
                                isWithdrawing ||
                                !withdrawalAmount ||
                                !pixKey ||
                                parseFloat(withdrawalAmount) < 100
                            }
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isWithdrawing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Processando...
                                </>
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
        </div>
    );
};

export default MachinesPage;

