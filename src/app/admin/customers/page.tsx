
'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Customer, Sale } from '@/lib/types';
import {
    User, DollarSign, Phone, Activity, Search, Edit2,
    AlertCircle, CheckCircle2, ChevronRight, X, Calendar,
    CreditCard, Loader2, Trash2, RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomersPage() {
    const { customers, sales, recordInstallmentPayment, deleteCustomer, resetCustomers, resetAllData } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Track selected installments by saleId
    // Record format: { [saleId: string]: number[] } // values are installment numbers
    const [selectedInstallments, setSelectedInstallments] = useState<Record<string, number[]>>({});
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Yape' | 'Transfer'>('Cash');

    // Filter customers
    const filteredCustomers = useMemo(() => {
        const sorted = [...customers].sort((a, b) => b.balance - a.balance);
        return sorted.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [customers, searchTerm]);

    // Active credit sales for the selected customer
    const activeSales = useMemo(() => {
        if (!selectedCustomer) return [];
        return sales.filter(s =>
            s.customerId === selectedCustomer.id &&
            s.type === 'Credit' &&
            (s.remainingBalance || 0) > 0
        ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [sales, selectedCustomer]);

    const totalSelectedAmount = useMemo(() => {
        let total = 0;
        Object.entries(selectedInstallments).forEach(([saleId, numbers]) => {
            const sale = activeSales.find(s => s.id === saleId);
            if (sale && sale.installmentPlan) {
                numbers.forEach(num => {
                    const inst = sale.installmentPlan?.installments.find(i => i.number === num);
                    if (inst) total += inst.amount;
                });
            }
        });
        return total;
    }, [selectedInstallments, activeSales]);

    const handleOpenPayment = (customer: Customer) => {
        setSelectedCustomer(customer);
        setSelectedInstallments({});
        setPaymentMethod('Cash');
        setIsPaymentModalOpen(true);
    };

    const toggleInstallment = (saleId: string, installmentNumber: number) => {
        setSelectedInstallments(prev => {
            const current = prev[saleId] || [];
            const exists = current.includes(installmentNumber);
            const next = exists
                ? current.filter(n => n !== installmentNumber)
                : [...current, installmentNumber];

            return {
                ...prev,
                [saleId]: next
            };
        });
    };

    const handlePayment = async () => {
        if (!selectedCustomer || totalSelectedAmount === 0) return;

        setIsProcessing(true);
        try {
            // Process each sale that has selected installments
            for (const [saleId, numbers] of Object.entries(selectedInstallments)) {
                if (numbers.length > 0) {
                    await recordInstallmentPayment(saleId, numbers, paymentMethod);
                }
            }
            setIsPaymentModalOpen(false);
            alert('¡Pagos registrados con éxito!');
        } catch (err) {
            console.error('Error processing payments:', err);
            alert('Error al registrar los pagos.');
        } finally {
            setIsProcessing(false);
        }
    };

    const sendWhatsApp = (customer: Customer) => {
        // Find all active credit sales for this customer
        const customerSales = sales.filter(s =>
            s.customerId === customer.id &&
            s.type === 'Credit' &&
            (s.remainingBalance || 0) > 0
        );

        let totalPaidInstallments = 0;
        let totalPendingInstallments = 0;
        let pendingList = "";

        customerSales.forEach(sale => {
            if (sale.installmentPlan) {
                sale.installmentPlan.installments.forEach(inst => {
                    if (inst.status === 'Paid') {
                        totalPaidInstallments++;
                    } else {
                        totalPendingInstallments++;
                        const dueDate = new Date(inst.dueDate).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
                        pendingList += `\n• Cuota #${inst.number}: S/ ${inst.amount.toFixed(2)} (Vence: ${dueDate})`;
                    }
                });
            }
        });

        const message = `Hola *${customer.name}*, le saludamos de *MivisShopping*. 👋\n\nLe recordamos que tiene un saldo pendiente total de *S/ ${customer.balance.toFixed(2)}*.\n\n📊 *Estado de sus cuotas:*\n✅ Pagadas: ${totalPaidInstallments}\n⏳ Pendientes: ${totalPendingInstallments}\n${pendingList}\n\nPor favor, agradeceríamos que pudiera realizar su pago a la brevedad. ¡Que tenga un excelente día! ✨`;

        const phoneNumber = customer.contact.replace(/\D/g, ''); // Clean the number
        window.open(`https://wa.me/51${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleDeleteCustomer = async (id: string, name: string) => {
        if (window.confirm(`¿Estás seguro de eliminar al cliente "${name}"? Esta acción no se puede deshacer.`)) {
            await deleteCustomer(id);
        }
    };

    const handleResetCustomers = async () => {
        if (window.confirm('¿ELIMINAR TODOS LOS CLIENTES? Esta acción borrará a todos los clientes registrados.')) {
            await resetCustomers();
        }
    };

    const handleMasterReset = async () => {
        if (window.confirm('🚨 ¡ALERTA DE REINICIO TOTAL! 🚨\n\n¿Estás absolutamente seguro? Esta acción borrará:\n- TODOS los productos\n- TODAS las ventas\n- TODOS los clientes\n\nEl sistema quedará en CERO.')) {
            if (window.confirm('¿ESTÁS REALMENTE SEGURO? Presiona Aceptar para borrar TODO.')) {
                await resetAllData();
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <User className="text-purple-600" />
                        Clientes y Créditos
                    </h1>
                    <p className="text-gray-500 mt-1">Gestiona deudas y pagos de tus clientes.</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button
                        onClick={handleResetCustomers}
                        className="flex-1 md:flex-none px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-100"
                    >
                        <Trash2 size={14} /> Eliminar Todos los Clientes
                    </button>
                    <button
                        onClick={handleMasterReset}
                        className="flex-1 md:flex-none px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                    >
                        <RefreshCcw size={14} /> Reiniciar Todo el Sistema
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.map((customer) => (
                    <motion.div
                        key={customer.id}
                        layout
                        className={`bg-white rounded-2xl p-6 border ${customer.balance > 0 ? 'border-orange-100 shadow-orange-50' : 'border-gray-100'} shadow-sm relative overflow-hidden flex flex-col`}
                    >
                        {customer.balance > 0 && (
                            <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 px-3 py-1 rounded-bl-xl text-[10px] font-bold flex items-center gap-1">
                                <AlertCircle size={10} /> DEUDA ACTIVA
                            </div>
                        )}

                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl flex items-center justify-center text-xl font-bold text-purple-400 border border-purple-100">
                                {customer.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg leading-tight">{customer.name}</h3>
                                <div className="flex items-center text-xs text-gray-500 gap-1.5 mt-1.5 font-medium">
                                    <Phone size={12} className="text-gray-400" /> {customer.contact || 'Sin contacto'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50/80 backdrop-blur-sm p-4 rounded-xl mb-6 flex justify-between items-center border border-gray-100">
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Saldo Pendiente</span>
                                <span className={`text-2xl font-black ${customer.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    S/ {customer.balance.toFixed(2)}
                                </span>
                            </div>
                            <div className={`p-2 rounded-lg ${customer.balance > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                {customer.balance > 0 ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                            </div>
                        </div>

                        <div className="flex gap-2.5 mt-auto">
                            <button
                                onClick={() => handleOpenPayment(customer)}
                                disabled={customer.balance <= 0}
                                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-200 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <DollarSign size={16} /> Registrar Abono
                            </button>
                            <button
                                onClick={() => sendWhatsApp(customer)}
                                className="px-3.5 py-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors border border-green-100 active:scale-95"
                                title="Enviar Recordatorio"
                            >
                                <Phone size={20} />
                            </button>
                            <button
                                onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                                className="px-3.5 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100 active:scale-95"
                                title="Eliminar Cliente"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* PAYMENT MODAL WITH INSTALLMENTS */}
            <AnimatePresence>
                {isPaymentModalOpen && selectedCustomer && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                        >
                            {/* Header */}
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 leading-tight">Registrar Abono</h2>
                                    <p className="text-gray-500 font-medium">Cliente: <span className="text-purple-600">{selectedCustomer.name}</span></p>
                                </div>
                                <button
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="p-3 bg-white text-gray-400 hover:text-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-90"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                {/* Payment Method */}
                                <div>
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 block">MÉTODO DE PAGO</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(['Cash', 'Yape', 'Transfer'] as const).map(method => (
                                            <button
                                                key={method}
                                                onClick={() => setPaymentMethod(method)}
                                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === method
                                                    ? 'border-purple-600 bg-purple-50 text-purple-700 font-bold'
                                                    : 'border-gray-100 text-gray-400 hover:border-gray-200'
                                                    }`}
                                            >
                                                {method === 'Cash' && <DollarSign size={20} />}
                                                {method === 'Yape' && <Phone size={20} />}
                                                {method === 'Transfer' && <CreditCard size={20} />}
                                                <span className="text-xs">{method === 'Cash' ? 'Efectivo' : method}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Installments List */}
                                <div>
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 block">CUOTAS PENDIENTES</label>

                                    {activeSales.length === 0 ? (
                                        <div className="p-8 bg-gray-50 rounded-3xl text-center border-2 border-dashed border-gray-200">
                                            <CheckCircle2 className="text-green-500 mx-auto mb-3" size={32} />
                                            <p className="text-gray-500 font-medium text-sm">No hay ventas a crédito activas</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {activeSales.map(sale => (
                                                <div key={sale.id} className="space-y-3">
                                                    <div className="flex justify-between items-center px-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                                                <Calendar size={14} />
                                                            </div>
                                                            <span className="text-sm font-black text-gray-700">Venta {new Date(sale.date).toLocaleDateString()}</span>
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-400">Total: S/ {sale.total.toFixed(2)}</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {sale.installmentPlan?.installments.map(inst => (
                                                            <button
                                                                key={`${sale.id}-${inst.number}`}
                                                                disabled={inst.status === 'Paid'}
                                                                onClick={() => toggleInstallment(sale.id, inst.number)}
                                                                className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between h-20 relative overflow-hidden ${inst.status === 'Paid'
                                                                    ? 'bg-green-50 border-green-100 text-green-700 opacity-60'
                                                                    : (selectedInstallments[sale.id] || []).includes(inst.number)
                                                                        ? 'border-purple-600 bg-purple-600 text-white ring-4 ring-purple-100 select-bounce'
                                                                        : 'bg-white border-gray-100 hover:border-purple-300 text-gray-600'
                                                                    }`}
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <span className="text-[10px] font-black opacity-60">CUOTA #{inst.number}</span>
                                                                    {inst.status === 'Paid' && <CheckCircle2 size={12} />}
                                                                </div>
                                                                <span className="text-sm font-black">S/ {inst.amount.toFixed(2)}</span>

                                                                {/* Due date indicator */}
                                                                <span className="text-[10px] opacity-60 font-medium">
                                                                    Vence: {new Date(inst.dueDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Summary */}
                            <div className="p-8 bg-gray-50 border-t border-gray-100">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">MONTO TOTAL SELECCIONADO</span>
                                        <span className="text-4xl font-black text-gray-900">S/ {totalSelectedAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">NUEVO SALDO</span>
                                        <span className="text-lg font-bold text-purple-600">S/ {(selectedCustomer.balance - totalSelectedAmount).toFixed(2)}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handlePayment}
                                    disabled={totalSelectedAmount === 0 || isProcessing}
                                    className="w-full py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-purple-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="animate-spin" size={24} />
                                            PROCESANDO...
                                        </>
                                    ) : (
                                        <>
                                            CONFIRMAR PAGO <ChevronRight size={24} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                @keyframes select-bounce {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                .select-bounce {
                    animation: select-bounce 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
            `}</style>
        </div>
    );
}
