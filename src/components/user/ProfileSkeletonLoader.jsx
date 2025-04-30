import React from 'react';
import Shimmer from '../common/Shimmer';

const ProfileSkeletonLoader = () => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header with gradient and avatar */}
      <div className="bg-gradient-to-r from-primary to-primary-dark h-32"></div>
      <div className="px-6 pb-6 -mt-16">
        <div className="flex flex-col md:flex-row items-center md:items-end">
          <div className="relative">
            <Shimmer className="w-32 h-32 border-4 border-white" rounded="full" />
          </div>
          <div className="mt-4 md:mt-0 md:ml-6 text-center md:text-left">
            <Shimmer className="h-8 w-48 mb-2" />
            <Shimmer className="h-4 w-32" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <div className="py-4 px-6">
            <Shimmer className="h-6 w-20" />
          </div>
          <div className="py-4 px-6">
            <Shimmer className="h-6 w-20" />
          </div>
        </nav>
      </div>

      {/* Profile Form Fields */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="space-y-2">
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-10 w-full" />
            </div>
          ))}
        </div>
        
        <div className="mt-8">
          <Shimmer className="h-12 w-32" rounded="lg" />
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeletonLoader; 