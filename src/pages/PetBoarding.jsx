import React, { useState, useEffect } from 'react';
import PetBoardingRegistration from '../components/services/PetBoardingRegistration';
import PetBoardingSearch from '../components/services/PetBoardingSearch';

const PetBoarding = () => {
  const [activeView, setActiveView] = useState('search'); // Default to search view
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const handleViewChange = (view) => {
    setActiveView(view);
    window.scrollTo(0, 0);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-8 relative">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="text-left">
            <h1 className="text-3xl md:text-4xl font-bold">Pet Boarding Service</h1>
            <p className="text-lg max-w-xl mt-2">
              Safe and comfortable accommodation for your pets when you're away.
            </p>
          </div>
          
          {/* Register button */}
          <div className="hidden md:block">
            <button
              onClick={() => handleViewChange('register')}
              className="px-4 py-2 bg-white text-primary font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
            >
              Register Your Boarding Center
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        {activeView === 'register' && (
          <div>
            <div className="mb-8">
              <button
                onClick={() => handleViewChange('search')}
                className="flex items-center text-primary hover:text-primary-dark"
              >
                <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Boarding Centers
              </button>
            </div>
            
            <PetBoardingRegistration />
          </div>
        )}
        
        {activeView === 'search' && (
          <div>
            <PetBoardingSearch />
            
            {/* Mobile Register button for small screens */}
            <div className="mt-8 text-center md:hidden">
              <button
                onClick={() => handleViewChange('register')}
                className="px-6 py-3 bg-primary text-white font-medium rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Register Your Boarding Center
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PetBoarding; 