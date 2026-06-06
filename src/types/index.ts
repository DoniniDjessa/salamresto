export type Role = 'superAdmin' | 'admin' | 'caisse' | 'serveur' | 'livreur';

export interface User {
  id: string;
  name: string;
  role: Role;
  baseSalary?: number;
  pinCode?: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

export type OrderType   = 'salle' | 'comptoir' | 'external';
export type OrderStatus =
  | 'en_attente'
  | 'en_preparation'
  | 'pret'          // Kitchen done → waiting for payment
  | 'termine'       // Payment collected → waiting for table to be cleared
  | 'en_livraison'
  | 'livre'
  | 'paye';         // Table cleared / fully closed

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface ProductSizeOption {
  name?: string;
  price: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  image?: string;
  price?: number;
  options?: ProductSizeOption[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  recipe?: RecipeIngredient[];
  variants?: ProductVariant[];
  options?: ProductSizeOption[];
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  type: OrderType;
  tablenumber?: number;
  customername?: string;
  deliveryaddress?: string;
  contactphone?: string;
  items: any[];
  status: OrderStatus;
  total: number;
  payment_method?: 'online' | 'delivery';
  createdAt: number;
  updatedAt: number;
}

export interface TimeEntry {
  id: string;
  userId: string;
  checkIn: number;
  checkOut?: number;
}
