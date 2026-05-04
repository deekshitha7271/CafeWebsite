import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
import { Loader2, RefreshCw } from 'lucide-react';

const OrderAgainPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { dispatch } = useCart();
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAndRepeat = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders/${orderId}`);
        const order = res.data;

        if (!order || !order.items) {
          throw new Error('Order data is invalid');
        }

        // 1. Map old items to fresh cart items (ensuring they are clean)
        const cartItems = order.items.map(item => ({
          _id: item._id,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
          category: item.category
        }));

        // 2. Append to existing cart
        cartItems.forEach(item => {
          dispatch({ type: 'ADD_ITEM', payload: item });
        });

        // Open cart to show success
        dispatch({ type: 'SET_CART_OPEN', payload: true });

        // 3. Track the repeat action for analytics
        axios.post(`${import.meta.env.VITE_API_URL}/audit/record`, {
          action: 'order_repeat_click',
          details: { originalOrderId: orderId }
        }).catch(() => {});

        // 4. Navigate back to menu
        navigate('/');

      } catch (err) {
        console.error('Repeat order failed:', err);
        setError('Could not retrieve previous order. Please add items manually.');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    if (orderId) {
      fetchAndRepeat();
    } else {
      navigate('/');
    }
  }, [orderId, dispatch, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-sm">
          <p className="text-red-400 font-bold mb-2">Oops!</p>
          <p className="text-text-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="glass-panel rounded-3xl p-10 max-w-lg w-full text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <RefreshCw className="w-20 h-20 text-primary animate-spin" />
        </div>
        <h2 className="text-2xl font-serif font-black text-white mb-2">Preparing Your Favorites</h2>
        <p className="text-text-muted text-sm tracking-wide">
          We're fetching your previous order details to set up your cart...
        </p>
      </div>
    </div>
  );
};

export default OrderAgainPage;
