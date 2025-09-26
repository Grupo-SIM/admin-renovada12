"use client";
import React, { useEffect, useState } from "react";
import { CreditCard, RefreshCw, Filter, Download } from "lucide-react";

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {/* <div className="bg-white p-6 rounded-lg shadow">
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
                    </div> */}
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

        </div>
    );
};

export default MachinesPage;

