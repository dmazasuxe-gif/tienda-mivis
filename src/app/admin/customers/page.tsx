
'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Customer } from '@/lib/types';
import {
    User, DollarSign, Phone, Search,
    AlertCircle, CheckCircle2, ChevronRight, X, Calendar,
    CreditCard, Loader2, Trash2, RefreshCcw, Package, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomersPage() {
    const { products, customers, sales, recordInstallmentPayment, reverseInstallmentPayment, deleteCustomer, resetCustomers, resetAllData, updateInstallmentDate } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Track selected installments by saleId
    // Record format: { [saleId: string]: number[] } // values are installment numbers
    const [selectedInstallments, setSelectedInstallments] = useState<Record<string, number[]>>({});
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Yape' | 'Plin' | 'Transfer'>('Cash');
    const [editingInstallment, setEditingInstallment] = useState<{ saleId: string, installmentNumber: number, currentDate: string } | null>(null);
    const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<Customer | null>(null);
    const [customAmounts, setCustomAmounts] = useState<Record<string, Record<number, number>>>({});

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
            numbers.forEach(num => {
                total += customAmounts[saleId]?.[num] || 0;
            });
        });
        return total;
    }, [selectedInstallments, customAmounts]);

    const handleOpenPayment = (customer: Customer) => {
        setSelectedCustomer(customer);
        setSelectedInstallments({});
        setCustomAmounts({});
        setPaymentMethod('Cash');
        setIsPaymentModalOpen(true);
    };

    const toggleInstallment = async (sale: any, installment: any) => {
        const saleId = sale.id;
        const installmentNumber = installment.number;

        if (installment.status === 'Paid') {
            if (window.confirm('¿Deseas anular el pago de esta cuota y marcarla como pendiente? El saldo del cliente será ajustado.')) {
                await reverseInstallmentPayment(saleId, installmentNumber);
            }
            return;
        }

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

        if (!(selectedInstallments[saleId] || []).includes(installmentNumber)) {
            setCustomAmounts(prev => ({
                ...prev,
                [saleId]: {
                    ...(prev[saleId] || {}),
                    [installmentNumber]: installment.amount
                }
            }));
        }
    };

    const handleCustomAmountChange = (saleId: string, num: number, value: string) => {
        const amount = parseFloat(value) || 0;
        setCustomAmounts(prev => ({
            ...prev,
            [saleId]: {
                ...(prev[saleId] || {}),
                [num]: amount
            }
        }));
    };

    const handleUpdateInstallmentDate = async (newDate: string) => {
        if (!editingInstallment) return;
        try {
            await updateInstallmentDate(editingInstallment.saleId, editingInstallment.installmentNumber, newDate);
            setEditingInstallment(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handlePayment = async () => {
        if (!selectedCustomer || totalSelectedAmount === 0) return;

        setIsProcessing(true);
        try {
            for (const [saleId, numbers] of Object.entries(selectedInstallments)) {
                if (numbers.length > 0) {
                    const paymentsForThisSale: Record<number, number> = {};
                    numbers.forEach(num => {
                        paymentsForThisSale[num] = customAmounts[saleId][num];
                    });
                    await recordInstallmentPayment(saleId, paymentsForThisSale, paymentMethod);
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
                        <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 px-3 py-1 rounded-bl-xl text-[10px] font-bold flex items-center gap-1" title="El cliente tiene deudas pendientes">
                            <AlertCircle size={10} /> DEUDA ACTIVA
                        </div>

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

                        <div className="bg-gray-50/80 backdrop-blur-sm p-4 rounded-xl mb-4 flex justify-between items-center border border-gray-100">
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

                        {/* Recent Credit Activity Detail - Task 3 */}
                        {customer.history.length > 0 && sales.some(s => s.customerId === customer.id && s.type === 'Credit') && (
                            <button
                                onClick={() => setSelectedCustomerForDetail(customer)}
                                className="w-full mb-6 p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-between group"
                            >
                                🔍 Ver Detalle de Crédito
                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}

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
                                    title="Cerrar"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                {/* Payment Method */}
                                <div>
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 block">MÉTODO DE PAGO</label>
                                    <div className="grid grid-cols-4 gap-3">
                                        {(['Cash', 'Yape', 'Plin', 'Transfer'] as const).map(method => (
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
                                                {method === 'Plin' && <Activity size={20} />}
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
                                                            <div
                                                                key={`${sale.id}-${inst.number}`}
                                                                onClick={() => toggleInstallment(sale, inst)}
                                                                className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between h-32 relative overflow-hidden cursor-pointer ${inst.status === 'Paid'
                                                                    ? 'bg-green-50 border-green-100 text-green-700 opacity-90'
                                                                    : (selectedInstallments[sale.id] || []).includes(inst.number)
                                                                        ? 'border-purple-600 bg-purple-600 text-white ring-4 ring-purple-100 select-bounce'
                                                                        : 'bg-white border-gray-100 hover:border-purple-300 text-gray-600'
                                                                    }`}
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <span className="text-[10px] font-black opacity-60">CUOTA #{inst.number}</span>
                                                                    <div className="flex gap-1 items-center">
                                                                        {inst.status === 'Pending' && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingInstallment({
                                                                                        saleId: sale.id,
                                                                                        installmentNumber: inst.number,
                                                                                        currentDate: inst.dueDate
                                                                                    });
                                                                                }}
                                                                                className="p-1 hover:bg-black/10 rounded-md transition-colors text-inherit"
                                                                                title="Cambiar fecha de pago"
                                                                            >
                                                                                <Calendar size={12} />
                                                                            </button>
                                                                        )}
                                                                        {inst.status === 'Paid' && <CheckCircle2 size={12} />}
                                                                    </div>
                                                                </div>

                                                                {(selectedInstallments[sale.id] || []).includes(inst.number) ? (
                                                                    <div className="flex items-center gap-1 bg-white/20 p-1 rounded-lg">
                                                                        <span className="text-xs font-bold">S/</span>
                                                                        <input
                                                                            type="number"
                                                                            title="Monto a pagar"
                                                                            value={customAmounts[sale.id]?.[inst.number] ?? inst.amount}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onChange={(e) => handleCustomAmountChange(sale.id, inst.number, e.target.value)}
                                                                            className="w-full bg-transparent border-none outline-none font-black text-white p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-sm font-black">S/ {inst.amount.toFixed(2)}</span>
                                                                )}

                                                                {/* Due date indicator */}
                                                                <span className="text-[10px] opacity-60 font-medium">
                                                                    Vence: {new Date(inst.dueDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                                                                </span>
                                                            </div>
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

            {/* TASK 3: CREDIT DETAIL MODAL */}
            <AnimatePresence>
                {
                    selectedCustomerForDetail && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
                            >
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <div>
                                        <h2 className="text-xl font-black text-gray-900 leading-tight">Detalle de Compras</h2>
                                        <p className="text-xs text-gray-500 font-medium">{selectedCustomerForDetail.name}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedCustomerForDetail(null)}
                                        className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                                        title="Cerrar"
                                    >
                                        <X size={20} className="text-gray-400" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {sales
                                        .filter(s => s.customerId === selectedCustomerForDetail.id)
                                        .map(sale => (
                                            <div key={sale.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">FECHA DE VENTA</p>
                                                        <p className="text-xs font-bold text-gray-800">{new Date(sale.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${sale.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {sale.status === 'Paid' ? 'PAGADO' : 'PENDIENTE'}
                                                    </span>
                                                </div>

                                                <div className="space-y-3">
                                                    {sale.items.map((item, idx) => {
                                                        const product = products.find(p => p.id === item.productId);
                                                        return (
                                                            <div key={idx} className="flex gap-4 items-center bg-white p-3 rounded-xl border border-gray-100">
                                                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                                                                    {product?.images?.[0] ? (
                                                                        <img src={product.images[0]} alt={item.productName} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                                                                            <Package size={20} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-black text-gray-900 leading-tight mb-1">{item.productName}</p>
                                                                    <p className="text-[10px] font-bold text-purple-600">S/ {item.salePrice.toFixed(2)} x {item.quantity}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="pt-3 border-t border-dashed border-gray-200 flex justify-between items-end">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PLAN DE PAGOS</p>
                                                        <p className="text-xs font-bold text-gray-700">{sale.installmentPlan?.numberOfInstallments} cuotas</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOTAL VENTA</p>
                                                        <p className="text-lg font-black text-gray-900">S/ {sale.total.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            {/* TASK 1: DATE EDIT OVERLAY */}
            <AnimatePresence>
                {
                    editingInstallment && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white p-6 rounded-3xl shadow-2xl space-y-4 max-w-xs w-full"
                            >
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Cambiar Fecha</h3>
                                    <button onClick={() => setEditingInstallment(null)} title="Cerrar"><X size={16} className="text-gray-400" /></button>
                                </div>
                                <label htmlFor="installmentDate" className="sr-only">Fecha de Cuota</label>
                                <input
                                    id="installmentDate"
                                    type="date"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-800"
                                    value={editingInstallment.currentDate.split('T')[0]}
                                    onChange={(e) => setEditingInstallment({ ...editingInstallment, currentDate: e.target.value })}
                                />
                                <button
                                    onClick={() => handleUpdateInstallmentDate(editingInstallment.currentDate)}
                                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                                >
                                    Cambiar Fecha
                                </button>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

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
        </div >
    );
}
