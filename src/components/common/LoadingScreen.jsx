import React from 'react';

const LoadingScreen = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="mb-8">
        <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">{message}</h2>
        <p className="text-gray-600">Please wait while we prepare your experience</p>
        
        {/* Pet paw animation */}
        <div className="flex justify-center mt-8 space-x-3">
          <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen; 