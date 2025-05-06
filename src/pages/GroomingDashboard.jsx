import React, { useEffect } from 'react';
import GroomingDashboardComponent from '../components/services/grooming/GroomingDashboard';
import Footer from '../components/common/Footer';
import MobileBottomNav from '../components/common/MobileBottomNav';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../components/auth/AuthModal';

const GroomingDashboard = () => {
  const { currentUser, isAuthenticated, authInitialized } = useUser();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Check auth status after initialization
    if (authInitialized && !isAuthenticated()) {
      setShowAuthModal(true);
    }
  }, [authInitialized, isAuthenticated]);
  
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };
  
  const handleAuthClose = () => {
    setShowAuthModal(false);
    navigate('/services/grooming');
  };

  return (
    <>
      {showAuthModal && (
        <AuthModal
          onClose={handleAuthClose}
          onSuccess={handleAuthSuccess}
          initialMode="signin"
          message="Please sign in to access your grooming center dashboard"
        />
      )}
      
      <main className="min-h-screen bg-gray-50 py-8 md:pt-8 pt-4 pb-24 md:pb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Grooming Center Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your grooming center, bookings and reviews</p>
            </div>
          </div>
          
          <GroomingDashboardComponent />
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
};

export default GroomingDashboard; 