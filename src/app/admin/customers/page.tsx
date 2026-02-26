
'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Customer, Product, PaymentDetails } from '@/lib/types';
import {
    User, Users, DollarSign, Phone, Search,
    Plus, X, Loader2, Trash2, Package, ChevronLeft,
    Check, ArrowRight, Smartphone, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import clsx from 'clsx';

export default function CustomersPage() {
    const {
        products,
        customers,
        sales,
        registerProductToCustomer,
        addPaymentToCustomer,
        deleteCustomer
    } = useData();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [showPaymentAmount, setShowPaymentAmount] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentDetails['method']>('Cash');
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Filtered customers for the initial list
    const filteredCustomers = useMemo(() => {
        return customers.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => b.balance - a.balance);
    }, [customers, searchTerm]);

    // Ledger items for the selected customer
    const ledgerItems = useMemo(() => {
        if (!selectedCustomer) return [];

        interface LedgerItem {
            type: 'product' | 'payment';
            name?: string;
            price?: number;
            method?: PaymentDetails['method'];
            amount?: number;
            date: string;
            id: string;
        }

        const items: LedgerItem[] = [];

        // Add products from sales
        sales.filter(s => s.customerId === selectedCustomer.id).forEach(sale => {
            sale.items.forEach(item => {
                items.push({
                    type: 'product',
                    name: item.productName,
                    price: item.salePrice,
                    date: sale.date,
                    id: `${sale.id}-${item.productId}`
                });
            });

            // Add payments from sales
            if (sale.payments) {
                sale.payments.forEach((payment, idx) => {
                    items.push({
                        type: 'payment',
                        method: payment.method,
                        amount: payment.amount,
                        date: payment.date,
                        id: `${sale.id}-pay-${idx}`
                    });
                });
            }
        });

        // Sort by date (descending to show latest at top? No, image looks like a chronological list)
        return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [selectedCustomer, sales]);

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) && p.active && p.stock > 0
        ).slice(0, 10);
    }, [products, productSearchQuery]);

    const handleSelectProduct = async (product: Product) => {
        if (!selectedCustomer) return;
        setIsProcessing(true);
        try {
            await registerProductToCustomer(selectedCustomer.id, product);
            setShowProductSearch(false);
            setProductSearchQuery('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddPayment = async () => {
        if (!selectedCustomer || !paymentAmount || isNaN(parseFloat(paymentAmount))) return;
        setIsProcessing(true);
        try {
            await addPaymentToCustomer(selectedCustomer.id, parseFloat(paymentAmount), paymentMethod);
            setShowPaymentAmount(false);
            setPaymentAmount('');
            setShowPlusMenu(false);
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteCustomer = async (id: string, name: string) => {
        if (window.confirm(`¿Eliminar a "${name}"? Se perderá todo su historial.`)) {
            await deleteCustomer(id);
            if (selectedCustomer?.id === id) setSelectedCustomer(null);
        }
    };

    if (!selectedCustomer) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                            <Users className="text-purple-600" size={40} />
                            Clientes
                        </h1>
                        <p className="text-gray-500 font-medium mt-1">Selecciona un cliente para gestionar su cuenta.</p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar cliente por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-5 bg-white border-2 border-transparent focus:border-purple-500 rounded-[2rem] shadow-xl shadow-purple-100 outline-none transition-all text-lg font-medium"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCustomers.map((customer) => (
                        <motion.div
                            key={customer.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ y: -5 }}
                            onClick={() => setSelectedCustomer(customer)}
                            className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100 cursor-pointer group hover:border-purple-200 transition-all flex flex-col gap-6"
                        >
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center text-2xl font-black text-purple-600">
                                    {customer.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors uppercase">{customer.name}</h3>
                                    <p className="text-gray-400 font-bold flex items-center gap-1.5 mt-1">
                                        <Phone size={14} /> {customer.contact}
                                    </p>
                                </div>
                                <ArrowRight className="text-gray-300 group-hover:text-purple-400 transition-colors" />
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-5 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Pendiente</p>
                                    <p className={clsx(
                                        "text-2xl font-black",
                                        customer.balance > 0 ? "text-red-500" : "text-green-500"
                                    )}>
                                        S/ {customer.balance.toFixed(2)}
                                    </p>
                                </div>
                                <div className={clsx(
                                    "p-3 rounded-xl",
                                    customer.balance > 0 ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500"
                                )}>
                                    <DollarSign size={20} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex flex-col gap-8 animate-in fade-in slide-in-from-right-10 duration-500">
            {/* Header / Back */}
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                <button
                    onClick={() => setSelectedCustomer(null)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-xl transition-all font-bold text-gray-500"
                >
                    <ChevronLeft size={20} /> Volver a Clientes
                </button>
                <button
                    onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.name)}
                    className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Eliminar Cliente"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* MAIN CARD (As shown in the image) */}
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Visual Representation of the UI requested */}
                <div className="lg:col-span-8 bg-[#1a1a1a] rounded-[3rem] p-10 shadow-2xl border border-gray-800 flex flex-col min-h-[600px] relative overflow-hidden">

                    {/* Customer Name Title */}
                    <div className="flex justify-center mb-12">
                        <div className="px-8 py-3 border border-gray-600 rounded-lg">
                            <h2 className="text-white text-xl font-medium tracking-tight uppercase whitespace-nowrap">
                                {selectedCustomer.name}
                            </h2>
                        </div>
                    </div>

                    {/* Plus Button inside the card? No, usually floating near it or inside. 
                        In the image it's near the Title. */}
                    <button
                        onClick={() => setShowPlusMenu(!showPlusMenu)}
                        className="absolute top-10 right-10 w-12 h-12 bg-[#2d5af0] rounded-lg flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-all z-20"
                        title="Opciones"
                    >
                        <Plus size={30} strokeWidth={3} />
                    </button>

                    {/* Ledger List */}
                    <div className="flex-1 space-y-4 max-h-[500px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-700">
                        {ledgerItems.length === 0 ? (
                            <div className="h-full flex flex-center flex-col text-gray-600 gap-4 mt-20 opacity-30 italic">
                                <Package size={48} className="mx-auto" />
                                <p className="text-center font-bold">Sin actividad registrada</p>
                            </div>
                        ) : (
                            ledgerItems.map((item) => (
                                <div key={item.id} className="flex gap-4 items-center">
                                    <div className="flex-1 flex gap-4">
                                        <div className="bg-[#2a2a2a] border border-gray-700 px-6 py-3 rounded-lg flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">
                                                {item.type === 'product' ? item.name : `PAGO CON ${item.method?.toUpperCase() || '-'} (${new Date(item.date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })})`}
                                            </p>
                                        </div>
                                        <div className="bg-[#2a2a2a] border border-gray-700 px-6 py-3 rounded-lg w-40 flex items-center justify-center">
                                            <p className="text-[#a0a0a0] text-sm font-bold uppercase">
                                                {item.type === 'product' ? `S/ ${item.price?.toFixed(2) || '0.00'}` : `(efectivo) S/ ${item.amount?.toFixed(2) || '0.00'}`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Total Debt Footer */}
                    <div className="mt-12 flex gap-4">
                        <div className="bg-[#2a2a2a] border border-gray-700 px-8 py-4 rounded-lg flex-1">
                            <p className="text-white font-bold tracking-widest text-sm uppercase">SUMA TOTAL DE DEUDA</p>
                        </div>
                        <div className="bg-[#2a2a2a] border border-gray-700 px-8 py-4 rounded-lg w-48 flex items-center justify-center">
                            <p className="text-white font-black text-lg">S/ {selectedCustomer.balance.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Overlay Plus Menu (The Green Box from image) */}
                    <AnimatePresence>
                        {showPlusMenu && (
                            <motion.div
                                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                className="absolute top-24 right-10 w-64 bg-[#1a441a] rounded-[2rem] border-2 border-[#2e7d32] p-8 shadow-2xl z-30 space-y-6"
                            >
                                <button
                                    onClick={() => { setShowProductSearch(true); setShowPlusMenu(false); }}
                                    className="w-full bg-white text-gray-900 py-3 px-4 rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-all text-center"
                                >
                                    Nuevo Producto
                                </button>

                                <div className="space-y-3">
                                    <p className="text-white text-xs font-black uppercase text-center tracking-widest opacity-60">Nuevo pago</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(['Yape', 'Plin', 'Cash', 'Transfer'] as const).map(method => (
                                            <button
                                                key={method}
                                                onClick={() => {
                                                    setPaymentMethod(method === 'Cash' ? 'Cash' : method);
                                                    setShowPaymentAmount(true);
                                                    setShowPlusMenu(false);
                                                }}
                                                className="w-full border border-white/20 text-white py-2 px-4 rounded-lg text-sm hover:bg-white/10 transition-all font-medium"
                                            >
                                                {method === 'Cash' ? 'Efectivo' : method}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Side Helper / Stats */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                                <User size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{selectedCustomer.name}</h3>
                                <p className="text-sm text-gray-400 font-medium">{selectedCustomer.contact}</p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
                            <p className="text-gray-400 font-bold text-sm">Estado de Cuenta</p>
                            <span className={clsx(
                                "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest",
                                selectedCustomer.balance > 0 ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500"
                            )}>
                                {selectedCustomer.balance > 0 ? "Con Deuda" : "Al día"}
                            </span>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-purple-200">
                        <p className="font-black text-[10px] uppercase tracking-widest opacity-70 mb-2">Total Consolidado</p>
                        <h4 className="text-4xl font-black mb-6">S/ {selectedCustomer.balance.toFixed(2)}</h4>
                        <button
                            onClick={() => {
                                const msg = `Hola ${selectedCustomer.name}, tu saldo en MivisShopping es S/ ${selectedCustomer.balance.toFixed(2)}.`;
                                window.open(`https://wa.me/51${selectedCustomer.contact.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            className="w-full py-4 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl font-bold flex items-center justify-center gap-3 transition-all"
                        >
                            <Smartphone size={18} /> Recordar por WhatsApp
                        </button>
                    </div>
                </div>
            </div>

            {/* MODALS */}

            {/* Product Search Modal */}
            <AnimatePresence>
                {showProductSearch && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
                        >
                            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                <h2 className="text-2xl font-black text-gray-900">Buscar Producto</h2>
                                <button onClick={() => setShowProductSearch(false)} className="p-2 hover:bg-white rounded-xl text-gray-400" title="Cerrar"><X /></button>
                            </div>

                            <div className="p-8 flex flex-col gap-6">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Nombre del producto..."
                                        value={productSearchQuery}
                                        onChange={(e) => setProductSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                                    />
                                </div>

                                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
                                    {filteredProducts.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleSelectProduct(product)}
                                            className="w-full p-4 hover:bg-purple-50 rounded-2xl border border-gray-100 transition-all text-left flex justify-between items-center group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden relative">
                                                    {product.images?.[0] ? (
                                                        <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Package className="text-gray-300" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors uppercase">{product.name}</p>
                                                    <p className="text-xs text-gray-400 font-bold">STOCK: {product.stock}</p>
                                                </div>
                                            </div>
                                            <p className="font-black text-purple-600">S/ {product.salePrice.toFixed(2)}</p>
                                        </button>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                        <p className="text-center py-8 text-gray-400 font-medium italic">No se encontraron productos.</p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Payment Amount Modal */}
            <AnimatePresence>
                {showPaymentAmount && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-xs overflow-hidden shadow-2xl p-8 space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                    <Wallet size={32} />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 uppercase">Registrar Pago</h3>
                                <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">Método: <span className="text-purple-600">{paymentMethod === 'Cash' ? 'Efectivo' : paymentMethod}</span></p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl flex items-center px-4 py-4 focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                                    <span className="text-2xl font-black text-gray-400 mr-2">S/</span>
                                    <input
                                        autoFocus
                                        type="number"
                                        placeholder="0.00"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="w-full bg-transparent outline-none text-2xl font-black text-gray-900"
                                    />
                                </div>

                                <button
                                    onClick={handleAddPayment}
                                    disabled={!paymentAmount || isProcessing}
                                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-black active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" /> : <><Check /> CONFIRMAR</>}
                                </button>
                                <button
                                    onClick={() => setShowPaymentAmount(false)}
                                    className="w-full py-2 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom scrollbar styles */}
            <style jsx>{`
                .scrollbar-thin::-webkit-scrollbar {
                    width: 6px;
                }
                .scrollbar-thin::-webkit-scrollbar-track {
                    background: #1a1a1a;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: #333;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
