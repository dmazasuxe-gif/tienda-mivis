'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UIProvider, useUI } from '@/context/UIContext';
import { AdminSidebar } from '@/components/AdminSidebar';
import { useData } from '@/context/DataContext';
import dynamic from 'next/dynamic';
import clsx from 'clsx';

// Cargamos el gestor de alarmas solo en el cliente para no ralentizar el servidor
const VoiceAlarmManager = dynamic(
    () => import('@/components/VoiceAlarmManager').then(mod => mod.VoiceAlarmManager),
    { ssr: false }
);

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { isLoading: dataLoading } = useData();
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    if (authLoading || dataLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 font-medium tracking-tight">Cargando Mivis Studio Glam...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans text-slate-900 overflow-x-hidden">
            <AdminSidebar />

            {/* Solo se activa en el cliente una vez cargado todo el sistema */}
            <VoiceAlarmManager />

            <main
                className={clsx(
                    "flex-1 transition-all duration-300 ease-in-out",
                    isSidebarCollapsed ? "pl-0 md:pl-20" : "pl-0 md:pl-64"
                )}
            >
                <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <UIProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </UIProvider>
    );
}
