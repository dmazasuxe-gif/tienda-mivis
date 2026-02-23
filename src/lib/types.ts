
export interface Product {
    id: string;
    name: string;
    description: string;
    category: 'ROPA PARA DAMAS' | 'CARTERAS/BILLETERAS' | 'ACCESORIOS' | 'CUIDADO PERSONAL' | 'SALUD' | 'OTROS';
    costPrice: number;
    salePrice: number;
    stock: number;
    barcode: string;
    images: string[]; // Supports multiple images
    tags?: string[];
    active: boolean;
}

export interface SaleItem {
    productId: string;
    productName: string;
    quantity: number;
    salePrice: number;
}

export interface PaymentDetails {
    method: 'Cash' | 'Card' | 'Transfer' | 'Yape' | 'Other';
    amount: number;
    date: string; // ISO String
}

export interface Sale {
    id: string;
    date: string; // ISO String
    total: number;
    discount?: number;
    costTotal: number;
    profit: number;
    type: 'Cash' | 'Credit';
    items: SaleItem[];
    customerId?: string; // Optional if guest
    status: 'Paid' | 'Pending';
    payments?: PaymentDetails[]; // History of partial payments
    remainingBalance?: number;
    installmentPlan?: {
        numberOfInstallments: number;
        paymentFrequency: 'Weekly' | 'Bi-weekly' | 'Monthly';
        installments: {
            number: number;
            amount: number;
            dueDate: string; // ISO String
            status: 'Pending' | 'Paid';
        }[];
    };
}

export interface Customer {
    id: string;
    name: string;
    contact: string; // Phone/WhatsApp
    email?: string;
    address?: string; // For delivery?
    balance: number; // Current debt
    history: string[]; // Sale IDs
    paymentPlan?: {
        frequency: 'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly';
        nextDueDate: string;
    };
}

export interface StoreSettings {
    whatsapp: string;
    instagram: string;
    tiktok: string;
    facebook: string;
    authorizedAdmins?: { username: string; password: string }[];
}

export interface AppData {
    products: Product[];
    sales: Sale[];
    customers: Customer[];
    settings: StoreSettings;
}
