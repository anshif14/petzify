// locationService.js - Utility for handling user location across the app
import { loadGoogleMapsScript, isGoogleMapsLoaded } from './mapLoader';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

// Constants
const LOCATION_STORAGE_KEY = 'petzify_user_location';
const LOCATION_MAX_AGE = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Calculates distance between two coordinates using the Haversine formula
 * @param {number} lat1 - First location latitude
 * @param {number} lon1 - First location longitude
 * @param {number} lat2 - Second location latitude
 * @param {number} lon2 - Second location longitude
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
};

/**
 * Get human-readable location name from coordinates
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<string|null>} Location name or null if unable to geocode
 */
export const getLocationNameFromCoordinates = async (latitude, longitude) => {
  if (!latitude || !longitude) return null;
  
  try {
    // Check if Google Maps is loaded
    if (!isGoogleMapsLoaded()) {
      await loadGoogleMapsScript(['places']);
      
      // If still not loaded, return
      if (!isGoogleMapsLoaded()) {
        console.error('Google Maps API not loaded');
        return null;
      }
    }
    
    return new Promise((resolve) => {
      // Create geocoder
      const geocoder = new window.google.maps.Geocoder();
      
      // Execute reverse geocoding
      geocoder.geocode({ location: { lat: parseFloat(latitude), lng: parseFloat(longitude) } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          // Get the most relevant address components
          let locationName = '';
          
          // Look for different address components in order of preference
          const result = results[0];
          
          // Extract address components
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
          if (subLocality && locality) {
            // If we have both, show neighborhood and city format
            locationName = `${subLocality.long_name}, ${locality.long_name}`;
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
          
          resolve(locationName);
        } else {
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
};

/**
 * Get current user location from local storage, database, or geolocation
 * @param {Object} options - Options for getting location
 * @param {boolean} options.useLocalStorage - Whether to try local storage first
 * @param {boolean} options.useDatabase - Whether to try database if authenticated
 * @param {boolean} options.useGeolocation - Whether to use geolocation
 * @param {Function} options.onLocationUpdate - Callback when location is updated
 * @param {Function} options.onError - Callback when error occurs
 * @returns {Promise<{latitude: number, longitude: number, locationName: string}|null>}
 */
export const getUserLocation = async ({
  useLocalStorage = true,
  useDatabase = true,
  useGeolocation = true,
  onLocationUpdate = null,
  onError = null,
  onStatusChange = null,
} = {}) => {
  let status = 'checking';
  if (onStatusChange) onStatusChange(status);
  
  // Check localStorage first if enabled
  if (useLocalStorage) {
    try {
      const storedLocationData = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (storedLocationData) {
        const parsedLocationData = JSON.parse(storedLocationData);
        const lastUpdated = new Date(parsedLocationData.lastUpdated);
        const now = new Date();
        
        // Use stored location if it's not too old
        if ((now - lastUpdated) < LOCATION_MAX_AGE) {
          console.log("Using location from localStorage");
          status = 'success';
          if (onStatusChange) onStatusChange(status);
          if (onLocationUpdate) onLocationUpdate(parsedLocationData);
          return parsedLocationData;
        }
      }
    } catch (error) {
      console.error('Error retrieving location from localStorage:', error);
    }
  }
  
  // Try database if authenticated and enabled
  if (useDatabase) {
    try {
      status = 'checking-database';
      if (onStatusChange) onStatusChange(status);
      
      const authState = JSON.parse(localStorage.getItem('user'));
      if (authState && authState.email) {
        const db = getFirestore();
        const userRef = doc(db, 'users', authState.email);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().location) {
          const storedLocation = userDoc.data().location;
          const lastUpdated = new Date(storedLocation.lastUpdated);
          const now = new Date();
          
          // Use stored location if it's not too old
          if ((now - lastUpdated) < LOCATION_MAX_AGE) {
            console.log("Using stored location from database");
            
            const { latitude, longitude } = storedLocation;
            // Get location name
            const locationName = await getLocationNameFromCoordinates(latitude, longitude);
            
            const locationData = {
              latitude,
              longitude,
              locationName,
              lastUpdated: storedLocation.lastUpdated
            };
            
            // Save to localStorage
            localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
            
            status = 'success';
            if (onStatusChange) onStatusChange(status);
            if (onLocationUpdate) onLocationUpdate(locationData);
            return locationData;
          }
        }
      }
    } catch (error) {
      console.error('Error retrieving location from database:', error);
    }
  }
  
  // Try geolocation if enabled
  if (useGeolocation) {
    status = 'getting-location';
    if (onStatusChange) onStatusChange(status);
    
    if (!navigator.geolocation) {
      const error = new Error('Geolocation is not supported by your browser');
      status = 'error';
      if (onStatusChange) onStatusChange(status, error);
      if (onError) onError(error);
      return null;
    }
    
    try {
      // Get current position
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });
      
      const { latitude, longitude } = position.coords;
      
      // Get location name
      status = 'getting-location-name';
      if (onStatusChange) onStatusChange(status);
      const locationName = await getLocationNameFromCoordinates(latitude, longitude);
      
      // Create location data object
      const locationData = {
        latitude,
        longitude,
        locationName,
        lastUpdated: new Date().toISOString()
      };
      
      // Save to localStorage
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
      
      // Save to database if authenticated
      if (useDatabase) {
        try {
          status = 'saving-to-database';
          if (onStatusChange) onStatusChange(status);
          
          const authState = JSON.parse(localStorage.getItem('user'));
          if (authState && authState.email) {
            const db = getFirestore();
            const userRef = doc(db, 'users', authState.email);
            
            await updateDoc(userRef, {
              location: {
                latitude,
                longitude,
                lastUpdated: new Date().toISOString()
              }
            });
          }
        } catch (dbError) {
          console.error('Error saving location to database:', dbError);
        }
      }
      
      status = 'success';
      if (onStatusChange) onStatusChange(status);
      if (onLocationUpdate) onLocationUpdate(locationData);
      return locationData;
    } catch (error) {
      console.error('Error getting geolocation:', error);
      status = 'error';
      if (onStatusChange) onStatusChange(status, error);
      if (onError) onError(error);
      return null;
    }
  }
  
  return null;
};

/**
 * Save location data to localStorage
 * @param {Object} locationData - Location data object
 */
export const saveLocationToLocalStorage = (locationData) => {
  if (!locationData) return;
  
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
      ...locationData,
      lastUpdated: locationData.lastUpdated || new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error saving location to localStorage:', error);
  }
};

/**
 * Clear location data from localStorage
 */
export const clearLocationData = () => {
  try {
    localStorage.removeItem(LOCATION_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing location data:', error);
  }
}; 