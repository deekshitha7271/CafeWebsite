import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

const OrderAgainPage = () => {
  const navigate = useNavigate();
  const { dispatch } = useCart();

  useEffect(() => {
    // 1. Clear the cart entirely to ensure a fresh session
    dispatch({ type: 'CLEAR_CART' });
    
    // 2. Immediately navigate back to the menu so the user can start a new selection
    navigate('/');
  }, [dispatch, navigate]);

  return null; // Silent redirector
};

export default OrderAgainPage;
