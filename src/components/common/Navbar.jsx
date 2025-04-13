import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import logoImage from '../../assets/images/logo.png';
import logoText from '../../assets/images/logo_text.png';
import UserAccountButton from '../auth/UserAccountButton';

const Navbar = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  
  // Define active and inactive class styles
  const activeClass = "text-primary font-medium";
  const inactiveClass = "text-primary-dark hover:text-primary transition-colors duration-300";

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
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
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 shadow-md' : 'bg-white/80'}`}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/home" className="flex items-center">
            {/*<img src={logoImage} alt="Petzify Logo" className="h-10 w-auto" />*/}
            <img src={logoText} alt="Petzify" className="h-8 ml-2 w-auto" />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink end to="/home" className={({isActive}) => isActive ? activeClass : inactiveClass}>
              Home
            </NavLink>

            <NavLink to="/services" className={({isActive}) => isActive ? activeClass : inactiveClass}>
              Services
            </NavLink>
            <NavLink to="/products" className={({isActive}) => isActive ? activeClass : inactiveClass}>
              Products
            </NavLink>
            {/*<NavLink to="/book-appointment" className={({isActive}) => isActive ? activeClass : inactiveClass}>*/}
            {/*  Book Vet*/}
            {/*</NavLink>*/}
            <NavLink to="/about" className={({isActive}) => isActive ? activeClass : inactiveClass}>
              About
            </NavLink>
            <NavLink to="/contact" className={({isActive}) => isActive ? activeClass : inactiveClass}>
              Contact
            </NavLink>
            
            {/* Cart Icon */}
            <button 
              onClick={() => navigate("/cart")}
              className="relative p-1 text-primary-dark hover:text-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* User Account Button */}
            <UserAccountButton />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            {/* Cart Icon (Mobile) */}
            <button 
              onClick={() => navigate("/cart")}
              className="relative p-1 text-primary-dark hover:text-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
            
            <button
              className="text-primary-dark hover:text-primary"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <NavLink end to="/home" 
              className={({isActive}) => 
                `block px-3 py-2 rounded-md text-base font-medium ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </NavLink>
            <NavLink to="/about" 
              className={({isActive}) => 
                `block px-3 py-2 rounded-md text-base font-medium ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </NavLink>
            <NavLink to="/services" 
              className={({isActive}) => 
                `block px-3 py-2 rounded-md text-base font-medium ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Services
            </NavLink>
            <NavLink to="/products" 
              className={({isActive}) => 
                `block px-3 py-2 rounded-md text-base font-medium ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Products
            </NavLink>
            <NavLink to="/book-appointment" 
              className={({isActive}) => 
                `block px-3 py-2 rounded-md text-base font-medium ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Book Vet
            </NavLink>
            <NavLink to="/contact" 
              className={({isActive}) => 
                `block px-3 py-2 rounded-md text-base font-medium ${isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </NavLink>
            {/* User Account Button Mobile */}
            <div className="px-3 py-2">
              <UserAccountButton />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 