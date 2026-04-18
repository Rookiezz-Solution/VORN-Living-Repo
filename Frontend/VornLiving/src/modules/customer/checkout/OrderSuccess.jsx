import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const OrderSuccess = () => {
  const navigate = useNavigate();
  const info = React.useMemo(() => {
    try {
      const raw = sessionStorage.getItem('lastOrderInfo');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-secondary mb-4">Order Confirmed!</h1>
      {info?.orderNumber ? (
        <p className="text-gray-600 mb-8">
          Thank you for your purchase. Your order ID is <span className="font-mono font-bold">#{info.orderNumber}</span>.
        </p>
      ) : (
        <p className="text-gray-600 mb-8">Thank you for your purchase.</p>
      )}
      <div className="flex justify-center space-x-4">
        <button onClick={() => navigate('/shop')} className="rf-btn-primary px-6 py-2 transition">
          Continue Shopping
        </button>
        {info?.orderId ? (
          <button onClick={() => navigate(`/order/${info.orderId}/track`)} className="rf-btn-secondary px-6 py-2 transition">
            Track Order
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default OrderSuccess;

