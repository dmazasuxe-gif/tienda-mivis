
// Build Trigger: 2026-02-21 16:38
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff, ShoppingBag, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
    const { login, register, resetPassword } = useAuth();
    const { settings, updateSettings } = useData();
    const router = useRouter();

    const [isFirstAdmin, setIsFirstAdmin] = useState(false);
    const [loginWithEmail, setLoginWithEmail] = useState(false);
    const [emailInput, setEmailInput] = useState('');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    const [isMounted, setIsMounted] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (settings) {
            setSettingsLoaded(true);
            // If there are NO authorizedAdmins or settings is empty contextually, 
            // we might be in the very first run.
            if (!settings.authorizedAdmins || settings.authorizedAdmins.length === 0) {
                setIsFirstAdmin(true);
                setLoginWithEmail(true);
            }
        }
    }, [settings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const cleanUsername = username.trim().toLowerCase();
        const cleanPassword = password.trim();
        const cleanEmail = emailInput.trim().toLowerCase();

        if (loginWithEmail) {
            if (!cleanEmail || !cleanPassword) {
                setError('Correo y contraseña son obligatorios.');
                return;
            }
        } else {
            if (!cleanUsername || !cleanPassword) {
                setError('Usuario y contraseña son obligatorios.');
                return;
            }
        }

        setLoading(true);
        try {
            if (loginWithEmail) {
                // If it's a manual email login/register
                if (isFirstAdmin) {
                    await register(cleanEmail, cleanPassword);
                    // Initialize settings with this first admin
                    const initialUsername = cleanEmail.split('@')[0];
                    await updateSettings({
                        ...settings,
                        authorizedAdmins: [{ username: initialUsername, password: cleanPassword }]
                    });
                } else {
                    await login(cleanEmail, cleanPassword);
                }
                router.push('/admin');
            } else {
                // Double Security logic: Check list first
                const authorizedFiltered = settings?.authorizedAdmins?.find(
                    a => a.username.trim().toLowerCase() === cleanUsername && a.password.trim() === cleanPassword
                );

                if (!authorizedFiltered) {
                    setError('Usuario o contraseña no autorizados.');
                    setLoading(false);
                    return;
                }

                const virtualEmail = `${cleanUsername}@mivisshoping.com`;
                try {
                    await login(virtualEmail, cleanPassword);
                    router.push('/admin');
                } catch (err: unknown) {
                    const error = err as { code?: string; message?: string };
                    // In newer Firebase versions, invalid-credential is often returned 
                    // instead of user-not-found to prevent enumeration.
                    const isNewUser = error.code === 'auth/user-not-found' ||
                        error.code === 'auth/invalid-credential' ||
                        error.message?.includes('user-not-found');

                    if (isNewUser) {
                        try {
                            await register(virtualEmail, cleanPassword);
                            router.push('/admin');
                        } catch (regErr: unknown) {
                            const error = regErr as { code?: string };
                            if (error.code === 'auth/email-already-in-use') {
                                // User exists but password from authorize list doesn't match Firebase Auth
                                setError('Usuario o contraseña incorrectos.');
                            } else {
                                console.error('Auto-registration error:', regErr);
                                setError('Error de sincronización de seguridad.');
                            }
                        }
                    } else {
                        throw err;
                    }
                }
            }
        } catch (err: unknown) {
            const error = err as { code?: string };
            console.error('Auth error:', err);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setError('Credenciales incorrectas.');
            } else if (error.code === 'auth/email-already-in-use') {
                setError('Este correo ya está registrado.');
            } else {
                setError('Error de acceso. Intenta de nuevo.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        const cleanEmail = emailInput.trim().toLowerCase();
        if (!cleanEmail) {
            setError('Por favor, ingresa tu correo electrónico primero.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await resetPassword(cleanEmail);
            setResetSent(true);
            setTimeout(() => setResetSent(false), 5000);
        } catch (err: unknown) {
            console.error('Reset error:', err);
            setError('Error al enviar el correo de recuperación. Verifica el correo.');
        } finally {
            setLoading(false);
        }
    };

    if (!isMounted) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full max-w-md"
            >
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-500 rounded-3xl shadow-xl shadow-purple-200 mb-4">
                        <ShoppingBag size={36} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800">MivisShoping</h1>
                    <p className="text-gray-500 mt-1">Gestión Avanzada</p>
                </div>

                {/* Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-6">
                        {isFirstAdmin ? 'Configurar Administrador Maestro' : 'Iniciar Sesión'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
                        {isFirstAdmin || loginWithEmail ? (
                            <div className="space-y-1.5">
                                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                                    Correo Electrónico
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    placeholder="ejemplo@correo.com"
                                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-800 placeholder-gray-400"
                                    disabled={loading}
                                />
                            </div>
                        ) : null}

                        {!loginWithEmail && (
                            <div className="space-y-1.5">
                                <label htmlFor="username" className="text-sm font-medium text-gray-700">
                                    Usuario
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Tu usuario"
                                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-800 placeholder-gray-400"
                                    disabled={loading}
                                />
                            </div>
                        )}

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-sm font-medium text-gray-700">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-800 placeholder-gray-400 pr-12"
                                    autoComplete="current-password"
                                    disabled={loading}
                                    suppressHydrationWarning
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Success message */}
                        <AnimatePresence>
                            {resetSent && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm"
                                >
                                    <LogIn size={18} className="rotate-90" />
                                    ¡Correo de recuperación enviado! Revisa tu bandeja.
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Error message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
                                >
                                    <AlertCircle size={18} className="flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={loading || !settingsLoaded}
                            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 text-lg"
                        >
                            {loading || !settingsLoaded ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={22} />
                                    {isFirstAdmin ? 'Registrar y Empezar' : 'Iniciar Sesión'}
                                </>
                            )}
                        </button>

                        {!isFirstAdmin && (
                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLoginWithEmail(!loginWithEmail);
                                        setError('');
                                    }}
                                    className="w-full text-center text-sm text-purple-600 font-medium hover:underline"
                                >
                                    {loginWithEmail ? 'Usar Usuario de Acceso' : 'Usar Correo Electrónico'}
                                </button>

                                {loginWithEmail && (
                                    <button
                                        type="button"
                                        onClick={handleResetPassword}
                                        className="w-full text-center text-xs text-gray-500 hover:text-purple-600 transition-colors"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                )}
                            </div>
                        )}
                    </form>
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">
                    MivisShoping © {isMounted ? new Date().getFullYear() : ''}
                </p>
            </motion.div>
        </div>
    );
}
