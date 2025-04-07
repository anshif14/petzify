import React from 'react';
import ComingSoon from '../components/common/ComingSoon';

const Blog = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Pet Care Blog</h1>
        
        <ComingSoon 
          title="Our Blog is Coming Soon!" 
          message="We're working on creating helpful and informative articles about pet care, health tips, training guides, and more. Check back soon for updates!" 
        />
      </div>
    </div>
  );
};

export default Blog; 