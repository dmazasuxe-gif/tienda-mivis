
'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Product, SaleItem } from '@/lib/types';
import {
    ShoppingCart, Plus, Minus, X, Search, User, CreditCard,
    DollarSign, Package, UserPlus, Check, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SalesPage() {
    const { products, customers, processSale, addCustomer } = useData();
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isProcessingSale, setIsProcessingSale] = useState(false);

    // Checkout State
    const [paymentType, setPaymentType] = useState<'Cash' | 'Credit'>('Cash');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [installments, setInstallments] = useState(1);
    const [frequency, setFrequency] = useState<'Weekly' | 'Bi-weekly' | 'Monthly'>('Weekly');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [discount, setDiscount] = useState(0);

    // Client name input state
    const [clientName, setClientName] = useState('');
    const [clientContact, setClientContact] = useState('');
    const [clientInputMode, setClientInputMode] = useState<'select' | 'new'>('select');
    const [savingClient, setSavingClient] = useState(false);
    const [savedClientMsg, setSavedClientMsg] = useState('');

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
                const maxStock = products.find(p => p.id === productId)?.stock ?? 99;
                const newQty = Math.max(1, Math.min(maxStock, item.quantity + delta));
                return { ...item, quantity: newQty };
            }
            return item;
        }));
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
                discount: discount > 0 ? discount : undefined,
                costTotal: calculatedCostTotal,
                profit: calculatedProfit,
                type: paymentType,
                items: cart,
                customerId,
                status: paymentType === 'Cash' ? 'Paid' : 'Pending',
                remainingBalance: paymentType === 'Credit' ? cartTotal : 0,
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
        <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
            {/* Product Catalog */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Punto de Venta</h1>
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
                                        <button onClick={() => removeFromCart(item.productId)} className="ml-1 p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" aria-label="Eliminar del carrito"><X size={12} /></button>
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

            {/* Checkout Modal */}
            <AnimatePresence>
                {isCheckoutOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800">Finalizar Venta</h2>
                                <button onClick={() => setIsCheckoutOpen(false)} aria-label="Cerrar"><X className="text-gray-400 hover:text-gray-600" /></button>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Payment type */}
                                <div>
                                    <label className="text-sm font-medium text-gray-600 mb-2 block">Método de Pago</label>
                                    <div className="grid grid-cols-2 gap-3">
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
                                                <label className="text-sm font-medium text-gray-600 mb-2 block">Cuotas</label>
                                                <input
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
                                                <label className="text-sm font-medium text-gray-600 mb-2 block">Frecuencia</label>
                                                <select
                                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
                                                    value={frequency}
                                                    onChange={(e) => setFrequency(e.target.value as 'Weekly' | 'Bi-weekly' | 'Monthly')}
                                                    aria-label="Frecuencia de pago"
                                                >
                                                    <option value="Weekly">Semanal</option>
                                                    <option value="Bi-weekly">Quincenal</option>
                                                    <option value="Monthly">Mensual</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-600 mb-2 block">Fecha Primer Pago</label>
                                            <input
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

                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                                <button
                                    onClick={handleCheckout}
                                    disabled={isProcessingSale}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
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
        </div>
    );
}
