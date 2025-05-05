import React, { useState, useEffect } from 'react';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';

const LocationDisplay = () => {
  const { currentUser } = useUser();
  const [locationInfo, setLocationInfo] = useState(null);
  const [addressText, setAddressText] = useState('');
  const [loading, setLoading] = useState(false);
  // Add OpenWeatherMap API key - ideally this should be in your .env file
  const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || '7b1add74ecddced77d420b6e777090ad';

  // Function to get location name using OpenWeatherMap API
  const getLocationNameFromWeather = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.name) {
        console.log('Location from Weather API:', data.name);
        return data.name;
      } else {
        console.log('No location name in weather data:', data);
        return null;
      }
    } catch (error) {
      console.error('Error fetching from weather API:', error);
      return null;
    }
  };

  // Function to reverse geocode coordinates to get readable address
  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      // First try using OpenWeatherMap API
      const weatherLocation = await getLocationNameFromWeather(latitude, longitude);
      
      if (weatherLocation) {
        setAddressText(weatherLocation);
        return;
      }
      
      // Fall back to Google Geocoding API
      console.log('Falling back to Google Geocoding API');
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        // Try to get the most relevant components in order of preference
        const result = data.results[0];
        
        // Look for different address components in order of precision
        const locality = result.address_components.find(
          component => component.types.includes('locality')
        );
        
        const subLocality = result.address_components.find(
          component => component.types.includes('sublocality') || component.types.includes('sublocality_level_1')
        );
        
        const neighborhood = result.address_components.find(
          component => component.types.includes('neighborhood')
        );
        
        const administrative = result.address_components.find(
          component => component.types.includes('administrative_area_level_2') || component.types.includes('administrative_area_level_1')
        );
        
        // Determine the best name to use for the location
        let locationName;
        
        if (subLocality && locality) {
          // If we have both, show neighborhood, city format
          locationName = `${subLocality.long_name}, ${locality.long_name}`;
        } else if (neighborhood && locality) {
          // Or neighborhood, city
          locationName = `${neighborhood.long_name}, ${locality.long_name}`;
        } else if (locality) {
          // Just city
          locationName = locality.long_name;
        } else if (subLocality || neighborhood) {
          // Just area
          locationName = (subLocality || neighborhood).long_name;
        } else if (administrative) {
          // Just administrative area (county/state)
          locationName = administrative.long_name;
        } else {
          // Fall back to formatted address, but shortened
          locationName = result.formatted_address.split(',').slice(0, 2).join(',');
        }
        
        setAddressText(locationName);
        console.log('Reverse geocoded location:', locationName);
      } else {
        // If geocoding failed or returned no results
        console.log('Geocoding error or no results:', data.status);
        setAddressText('Current location');
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setAddressText('Current location');
    }
  };

  // Update location in database with the display name
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
    } catch (error) {
      console.error('Error updating location in database:', error);
    }
  };

  // Fetch user's saved location from Firestore
  useEffect(() => {
    const fetchUserLocation = async () => {
      if (!currentUser || !currentUser.email) return;

      setLoading(true);
      try {
        const db = getFirestore();
        const userRef = doc(db, 'users', currentUser.email);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists() && userDoc.data().location) {
          const location = userDoc.data().location;
          setLocationInfo(location);
          
          // If we have a stored display name, use it immediately
          if (location.displayName) {
            setAddressText(location.displayName);
          } else {
            // Otherwise get location name from coordinates
            const locationName = await getLocationNameFromWeather(location.latitude, location.longitude);
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
        
        // Get location name from OpenWeatherMap API
        const locationName = await getLocationNameFromWeather(latitude, longitude);
        
        if (locationName) {
          setAddressText(locationName);
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
          Getting location...
        </span>
      ) : (
        <span className="flex items-center">
          {addressText || 'Current location'}
          <button 
            onClick={refreshLocation} 
            className="ml-2 text-primary hover:text-primary-dark"
            title="Update location"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </span>
      )}
    </div>
  );
};

export default LocationDisplay; 