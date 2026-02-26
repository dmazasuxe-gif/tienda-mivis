
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
        date?: string;
        itemIdx?: number;
        payIdx?: number;
    } | null>(null);

    // Specific Discounting State
    const [discountingItem, setDiscountingItem] = useState<{
        id: string;
        itemIdx: number;
        name: string;
        price: number;
        discount: number;
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
                    amount: editingItem.value,
                    date: editingItem.date
                });
            }
            setEditingItem(null);
        } catch (err) { console.error(err); }
        finally { setIsProcessing(false); }
    };

    const handleApplyDiscount = async () => {
        if (!discountingItem) return;
        setIsProcessing(true);
        try {
            await updateSaleItemDetail(discountingItem.id, discountingItem.itemIdx, {
                discount: discountingItem.discount
            });
            setDiscountingItem(null);
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
                                    <Users className="text-violet-600" size={40} /> Clientes
                                </h1>
                                <p className="text-gray-500 font-medium mt-1">Gestión de cuentas y créditos.</p>
                            </div>
                            <button onClick={() => setIsCreating(true)} className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-3xl font-black shadow-xl shadow-violet-200 flex items-center gap-3 active:scale-95 transition-all">
                                <Plus size={24} strokeWidth={3} /> NUEVO CLIENTE
                            </button>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input type="text" placeholder="Buscar cliente por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-5 bg-white border-2 border-transparent focus:border-violet-500 rounded-[2rem] shadow-xl shadow-violet-100 outline-none transition-all text-lg font-medium" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCustomers.map((customer) => (
                                <motion.div key={customer.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -5 }} onClick={() => setSelectedCustomer(customer)} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100 cursor-pointer group hover:border-violet-200 transition-all flex flex-col gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-fuchsia-100 rounded-3xl flex items-center justify-center text-2xl font-black text-violet-600">{customer.name.charAt(0)}</div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-violet-600 uppercase">{customer.name}</h3>
                                            <p className="text-gray-400 font-bold flex items-center gap-1.5 mt-1"><Phone size={14} /> {customer.contact}</p>
                                        </div>
                                        <ArrowRight className="text-gray-300 group-hover:text-violet-400" />
                                    </div>
                                    <div className="bg-gray-50 rounded-2xl p-5 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Pendiente</p>
                                            <p className={clsx("text-2xl font-black", customer.balance > 0 ? "text-rose-500" : "text-emerald-500")}>S/ {customer.balance.toFixed(2)}</p>
                                        </div>
                                        <div className={clsx("p-3 rounded-xl", customer.balance > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}><DollarSign size={20} /></div>
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
                                <button onClick={() => { if (window.confirm(`¿Eliminar a "${currentCustomer.name}"?`)) { deleteCustomer(currentCustomer.id); setSelectedCustomer(null); } }} className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                            )}
                        </div>

                        {/* Customer Dashboard Look - Color adjusted to Vibrant Violet per user image */}
                        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            <div className="lg:col-span-8 bg-[#6366f1] rounded-[3rem] p-10 shadow-2xl border border-indigo-400 flex flex-col min-h-[600px] relative overflow-hidden">

                                {/* Header / Name Area */}
                                <div className="flex justify-center mb-12">
                                    {isCreating ? (
                                        <div className="flex flex-col gap-4 items-center w-full max-w-md">
                                            <input autoFocus type="text" placeholder="NOMBRE DEL CLIENTE" value={newCustForm.name} onChange={e => setNewCustForm({ ...newCustForm, name: e.target.value })} className="bg-white/10 border border-white/30 rounded-lg px-6 py-2 text-white text-center text-xl font-medium uppercase outline-none focus:border-white w-full placeholder:text-white/40" />
                                            <input type="text" maxLength={9} placeholder="CELULAR (9 DÍGITOS)" value={newCustForm.contact} onChange={e => setNewCustForm({ ...newCustForm, contact: e.target.value.replace(/\D/g, '') })} className="bg-white/10 border border-white/30 rounded-lg px-6 py-2 text-white text-center text-sm outline-none focus:border-white w-full placeholder:text-white/40" />
                                            <button onClick={handleFinalCreate} className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-black hover:bg-gray-100 active:scale-95 transition-all mt-2">CONFIRMAR CREAR</button>
                                        </div>
                                    ) : (
                                        <div className="px-10 py-3 border-2 border-white/40 rounded-[2rem] bg-white/10 backdrop-blur-md">
                                            <h2 className="text-white text-2xl font-black tracking-widest uppercase">{currentCustomer?.name}</h2>
                                        </div>
                                    )}
                                </div>

                                {/* Plus Button */}
                                {!isCreating && (
                                    <button onClick={() => setShowPlusMenu(!showPlusMenu)} className="absolute top-10 right-10 w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all z-20">
                                        <Plus size={30} strokeWidth={3} />
                                    </button>
                                )}

                                {/* Ledger List */}
                                <div className="flex-1 space-y-4 max-h-[510px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/20">
                                    {(isCreating || !ledgerItems.length) ? (
                                        <div className="h-full flex items-center justify-center flex-col text-white gap-4 mt-20 opacity-40 italic">
                                            <Package size={48} />
                                            <p className="font-bold">Agregue productos o pagos haciendo clic en el (+)</p>
                                        </div>
                                    ) : (
                                        ledgerItems.map((item) => (
                                            <div key={item.id + (item.payIdx ?? item.itemIdx)} className="flex gap-3 items-center">
                                                <div className="flex-1 flex gap-3">
                                                    <div className="bg-white/10 border border-white/20 px-6 py-4 rounded-2xl flex-1 min-w-0 flex items-center justify-between backdrop-blur-sm">
                                                        <div className="flex items-center gap-3">
                                                            <p className="text-white text-sm font-black truncate tracking-wide uppercase">
                                                                {item.type === 'product' ? item.name : `PAGO CON ${item.method?.toUpperCase()} (${new Date(item.date).toLocaleDateString('es-PE')})`}
                                                            </p>
                                                            {item.type === 'product' && item.discount && item.discount > 0 && (
                                                                <span className="bg-rose-500 text-white px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm">
                                                                    <Tag size={10} /> Desc. S/ {item.discount.toFixed(2)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-1.5">
                                                            {/* New Direct Discount Button for Products */}
                                                            {item.type === 'product' && (
                                                                <button
                                                                    onClick={() => setDiscountingItem({
                                                                        id: item.id,
                                                                        itemIdx: item.itemIdx!,
                                                                        name: item.name!,
                                                                        price: item.price!,
                                                                        discount: item.discount || 0
                                                                    })}
                                                                    className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 shadow-md flex items-center justify-center transition-all"
                                                                >
                                                                    <Tag size={14} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setEditingItem({
                                                                    id: item.id,
                                                                    type: item.type,
                                                                    name: item.name,
                                                                    value: item.type === 'product' ? item.price! : item.amount!,
                                                                    discount: item.discount,
                                                                    method: item.method,
                                                                    date: item.date,
                                                                    itemIdx: item.itemIdx,
                                                                    payIdx: item.payIdx
                                                                })}
                                                                className="p-2 bg-white/20 text-white rounded-xl hover:bg-white/30 backdrop-blur-md transition-all flex items-center justify-center"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteItem(item)}
                                                                className="p-2 bg-rose-100 text-rose-600 rounded-xl hover:bg-rose-200 transition-all flex items-center justify-center"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white text-indigo-600 px-6 py-4 rounded-2xl w-40 flex items-center justify-center shadow-lg">
                                                        <p className="text-lg font-black tracking-tighter">
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
                                    <div className="bg-white/20 border border-white/40 px-8 py-5 rounded-[2rem] flex-1 backdrop-blur-md">
                                        <p className="text-white font-black tracking-widest text-sm uppercase text-center">SUMA TOTAL DE DEUDA</p>
                                    </div>
                                    <div className="bg-white text-indigo-600 px-8 py-5 rounded-[2rem] w-48 flex items-center justify-center shadow-xl">
                                        <p className="font-black text-2xl tracking-tighter">S/ {currentCustomer?.balance.toFixed(2) || '0.00'}</p>
                                    </div>
                                </div>

                                {/* Plus Menu */}
                                <AnimatePresence>
                                    {showPlusMenu && (
                                        <motion.div initial={{ opacity: 0, x: 20, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.9 }} className="absolute top-24 right-10 w-64 bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] border border-white/20 p-8 shadow-2xl z-30 space-y-6">
                                            <button onClick={() => { setShowProductSearch(true); setShowPlusMenu(false); }} className="w-full bg-violet-600 text-white py-4 rounded-2xl font-black text-xs hover:scale-105 active:scale-95 transition-all uppercase shadow-lg shadow-violet-500/20">Registrar Producto</button>
                                            <div className="space-y-3">
                                                <p className="text-white text-[10px] font-black uppercase text-center tracking-[0.2em] opacity-40">Registrar Pago</p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {(['Yape', 'Plin', 'Cash', 'Transfer'] as const).map(method => (
                                                        <button key={method} onClick={() => { setPaymentMethod(method); setShowPaymentAmount(true); setShowPlusMenu(false); }} className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-xl text-[10px] font-black hover:bg-white/10 transition-all uppercase tracking-widest">
                                                            {method === 'Cash' ? 'efectivo' : method === 'Transfer' ? 'transfer' : method}
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
                                    <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-2xl space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-violet-100 rounded-[1.5rem] flex items-center justify-center text-violet-600 text-xl font-black">{currentCustomer.name.charAt(0)}</div>
                                            <div>
                                                <h3 className="font-black text-gray-900 uppercase tracking-tight text-lg">{currentCustomer.name}</h3>
                                                <p className="text-sm text-gray-400 font-bold flex items-center gap-2"><Phone size={14} /> {currentCustomer.contact}</p>
                                            </div>
                                        </div>
                                        <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
                                            <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Estado</p>
                                            <span className={clsx("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest", currentCustomer.balance > 0 ? "bg-rose-50 text-rose-500 shadow-sm" : "bg-emerald-50 text-emerald-500 shadow-sm")}>
                                                {currentCustomer.balance > 0 ? "CON DEUDA" : "AL DÍA"}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-700 p-8 rounded-[3rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
                                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                                    <p className="font-black text-[10px] uppercase tracking-[0.2em] opacity-60 mb-4">{isCreating ? "DEUDA GLOBAL" : "TOTAL DEUDA"}</p>
                                    <h4 className="text-5xl font-black mb-10 tracking-tighter">S/ {(isCreating ? totalConsolidado : (currentCustomer?.balance ?? 0)).toFixed(2)}</h4>
                                    {!isCreating && currentCustomer && (
                                        <button onClick={() => {
                                            const productsList = ledgerItems.filter(i => i.type === 'product').map(i => `• ${i.name}: S/ ${i.price?.toFixed(2)} ${i.discount ? `(Desc: S/ ${i.discount.toFixed(2)})` : ''}`).join('\n');
                                            const paymentsList = ledgerItems.filter(i => i.type === 'payment').map(i => `✓ Pago (${i.method?.toLowerCase()}): S/ ${i.amount?.toFixed(2)} [${new Date(i.date).toLocaleDateString()}]`).join('\n');
                                            const msg = `Hola *${currentCustomer.name}*, este es tu resumen de cuenta:\n\n*PRODUCTOS:*\n${productsList || 'Ninguno'}\n\n*PAGOS:*\n${paymentsList || 'Ninguno'}\n\n*SALDO PENDIENTE:* S/ ${currentCustomer.balance.toFixed(2)}`;
                                            window.open(`https://wa.me/51${currentCustomer.contact}?text=${encodeURIComponent(msg)}`, '_blank');
                                        }} className="w-full py-5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all border border-white/20 shadow-xl">
                                            <Smartphone size={18} /> ENVIAR WHATSAPP
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
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Seleccionar Producto</h2>
                                <button onClick={() => setShowProductSearch(false)} className="p-3 hover:bg-white rounded-2xl text-gray-400 transition-all shadow-sm active:scale-90"><X /></button>
                            </div>
                            <div className="p-8 flex flex-col gap-6">
                                <div className="relative">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input autoFocus type="text" placeholder="Buscar en inventario..." value={productSearchQuery} onChange={(e) => setProductSearchQuery(e.target.value)} className="w-full pl-14 pr-8 py-5 bg-gray-50 border border-gray-100 rounded-3xl outline-none font-bold text-gray-900 placeholder:font-normal placeholder:text-gray-300 focus:bg-white focus:border-violet-100 transition-all" />
                                </div>
                                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin">
                                    {filteredProducts.map(product => (
                                        <button key={product.id} onClick={() => handleSelectProduct(product)} className="w-full p-5 hover:bg-violet-50 rounded-3xl border border-gray-50 flex justify-between items-center group transition-all active:scale-95 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-gray-50 rounded-2xl overflow-hidden relative border border-gray-100"> {product.images?.[0] ? <Image src={product.images[0]} alt="" fill className="object-cover" /> : <Package className="m-auto text-gray-200" />} </div>
                                                <div className="text-left">
                                                    <p className="font-black uppercase text-gray-900 text-sm tracking-tight">{product.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Stock: {product.stock}</p>
                                                </div>
                                            </div>
                                            <div className="bg-violet-600 text-white px-4 py-2 rounded-xl font-black text-sm">S/ {product.salePrice.toFixed(2)}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Confirm Amount Modal */}
                {showPaymentAmount && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] w-full max-w-xs p-10 space-y-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                            <div className="text-center space-y-2">
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm"><Wallet size={40} /></div>
                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">REGISTRAR PAGO</h3>
                                <div className="inline-block px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-200">{paymentMethod === 'Cash' ? 'efectivo' : paymentMethod.toLowerCase()}</div>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-gray-50 border-2 border-gray-50 rounded-[2rem] flex items-center px-6 py-5 text-3xl font-black focus-within:border-emerald-100 transition-all"><span className="text-gray-300 mr-3">S/</span><input autoFocus type="number" value={paymentAmount || ''} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full bg-transparent outline-none text-gray-900" /></div>
                                <button onClick={handleAddPayment} disabled={!paymentAmount || isProcessing} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg tracking-tight flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 active:scale-95 transition-all"> {isProcessing ? <Loader2 className="animate-spin" /> : <><Check size={24} strokeWidth={3} /> CONFIRMAR</>} </button>
                                <button onClick={() => setShowPaymentAmount(false)} className="w-full py-2 text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] active:scale-90 transition-all">Cancelar</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ADVANCED Editing Modal (iPad friendly) */}
                {editingItem && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] w-full max-w-sm p-10 space-y-8 shadow-2xl border border-gray-100">
                            <div className="text-center space-y-2">
                                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-sm"><Edit2 size={40} /></div>
                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">EDITAR REGISTRO</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 opacity-60">{editingItem.type === 'product' ? 'PRODUCTO / VENTA' : 'PAGO'}</p>
                            </div>

                            <div className="space-y-6">
                                {editingItem.type === 'product' ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Nombre del Producto</label>
                                            <input type="text" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] font-bold uppercase text-sm outline-none focus:bg-white focus:border-indigo-100 transition-all" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Precio S/</label>
                                                <input type="number" value={editingItem.value || ''} onChange={e => setEditingItem({ ...editingItem, value: parseFloat(e.target.value) })} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] font-black text-sm outline-none focus:bg-white focus:border-indigo-100 transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-rose-400 ml-2 tracking-widest">Descuento S/</label>
                                                <input type="number" value={editingItem.discount || ''} onChange={e => setEditingItem({ ...editingItem, discount: parseFloat(e.target.value) })} className="w-full px-6 py-4 bg-rose-50 border border-transparent text-rose-600 rounded-[1.5rem] font-black text-sm outline-none focus:bg-rose-100 focus:border-rose-200 transition-all" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Método de Pago</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(['Yape', 'Plin', 'Cash', 'Transfer'] as const).map(m => (
                                                    <button key={m} onClick={() => setEditingItem({ ...editingItem, method: m })} className={clsx("py-3 px-4 rounded-xl border-2 text-[10px] font-black transition-all active:scale-95", editingItem.method === m ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" : "border-gray-50 bg-gray-50 text-gray-400 hover:border-indigo-100 hover:text-indigo-400")}>
                                                        {m === 'Cash' ? 'EFECTIVO' : m.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Monto Pagado S/</label>
                                            <input type="number" value={editingItem.value || ''} onChange={e => setEditingItem({ ...editingItem, value: parseFloat(e.target.value) })} className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] font-black text-lg outline-none focus:bg-white focus:border-indigo-100 transition-all text-indigo-600" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Fecha del Pago</label>
                                            <input
                                                type="date"
                                                value={editingItem.date ? new Date(editingItem.date).toISOString().split('T')[0] : ''}
                                                onChange={e => {
                                                    const date = new Date(e.target.value);
                                                    // Ensure we keep the local date correctly
                                                    setEditingItem({ ...editingItem, date: date.toISOString() });
                                                }}
                                                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] font-black text-sm outline-none focus:bg-white focus:border-indigo-100 transition-all text-indigo-600"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="pt-4 flex flex-col gap-3">
                                    <button onClick={handleUpdateItemValue} disabled={isProcessing} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg tracking-tight flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 active:scale-95 transition-all"> {isProcessing ? <Loader2 className="animate-spin" /> : <><Check size={24} strokeWidth={3} /> GUARDAR</>} </button>
                                    <button onClick={() => setEditingItem(null)} className="w-full py-2 text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] active:scale-90 transition-all">CERRAR</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* QUICK DISCOUNT MODAL */}
                {discountingItem && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] w-full max-w-xs p-10 space-y-8 shadow-2xl relative">
                            <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
                            <div className="text-center space-y-2">
                                <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm"><Tag size={40} /></div>
                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">APLICAR DESCUENTO</h3>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest truncate">{discountingItem.name}</p>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-rose-50 border-2 border-rose-50 rounded-[2rem] flex items-center px-6 py-5 text-3xl font-black focus-within:border-rose-100 transition-all"><span className="text-rose-300 mr-3">S/</span><input autoFocus type="number" value={discountingItem.discount || ''} onChange={(e) => setDiscountingItem({ ...discountingItem, discount: parseFloat(e.target.value) || 0 })} className="w-full bg-transparent outline-none text-rose-600" /></div>
                                <button onClick={handleApplyDiscount} disabled={isProcessing} className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black text-lg tracking-tight flex items-center justify-center gap-3 shadow-xl shadow-rose-200 active:scale-95 transition-all"> {isProcessing ? <Loader2 className="animate-spin" /> : <><Check size={24} strokeWidth={3} /> APLICAR</>} </button>
                                <button onClick={() => setDiscountingItem(null)} className="w-full py-2 text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Cerrar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .scrollbar-thin::-webkit-scrollbar { width: 6px; }
                .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
            `}</style>
        </div>
    );
}
