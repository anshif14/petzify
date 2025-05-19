import React from 'react';
import UserPets from '../components/user/UserPets';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useEffect, useState } from 'react';
import AuthModal from '../components/auth/AuthModal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const MyPets = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, authInitialized, loading: userLoading } = useUser();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  
  useEffect(() => {
    console.log('MyPets: Auth state:', { 
      authInitialized, 
      isAuthenticated: isAuthenticated(), 
      currentUser 
    });
    
    if (authInitialized) {
      if (!isAuthenticated()) {
        console.log('MyPets: User not authenticated, showing auth modal');
        setShowAuthModal(true);
      }
      setPageLoading(false);
    }
  }, [authInitialized, isAuthenticated, currentUser]);

  const handleAuthSuccess = () => {
    console.log('MyPets: Authentication successful');
    setShowAuthModal(false);
    // Force a re-render by setting loading and then unsetting it
    setPageLoading(true);
    setTimeout(() => setPageLoading(false), 500);
  };

  if (userLoading || (!authInitialized && !currentUser)) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <LoadingSpinner />
      </div>
    );
  }

  // Future features section
  const FutureFeatures = () => (
    <div className="bg-white rounded-lg shadow-md p-4 mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Coming Soon</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 p-3 rounded-md flex flex-col items-center">
          <div className="h-10 w-10 bg-primary-light rounded-full flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-700">Diet Tracking</span>
          <p className="text-xs text-gray-500 text-center mt-1">Track your pet's diet and nutrition</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-md flex flex-col items-center">
          <div className="h-10 w-10 bg-primary-light rounded-full flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-700">Exercise Logs</span>
          <p className="text-xs text-gray-500 text-center mt-1">Log walks, playtime and exercise</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-md flex flex-col items-center">
          <div className="h-10 w-10 bg-primary-light rounded-full flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-700">Mental Stimulation</span>
          <p className="text-xs text-gray-500 text-center mt-1">Track enrichment activities</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-md flex flex-col items-center">
          <div className="h-10 w-10 bg-primary-light rounded-full flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-700">Reminders</span>
          <p className="text-xs text-gray-500 text-center mt-1">Get alerts for pet care</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">My Pets</h1>
          <p className="text-gray-600">Manage your pets and their healthcare information.</p>
        </div>
        
        {pageLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <UserPets key={currentUser?.email || 'no-user'} />
            
            {/* Future Features Section */}
            <FutureFeatures />
          </>
        )}
        
        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => navigate('/home')}
          initialMode="login"
          onSuccess={handleAuthSuccess}
        />
      </div>
    </div>
  );
};

export default MyPets; 