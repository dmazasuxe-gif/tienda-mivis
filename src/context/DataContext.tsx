
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppData, Product, Sale, Customer, PaymentDetails } from '@/lib/types';
import { db, auth } from '@/lib/firebase';
import {
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    Timestamp,
    writeBatch,
    increment,
    arrayUnion,
    FieldValue,
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// ============================================================
// Types
// ============================================================

interface DataContextType extends AppData {
    isLoading: boolean;
    user: FirebaseUser | null;
    error: string | null;
    clearError: () => void;
    addProduct: (product: Product) => Promise<string>;
    updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    processSale: (sale: Omit<Sale, 'id'> & { date?: string }) => Promise<void>;
    addCustomer: (customer: Customer) => Promise<string>;
    updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
    deleteCustomer: (id: string) => Promise<void>;
    deleteSale: (id: string) => Promise<void>;
    recordPayment: (saleId: string, amount: number, method: string) => Promise<void>;
    recordInstallmentPayment: (saleId: string, installmentPayments: Record<number, number>, method: string) => Promise<void>;
    reverseInstallmentPayment: (saleId: string, installmentNumber: number) => Promise<void>;
    resetAllData: () => Promise<void>;
    resetProducts: () => Promise<void>;
    resetCustomers: () => Promise<void>;
    resetSales: () => Promise<void>;
    updateSettings: (settings: AppData['settings']) => Promise<void>;
    updateInstallmentDate: (saleId: string, installmentNumber: number, newDate: string) => Promise<void>;
    addPaymentToCustomer: (customerId: string, amount: number, method: PaymentDetails['method']) => Promise<void>;
    registerProductToCustomer: (customerId: string, product: Product) => Promise<void>;
    getFinancialSummary: () => {
        inventoryValue: number;
        totalSales: number;
        totalProfit: number;
        pendingReceivables: number;
    };
    deletePaymentFromSale: (saleId: string, paymentIndex: number) => Promise<void>;
    updateSalePrice: (saleId: string, itemIndex: number, newPrice: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ============================================================
// Collection names (single source of truth)
// ============================================================

const COLLECTIONS = {
    products: 'products',
    sales: 'sales',
    customers: 'customers',
    settings: 'settings',
} as const;

// ============================================================
// Provider
// ============================================================

const DEFAULT_SETTINGS: AppData['settings'] = {
    whatsapp: '51999509661',
    instagram: 'https://www.instagram.com/mivis_studio',
    tiktok: '',
    facebook: '',
    authorizedAdmins: [{ username: 'admin', password: 'adminpassword' }], // Base master user
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [settings, setSettings] = useState<AppData['settings']>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [error, setError] = useState<string | null>(null);

    const clearError = () => setError(null);

    // ────────────────────────────────────────────────
    // Auth Listener
    // ────────────────────────────────────────────────
    useEffect(() => {
        return onAuthStateChanged(auth, (u) => {
            console.log('Firebase Auth State:', u ? `Authenticated as ${u.email}` : 'Not Authenticated');
            setUser(u);
        });
    }, []);

    // ────────────────────────────────────────────────
    // Real-time Firestore Settings listener (Always active for LoginPage check)
    // ────────────────────────────────────────────────
    useEffect(() => {
        const unsubSettings = onSnapshot(
            doc(db, COLLECTIONS.settings, 'config'),
            (snapshot) => {
                if (snapshot.exists()) {
                    setSettings(snapshot.data() as AppData['settings']);
                } else {
                    setSettings(DEFAULT_SETTINGS);
                }
            },
            (error) => {
                // If permissions are missing (not logged in), we just wait.
                if (error.code === 'permission-denied') {
                    // console.warn('Settings access deferred');
                } else {
                    console.error('Firestore settings error:', error);
                }
            }
        );
        return () => unsubSettings();
    }, []);

    // ────────────────────────────────────────────────
    // Real-time Firestore Products listener (Public Access)
    // ────────────────────────────────────────────────
    useEffect(() => {
        const unsubProducts = onSnapshot(
            collection(db, COLLECTIONS.products),
            (snapshot) => {
                const items: Product[] = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                } as Product));
                setProducts(items);
            },
            (error) => {
                if (error.code === 'permission-denied') {
                    // Public read might be disabled in Firebase Rules
                    console.warn('Products access denied. Check Firebase Security Rules.');
                } else {
                    console.error('Firestore products error:', error);
                }
            }
        );
        return () => unsubProducts();
    }, []);

    useEffect(() => {
        // If not authenticated, don't start listeners for sensitive data
        if (!user) {
            setSales([]);
            setCustomers([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        let loadedCollections = 0;
        const totalCollections = 2; // Sales and Customers

        const checkReady = () => {
            loadedCollections++;
            if (loadedCollections >= totalCollections) {
                setIsLoading(false);
            }
        };

        // 1. Sales listener
        const unsubSales = onSnapshot(
            query(collection(db, COLLECTIONS.sales), orderBy('date', 'desc')),
            (snapshot) => {
                const items: Sale[] = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                } as Sale));
                setSales(items);
                checkReady();
            },
            (error) => {
                console.error('Firestore sales error:', error);
                checkReady();
            }
        );

        // 2. Customers listener
        const unsubCustomers = onSnapshot(
            collection(db, COLLECTIONS.customers),
            (snapshot) => {
                const items: Customer[] = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                } as Customer));
                setCustomers(items);
                checkReady();
            },
            (error) => {
                console.error('Firestore customers error:', error);
                checkReady();
            }
        );

        return () => {
            unsubSales();
            unsubCustomers();
        };
    }, [user]);

    // ────────────────────────────────────────────────
    // Settings Operations
    // ────────────────────────────────────────────────

    const updateSettings = useCallback(async (newSettings: AppData['settings']) => {
        try {
            const docRef = doc(db, COLLECTIONS.settings, 'config');
            await setDoc(docRef, newSettings);
            console.log('Settings updated successfully');
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error updating settings:', err);
            setError(`Error al actualizar configuración: ${err.message}`);
            throw err;
        }
    }, []);

    // ────────────────────────────────────────────────
    // Product Operations
    // ────────────────────────────────────────────────

    const addProduct = useCallback(async (product: Product): Promise<string> => {
        try {
            console.log('Adding product to Firestore...', product.name);
            const { id, ...data } = product; // eslint-disable-line @typescript-eslint/no-unused-vars
            const cleanData = JSON.parse(JSON.stringify(data));
            const docRef = await addDoc(collection(db, COLLECTIONS.products), cleanData);
            console.log('Product added successfully with ID:', docRef.id);
            return docRef.id;
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error adding product to Firestore:', err);
            setError(`Error al guardar producto: ${err.message || 'Error desconocido'}`);
            throw err;
        }
    }, []);

    const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
        const docRef = doc(db, COLLECTIONS.products, id);
        await updateDoc(docRef, updates);
    }, []);

    const deleteProduct = useCallback(async (id: string) => {
        const docRef = doc(db, COLLECTIONS.products, id);
        await deleteDoc(docRef);
    }, []);

    // ────────────────────────────────────────────────
    // Customer Operations
    // ────────────────────────────────────────────────

    const addCustomer = useCallback(async (customer: Customer): Promise<string> => {
        try {
            console.log('Adding customer to Firestore...', customer.name);
            const { id, ...data } = customer; // eslint-disable-line @typescript-eslint/no-unused-vars
            const cleanData = JSON.parse(JSON.stringify(data));
            const docRef = await addDoc(collection(db, COLLECTIONS.customers), cleanData);
            console.log('Customer added successfully with ID:', docRef.id);
            return docRef.id; // Return real Firestore ID
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error adding customer to Firestore:', err);
            setError(`Error al guardar cliente: ${err.message || 'Error desconocido'}`);
            throw err;
        }
    }, []);

    const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
        const docRef = doc(db, COLLECTIONS.customers, id);
        await updateDoc(docRef, updates);
    }, []);

    const deleteCustomer = useCallback(async (id: string) => {
        try {
            const docRef = doc(db, COLLECTIONS.customers, id);
            await deleteDoc(docRef);
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error deleting customer:', err);
            setError(`Error al eliminar cliente: ${err.message}`);
        }
    }, []);

    // ────────────────────────────────────────────────
    // Sale Operations
    // ────────────────────────────────────────────────

    const processSale = useCallback(async (saleData: Omit<Sale, 'id' | 'date'>) => {
        try {
            console.log('Processing sale in Firestore...', saleData);
            const batch = writeBatch(db);

            const saleRef = doc(collection(db, COLLECTIONS.sales));
            const { date, ...cleanSaleData } = JSON.parse(JSON.stringify(saleData));
            const newSale = {
                ...cleanSaleData,
                date: date || new Date().toISOString(),
                createdAt: Timestamp.now(),
            };
            batch.set(saleRef, newSale);

            // 2. Update product stock
            for (const item of saleData.items) {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const productRef = doc(db, COLLECTIONS.products, product.id);
                    batch.update(productRef, { stock: product.stock - item.quantity });
                }
            }

            // 3. Update customer info if customerId provided
            if (saleData.customerId) {
                const customerRef = doc(db, COLLECTIONS.customers, saleData.customerId);
                const updates: { history: FieldValue; balance?: FieldValue } = {
                    history: arrayUnion(saleRef.id),
                };

                if (saleData.type === 'Credit') {
                    updates.balance = increment(saleData.remainingBalance || 0);
                }

                batch.update(customerRef, updates);
            }

            // Execute all operations atomically
            await batch.commit();
            console.log('Sale processed successfully');
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error processing sale in Firestore:', err);
            setError(`Error al procesar venta: ${err.message || 'Error de conexión o permisos'}`);
            throw err;
        }
    }, [products]);

    const deleteSale = useCallback(async (saleId: string) => {
        try {
            const sale = sales.find(s => s.id === saleId);
            if (!sale) return;

            const batch = writeBatch(db);

            // 1. Revert product stock
            for (const item of sale.items) {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const productRef = doc(db, COLLECTIONS.products, product.id);
                    batch.update(productRef, { stock: product.stock + item.quantity });
                }
            }

            // 2. Revert customer balance if credit sale
            if (sale.type === 'Credit' && sale.customerId) {
                const customerRef = doc(db, COLLECTIONS.customers, sale.customerId);
                batch.update(customerRef, {
                    balance: increment(-(sale.remainingBalance || 0))
                });
                // Note: We don't strictly need to remove from history as it's a log, 
                // but we could use arrayRemove if needed.
            }

            // 3. Delete the sale document
            const saleRef = doc(db, COLLECTIONS.sales, saleId);
            batch.delete(saleRef);

            await batch.commit();
            console.log('Sale deleted and stocks reverted');
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error deleting sale:', err);
            setError(`Error al eliminar venta: ${err.message}`);
            throw err;
        }
    }, [sales, products]);

    // ────────────────────────────────────────────────
    // Payment Recording
    // ────────────────────────────────────────────────

    const recordInstallmentPayment = useCallback(async (saleId: string, installmentPayments: Record<number, number>, method: string) => {
        try {
            console.log('Recording installment payment...', { saleId, payments: installmentPayments });
            const sale = sales.find(s => s.id === saleId);
            if (!sale || !sale.installmentPlan) {
                console.error('Sale or installment plan not found');
                return;
            }

            const batch = writeBatch(db);
            const saleRef = doc(db, COLLECTIONS.sales, saleId);

            // Calculate total to pay and update installment statuses/amounts
            let totalPaid = 0;
            let redistributionPool = 0;
            const updatedInstallments = [...sale.installmentPlan.installments];

            // 1. Process explicit payments
            Object.entries(installmentPayments).forEach(([numStr, paidAmount]) => {
                const num = parseInt(numStr);
                const idx = updatedInstallments.findIndex(i => i.number === num);
                if (idx !== -1 && updatedInstallments[idx].status === 'Pending') {
                    const originalAmount = updatedInstallments[idx].amount;
                    totalPaid += paidAmount;
                    redistributionPool += (originalAmount - paidAmount);
                    updatedInstallments[idx] = {
                        ...updatedInstallments[idx],
                        amount: paidAmount,
                        status: 'Paid' as const
                    };
                }
            });

            if (totalPaid === 0) {
                console.warn('No payments to process');
                return;
            }

            // 2. Redistribute difference if any
            if (redistributionPool !== 0) {
                const nextPendingIdx = updatedInstallments.findIndex(inst => inst.status === 'Pending');
                if (nextPendingIdx !== -1) {
                    updatedInstallments[nextPendingIdx] = {
                        ...updatedInstallments[nextPendingIdx],
                        amount: Math.max(0, updatedInstallments[nextPendingIdx].amount + redistributionPool)
                    };
                }
            }

            // Record payment in history
            const newPayment: PaymentDetails = {
                method: method as PaymentDetails['method'],
                amount: totalPaid,
                date: new Date().toISOString(),
            };

            const newRemaining = Math.max(0, (sale.remainingBalance || 0) - totalPaid);

            // Update sale doc
            batch.update(saleRef, {
                'installmentPlan.installments': updatedInstallments,
                payments: [...(sale.payments || []), newPayment],
                remainingBalance: newRemaining,
                status: newRemaining <= 0 ? 'Paid' : 'Pending',
            });

            // Update customer balance
            if (sale.customerId) {
                const customerRef = doc(db, COLLECTIONS.customers, sale.customerId);
                const customer = customers.find(c => c.id === sale.customerId);
                if (customer) {
                    batch.update(customerRef, {
                        balance: Math.max(0, customer.balance - totalPaid),
                    });
                }
            }

            await batch.commit();
            console.log('Installment payment recorded successfully');
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error recording installment payment:', err);
            setError(`Error al registrar abono: ${err.message || 'Error de permisos o conexión'}`);
            throw err;
        }
    }, [sales, customers]);

    const reverseInstallmentPayment = useCallback(async (saleId: string, installmentNumber: number) => {
        try {
            const sale = sales.find(s => s.id === saleId);
            if (!sale || !sale.installmentPlan) return;

            const instIdx = sale.installmentPlan.installments.findIndex(i => i.number === installmentNumber);
            if (instIdx === -1 || sale.installmentPlan.installments[instIdx].status === 'Pending') return;

            const amountToReverse = sale.installmentPlan.installments[instIdx].amount;
            const batch = writeBatch(db);
            const saleRef = doc(db, COLLECTIONS.sales, saleId);

            // 1. Set installment back to Pending
            const updatedInstallments = [...sale.installmentPlan.installments];
            updatedInstallments[instIdx] = {
                ...updatedInstallments[instIdx],
                status: 'Pending'
            };

            // 2. Remove the last payment record from history (assuming it was the one)
            // Or better, filter out the most recent payment with this amount
            const updatedPayments = [...(sale.payments || [])];
            // Find index of the most recent payment matching this amount
            const payIdx = updatedPayments.map((p, i) => ({ ...p, i })).reverse().find(p => p.amount === amountToReverse)?.i;
            if (payIdx !== undefined) {
                updatedPayments.splice(payIdx, 1);
            }

            const newRemaining = (sale.remainingBalance || 0) + amountToReverse;

            batch.update(saleRef, {
                'installmentPlan.installments': updatedInstallments,
                payments: updatedPayments,
                remainingBalance: newRemaining,
                status: 'Pending'
            });

            // 3. Update customer balance
            if (sale.customerId) {
                const customerRef = doc(db, COLLECTIONS.customers, sale.customerId);
                const customer = customers.find(c => c.id === sale.customerId);
                if (customer) {
                    batch.update(customerRef, {
                        balance: customer.balance + amountToReverse
                    });
                }
            }

            await batch.commit();
            console.log('Installment payment reversed successfully');
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error reversing installment payment:', err);
            setError(`Error al anular pago: ${err.message}`);
        }
    }, [sales, customers]);

    const recordPayment = useCallback(async (saleId: string, amount: number, method: string) => {
        try {
            const sale = sales.find(s => s.id === saleId);
            if (!sale) return;

            const batch = writeBatch(db);

            // Update sale
            const newPayment: PaymentDetails = {
                method: method as PaymentDetails['method'],
                amount,
                date: new Date().toISOString(),
            };
            const newRemaining = (sale.remainingBalance || 0) - amount;
            const saleRef = doc(db, COLLECTIONS.sales, saleId);
            batch.update(saleRef, {
                payments: [...(sale.payments || []), newPayment],
                remainingBalance: newRemaining,
                status: newRemaining <= 0 ? 'Paid' : 'Pending',
            });

            // Update customer balance
            if (sale.customerId) {
                const customerRef = doc(db, COLLECTIONS.customers, sale.customerId);
                const customer = customers.find(c => c.id === sale.customerId);
                if (customer) {
                    batch.update(customerRef, {
                        balance: customer.balance - amount,
                    });
                }
            }

            await batch.commit();
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error recording payment:', err);
            throw err;
        }
    }, [sales, customers]);

    const updateInstallmentDate = useCallback(async (saleId: string, installmentNumber: number, newDate: string) => {
        try {
            const sale = sales.find(s => s.id === saleId);
            if (!sale || !sale.installmentPlan) return;

            const updatedInstallments = sale.installmentPlan.installments.map(inst =>
                inst.number === installmentNumber ? { ...inst, dueDate: newDate } : inst
            );

            const saleRef = doc(db, COLLECTIONS.sales, saleId);
            await updateDoc(saleRef, {
                'installmentPlan.installments': updatedInstallments
            });
            console.log('Installment date updated');
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error updating installment date:', err);
            setError(`Error al actualizar fecha: ${err.message}`);
            throw err;
        }
    }, [sales]);

    const addPaymentToCustomer = useCallback(async (customerId: string, amount: number, method: PaymentDetails['method']) => {
        try {
            console.log('Adding general payment to customer...', { customerId, amount, method });
            const customer = customers.find(c => c.id === customerId);
            if (!customer) throw new Error('Cliente no encontrado');

            const pendingSales = sales
                .filter(s => s.customerId === customerId && s.type === 'Credit' && (s.remainingBalance || 0) > 0)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const batch = writeBatch(db);
            let remainingToApply = amount;

            for (const sale of pendingSales) {
                if (remainingToApply <= 0) break;

                const saleRef = doc(db, COLLECTIONS.sales, sale.id);
                const canPayThisSale = Math.min(remainingToApply, sale.remainingBalance || 0);

                const newPayment: PaymentDetails = {
                    method,
                    amount: canPayThisSale,
                    date: new Date().toISOString(),
                };

                const newRemaining = (sale.remainingBalance || 0) - canPayThisSale;

                // If it has installment plan, update it too
                let updatedInstallments = sale.installmentPlan?.installments;
                if (updatedInstallments) {
                    let installmentPayPool = canPayThisSale;
                    updatedInstallments = updatedInstallments.map(inst => {
                        if (inst.status === 'Pending' && installmentPayPool > 0) {
                            const payAmount = Math.min(installmentPayPool, inst.amount);
                            installmentPayPool -= payAmount;
                            return {
                                ...inst,
                                amount: payAmount, // This is tricky, usually we'd want to keep original amount but status Paid
                                // But if it's partial, we keep Pending? 
                                // For simplicity if it covers full installment, mark Paid.
                                status: payAmount >= inst.amount ? 'Paid' : 'Pending'
                            };
                        }
                        return inst;
                    });
                }

                batch.update(saleRef, {
                    payments: [...(sale.payments || []), newPayment],
                    remainingBalance: newRemaining,
                    status: newRemaining <= 0 ? 'Paid' : 'Pending',
                    ...(updatedInstallments && { 'installmentPlan.installments': updatedInstallments })
                });

                remainingToApply -= canPayThisSale;
            }

            // Update customer balance
            const customerRef = doc(db, COLLECTIONS.customers, customerId);
            batch.update(customerRef, {
                balance: Math.max(0, customer.balance - amount)
            });

            await batch.commit();
            console.log('General payment applied successfully');
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error adding general payment:', err);
            setError(`Error al registrar pago: ${err.message}`);
            throw err;
        }
    }, [sales, customers]);

    const registerProductToCustomer = useCallback(async (customerId: string, product: Product) => {
        try {
            const customer = customers.find(c => c.id === customerId);
            if (!customer) throw new Error('Cliente no encontrado');

            const saleData: Omit<Sale, 'id'> = {
                items: [{
                    productId: product.id,
                    productName: product.name,
                    quantity: 1,
                    salePrice: product.salePrice
                }],
                total: product.salePrice,
                costTotal: product.costPrice,
                profit: product.salePrice - product.costPrice,
                type: 'Credit',
                customerId,
                clientName: customer.name,
                date: new Date().toISOString(),
                status: 'Pending',
                remainingBalance: product.salePrice,
                installmentPlan: {
                    numberOfInstallments: 1,
                    paymentFrequency: 'Monthly',
                    installments: [{
                        number: 1,
                        amount: product.salePrice,
                        dueDate: new Date().toISOString(),
                        status: 'Pending'
                    }]
                }
            };

            await processSale(saleData);
            console.log('Product registered to customer successfully');
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error registering product to customer:', err);
            setError(`Error al registrar producto: ${err.message}`);
            throw err;
        }
    }, [customers, processSale]);

    // ────────────────────────────────────────────────
    // Financial Summary
    // ────────────────────────────────────────────────

    const getFinancialSummary = useCallback(() => {
        const inventoryValue = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
        const totalSales = sales.reduce((acc, s) => acc + s.total, 0);

        // Calculate profit. Fallback to dynamic calculation if profit is 0 (for old sales)
        const totalProfit = sales.reduce((acc, s) => {
            if (s.profit && s.profit > 0) return acc + s.profit;

            // Re-calculate if profit is 0 or missing
            const calculatedCost = s.items.reduce((itemAcc, item) => {
                const product = products.find(p => p.id === item.productId);
                return itemAcc + (product?.costPrice || 0) * item.quantity;
            }, 0);
            return acc + (s.total - calculatedCost);
        }, 0);

        const pendingReceivables = customers.reduce((acc, c) => acc + c.balance, 0);
        return { inventoryValue, totalSales, totalProfit, pendingReceivables };
    }, [products, sales, customers]);

    // ────────────────────────────────────────────────
    // System Reset Operations
    // ────────────────────────────────────────────────

    const resetProducts = useCallback(async () => {
        try {
            const batch = writeBatch(db);
            products.forEach(p => {
                batch.delete(doc(db, COLLECTIONS.products, p.id));
            });
            await batch.commit();
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error resetting products:', err);
            setError(`Error al borrar productos: ${err.message}`);
        }
    }, [products]);

    const resetCustomers = useCallback(async () => {
        try {
            const batch = writeBatch(db);
            customers.forEach(c => {
                batch.delete(doc(db, COLLECTIONS.customers, c.id));
            });
            await batch.commit();
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error resetting customers:', err);
            setError(`Error al borrar clientes: ${err.message}`);
        }
    }, [customers]);

    const resetSales = useCallback(async () => {
        try {
            const batch = writeBatch(db);
            sales.forEach(s => {
                batch.delete(doc(db, COLLECTIONS.sales, s.id));
            });
            await batch.commit();
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error resetting sales:', err);
            setError(`Error al borrar ventas: ${err.message}`);
        }
    }, [sales]);

    const resetAllData = useCallback(async () => {
        try {
            setIsLoading(true);
            await resetSales();
            await resetCustomers();
            await resetProducts();
            setIsLoading(false);
            alert('¡Sistema reiniciado por completo!');
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Error in total reset:', err);
            setError(`Error en reinicio total: ${err.message}`);
            setIsLoading(false);
        }
    }, [resetSales, resetCustomers, resetProducts]);

    // ────────────────────────────────────────────────
    // Provider
    // ────────────────────────────────────────────────

    // ────────────────────────────────────────────────
    // Ledger Item Management (Edit/Delete)
    // ────────────────────────────────────────────────

    const deletePaymentFromSale = useCallback(async (saleId: string, paymentIndex: number) => {
        try {
            const sale = sales.find(s => s.id === saleId);
            if (!sale || !sale.payments) return;

            const payment = sale.payments[paymentIndex];
            if (!payment) return;

            const batch = writeBatch(db);
            const saleRef = doc(db, COLLECTIONS.sales, saleId);

            const updatedPayments = [...sale.payments];
            updatedPayments.splice(paymentIndex, 1);

            const newRemaining = (sale.remainingBalance || 0) + payment.amount;

            batch.update(saleRef, {
                payments: updatedPayments,
                remainingBalance: newRemaining,
                status: newRemaining <= 0 ? 'Paid' : 'Pending'
            });

            if (sale.customerId) {
                const customer = customers.find(c => c.id === sale.customerId);
                if (customer) {
                    const customerRef = doc(db, COLLECTIONS.customers, customer.id);
                    batch.update(customerRef, {
                        balance: customer.balance + payment.amount
                    });
                }
            }

            await batch.commit();
        } catch (error) {
            console.error('Error deleting payment:', error);
            setError('Error al eliminar el pago');
        }
    }, [sales, customers]);

    const updateSalePrice = useCallback(async (saleId: string, itemIndex: number, newPrice: number) => {
        try {
            const sale = sales.find(s => s.id === saleId);
            if (!sale) return;

            const item = sale.items[itemIndex];
            if (!item) return;

            const diff = newPrice - item.salePrice;
            const batch = writeBatch(db);
            const saleRef = doc(db, COLLECTIONS.sales, saleId);

            const updatedItems = [...sale.items];
            updatedItems[itemIndex] = {
                ...item,
                salePrice: newPrice
            };

            const newTotal = sale.total + diff;
            const newRemaining = (sale.remainingBalance || 0) + diff;

            const product = products.find(p => p.id === item.productId);
            const newProfit = sale.profit + diff;

            batch.update(saleRef, {
                items: updatedItems,
                total: newTotal,
                remainingBalance: newRemaining,
                profit: newProfit,
                status: newRemaining <= 0 ? 'Paid' : 'Pending'
            });

            if (sale.customerId) {
                const customer = customers.find(c => c.id === sale.customerId);
                if (customer) {
                    const customerRef = doc(db, COLLECTIONS.customers, customer.id);
                    batch.update(customerRef, {
                        balance: customer.balance + diff
                    });
                }
            }

            await batch.commit();
        } catch (error) {
            console.error('Error updating sale price:', error);
            setError('Error al actualizar el precio');
        }
    }, [sales, customers, products]);

    return (
        <DataContext.Provider value={{
            products,
            sales,
            customers,
            settings,
            isLoading,
            user,
            addProduct,
            updateProduct,
            deleteProduct,
            processSale,
            addCustomer,
            updateCustomer,
            deleteCustomer,
            deleteSale,
            recordPayment,
            recordInstallmentPayment,
            reverseInstallmentPayment,
            resetAllData,
            resetProducts,
            resetCustomers,
            resetSales,
            updateSettings,
            updateInstallmentDate,
            addPaymentToCustomer,
            registerProductToCustomer,
            getFinancialSummary,
            deletePaymentFromSale,
            updateSalePrice,
            error,
            clearError,
        }}>
            {children}

            {/* Simple Error Overlay */}
            {error && (
                <div className="fixed bottom-4 right-4 z-[999] bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex-1">
                        <p className="font-bold">Error del Sistema</p>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                    <button onClick={clearError} className="p-2 hover:bg-white/20 rounded-lg">✕</button>
                </div>
            )}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
