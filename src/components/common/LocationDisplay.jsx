import React, { useState, useEffect } from 'react';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';
import { getLocationNameFromCoordinates, saveLocationToLocalStorage } from '../../utils/locationService';

const LocationDisplay = () => {
  const { currentUser } = useUser();
  const [locationInfo, setLocationInfo] = useState(null);
  const [addressText, setAddressText] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Remove OpenWeather API key
  // const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || '7b1add74ecddced77d420b6e777090ad';
  
  // Constants
  const LOCATION_STORAGE_KEY = 'petzify_user_location';
  const LOCATION_MAX_AGE = 30 * 60 * 1000; // 30 minutes in milliseconds

  // Function to update location in database with the display name
  const updateLocationInDatabase = async (latitude, longitude, locationName) => {
    if (!currentUser || !currentUser.email) return;
    
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', currentUser.email);
      
      await updateDoc(userRef, {
        location: {
          latitude,
          longitude,
          displayName: locationName,
          lastUpdated: new Date().toISOString()
        }
      });
      
      console.log('Updated location in database with name:', locationName);
      
      // Save to localStorage as well
      saveLocationToLocalStorage({
        latitude,
        longitude,
        locationName,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating location in database:', error);
    }
  };

  // Fetch user's saved location
  useEffect(() => {
    const fetchUserLocation = async () => {
      if (!currentUser || !currentUser.email) {
        // Try to get from localStorage if not authenticated
        try {
          const storedLocationData = localStorage.getItem(LOCATION_STORAGE_KEY);
          if (storedLocationData) {
            const parsedLocationData = JSON.parse(storedLocationData);
            const lastUpdated = new Date(parsedLocationData.lastUpdated);
            const now = new Date();
            
            // Use stored location if it's not too old
            if ((now - lastUpdated) < LOCATION_MAX_AGE) {
              console.log("Using location from localStorage");
              setLocationInfo({
                latitude: parsedLocationData.latitude,
                longitude: parsedLocationData.longitude,
                lastUpdated: parsedLocationData.lastUpdated
              });
              setAddressText(parsedLocationData.locationName || 'Current location');
              return;
            }
          }
        } catch (error) {
          console.error('Error reading location from localStorage:', error);
        }
        return;
      }

      setLoading(true);
      try {
        // First try to get from localStorage
        const storedLocationData = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (storedLocationData) {
          const parsedLocationData = JSON.parse(storedLocationData);
          const lastUpdated = new Date(parsedLocationData.lastUpdated);
          const now = new Date();
          
          // Use stored location if it's not too old
          if ((now - lastUpdated) < LOCATION_MAX_AGE) {
            console.log("Using location from localStorage");
            setLocationInfo({
              latitude: parsedLocationData.latitude,
              longitude: parsedLocationData.longitude,
              lastUpdated: parsedLocationData.lastUpdated
            });
            setAddressText(parsedLocationData.locationName || 'Current location');
            setLoading(false);
            return;
          }
        }
        
        // If not in localStorage or too old, try database
        const db = getFirestore();
        const userRef = doc(db, 'users', currentUser.email);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists() && userDoc.data().location) {
          const location = userDoc.data().location;
          setLocationInfo(location);
          
          // If we have a stored display name, use it immediately
          if (location.displayName) {
            setAddressText(location.displayName);
            
            // Save to localStorage
            saveLocationToLocalStorage({
              latitude: location.latitude,
              longitude: location.longitude,
              locationName: location.displayName,
              lastUpdated: location.lastUpdated
            });
          } else {
            // Otherwise get location name from coordinates using Google Places API
            const locationName = await getLocationNameFromCoordinates(location.latitude, location.longitude);
            if (locationName) {
              setAddressText(locationName);
              // Update the database with the retrieved location name
              await updateLocationInDatabase(location.latitude, location.longitude, locationName);
            } else {
              setAddressText('Current location');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user location:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserLocation();
  }, [currentUser]);

  // Function to get current location again
  const refreshLocation = () => {
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        setLocationInfo({
          latitude,
          longitude,
          lastUpdated: new Date().toISOString()
        });
        
        // Get location name from Google Places API
        const locationName = await getLocationNameFromCoordinates(latitude, longitude);
        
        if (locationName) {
          setAddressText(locationName);
          
          // Save to localStorage
          saveLocationToLocalStorage({
            latitude,
            longitude,
            locationName,
            lastUpdated: new Date().toISOString()
          });
          
          // Update the database with the retrieved location name
          if (currentUser && currentUser.email) {
            await updateLocationInDatabase(latitude, longitude, locationName);
          }
        } else {
          setAddressText('Current location');
        }
        
        setLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  if (!locationInfo && !loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-600 text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <button 
          onClick={refreshLocation} 
          className="text-primary hover:text-primary-dark hover:underline"
        >
          Set your location
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-gray-600 text-sm">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      
      {loading ? (
        <span className="flex items-center">
          <svg className="animate-spin h-3 w-3 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Getting your location...
        </span>
      ) : (
        <div className="flex items-center">
          <span className="mr-2">{addressText}</span>
          <button 
            onClick={refreshLocation} 
            className="text-primary hover:text-primary-dark"
            title="Refresh location"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationDisplay; 