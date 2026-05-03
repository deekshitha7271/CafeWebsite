import React, { useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { playOrderSuccessSound } from '../../lib/utils';

const SuccessPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const navigate = useNavigate();
  const { dispatch } = useCart();

  useEffect(() => {
    // Clear cart upon successful checkout
    dispatch({ type: 'CLEAR_CART' });
    dispatch({ type: 'SET_CART_OPEN', payload: false });
    
    // Play success chime
    playOrderSuccessSound();

    // Ensure Navbar recognizes the active order
    if (orderId) {
      dispatch({ type: 'SET_LAST_ORDER_ID', payload: orderId });
      
      // Track order placement
      axios.post(`${import.meta.env.VITE_API_URL}/audit/record`, {
        action: 'order_placed',
        details: { orderId }
      }).catch(() => {});
    }

    // Redirect to tracking page after 3 seconds
    const timer = setTimeout(() => {
      if (orderId) {
        navigate(`/track/${orderId}?success=true`);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [orderId, navigate, dispatch]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card p-8 rounded-3xl flex flex-col items-center text-center max-w-sm w-full"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-10 h-10" />
        </motion.div>

        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-text-muted mb-8">
          Your order has been placed. We're redirecting you to the tracking page...
        </p>

        <div className="w-full flex justify-center">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SuccessPage;
