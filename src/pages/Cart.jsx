import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
// Import Footer only if needed for desktop view
import Footer from '../components/common/Footer';
import { useAlert } from '../context/AlertContext';
import { useUser } from '../context/UserContext';
import AuthModal from '../components/auth/AuthModal';
import { getFirestore, collection, addDoc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import { app } from '../firebase/config';
import MobileBottomNav from '../components/common/MobileBottomNav';
// Commented out for now
// import Razorpay from 'razorpay';

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const { showSuccess, showInfo, showError } = useAlert();
  const { currentUser, isAuthenticated } = useUser();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  
  // Address related states
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [newAddress, setNewAddress] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    phone: ''
  });
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  
  useEffect(() => {
    // Load cart from localStorage
    const savedCart = JSON.parse(localStorage.getItem('cart')) || [];
    setCart(savedCart);
    
    // Calculate subtotal
    const total = savedCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setSubtotal(total);
  }, []);
  
  // Fetch user addresses when authenticated
  useEffect(() => {
    // Use a flag to prevent multiple consecutive fetch attempts
    let isFetching = false;
    
    const attemptFetch = () => {
      if (isFetching) return;
      
      if (isAuthenticated() && currentUser?.email) {
        console.log('User authenticated with email, fetching addresses');
        isFetching = true;
        fetchUserAddresses()
          .finally(() => {
            isFetching = false;
          });
      }
    };
    
    // Initial attempt
    attemptFetch();
    
    // Retry mechanism if needed
    if (isAuthenticated() && !currentUser?.email) {
      console.log('User authenticated but no email yet, will retry shortly');
      const timer = setTimeout(() => {
        attemptFetch();
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [currentUser, isAuthenticated]);
  
  // Fetch user's saved addresses
  const fetchUserAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const db = getFirestore(app);
      
      // Check if currentUser exists before accessing its properties
      if (!currentUser || !currentUser.email) {
        console.log('User not fully authenticated yet');
        setLoadingAddresses(false);
        return Promise.resolve(); // Return a resolved promise
      }
      
      console.log('Fetching addresses for user:', currentUser.email);
      
      const addressesQuery = query(
        collection(db, 'addresses'),
        where('userId', '==', currentUser.email)
      );
      
      const querySnapshot = await getDocs(addressesQuery);
      const addressList = [];
      
      querySnapshot.forEach((doc) => {
        addressList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('Fetched addresses:', addressList.length);
      
      // Only update state if addresses were actually found
      // or if we currently have no addresses (to show empty state)
      if (addressList.length > 0 || addresses.length === 0) {
        setAddresses(addressList);
        
        // Pre-select an address if available
        if (addressList.length > 0) {
          // Find default address or use the first one
          const defaultAddress = addressList.find(addr => addr.isDefault) || addressList[0];
          setSelectedAddressId(defaultAddress.id);
        } else {
          setSelectedAddressId('');
        }
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error fetching addresses:', error);
      showError('Could not load your saved addresses', 'Error');
      return Promise.reject(error);
    } finally {
      setLoadingAddresses(false);
    }
  };
  
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
  
  // Handle new address input changes
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setNewAddress({
      ...newAddress,
      [name]: value
    });
  };
  
  // Save new address to Firestore
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    
    // Basic validation
    if (!newAddress.name || !newAddress.street || !newAddress.city || !newAddress.state || !newAddress.zipCode) {
      showError('Please fill in all required address fields', 'Missing Information');
      return;
    }
    
    try {
      const db = getFirestore(app);
      
      // Create new address
      const addressData = {
        ...newAddress,
        userId: currentUser.email,
        isDefault: addresses.length === 0, // Make default if it's the first address
        createdAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'addresses'), addressData);
      
      // Add the new address to state with its ID
      const newAddressWithId = {
        id: docRef.id,
        ...addressData
      };
      
      setAddresses([...addresses, newAddressWithId]);
      setSelectedAddressId(docRef.id);
      setNewAddress({
        name: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        phone: ''
      });
      setShowAddressForm(false);
      
      showSuccess('Address saved successfully', 'Success');
    } catch (error) {
      console.error('Error saving address:', error);
      showError('Could not save address. Please try again.', 'Error');
    }
  };
  
  // Handle checkout process
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
      
      // Validate address selection
      if (!selectedAddressId) {
        showError('Please select a delivery address', 'Checkout Failed');
        return;
      }
      
      const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
      if (!selectedAddress) {
        showError('Invalid address selected', 'Checkout Failed');
        return;
      }
      
      setIsProcessingOrder(true);
      
      // Create order in Firestore (cash on delivery for now)
      const db = getFirestore(app);
      
      const orderData = {
        userId: currentUser.email,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userPhone: currentUser.phone || selectedAddress.phone,
        items: cart,
        subtotal: subtotal,
        status: 'pending',
        paymentMethod: 'cod', // Cash on delivery
        shippingAddress: `${selectedAddress.name}, ${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.zipCode}`,
        addressId: selectedAddressId,
        createdAt: Timestamp.now()
      };
      
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Clear cart
      setCart([]);
      localStorage.removeItem('cart');
      
      // Update cart icon
      window.dispatchEvent(new Event('cartUpdated'));
      
      showSuccess('Your order has been placed successfully!', 'Order Placed');
      
      // Redirect to orders page
      navigate(`/my-orders?orderId=${orderRef.id}`);
      
      /* Commented out Razorpay integration
      // Initialize Razorpay
      const options = {
        key: "rzp_test_qkJl4iBVtQOj4q",
        amount: subtotal * 100, // Amount in paise
        currency: "INR",
        name: "Petzify",
        description: "Pet Products Purchase",
        handler: async function(response) {
          try {
            const db = getFirestore(app);
            
            const orderData = {
              userId: currentUser.email,
              userName: currentUser.name,
              userEmail: currentUser.email,
              userPhone: currentUser.phone,
              items: cart,
              subtotal: subtotal,
              status: 'paid',
              paymentId: response.razorpay_payment_id,
              createdAt: Timestamp.now()
            };
            
            const orderRef = await addDoc(collection(db, 'orders'), orderData);
            
            setCart([]);
            localStorage.removeItem('cart');
            
            window.dispatchEvent(new Event('cartUpdated'));
            
            showSuccess('Your order has been placed successfully!', 'Order Placed');
            
            navigate(`/my-orders?orderId=${orderRef.id}`);
          } catch (err) {
            console.error('Error saving order:', err);
            showError('Could not save your order. Please contact support.', 'Order Error');
          }
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
          contact: currentUser.phone
        },
        theme: {
          color: "#4F46E5"
        }
      };
      
      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
      */
      
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
      // Give time for user context to update completely
      const timer = setTimeout(() => {
        console.log('Auth success, attempting to fetch addresses after delay');
        if (currentUser?.email) {
          fetchUserAddresses();
        } else {
          console.log('User email still not available after auth success');
          // If user data is still not available, we'll rely on the useEffect to catch it
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 pt-24 md:pt-24 pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 md:mb-8">Your Cart</h1>
          
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
                
                {/* Delivery Address Section */}
                {isAuthenticated() && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-8">
                    <div className="p-6">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Address</h2>
                      
                      {loadingAddresses ? (
                        <div className="text-center py-4">
                          <div className="animate-spin inline-block w-6 h-6 border-t-2 border-primary rounded-full"></div>
                          <p className="mt-2 text-sm text-gray-500">Loading addresses...</p>
                        </div>
                      ) : (
                        <>
                          {addresses.length > 0 && (
                            <div className="mb-6">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select a delivery address
                              </label>
                              
                              <div className="space-y-3">
                                {addresses.map((address) => (
                                  <div 
                                    key={address.id} 
                                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                      selectedAddressId === address.id 
                                        ? 'border-primary bg-primary-50' 
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => setSelectedAddressId(address.id)}
                                  >
                                    <div className="flex items-start">
                                      <input 
                                        type="radio"
                                        checked={selectedAddressId === address.id}
                                        onChange={() => setSelectedAddressId(address.id)}
                                        className="mt-1 mr-2 h-4 w-4 text-primary focus:ring-primary"
                                      />
                                      <div>
                                        <p className="font-medium">{address.name}</p>
                                        <p className="text-sm text-gray-600">
                                          {address.street}, {address.city}, {address.state} - {address.zipCode}
                                        </p>
                                        {address.phone && (
                                          <p className="text-sm text-gray-600 mt-1">
                                            Phone: {address.phone}
                                          </p>
                                        )}
                                        {address.isDefault && (
                                          <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mt-2">
                                            Default Address
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {showAddressForm ? (
                            <div className="mt-6 border border-gray-200 rounded-lg p-4">
                              <h3 className="font-medium text-gray-800 mb-2">Add New Address</h3>
                              
                              <form onSubmit={handleSaveAddress}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Full Name*
                                    </label>
                                    <input
                                      type="text"
                                      name="name"
                                      value={newAddress.name}
                                      onChange={handleAddressChange}
                                      required
                                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Phone Number
                                    </label>
                                    <input
                                      type="text"
                                      name="phone"
                                      value={newAddress.phone}
                                      onChange={handleAddressChange}
                                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                  </div>
                                </div>
                                
                                <div className="mb-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Street Address*
                                  </label>
                                  <input
                                    type="text"
                                    name="street"
                                    value={newAddress.street}
                                    onChange={handleAddressChange}
                                    required
                                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                  />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      City*
                                    </label>
                                    <input
                                      type="text"
                                      name="city"
                                      value={newAddress.city}
                                      onChange={handleAddressChange}
                                      required
                                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      State*
                                    </label>
                                    <input
                                      type="text"
                                      name="state"
                                      value={newAddress.state}
                                      onChange={handleAddressChange}
                                      required
                                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      ZIP Code*
                                    </label>
                                    <input
                                      type="text"
                                      name="zipCode"
                                      value={newAddress.zipCode}
                                      onChange={handleAddressChange}
                                      required
                                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex justify-end space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowAddressForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                                  >
                                    Save Address
                                  </button>
                                </div>
                              </form>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowAddressForm(true)}
                              className="inline-flex items-center text-primary hover:text-primary-dark"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                              </svg>
                              Add a new address
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
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
                        <div className="text-base font-medium text-gray-900">Free</div>
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
                      disabled={isProcessingOrder || (isAuthenticated() && !selectedAddressId)}
                      className={`w-full ${
                        isProcessingOrder || (isAuthenticated() && !selectedAddressId)
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-primary hover:bg-primary-dark'
                      } text-white px-6 py-3 rounded-md transition-colors`}
                    >
                      {isProcessingOrder 
                        ? 'Processing Order...' 
                        : isAuthenticated() 
                          ? selectedAddressId
                            ? 'Place Order (Cash on Delivery)'
                            : 'Select an Address to Continue'
                          : 'Sign in to Checkout'
                      }
                    </button>
                    
                    {!isAuthenticated() && (
                      <p className="mt-2 text-sm text-gray-500 text-center">
                        You'll need to sign in or create an account to complete your purchase.
                      </p>
                    )}
                    
                    {isAuthenticated() && !selectedAddressId && addresses.length === 0 && !showAddressForm && (
                      <p className="mt-2 text-sm text-gray-500 text-center">
                        Please add a delivery address to continue with your order.
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
        initialMode="login"
        onSuccess={handleAuthSuccess}
      />
      
      {/* Only show Footer on medium screens and up */}
      <div className="hidden md:block">
        <Footer />
      </div>
      
      {/* Always show MobileBottomNav on mobile */}
      <MobileBottomNav />
    </>
  );
};

export default Cart; 