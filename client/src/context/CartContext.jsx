import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

const initialState = {
  items: [],
  table: null,
  isCartOpen: false,
  orderType: 'dinein-web', // Default
  arrivalTime: '',
  lastOrderId: localStorage.getItem('lastOrderId') || null,
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'SET_TABLE':
      return {
        ...state,
        table: action.payload,
        orderType: action.payload ? 'dinein-qr' : state.orderType
      };
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

  // Load from local storage when user changes
  useEffect(() => {
    const savedItems = localStorage.getItem(`cart_${userId}`);
    if (savedItems) {
      try {
        dispatch({ type: 'SET_CART', payload: { items: JSON.parse(savedItems) } });
      } catch (e) {
        dispatch({ type: 'CLEAR_CART' });
      }
    } else {
      dispatch({ type: 'CLEAR_CART' });
    }
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
