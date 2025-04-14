// mapLoader.js - Utility for handling Google Maps script loading

const MAPS_API_KEY = 'AIzaSyDs_HDyac8lBXdLnAa8zbDjwf1v-2bFjpI';
const SCRIPT_ID = 'google-maps-script';
const CALLBACK_NAME = 'googleMapsCallback';

let mapLoadingPromise = null;
// Keep track of all event listeners we add to DOM elements for safe cleanup
const activeListeners = new Map();

/**
 * Loads the Google Maps script once and returns a promise
 * @param {Array} libraries - Optional array of libraries to load (e.g. ['places'])
 * @param {boolean} forceReload - Force a reload of the script even if already loading
 * @returns {Promise<void>} A promise that resolves when the script is loaded
 */
export const loadGoogleMapsScript = (libraries = [], forceReload = false) => {
  // 1. Check if already loaded
  if (window.google && window.google.maps && !forceReload) {
    return Promise.resolve();
  }

  // 2. Check if loading is already in progress
  if (mapLoadingPromise && !forceReload) {
    return mapLoadingPromise;
  }
  
  // Reset the promise if forcing reload
  if (forceReload) {
    mapLoadingPromise = null;
    
    // Try to remove any existing script
    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript && existingScript.parentNode) {
      try {
        existingScript.parentNode.removeChild(existingScript);
        console.log("Removed existing Google Maps script for reload");
      } catch (err) {
        console.warn("Failed to remove existing script:", err);
      }
    }
  }

  // 3. Create a promise that will be resolved when the callback is called
  mapLoadingPromise = new Promise((resolve, reject) => {
    // Create a global callback that Google Maps can call when loaded
    window[CALLBACK_NAME] = () => {
      // Check if Google Maps is available
      if (window.google && window.google.maps) {
        resolve();
      } else {
        reject(new Error('Google Maps loaded but window.google not found.'));
      }
      // Clean up the global callback
      delete window[CALLBACK_NAME];
    };

    try {
      // Check if script tag already exists
      const existingScript = document.getElementById(SCRIPT_ID);
      if (existingScript) {
        // If it exists but Google isn't defined, the script is still loading
        if (!(window.google && window.google.maps)) {
          // Just wait for the existing script to load - our callback should still be called
          return;
        }
      }

      // Create a new script tag
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.type = 'text/javascript';
      
      // Add libraries if specified
      const librariesParam = libraries.length > 0 ? `&libraries=${libraries.join(',')}` : '';
      
      // Use the recommended loading pattern with callback
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}${librariesParam}&callback=${CALLBACK_NAME}&loading=async`;
      
      // Add error handling
      script.onerror = (err) => {
        console.error('Error loading Google Maps script:', err);
        reject(new Error('Google Maps script failed to load'));
        mapLoadingPromise = null;
        
        // Clean up the global callback
        delete window[CALLBACK_NAME];
      };
      
      // Append the script to the document
      document.head.appendChild(script);
    } catch (err) {
      console.error('Error setting up Google Maps script:', err);
      reject(err);
      mapLoadingPromise = null;
      
      // Clean up the global callback
      delete window[CALLBACK_NAME];
    }
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