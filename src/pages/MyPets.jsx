import React from 'react';
import UserPets from '../components/user/UserPets';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useEffect, useState } from 'react';
import AuthModal from '../components/auth/AuthModal';

const MyPets = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, authInitialized } = useUser();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  useEffect(() => {
    if (authInitialized && !isAuthenticated()) {
      setShowAuthModal(true);
    }
  }, [authInitialized, isAuthenticated]);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">My Pets</h1>
        <p className="text-gray-600">Manage your pets and their healthcare information.</p>
      </div>
      
      <UserPets />
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default MyPets; 