
'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Customer, Product, PaymentDetails } from '@/lib/types';
import {
    User, Users, DollarSign, Phone, Search,
    Plus, X, Loader2, Trash2, Package, ChevronLeft,
    Check, ArrowRight, Smartphone, Wallet, Edit2, Tag
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
        addCustomer,
        deleteCustomer,
        deleteSale,
        deletePaymentFromSale,
        updateSaleItemDetail,
        updatePaymentDetail
    } = useData();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // UI States
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [showPaymentAmount, setShowPaymentAmount] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentDetails['method']>('Cash');
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Edit Modal States - More detailed for iPad use
    const [editingItem, setEditingItem] = useState<{
        id: string;
        type: 'product' | 'payment';
        name?: string;
        value: number;
        discount?: number;
        method?: PaymentDetails['method'];
        itemIdx?: number;
        payIdx?: number;
    } | null>(null);

    // New Customer Form (Inline)
    const [newCustForm, setNewCustForm] = useState({ name: '', contact: '' });

    // Ensure selectedCustomer is always fresh from context
    const currentCustomer = useMemo(() => {
        if (!selectedCustomer) return null;
        return customers.find(c => c.id === selectedCustomer.id) || selectedCustomer;
    }, [customers, selectedCustomer]);

    // Total Consolidado (Sum of all debt)
    const totalConsolidado = useMemo(() => {
        return customers.reduce((acc, c) => acc + c.balance, 0);
    }, [customers]);

    // Filtered customers
    const filteredCustomers = useMemo(() => {
        return customers.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => b.balance - a.balance);
    }, [customers, searchTerm]);

    // Ledger items
    const ledgerItems = useMemo(() => {
        if (!currentCustomer) return [];

        interface LedgerItem {
            type: 'product' | 'payment';
            name?: string;
            price?: number;
            discount?: number;
            method?: PaymentDetails['method'];
            amount?: number;
            date: string;
            id: string; // saleId
            itemIdx?: number;
            payIdx?: number;
        }

        const items: LedgerItem[] = [];
        sales.filter(s => s.customerId === currentCustomer.id).forEach(sale => {
            sale.items.forEach((item, idx) => {
                items.push({
                    type: 'product',
                    name: item.productName,
                    price: item.salePrice,
                    discount: sale.discount,
                    date: sale.date,
                    id: sale.id,
                    itemIdx: idx
                });
            });

            if (sale.payments) {
                sale.payments.forEach((payment, idx) => {
                    items.push({
                        type: 'payment',
                        method: payment.method,
                        amount: payment.amount,
                        date: payment.date,
                        id: sale.id,
                        payIdx: idx
                    });
                });
            }
        });

        return items.sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return a.type === 'product' ? -1 : 1;
        });
    }, [currentCustomer, sales]);

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) && p.active && p.stock > 0
        );
    }, [products, productSearchQuery]);

    const handleSelectProduct = async (product: Product) => {
        if (!currentCustomer) return;
        setIsProcessing(true);
        try {
            await registerProductToCustomer(currentCustomer.id, product);
            setShowProductSearch(false);
            setProductSearchQuery('');
        } catch (err) { console.error(err); }
        finally { setIsProcessing(false); }
    };

    const handleAddPayment = async () => {
        if (!currentCustomer || !paymentAmount || isNaN(parseFloat(paymentAmount))) return;
        setIsProcessing(true);
        try {
            await addPaymentToCustomer(currentCustomer.id, parseFloat(paymentAmount), paymentMethod);
            setShowPaymentAmount(false);
            setPaymentAmount('');
            setShowPlusMenu(false);
        } catch (err) { console.error(err); }
        finally { setIsProcessing(false); }
    };

    const handleFinalCreate = async () => {
        if (!newCustForm.name.trim() || newCustForm.contact.length !== 9) {
            alert("Por favor ingresa un nombre y un celular de 9 dígitos");
            return;
        }
        setIsProcessing(true);
        try {
            const id = await addCustomer({
                id: '',
                name: newCustForm.name.trim(),
                contact: newCustForm.contact,
                balance: 0,
                history: []
            });
            const created = customers.find(c => c.id === id) || { id, name: newCustForm.name, contact: newCustForm.contact, balance: 0, history: [] };
            setSelectedCustomer(created);
            setIsCreating(false);
            setNewCustForm({ name: '', contact: '' });
        } catch (err) { console.error(err); }
        finally { setIsProcessing(false); }
    };

    const handleDeleteItem = async (item: any) => {
        if (!window.confirm("¿Estás seguro de eliminar este registro?")) return;
        setIsProcessing(true);
        try {
            if (item.type === 'product') {
                await deleteSale(item.id);
            } else {
                await deletePaymentFromSale(item.id, item.payIdx);
            }
        } catch (err) { console.error(err); }
        finally { setIsProcessing(false); }
    };

    const handleUpdateItemValue = async () => {
        if (!editingItem) return;
        setIsProcessing(true);
        try {
            if (editingItem.type === 'product') {
                await updateSaleItemDetail(editingItem.id, editingItem.itemIdx!, {
                    productName: editingItem.name,
                    salePrice: editingItem.value,
                    discount: editingItem.discount
                });
            } else {
                await updatePaymentDetail(editingItem.id, editingItem.payIdx!, {
                    method: editingItem.method,
                    amount: editingItem.value
                });
            }
            setEditingItem(null);
        } catch (err) { console.error(err); }
        finally { setIsProcessing(false); }
    };

    return (
        <div className="min-h-screen">
            <AnimatePresence mode="wait">
                {(!currentCustomer && !isCreating) ? (
                    <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                                    <Users className="text-purple-600" size={40} /> Clientes
                                </h1>
                                <p className="text-gray-500 font-medium mt-1">Gestión de cuentas y créditos.</p>
                            </div>
                            <button onClick={() => setIsCreating(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-3xl font-black shadow-xl shadow-purple-200 flex items-center gap-3 active:scale-95 transition-all">
                                <Plus size={24} strokeWidth={3} /> NUEVO CLIENTE
                            </button>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input type="text" placeholder="Buscar cliente por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-5 bg-white border-2 border-transparent focus:border-purple-500 rounded-[2rem] shadow-xl shadow-purple-100 outline-none transition-all text-lg font-medium" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCustomers.map((customer) => (
                                <motion.div key={customer.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -5 }} onClick={() => setSelectedCustomer(customer)} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100 cursor-pointer group hover:border-purple-200 transition-all flex flex-col gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center text-2xl font-black text-purple-600">{customer.name.charAt(0)}</div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 uppercase">{customer.name}</h3>
                                            <p className="text-gray-400 font-bold flex items-center gap-1.5 mt-1"><Phone size={14} /> {customer.contact}</p>
                                        </div>
                                        <ArrowRight className="text-gray-300 group-hover:text-purple-400" />
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-5 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Pendiente</p>
                                            <p className={clsx("text-2xl font-black", customer.balance > 0 ? "text-red-500" : "text-green-500")}>S/ {customer.balance.toFixed(2)}</p>
                                        </div>
                                        <div className={clsx("p-3 rounded-xl", customer.balance > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}><DollarSign size={20} /></div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col gap-8 pb-10">
                        {/* Header Detail */}
                        <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                            <button onClick={() => { setSelectedCustomer(null); setIsCreating(false); }} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-xl font-bold text-gray-500">
                                <ChevronLeft size={20} /> Volver a Clientes
                            </button>
                            {!isCreating && currentCustomer && (
                                <button onClick={() => { if (window.confirm(`¿Eliminar a "${currentCustomer.name}"?`)) { deleteCustomer(currentCustomer.id); setSelectedCustomer(null); } }} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                            )}
                        </div>

                        {/* Customer Dashboard Look - Color adjusted to Slate 900 for premium feel */}
                        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            <div className="lg:col-span-8 bg-[#0f172a] rounded-[3rem] p-10 shadow-2xl border border-slate-800 flex flex-col min-h-[600px] relative overflow-hidden">

                                {/* Header / Name Area */}
                                <div className="flex justify-center mb-12">
                                    {isCreating ? (
                                        <div className="flex flex-col gap-4 items-center w-full max-w-md">
                                            <input autoFocus type="text" placeholder="NOMBRE DEL CLIENTE" value={newCustForm.name} onChange={e => setNewCustForm({ ...newCustForm, name: e.target.value })} className="bg-transparent border border-slate-700 rounded-lg px-6 py-2 text-white text-center text-xl font-medium uppercase outline-none focus:border-blue-500 w-full" />
                                            <input type="text" maxLength={9} placeholder="CELULAR (9 DÍGITOS)" value={newCustForm.contact} onChange={e => setNewCustForm({ ...newCustForm, contact: e.target.value.replace(/\D/g, '') })} className="bg-transparent border border-slate-700 rounded-lg px-6 py-2 text-white text-center text-sm outline-none focus:border-blue-500 w-full" />
                                            <button onClick={handleFinalCreate} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 active:scale-95 transition-all mt-2">CONFIRMAR CREAR</button>
                                        </div>
                                    ) : (
                                        <div className="px-10 py-3 border border-slate-700 rounded-lg">
                                            <h2 className="text-white text-2xl font-black tracking-tight uppercase">{currentCustomer?.name}</h2>
                                        </div>
                                    )}
                                </div>

                                {/* Plus Button */}
                                {!isCreating && (
                                    <button onClick={() => setShowPlusMenu(!showPlusMenu)} className="absolute top-10 right-10 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-all z-20">
                                        <Plus size={30} strokeWidth={3} />
                                    </button>
                                )}

                                {/* Ledger List */}
                                <div className="flex-1 space-y-4 max-h-[500px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-700">
                                    {(isCreating || !ledgerItems.length) ? (
                                        <div className="h-full flex items-center justify-center flex-col text-slate-500 gap-4 mt-20 opacity-30 italic">
                                            <Package size={48} />
                                            <p className="font-bold">Agregue productos o pagos haciendo clic en el (+)</p>
                                        </div>
                                    ) : (
                                        ledgerItems.map((item) => (
                                            <div key={item.id + (item.payIdx ?? item.itemIdx)} className="flex gap-3 items-center">
                                                <div className="flex-1 flex gap-3">
                                                    <div className="bg-slate-800/40 border border-slate-700 px-6 py-4 rounded-lg flex-1 min-w-0 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <p className="text-white text-sm font-medium truncate">
                                                                {item.type === 'product' ? item.name : `PAGO CON ${item.method?.toUpperCase()} (${new Date(item.date).toLocaleDateString('es-PE')})`}
                                                            </p>
                                                            {item.type === 'product' && item.discount && item.discount > 0 && (
                                                                <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                                                    <Tag size={10} /> Desc. S/ {item.discount.toFixed(2)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setEditingItem({
                                                                    id: item.id,
                                                                    type: item.type,
                                                                    name: item.name,
                                                                    value: item.type === 'product' ? item.price! : item.amount!,
                                                                    discount: item.discount,
                                                                    method: item.method,
                                                                    itemIdx: item.itemIdx,
                                                                    payIdx: item.payIdx
                                                                })}
                                                                className="p-1.5 bg-slate-700 text-slate-300 rounded-md hover:text-white"
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteItem(item)}
                                                                className="p-1.5 bg-slate-700 text-red-500 rounded-md hover:text-red-400"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-800/40 border border-slate-700 px-6 py-4 rounded-lg w-40 flex items-center justify-center">
                                                        <p className="text-white text-md font-black">
                                                            S/ {item.type === 'product' ? item.price?.toFixed(2) : item.amount?.toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Suma Total Deuda */}
                                <div className="mt-12 flex gap-4">
                                    <div className="bg-slate-800/60 border border-slate-700 px-8 py-5 rounded-lg flex-1">
                                        <p className="text-white font-bold tracking-widest text-sm uppercase">SUMA TOTAL DE DEUDA</p>
                                    </div>
                                    <div className="bg-slate-800/60 border border-slate-700 px-8 py-5 rounded-lg w-48 flex items-center justify-center">
                                        <p className="text-white font-black text-xl">S/ {currentCustomer?.balance.toFixed(2) || '0.00'}</p>
                                    </div>
                                </div>

                                {/* Plus Menu */}
                                <AnimatePresence>
                                    {showPlusMenu && (
                                        <motion.div initial={{ opacity: 0, x: 20, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.9 }} className="absolute top-24 right-10 w-64 bg-emerald-900 rounded-[2rem] border-2 border-emerald-700 p-8 shadow-2xl z-30 space-y-6">
                                            <button onClick={() => { setShowProductSearch(true); setShowPlusMenu(false); }} className="w-full bg-white text-gray-900 py-3 rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-all uppercase">Nuevo Producto</button>
                                            <div className="space-y-3">
                                                <p className="text-white text-xs font-black uppercase text-center tracking-widest opacity-60">Nuevo pago</p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {(['Yape', 'Plin', 'Cash', 'Transfer'] as const).map(method => (
                                                        <button key={method} onClick={() => { setPaymentMethod(method); setShowPaymentAmount(true); setShowPlusMenu(false); }} className="w-full border border-white/20 text-white py-2 rounded-lg text-xs hover:bg-white/10 transition-all font-medium uppercase">
                                                            {method === 'Cash' ? 'efectivo' : method === 'Transfer' ? 'transferencia' : method.toLowerCase()}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Right Side Stats */}
                            <div className="lg:col-span-4 space-y-6">
                                {currentCustomer && (
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600"><User size={24} /></div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">{currentCustomer.name}</h3>
                                                <p className="text-sm text-gray-400 font-medium">{currentCustomer.contact}</p>
                                            </div>
                                        </div>
                                        <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
                                            <p className="text-gray-400 font-bold text-sm">Estado de Cuenta</p>
                                            <span className={clsx("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest", currentCustomer.balance > 0 ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500")}>
                                                {currentCustomer.balance > 0 ? "Con Deuda" : "Al día"}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
                                    <p className="font-black text-[10px] uppercase tracking-widest opacity-70 mb-2">{isCreating ? "TOTAL DEUDA GLOBAL" : "TOTAL CONSOLIDADO"}</p>
                                    <h4 className="text-5xl font-black mb-10">S/ {(isCreating ? totalConsolidado : (currentCustomer?.balance ?? 0)).toFixed(2)}</h4>
                                    {!isCreating && currentCustomer && (
                                        <button onClick={() => {
                                            const productsList = ledgerItems.filter(i => i.type === 'product').map(i => `• ${i.name}: S/ ${i.price?.toFixed(2)} ${i.discount ? `(Desc: S/ ${i.discount.toFixed(2)})` : ''}`).join('\n');
                                            const paymentsList = ledgerItems.filter(i => i.type === 'payment').map(i => `✓ Pago (${i.method?.toLowerCase()}): S/ ${i.amount?.toFixed(2)} [${new Date(i.date).toLocaleDateString()}]`).join('\n');
                                            const msg = `Hola *${currentCustomer.name}*, este es tu resumen de cuenta:\n\n*PRODUCTOS:*\n${productsList || 'Ninguno'}\n\n*PAGOS:*\n${paymentsList || 'Ninguno'}\n\n*SALDO PENDIENTE:* S/ ${currentCustomer.balance.toFixed(2)}`;
                                            window.open(`https://wa.me/51${currentCustomer.contact}?text=${encodeURIComponent(msg)}`, '_blank');
                                        }} className="w-full py-5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl font-bold flex items-center justify-center gap-3 transition-all">
                                            <Smartphone size={18} /> Recordar por WhatsApp
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <AnimatePresence>
                {/* Product Search */}
                {showProductSearch && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                <h2 className="text-2xl font-black text-gray-900 uppercase">Buscar Producto</h2>
                                <button onClick={() => setShowProductSearch(false)} className="p-2 hover:bg-white rounded-xl text-gray-400"><X /></button>
                            </div>
                            <div className="p-8 flex flex-col gap-6">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input autoFocus type="text" placeholder="Nombre del producto..." value={productSearchQuery} onChange={(e) => setProductSearchQuery(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold placeholder:font-normal" />
                                </div>
                                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
                                    {filteredProducts.map(product => (
                                        <button key={product.id} onClick={() => handleSelectProduct(product)} className="w-full p-4 hover:bg-purple-50 rounded-2xl border border-gray-100 flex justify-between items-center group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden relative"> {product.images?.[0] ? <Image src={product.images[0]} alt="" fill className="object-cover" /> : <Package className="m-auto text-gray-300" />} </div>
                                                <div className="text-left font-bold uppercase text-gray-900">{product.name}</div>
                                            </div>
                                            <p className="font-black text-purple-600">S/ {product.salePrice.toFixed(2)}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Confirm Amount Modal */}
                {showPaymentAmount && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-xs p-8 space-y-8 shadow-2xl">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-4"><Wallet size={32} /></div>
                                <h3 className="text-xl font-black text-gray-900 uppercase">Registrar Pago</h3>
                                <p className="text-xs text-purple-600 font-black uppercase tracking-widest">{paymentMethod === 'Cash' ? 'efectivo' : paymentMethod.toLowerCase()}</p>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl flex items-center px-4 py-4 text-2xl font-black"><span className="text-gray-400 mr-2">S/</span><input autoFocus type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full bg-transparent outline-none text-gray-900" /></div>
                                <button onClick={handleAddPayment} disabled={!paymentAmount || isProcessing} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black flex items-center justify-center gap-3"> {isProcessing ? <Loader2 className="animate-spin" /> : <><Check size={20} /> CONFIRMAR</>} </button>
                                <button onClick={() => setShowPaymentAmount(false)} className="w-full py-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ADVANCED Editing Modal (iPad friendly) */}
                {editingItem && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 space-y-6 shadow-2xl">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-2"><Edit2 size={32} /></div>
                                <h3 className="text-xl font-black text-gray-900 uppercase">Editar Registro</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">{editingItem.type === 'product' ? 'Producto / Venta' : 'Pago'}</p>
                            </div>

                            <div className="space-y-5">
                                {editingItem.type === 'product' ? (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre</label>
                                            <input type="text" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold uppercase text-sm outline-none focus:border-blue-400" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Precio S/</label>
                                                <input type="number" value={editingItem.value} onChange={e => setEditingItem({ ...editingItem, value: parseFloat(e.target.value) })} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-blue-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-red-400 ml-1">Descuento S/</label>
                                                <input type="number" value={editingItem.discount || 0} onChange={e => setEditingItem({ ...editingItem, discount: parseFloat(e.target.value) })} className="w-full px-5 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl font-bold text-sm outline-none focus:border-red-400" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Método de Pago</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(['Yape', 'Plin', 'Cash', 'Transfer'] as const).map(m => (
                                                    <button key={m} onClick={() => setEditingItem({ ...editingItem, method: m })} className={clsx("py-2 px-3 rounded-lg border text-[10px] font-black transition-all", editingItem.method === m ? "bg-blue-600 border-blue-600 text-white" : "border-slate-100 bg-slate-50 text-slate-400")}>
                                                        {m === 'Cash' ? 'EFECTIVO' : m.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Monto Pagado S/</label>
                                            <input type="number" value={editingItem.value} onChange={e => setEditingItem({ ...editingItem, value: parseFloat(e.target.value) })} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-blue-400" />
                                        </div>
                                    </>
                                )}

                                <div className="pt-2 flex flex-col gap-2">
                                    <button onClick={handleUpdateItemValue} disabled={isProcessing} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg shadow-blue-100"> {isProcessing ? <Loader2 className="animate-spin" /> : <><Check size={20} /> GUARDAR CAMBIOS</>} </button>
                                    <button onClick={() => setEditingItem(null)} className="w-full py-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .scrollbar-thin::-webkit-scrollbar { width: 6px; }
                .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            `}</style>
        </div>
    );
}
