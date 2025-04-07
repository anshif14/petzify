import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { app } from '../../firebase/config';
import UserOrderStepper from './UserOrderStepper';
import { useUser } from '../../context/UserContext';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useUser();

  useEffect(() => {
    if (currentUser?.email) {
      fetchUserOrders();
    }
  }, [currentUser]);

  const fetchUserOrders = async () => {
    try {
      const db = getFirestore(app);
      const ordersQuery = query(
        collection(db, 'orders'),
        where('customerEmail', '==', currentUser.email),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(ordersQuery);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      dispatched: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-8 text-gray-800">My Orders</h2>
      
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-gray-400 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <p className="text-gray-500 text-xl mb-4">You haven't placed any orders yet</p>
          <p className="text-gray-400 mb-8">Start shopping to see your orders here</p>
          <button 
            onClick={() => window.location.href = '/shop'}
            className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary-dark transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">
                      Order #{order.id.slice(-6)}
                    </h3>
                    <p className="text-gray-500 mt-1">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <UserOrderStepper 
                    currentStatus={order.status} 
                    courierDetails={order.courierDetails}
                  />
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Order Details</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-2">
                          <p className="text-sm">
                            <span className="text-gray-600 font-medium">Shipping Address:</span><br />
                            {order.shippingAddress}
                          </p>
                          {order.courierDetails && order.status === 'dispatched' && (
                            <div className="mt-4 pt-3 border-t border-gray-200">
                              <p className="text-sm font-medium text-gray-600 mb-1">Courier Details:</p>
                              <p className="text-sm">{order.courierDetails.company}</p>
                              <p className="text-sm">
                                <span className="font-medium">Tracking Number:</span>{' '}
                                {order.courierDetails.trackingNumber}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Order Summary</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-2">
                          {order.items?.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">{item.name}</p>
                                <p className="text-gray-500">Quantity: {item.quantity}</p>
                              </div>
                              <p className="text-gray-800 font-medium">
                                ${(item.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          ))}
                          <div className="border-t border-gray-200 mt-4 pt-4">
                            <div className="flex justify-between font-semibold text-gray-800">
                              <span>Total Amount</span>
                              <span>${order.totalAmount?.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders; 