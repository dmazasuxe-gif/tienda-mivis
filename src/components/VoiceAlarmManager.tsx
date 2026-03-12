'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useData } from '@/context/DataContext';
import { Bell, Volume2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const VoiceAlarmManager: React.FC = () => {
    const { customers, settings, updateAlarmStatus } = useData();
    const [activeAlarm, setActiveAlarm] = useState<{ customerId: string, alarmId: string, clientName: string } | null>(null);
    const [isCooldown, setIsCooldown] = useState(false); // Estado para dar un respiro entre alarmas
    const lastPlayedIdRef = useRef<string | null>(null);
    const isPlayingRef = useRef<boolean>(false);

    /**
     * Configuración de Voz Amigable, Alegre y Pausada
     */
    const playVoice = useCallback((clientName: string, customerId: string, alarmId: string) => {
        if (!('speechSynthesis' in window) || isPlayingRef.current) return;

        isPlayingRef.current = true;
        window.speechSynthesis.cancel();

        const greeting = "¡Hola Mivis! ";
        const body = `Hoy se cumple la fecha para el cobro del cliente ${clientName}. No te olvides de contactarlo. ¡Que tengas un lindo día!`;
        const utterance = new SpeechSynthesisUtterance(greeting + body);

        utterance.lang = 'es-ES';
        utterance.rate = 0.8;
        utterance.pitch = 1.2;
        utterance.volume = 1;

        utterance.onend = () => {
            isPlayingRef.current = false;
            // Al terminar la voz, marcamos que ya sonó una vez en esta sesión
            const customer = customers.find(c => c.id === customerId);
            const alarm = customer?.pendingAlarms?.find(a => a.id === alarmId);

            if (alarm) {
                const newCount = (alarm.playedCount || 0) + 1;
                updateAlarmStatus(customerId, alarmId, {
                    playedCount: newCount,
                    isCompleted: newCount >= 3
                });
            }
            lastPlayedIdRef.current = alarmId;
        };

        utterance.onerror = (event) => {
            isPlayingRef.current = false;
            const errorType = (event as any).error;
            if (errorType !== 'interrupted' && errorType !== 'canceled') {
                console.error("Error en la síntesis de voz:", errorType);
            }
        };

        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 1000);

    }, [customers, updateAlarmStatus]);

    /**
     * Buscador Inteligente de Alarmas (Uno a la vez)
     */
    useEffect(() => {
        // Si la alarma está desactivada, hay una activa ahora, o estamos en "respiro", no buscamos
        if (!settings.alarmConfig?.enabled || !customers.length || activeAlarm || isCooldown || isPlayingRef.current) return;

        const checkNextInQueue = () => {
            const now = new Date();

            // Buscamos en todos los clientes de forma ordenada
            for (const customer of customers) {
                if (!customer.pendingAlarms || !customer.pendingAlarms.length) continue;

                // Ordenamos las alarmas por fecha para alertar primero lo más viejo
                const sortedAlarms = [...customer.pendingAlarms].sort((a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                );

                for (const alarm of sortedAlarms) {
                    const alarmDate = new Date(alarm.date);

                    // Si la alarma es para hoy o antes, no está completada y no ha sonado 3 veces
                    if (!alarm.isCompleted && (alarm.playedCount || 0) < 3 && alarmDate <= now) {
                        // Si es la misma que acabamos de cerrar, pasamos a la siguiente para no buclear
                        if (lastPlayedIdRef.current === alarm.id) continue;

                        setActiveAlarm({
                            customerId: customer.id,
                            alarmId: alarm.id,
                            clientName: alarm.clientName || 'Cliente'
                        });
                        return; // Detenemos la búsqueda aquí para solo activar UNA
                    }
                }
            }
        };

        const searchTimer = setTimeout(checkNextInQueue, 3000); // Check cada 3 seg
        return () => clearTimeout(searchTimer);
    }, [customers, settings.alarmConfig, activeAlarm, isCooldown]);

    useEffect(() => {
        if (activeAlarm) {
            playVoice(activeAlarm.clientName, activeAlarm.customerId, activeAlarm.alarmId);
        }
    }, [activeAlarm, playVoice]);

    /**
     * Manejo del Botón ENTENDIDO con Respiro Inteligente
     */
    const handleDismiss = () => {
        window.speechSynthesis.cancel();
        isPlayingRef.current = false;

        if (activeAlarm) {
            // Marcamos como completada para que no vuelva a sonar este ID
            updateAlarmStatus(activeAlarm.customerId, activeAlarm.alarmId, { isCompleted: true });
            lastPlayedIdRef.current = activeAlarm.alarmId;
            setActiveAlarm(null);

            // ACTIVAMOS EL RESPIRO DE 5 SEGUNDOS
            setIsCooldown(true);
            setTimeout(() => {
                setIsCooldown(false);
                lastPlayedIdRef.current = null; // Limpiamos para permitir nuevas búsquedas
            }, 5000);
        }
    };

    if (!activeAlarm) return null;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={`intelligent-alarm-${activeAlarm.alarmId}`}
                initial={{ opacity: 0, x: 100, scale: 0.9, y: 0 }}
                animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                className="fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-white rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.15)] border-4 border-orange-50 overflow-hidden"
            >
                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4 text-orange-600">
                            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center shadow-inner">
                                <Bell className="animate-tada" size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 leading-none text-base uppercase tracking-tight">Recordatorio</h3>
                                <p className="text-orange-600 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Siguiente en fila</p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-300 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50/50 to-white p-6 rounded-3xl mb-8 border border-orange-100/50 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-5">
                            <Volume2 size={60} />
                        </div>
                        <p className="text-sm text-gray-800 font-bold leading-relaxed relative z-10">
                            &quot;¡Hola Mivis! Hoy toca cobrar a <span className="text-orange-600 font-black px-1 bg-orange-100 rounded-md">{activeAlarm.clientName}</span>.&quot;
                        </p>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="w-full py-5 bg-orange-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.1em] hover:bg-orange-700 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-orange-200"
                    >
                        Entendido
                    </button>
                </div>

                {/* Barra de respiro (coordinada con la voz) */}
                <div className="h-1.5 bg-gray-50 w-full">
                    <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 10, ease: "linear" }}
                        className="h-full bg-orange-500"
                    />
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
