
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, CreditCard, Users, Store, LogOut, Scan, Menu, X, Settings } from 'lucide-react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const menuItems = [
    { name: 'Menu principal', href: '/admin', icon: LayoutDashboard },
    { name: 'Inventario', href: '/admin/inventory', icon: ShoppingBag },
    { name: 'Ventas y Caja', href: '/admin/sales', icon: CreditCard },
    { name: 'Clientes y Créditos', href: '/admin/customers', icon: Users },
    { name: 'Escanear', href: '/admin/scanner', icon: Scan },
    { name: 'Configuración', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

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
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    // Prevenir scroll del body cuando el sidebar está abierto en móvil
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const closeSidebar = useCallback(() => setIsOpen(false), []);

    return (
        <>
            {/* Botón Hamburguesa - Solo visible en móvil */}
            <button
                onClick={() => setIsOpen(true)}
                className={clsx(
                    'fixed top-4 left-4 z-[60] p-2.5 bg-white rounded-xl shadow-lg border border-gray-200 md:hidden transition-all duration-300',
                    isOpen && 'opacity-0 pointer-events-none'
                )}
                aria-label="Abrir menú"
            >
                <Menu size={22} className="text-gray-700" />
            </button>

            {/* Overlay oscuro - Solo en móvil cuando está abierto */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={closeSidebar}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] md:hidden"
                        aria-hidden="true"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={clsx(
                    'fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 shadow-sm z-[60] flex flex-col transition-transform duration-300 ease-in-out',
                    // En desktop: siempre visible
                    'md:translate-x-0',
                    // En móvil: oculto por defecto, visible cuando isOpen
                    isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                )}
            >
                {/* Header del sidebar con botón cerrar en móvil */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                            MivisShoping
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">Gestión Avanzada</p>
                    </div>
                    {/* Botón cerrar - Solo en móvil */}
                    <button
                        onClick={closeSidebar}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors md:hidden"
                        aria-label="Cerrar menú"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeSidebar}
                                className={clsx(
                                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                                    isActive
                                        ? 'bg-purple-50 text-purple-700 font-medium shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                )}
                            >
                                <item.icon className={clsx('w-5 h-5', isActive ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600')} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100 space-y-2">
                    {user && (
                        <div className="px-4 py-2 text-xs text-gray-500 font-bold truncate" title={user.email || ''}>
                            👤 {user.email?.split('@')[0].toUpperCase()}
                        </div>
                    )}
                    <Link
                        href="/"
                        onClick={closeSidebar}
                        className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                        <Store className="w-5 h-5 text-gray-400" />
                        <span>Ver Tienda</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
