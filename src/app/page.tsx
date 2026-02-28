
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import { Product } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Star, Heart, X,
  ChevronLeft, ChevronRight, Package, Tag, Truck,
  MessageCircle, ZoomIn, Instagram, Facebook
} from 'lucide-react';
import ProductTicker from '@/components/ProductTicker';

export default function Home() {
  const { products, settings } = useData();

  const CATEGORY_ORDER = [
    'ROPA PARA DAMAS',
    'CARTERAS/BILLETERAS',
    'ACCESORIOS',
    'CUIDADO PERSONAL',
    'SALUD',
    'OTROS'
  ];
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const activeProducts = [...products]
    .filter(p => p.active && p.stock > 0)
    .sort((a, b) => {
      const orderA = CATEGORY_ORDER.indexOf(a.category);
      const orderB = CATEGORY_ORDER.indexOf(b.category);
      // If category not in list (shouldn't happen), put it at the end
      const finalA = orderA === -1 ? 999 : orderA;
      const finalB = orderB === -1 ? 999 : orderB;
      return finalA - finalB;
    });

  const filteredProducts = filterCategory === 'all'
    ? activeProducts
    : activeProducts.filter(p => p.category === filterCategory);

  const categories = CATEGORY_ORDER.filter(cat => products.some(p => p.category === cat));
  // Add any other categories that might exist but aren't in the ORDER (precaution)
  const otherCats = [...new Set(products.map(p => p.category))].filter(cat => !CATEGORY_ORDER.includes(cat));
  const finalCategories = [...categories, ...otherCats];

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (selectedProduct?.images?.length) {
      setCurrentImageIndex(prev => (prev + 1) % selectedProduct.images.length);
    }
  };

  const prevImage = () => {
    if (selectedProduct?.images?.length) {
      setCurrentImageIndex(prev => (prev - 1 + selectedProduct.images.length) % selectedProduct.images.length);
    }
  };

  const handleWhatsAppBuy = (product: Product) => {
    const categoryLabel = product.category;
    const lines = [
      `¡Hola! 👋 Estoy interesado/a en el siguiente producto de *Mivis Studio Glam*:`,
      ``,
      `🛍️ *Producto:* ${product.name}`,
      `🏷️ *Código:* ${product.barcode}`,
      `📂 *Categoría:* ${categoryLabel}`,
      ...(product.description ? [`📝 *Descripción:* ${product.description}`] : []),
      `💰 *Precio:* S/ ${product.salePrice.toFixed(2)}`,
      ``,
      `¿Está disponible? Me gustaría coordinar la compra y el envío. ¡Gracias! 🙏`,
    ];
    const message = encodeURIComponent(lines.join('\n'));
    // Ensure the number is cleaned of any non-digits and has the country code
    let waNumber = (settings?.whatsapp || '51999509661').replace(/\D/g, '');
    if (waNumber.length === 9) waNumber = `51${waNumber}`;

    window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
            // Hidden way to access admin login: triple click the logo
            const now = Date.now();
            const lastClick = (window as any)._lastLogoClick || 0; // eslint-disable-line
            const clickCount = (window as any)._logoClickCount || 0; // eslint-disable-line

            if (now - lastClick < 500) {
              (window as any)._logoClickCount = clickCount + 1; // eslint-disable-line
              if (clickCount + 1 >= 3) {
                window.location.href = '/login';
              }
            } else {
              (window as any)._logoClickCount = 1; // eslint-disable-line
            }
            (window as any)._lastLogoClick = now; // eslint-disable-line
          }}>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-xl flex items-center justify-center text-white">
              <ShoppingBag size={18} />
            </div>
            <span className="text-lg md:text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500 uppercase tracking-tighter">
              MIVIS STUDIO GLAM
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <Link href="#products" className="hover:text-purple-600 transition-colors">Catálogo</Link>
            <Link href="#contact" className="hover:text-purple-600 transition-colors">Contacto</Link>
          </nav>
          {/* Social Icons - Top Right (Mobile-ready) */}
          <div className="flex items-center gap-4 border-l border-gray-100 pl-4 flex-shrink-0">
            <a
              href={settings?.instagram || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-pink-500 transition-colors p-1"
              title="Instagram"
            >
              <Instagram size={22} className="md:w-[20px] md:h-[20px]" />
            </a>
            {settings?.tiktok && (
              <a
                href={settings.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-black transition-colors p-1"
                title="TikTok"
              >
                <svg viewBox="0 0 448 512" fill="currentColor" width="20" height="20" className="md:w-[18px] md:h-[18px]">
                  <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
                </svg>
              </a>
            )}
            {settings?.facebook && (
              <a
                href={settings.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-blue-600 transition-colors p-1"
                title="Facebook"
              >
                <Facebook size={22} className="md:w-[20px] md:h-[20px]" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero Replacement - Product Highlight Ticker */}
      <section className="relative pt-16 md:pt-20 overflow-hidden">
        <ProductTicker products={activeProducts} onProductClick={openProduct} />
      </section>

      {/* Products */}
      {/* Products */}
      <section id="products" className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Nuestros Productos</h2>
            <p className="text-gray-500 mt-2">Encuentra lo que buscas.</p>
          </div>

          {/* Category Filter */}
          {finalCategories.length > 1 && (
            <div className="flex justify-center gap-2 mb-10 flex-wrap">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${filterCategory === 'all'
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
              >
                Todos
              </button>
              {finalCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${filterCategory === cat
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {filteredProducts.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 cursor-pointer"
                onClick={() => openProduct(product)}
              >
                {/* Product Image */}
                <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                      className="p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-500 hover:text-red-500 hover:bg-white transition-colors shadow-sm"
                      aria-label="Agregar a favoritos"
                    >
                      <Heart size={16} className={favorites.has(product.id) ? 'fill-red-500 text-red-500' : ''} />
                    </button>
                  </div>
                  {product.images?.[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 text-gray-300 group-hover:scale-105 transition-transform duration-500">
                      <Package size={40} />
                      <span className="text-xs mt-2 font-medium">Sin imagen</span>
                    </div>
                  )}
                  {product.stock < 5 && (
                    <div className="absolute bottom-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      ¡ÚLTIMAS UNIDADES!
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3 md:p-5">
                  <div className="flex justify-between items-start mb-1 md:mb-2">
                    <h3 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors line-clamp-1 text-sm md:text-base">
                      {product.name}
                    </h3>
                    <div className="hidden md:flex items-center gap-1 text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg flex-shrink-0 ml-2">
                      <Star size={10} className="text-yellow-500 fill-yellow-500" /> 4.9
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 line-clamp-2 mb-3 md:mb-4 h-8 md:h-10">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg md:text-xl font-bold text-gray-900">S/ {product.salePrice.toFixed(2)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); openProduct(product); }}
                      className="p-2 md:p-3 bg-gray-900 text-white rounded-xl hover:bg-purple-600 transition-colors shadow-lg shadow-gray-200"
                      aria-label="Ver producto"
                    >
                      <ShoppingBag size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No hay productos disponibles.</p>
              <p className="text-gray-400 text-sm mt-1">¡Vuelve pronto!</p>
            </div>
          )}
        </div>
      </section >

      {/* Contact / Footer */}
      <section id="contact" className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">¿Tienes preguntas?</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">Contáctanos por WhatsApp y te atenderemos con gusto.</p>
          <a
            href={`https://wa.me/${settings?.whatsapp || '51999509661'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-500 text-white rounded-full font-bold shadow-lg shadow-green-100 hover:bg-green-600 transition-all w-full md:w-auto justify-center"
          >
            <MessageCircle size={22} />
            Escríbenos por WhatsApp ({settings?.whatsapp || '999 509 661'})
          </a>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-400">
          <p>Mivis Studio Glam © {isMounted ? new Date().getFullYear() : ''} — Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* ===== PRODUCT DETAIL MODAL ===== */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl"
            >
              {/* Image Gallery — compact, proportional */}
              <div className="relative h-[180px] md:h-[220px] bg-gray-100 overflow-hidden md:rounded-t-3xl">
                {selectedProduct.images?.length > 0 ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedProduct.images[currentImageIndex]}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain bg-gray-50 cursor-zoom-in"
                      onClick={() => setLightboxOpen(true)}
                    />
                    {/* Zoom hint */}
                    <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 pointer-events-none">
                      <ZoomIn size={12} /> Ampliar
                    </div>
                    {/* Image counter */}
                    {selectedProduct.images.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                        <button
                          onClick={prevImage}
                          className="text-white hover:text-purple-300 transition-colors"
                          aria-label="Imagen anterior"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-white text-[10px] font-medium">
                          {currentImageIndex + 1} / {selectedProduct.images.length}
                        </span>
                        <button
                          onClick={nextImage}
                          className="text-white hover:text-purple-300 transition-colors"
                          aria-label="Imagen siguiente"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                    {/* Thumbnail strip */}
                    {selectedProduct.images.length > 1 && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {selectedProduct.images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImageIndex(i)}
                            className={`w-8 h-8 rounded-md overflow-hidden border-2 transition-all ${i === currentImageIndex
                              ? 'border-white shadow-lg scale-110'
                              : 'border-transparent opacity-70 hover:opacity-100'
                              }`}
                            aria-label={`Ver imagen ${i + 1}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 text-gray-300">
                    <Package size={36} />
                    <span className="text-xs mt-2 font-medium">Sin imágenes</span>
                  </div>
                )}

                {/* Close button */}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors z-10"
                  aria-label="Cerrar"
                >
                  <X size={20} className="text-gray-700" />
                </button>

                {/* Favorite button */}
                <button
                  onClick={() => toggleFavorite(selectedProduct.id)}
                  className="absolute top-4 left-4 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors z-10"
                  aria-label="Favorito"
                >
                  <Heart size={20} className={favorites.has(selectedProduct.id) ? 'fill-red-500 text-red-500' : 'text-gray-700'} />
                </button>
              </div>

              {/* Product Info */}
              <div className="p-6 md:p-8 space-y-5">
                {/* Category tag */}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-purple-50 text-purple-600 text-xs font-semibold rounded-full flex items-center gap-1">
                    <Tag size={12} />
                    {selectedProduct.category}
                  </span>
                  {selectedProduct.stock > 0 && (
                    <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full">
                      En stock
                    </span>
                  )}
                </div>

                {/* Name and price */}
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{selectedProduct.name}</h2>
                  <div className="flex items-baseline gap-3 mt-2">
                    <span className="text-3xl font-bold text-purple-600">S/ {selectedProduct.salePrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={16} className="text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500 font-medium">4.9 (Excelente)</span>
                </div>

                {/* Description */}
                {selectedProduct.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Descripción</h3>
                    <p className="text-gray-600 leading-relaxed">{selectedProduct.description}</p>
                  </div>
                )}

                {/* Features */}
                <div className="grid grid-cols-3 gap-3 py-4 border-y border-gray-100">
                  <div className="text-center">
                    <Truck size={20} className="mx-auto text-purple-500 mb-1" />
                    <span className="text-xs text-gray-600 font-medium">Envío rápido</span>
                  </div>
                  <div className="text-center">
                    <Package size={20} className="mx-auto text-purple-500 mb-1" />
                    <span className="text-xs text-gray-600 font-medium">Original</span>
                  </div>
                  <div className="text-center">
                    <Star size={20} className="mx-auto text-purple-500 mb-1" />
                    <span className="text-xs text-gray-600 font-medium">Garantía</span>
                  </div>
                </div>

                {/* Availability */}
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2.5 h-2.5 rounded-full ${selectedProduct.stock > 5 ? 'bg-green-500' : selectedProduct.stock > 0 ? 'bg-orange-500' : 'bg-red-500'}`} />
                  <span className="text-gray-600">
                    {selectedProduct.stock > 5
                      ? 'Disponible'
                      : selectedProduct.stock > 0
                        ? `¡Solo quedan ${selectedProduct.stock}!`
                        : 'Agotado'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={() => handleWhatsAppBuy(selectedProduct)}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-200 hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 text-lg"
                  >
                    <MessageCircle size={22} />
                    Comprar por WhatsApp
                  </button>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Seguir viendo
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== FULLSCREEN IMAGE LIGHTBOX ===== */}
      <AnimatePresence>
        {(() => {
          const lbImages = lightboxOpen && selectedProduct ? (selectedProduct.images ?? []) : [];
          const lbName = selectedProduct?.name ?? '';
          if (!lightboxOpen || lbImages.length === 0) return null;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[200] flex items-center justify-center"
              onClick={() => setLightboxOpen(false)}
            >
              {/* Close */}
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute top-4 right-4 p-3 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-colors z-10"
                aria-label="Cerrar visor"
              >
                <X size={24} />
              </button>

              {/* Image counter */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium z-10">
                {currentImageIndex + 1} / {lbImages.length}
              </div>

              {/* Main Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lbImages[currentImageIndex]}
                alt={lbName}
                className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Navigation */}
              {lbImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-colors"
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft size={28} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-colors"
                    aria-label="Imagen siguiente"
                  >
                    <ChevronRight size={28} />
                  </button>
                </>
              )}

              {/* Thumbnail strip */}
              {lbImages.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {lbImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === currentImageIndex
                        ? 'border-white shadow-lg scale-110'
                        : 'border-white/30 opacity-60 hover:opacity-100'
                        }`}
                      aria-label={`Ver imagen ${i + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div >
  );
}
