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
    const tickerProducts = [...inStockProducts, ...inStockProducts];

    if (inStockProducts.length === 0) return null;

    return (
        <div className="relative w-full overflow-hidden bg-white py-0">
            <div className="flex w-max">
                <motion.div
                    animate={{
                        x: ["-50%", "0%"], // Left to Right constant motion
                    }}
                    transition={{
                        x: {
                            repeat: Infinity,
                            repeatType: "loop",
                            duration: Math.max(inStockProducts.length * 5, 30),
                            ease: "linear",
                        },
                    }}
                    className="flex gap-4 px-0"
                >
                    {tickerProducts.map((product, idx) => (
                        <div
                            key={`${product.id}-${idx}`}
                            className="flex-shrink-0 w-[300px] md:w-[450px] aspect-[4/5] relative group cursor-pointer overflow-hidden"
                            onClick={() => onProductClick?.(product)}
                        >
                            {product.images?.[0] ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-200">
                                    <Package size={64} />
                                </div>
                            )}
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Subtle vignettes for a more cinematic look */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        </div>
    );
}
