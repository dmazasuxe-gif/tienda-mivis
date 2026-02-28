// Redesigned Dashboard with Sale Management & PDF Reports
'use client';

import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign, Package, Users, Activity,
    ShoppingCart, FileText, ArrowUpRight,
    ArrowDownRight, Trash2, X,
    Calendar, User as UserIcon, CheckCircle2, Clock,
    LucideIcon
} from 'lucide-react';
import Link from 'next/link';
import { Sale } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StatCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    trend?: 'up' | 'down';
    trendValue?: string;
    color: string;
    gradient: string;
}

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color, gradient }: StatCardProps) => (
    <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden p-6 bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 group`}
    >
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-5 rounded-bl-[4rem] group-hover:opacity-10 transition-opacity`} />

        <div className="flex justify-between items-start mb-4">
            <div className={`p-4 bg-gradient-to-br ${gradient} rounded-2xl text-white shadow-lg shadow-${color}-200`}>
                <Icon size={24} />
            </div>
            {trend && (
                <div className={`flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                    {trend === 'up' ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                    {trendValue}
                </div>
            )}
        </div>

        <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</p>
            <h3 className="text-3xl font-black mt-1 text-gray-900 leading-tight">
                {value}
            </h3>
        </div>
    </motion.div>
);

interface QuickActionProps {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    href?: string;
    color: string;
}

const QuickAction = ({ icon: Icon, label, onClick, href, color }: QuickActionProps) => {
    const content = (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 cursor-pointer"
            onClick={onClick}
        >
            <div className={`w-14 h-14 rounded-2xl bg-${color}-50 text-${color}-600 flex items-center justify-center border border-${color}-100 hover:bg-${color}-100 transition-colors shadow-sm`}>
                <Icon size={24} />
            </div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{label}</span>
        </motion.div>
    );

    if (href) return <Link href={href}>{content}</Link>;
    return content;
};

export default function Dashboard() {
    const { getFinancialSummary, sales, customers, products } = useData();
    const summary = getFinancialSummary();
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const { clearSalesData } = useData();

    const handleClearData = async () => {
        if (window.confirm('⚠️ ATENCIÓN: ¿Estás seguro de eliminar TODO el historial de ventas y reinicializar los balances? Esta acción no se puede deshacer.')) {
            await clearSalesData();
        }
    };

    const getPaymentBreakdown = () => {
        const methods = ['Cash', 'Yape', 'Plin', 'Card', 'Transfer', 'Other'];
        const breakdown: Record<string, { total: number; count: number }> = {};

        methods.forEach(m => breakdown[m] = { total: 0, count: 0 });

        sales.forEach(sale => {
            if (sale.payments && sale.payments.length > 0) {
                sale.payments.forEach(p => {
                    const m = p.method as string;
                    if (breakdown[m]) {
                        breakdown[m].total += p.amount;
                        breakdown[m].count += 1;
                    } else {
                        breakdown['Other'].total += p.amount;
                        breakdown['Other'].count += 1;
                    }
                });
            } else if (sale.status === 'Paid') {
                const legacyMethod = sale.type === 'Cash' ? 'Cash' : 'Other';
                breakdown[legacyMethod].total += sale.total;
                breakdown[legacyMethod].count += 1;
            }
        });

        return breakdown;
    };

    const paymentBreakdown = getPaymentBreakdown();




    const generatePdfReport = () => {
        setIsGeneratingPdf(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // --- HEADER ---
            doc.setFillColor(139, 92, 246); // Static Purple
            doc.rect(0, 0, pageWidth, 50, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(28);
            doc.text('MIVISSHOPPING', 15, 25);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('DISTRIBUCIÓN Y VENTA AL POR MAYOR Y MENOR', 15, 33);
            doc.text(`REPORTE GENERAL DE GESTIÓN | ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`, 15, 38);

            // --- SUMMARY CARDS ---
            doc.setFillColor(249, 250, 251);
            doc.roundedRect(10, 55, pageWidth - 20, 45, 5, 5, 'F');

            doc.setTextColor(100, 116, 139);
            doc.setFontSize(8);
            doc.text('RESUMEN FINANCIERO CONSOLIDADO', 15, 62);

            doc.setTextColor(30, 41, 59);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');

            doc.text('VALOR DE INVENTARIO:', 15, 75);
            doc.text(`S/ ${summary.inventoryValue.toFixed(2)}`, 60, 75);

            doc.text('TOTAL DE VENTAS:', 15, 82);
            doc.text(`S/ ${summary.totalSales.toFixed(2)}`, 60, 82);

            doc.text('GANANCIA NETA ESTIMADA:', 110, 75);
            doc.setTextColor(22, 163, 74);
            doc.text(`S/ ${summary.totalProfit.toFixed(2)}`, 160, 75);

            doc.setTextColor(30, 41, 59);
            doc.text('CUENTAS POR COBRAR:', 110, 82);
            doc.setTextColor(220, 38, 38);
            doc.text(`S/ ${summary.pendingReceivables.toFixed(2)}`, 160, 82);

            // --- PAYMENTS BREAKDOWN ---
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(12);
            doc.text('INGRESOS POR MÉTODO DE PAGO', 10, 110);

            const breakdownRows = Object.entries(paymentBreakdown)
                .filter(([, data]) => data.total > 0)
                .map(([method, data]) => [
                    method === 'Cash' ? 'EFECTIVO' : method.toUpperCase(),
                    data.count.toString(),
                    `S/ ${data.total.toFixed(2)}`
                ]);

            autoTable(doc, {
                startY: 115,
                head: [['MÉTODO DE PAGO', 'OPERACIONES', 'MONTO TOTAL COBRADO']],
                body: breakdownRows,
                theme: 'grid',
                headStyles: { fillColor: [139, 92, 246], halign: 'center' },
                columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
                styles: { fontSize: 9 }
            });

            // --- BEST SELLING PRODUCTS ---
            const topProducts = [...products]
                .map(p => ({
                    name: p.name,
                    soldCount: sales.reduce((acc, s) => acc + s.items.filter(i => i.productId === p.id).reduce((sum, item) => sum + item.quantity, 0), 0)
                }))
                .sort((a, b) => b.soldCount - a.soldCount)
                .slice(0, 10)
                .map((p, i) => [(i + 1).toString(), p.name, p.soldCount.toString()]);

            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            const nextY = (doc as any).lastAutoTable.finalY + 15;
            doc.text('RANKING DE PRODUCTOS (TOP 10)', 10, nextY);

            autoTable(doc, {
                startY: nextY + 5,
                head: [['#', 'PRODUCTO', 'UNIDADES VENDIDAS']],
                body: topProducts,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] },
                columnStyles: { 0: { cellWidth: 10 }, 2: { halign: 'center' } },
                styles: { fontSize: 9 }
            });

            // --- FULL TRANSACTION LOG (New Page) ---
            doc.addPage();
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(14);
            doc.text('HISTORIAL DETALLADO DE TRANSACCIONES', 10, 20);

            const tableRows = sales.map(sale => {
                const customer = customers.find(c => c.id === sale.customerId);
                const customerName = customer ? customer.name.toUpperCase() : 'CLIENTE GENERAL';

                let tipoStatus = '';
                if (sale.type === 'Cash') {
                    tipoStatus = 'CONTADO (EFECTIVO)';
                } else {
                    tipoStatus = sale.remainingBalance && sale.remainingBalance > 0
                        ? 'CRÉDITO / PAGANDO DE A POCOS'
                        : 'PAGO AL CONTADO';
                }

                return [
                    new Date(sale.date).toLocaleDateString('es-PE'),
                    sale.id.substring(0, 6).toUpperCase(),
                    `${customerName}\n${sale.items.map(i => `• ${i.productName} (x${i.quantity})`).join('\n')}`,
                    tipoStatus,
                    `S/ ${sale.total.toFixed(2)}`,
                    sale.remainingBalance && sale.remainingBalance > 0 ? `S/ ${sale.remainingBalance.toFixed(2)}` : 'S/ 0.00 (PAGADO)'
                ];
            });

            autoTable(doc, {
                startY: 25,
                head: [['FECHA', 'TICKET', 'DETALLE PRODUCTOS', 'TIPO', 'TOTAL', 'PENDIENTE']],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [30, 41, 59] },
                styles: { fontSize: 8 },
                columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
            });

            // Footer
            const totalPages = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Página ${i} de ${totalPages} - Generado por Sistema Mivis Studio Glam`, pageWidth / 2, 290, { align: 'center' });
            }

            doc.save(`Reporte_MivisStudioGlam_${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error('PDF Error:', error);
            alert('Error al generar el PDF detallado.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="space-y-10 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        Menu principal <span className="text-purple-600">Integral</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Gestión avanzada para <span className="text-gray-800 font-bold">Mivis Studio Glam</span>.</p>
                </div>

                <div className="bg-white p-4 px-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 flex gap-6">
                    <QuickAction icon={ShoppingCart} label="Nueva Venta" href="/admin/customers" color="purple" />
                    <QuickAction icon={Package} label="Inventario" href="/admin/inventory" color="blue" />
                    <QuickAction icon={Users} label="Clientes" href="/admin/customers" color="orange" />
                    <QuickAction
                        icon={isGeneratingPdf ? Activity : FileText}
                        label={isGeneratingPdf ? "..." : "PDF"}
                        onClick={generatePdfReport}
                        color="red"
                    />

                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Valor Stock"
                    value={`S/ ${summary.inventoryValue.toFixed(2)}`}
                    icon={Package}
                    color="orange"
                    gradient="from-orange-500 to-amber-500"
                />
                <StatCard
                    title="Ventas Totales"
                    value={`S/ ${summary.totalSales.toFixed(2)}`}
                    icon={ShoppingCart}
                    color="purple"
                    gradient="from-purple-600 to-pink-600"
                />
                <StatCard
                    title="Ganancia Neta"
                    value={`S/ ${summary.totalProfit.toFixed(2)}`}
                    icon={DollarSign}
                    color="green"
                    gradient="from-green-500 to-emerald-500"
                />
                <StatCard
                    title="Por Cobrar"
                    value={`S/ ${summary.pendingReceivables.toFixed(2)}`}
                    icon={Users}
                    color="blue"
                    gradient="from-blue-500 to-indigo-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sales Performance Area */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100/50 relative overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-xl font-black text-gray-900">Rendimiento de Productos</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Más vendidos vs Menos vendidos</p>
                        </div>
                        <button
                            onClick={handleClearData}
                            className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all shadow-sm border border-red-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        >
                            <Trash2 size={16} /> Limpiar Historial
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                        {/* More Sold */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-2 px-1">
                                <ArrowUpRight size={14} /> Los 5 Más Vendidos
                            </h4>
                            <div className="space-y-2">
                                {[...products]
                                    .map(p => ({
                                        ...p,
                                        soldCount: sales.reduce((acc, s) => acc + s.items.filter(i => i.productId === p.id).reduce((sum, item) => sum + item.quantity, 0), 0)
                                    }))
                                    .sort((a, b) => b.soldCount - a.soldCount)
                                    .slice(0, 5)
                                    .map((p, idx) => (
                                        <div key={p.id} className="flex items-center justify-between p-3 bg-green-50/20 rounded-2xl border border-green-50/50">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-green-200 w-4">{idx + 1}</span>
                                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shrink-0 shadow-sm border border-green-50">
                                                    {p.images?.[0] ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={16} /></div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">{p.soldCount} Vendidos</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Less Sold */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2 px-1">
                                <ArrowDownRight size={14} /> Los 5 Menos Vendidos
                            </h4>
                            <div className="space-y-2">
                                {[...products]
                                    .map(p => ({
                                        ...p,
                                        soldCount: sales.reduce((acc, s) => acc + s.items.filter(i => i.productId === p.id).reduce((sum, item) => sum + item.quantity, 0), 0)
                                    }))
                                    .sort((a, b) => a.soldCount - b.soldCount)
                                    .slice(0, 5)
                                    .map((p, idx) => (
                                        <div key={p.id} className="flex items-center justify-between p-3 bg-red-50/20 rounded-2xl border border-red-50/50">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-red-200 w-4">{idx + 1}</span>
                                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shrink-0 shadow-sm border border-red-50">
                                                    {p.images?.[0] ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={16} /></div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">{p.soldCount} Vendidos</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    {/* Payment Breakdown Sidebar */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100/50 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-gray-900">Cobros por Método</h3>
                            <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                                <DollarSign size={20} />
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="overflow-hidden rounded-2xl border border-gray-100">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Método</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cant.</th>
                                            <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {Object.entries(paymentBreakdown)
                                            .filter(([, data]) => data.total > 0)
                                            .map(([method, data]) => (
                                                <tr key={method} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3 text-sm font-bold text-gray-700">{method === 'Cash' ? 'efectivo' : method === 'Transfer' ? 'transferencia' : method.toLowerCase()}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-400 text-center">{data.count}</td>
                                                    <td className="px-4 py-3 text-sm font-black text-gray-900 text-right">S/ {data.total.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                    <tfoot className="bg-purple-50">
                                        <tr>
                                            <td className="px-4 py-3 text-xs font-black text-purple-700">TOTAL COBRADO</td>
                                            <td className="px-4 py-3 text-xs font-black text-purple-400 text-center">
                                                {Object.values(paymentBreakdown).reduce((a, b) => a + b.count, 0)}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-black text-purple-700 text-right">
                                                S/ {Object.values(paymentBreakdown).reduce((a, b) => a + b.total, 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <button
                                onClick={handleClearData}
                                className="w-full py-4 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-100 transition-all border border-orange-100 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest mt-4"
                            >
                                <Trash2 size={16} /> Reiniciar Estadísticas
                            </button>
                            <p className="text-[10px] text-gray-400 italic mt-2">Dinero real ingresado (Ventas al contado y abonos).</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sale Detail Modal */}
            <AnimatePresence>
                {selectedSale && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedSale(null)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm [webkit-backdrop-filter:blur(4px)]"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white relative">
                                <button
                                    type="button"
                                    onClick={() => setSelectedSale(null)}
                                    className="absolute top-6 right-6 p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
                                    title="Cerrar"
                                >
                                    <X size={20} />
                                </button>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Detalles de Transacción</p>
                                <h3 className="text-3xl font-black mt-2">Venta #{selectedSale.id.substring(0, 6)}</h3>
                                <div className="flex gap-4 mt-6">
                                    <div className="flex items-center gap-2 text-xs font-bold bg-white/10 px-3 py-2 rounded-xl">
                                        <Calendar size={14} />
                                        {new Date(selectedSale.date).toLocaleString()}
                                    </div>
                                    <div className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl ${selectedSale.status === 'Paid' ? 'bg-green-400/20 text-green-100' : 'bg-orange-400/20 text-orange-100'
                                        }`}>
                                        {selectedSale.status === 'Paid' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                        {selectedSale.status === 'Paid' ? 'Completado' : 'Pendiente'}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                {/* Customer Info */}
                                {selectedSale.customerId && (
                                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-600">
                                            <UserIcon size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
                                            <p className="font-bold text-gray-900 leading-tight">
                                                {customers.find(c => c.id === selectedSale.customerId)?.name || "Cargando..."}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Items List */}
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Productos</p>
                                    <div className="space-y-3">
                                        {selectedSale.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl hover:border-purple-200 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-[10px] font-bold">
                                                        {item.quantity}x
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-800">{item.productName}</span>
                                                </div>
                                                <span className="text-sm font-black text-gray-900">S/ {(item.quantity * (item.salePrice || 0)).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Financial Footer */}
                                <div className="pt-6 border-t border-gray-100">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Pagado</p>
                                            <p className="text-3xl font-black text-gray-900 mt-1">S/ {selectedSale.total.toFixed(2)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Tipo</p>
                                            <p className="text-lg font-bold text-purple-600 mt-1">{selectedSale.type === 'Cash' ? 'Contado' : 'Crédito'}</p>
                                        </div>
                                    </div>

                                    {selectedSale.type === 'Credit' && (
                                        <div className="mt-4 p-3 bg-orange-50 rounded-xl flex items-center justify-between">
                                            <span className="text-xs font-bold text-orange-700">Saldo Pendiente:</span>
                                            <span className="text-sm font-black text-orange-800">S/ {(selectedSale.remainingBalance || 0).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
