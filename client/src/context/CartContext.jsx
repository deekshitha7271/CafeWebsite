import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

const initialState = {
  items: [],
  isCartOpen: false,
  orderType: 'takeaway', 
  arrivalTime: '',
  lastOrderId: localStorage.getItem('lastOrderId') || null,
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CART':
      return {
        ...state,
        ...action.payload
      };
    case 'SET_ARRIVAL_TIME':
      return {
        ...state,
        arrivalTime: action.payload
      };
    case 'ADD_ITEM': {
      const existingItem = state.items.find(i => i._id === action.payload._id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(i =>
            i._id === action.payload._id ? { ...i, quantity: i.quantity + 1 } : i
          )
        };
      }
      return { ...state, items: [...state.items, { ...action.payload, quantity: 1 }] };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(i => i._id !== action.payload)
      };
    case 'DECREMENT_ITEM':
      return {
        ...state,
        items: state.items.map(i => {
          if (i._id === action.payload) {
            return { ...i, quantity: Math.max(0, i.quantity - 1) };
          }
          return i;
        }).filter(i => i.quantity > 0)
      };
    case 'CLEAR_CART':
      return { ...state, items: [], arrivalTime: '' };
    case 'TOGGLE_CART':
      return { ...state, isCartOpen: !state.isCartOpen };
    case 'SET_CART_OPEN':
      return { ...state, isCartOpen: action.payload };
    case 'SET_ORDER_TYPE':
      return { ...state, orderType: action.payload };
    case 'SET_LAST_ORDER_ID':
      if (action.payload) {
        localStorage.setItem('lastOrderId', action.payload);
      } else {
        localStorage.removeItem('lastOrderId');
      }
      return { ...state, lastOrderId: action.payload };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { user } = useAuth();
  const userId = user ? (user._id || user.id) : 'guest';
  const initialLoadDone = useRef(false);

  // 1. Initial Load (One time only)
  useEffect(() => {
    const guestCartKey = 'cart_guest';
    let itemsToLoad = [];
    const savedGuestItems = localStorage.getItem(guestCartKey);

    if (userId !== 'guest') {
      // Migrating Guest to User if items exist in localStorage
      if (savedGuestItems && savedGuestItems !== '[]') {
        try {
          itemsToLoad = JSON.parse(savedGuestItems);
          localStorage.removeItem(guestCartKey);
          // Sync migration to server
          axios.put(`${import.meta.env.VITE_API_URL}/auth/cart`, { cart: itemsToLoad })
            .catch(err => console.error('Migration failed', err));
        } catch (e) { itemsToLoad = []; }
      } else {
        // Just load from server
        itemsToLoad = user?.cart || [];
      }
    } else {
      // Guest Load
      if (savedGuestItems) {
        try { itemsToLoad = JSON.parse(savedGuestItems); } catch (e) { itemsToLoad = []; }
      }
    }

    dispatch({ type: 'SET_CART', payload: { items: itemsToLoad } });
    
    // Enable saving after a short delay to prevent overwriting
    setTimeout(() => {
      initialLoadDone.current = true;
    }, 500);
  }, [userId]);

  // 2. Save Sync (Whenever items change)
  useEffect(() => {
    if (!initialLoadDone.current) return;
    
    if (userId === 'guest') {
      if (state.items.length > 0) {
        localStorage.setItem('cart_guest', JSON.stringify(state.items));
      } else {
        localStorage.removeItem('cart_guest');
      }
    } else {
      // Server Sync
      axios.put(`${import.meta.env.VITE_API_URL}/auth/cart`, { cart: state.items })
        .catch(err => console.error('Cloud sync failed', err));
    }
  }, [state.items, userId]);

  const cartTotal = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = state.items.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ state, dispatch, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
