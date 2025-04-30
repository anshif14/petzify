import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, orderBy, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { app } from '../firebase/config';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useUser } from '../context/UserContext';
import { useAlert } from '../context/AlertContext';
import AuthModal from '../components/auth/AuthModal';
import PageLoader from '../components/common/PageLoader';
import UserOrderStepper from '../components/user/UserOrderStepper';
import ProductReviewForm from '../components/user/ProductReviewForm';
import ProductReviewDisplay from '../components/user/ProductReviewDisplay';
import RatingDisplay from '../components/common/RatingDisplay';

const UserOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { currentUser, isAuthenticated, authInitialized, loading: authLoading } = useUser();
  const { showError, showSuccess } = useAlert();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [productToReview, setProductToReview] = useState(null);
  const [productReviews, setProductReviews] = useState({});
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

  // Function to fetch product reviews
  const fetchProductReviews = useCallback(async (orders) => {
    if (!orders || orders.length === 0) return;
    
    try {
      const db = getFirestore(app);
      
      // Extract all product IDs from orders
      const productIds = [];
      const orderProductMap = {};
      
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            if (item.productId) {
              productIds.push(item.productId);
              
              // Map products to their respective orders
              if (!orderProductMap[order.id]) {
                orderProductMap[order.id] = {};
              }
              orderProductMap[order.id][item.productId] = item;
            }
          });
        }
      });
      
      if (productIds.length === 0) return;
      
      // Query for reviews
      const reviewsQuery = query(
        collection(db, 'productReviews'),
        where('productId', 'in', productIds)
      );
      
      const reviewsSnapshot = await getDocs(reviewsQuery);
      
      // Organize reviews by product ID
      const reviewsByProduct = {};
      
      reviewsSnapshot.forEach(doc => {
        const reviewData = doc.data();
        const productId = reviewData.productId;
        
        if (!reviewsByProduct[productId]) {
          reviewsByProduct[productId] = [];
        }
        
        reviewsByProduct[productId].push({
          id: doc.id,
          ...reviewData
        });
      });
      
      setProductReviews(reviewsByProduct);
    } catch (error) {
      console.error('Error fetching product reviews:', error);
    }
  }, []);

  // Function to check if order is delivered
  const isOrderDelivered = (status) => {
    return status?.toLowerCase() === 'delivered';
  };

  // Improved function to check if a product can be reviewed
  const canReviewProduct = (order, item) => {
    // Debug info
    console.log("Checking if can review:", { 
      status: order.status, 
      itemName: item.name,
      productId: item.productId,
      item
    });
    
    // Must have a valid productId to be reviewable
    if (!item.productId) {
      return false;
    }
    
    // Always allow reviews for delivered orders
    if (order.status?.toLowerCase() === 'delivered') {
      return true;
    }
    
    return false;
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
        
        // Ensure items is an array - handle both null, undefined and object cases
        let itemsArray = [];
        
        if (orderData.items) {
          // Convert items to array if it's an object (with numeric keys)
          if (!Array.isArray(orderData.items) && typeof orderData.items === 'object') {
            itemsArray = Object.keys(orderData.items)
              .filter(key => !isNaN(parseInt(key)))
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => {
                const item = orderData.items[key];
                // Ensure each item is an object with at least a name
                return typeof item === 'object' ? item : { name: String(item) };
              });
          } else if (Array.isArray(orderData.items)) {
            itemsArray = orderData.items;
          }
        }
        
        // Process items to add images and other details
        const processedItems = await Promise.all(
          itemsArray.map(async (item, index) => {
            // Ensure every item has a productId
            const productId = item.productId ;
            
            try {
              // Try to get product image from Firestore if available
              if (item.productId) {
                const productRef = doc(db, 'products', item.productId);
                const productSnap = await getDoc(productRef);
                
                if (productSnap.exists()) {
                  const productData = productSnap.data();
                  return {
                    ...item,
                    productId: item.productId,
                    index,
                    imageUrl: productData.images?.[0] || null
                  };
                }
              }
            } catch (err) {
              console.error('Error fetching product image:', err);
            }
            
            // Fallback with placeholder image or default values
            return { 
              ...item, 
              productId, // Ensure all items have a productId
              index,
              imageUrl: item.imageUrl || item.image || null
            };
          })
        );

        ordersList.push({
          id: docSnapshot.id,
          ...orderData,
          items: processedItems,
          createdAt: orderData.createdAt?.toDate?.() || new Date()
        });
      }
      
      setOrders(ordersList);
      
      // Also fetch reviews for these products
      fetchProductReviews(ordersList);
      
      console.log(`Loaded ${ordersList.length} orders`);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showError('Could not load your orders. Please try again later.', 'Error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, showError, fetchProductReviews]);

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

  // Check if product has been reviewed
  const hasBeenReviewed = (orderId, productId) => {
    if (!productReviews[productId]) return false;
    
    return productReviews[productId].some(review => review.orderId === orderId);
  };

  // Function to handle product review
  const handleReviewProduct = (order, item) => {
    // Only use the actual productId from the item object
    if (!item.productId) {
      console.error("Cannot review item without productId:", item);
      showError("This product cannot be reviewed", "Error");
      return;
    }
    
    // Create a product object with required fields
    const productForReview = {
      id: item.productId,
      name: item.name || 'Product'
    };
    
    // Add current user info
    const userInfo = {
      userId: currentUser?.id || null,
      userEmail: currentUser?.email || null,
      userName: currentUser?.name || 'Anonymous'
    };
    
    console.log("Opening review form with:", { 
      orderId: order.id,
      product: productForReview,
      userInfo
    });
    
    setProductToReview({
      orderId: order.id,
      ...productForReview,
      ...userInfo
    });
  };

  // Function to handle review submission success
  const handleReviewSuccess = () => {
    // Clear product to review
    setProductToReview(null);
    
    // Refetch orders and reviews
    fetchUserOrders();
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
                            <li key={index} className="py-6 flex flex-col">
                              <div className="flex">
                                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      className="h-full w-full object-cover object-center"
                                    />
                                  ) : (
                                    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                                      {/* Default product category images */}
                                      {item.name?.toLowerCase().includes('dog') ? (
                                        <img 
                                          src="https://firebasestorage.googleapis.com/v0/b/petzify-app.appspot.com/o/products%2Fdefault%2Fdog-food-default.jpg?alt=media"
                                          alt={item.name}
                                          className="h-full w-full object-cover object-center"
                                        />
                                      ) : item.name?.toLowerCase().includes('cat') ? (
                                        <img 
                                          src="https://firebasestorage.googleapis.com/v0/b/petzify-app.appspot.com/o/products%2Fdefault%2Fcat-food-default.jpg?alt=media"
                                          alt={item.name}
                                          className="h-full w-full object-cover object-center"
                                        />
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                      )}
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
                                  
                                  {/* Add Review Button - only show for delivered orders and items not yet reviewed */}
                                  {canReviewProduct(order, item) && (
                                    <div className="mt-4">
                                      {hasBeenReviewed(order.id, item.productId) ? (
                                        <div className="bg-gray-50 p-3 rounded-md">
                                          <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium text-gray-700">Your Review</p>
                                            <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                              Reviewed
                                            </div>
                                          </div>
                                          
                                          {productReviews[item.productId]?.map(review => (
                                            review.orderId === order.id && (
                                              <ProductReviewDisplay 
                                                key={review.id}
                                                review={review}
                                              />
                                            )
                                          ))}
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => handleReviewProduct(order, item)}
                                          className="text-primary hover:text-primary-dark text-sm font-medium flex items-center"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                          Write a Review
                                        </button>
                                      )}
                                    </div>
                                  )}
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
      
      {/* Product Review Modal */}
      {productToReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 mr-4 flex-shrink-0 rounded-md overflow-hidden border border-gray-200">
                  {productToReview.imageUrl ? (
                    <img 
                      src={productToReview.imageUrl}
                      alt={productToReview.name}
                      className="w-full h-full object-cover"
                    />
                  ) : productToReview.name?.toLowerCase().includes('dog') ? (
                    <img 
                      src="https://firebasestorage.googleapis.com/v0/b/petzify-app.appspot.com/o/products%2Fdefault%2Fdog-food-default.jpg?alt=media"
                      alt={productToReview.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{productToReview.name}</h2>
              </div>
              
              <ProductReviewForm 
                product={productToReview} 
                orderId={productToReview.orderId}
                userId={productToReview.userId}
                userEmail={productToReview.userEmail}
                userName={productToReview.userName}
                onSuccess={handleReviewSuccess}
                onCancel={() => setProductToReview(null)}
              />
            </div>
          </div>
        </div>
      )}
      
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