
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UIProvider, useUI } from '@/context/UIContext';
import { AdminSidebar } from '@/components/AdminSidebar';
import { useData } from '@/context/DataContext';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { isLoading: dataLoading } = useData();
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Show loading while checking auth or loading data
    if (authLoading || dataLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 font-medium">Cargando Mivis Studio Glam...</p>
                </div>
            </div>
        );
    }

    // Don't render admin content if not logged in
    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans text-slate-900">
            {/* Sidebar */}
            <AdminSidebar />

            {/* Main Content Area */}
            <main
                className={clsx(
                    "flex-1 transition-all duration-300",
                    isSidebarCollapsed ? "pl-0 md:pl-20" : "pl-0 md:pl-64"
                )}
            >
                <div className="pt-16 md:pt-0 p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
}

import clsx from 'clsx';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <UIProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </UIProvider>
    );
}
