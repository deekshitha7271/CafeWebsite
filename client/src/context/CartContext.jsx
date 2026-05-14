import { createContext, useContext, useReducer, useEffect, useRef, useMemo } from 'react';
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
  settings: null,
  isOrderingActive: true,
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
    case 'SET_SETTINGS': {
      const settings = action.payload;
      let isOrderingActive = true;

      if (settings) {
        // ENTERPRISE LOGIC: Manual Toggle takes priority over Schedule Override
        if (settings.isOrderingEnabled === true) {
          isOrderingActive = true;
          console.log("✅ Cafe status: Manually FORCED OPEN by Admin");
        } else if (settings.isOrderingEnabled === false && (!settings.openingTime || !settings.closingTime)) {
          isOrderingActive = false;
          console.log("❌ Cafe status: Manually FORCED CLOSED by Admin");
        } else if (settings.openingTime && settings.closingTime) {
          // Automated Schedule Fallback
          const options = { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', hour12: false };
          const istStr = new Intl.DateTimeFormat('en-GB', options).format(new Date());
          const [h, m] = istStr.split(':').map(Number);
          const currentHours = h;
          const currentMinutes = m;

          const toMin = (str) => {
            if (!str) return 0;
            const match = str.match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (!match) return 0;
            let [_, hour, min, meridiem] = match;
            hour = parseInt(hour);
            min = parseInt(min);
            if (meridiem) {
              if (meridiem.toUpperCase() === 'PM' && hour < 12) hour += 12;
              if (meridiem.toUpperCase() === 'AM' && hour === 12) hour = 0;
            }
            return hour * 60 + min;
          };

          const openMin = toMin(settings.openingTime);
          const closeMin = toMin(settings.closingTime);
          const currentMin = currentHours * 60 + currentMinutes;

          if (openMin <= closeMin) {
            isOrderingActive = currentMin >= openMin && currentMin <= closeMin;
          } else {
            isOrderingActive = currentMin >= openMin || currentMin <= closeMin;
          }
          console.log(`🕒 Cafe status: Scheduled ${isOrderingActive ? 'OPEN' : 'CLOSED'} (${h}:${m})`);
        }
      }
      return { ...state, settings, isOrderingActive };
    }
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
    // ── Load cart from localStorage (Guest mode only) ────────────────────────
    const guestCartKey = 'cart_guest';
    let itemsToLoad = [];
    const savedGuestItems = localStorage.getItem(guestCartKey);
    if (savedGuestItems) {
      try { itemsToLoad = JSON.parse(savedGuestItems); } catch (e) { itemsToLoad = []; }
    }

    const savedActiveOrders = localStorage.getItem('activeOrders');
    let activeOrdersToLoad = [];
    if (savedActiveOrders) {
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
      // Fetch settings independent of auth
      try {
        const settingsRes = await axios.get(`${import.meta.env.VITE_API_URL}/settings`);
        dispatch({ type: 'SET_SETTINGS', payload: settingsRes.data });
      } catch (e) { console.error('Failed to fetch settings', e); }

      // For everyone (no customer login), verify active orders from localStorage
      const activeIds = JSON.parse(localStorage.getItem('activeOrders') || '[]');
      if (activeIds.length > 0) {
        try {
          const results = await Promise.all(
            activeIds.map(id =>
              axios.get(`${import.meta.env.VITE_API_URL}/orders/status/${id}`).catch(() => null)
            )
          );
          const validIds = results
            .filter(r => r && r.data && r.data.orderStatus !== 'completed' && r.data.orderStatus !== 'cancelled')
            .map(r => r.data._id);
          if (validIds.length !== activeIds.length) {
            dispatch({ type: 'SET_CART', payload: { activeOrders: validIds } });
            localStorage.setItem('activeOrders', JSON.stringify(validIds));
          }
        } catch (e) { console.error('Order verification failed', e); }
      }
    };

    fetchSessionData();

    const refreshInterval = setInterval(fetchSessionData, 60000); // 1 minute auto-refresh

    setTimeout(() => {
      initialLoadDone.current = true;
    }, 500);

    return () => clearInterval(refreshInterval);
  }, []);

  // 2. Save Sync (localStorage only)
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (state.items.length > 0) {
      localStorage.setItem('cart_guest', JSON.stringify(state.items));
    } else {
      localStorage.removeItem('cart_guest');
    }
  }, [state.items]);

  // 3. Save Cart Details persistently
  useEffect(() => {
    if (!initialLoadDone.current) return;
    const detailsToSave = {
      coupon: state.coupon,
      arrivalTime: state.arrivalTime,
      orderType: state.orderType
    };
    localStorage.setItem('cart_details', JSON.stringify(detailsToSave));
  }, [state.coupon, state.arrivalTime, state.orderType]);

  const rawCartTotal = useMemo(() => state.items.reduce((total, item) => total + (item.price * item.quantity), 0), [state.items]);

  const discount = useMemo(() => {
    if (!state.coupon) return 0;
    const couponVal = Number(state.coupon.value);
    if (state.coupon.type === 'percent') {
      return rawCartTotal * (couponVal / 100);
    } else if (state.coupon.type === 'flat') {
      return Math.min(couponVal, rawCartTotal);
    }
    return 0;
  }, [state.coupon, rawCartTotal]);

  const cartTotal = useMemo(() => Math.max(0, rawCartTotal - discount), [rawCartTotal, discount]);
  const cartCount = useMemo(() => state.items.reduce((count, item) => count + item.quantity, 0), [state.items]);

  const sessionStats = useMemo(() => ({
    itemsCount: cartCount,
    paidAmount: 0,
    pendingAmount: cartTotal,
    totalSpend: cartTotal
  }), [cartCount, cartTotal]);

  const value = useMemo(() => ({
    state, dispatch, cartTotal, cartCount, sessionStats, discount, rawCartTotal
  }), [state, cartTotal, cartCount, sessionStats, discount, rawCartTotal]);

  return (
    <CartContext.Provider value={value}>
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
