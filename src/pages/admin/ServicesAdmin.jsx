import React from 'react';
import { Link } from 'react-router-dom';

const ServicesAdmin = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Services Management</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pet Boarding Centers Card */}
          <Link to="/admin/pet-boarding" className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Pet Boarding Centers</h2>
                <div className="bg-primary-light text-primary px-2 py-1 rounded-full text-xs font-medium">
                  Management
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Manage pet boarding center registrations, approve or reject applications, and monitor active centers.
              </p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>View all centers</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Link>
          
          {/* Other Services Cards Will Go Here */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Other Services</h2>
                <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                  Coming Soon
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Additional service management options will be added here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesAdmin; 