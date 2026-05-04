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
  activeOrders: JSON.parse(localStorage.getItem('activeOrders') || '[]'),
  sessionOrders: [], // Orders placed in this visit (today)
  paidTotal: 0,
  sessionTotal: 0,
  coupon: null, // { code, type, value }
  discount: 0,
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
    case 'ADD_ACTIVE_ORDER': {
      const newOrders = [...new Set([...state.activeOrders, action.payload])];
      localStorage.setItem('activeOrders', JSON.stringify(newOrders));
      return { ...state, activeOrders: newOrders };
    }
    case 'REMOVE_ACTIVE_ORDER': {
      const filteredOrders = state.activeOrders.filter(id => id !== action.payload);
      localStorage.setItem('activeOrders', JSON.stringify(filteredOrders));
      return { ...state, activeOrders: filteredOrders };
    }
    case 'SET_SESSION_DATA':
      return {
        ...state,
        sessionOrders: action.payload.orders || [],
        paidTotal: action.payload.paidTotal || 0,
        sessionTotal: action.payload.sessionTotal || 0,
      };
    case 'APPLY_COUPON':
      return {
        ...state,
        coupon: action.payload,
      };
    case 'REMOVE_COUPON':
      return {
        ...state,
        coupon: null,
        discount: 0
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

    const savedActiveOrders = localStorage.getItem('activeOrders');
    let activeOrdersToLoad = [];
    if (userId !== 'guest') {
      activeOrdersToLoad = user?.activeOrders || [];
    } else if (savedActiveOrders) {
      try { activeOrdersToLoad = JSON.parse(savedActiveOrders); } catch (e) { activeOrdersToLoad = []; }
    }

    const cartDetailsKey = 'cart_details';
    let loadedDetails = { coupon: null, arrivalTime: '', orderType: 'takeaway' };
    const savedDetails = localStorage.getItem(cartDetailsKey);
    if (savedDetails) {
      try { Object.assign(loadedDetails, JSON.parse(savedDetails)); } catch (e) { }
    }

    dispatch({
      type: 'SET_CART',
      payload: {
        items: itemsToLoad,
        activeOrders: activeOrdersToLoad,
        coupon: loadedDetails.coupon,
        arrivalTime: loadedDetails.arrivalTime,
        orderType: loadedDetails.orderType
      }
    });

    const fetchSessionData = async () => {
      if (userId === 'guest') {
        // For guests, use the public status endpoint (no auth required)
        const activeIds = JSON.parse(localStorage.getItem('activeOrders') || '[]');
        if (activeIds.length > 0) {
          try {
            const results = await Promise.all(
              activeIds.map(id =>
                axios.get(`${import.meta.env.VITE_API_URL}/orders/status/${id}`).catch(() => null)
              )
            );
            // Keep only orders that still exist and are not completed/cancelled
            const validIds = results
              .filter(r => r && r.data && r.data.orderStatus !== 'completed' && r.data.orderStatus !== 'cancelled')
              .map(r => r.data._id);
            // If any were removed, update state + localStorage
            if (validIds.length !== activeIds.length) {
              dispatch({ type: 'SET_CART', payload: { activeOrders: validIds } });
              localStorage.setItem('activeOrders', JSON.stringify(validIds));
            }
          } catch (e) { console.error('Guest order verification failed', e); }
        }
        return;
      }

      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/session-summary`);
        dispatch({ type: 'SET_SESSION_DATA', payload: res.data });

        // Also verify active orders from the user profile returned by session-summary or similar
        // For now, let's just use the activeOrders from the user object if they exist
        if (res.data.activeOrders) {
          dispatch({ type: 'SET_CART', payload: { activeOrders: res.data.activeOrders } });
        }
      } catch (err) {
        console.error('Failed to fetch session data', err);
      }
    };

    fetchSessionData();

    // Enable saving after a short delay to prevent overwriting
    setTimeout(() => {
      initialLoadDone.current = true;
    }, 500);
  }, [userId, user?.activeOrders]);

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

  // 3. Sync Active Orders to Cloud
  useEffect(() => {
    if (!initialLoadDone.current || userId === 'guest') return;
    axios.put(`${import.meta.env.VITE_API_URL}/auth/active-orders`, { activeOrders: state.activeOrders })
      .catch(err => console.error('Active orders sync failed', err));
  }, [state.activeOrders, userId]);

  // 4. Save Cart Details persistently (for both guests and users across login)
  useEffect(() => {
    if (!initialLoadDone.current) return;
    const detailsToSave = {
      coupon: state.coupon,
      arrivalTime: state.arrivalTime,
      orderType: state.orderType
    };
    localStorage.setItem('cart_details', JSON.stringify(detailsToSave));
  }, [state.coupon, state.arrivalTime, state.orderType]);

  const rawCartTotal = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Calculate discount
  let discount = 0;
  if (state.coupon) {
    const couponVal = Number(state.coupon.value);
    if (state.coupon.type === 'percent') {
      discount = rawCartTotal * (couponVal / 100);
    } else if (state.coupon.type === 'flat') {
      discount = Math.min(couponVal, rawCartTotal);
    }
  }

  const cartTotal = Math.max(0, rawCartTotal - discount);
  const cartCount = state.items.reduce((count, item) => count + item.quantity, 0);

  // Calculate combined summary
  const sessionStats = {
    itemsCount: cartCount + state.sessionOrders.reduce((sum, order) => sum + order.items.reduce((s, i) => s + i.quantity, 0), 0),
    paidAmount: state.paidTotal,
    pendingAmount: cartTotal,
    totalSpend: state.paidTotal + cartTotal
  };

  return (
    <CartContext.Provider value={{ state, dispatch, cartTotal, cartCount, sessionStats, discount, rawCartTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

