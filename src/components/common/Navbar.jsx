import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className={`fixed w-full z-50 transition-all duration-500 ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-primary transform transition-all duration-300 hover:scale-105">
          Petzify
        </Link>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-8">
          <Link to="/" className="relative text-primary hover:text-primary-dark transition-colors duration-300 group">
            Home
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link to="/about" className="relative text-primary hover:text-primary-dark transition-colors duration-300 group">
            About
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link to="/services" className="relative text-primary hover:text-primary-dark transition-colors duration-300 group">
            Services
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link to="/blog" className="relative text-primary hover:text-primary-dark transition-colors duration-300 group">
            Blog
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link to="/contact" className="relative text-primary hover:text-primary-dark transition-colors duration-300 group">
            Contact
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
          </Link>
        </div>
        
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button 
            onClick={toggleMobileMenu}
            className="text-primary focus:outline-none transition-transform duration-300 hover:scale-110"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {isMobileMenuOpen 
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="container mx-auto px-6 py-4 flex flex-col space-y-4">
            <Link 
              to="/" 
              className="text-primary hover:text-primary-dark transition-colors duration-300 py-2 border-l-2 border-transparent hover:border-primary pl-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className="text-primary hover:text-primary-dark transition-colors duration-300 py-2 border-l-2 border-transparent hover:border-primary pl-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link 
              to="/services" 
              className="text-primary hover:text-primary-dark transition-colors duration-300 py-2 border-l-2 border-transparent hover:border-primary pl-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Services
            </Link>
            <Link 
              to="/blog" 
              className="text-primary hover:text-primary-dark transition-colors duration-300 py-2 border-l-2 border-transparent hover:border-primary pl-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Blog
            </Link>
            <Link 
              to="/contact" 
              className="text-primary hover:text-primary-dark transition-colors duration-300 py-2 border-l-2 border-transparent hover:border-primary pl-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 