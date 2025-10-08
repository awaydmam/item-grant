import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  code: string;
  description: string;
  available_quantity: number;
  status: string;
  image_url: string;
  category_id: string;
  department_id: string;
  categories: { name: string } | null;
  departments: { name: string } | null;
  requestedQuantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'requestedQuantity'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  
  addItem: (item) => set((state) => {
    const existingItem = state.items.find(i => i.id === item.id);
    
    if (existingItem) {
      if (existingItem.requestedQuantity < item.available_quantity) {
        return {
          items: state.items.map(i =>
            i.id === item.id
              ? { ...i, requestedQuantity: i.requestedQuantity + 1 }
              : i
          )
        };
      }
      return state;
    }
    
    return {
      items: [...state.items, { ...item, requestedQuantity: 1 }]
    };
  }),
  
  removeItem: (itemId) => set((state) => {
    const item = state.items.find(i => i.id === itemId);
    
    if (item && item.requestedQuantity > 1) {
      return {
        items: state.items.map(i =>
          i.id === itemId
            ? { ...i, requestedQuantity: i.requestedQuantity - 1 }
            : i
        )
      };
    }
    
    return {
      items: state.items.filter(i => i.id !== itemId)
    };
  }),
  
  updateQuantity: (itemId, quantity) => set((state) => ({
    items: state.items.map(i =>
      i.id === itemId ? { ...i, requestedQuantity: quantity } : i
    )
  })),
  
  clearCart: () => set({ items: [] }),
  
  get totalItems() {
    return get().items.reduce((sum, item) => sum + item.requestedQuantity, 0);
  }
}));