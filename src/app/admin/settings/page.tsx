
'use client';

import React, { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { MessageCircle, Instagram, Save, Loader2, Smartphone, Facebook, Users, Trash2, UserPlus, Database, Download, Upload, Bell, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function SettingsPage() {
    const { settings, updateSettings, isLoading, products, sales, customers, restoreBackup } = useData();
    const [form, setForm] = useState({
        whatsapp: '',
        instagram: '',
        tiktok: '',
        facebook: '',
        authorizedAdmins: [] as { username: string; password: string }[],
        alarmConfig: {
            enabled: true,
            days: 15
        }
    });
    const [newUser, setNewUser] = useState({ username: '', password: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (settings) {
            setForm({
                whatsapp: settings.whatsapp || '',
                instagram: settings.instagram || '',
                tiktok: settings.tiktok || '',
                facebook: settings.facebook || '',
                authorizedAdmins: settings.authorizedAdmins || [{ username: 'admin', password: 'adminpassword' }],
                alarmConfig: {
                    enabled: settings.alarmConfig?.enabled ?? true,
                    days: settings.alarmConfig?.days ?? 15
                },
            });
        }
    }, [settings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setStatus('idle');
        try {
            await updateSettings(form);
            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            console.error(error);
            setStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadBackup = () => {
        const backupData = {
            products,
            sales,
            customers,
            settings,
            createdAt: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `mivis_backup_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!window.confirm('⚠️ ADVERTENCIA CRÍTICA: Vas a restaurar una copia de seguridad. Esto BORRARÁ todos los datos actuales y los reemplazará con los del archivo. ¿Deseas continuar?')) {
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                await restoreBackup(json);
            } catch (err) {
                console.error('Error parsing backup file:', err);
                alert('Error: El archivo de backup no es válido.');
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Configuración de la Tienda</h1>
                <p className="text-gray-500 mt-2">Gestiona los enlaces de contacto y redes sociales que aparecen en tu tienda.</p>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
            >
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* WhatsApp Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-green-600 mb-2">
                            <MessageCircle size={24} />
                            <h2 className="text-xl font-semibold text-gray-900">WhatsApp</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 ml-1">Número de WhatsApp (9 dígitos)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">+51</span>
                                    <input
                                        type="text"
                                        placeholder="999 999 999"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500 transition-all font-medium"
                                        value={form.whatsapp}
                                        onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                                    />
                                </div>
                                <p className="text-xs text-gray-400 ml-1">Sin espacios ni guiones. Ej: 999509661</p>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-gray-100" />

                    {/* Social Media Links */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 text-purple-600 mb-2">
                            <Smartphone size={24} />
                            <h2 className="text-xl font-semibold text-gray-900">Redes Sociales</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Instagram */}
                            <div className="space-y-2 flex flex-col">
                                <label className="text-sm font-medium text-gray-700 ml-1 flex items-center gap-2">
                                    <Instagram size={16} className="text-pink-500" /> Enlace de Instagram
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://instagram.com/tu_tienda"
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-pink-500 transition-all text-sm"
                                    value={form.instagram}
                                    onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                                />
                            </div>

                            {/* TikTok */}
                            <div className="space-y-2 flex flex-col">
                                <label className="text-sm font-medium text-gray-700 ml-1 flex items-center gap-2">
                                    <svg viewBox="0 0 448 512" fill="currentColor" width="16" height="16">
                                        <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
                                    </svg>
                                    Enlace de TikTok
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://tiktok.com/@tu_tienda"
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all text-sm"
                                    value={form.tiktok}
                                    onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
                                />
                            </div>

                            {/* Facebook */}
                            <div className="space-y-2 flex flex-col">
                                <label className="text-sm font-medium text-gray-700 ml-1 flex items-center gap-2">
                                    <Facebook size={16} className="text-blue-600" /> Enlace de Facebook
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://facebook.com/tu_tienda"
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all text-sm"
                                    value={form.facebook}
                                    onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="h-px bg-gray-100" />

                        {/* Alarm Configuration Section */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 text-orange-600 mb-2">
                                <Bell size={24} />
                                <h2 className="text-xl font-semibold text-gray-900">Alarma de Cobro Automática</h2>
                            </div>

                            <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 space-y-6">
                                <p className="text-sm text-orange-700 font-medium">
                                    Configura los recordatorios por voz para clientes deudores. El sistema notificará automáticamente después de un rango de días tras registrar un pago.
                                </p>

                                <div className="flex items-center gap-4 mb-4">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={form.alarmConfig.enabled}
                                            onChange={(e) => setForm({
                                                ...form,
                                                alarmConfig: { ...form.alarmConfig, enabled: e.target.checked }
                                            })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                        <span className="ml-3 text-sm font-bold text-gray-700">{form.alarmConfig.enabled ? 'Activado' : 'Desactivado'}</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 ml-1">Días para el recordatorio después del pago</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                                            value={form.alarmConfig.days || ''}
                                            placeholder="Ej: 15"
                                            title="Días para el recordatorio"
                                            onChange={(e) => setForm({
                                                ...form,
                                                alarmConfig: { ...form.alarmConfig, days: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 }
                                            })}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-white rounded-2xl border border-orange-50 flex items-start gap-3">
                                    <Volume2 className="text-orange-500 mt-1 shrink-0" size={20} />
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">Mensaje que se escuchará:</p>
                                        <p className="text-xs text-gray-500 italic mt-1">
                                            &quot;Hola Mivis hoy se cumple la fecha para el cobro del cliente [Nombre del Cliente]. no te olvides.&quot;
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!('speechSynthesis' in window)) return;
                                        window.speechSynthesis.cancel();
                                        const utterance = new SpeechSynthesisUtterance("Hola Mivis esto es una prueba de la alarma de cobro. El sistema funciona correctamente.");
                                        utterance.lang = 'es-ES';
                                        window.speechSynthesis.speak(utterance);
                                    }}
                                    className="px-6 py-3 bg-white border border-orange-200 text-orange-600 rounded-2xl font-bold text-sm hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Volume2 size={18} /> Probar Voz de Alarma
                                </button>
                            </div>
                        </section>

                        <div className="h-px bg-gray-100" />

                        {/* Admin Access Control */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 text-red-600 mb-2">
                                <Users size={24} />
                                <h2 className="text-xl font-semibold text-gray-900">Gestión de Accesos (Doble Seguridad)</h2>
                            </div>

                            <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100 space-y-4">
                                <p className="text-sm text-red-700 font-medium">Define qué usuarios pueden ingresar al panel administrativo con su propio usuario y contraseña.</p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Nombre de usuario"
                                        className="px-4 py-3 bg-white border border-red-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none text-sm"
                                        value={newUser.username}
                                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                    />
                                    <input
                                        type="password"
                                        placeholder="Contraseña"
                                        className="px-4 py-3 bg-white border border-red-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none text-sm"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (newUser.username.trim() && newUser.password.trim()) {
                                                const cleanedUser = {
                                                    username: newUser.username.trim(),
                                                    password: newUser.password.trim()
                                                };
                                                setForm({
                                                    ...form,
                                                    authorizedAdmins: [...form.authorizedAdmins, cleanedUser]
                                                });
                                                setNewUser({ username: '', password: '' });
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all text-sm"
                                    >
                                        <UserPlus size={18} /> Agregar
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {form.authorizedAdmins.map((admin, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-red-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                                                    <Users size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{admin.username}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono">**** (Doble Seguridad)</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newList = [...form.authorizedAdmins];
                                                    newList.splice(idx, 1);
                                                    setForm({ ...form, authorizedAdmins: newList });
                                                }}
                                                className="p-2 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                                title="Eliminar Usuario"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </section>

                    <div className="pt-6 flex items-center justify-between">
                        {status === 'success' && (
                            <motion.p
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-green-600 font-medium flex items-center gap-2"
                            >
                                ✅ ¡Configuración guardada!
                            </motion.p>
                        )}
                        {status === 'error' && (
                            <p className="text-red-500 font-medium">❌ Error al guardar</p>
                        )}
                        <div className="flex-1" />
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            )}
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </motion.div>

            {/* Backup & Restore Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-8 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
            >
                <div className="p-8 space-y-6">
                    <div className="flex items-center gap-3 text-blue-600 mb-2">
                        <Database size={24} />
                        <h2 className="text-xl font-semibold text-gray-900">Copia de Seguridad y Restauración</h2>
                    </div>

                    <p className="text-sm text-gray-500">
                        Gestiona tus datos de forma profesional. Puedes descargar una copia completa o restaurar el sistema a un punto anterior.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Download Backup */}
                        <button
                            type="button"
                            onClick={handleDownloadBackup}
                            className="flex items-center justify-center gap-3 p-6 bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-100 transition-all border border-blue-100 group"
                        >
                            <Download className="group-hover:translate-y-1 transition-transform" />
                            <div className="text-left">
                                <p className="font-bold">Descargar Backup</p>
                                <p className="text-[10px] opacity-70 uppercase font-black">Exportar todo a JSON</p>
                            </div>
                        </button>

                        {/* Restore Backup */}
                        <label className="flex items-center justify-center gap-3 p-6 bg-orange-50 text-orange-700 rounded-2xl hover:bg-orange-100 transition-all border border-orange-100 cursor-pointer group">
                            <Upload className="group-hover:-translate-y-1 transition-transform" />
                            <div className="text-left">
                                <p className="font-bold">Restaurar Backup</p>
                                <p className="text-[10px] opacity-70 uppercase font-black">Subir archivo .json</p>
                            </div>
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleRestoreBackup}
                            />
                        </label>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex gap-3">
                        <span className="text-yellow-600 font-bold">⚠️ Nota:</span>
                        <p className="text-xs text-yellow-700 leading-tight">
                            El sistema realiza backups automáticos en la nube cada vez que se crea un producto o venta. Esta sección es para control manual.
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Preview Section */}
            <div className="mt-12 p-6 bg-gray-100/50 rounded-3xl border-2 border-dashed border-gray-200">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Vista previa en tienda</h3>
                <div className="flex flex-wrap gap-4">
                    {/* WhatsApp Preview */}
                    <div className={clsx(
                        "px-6 py-3 bg-white rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm transition-opacity",
                        form.whatsapp.length === 9 ? "opacity-100" : "opacity-40"
                    )}>
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                            <MessageCircle size={16} />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">WhatsApp: {form.whatsapp ? `+51 ${form.whatsapp}` : 'Sin configurar'}</span>
                    </div>

                    {/* Instagram Preview */}
                    <div className={clsx(
                        "px-6 py-3 bg-white rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm transition-opacity",
                        form.instagram ? "opacity-100" : "opacity-40"
                    )}>
                        <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white">
                            <Instagram size={16} />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Instagram {form.instagram ? 'activo' : 'inactivo'}</span>
                    </div>

                    {/* TikTok Preview */}
                    <div className={clsx(
                        "px-6 py-3 bg-white rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm transition-opacity",
                        form.tiktok ? "opacity-100" : "opacity-40"
                    )}>
                        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white">
                            <svg viewBox="0 0 448 512" fill="currentColor" width="16" height="16">
                                <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
                            </svg>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">TikTok {form.tiktok ? 'activo' : 'inactivo'}</span>
                    </div>

                    {/* Facebook Preview */}
                    <div className={clsx(
                        "px-6 py-3 bg-white rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm transition-opacity",
                        form.facebook ? "opacity-100" : "opacity-40"
                    )}>
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                            <Facebook size={16} />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Facebook {form.facebook ? 'activo' : 'inactivo'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
