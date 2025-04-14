// mapLoader.js - Utility for handling Google Maps script loading

const MAPS_API_KEY = 'AIzaSyDs_HDyac8lBXdLnAa8zbDjwf1v-2bFjpI';
const SCRIPT_ID = 'google-maps-script';

let mapLoadingPromise = null;
// Keep track of all event listeners we add to DOM elements for safe cleanup
const activeListeners = new Map();

/**
 * Loads the Google Maps script once and returns a promise
 * @param {Array} libraries - Optional array of libraries to load (e.g. ['places'])
 * @returns {Promise<void>} A promise that resolves when the script is loaded
 */
export const loadGoogleMapsScript = (libraries = []) => {
  // 1. Check if already loaded
  if (window.google && window.google.maps) {
    return Promise.resolve();
  }

  // 2. Check if loading is already in progress
  if (mapLoadingPromise) {
    return mapLoadingPromise;
  }

  // 3. Check if script tag exists but google object is not yet available
  const existingScriptElement = document.getElementById(SCRIPT_ID);
  if (existingScriptElement && !(window.google && window.google.maps)) {
    // Re-create the promise to wait for the existing script tag to load/error
    mapLoadingPromise = new Promise((resolve, reject) => {
      const handleLoad = () => {
        // Clean up listeners
        removeEventListener(existingScriptElement, 'load', handleLoad);
        removeEventListener(existingScriptElement, 'error', handleError);
        
        if (window.google && window.google.maps) {
          resolve();
        } else {
          // Should not happen if 'load' fired, but handle defensively
          console.error('Google Maps script loaded but window.google not found.');
          reject(new Error('Google Maps loaded but window.google not found.'));
          mapLoadingPromise = null; // Reset promise
        }
      };
      
      const handleError = (error) => {
        // Clean up listeners
        removeEventListener(existingScriptElement, 'load', handleLoad);
        removeEventListener(existingScriptElement, 'error', handleError);
        
        console.error('Error loading existing Google Maps script:', error);
        reject(new Error('Google Maps script failed to load'));
        mapLoadingPromise = null; // Reset promise
      };

      // Add listeners to the *existing* script tag
      addEventListener(existingScriptElement, 'load', handleLoad);
      addEventListener(existingScriptElement, 'error', handleError);
    });
    return mapLoadingPromise;
  }

  // 4. If script doesn't exist, create and load it
  mapLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;
    
    const librariesParam = libraries.length > 0 ? `&libraries=${libraries.join(',')}` : '';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}${librariesParam}`;
    
    const handleLoad = () => {
      // Clean up listeners
      removeEventListener(script, 'load', handleLoad);
      removeEventListener(script, 'error', handleError);
      
      if (window.google && window.google.maps) {
        resolve();
      } else {
        console.error('Google Maps script loaded but window.google not found.');
        reject(new Error('Google Maps loaded but window.google not found.'));
        mapLoadingPromise = null; // Reset promise
      }
    };
    
    const handleError = (event) => {
      // Clean up listeners
      removeEventListener(script, 'load', handleLoad);
      removeEventListener(script, 'error', handleError);
      
      console.error('Error loading new Google Maps script:', event);
      reject(new Error('Google Maps script failed to load'));
      mapLoadingPromise = null; // Reset promise
    };

    addEventListener(script, 'load', handleLoad);
    addEventListener(script, 'error', handleError);
    
    document.head.appendChild(script);
  });
  
  return mapLoadingPromise;
};

/**
 * Safely add an event listener and track it for later removal
 * @param {HTMLElement} element - The DOM element to attach to
 * @param {string} eventType - The event type (e.g., 'load', 'error')
 * @param {Function} handler - The event handler function
 */
function addEventListener(element, eventType, handler) {
  if (!element) return;
  
  element.addEventListener(eventType, handler);
  
  // Store the listener reference
  if (!activeListeners.has(element)) {
    activeListeners.set(element, new Map());
  }
  const elementListeners = activeListeners.get(element);
  if (!elementListeners.has(eventType)) {
    elementListeners.set(eventType, new Set());
  }
  elementListeners.get(eventType).add(handler);
}

/**
 * Safely remove an event listener and clear it from tracking
 * @param {HTMLElement} element - The DOM element to remove from
 * @param {string} eventType - The event type (e.g., 'load', 'error')
 * @param {Function} handler - The event handler function
 */
function removeEventListener(element, eventType, handler) {
  if (!element) return;
  
  try {
    element.removeEventListener(eventType, handler);
  } catch (error) {
    console.warn('Failed to remove event listener:', error);
  }
  
  // Remove from tracked listeners
  if (activeListeners.has(element)) {
    const elementListeners = activeListeners.get(element);
    if (elementListeners.has(eventType)) {
      elementListeners.get(eventType).delete(handler);
      if (elementListeners.get(eventType).size === 0) {
        elementListeners.delete(eventType);
      }
    }
    if (elementListeners.size === 0) {
      activeListeners.delete(element);
    }
  }
}

/**
 * Clean up all listeners for a specific element or all tracked listeners if no element is specified
 * @param {HTMLElement} [element] - Optional element to clean up listeners for
 */
export const cleanupEventListeners = (element = null) => {
  if (element) {
    // Clean up listeners for a specific element
    if (activeListeners.has(element)) {
      const elementListeners = activeListeners.get(element);
      for (const [eventType, handlers] of elementListeners.entries()) {
        for (const handler of handlers) {
          try {
            element.removeEventListener(eventType, handler);
          } catch (error) {
            console.warn('Failed to remove event listener during cleanup:', error);
          }
        }
      }
      activeListeners.delete(element);
    }
  } else {
    // Clean up all tracked listeners
    for (const [element, elementListeners] of activeListeners.entries()) {
      for (const [eventType, handlers] of elementListeners.entries()) {
        for (const handler of handlers) {
          try {
            element.removeEventListener(eventType, handler);
          } catch (error) {
            console.warn('Failed to remove event listener during global cleanup:', error);
          }
        }
      }
    }
    activeListeners.clear();
  }
};

/**
 * Check if Google Maps script is already loaded
 * @returns {boolean}
 */
export const isGoogleMapsLoaded = () => {
  return !!(window.google && window.google.maps);
}; 