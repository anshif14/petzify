import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import AuthModal from './AuthModal';

const UserAccountButton = () => {
  // Add default destructuring values to prevent errors if context is undefined
  const userContext = useUser() || {};
  const { currentUser, logout, isAuthenticated } = userContext;
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const toggleModal = () => {
    setShowModal(!showModal);
  };
  
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };
  
  const handleLogout = () => {
    if (logout) logout();
    setShowDropdown(false);
  };
  
  // Create a safer version of isAuthenticated that won't crash if the function is undefined
  const checkAuthenticated = () => {
    return isAuthenticated ? isAuthenticated() : false;
  };
  
  // If the user context isn't available yet, just show the sign-in button
  if (!userContext || !isAuthenticated) {
    return (
      <>
        <button
          onClick={toggleModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Sign In
        </button>
        
        <AuthModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          initialMode="login"
        />
      </>
    );
  }
  
  return (
    <>
      {checkAuthenticated() ? (
        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-primary"
          >
            <span className="mr-2">{currentUser.name.split(' ')[0]}</span>
            <svg
              className="w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
              <div className="py-1" role="menu" aria-orientation="vertical">
                <div className="px-4 py-3">
                  <p className="text-sm">Logged in as</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {currentUser.email}
                  </p>
                </div>
                <hr />
                <Link
                  to="/my-bookings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                  onClick={() => setShowDropdown(false)}
                >
                  My Bookings
                </Link>
                <Link
                  to="/my-orders"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                  onClick={() => setShowDropdown(false)}
                >
                  My Orders
                </Link>
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                  onClick={() => setShowDropdown(false)}
                >
                  My Profile
                </Link>
                <hr />
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={toggleModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Sign In
        </button>
      )}
      
      <AuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        initialMode="login"
      />
    </>
  );
};

export default UserAccountButton; 