"use client";
import React, { useEffect, useState } from "react";
import { Wallet, RefreshCw, DollarSign, ArrowUpRight, ArrowDownLeft } from "lucide-react";
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

const WithdrawPage = () => {
    const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para saque
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [withdrawalAmount, setWithdrawalAmount] = useState("");
    const [pixKey, setPixKey] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [noDiaUtilModal, setNoDiaUtilModal] = useState(false);
    const [feriadoInfo, setFeriadoInfo] = useState<{ name: string } | null>(null);

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
    }, []);

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

            if (!response.ok) throw new Error("Falha ao solicitar saque");

            toast.success(`PIX enviado com sucesso! ✅ Seu saque de ${formatCurrency(parseFloat(withdrawalAmount))} foi processado e está sendo transferido para sua conta.`);

            setIsModalOpen(false);
            setWithdrawalAmount("");
            setPixKey("");
            fetchFinancialSummary(); // Atualiza os dados após o saque
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
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Wallet className="w-4 h-4" />
                        <span>Solicitar Saque</span>
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
                                        className={`pl-8 ${parseFloat(withdrawalAmount) > (financialSummary?.availableBalance || 0) - 2
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
                                parseFloat(withdrawalAmount) < 100 ||
                                parseFloat(withdrawalAmount) > (financialSummary?.availableBalance || 0) - 2
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

export default WithdrawPage;
