import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Check, Loader2, XCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import Navbar from '../../components/customer/Navbar';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { dispatch } = useCart();
  const orderId = searchParams.get('orderId');

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'paid' | 'failed'
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!orderId) {
      setStatus('failed');
      return;
    }

    const verify = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/payment/verify-session/${orderId}`, {
          withCredentials: true
        });
        if (res.data.paid) {
          setStatus('paid');
          setOrder(res.data.order);
          // Clear cart since order was placed successfully
          dispatch({ type: 'CLEAR_CART' });
          dispatch({ type: 'SET_CART_OPEN', payload: false });
          dispatch({ type: 'REMOVE_COUPON' });
          // Auto-navigate to tracking page after 3 seconds
          setTimeout(() => {
            navigate(`/track/${orderId}?success=true`, { replace: true });
          }, 3000);
        } else {
          setStatus('failed');
        }
      } catch (err) {
        console.error('Payment verification failed:', err);
        setStatus('failed');
      }
    };

    verify();
  }, [orderId, dispatch, navigate]);

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />
      <div className="flex items-center justify-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md w-full"
        >
          {status === 'verifying' && (
            <div className="space-y-6">
              <div className="w-24 h-24 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              <h2 className="text-3xl font-serif font-black text-white">Verifying Payment...</h2>
              <p className="text-text-muted">Please wait while we confirm your payment with the bank.</p>
            </div>
          )}

          {status === 'paid' && (
            <div className="space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(16,185,129,0.4)]"
              >
                <Check className="w-12 h-12 text-white stroke-[3px]" />
              </motion.div>
              <h2 className="text-4xl font-serif font-black text-white">Payment Successful! 🎉</h2>
              <p className="text-text-muted">
                Your order has been confirmed. Redirecting you to track your order...
              </p>
              {order && (
                <div className="bg-surface border border-white/10 rounded-2xl p-4 text-left space-y-2">
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest">Order Summary</p>
                  <p className="text-white font-bold">Bill #{order.billNumber || order._id?.slice(-6).toUpperCase()}</p>
                  <p className="text-text-muted text-sm">Total: <span className="text-primary font-black">₹{order.total?.toFixed(2)}</span></p>
                </div>
              )}
              <button
                onClick={() => navigate(`/track/${orderId}?success=true`, { replace: true })}
                className="w-full bg-primary text-background py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary-light transition-all"
              >
                Track My Order <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-6">
              <div className="w-24 h-24 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-12 h-12 text-red-400" />
              </div>
              <h2 className="text-3xl font-serif font-black text-white">Payment did not go through</h2>
              <p className="text-text-muted">
                Your payment was not completed. Your cart items are still saved. Please try again.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/', { replace: true })}
                  className="w-full bg-primary text-background py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary-light transition-all"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
