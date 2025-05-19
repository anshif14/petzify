import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import tailTalksIcon from '../../assets/images/tail_talks_icon.png';

const MobileBottomNav = () => {
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const updateCartCount = () => {
      const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
      setCartCount(cartItems.length);
    };

    // Initial cart count
    updateCartCount();

    // Listen for storage events to update cart count
    window.addEventListener('storage', updateCartCount);

    // Custom event for cart updates within the same tab
    window.addEventListener('cartUpdated', updateCartCount);

    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  // Classes for active and inactive icons
  const activeClass = "text-primary";
  const inactiveClass = "text-gray-400";

  return (
    <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 px-2 py-2 flex justify-between items-center z-50 md:hidden pointer-events-auto">
      {/* Home */}
      <NavLink 
        to="/" 
        className={({ isActive }) => `flex flex-col items-center py-1 px-3 ${isActive ? activeClass : inactiveClass}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-xs mt-1">Home</span>
      </NavLink>

      {/* Products */}
      <NavLink 
        to="/products" 
        className={({ isActive }) => `flex flex-col items-center py-1 px-3 ${isActive ? activeClass : inactiveClass}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <span className="text-xs mt-1">Products</span>
      </NavLink>

      {/* TailTalks */}
      <NavLink 
        to="/tailtalk" 
        className={({ isActive }) => `flex flex-col items-center py-1 px-3 ${isActive ? activeClass : inactiveClass}`}
      >
        <img src={tailTalksIcon} alt="TailTalks" className="h-6 w-6" />
        <span className="text-xs mt-1">Tailtalks</span>
      </NavLink>

      {/* Services */}
      <NavLink 
        to="/services" 
        className={({ isActive }) => `flex flex-col items-center py-1 px-3 ${isActive ? activeClass : inactiveClass}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="text-xs mt-1">Services</span>
      </NavLink>

      {/* Profile */}
      <NavLink 
        to="/profile" 
        className={({ isActive }) => `flex flex-col items-center py-1 px-3 ${isActive ? activeClass : inactiveClass}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-xs mt-1">Profile</span>
      </NavLink>
    </div>
  );
};

export default MobileBottomNav; 