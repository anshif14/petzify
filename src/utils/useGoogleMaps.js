// useGoogleMaps.js - Custom React hook for Google Maps integration
import { useState, useEffect, useCallback } from 'react';
import { loadGoogleMapsScript, cleanupEventListeners, isGoogleMapsLoaded } from './mapLoader';

/**
 * A custom React hook to handle Google Maps loading and initialization
 * @param {Array} libraries - Optional array of Google Maps libraries to load
 * @param {Function} onMapLoad - Callback function to run when map is loaded
 * @param {boolean} loadOnMount - Whether to load the map on component mount
 * @returns {Object} Map state and loading functions
 */
const useGoogleMaps = (libraries = [], onMapLoad = null, loadOnMount = false) => {
  const [isLoaded, setIsLoaded] = useState(isGoogleMapsLoaded());
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Function to load Google Maps
  const loadMap = useCallback(async (forceReload = false) => {
    if ((isLoaded || isLoading) && !forceReload) return;
    
    setIsLoading(true);
    setLoadError(null);
    
    try {
      // If forcing reload, try to clear any existing global references to Google Maps
      if (forceReload && window.google) {
        try {
          // Try to remove the script element
          const scriptElement = document.getElementById('google-maps-script');
          if (scriptElement && scriptElement.parentNode) {
            scriptElement.parentNode.removeChild(scriptElement);
          }
          
          // Remove global references
          delete window.google;
          delete window.google_maps_callback;
        } catch (error) {
          console.warn('Error during forced Google Maps cleanup:', error);
        }
      }
      
      await loadGoogleMapsScript(libraries);
      setIsLoaded(true);
      
      if (onMapLoad && typeof onMapLoad === 'function') {
        onMapLoad();
      }
    } catch (error) {
      console.error('Error loading Google Maps:', error);
      setLoadError('Failed to load Google Maps. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [libraries, onMapLoad, isLoaded, isLoading]);

  // Load the map on mount if specified
  useEffect(() => {
    if (loadOnMount) {
      loadMap();
    }
    
    // Clean up event listeners when component unmounts
    return () => {
      cleanupEventListeners();
    };
  }, [loadOnMount, loadMap]);

  return {
    isLoaded,
    isLoading,
    loadError,
    loadMap
  };
};

export default useGoogleMaps; 