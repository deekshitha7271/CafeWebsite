import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

const initialState = {
  items: [],
  isCartOpen: false,
  orderType: 'takeaway', // Default
  arrivalTime: '',
  lastOrderId: localStorage.getItem('lastOrderId') || null,
  relatedOrderId: null,
  shadowItems: [], // The "Shadow Cart" clone
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
    case 'CLONE_TO_SHADOW':
      return {
        ...state,
        shadowItems: [...state.items]
      };
    case 'RESTORE_FROM_SHADOW':
      return {
        ...state,
        items: [...state.shadowItems],
        isCartOpen: true
      };
    case 'SET_RELATED_ORDER':
      return {
        ...state,
        relatedOrderId: action.payload
      };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { user } = useAuth();
  const userId = user ? (user._id || user.id) : 'guest';
  const initialLoadDone = useRef(false);

  // Load from local storage when user changes
  useEffect(() => {
    const userCartKey = `cart_${userId}`;
    const guestCartKey = 'cart_guest';
    
    let itemsToLoad = [];
    const savedUserItems = localStorage.getItem(userCartKey);
    const savedGuestItems = localStorage.getItem(guestCartKey);

    if (userId !== 'guest' && savedGuestItems) {
      // User just logged in, merge guest items
      const guestItems = JSON.parse(savedGuestItems);
      const userItems = savedUserItems ? JSON.parse(savedUserItems) : [];
      
      // Simple merge: add guest items to user items, avoiding duplicates if necessary
      // For simplicity, we'll just append and the reducer handles quantities if we were adding, 
      // but here we are setting the whole cart. Let's merge properly.
      const mergedItems = [...userItems];
      guestItems.forEach(gItem => {
        const existing = mergedItems.find(uItem => uItem._id === gItem._id);
        if (existing) {
          existing.quantity += gItem.quantity;
        } else {
          mergedItems.push(gItem);
        }
      });
      
      itemsToLoad = mergedItems;
      // Clear guest cart after merging
      localStorage.removeItem(guestCartKey);
      // Save merged cart to user key immediately
      localStorage.setItem(userCartKey, JSON.stringify(itemsToLoad));
    } else if (savedUserItems) {
      try {
        itemsToLoad = JSON.parse(savedUserItems);
      } catch (e) {
        itemsToLoad = [];
      }
    }

    dispatch({ type: 'SET_CART', payload: { items: itemsToLoad } });
    initialLoadDone.current = true;
  }, [userId]);

  // Save to local storage when items change
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (state.items.length > 0) {
      localStorage.setItem(`cart_${userId}`, JSON.stringify(state.items));
    } else {
      localStorage.removeItem(`cart_${userId}`);
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
