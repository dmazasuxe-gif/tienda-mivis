// Redesigned Dashboard with Sale Management & PDF Reports
'use client';

import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
    DollarSign, Package, Users, Activity, TrendingUp,
    ShoppingCart, UserPlus, FileText, ArrowUpRight,
    ArrowDownRight, CreditCard, Trash2, Eye, X, Download,
    Calendar, Tag, User as UserIcon, CheckCircle2, Clock
} from 'lucide-react';
import Link from 'next/link';
import { Sale } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color, gradient }: any) => (
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

const QuickAction = ({ icon: Icon, label, onClick, href, color }: any) => {
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
    const { getFinancialSummary, sales, deleteSale, customers } = useData();
    const summary = getFinancialSummary();
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const recentSales = sales.slice(0, 6);

    // Calculate real sales data for the last 7 days
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toLocaleDateString('es-PE', { weekday: 'short' });
    }).reverse();

    const chartData = last7Days.map(day => {
        const daySales = sales.filter(s => {
            const saleDate = new Date(s.date).toLocaleDateString('es-PE', { weekday: 'short' });
            return saleDate === day;
        });
        const total = daySales.reduce((acc, s) => acc + s.total, 0);
        return { name: day, total };
    });

    const handleDeleteSale = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('¿Estás seguro de eliminar esta venta? El stock y balances serán revertidos.')) {
            await deleteSale(id);
        }
    };

    const generatePdfReport = () => {
        setIsGeneratingPdf(true);
        try {
            const doc = new jsPDF() as any;

            // Header
            doc.setFillColor(139, 92, 246); // Purple-600
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text('MIVISSHOPPING - REPORTE DE VENTAS', 15, 25);
            doc.setFontSize(10);
            doc.text(`Fecha del reporte: ${new Date().toLocaleString()}`, 15, 33);

            // Summary boxes
            doc.setFillColor(243, 244, 246);
            doc.roundedRect(15, 45, 180, 25, 3, 3, 'F');
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(10);
            doc.text(`Total Ventas: S/ ${summary.totalSales.toFixed(2)}`, 25, 55);
            doc.text(`Ganancia Estimada: S/ ${summary.totalProfit.toFixed(2)}`, 25, 62);
            doc.text(`Transacciones: ${sales.length}`, 120, 55);
            doc.text(`Pendiente de Cobro: S/ ${summary.pendingReceivables.toFixed(2)}`, 120, 62);

            // Table Data
            const tableRows = sales.flatMap(sale =>
                sale.items.map(item => [
                    new Date(sale.date).toLocaleDateString(),
                    item.productName,
                    item.quantity.toString(),
                    `S/ ${(item.salePrice || 0).toFixed(2)}`,
                    `S/ ${(item.quantity * (item.salePrice || 0)).toFixed(2)}`,
                    sale.type === 'Cash' ? 'Efectivo' : 'Crédito',
                    sale.status === 'Paid' ? 'Pagado' : 'Pendiente'
                ])
            );

            autoTable(doc, {
                startY: 80,
                head: [['Fecha', 'Producto', 'Cant.', 'Precio Unit.', 'Subtotal', 'Tipo', 'Estado']],
                body: tableRows,
                headStyles: { fillColor: [139, 92, 246] },
                alternateRowStyles: { fillColor: [249, 250, 251] },
                margin: { top: 80 },
            });

            doc.save(`Reporte_Ventas_${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error('PDF Error:', error);
            alert('Error al generar el PDF.');
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
                    <p className="text-gray-500 font-medium mt-1">Gestión avanzada para <span className="text-gray-800 font-bold">MivisShopping</span>.</p>
                </div>

                <div className="bg-white p-4 px-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 flex gap-6">
                    <QuickAction icon={ShoppingCart} label="Nueva Venta" href="/admin/sales" color="purple" />
                    <QuickAction icon={Package} label="Inventario" href="/admin/inventory" color="blue" />
                    <QuickAction icon={Users} label="Clientes" href="/admin/customers" color="orange" />
                    <QuickAction
                        icon={isGeneratingPdf ? Activity : FileText}
                        label={isGeneratingPdf ? "..." : "PDF Reporte"}
                        onClick={generatePdfReport}
                        color="green"
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Ventas Totales" value={`S/ ${summary.totalSales.toLocaleString()}`} icon={DollarSign} trend="up" trendValue="12.5%" color="purple" gradient="from-purple-600 to-pink-500" />
                <StatCard title="Ganancia Neta" value={`S/ ${summary.totalProfit.toLocaleString()}`} icon={Activity} trend="up" trendValue="8.2%" color="green" gradient="from-emerald-500 to-teal-400" />
                <StatCard title="Valor Stock" value={`S/ ${summary.inventoryValue.toLocaleString()}`} icon={Package} color="blue" gradient="from-blue-600 to-indigo-400" />
                <StatCard title="Por Cobrar" value={`S/ ${summary.pendingReceivables.toLocaleString()}`} icon={CreditCard} trend="down" trendValue="2.4%" color="orange" gradient="from-orange-500 to-yellow-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100/50 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-xl font-black text-gray-900">Actividad Semanal</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Evolución real de ventas</p>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }} />
                                <Tooltip cursor={{ stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: '5 5' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }} />
                                <Area type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity Section */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100/50 flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-gray-900">Últimas Ventas</h3>
                        <Link href="/admin/sales" className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors">
                            <ArrowUpRight size={20} />
                        </Link>
                    </div>

                    <div className="space-y-4 flex-1">
                        {recentSales.map((sale) => (
                            <div
                                key={sale.id}
                                onClick={() => setSelectedSale(sale)}
                                className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer border border-transparent hover:border-gray-100 group relative"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${sale.type === 'Credit' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                                        {sale.type === 'Credit' ? <CreditCard size={20} /> : <ShoppingCart size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm truncate max-w-[100px]">{sale.items[0]?.productName || 'Varios'}</p>
                                        <p className="text-[10px] font-black text-gray-400">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="font-black text-gray-900 text-sm">S/ {sale.total.toFixed(2)}</p>
                                        <span className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-lg ${sale.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {sale.status === 'Paid' ? 'Pagado' : 'Crédito'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteSale(e, sale.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
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
                                    onClick={() => setSelectedSale(null)}
                                    className="absolute top-6 right-6 p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
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
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Método</p>
                                            <p className="text-lg font-bold text-purple-600 mt-1">{selectedSale.type === 'Cash' ? 'Efectivo' : 'Crédito'}</p>
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
