
import { AppData, Product, Sale, Customer } from './types';

// Helper to check environment
// isClient removed as it was unused

// Empty lists for fresh start as requested
export const mockProducts: Product[] = [];
export const mockCustomers: Customer[] = [];
export const mockSales: Sale[] = [];

export const initialData: AppData = {
    products: mockProducts,
    sales: mockSales,
    customers: mockCustomers,
    settings: {
        whatsapp: '51999509661',
        instagram: 'https://www.instagram.com/mivis_studio',
        tiktok: '',
        facebook: '',
    },
};
