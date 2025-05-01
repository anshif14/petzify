import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const [cartItemCount, setCartItemCount] = useState(0);
  
  // Define active and inactive class styles
  const activeIconClass = "text-primary";
  const inactiveIconClass = "text-gray-500";
  
  // Get cart item count
  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const count = cart.reduce((total, item) => total + item.quantity, 0);
      setCartItemCount(count);
    };
    
    // Initial count
    updateCartCount();
    
    // Listen for storage events to update cart count when it changes
    window.addEventListener('storage', updateCartCount);
    
    // Custom event for cart updates from within the same window
    window.addEventListener('cartUpdated', updateCartCount);
    
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-50">
      <div className="flex justify-around items-center h-16">
        {/* Home */}
        <NavLink to="/home" className="flex flex-col items-center justify-center w-full h-full">
          {({isActive}) => (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isActive ? activeIconClass : inactiveIconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className={`text-xs mt-1 ${isActive ? 'text-primary font-medium' : 'text-gray-500'}`}>Home</span>
            </>
          )}
        </NavLink>
        
        {/* Services */}
        <NavLink to="/services" className="flex flex-col items-center justify-center w-full h-full">
          {({isActive}) => (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isActive ? activeIconClass : inactiveIconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className={`text-xs mt-1 ${isActive ? 'text-primary font-medium' : 'text-gray-500'}`}>Services</span>
            </>
          )}
        </NavLink>
        
        {/* Products */}
        <NavLink to="/products" className="flex flex-col items-center justify-center w-full h-full">
          {({isActive}) => (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isActive ? activeIconClass : inactiveIconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className={`text-xs mt-1 ${isActive ? 'text-primary font-medium' : 'text-gray-500'}`}>Products</span>
            </>
          )}
        </NavLink>
        
        {/* Cart */}
        <button 
          onClick={() => navigate("/cart")}
          className="relative flex flex-col items-center justify-center w-full h-full"
        >
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-1 text-gray-500">Cart</span>
        </button>
        
        {/* Account/Profile */}
        <NavLink to="/profile" className="flex flex-col items-center justify-center w-full h-full">
          {({isActive}) => (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isActive ? activeIconClass : inactiveIconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className={`text-xs mt-1 ${isActive ? 'text-primary font-medium' : 'text-gray-500'}`}>Profile</span>
            </>
          )}
        </NavLink>
      </div>
    </div>
  );
};

export default MobileBottomNav; 