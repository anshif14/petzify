import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

const ServicesAdmin = () => {
  const [pendingBoardingCount, setPendingBoardingCount] = useState(0);
  const [pendingGroomingCount, setPendingGroomingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingCounts = async () => {
      try {
        // Fetch boarding center count
        const boardingQuery = query(
          collection(db, 'petBoardingCenters'),
          where('status', '==', 'pending')
        );
        
        const boardingSnapshot = await getDocs(boardingQuery);
        setPendingBoardingCount(boardingSnapshot.size);
        
        // Fetch grooming center count
        const groomingQuery = query(
          collection(db, 'groomingCenters'),
          where('status', '==', 'pending')
        );
        
        const groomingSnapshot = await getDocs(groomingQuery);
        setPendingGroomingCount(groomingSnapshot.size);
      } catch (error) {
        console.error('Error fetching pending counts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPendingCounts();
  }, []);

  const totalPendingCount = pendingBoardingCount + pendingGroomingCount;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Services Management</h1>
          {loading ? (
            <div className="animate-pulse bg-gray-200 rounded h-6 w-24"></div>
          ) : totalPendingCount > 0 ? (
            <div className="bg-red-100 text-red-800 text-sm font-semibold py-1 px-3 rounded-full flex items-center">
              <span className="h-2 w-2 bg-red-500 rounded-full mr-2"></span>
              {totalPendingCount} pending request{totalPendingCount > 1 ? 's' : ''}
            </div>
          ) : (
            <div className="bg-green-100 text-green-800 text-sm font-semibold py-1 px-3 rounded-full flex items-center">
              <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
              All caught up
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pet Boarding Centers Card - Featured */}
          <Link to="/admin/pet-boarding" className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border-t-4 border-primary">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Pet Boarding Centers</h2>
                {pendingBoardingCount > 0 && (
                  <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {pendingBoardingCount} new
                  </div>
                )}
              </div>
              <p className="text-gray-600 mb-6">
                Review and manage pet boarding center registrations. Approve or reject applications and monitor active centers.
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{loading ? 'Loading...' : `${pendingBoardingCount} pending review`}</span>
                <span className="text-primary font-medium flex items-center">
                  Manage centers
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
          
          {/* Pet Grooming Services Card */}
          <Link to="/admin/grooming" className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border-t-4 border-indigo-500">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Pet Grooming</h2>
                {pendingGroomingCount > 0 && (
                  <div className="bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {pendingGroomingCount} new
                  </div>
                )}
              </div>
              <p className="text-gray-600 mb-6">
                Manage pet grooming service providers, approve new registrations, and monitor active centers.
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{loading ? 'Loading...' : `${pendingGroomingCount} pending review`}</span>
                <span className="text-indigo-600 font-medium flex items-center">
                  Manage providers
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
          
          {/* Transportation Services Card - Coming Soon */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Pet Transportation</h2>
                <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                  Coming Soon
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Manage pet transportation service providers, track ride requests, and monitor service quality.
              </p>
              <div className="flex justify-between text-sm text-gray-400">
                <span>Not available yet</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Service Analytics</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600">Service analytics will be available soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesAdmin; 