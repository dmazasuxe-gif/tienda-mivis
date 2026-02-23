
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { Product } from '@/lib/types';
import { ProductModal } from '@/components/ProductModal';
import {
    Scan, Plus, Search, Camera, AlertTriangle,
    RefreshCw, Keyboard, CheckCircle2, Video, ImageIcon, StopCircle
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

type ScanStatus = 'IDLE' | 'SCANNING' | 'PROCESSING' | 'FOUND' | 'NOT_FOUND' | 'ERROR';

export default function ScannerPage() {
    const { products, addProduct, updateProduct } = useData();
    const [data, setData] = useState<string | null>(null);
    const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [scanStatus, setScanStatus] = useState<ScanStatus>('IDLE');
    const [errorMessage, setErrorMessage] = useState('');
    const [manualBarcode, setManualBarcode] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

    const scannerRef = useRef<{ isScanning?: boolean; stop?: () => Promise<void>; clear?: () => void } | null>(null);
    const isMountedRef = useRef(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check camera availability on mount
    useEffect(() => {
        isMountedRef.current = true;

        const checkCamera = async () => {
            try {
                // getUserMedia only works on secure contexts (HTTPS or localhost)
                if (!window.isSecureContext) {
                    setCameraAvailable(false);
                    return;
                }
                if (!navigator?.mediaDevices?.getUserMedia) {
                    setCameraAvailable(false);
                    return;
                }
                // Quick check — request and immediately stop
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                stream.getTracks().forEach(t => t.stop());
                setCameraAvailable(true);
            } catch {
                setCameraAvailable(false);
            }
        };
        checkCamera();

        return () => {
            isMountedRef.current = false;
            cleanupScanner();
        };
    }, []);

    const cleanupScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                const scanner = scannerRef.current;
                scannerRef.current = null;
                if (scanner.isScanning && scanner.stop) {
                    await scanner.stop();
                }
                if (scanner.clear) {
                    scanner.clear();
                }
            } catch (e) {
                console.warn('Scanner cleanup:', e);
            }
        }
    }, []);

    const handleScanResult = useCallback((decodedText: string) => {
        if (!isMountedRef.current) return;

        setData(decodedText);
        const found = products.find(p => p.barcode === decodedText);
        if (found) {
            setScannedProduct(found);
            setScanStatus('FOUND');
        } else {
            setScannedProduct(null);
            setScanStatus('NOT_FOUND');
        }
        cleanupScanner();
    }, [products, cleanupScanner]);

    // ========== LIVE CAMERA MODE ==========
    const startLiveScan = useCallback(async () => {
        setData(null);
        setScannedProduct(null);
        setErrorMessage('');
        setPreviewUrl(null);
        setScanStatus('SCANNING');

        // Wait for DOM to render
        await new Promise(resolve => setTimeout(resolve, 400));

        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            await cleanupScanner();

            const readerEl = document.getElementById('scanner-live-reader');
            if (!readerEl) {
                throw new Error('Reader element not found');
            }

            const scanner = new Html5Qrcode('scanner-live-reader');
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 15,
                    qrbox: { width: 250, height: 150 },
                    aspectRatio: 1.333,
                },
                (decodedText: string) => {
                    // Vibrate on success if supported
                    if (navigator.vibrate) navigator.vibrate(200);
                    handleScanResult(decodedText);
                },
                () => { /* ignore scan misses */ }
            );
        } catch (err: unknown) {
            console.error('Live scan error:', err);
            const errorStr = String(err);

            if (isMountedRef.current) {
                // If live camera genuinely fails, fall back gracefully
                if (errorStr.includes('NotAllowed')) {
                    setErrorMessage('Permiso de cámara denegado. Habilita el acceso en la configuración del navegador y recarga.');
                } else if (errorStr.includes('NotFound') || errorStr.includes('Requested device not found')) {
                    setErrorMessage('No se encontró ninguna cámara.');
                } else if (errorStr.includes('NotReadable')) {
                    setErrorMessage('La cámara está siendo usada por otra aplicación.');
                } else {
                    setErrorMessage('No se pudo iniciar la cámara. Intenta usar el modo "Tomar Foto".');
                }
                setScanStatus('ERROR');
            }
        }
    }, [cleanupScanner, handleScanResult]);

    const stopLiveScan = useCallback(async () => {
        await cleanupScanner();
        if (isMountedRef.current) setScanStatus('IDLE');
    }, [cleanupScanner]);

    // ========== PHOTO CAPTURE MODE ==========
    const triggerPhotoCapture = useCallback(() => {
        setData(null);
        setScannedProduct(null);
        setErrorMessage('');
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    }, []);

    const handlePhotoCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScanStatus('PROCESSING');
        setPreviewUrl(URL.createObjectURL(file));

        try {
            // Process image for better detection
            const processedImg = await processImage(file);

            // Method 1: BarcodeDetector API (native — most reliable)
            if ('BarcodeDetector' in window) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const BDClass = (window as any).BarcodeDetector;
                    const detector = new BDClass({
                        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'code_93',
                            'upc_a', 'upc_e', 'itf', 'codabar', 'qr_code', 'data_matrix']
                    });
                    const barcodes = await detector.detect(processedImg);
                    if (barcodes?.length > 0) {
                        handleScanResult(barcodes[0].rawValue);
                        return;
                    }
                } catch { /* fallback */ }
            }

            // Method 2: html5-qrcode scanFile
            const { Html5Qrcode } = await import('html5-qrcode');
            const scanner = new Html5Qrcode('scanner-photo-decoder');
            const result = await scanner.scanFile(file, true);
            scanner.clear();
            handleScanResult(result);
        } catch {
            if (isMountedRef.current) {
                setErrorMessage(
                    'No se detectó código de barras.\n• Acerca más la cámara al código\n• Asegúrate de buena iluminación\n• El código debe estar enfocado'
                );
                setScanStatus('ERROR');
            }
        }
    }, [handleScanResult]);

    // ========== MANUAL ENTRY ==========
    const handleManualSubmit = useCallback(() => {
        const trimmed = manualBarcode.trim();
        if (!trimmed) return;
        handleScanResult(trimmed);
        setManualBarcode('');
        setShowManualInput(false);
    }, [manualBarcode, handleScanResult]);

    // ========== PRODUCT ACTIONS ==========
    const resetScanner = () => {
        cleanupScanner();
        setScanStatus('IDLE');
        setData(null);
        setScannedProduct(null);
        setErrorMessage('');
        setPreviewUrl(null);
    };

    const handleCreateProduct = () => { setScannedProduct(null); setIsModalOpen(true); };
    const handleEditProduct = () => { if (scannedProduct) setIsModalOpen(true); };

    const onModalSubmit = (productData: Partial<Product>) => {
        if (scannedProduct) {
            updateProduct(scannedProduct.id, productData);
        } else {
            addProduct({ ...productData, id: Math.random().toString(36).substr(2, 9), active: true } as Product);
        }
        setIsModalOpen(false);
        resetScanner();
    };

    const modalInitialData = scannedProduct
        ? scannedProduct
        : (data ? { barcode: data, images: [] } as Partial<Product> : null);

    return (
        <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
                    <Scan className="text-purple-600" />
                    Escáner
                </h1>
                <p className="text-gray-500 mt-2">Escanea un código de barras para buscar o crear producto.</p>
            </div>

            {/* Hidden elements */}
            <input ref={fileInputRef} type="file" accept="image/*"
                /* eslint-disable-next-line react/no-unknown-property */
                capture="environment"
                onChange={handlePhotoCapture} className="hidden" aria-label="Capturar foto" />
            <div id="scanner-photo-decoder" className="hidden" aria-hidden="true" />

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 relative min-h-[420px] flex flex-col">

                {/* ===== IDLE STATE ===== */}
                {scanStatus === 'IDLE' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5">
                        <div className="w-28 h-28 bg-gradient-to-br from-purple-50 to-pink-50 rounded-full flex items-center justify-center text-purple-300 animate-pulse">
                            <Scan size={56} />
                        </div>

                        {/* Botón principal: LIVE SCAN si cámara disponible */}
                        {cameraAvailable && (
                            <button
                                onClick={startLiveScan}
                                className="w-full max-w-xs px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 text-lg"
                            >
                                <Video size={26} />
                                Escaneo en Vivo
                            </button>
                        )}

                        {/* Botón foto: secundario si live disponible, primario si no */}
                        <button
                            onClick={triggerPhotoCapture}
                            className={`w-full max-w-xs px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 ${cameraAvailable
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 text-base'
                                : 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] text-lg'
                                }`}
                        >
                            <Camera size={cameraAvailable ? 20 : 26} />
                            {cameraAvailable ? 'Tomar Foto del Código' : 'Escanear Código'}
                        </button>

                        {!cameraAvailable && cameraAvailable !== null && (
                            <p className="text-xs text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 max-w-xs">
                                📷 Cámara en vivo no disponible. Se requiere <strong>HTTPS</strong> para escaneo automático.
                            </p>
                        )}

                        {/* Separador */}
                        <div className="w-full max-w-xs flex items-center gap-3 text-gray-300">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs font-medium">o</span>
                            <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        {/* Manual entry */}
                        <button
                            onClick={() => setShowManualInput(!showManualInput)}
                            className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm"
                        >
                            <Keyboard size={18} />
                            Ingresar código manual
                        </button>

                        {showManualInput && (
                            <div className="w-full max-w-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <input
                                    type="text" value={manualBarcode}
                                    onChange={(e) => setManualBarcode(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                                    placeholder="Código de barras..."
                                    className="w-full p-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-center font-mono text-lg tracking-wider"
                                    autoFocus
                                />
                                <button
                                    onClick={handleManualSubmit} disabled={!manualBarcode.trim()}
                                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold disabled:opacity-40 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Search size={18} /> Buscar
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== LIVE SCANNING STATE ===== */}
                {scanStatus === 'SCANNING' && (
                    <div className="flex-1 bg-black relative">
                        <div id="scanner-live-reader" className="w-full min-h-[380px]" />

                        {/* Scanning HUD */}
                        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-semibold z-10">
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                            Apunta al código de barras
                        </div>

                        <button
                            onClick={stopLiveScan}
                            className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition-colors z-10 flex items-center gap-2"
                        >
                            <StopCircle size={16} />
                            Cerrar
                        </button>

                        {/* Also offer photo mode while scanning */}
                        <button
                            onClick={() => { stopLiveScan(); triggerPhotoCapture(); }}
                            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-medium hover:bg-white/30 transition-colors z-10 flex items-center gap-2"
                        >
                            <ImageIcon size={14} />
                            Tomar Foto
                        </button>
                    </div>
                )}

                {/* ===== PROCESSING (photo mode) ===== */}
                {scanStatus === 'PROCESSING' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                        {previewUrl && (
                            <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-purple-200 shadow-lg mb-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={previewUrl} alt="Foto capturada" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-purple-500">
                            <RefreshCw size={32} className="animate-spin" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-700">Analizando imagen...</h2>
                    </div>
                )}

                {/* ===== ERROR STATE ===== */}
                {scanStatus === 'ERROR' && (
                    <div className="flex-1 p-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-400 mb-4">
                            <AlertTriangle size={36} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 mb-2">Error</h2>
                        <div className="text-sm text-gray-500 mb-6 max-w-sm whitespace-pre-line bg-gray-50 p-4 rounded-xl text-left">
                            {errorMessage}
                        </div>
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            {cameraAvailable && (
                                <button onClick={startLiveScan}
                                    className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 flex items-center justify-center gap-2">
                                    <Video size={18} /> Reintentar Escaneo
                                </button>
                            )}
                            <button onClick={triggerPhotoCapture}
                                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                                <Camera size={18} /> Tomar Foto
                            </button>
                            <button onClick={() => { resetScanner(); setShowManualInput(true); }}
                                className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-2">
                                <Keyboard size={16} /> Ingresar manualmente
                            </button>
                        </div>
                    </div>
                )}

                {/* ===== FOUND STATE ===== */}
                {scanStatus === 'FOUND' && scannedProduct && (
                    <div className="flex-1 p-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                            <CheckCircle2 size={48} />
                        </div>
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full mb-3">¡Producto encontrado!</span>
                        <h2 className="text-2xl font-bold text-gray-800">{scannedProduct.name}</h2>
                        <p className="text-gray-400 font-mono text-sm mt-1">{scannedProduct.barcode}</p>
                        <div className="text-3xl font-bold text-purple-600 mt-3 mb-1">S/ {scannedProduct.salePrice.toFixed(2)}</div>
                        <div className="flex gap-6 text-sm text-gray-500 mb-8">
                            <span>Stock: <strong className="text-gray-800">{scannedProduct.stock}</strong></span>
                            <span>Costo: <strong className="text-gray-800">S/ {scannedProduct.costPrice.toFixed(2)}</strong></span>
                        </div>
                        <div className="flex gap-3 w-full max-w-xs">
                            <button onClick={handleEditProduct}
                                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200">
                                Editar
                            </button>
                            <button onClick={cameraAvailable ? startLiveScan : triggerPhotoCapture}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                                Escanear Otro
                            </button>
                        </div>
                    </div>
                )}

                {/* ===== NOT FOUND STATE ===== */}
                {scanStatus === 'NOT_FOUND' && (
                    <div className="flex-1 p-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 mb-4">
                            <Search size={44} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Producto No Registrado</h2>
                        <p className="text-gray-500 mt-2 mb-6">
                            Código: <span className="font-mono bg-gray-100 px-3 py-1 rounded-lg text-gray-800 font-bold">{data}</span>
                        </p>
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <button onClick={handleCreateProduct}
                                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 shadow-lg shadow-gray-300 flex items-center justify-center gap-2">
                                <Plus size={20} /> Crear Producto
                            </button>
                            <button onClick={cameraAvailable ? startLiveScan : triggerPhotoCapture}
                                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                                Escanear Otro
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <ProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                        onSubmit={onModalSubmit} initialData={modalInitialData as Product | null} />
                )}
            </AnimatePresence>
        </div>
    );
}

/** Process image: resize and improve for barcode detection */
async function processImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX = 1280;
            let w = img.width, h = img.height;
            if (w > MAX || h > MAX) {
                if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                else { w = Math.round(w * MAX / h); h = MAX; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('No canvas')); return; }
            ctx.drawImage(img, 0, 0, w, h);

            // Enhance contrast
            try {
                const imageData = ctx.getImageData(0, 0, w, h);
                const d = imageData.data;
                const factor = 1.3;
                const intercept = 128 * (1 - factor);
                for (let i = 0; i < d.length; i += 4) {
                    d[i] = Math.min(255, Math.max(0, d[i] * factor + intercept));
                    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] * factor + intercept));
                    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] * factor + intercept));
                }
                ctx.putImageData(imageData, 0, 0);
            } catch { /* continue without enhancement */ }

            const result = new Image();
            result.onload = () => resolve(result);
            result.onerror = reject;
            result.src = canvas.toDataURL('image/png');
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}
