
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Users, Store, LogOut, Menu, X, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUI } from '@/context/UIContext';

const menuItems = [
    { name: 'Menu principal', href: '/admin', icon: LayoutDashboard },
    { name: 'Inventario', href: '/admin/inventory', icon: ShoppingBag },
    { name: 'Clientes y Créditos', href: '/admin/customers', icon: Users },
    { name: 'Configuración', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const { isSidebarCollapsed, toggleSidebar } = useUI();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = useCallback(async () => {
        try {
            await logout();
            router.push('/login');
        } catch (e) {
            console.error('Logout error:', e);
        }
    }, [logout, router]);

    // Cerrar sidebar con tecla Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsMobileOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    // Prevenir scroll del body cuando el sidebar está abierto en móvil
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobileOpen]);

    const closeMobileSidebar = useCallback(() => setIsMobileOpen(false), []);

    return (
        <>
            {/* Botón Hamburguesa - Solo visible en móvil */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className={clsx(
                    'fixed top-4 left-4 z-[60] p-2.5 bg-white rounded-xl shadow-lg border border-gray-200 md:hidden transition-all duration-300',
                    isMobileOpen && 'opacity-0 pointer-events-none'
                )}
                aria-label="Abrir menú"
            >
                <Menu size={22} className="text-gray-700" />
            </button>

            {/* Overlay oscuro - Solo en móvil cuando está abierto */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={closeMobileSidebar}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] md:hidden"
                        aria-hidden="true"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={clsx(
                    'fixed left-0 top-0 h-screen transition-all duration-300 ease-in-out bg-white border-r border-gray-200 shadow-sm z-[60] flex flex-col',
                    // En desktop: ancho dinámico
                    isSidebarCollapsed ? 'md:w-20' : 'md:w-64',
                    // En móvil: oculto por defecto, visible cuando isMobileOpen
                    isMobileOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0'
                )}
            >
                {/* Header del sidebar */}
                <div className={clsx(
                    "p-6 border-b border-gray-100 flex items-center justify-between overflow-hidden",
                    isSidebarCollapsed && !isMobileOpen ? "px-4" : "p-6"
                )}>
                    {(!isSidebarCollapsed || isMobileOpen) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="truncate"
                        >
                            <h1 className="text-2xl font-black bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">
                                Mivis Studio Glam
                            </h1>
                            <p className="text-xs text-gray-500 mt-1">Gestión Avanzada</p>
                        </motion.div>
                    )}
                    {isSidebarCollapsed && !isMobileOpen && (
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center text-white shrink-0">
                            <Store size={20} />
                        </div>
                    )}
                    {/* Botón cerrar - Solo en móvil */}
                    <button
                        onClick={closeMobileSidebar}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors md:hidden"
                        aria-label="Cerrar menú"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Toggle Collapse - Solo en desktop */}
                <button
                    onClick={toggleSidebar}
                    className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-400 hover:text-purple-600 hover:border-purple-200 shadow-sm transition-all z-10"
                    title={isSidebarCollapsed ? "Expandir menú" : "Contraer menú"}
                >
                    {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        const showsLabel = !isSidebarCollapsed || isMobileOpen;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMobileSidebar}
                                className={clsx(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative',
                                    isActive
                                        ? 'bg-purple-50 text-purple-700 font-medium shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                    isSidebarCollapsed && !isMobileOpen && 'px-0 justify-center'
                                )}
                                title={!showsLabel ? item.name : undefined}
                            >
                                <item.icon className={clsx('w-5 h-5 shrink-0', isActive ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600')} />
                                {showsLabel && <span className="truncate whitespace-nowrap">{item.name}</span>}
                                {isActive && isSidebarCollapsed && !isMobileOpen && (
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-600 rounded-l-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className={clsx("p-4 border-t border-gray-100 space-y-2", isSidebarCollapsed && !isMobileOpen && "px-2")}>
                    {user && (!isSidebarCollapsed || isMobileOpen) && (
                        <div className="px-4 py-2 text-xs text-gray-500 font-bold truncate" title={user.email || ''}>
                            👤 {user.email?.split('@')[0].toUpperCase()}
                        </div>
                    )}
                    <Link
                        href="/"
                        onClick={closeMobileSidebar}
                        className={clsx(
                            "flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors",
                            isSidebarCollapsed && !isMobileOpen && "px-0 justify-center"
                        )}
                        title={isSidebarCollapsed && !isMobileOpen ? "Ver Tienda" : undefined}
                    >
                        <Store className="w-5 h-5 text-gray-400 shrink-0" />
                        {(!isSidebarCollapsed || isMobileOpen) && <span className="truncate whitespace-nowrap">Ver Tienda</span>}
                    </Link>
                    <button
                        onClick={handleLogout}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors",
                            isSidebarCollapsed && !isMobileOpen && "px-0 justify-center"
                        )}
                        title={isSidebarCollapsed && !isMobileOpen ? "Cerrar Sesión" : undefined}
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        {(!isSidebarCollapsed || isMobileOpen) && <span className="truncate whitespace-nowrap">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
