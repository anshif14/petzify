import React, { useState, useEffect } from 'react';
import PetBoardingRegistration from '../components/services/PetBoardingRegistration';
import PetBoardingSearch from '../components/services/PetBoardingSearch';

const PetBoarding = () => {
  const [activeView, setActiveView] = useState('options'); // 'options', 'register', 'search'
  
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
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Pet Boarding Service</h1>
          <p className="text-xl max-w-2xl mx-auto">
            Safe and comfortable accommodation for your pets when you're away, or list your facility to help other pet parents.
          </p>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        {activeView === 'options' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How can we help you?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Register a Boarding Center */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1">
                <div className="h-48 bg-gray-200 relative">
                  <img 
                    src="https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8" 
                    alt="Pet boarding center" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <h3 className="text-white text-2xl font-bold">Register Your Boarding Center</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-6">
                    Own a boarding facility? Register with us to reach more pet parents and grow your business.
                  </p>
                  <ul className="mb-6 space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Get featured on our platform</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Manage bookings efficiently</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Grow your pet boarding business</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => handleViewChange('register')}
                    className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Register Your Facility
                  </button>
                </div>
              </div>
              
              {/* Find a Boarding Center */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1">
                <div className="h-48 bg-gray-200 relative">
                  <img 
                    src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8" 
                    alt="Pet boarding search" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <h3 className="text-white text-2xl font-bold">Find a Boarding Center</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-6">
                    Looking for a safe place for your pet while you're away? Find the perfect boarding center.
                  </p>
                  <ul className="mb-6 space-y-2">
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Browse verified boarding centers</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Compare services and amenities</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Find centers that match your pet's needs</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => handleViewChange('search')}
                    className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Find a Boarding Center
                  </button>
                </div>
              </div>
            </div>
            
            {/* Pet Boarding Information */}
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Why Choose Our Pet Boarding Service?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary-light rounded-full mb-4">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Safety First</h3>
                  <p className="text-gray-600">
                    All boarding centers are verified and regularly monitored to ensure the highest standards of safety and care for your beloved pets.
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary-light rounded-full mb-4">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Expert Care</h3>
                  <p className="text-gray-600">
                    Our boarding partners are experienced in pet care and provide personalized attention to meet your pet's unique needs.
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary-light rounded-full mb-4">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Convenience</h3>
                  <p className="text-gray-600">
                    Easy booking process, flexible scheduling, and accessible locations make finding pet care while you're away simple and stress-free.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeView === 'register' && (
          <div>
            <div className="mb-8">
              <button
                onClick={() => handleViewChange('options')}
                className="flex items-center text-primary hover:text-primary-dark"
              >
                <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Options
              </button>
            </div>
            
            <PetBoardingRegistration />
          </div>
        )}
        
        {activeView === 'search' && (
          <div>
            <div className="mb-8">
              <button
                onClick={() => handleViewChange('options')}
                className="flex items-center text-primary hover:text-primary-dark"
              >
                <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Options
              </button>
            </div>
            
            <PetBoardingSearch />
          </div>
        )}
      </div>
    </div>
  );
};

export default PetBoarding; 