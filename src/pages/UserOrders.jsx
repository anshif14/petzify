import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { app } from '../firebase/config';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useUser } from '../context/UserContext';
import { useAlert } from '../context/AlertContext';
import AuthModal from '../components/auth/AuthModal';
import PageLoader from '../components/common/PageLoader';

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
      
      querySnapshot.forEach((doc) => {
        ordersList.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        });
      });
      
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">My Orders</h1>
          
          {!isAuthenticated() ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h2 className="text-xl font-medium text-gray-700 mb-4">Please Sign In</h2>
              <p className="text-gray-500 mb-6">
                You need to be signed in to view your orders
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="inline-block bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
              >
                Sign In
              </button>
            </div>
          ) : loading ? (
            <div className="bg-white rounded-lg shadow p-6">
              <PageLoader message="Loading your orders..." />
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <h2 className="text-xl font-medium text-gray-700 mb-4">No Orders Found</h2>
              <p className="text-gray-500 mb-6">
                You haven't placed any orders yet.
              </p>
              <button
                onClick={() => navigate('/products')}
                className="inline-block bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Order History</h2>
                <p className="text-sm text-gray-500">
                  View and track all your recent orders
                </p>
              </div>
            
              {orders.map((order) => (
                <div
                  key={order.id}
                  id={`order-${order.id}`}
                  className="bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300"
                >
                  <div className="border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Order #{order.id.substring(0, 8)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Placed on {formatDate(order.createdAt)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {getOrderTotalItems(order.items)} item{getOrderTotalItems(order.items) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="mt-2 md:mt-0 flex flex-col md:items-end">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          order.status
                        )}`}
                      >
                        {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Processing'}
                      </span>
                      
                      {canCancelOrder(order.status) && (
                        <button 
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancelLoading}
                          className="mt-2 text-sm text-red-600 hover:text-red-800 transition-colors font-medium focus:outline-none"
                        >
                          {cancelLoading ? 'Cancelling...' : 'Cancel Order'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <ul className="divide-y divide-gray-200">
                    {order.items && Array.isArray(order.items) && order.items.map((item, index) => (
                      <li key={index} className="px-6 py-4 flex items-center">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover object-center"
                            />
                          ) : (
                            <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-400">No image</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{item.name || 'Product'}</h4>
                              <p className="mt-1 text-xs text-gray-500">Qty: {item.quantity || 1}</p>
                            </div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatPrice((item.price || 0) * (item.quantity || 1))}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="flex justify-between text-base font-medium text-gray-900">
                      <p>Subtotal</p>
                      <p>{formatPrice(order.subtotal)}</p>
                    </div>
                    
                    {/* Show shipping and order total if available */}
                    {order.shipping && (
                      <div className="flex justify-between text-sm text-gray-700 mt-2">
                        <p>Shipping</p>
                        <p>{formatPrice(order.shipping)}</p>
                      </div>
                    )}
                    
                    {order.tax && (
                      <div className="flex justify-between text-sm text-gray-700 mt-2">
                        <p>Tax</p>
                        <p>{formatPrice(order.tax)}</p>
                      </div>
                    )}
                    
                    {(order.shipping || order.tax) && (
                      <div className="flex justify-between text-base font-medium text-gray-900 mt-3 pt-3 border-t border-gray-200">
                        <p>Total</p>
                        <p>{formatPrice((order.subtotal || 0) + (order.shipping || 0) + (order.tax || 0))}</p>
                      </div>
                    )}
                    
                    {order.status === 'cancelled' && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-red-600">
                          This order was cancelled {order.cancelledAt ? `on ${new Date(order.cancelledAt).toLocaleString()}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          if (!isAuthenticated()) {
            navigate('/');
          }
        }}
        initialMode="login"
        onSuccess={handleAuthSuccess}
      />
      

    </>
  );
};

export default UserOrders; 