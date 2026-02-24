
'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Product, Sale, SaleItem } from '@/lib/types';
import {
    ShoppingCart, Plus, Minus, X, Search, User, CreditCard,
    DollarSign, Package, UserPlus, Check, Loader2, Edit3, Clock, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SalesPage() {
    const { products, customers, processSale, addCustomer, sales, deleteSale } = useData();
    const [view, setView] = useState<'pos' | 'history'>('pos');
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isProcessingSale, setIsProcessingSale] = useState(false);

    // Filtered sales for history
    const [historySearch, setHistorySearch] = useState('');
    const filteredSales = sales.filter(s => {
        if (!historySearch) return true;
        const customer = customers.find(c => c.id === s.customerId);
        return customer?.name.toLowerCase().includes(historySearch.toLowerCase()) ||
            s.id.toLowerCase().includes(historySearch.toLowerCase()) ||
            s.items.some(i => i.productName.toLowerCase().includes(historySearch.toLowerCase()));
    });

    // Group sales by date
    const salesByDate = filteredSales.reduce((acc: Record<string, Sale[]>, sale) => {
        const date = new Date(sale.date).toLocaleDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(sale);
        return acc;
    }, {});

    const handleDeleteSale = async (id: string) => {
        if (window.confirm('¿Eliminar esta venta? El stock se devolverá.')) {
            await deleteSale(id);
        }
    };

    // Checkout State
    const [paymentType, setPaymentType] = useState<'Cash' | 'Credit'>('Cash');
    const [cashMethod, setCashMethod] = useState<'Cash' | 'Yape' | 'Plin'>('Cash');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [installments, setInstallments] = useState(1);
    const [frequency, setFrequency] = useState<'Weekly' | 'Bi-weekly' | 'Monthly'>('Weekly');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [discount, setDiscount] = useState(0);
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);

    // Client name input state
    const [clientName, setClientName] = useState('');
    const [clientContact, setClientContact] = useState('');
    const [clientInputMode, setClientInputMode] = useState<'select' | 'new'>('select');
    const [savingClient, setSavingClient] = useState(false);
    const [savedClientMsg, setSavedClientMsg] = useState('');

    // Manual item state
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualItemName, setManualItemName] = useState('');
    const [manualItemPrice, setManualItemPrice] = useState('');

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm)
    );

    // Filter customers based on typed name (for suggestions)
    const customerSuggestions = useMemo(() => {
        if (!clientName.trim()) return [];
        return customers.filter(c =>
            c.name.toLowerCase().includes(clientName.toLowerCase())
        ).slice(0, 5);
    }, [clientName, customers]);

    const addToCart = (product: Product) => {
        if (product.stock < 1) return;
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                // Don't exceed stock
                const currentProduct = products.find(p => p.id === product.id);
                if (currentProduct && existing.quantity >= currentProduct.stock) return prev;
                return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { productId: product.id, productName: product.name, quantity: 1, salePrice: product.salePrice }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                // If manual item, no stock limit
                if (productId.startsWith('manual-')) {
                    return { ...item, quantity: Math.max(1, item.quantity + delta) };
                }
                const maxStock = products.find(p => p.id === productId)?.stock ?? 99;
                const newQty = Math.max(1, Math.min(maxStock, item.quantity + delta));
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const addManualItem = () => {
        if (!manualItemName.trim() || !manualItemPrice) return;
        const newItem: SaleItem = {
            productId: `manual-${Date.now()}`,
            productName: manualItemName.trim(),
            quantity: 1,
            salePrice: parseFloat(manualItemPrice)
        };
        setCart(prev => [...prev, newItem]);
        setManualItemName('');
        setManualItemPrice('');
        setIsManualModalOpen(false);
    };

    const cartSubtotal = cart.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0);
    const cartTotal = Math.max(0, cartSubtotal - discount);

    // Save new client and select them
    const handleSaveNewClient = async () => {
        if (!clientName.trim() || clientContact.length !== 9) return;

        // Check if client already exists
        const existing = customers.find(c => c.name.toLowerCase() === clientName.trim().toLowerCase());
        if (existing) {
            setSelectedCustomerId(existing.id);
            setSavedClientMsg('Cliente ya existente, seleccionado.');
            setTimeout(() => setSavedClientMsg(''), 2500);
            return;
        }

        setSavingClient(true);
        try {
            const newId = await addCustomer({
                id: '', // Firestore will assign a real ID
                name: clientName.trim(),
                contact: clientContact,
                balance: 0,
                history: []
            });
            // Use the real Firestore document ID
            setSelectedCustomerId(newId);
            setSavedClientMsg('¡Cliente guardado!');
            setTimeout(() => {
                setSavedClientMsg('');
                setClientInputMode('select');
            }, 2500);
        } catch (err) {
            console.error('Error saving client:', err);
            setSavedClientMsg('Error al guardar');
        } finally {
            setSavingClient(false);
        }
    };

    const handleCheckout = async () => {
        if (cart.length === 0 || isProcessingSale) return;

        // Validation: Credit sales MUST have a customer
        if (paymentType === 'Credit') {
            if (clientInputMode === 'select' && !selectedCustomerId) {
                alert('Por favor seleccione un cliente para ventas a crédito.');
                return;
            }
            if (clientInputMode === 'new' && (!clientName.trim() || clientContact.length !== 9)) {
                alert('Por favor ingrese el nombre y contacto del nuevo cliente para el crédito.');
                return;
            }
        }

        setIsProcessingSale(true);
        try {
            // Calculate cost and profit
            const calculatedCostTotal = cart.reduce((acc, item) => {
                const product = products.find(p => p.id === item.productId);
                return acc + (product?.costPrice || 0) * item.quantity;
            }, 0);
            const calculatedProfit = cartTotal - calculatedCostTotal;

            // Determine customer ID: from select or from new client
            let customerId = selectedCustomerId || undefined;

            // If in 'new' mode and not saved yet, save it now
            if (clientInputMode === 'new' && clientName.trim() && !customerId) {
                // Double check if client already exists by name
                const existing = customers.find(c => c.name.toLowerCase() === clientName.trim().toLowerCase());
                if (existing) {
                    customerId = existing.id;
                } else {
                    // Create new customer
                    customerId = await addCustomer({
                        id: '',
                        name: clientName.trim(),
                        contact: clientContact,
                        balance: 0,
                        history: []
                    });
                }
            }

            await processSale({
                total: cartTotal,
                date: new Date(saleDate + 'T12:00:00').toISOString(),
                discount: discount > 0 ? discount : undefined,
                costTotal: calculatedCostTotal,
                profit: calculatedProfit,
                type: paymentType,
                items: cart,
                customerId,
                status: paymentType === 'Cash' ? 'Paid' : 'Pending',
                remainingBalance: paymentType === 'Credit' ? cartTotal : 0,
                payments: paymentType === 'Cash' ? [{
                    method: cashMethod as 'Cash' | 'Yape' | 'Plin',
                    amount: cartTotal,
                    date: new Date().toISOString()
                }] : [],
                installmentPlan: paymentType === 'Credit' ? {
                    numberOfInstallments: installments || 1,
                    paymentFrequency: frequency,
                    installments: Array.from({ length: installments || 1 }).map((_, i) => ({
                        number: i + 1,
                        amount: cartTotal / (installments || 1),
                        dueDate: new Date(new Date(startDate + 'T12:00:00').getTime() + i * (frequency === 'Weekly' ? 7 : frequency === 'Bi-weekly' ? 14 : 30) * 24 * 60 * 60 * 1000).toISOString(),
                        status: 'Pending'
                    }))
                } : undefined
            });

            // Reset
            setCart([]);
            setDiscount(0);
            setIsCheckoutOpen(false);
            setClientName('');
            setClientContact('');
            setSelectedCustomerId('');
            setClientInputMode('select');
            alert('¡Venta procesada con éxito!');
        } catch (err) {
            console.error('Checkout error:', err);
            alert('Error al procesar la venta. Verifique su conexión.');
        } finally {
            setIsProcessingSale(false);
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
            {/* View Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl self-start">
                <button
                    onClick={() => setView('pos')}
                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${view === 'pos' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Punto de Venta
                </button>
                <button
                    onClick={() => setView('history')}
                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${view === 'history' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Historial de Ventas
                </button>
            </div>

            {view === 'history' ? (
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-800">Historial de Ventas</h1>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar por cliente, producto..."
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                className="pl-10 pr-4 py-2 w-80 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-8 pr-2">
                        {Object.keys(salesByDate).length === 0 ? (
                            <div className="h-40 flex flex-col items-center justify-center text-gray-400 space-y-2">
                                <Clock size={48} className="opacity-20" />
                                <p>No se encontraron ventas</p>
                            </div>
                        ) : (
                            Object.entries(salesByDate).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).map(([date, daySales]: [string, Sale[]]) => (
                                <div key={date} className="space-y-3">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest sticky top-0 py-2 bg-gray-50 z-10">{date}</h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {daySales.map((sale: Sale) => {
                                            const customer = customers.find(c => c.id === sale.customerId);
                                            return (
                                                <motion.div
                                                    key={sale.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                                                >
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex gap-3">
                                                            <div className={`p-2 rounded-xl ${sale.type === 'Credit' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                                                                <DollarSign size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900">{customer?.name || 'Venta Directa'}</p>
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                                                    {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {sale.type === 'Credit' ? 'Crédito' : 'Efectivo'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-black text-purple-600">S/ {sale.total.toFixed(2)}</p>
                                                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-lg uppercase ${sale.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                {sale.status === 'Paid' ? 'Pagado' : 'Pendiente'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 border-t border-gray-50 pt-3 mb-4">
                                                        {sale.items.map((item: SaleItem, idx: number) => (
                                                            <div key={idx} className="flex justify-between text-xs text-gray-600">
                                                                <span>{item.quantity}x {item.productName}</span>
                                                                <span className="font-medium text-gray-500">S/ {(item.salePrice * item.quantity).toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleDeleteSale(sale.id)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                            title="Anular Venta"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
                        {/* Product Catalog */}
                        <div className="flex-1 flex flex-col gap-4 min-h-0">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <h1 className="text-2xl font-bold text-gray-800">Catálogo</h1>
                                    <button
                                        onClick={() => setIsManualModalOpen(true)}
                                        className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-orange-100 flex items-center gap-2 hover:bg-orange-100 transition-colors"
                                    >
                                        <Edit3 size={14} /> Venta Manual
                                    </button>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Buscar producto..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 w-64 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-1">
                                {filteredProducts.map(product => (
                                    <motion.div
                                        key={product.id}
                                        whileHover={{ y: -2 }}
                                        onClick={() => addToCart(product)}
                                        className={`bg-white p-3 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all flex flex-col justify-between ${product.stock < 1 ? 'opacity-50 pointer-events-none' : ''
                                            }`}
                                    >
                                        {/* Product Image */}
                                        <div className="h-40 rounded-lg mb-2 overflow-hidden bg-gray-50">
                                            {product.images?.[0] ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                    src={product.images[0]}
                                                    alt={product.name}
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                                    <Package size={28} />
                                                    <span className="text-[10px] mt-1">Sin imagen</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800 text-sm line-clamp-1">{product.name}</h3>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{product.category} • Stock: {product.stock}</p>
                                        </div>
                                        <div className="mt-2 flex justify-between items-center">
                                            <span className="font-bold text-purple-600 text-sm">S/ {product.salePrice.toFixed(2)}</span>
                                            <button className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors" aria-label="Agregar al carrito">
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Cart Summary */}
                        <div className="w-full md:w-96 bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-full">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <ShoppingCart className="text-purple-600" size={20} />
                                    Carrito
                                    {cart.length > 0 && (
                                        <span className="ml-auto text-xs font-medium bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                                            {cart.reduce((a, b) => a + b.quantity, 0)} items
                                        </span>
                                    )}
                                </h2>
                            </div>

                            {/* Client Name Input — always visible */}
                            <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                                <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                                    <User size={12} /> Cliente
                                </label>

                                {/* Toggle between select and new */}
                                <div className="flex gap-1 mb-2">
                                    <button
                                        onClick={() => { setClientInputMode('select'); setClientName(''); }}
                                        className={`flex-1 text-[10px] py-1 rounded-lg font-medium transition-colors ${clientInputMode === 'select'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                            }`}
                                    >
                                        Seleccionar
                                    </button>
                                    <button
                                        onClick={() => { setClientInputMode('new'); setSelectedCustomerId(''); }}
                                        className={`flex-1 text-[10px] py-1 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 ${clientInputMode === 'new'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                            }`}
                                    >
                                        <UserPlus size={10} /> Nuevo
                                    </button>
                                </div>

                                {clientInputMode === 'select' ? (
                                    <select
                                        className="w-full p-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-all"
                                        value={selectedCustomerId}
                                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                                        aria-label="Seleccionar cliente"
                                    >
                                        <option value="">Sin cliente (venta directa)</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="relative space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Nombre completo (Obligatorio)"
                                            value={clientName}
                                            onChange={(e) => setClientName(e.target.value)}
                                            className="w-full p-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-all"
                                        />
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Número (9 dígitos)"
                                                maxLength={9}
                                                value={clientContact}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setClientContact(val);
                                                }}
                                                className="w-full p-2 pr-10 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500 transition-all"
                                            />
                                            <button
                                                onClick={handleSaveNewClient}
                                                disabled={!clientName.trim() || clientContact.length !== 9 || savingClient}
                                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-all"
                                                title="Guardar cliente"
                                                aria-label="Guardar cliente"
                                            >
                                                {savingClient ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Check size={14} />
                                                )}
                                            </button>
                                        </div>

                                        {/* Autocomplete suggestions */}
                                        {customerSuggestions.length > 0 && clientName.trim() && (
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                                                {customerSuggestions.map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => {
                                                            setClientName(c.name);
                                                            setSelectedCustomerId(c.id);
                                                            setClientInputMode('select');
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors flex items-center gap-2"
                                                    >
                                                        <User size={12} className="text-gray-400" />
                                                        <span>{c.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Saved message */}
                                        {savedClientMsg && (
                                            <p className="text-[10px] text-green-600 mt-1 font-medium flex items-center gap-1">
                                                <Check size={10} /> {savedClientMsg}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-50">
                                        <ShoppingCart size={40} />
                                        <p className="text-sm">Carrito vacío</p>
                                    </div>
                                ) : (
                                    cart.map((item) => {
                                        const prod = products.find(p => p.id === item.productId);
                                        return (
                                            <div key={item.productId} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl group hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all">
                                                {/* Cart item thumbnail */}
                                                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                                    {prod?.images?.[0] ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={prod.images[0]} alt={item.productName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                            <Package size={14} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-xs text-gray-800 line-clamp-1">{item.productName}</h4>
                                                    <p className="text-[10px] text-purple-600 font-bold">S/ {(item.salePrice * item.quantity).toFixed(2)}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" aria-label="Reducir cantidad"><Minus size={12} /></button>
                                                    <span className="text-xs font-semibold w-5 text-center">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 text-gray-400 hover:text-green-500 transition-colors" aria-label="Aumentar cantidad"><Plus size={12} /></button>
                                                    <button onClick={() => removeFromCart(item.productId)} className="ml-1 p-1 text-gray-300 hover:text-red-500 transition-colors" aria-label="Eliminar del carrito"><X size={12} /></button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl space-y-3">
                                {cart.length > 0 && (
                                    <>
                                        <div className="flex justify-between items-center text-xs text-gray-500">
                                            <span>Subtotal</span>
                                            <span>S/ {cartSubtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-4">
                                            <span className="text-xs font-medium text-gray-500">Descuento (S/)</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={discount || ''}
                                                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                                                className="w-24 p-1.5 text-right text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-purple-500 transition-all font-bold text-red-500"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between items-center text-lg font-bold text-gray-800 pt-1">
                                    <span>Total</span>
                                    <span>S/ {cartTotal.toFixed(2)}</span>
                                </div>
                                <button
                                    onClick={() => setIsCheckoutOpen(true)}
                                    disabled={cart.length === 0}
                                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg shadow-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Procesar Venta
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Checkout Modal */}
            <AnimatePresence>
                {isCheckoutOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                                <h2 className="text-xl font-bold text-gray-800">Finalizar Venta</h2>
                                <button onClick={() => setIsCheckoutOpen(false)} aria-label="Cerrar" title="Cerrar"><X className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <div className="p-6 space-y-5 overflow-y-auto flex-1">
                                <div>
                                    <label className="text-sm font-medium text-gray-600 mb-2 block" htmlFor="saleDateInput">Fecha de la Venta</label>
                                    <input
                                        id="saleDateInput"
                                        type="date"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500 font-bold"
                                        value={saleDate}
                                        onChange={(e) => setSaleDate(e.target.value)}
                                        title="Seleccionar fecha"
                                    />
                                </div>

                                {/* Payment type */}
                                <div>
                                    <label className="text-sm font-medium text-gray-600 mb-2 block">Tipo de Venta</label>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <button
                                            onClick={() => setPaymentType('Cash')}
                                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${paymentType === 'Cash' ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
                                        >
                                            <DollarSign size={20} />
                                            Contado
                                        </button>
                                        <button
                                            onClick={() => setPaymentType('Credit')}
                                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${paymentType === 'Credit' ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
                                        >
                                            <CreditCard size={20} />
                                            Crédito
                                        </button>
                                    </div>

                                    {paymentType === 'Cash' && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Método de Cobro</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['Cash', 'Yape', 'Plin'].map((m) => (
                                                    <button
                                                        key={m}
                                                        onClick={() => setCashMethod(m as 'Cash' | 'Yape' | 'Plin')}
                                                        className={`py-2 px-1 rounded-lg border text-[10px] font-black uppercase transition-all ${cashMethod === m ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-white'}`}
                                                    >
                                                        {m === 'Cash' ? 'Efectivo' : m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Client selection in modal */}
                                <div>
                                    <label className="text-sm font-medium text-gray-600 mb-2 block flex items-center gap-1">
                                        <User size={14} /> Cliente
                                    </label>
                                    {selectedCustomerId ? (
                                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                                            <User size={16} className="text-green-600" />
                                            <span className="text-sm font-medium text-green-800">
                                                {customers.find(c => c.id === selectedCustomerId)?.name || clientName}
                                            </span>
                                            <button
                                                onClick={() => { setSelectedCustomerId(''); setClientName(''); }}
                                                className="ml-auto text-green-400 hover:text-red-500 transition-colors"
                                                aria-label="Cambiar cliente"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : clientName.trim() ? (
                                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                            <UserPlus size={16} className="text-blue-600" />
                                            <span className="text-sm font-medium text-blue-800">{clientName}</span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Sin cliente (venta directa)</p>
                                    )}
                                </div>

                                {/* Credit-specific options */}
                                {paymentType === 'Credit' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-600 mb-2 block" htmlFor="installmentsInput">Cuotas</label>
                                                <input
                                                    id="installmentsInput"
                                                    type="number" min="1" max="24"
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
                                                    value={installments || ''}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        setInstallments(isNaN(val) ? 0 : val);
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600 mb-2 block" htmlFor="frequencyInput">Frecuencia</label>
                                                <select
                                                    id="frequencyInput"
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
                                                    value={frequency}
                                                    onChange={(e) => setFrequency(e.target.value as 'Weekly' | 'Bi-weekly' | 'Monthly')}
                                                >
                                                    <option value="Weekly">Semanal</option>
                                                    <option value="Bi-weekly">Quincenal</option>
                                                    <option value="Monthly">Mensual</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-600 mb-2 block" htmlFor="startDateInput">Fecha Primer Pago</label>
                                            <input
                                                id="startDateInput"
                                                type="date"
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                            />
                                        </div>
                                        <p className="text-xs text-orange-500 flex items-center gap-1">
                                            ⚠ Esta venta generará {installments} cuota(s) de S/ {(cartTotal / installments).toFixed(2)}
                                        </p>
                                    </div>
                                )}

                                <div className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">Total a Pagar</span>
                                    <span className="text-2xl font-bold text-gray-900">S/ {cartTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0">
                                <button
                                    onClick={handleCheckout}
                                    disabled={isProcessingSale}
                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                                    title="Confirmar Venta"
                                >
                                    {isProcessingSale ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Procesando...
                                        </>
                                    ) : (
                                        'Confirmar Venta'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Manual Item Modal */}
            <AnimatePresence>
                {isManualModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-orange-50">
                                <h2 className="text-xl font-bold text-orange-800 flex items-center gap-2">
                                    <Edit3 size={20} /> Registro Manual
                                </h2>
                                <button onClick={() => setIsManualModalOpen(false)} aria-label="Cerrar"><X className="text-orange-400 hover:text-orange-600" /></button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">NOMBRE DEL PRODUCTO/SERVICIO</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Saldo antiguo o Producto agotado"
                                        value={manualItemName}
                                        onChange={(e) => setManualItemName(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">PRECIO TOTAL (S/)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={manualItemPrice}
                                        onChange={(e) => setManualItemPrice(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                                    />
                                </div>

                                <p className="text-[10px] text-gray-400 bg-gray-50 p-3 rounded-lg border border-dashed border-gray-200 leading-relaxed">
                                    💡 Usa esta opción para registrar ventas de productos que ya no tienes en stock o deudas antiguas del cliente.
                                </p>

                                <button
                                    onClick={addManualItem}
                                    disabled={!manualItemName.trim() || !manualItemPrice}
                                    className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                                >
                                    Agregar al Carrito
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
