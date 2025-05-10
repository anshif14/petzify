import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { app } from '../firebase/config';
import { useUser } from '../context/UserContext';
import { useAlert } from '../context/AlertContext';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import UserPets from '../components/user/UserPets';
import AuthModal from '../components/auth/AuthModal';
import MobileBottomNav from '../components/common/MobileBottomNav';

const UserProfile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { currentUser, isAuthenticated, authInitialized } = useUser();
  const { showSuccess, showError } = useAlert();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    avatar: '',
    dateOfBirth: ''
  });

  const [profileCompletion, setProfileCompletion] = useState({
    percentage: 0,
    completedSteps: [],
    remainingSteps: []
  });

  useEffect(() => {
    if (authInitialized && !isAuthenticated()) {
      setShowAuthModal(true);
    }
  }, [authInitialized, isAuthenticated]);

  useEffect(() => {
    if (currentUser) {
      fetchUserProfile();
    }
  }, [currentUser]);

  useEffect(() => {
    calculateProfileCompletion();
  }, [profileData]);

  useEffect(() => {
    console.log('Current active tab:', activeTab);
  }, [activeTab]);

  const calculateProfileCompletion = () => {
    const steps = [
      { id: 'name', label: 'Full Name', completed: !!profileData.name },
      { id: 'dateOfBirth', label: 'Date of Birth', completed: !!profileData.dateOfBirth },
      { id: 'phone', label: 'Phone Number', completed: !!profileData.phone },
      { id: 'address', label: 'Address', completed: !!profileData.address },
      { id: 'city', label: 'City', completed: !!profileData.city },
      { id: 'state', label: 'State', completed: !!profileData.state },
      { id: 'zipCode', label: 'ZIP Code', completed: !!profileData.zipCode },
      { id: 'avatar', label: 'Profile Picture', completed: !!profileData.avatar }
    ];

    const completedSteps = steps.filter(step => step.completed);
    const remainingSteps = steps.filter(step => !step.completed);
    const percentage = Math.round((completedSteps.length / steps.length) * 100);

    setProfileCompletion({
      percentage,
      completedSteps,
      remainingSteps
    });
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      const userDoc = await getDoc(doc(db, 'users', currentUser.email));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfileData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          city: userData.city || '',
          state: userData.state || '',
          zipCode: userData.zipCode || '',
          avatar: userData.avatar || '',
          dateOfBirth: userData.dateOfBirth || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      showError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setUpdating(true);
      const db = getFirestore(app);
      
      await updateDoc(doc(db, 'users', currentUser.email), {
        ...profileData,
        updatedAt: new Date().toISOString()
      });
      
      showSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    navigate('/profile');
  };

  const handleTabChange = (tab) => {
    console.log('Attempting to change tab to:', tab);
    setActiveTab(tab);
    setTimeout(() => {
      console.log('Tab should now be:', tab);
    }, 100);
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 pt-24 md:pt-24 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="bg-white rounded-t-xl shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary-dark h-24 md:h-32"></div>
            <div className="px-4 md:px-6 pb-4 md:pb-6 -mt-12 md:-mt-16">
              <div className="flex flex-col md:flex-row items-center md:items-end">
                <div className="relative">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-lg">
                    {profileData.avatar ? (
                      <img 
                        src={profileData.avatar} 
                        alt={profileData.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-light text-white text-4xl">
                        {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  <button className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md text-gray-600 hover:text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </div>
                <div className="mt-3 md:mt-0 md:ml-6 text-center md:text-left">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">{profileData.name || 'User'}</h1>
                  <p className="text-sm md:text-base text-gray-600">{profileData.email}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tabs and Content */}
          <div className="bg-white rounded-b-xl shadow-md overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  type="button"
                  onClick={() => handleTabChange('profile')}
                  className={`py-3 md:py-4 px-4 md:px-6 text-sm font-medium flex items-center flex-1 justify-center md:justify-start ${
                    activeTab === 'profile'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 md:mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('pets')}
                  className={`py-3 md:py-4 px-4 md:px-6 text-sm font-medium flex items-center flex-1 justify-center md:justify-start ${
                    activeTab === 'pets'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 md:mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  My Pets
                </button>
              </nav>
            </div>
            
            {/* Content */}
            <div className="p-4 md:p-6">
              {activeTab === 'profile' ? (
                <>
                  {/* Profile Completion Stepper */}
                  {profileCompletion.percentage < 100 && (
                    <div className="mb-6 md:mb-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-3 md:p-4 bg-primary-light">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base md:text-lg font-medium text-gray-800">Complete Your Profile</h3>
                          <span className="text-xs md:text-sm font-medium text-white">{profileCompletion.percentage}% Complete</span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-in-out" 
                            style={{ width: `${profileCompletion.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="p-3 md:p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                          <div className="mb-2 md:mb-0">
                            <h4 className="text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Completed</h4>
                            {profileCompletion.completedSteps.length > 0 ? (
                              <ul className="space-y-1 md:space-y-2">
                                {profileCompletion.completedSteps.map(step => (
                                  <li key={step.id} className="flex items-center text-xs md:text-sm text-gray-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    {step.label}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs md:text-sm text-gray-500">No completed steps yet</p>
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Remaining</h4>
                            {profileCompletion.remainingSteps.length > 0 ? (
                              <ul className="space-y-1 md:space-y-2">
                                {profileCompletion.remainingSteps.map(step => (
                                  <li key={step.id} className="flex items-center text-xs md:text-sm text-gray-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                    </svg>
                                    {step.label}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs md:text-sm text-gray-500">All steps completed!</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="col-span-2">
                        <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-2 md:mb-4">Personal Information</h2>
                      </div>
                      
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={profileData.name}
                          onChange={handleChange}
                          required
                          className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={profileData.dateOfBirth}
                          onChange={handleChange}
                          className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={profileData.email}
                          disabled
                          className="w-full p-2 md:p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                      </div>
                      
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleChange}
                          className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-2 md:mb-4 mt-2 md:mt-4">Address Information</h2>
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={profileData.address}
                          onChange={handleChange}
                          className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={profileData.city}
                          onChange={handleChange}
                          className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          name="state"
                          value={profileData.state}
                          onChange={handleChange}
                          className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          name="zipCode"
                          value={profileData.zipCode}
                          onChange={handleChange}
                          className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6 md:mt-8 flex justify-end">
                      <button
                        type="submit"
                        disabled={updating}
                        className="w-full md:w-auto px-4 md:px-6 py-2 md:py-3 bg-primary text-white rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition duration-200 disabled:opacity-50 flex items-center justify-center"
                      >
                        {updating ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 md:h-5 w-4 md:w-5 mr-1 md:mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Update Profile
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <UserPets />
              )}
            </div>
          </div>
        </div>
      </main>
      <div className="hidden md:block">

      </div>
      <MobileBottomNav />
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          if (!isAuthenticated()) {
            navigate('/');
          }
        }}
        initialMode="login"
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};

export default UserProfile; 