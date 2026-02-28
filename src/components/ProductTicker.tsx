'use client';

import { Product } from '@/lib/types';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';

interface ProductTickerProps {
    products: Product[];
    onProductClick?: (product: Product) => void;
}

export default function ProductTicker({ products, onProductClick }: ProductTickerProps) {
    // Filter only products in stock as requested
    const inStockProducts = products.filter(p => p.active && p.stock > 0);

    // Duplicate products to create a seamless loop
    // We use [...list, ...list] and animate from -50% to 0% for infinite scroll
    const tickerProducts = [...inStockProducts, ...inStockProducts];

    if (inStockProducts.length === 0) return null;

    return (
        <div className="relative w-full overflow-hidden bg-white py-12 border-y border-gray-100/50">
            <div className="flex w-max">
                <motion.div
                    animate={{
                        x: ["-50%", "0%"], // Left to Right constant motion
                    }}
                    transition={{
                        x: {
                            repeat: Infinity,
                            repeatType: "loop",
                            duration: Math.max(inStockProducts.length * 5, 30), // Balanced speed based on count
                            ease: "linear",
                        },
                    }}
                    className="flex gap-8 px-4"
                >
                    {tickerProducts.map((product, idx) => (
                        <div
                            key={`${product.id}-${idx}`}
                            className="flex-shrink-0 w-56 group cursor-pointer"
                            onClick={() => onProductClick?.(product)}
                        >
                            <div className="relative aspect-[3/4] bg-gray-50 rounded-3xl overflow-hidden shadow-sm group-hover:shadow-xl transition-all duration-500 border border-gray-100 group-hover:-translate-y-2">
                                {product.images?.[0] ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={product.images[0]}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-200">
                                        <Package size={48} />
                                        <span className="text-[10px] uppercase font-bold tracking-widest mt-2">Sin Imagen</span>
                                    </div>
                                )}

                                {/* Premium Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                                    <span className="text-white font-bold text-lg mb-1">S/ {product.salePrice.toFixed(2)}</span>
                                    <span className="text-white/80 text-xs font-medium uppercase tracking-wider">Ver detalles</span>
                                </div>

                                {/* Tag */}
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold text-gray-900 border border-white/20 shadow-sm">
                                        {product.category}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 px-2">
                                <h3 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-purple-600 transition-colors uppercase tracking-tight">
                                    {product.name}
                                </h3>
                                <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-widest">
                                    Stock: {product.stock}
                                </p>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Gradients to fade edges for a premium look */}
            <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />
        </div>
    );
}
