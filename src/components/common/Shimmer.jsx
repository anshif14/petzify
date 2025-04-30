import React from 'react';

const Shimmer = ({ className = '', height = '16', width = 'full', rounded = 'md' }) => {
  return (
    <div 
      className={`bg-gray-200 animate-pulse relative overflow-hidden ${className} h-${height} w-${width} rounded-${rounded}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]">
        <div className="h-full w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
      </div>
    </div>
  );
};

export default Shimmer; 