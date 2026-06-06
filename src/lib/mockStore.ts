import { Product, Order, User } from '../types';

export const mockUsers: User[] = [
  { id: 'u1', name: 'Davy (Admin)', role: 'admin', baseSalary: 3000 },
  { id: 'u2', name: 'Server Alice', role: 'serveur', pinCode: '1234' },
  { id: 'u3', name: 'Chef Bob', role: 'caisse' },
];

export const mockProducts: Product[] = [
  { id: 'p1', name: 'Burger Maison', price: 12.50, category: 'dish', recipe: [{ ingredientId: 'i1', quantity: 1, unit: 'p' }] },
  { id: 'p2', name: 'Salade César', price: 9.00, category: 'dish' },
  { id: 'p3', name: 'Poulet Braisé', price: 15.00, category: 'dish' },
  { id: 'p4', name: 'Coca-Cola', price: 3.50, category: 'drink' },
  { id: 'p5', name: 'Jus Naturel', price: 4.50, category: 'drink' },
];

export let mockOrders: Order[] = [
  {
    id: 'o1',
    type: 'salle',
    tablenumber: 4,
    items: [{ id: 'item1', productId: 'p1', quantity: 2 }, { id: 'item2', productId: 'p4', quantity: 2 }],
    status: 'en_attente',
    total: 32.00,
    createdAt: Date.now() - 600000,
    updatedAt: Date.now() - 600000
  },
  {
    id: 'o2',
    type: 'external',
    customername: 'Marc',
    deliveryaddress: '15 Rue des Lilas',
    contactphone: '0600000000',
    items: [{ id: 'item3', productId: 'p3', quantity: 1 }],
    status: 'en_preparation',
    total: 15.00,
    createdAt: Date.now() - 1200000,
    updatedAt: Date.now() - 1000000
  }
];

export const setMockOrders = (newOrders: Order[]) => {
    mockOrders = newOrders;
}
