
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface UIContextType {
    isSidebarCollapsed: boolean;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Persist preference
    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved === 'true') setIsSidebarCollapsed(true);
    }, []);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => {
            const newValue = !prev;
            localStorage.setItem('sidebarCollapsed', String(newValue));
            return newValue;
        });
    };

    const setSidebarCollapsed = (collapsed: boolean) => {
        setIsSidebarCollapsed(collapsed);
        localStorage.setItem('sidebarCollapsed', String(collapsed));
    };

    return (
        <UIContext.Provider value={{ isSidebarCollapsed, toggleSidebar, setSidebarCollapsed }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within a UIProvider');
    return context;
};
