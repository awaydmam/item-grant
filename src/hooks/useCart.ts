import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  department_id?: string;
  department_name?: string;
  available_quantity: number;
  image_url?: string;
  location?: string;
  category?: string;
  description?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  isItemInCart: (itemId: string) => boolean;
  getItemQuantity: (itemId: string) => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        const existingItem = get().items.find(i => i.id === item.id);
        if (existingItem) {
          set(state => ({
            items: state.items.map(i =>
              i.id === item.id
                ? { ...i, quantity: Math.min(i.quantity + 1, item.available_quantity) }
                : i
            )
          }));
        } else {
          set(state => ({
            items: [...state.items, { ...item, quantity: 1 }]
          }));
        }
      },

      removeItem: (itemId) => {
        set(state => ({
          items: state.items.filter(item => item.id !== itemId)
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        
        set(state => ({
          items: state.items.map(item =>
            item.id === itemId
              ? { ...item, quantity: Math.min(quantity, item.available_quantity) }
              : item
          )
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      isItemInCart: (itemId) => {
        return get().items.some(item => item.id === itemId);
      },
      
      getItemQuantity: (itemId) => {
        const item = get().items.find(i => i.id === itemId);
        return item ? item.quantity : 0;
      }
    }),
    {
      name: 'item-grant-cart',
    }
  )
);