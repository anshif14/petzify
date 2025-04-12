import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { app } from '../firebase/config';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useUser } from '../context/UserContext';
import { useAlert } from '../context/AlertContext';
import AuthModal from '../components/auth/AuthModal';
import PageLoader from '../components/common/PageLoader';
import UserOrderStepper from '../components/user/UserOrderStepper';

const UserOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { currentUser, isAuthenticated, authInitialized, loading: authLoading } = useUser();
  const { showError, showSuccess } = useAlert();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Highlight order from query param if available
    const searchParams = new URLSearchParams(location.search);
    const orderId = searchParams.get('orderId');
    
    if (orderId) {
      // Scroll to the order once loaded
      setTimeout(() => {
        const element = document.getElementById(`order-${orderId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          element.classList.add('highlight-order');
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            element.classList.remove('highlight-order');
          }, 3000);
        }
      }, 1000);
    }
  }, [location.search, orders]);

  // Function to fetch product details including image
  const fetchProductDetails = async (productId) => {
    try {
      const db = getFirestore(app);
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
      
      if (productSnap.exists()) {
        return productSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching product details:', error);
      return null;
    }
  };

  // Memoize fetchUserOrders to avoid ESLint warning
  const fetchUserOrders = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', currentUser.email),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(ordersQuery);
      const ordersList = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const orderData = docSnapshot.data();
        const items = await Promise.all(
          (orderData.items || []).map(async (item) => {
            if (item.productId) {
              const productRef = doc(db, 'products', item.productId);
              const productSnap = await getDoc(productRef);
              
              if (productSnap.exists()) {
                const productData = productSnap.data();
                return {
                  ...item,
                  imageUrl: productData.images?.[0] || null
                };
              }
            }
            return item;
          })
        );

        ordersList.push({
          id: docSnapshot.id,
          ...orderData,
          items,
          createdAt: orderData.createdAt?.toDate?.() || new Date()
        });
      }
      
      setOrders(ordersList);
      console.log(`Loaded ${ordersList.length} orders`);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showError('Could not load your orders. Please try again later.', 'Error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, showError]);

  useEffect(() => {
    // Only check authentication after it's been initialized
    if (!authInitialized) return;
    
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    
    fetchUserOrders();
  }, [isAuthenticated, fetchUserOrders, authInitialized]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase() || 'pending') {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAuthSuccess = () => {
    // Fetch orders after successful authentication
    showSuccess('Successfully signed in!', 'Welcome');
    setTimeout(() => {
      fetchUserOrders();
    }, 500);
  };

  // Function to calculate total quantity of items in an order
  const getOrderTotalItems = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((total, item) => total + (item.quantity || 0), 0);
  };

  // Function to calculate total price of items in an order
  const calculateOrderTotal = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((total, item) => {
      const itemTotal = (item.price || 0) * (item.quantity || 0);
      return total + itemTotal;
    }, 0);
  };

  // Can the order be cancelled?
  const canCancelOrder = (status) => {
    const lowerStatus = status?.toLowerCase() || '';
    return lowerStatus === 'pending' || lowerStatus === 'processing';
  };

  // Handle order cancellation
  const handleCancelOrder = async (orderId) => {
    if (!orderId || cancelLoading) return;
    
    if (!window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    setCancelLoading(true);
    try {
      const db = getFirestore(app);
      const orderRef = doc(db, 'orders', orderId);
      
      // Update order status to cancelled
      await updateDoc(orderRef, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'customer'
      });
      
      showSuccess('Order has been cancelled successfully', 'Order Cancelled');
      
      // Update the orders list
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? {...order, status: 'cancelled', cancelledAt: new Date().toISOString()} 
            : order
        )
      );
    } catch (error) {
      console.error('Error cancelling order:', error);
      showError('Could not cancel your order. Please try again later.', 'Error');
    } finally {
      setCancelLoading(false);
    }
  };

  // Show loading spinner if auth is still initializing
  if (authLoading || !authInitialized) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
          
          {loading ? (
            <PageLoader />
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
              <p className="mt-1 text-sm text-gray-500">You haven't placed any orders yet.</p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/products')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Start Shopping
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  id={`order-${order.id}`}
                  className="bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-200"
                >
                  <div className="p-6">
                    {/* Order Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-medium text-gray-900">
                          Order #{order.id.slice(-8)}
                        </h2>
                        <p className="text-sm text-gray-500">
                          Placed on {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(order.status)}`}>
                          {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Pending'}
                        </span>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          Total: {formatPrice(order.totalAmount || calculateOrderTotal(order.items))}
                        </p>
                      </div>
                    </div>

                    {/* Order Stepper */}
                    <div className="mb-6">
                      <UserOrderStepper 
                        currentStatus={order.status} 
                        courierDetails={order.courierDetails}
                      />
                    </div>

                    {/* Order Items */}
                    <div className="mt-6 border-t border-gray-200 pt-4">
                      <div className="flow-root">
                        <ul className="-my-6 divide-y divide-gray-200">
                          {order.items?.map((item, index) => (
                            <li key={index} className="py-6 flex">
                              <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="h-full w-full object-cover object-center"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4 flex-1 flex flex-col">
                                <div>
                                  <div className="flex justify-between text-base font-medium text-gray-900">
                                    <h3>{item.name}</h3>
                                    <p className="ml-4">{formatPrice(item.price * item.quantity)}</p>
                                  </div>
                                  <p className="mt-1 text-sm text-gray-500">
                                    {formatPrice(item.price)} × {item.quantity}
                                  </p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Order Summary */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex justify-between text-sm text-gray-500">
                          <p>Subtotal ({getOrderTotalItems(order.items)} items)</p>
                          <p>{formatPrice(order.subtotal || calculateOrderTotal(order.items))}</p>
                        </div>
                        {order.shippingCost > 0 && (
                          <div className="flex justify-between text-sm text-gray-500 mt-2">
                            <p>Shipping</p>
                            <p>{formatPrice(order.shippingCost)}</p>
                          </div>
                        )}
                        <div className="flex justify-between text-base font-medium text-gray-900 mt-4">
                          <p>Total</p>
                          <p>{formatPrice(order.totalAmount || calculateOrderTotal(order.items))}</p>
                        </div>
                      </div>

                      {/* Cancel Order Button */}
                      {canCancelOrder(order.status) && (
                        <div className="mt-4">
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={cancelLoading}
                            className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            Cancel Order
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      {/*<Footer />*/}
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        message="Please sign in to view your orders"
      />
    </>
  );
};

export default UserOrders; 