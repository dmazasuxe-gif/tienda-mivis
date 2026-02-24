
'use client';

import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { ProductModal } from '@/components/ProductModal';
import { Product } from '@/lib/types';
import { Plus, Search, Edit2, Trash2, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InventoryPage() {
    const { products, addProduct, updateProduct, deleteProduct } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );




    const handleOpenModal = (product?: Product) => {

        if (product) {
            setCurrentProduct(product);
        } else {
            setCurrentProduct(null);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentProduct(null);
    };

    const handleSubmit = (data: Partial<Product>) => {
        if (currentProduct) {
            updateProduct(currentProduct.id, data as Partial<Product>);
        } else {
            addProduct({
                ...data,
                id: Math.random().toString(36).substring(2, 9),
                active: true,
                images: data.images || []
            } as Product);
        }
        handleCloseModal();
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <Archive className="text-purple-600" />
                        Inventario
                    </h1>
                    <p className="text-gray-500 mt-1">Gestiona tus productos, precios y stock.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 shadow-lg shadow-gray-200 transition-all flex items-center gap-2"
                >
                    <Plus size={18} />
                    Nuevo Producto
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            aria-label="Buscar productos"
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            aria-label="Filtrar por categoría"
                            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">Todas las Categorías</option>
                            <option value="Fashion">Moda</option>
                            <option value="Personal Care">Cuidado Personal</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Costo / Venta</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <AnimatePresence>
                                {filteredProducts.map((product) => (
                                    <motion.tr
                                        key={product.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="hover:bg-gray-50 transition-colors group"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
                                                    {product.images?.[0] ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                                                            {product.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700">
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="text-gray-900 font-medium">S/ {product.salePrice.toFixed(2)}</div>
                                            <div className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">Costo: S/ {product.costPrice.toFixed(2)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.stock < 5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {product.stock} Unid.
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">


                                            <button onClick={() => handleOpenModal(product)} className="text-purple-600 hover:text-purple-900 p-2 hover:bg-purple-50 rounded-lg transition-colors mr-2" title="Editar">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => deleteProduct(product.id)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Producto">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {filteredProducts.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No se encontraron productos.</p>
                        <button onClick={() => handleOpenModal()} className="mt-4 px-4 py-2 text-purple-600 font-medium hover:bg-purple-50 rounded-lg transition-colors">
                            Agregar el primero
                        </button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <ProductModal
                        isOpen={isModalOpen}
                        onClose={handleCloseModal}
                        onSubmit={handleSubmit}
                        initialData={currentProduct}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
