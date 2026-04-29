import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { Loader2, ArrowRightCircle } from 'lucide-react';

const OrderAgainPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { dispatch } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const repeatOrder = async () => {
      try {
        const { data: order } = await axios.get(`${import.meta.env.VITE_API_URL}/orders/${orderId}`);

        const cartItems = order.items.map(item => ({
          ...item,
          _id: item.menuItemId || item._id,
        }));

        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        dispatch({
          type: 'SET_CART',
          payload: {
            items: cartItems,
            orderType: order.orderType,
            table: order.table,
            arrivalTime: order.arrivalTime ? new Date(order.arrivalTime).toISOString().slice(0, 16) : '',
            isCartOpen: false
          }
        });

        navigate('/');
      } catch (err) {
        console.error('Repeat order failed:', err);
        setError(err.response?.data?.error || err.message || 'Failed to repeat this order.');
      } finally {
        setLoading(false);
      }
    };

    repeatOrder();
  }, [orderId, dispatch]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-20">
      <div className="glass-panel rounded-3xl p-10 max-w-lg w-full text-center">
        {loading ? (
          <>
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
            <h1 className="text-3xl font-serif font-black text-white mt-8">Repeating your last order</h1>
            <p className="text-text-muted mt-4">We are placing the order again and redirecting you to payment.</p>
          </>
        ) : error ? (
          <>
            <h1 className="text-3xl font-serif font-black text-white">Unable to repeat order</h1>
            <p className="text-text-muted mt-4">{error}</p>
          </>
        ) : (
          <>
            <ArrowRightCircle className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-3xl font-serif font-black text-white mt-8">Redirecting to checkout</h1>
            <p className="text-text-muted mt-4">If you are not redirected automatically, please wait a moment.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderAgainPage;
