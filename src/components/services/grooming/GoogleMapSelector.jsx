import React, { useEffect, useRef, useState } from 'react';
import useGoogleMaps from '../../../utils/useGoogleMaps';
import { toast } from 'react-toastify';

const GoogleMapSelector = ({ initialLocation, onLocationSelect }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const { isLoaded, isLoading, loadError, loadMap } = useGoogleMaps(['places'], null, true);
  
  // Initialize map once Google Maps is loaded
  useEffect(() => {
    if (isLoaded && !map && mapRef.current) {
      // Set default location (center of map) if no initial location provided
      const defaultLocation = initialLocation || { lat: 20.5937, lng: 78.9629 }; // Center of India by default
      
      // Create the map
      const googleMap = new window.google.maps.Map(mapRef.current, {
        center: defaultLocation,
        zoom: 14,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });
      
      // Create a marker if we have an initial location
      let mapMarker = null;
      if (initialLocation && initialLocation.latitude && initialLocation.longitude) {
        const position = {
          lat: parseFloat(initialLocation.latitude),
          lng: parseFloat(initialLocation.longitude)
        };
        
        mapMarker = new window.google.maps.Marker({
          position,
          map: googleMap,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        });
        
        // Center map on marker
        googleMap.setCenter(position);
      }
      
      // Add click event to map for placing/moving marker
      googleMap.addListener('click', (event) => {
        const position = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        
        // Remove existing marker if any
        if (mapMarker) {
          mapMarker.setMap(null);
        }
        
        // Create new marker
        mapMarker = new window.google.maps.Marker({
          position,
          map: googleMap,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        });
        
        // Update marker state
        setMarker(mapMarker);
        
        // Call the callback with the selected location
        onLocationSelect({
          latitude: position.lat,
          longitude: position.lng
        });
        
        // Add dragend event listener to the marker
        mapMarker.addListener('dragend', () => {
          const newPosition = {
            lat: mapMarker.getPosition().lat(),
            lng: mapMarker.getPosition().lng()
          };
          
          // Call the callback with the selected location
          onLocationSelect({
            latitude: newPosition.lat,
            longitude: newPosition.lng
          });
        });
      });
      
      // Create the search box and link it to the UI element
      const input = document.getElementById('map-search-input');
      if (input) {
        const searchBox = new window.google.maps.places.SearchBox(input);
        
        // Bias the SearchBox results towards current map's viewport
        googleMap.addListener('bounds_changed', () => {
          searchBox.setBounds(googleMap.getBounds());
        });
        
        // Listen for the event fired when the user selects a prediction and retrieve more details
        searchBox.addListener('places_changed', () => {
          const places = searchBox.getPlaces();
          
          if (places.length === 0) {
            return;
          }
          
          // For each place, get the location.
          const bounds = new window.google.maps.LatLngBounds();
          
          places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) {
              console.log('Returned place contains no geometry');
              return;
            }
            
            // Create a marker for the place
            if (mapMarker) {
              mapMarker.setMap(null);
            }
            
            const position = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            };
            
            mapMarker = new window.google.maps.Marker({
              map: googleMap,
              position: position,
              draggable: true,
              animation: window.google.maps.Animation.DROP,
            });
            
            // Update marker state
            setMarker(mapMarker);
            
            // Call the callback with the selected location
            onLocationSelect({
              latitude: position.lat,
              longitude: position.lng
            });
            
            // Add dragend event listener to the marker
            mapMarker.addListener('dragend', () => {
              const newPosition = {
                lat: mapMarker.getPosition().lat(),
                lng: mapMarker.getPosition().lng()
              };
              
              // Call the callback with the selected location
              onLocationSelect({
                latitude: newPosition.lat,
                longitude: newPosition.lng
              });
            });
            
            // Extend the bounds to include the place's location
            if (place.geometry.viewport) {
              // Only geocodes have viewport.
              bounds.union(place.geometry.viewport);
            } else {
              bounds.extend(place.geometry.location);
            }
          });
          
          googleMap.fitBounds(bounds);
        });
      }
      
      // Save map instance to state
      setMap(googleMap);
      setMarker(mapMarker);
    }
  }, [isLoaded, map, initialLocation, onLocationSelect]);
  
  // Show loading, error, or map
  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading Google Maps: {loadError}</p>
        <button
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          onClick={() => loadMap()}
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          id="map-search-input"
          type="text"
          placeholder="Search for a location"
          className="w-full p-3 pl-10 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
        />
        <div className="absolute left-3 top-3 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      <div 
        ref={mapRef} 
        className="h-96 w-full rounded-lg shadow-md"
      ></div>
      
      <p className="text-sm text-gray-500">
        Click on the map to place a marker at your desired location or search for an address.
        You can also drag the marker to adjust its position precisely.
      </p>
    </div>
  );
};

export default GoogleMapSelector; 