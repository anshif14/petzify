// useGoogleMaps.js - Custom React hook for Google Maps integration
import { useState, useEffect } from 'react';
import { loadGoogleMapsScript, cleanupEventListeners } from './mapLoader';

/**
 * A custom React hook to handle Google Maps loading and initialization
 * @param {Array} libraries - Optional array of Google Maps libraries to load
 * @param {Function} onMapLoad - Callback function to run when map is loaded
 * @param {boolean} loadOnMount - Whether to load the map on component mount
 * @returns {Object} Map state and loading functions
 */
const useGoogleMaps = (libraries = [], onMapLoad = null, loadOnMount = false) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Function to load Google Maps
  const loadMap = async () => {
    if (isLoaded || isLoading) return;
    
    setIsLoading(true);
    
    try {
      await loadGoogleMapsScript(libraries);
      setIsLoaded(true);
      setLoadError(null);
      
      if (onMapLoad && typeof onMapLoad === 'function') {
        onMapLoad();
      }
    } catch (error) {
      console.error('Error loading Google Maps:', error);
      setLoadError('Failed to load Google Maps. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load the map on mount if specified
  useEffect(() => {
    if (loadOnMount) {
      loadMap();
    }
    
    // Clean up event listeners when component unmounts
    return () => {
      cleanupEventListeners();
    };
  }, [loadOnMount]);

  return {
    isLoaded,
    isLoading,
    loadError,
    loadMap
  };
};

export default useGoogleMaps; 