import React from 'react';

const ComingSoon = ({ title = "Coming Soon", message = "This feature is under development" }) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-sm">
      <div className="w-20 h-20 relative mb-6">
        {/* Animated circle */}
        <div className="absolute inset-0 border-4 border-primary border-opacity-20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center text-2xl">
          🚀
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-800 mb-3">{title}</h2>
      <p className="text-gray-600 text-center max-w-md">{message}</p>
      
      {/* Animated dots */}
      <div className="flex space-x-2 mt-6">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};

export default ComingSoon; 