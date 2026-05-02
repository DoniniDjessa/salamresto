export type Role = 'admin' | 'manager' | 'server' | 'cook' | 'courier';

export interface User {
  id: string;
  name: string;
  role: Role;
  baseSalary?: number;
  pinCode?: string; // For rapid POS login
  phone?: string;
  email?: string;
  avatar?: string;
}

export type OrderType = 'salle' | 'external';
export type OrderStatus = 'en_attente' | 'en_preparation' | 'pret' | 'en_livraison' | 'livre' | 'paye';

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: 'dish' | 'drink' | 'dessert' | 'collation';
  image?: string;
  recipe?: RecipeIngredient[];
  options?: { name: string; price: number }[];
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
  tablenumber?: number;         // If salle
  customername?: string;        // If external
  deliveryaddress?: string;     // If external
  contactphone?: string;        // If external
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
