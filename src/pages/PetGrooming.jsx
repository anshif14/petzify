import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import Footer from '../components/common/Footer';
import MobileBottomNav from '../components/common/MobileBottomNav';
import { getUserLocation } from '../utils/locationService';
import { toast } from 'react-toastify';
import NearbyGroomingList from '../components/services/grooming/NearbyGroomingList';
import GroomingRegistrationForm from '../components/services/grooming/GroomingRegistrationForm';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const PetGrooming = () => {
  const { currentUser, isAuthenticated } = useUser();
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [groomingCenters, setGroomingCenters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    handleGetUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchGroomingCenters();
    }
  }, [userLocation]);

  // Function to get user location
  const handleGetUserLocation = async () => {
    setLocationStatus('loading');
    
    try {
      await getUserLocation({
        onLocationUpdate: (locationData) => {
          if (locationData) {
            setUserLocation({
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              locationName: locationData.locationName
            });
            
            toast.success('Location updated successfully', {
              position: 'bottom-right',
              autoClose: 2000
            });
          }
        },
        onError: (error) => {
          console.error('Error getting location:', error);
          toast.error('Failed to get your location. Please enable location services to find nearby grooming centers.', {
            position: 'bottom-right',
            autoClose: 3000
          });
        },
        onStatusChange: (status) => {
          setLocationStatus(status);
        }
      });
    } catch (error) {
      console.error('Error in location service:', error);
      setLocationStatus('error');
    }
  };

  // Function to fetch grooming centers from Firebase
  const fetchGroomingCenters = async () => {
    setLoading(true);
    try {
      // Query approved grooming centers
      const q = query(
        collection(db, 'groomingCenters'),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const centers = [];
      
      querySnapshot.forEach((doc) => {
        centers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setGroomingCenters(centers);
    } catch (error) {
      console.error('Error fetching grooming centers:', error);
      toast.error('Failed to fetch grooming centers', {
        position: 'bottom-right',
        autoClose: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRegistrationForm = () => {
    setShowRegistrationForm(!showRegistrationForm);
  };

  return (
    <>
      <main className="min-h-screen bg-gray-50 py-8 md:pt-8 pt-4 pb-24 md:pb-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-16 mb-8">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Pet Grooming Services</h1>
            <p className="text-xl max-w-2xl mx-auto">
              Professional grooming services to keep your pet looking and feeling their best. From baths and haircuts to nail trimming and ear cleaning.
            </p>
            <div className="mt-8">
              <button
                onClick={toggleRegistrationForm}
                className="bg-white text-primary hover:bg-gray-100 px-6 py-3 rounded-full font-medium transition-colors duration-300"
              >
                Register your grooming center with us
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6">
          {showRegistrationForm ? (
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Grooming Center Registration</h2>
                <button 
                  onClick={toggleRegistrationForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <GroomingRegistrationForm 
                userLocation={userLocation}
                onSubmitSuccess={() => {
                  setShowRegistrationForm(false);
                  toast.success("Registration submitted successfully! We'll review your application and notify you once approved.", {
                    position: 'top-center',
                    autoClose: 5000
                  });
                }}
              />
            </div>
          ) : (
            <>
              {/* Location Status and Refresh */}
              <div className="max-w-7xl mx-auto mb-8">
                <div className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {locationStatus === 'loading' ? (
                      <span className="text-gray-600">Getting your location...</span>
                    ) : userLocation ? (
                      <span className="text-gray-800">Showing grooming centers near {userLocation.locationName || 'your location'}</span>
                    ) : (
                      <span className="text-gray-600">Location not available</span>
                    )}
                  </div>
                  <button
                    onClick={handleGetUserLocation}
                    className="text-primary hover:text-primary-dark flex items-center"
                    disabled={locationStatus === 'loading'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh location
                  </button>
                </div>
              </div>

              {/* Grooming Centers List */}
              <NearbyGroomingList 
                groomingCenters={groomingCenters}
                userLocation={userLocation}
                loading={loading} 
              />
            </>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
};

export default PetGrooming; 