import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useAlert } from '../context/AlertContext';
import { useUser } from '../context/UserContext';
import AuthModal from '../components/auth/AuthModal';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { app } from '../firebase/config';

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const { showSuccess, showInfo, showError } = useAlert();
  const { currentUser, isAuthenticated } = useUser();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  
  useEffect(() => {
    // Load cart from localStorage
    const savedCart = JSON.parse(localStorage.getItem('cart')) || [];
    setCart(savedCart);
    
    // Calculate subtotal
    const total = savedCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setSubtotal(total);
  }, []);
  
  const handleQuantityChange = (index, value) => {
    const newCart = [...cart];
    newCart[index].quantity = value;
    
    // Update cart in state and localStorage
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    
    // Recalculate subtotal
    const total = newCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setSubtotal(total);
  };
  
  const handleRemoveItem = (id) => {
    try {
      const updatedCart = cart.filter(item => item.id !== id);
      setCart(updatedCart);
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      
      // Dispatch cartUpdated event
      window.dispatchEvent(new Event('cartUpdated'));
      
      showInfo('Item removed from cart', 'Cart Updated');
    } catch (err) {
      console.error('Error removing item:', err);
      showError('Could not remove item from cart', 'Error');
    }
  };
  
  const handleUpdateQuantity = (id, newQuantity) => {
    try {
      if (newQuantity < 1) return;
      
      const updatedCart = cart.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      );
      
      setCart(updatedCart);
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      
      // Dispatch cartUpdated event
      window.dispatchEvent(new Event('cartUpdated'));
      
      // Calculate subtotal
      const total = updatedCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      setSubtotal(total);
    } catch (err) {
      console.error('Error updating quantity:', err);
      showError('Could not update item quantity', 'Error');
    }
  };
  
  const handleClearCart = () => {
    try {
      setCart([]);
      localStorage.removeItem('cart');
      setSubtotal(0);
      
      // Dispatch cartUpdated event
      window.dispatchEvent(new Event('cartUpdated'));
      
      showInfo('Your cart has been cleared', 'Cart Cleared');
    } catch (err) {
      console.error('Error clearing cart:', err);
      showError('Could not clear cart', 'Error');
    }
  };
  
  const handleCheckout = async () => {
    if (isProcessingOrder) {
      console.log('Order is already being processed');
      return;
    }
    
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    
    try {
      if (cart.length === 0) {
        showError('Your cart is empty', 'Checkout Failed');
        return;
      }
      
      setIsProcessingOrder(true);
      
      const db = getFirestore(app);
      
      const orderData = {
        userId: currentUser.email,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userPhone: currentUser.phone,
        items: cart,
        subtotal: subtotal,
        status: 'pending',
        createdAt: Timestamp.now()
      };
      
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      setCart([]);
      localStorage.removeItem('cart');
      
      window.dispatchEvent(new Event('cartUpdated'));
      
      showSuccess('Your order has been placed successfully!', 'Order Placed');
      
      navigate(`/my-orders?orderId=${orderRef.id}`);
    } catch (err) {
      console.error('Error processing checkout:', err);
      showError('Could not process your order. Please try again.', 'Checkout Error');
    } finally {
      setIsProcessingOrder(false);
    }
  };
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleAuthSuccess = () => {
    if (!isProcessingOrder) {
      setTimeout(() => {
        handleCheckout();
      }, 800);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>
          
          {cart.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <h2 className="text-xl font-medium text-gray-700 mb-4">Your cart is empty</h2>
              <p className="text-gray-500 mb-6">Looks like you haven't added any products to your cart yet.</p>
              <button
                onClick={() => navigate('/products')}
                className="inline-block bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6">
                    <div className="flow-root">
                      <ul className="-my-6 divide-y divide-gray-200">
                        {cart.map((item, index) => (
                          <li key={index} className="py-6 flex">
                            {/* Product Image */}
                            <div className="flex-shrink-0 w-24 h-24 border border-gray-200 rounded-md overflow-hidden">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-center object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-xs text-gray-500">No image</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Product Details */}
                            <div className="ml-4 flex-1 flex flex-col">
                              <div>
                                <div className="flex justify-between text-base font-medium text-gray-900">
                                  <h3>
                                    <button 
                                      onClick={() => navigate(`/products/${item.id}`)}
                                      className="hover:text-primary"
                                    >
                                      {item.name}
                                    </button>
                                  </h3>
                                  <p className="ml-4">{formatPrice(item.price)}</p>
                                </div>
                              </div>
                              
                              <div className="flex-1 flex items-end justify-between text-sm">
                                <div className="flex items-center">
                                  <label htmlFor={`quantity-${index}`} className="mr-2 text-gray-500">
                                    Qty
                                  </label>
                                  <input
                                    type="number"
                                    id={`quantity-${index}`}
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                                    className="w-16 rounded border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                                  />
                                </div>
                                
                                <div className="flex">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="font-medium text-red-600 hover:text-red-500"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
                    <div className="flex justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => navigate('/products')}
                        className="font-medium text-primary hover:text-primary-dark"
                      >
                        Continue Shopping
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCart}
                        className="font-medium text-red-600 hover:text-red-500"
                      >
                        Clear Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
                  
                  <div className="flow-root">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <div className="text-base text-gray-600">Subtotal</div>
                        <div className="text-base font-medium text-gray-900">{formatPrice(subtotal)}</div>
                      </div>
                      
                      <div className="flex justify-between">
                        <div className="text-base text-gray-600">Shipping</div>
                        <div className="text-base font-medium text-gray-900">Calculated at checkout</div>
                      </div>
                      
                      <div className="flex justify-between">
                        <div className="text-base text-gray-600">Tax</div>
                        <div className="text-base font-medium text-gray-900">Calculated at checkout</div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between">
                          <div className="text-base font-medium text-gray-900">Order Total</div>
                          <div className="text-base font-medium text-gray-900">{formatPrice(subtotal)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={handleCheckout}
                      disabled={isProcessingOrder}
                      className={`w-full ${isProcessingOrder ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'} text-white px-6 py-3 rounded-md transition-colors`}
                    >
                      {isProcessingOrder 
                        ? 'Processing Order...' 
                        : isAuthenticated() 
                          ? 'Proceed to Checkout' 
                          : 'Sign in to Checkout'
                      }
                    </button>
                    
                    {!isAuthenticated() && (
                      <p className="mt-2 text-sm text-gray-500 text-center">
                        You'll need to sign in or create an account to complete your purchase.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signup"
        onSuccess={handleAuthSuccess}
      />
      
      <Footer />
    </>
  );
};

export default Cart; 