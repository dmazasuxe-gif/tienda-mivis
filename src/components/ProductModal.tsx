
'use client';

import { useForm } from 'react-hook-form';
import { Product } from '@/lib/types';
import { X, Camera, Upload, Trash, Image as ImageIcon, RefreshCw, Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { compressImage } from '@/lib/imageUtils';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Product>) => void;
    initialData?: Product | null;
}

export function ProductModal({ isOpen, onClose, onSubmit, initialData }: ProductModalProps) {
    const { register, handleSubmit, reset, setValue } = useForm();

    const [images, setImages] = useState<string[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState('');


    useEffect(() => {
        if (initialData) {
            reset(initialData);
            setImages(initialData.images || []);
        } else {
            reset({
                name: '',
                category: 'ROPA PARA DAMAS',
                costPrice: 0,
                salePrice: 0,
                stock: 0,
                barcode: '',
                description: '',
                active: true,
                images: []
            });
            setImages([]);
        }
    }, [initialData, reset]);

    const handleBarcodeScan = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setScanError('');

        try {
            // Process image: resize and normalize
            const processedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX = 1280;
                    let w = img.width, h = img.height;
                    if (w > MAX || h > MAX) {
                        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                        else { w = Math.round(w * MAX / h); h = MAX; }
                    }
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { reject(new Error('No ctx')); return; }
                    ctx.drawImage(img, 0, 0, w, h);
                    const result = new Image();
                    result.onload = () => resolve(result);
                    result.onerror = reject;
                    result.src = canvas.toDataURL('image/png');
                };
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            });

            // Method 1: BarcodeDetector API (native)
            if ('BarcodeDetector' in window) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const BDClass = (window as any).BarcodeDetector;
                    const detector = new BDClass({
                        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'itf', 'codabar']
                    });
                    const barcodes = await detector.detect(processedImg);
                    if (barcodes?.length > 0) {
                        setValue('barcode', barcodes[0].rawValue);
                        setIsScanning(false);
                        return;
                    }
                } catch { /* fallback */ }
            }

            // Method 2: html5-qrcode scanFile
            const { Html5Qrcode } = await import('html5-qrcode');
            const scanner = new Html5Qrcode('modal-barcode-decoder');
            const result = await scanner.scanFile(file, false);
            scanner.clear();
            setValue('barcode', result);
            setIsScanning(false);
        } catch {
            setScanError('No se detectó código. Acerca más la cámara.');
            setIsScanning(false);
        }
    }, [setValue]);

    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const compressed = await compressImage(file);
            const newImages = [...images, compressed];
            setImages(newImages);
            setValue('images', newImages);
        } catch (err) {
            console.error('Image compression error:', err);
        } finally {
            setIsUploading(false);
            // Reset input so same file can be re-selected
            e.target.value = '';
        }
    };

    const handleRemoveImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        setImages(newImages);
        setValue('images', newImages);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-800">
                        {initialData ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Nombre del Producto</label>
                            <input {...register('name', { required: true })} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" placeholder="Ej. Vestido Floral" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Código de Barras</label>
                            <div className="flex gap-2">
                                <input {...register('barcode')} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" placeholder="Escanear o generar" />
                                <button type="button" className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-xs font-medium" onClick={() => setValue('barcode', Math.random().toString(36).substr(2, 9).toUpperCase())}>Generar</button>
                                <label className="px-3 py-2 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 cursor-pointer flex items-center" title="Escanear código de barras">
                                    <Camera size={18} />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleBarcodeScan}
                                        className="hidden"
                                        aria-label="Escanear código de barras"
                                    />
                                </label>
                            </div>
                            {/* Decoder container */}
                            <div id="modal-barcode-decoder" className="hidden" aria-hidden="true" />
                            {isScanning && (
                                <div className="flex items-center gap-2 text-sm text-purple-600 mt-1">
                                    <RefreshCw size={14} className="animate-spin" />
                                    Procesando imagen...
                                </div>
                            )}
                            {scanError && <p className="text-xs text-red-500 mt-1">{scanError}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Categoría</label>
                            <select {...register('category')} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all bg-white">
                                <option value="ROPA PARA DAMAS">ROPA PARA DAMAS</option>
                                <option value="CARTERAS/BILLETERAS">CARTERAS/BILLETERAS</option>
                                <option value="ACCESORIOS">ACCESORIOS</option>
                                <option value="CUIDADO PERSONAL">CUIDADO PERSONAL</option>
                                <option value="SALUD">SALUD</option>
                                <option value="OTROS">OTROS</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Stock Inicial</label>
                            <input type="number" {...register('stock', { valueAsNumber: true })} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Precio de Costo (S/)</label>
                            <input type="number" step="0.01" {...register('costPrice', { valueAsNumber: true })} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Precio de Venta (S/)</label>
                            <input type="number" step="0.01" {...register('salePrice', { valueAsNumber: true })} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Descripción</label>
                        <textarea {...register('description')} rows={3} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" placeholder="Detalles del producto..." />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Imágenes</label>
                        <div className="flex gap-2 items-center">
                            <label className="flex-1 cursor-pointer flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 hover:border-purple-500 transition-colors group">
                                <div className="text-center">
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="mx-auto w-8 h-8 text-purple-500 animate-spin" />
                                            <span className="text-xs text-purple-500 mt-1 block">Comprimiendo...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mx-auto w-8 h-8 text-gray-400 group-hover:text-purple-500" />
                                            <span className="text-xs text-gray-500 mt-1 block">Subir imagen</span>
                                        </>
                                    )}
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                            </label>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {images.length === 0 && (
                                <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center text-gray-300 border border-gray-200">
                                    <ImageIcon size={24} />
                                </div>
                            )}
                            {images.map((img, idx) => (
                                <div key={idx} className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden group border border-gray-200 shadow-sm">
                                    <img src={img} alt="Product" className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                        <Trash size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium shadow-lg shadow-purple-200 hover:shadow-xl dark:shadow-none hover:scale-105 transition-all">
                            {initialData ? 'Guardar Cambios' : 'Crear Producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
