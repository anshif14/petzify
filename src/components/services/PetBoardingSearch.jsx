import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config.js';
import useGoogleMaps from '../../utils/useGoogleMaps';

// Create a separate Map component to isolate the Google Maps rendering
const DetailMap = ({ center, userLocation, isLoaded, loadMap }) => {
  const mapRef = useRef(null);
  const [mapIsLoaded, setMapIsLoaded] = useState(false);
  
  useEffect(() => {
    // Initialize map when component mounts
    const initMap = async () => {
      if (!mapRef.current) return;
      
      // Make sure container has dimensions
      const container = mapRef.current;
      container.style.width = '100%';
      container.style.height = '300px';
      
      // Check if Google Maps is loaded
      if (!window.google || !window.google.maps) {
        if (typeof loadMap === 'function') {
          await loadMap();
        }
        // If still not loaded, return and try again
        if (!window.google || !window.google.maps) {
          setTimeout(initMap, 300);
          return;
        }
      }
      
      // Get coordinates of boarding center
      const centerLat = parseFloat(center.latitude) || parseFloat(center.location?.latitude) || 0;
      const centerLng = parseFloat(center.longitude) || parseFloat(center.location?.longitude) || 0;
      
      const centerPosition = {
        lat: centerLat,
        lng: centerLng
      };
      
      // Map options
      const mapOptions = {
        center: centerPosition,
        zoom: 15,
        mapTypeControl: true,
        fullscreenControl: true,
        streetViewControl: true,
        zoomControl: true,
      };
      
      // Create map
      const map = new window.google.maps.Map(container, mapOptions);
      
      // Add marker for boarding center
      new window.google.maps.Marker({
        position: centerPosition,
        map: map,
        title: center.centerName,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        }
      });
      
      // If user location is available, add a marker for it
      if (userLocation) {
        const userLatLng = {
          lat: userLocation.latitude,
          lng: userLocation.longitude
        };
        
        // Add marker for user location
        new window.google.maps.Marker({
          position: userLatLng,
          map: map,
          title: 'Your Location',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
          }
        });
        
        // Create bounds to fit both points
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(centerPosition);
        bounds.extend(userLatLng);
        map.fitBounds(bounds);
      }
      
      setMapIsLoaded(true);
    };
    
    initMap();
    
    // Cleanup function - no need to handle DOM manipulation
    return () => {
      // Only need to handle references that might persist
      if (window.google && window.google.maps && mapRef.current?.__gm) {
        try {
          window.google.maps.event.clearInstanceListeners(mapRef.current);
        } catch (err) {
          console.warn('Error clearing map listeners:', err);
        }
      }
    };
  }, [center, userLocation, loadMap]);
  
  return (
    <div>
      <div 
        ref={mapRef} 
        className="w-full h-64 rounded-md border border-gray-300 bg-gray-100 mb-4"
      >
        {!mapIsLoaded && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <span className="ml-2 text-gray-600">Loading map...</span>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600">
        <strong>Address:</strong> {center.address}, {center.city}, {center.pincode}
      </p>
      {center.latitude && center.longitude && (
        <p className="text-sm text-gray-600">
          <a 
            href={`https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Get Directions
          </a>
        </p>
      )}
    </div>
  );
};

const PetBoardingSearch = () => {
  const [searchParams, setSearchParams] = useState({
    location: '',
    petType: '',
    petSize: '',
    dateFrom: '',
    dateTo: '',
    radius: '10', // Add radius for distance filtering
  });
  
  const [boardingCenters, setBoardingCenters] = useState([]);
  const [filteredCenters, setFilteredCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  // Add user location state
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  // Add booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    dateFrom: '',
    dateTo: '',
    petType: '',
    petSize: '',
    notes: ''
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [centersPerPage] = useState(9); // Show 9 centers per page (3x3 grid)
  
  // Use our custom hook for Google Maps
  const { isLoaded, loadMap } = useGoogleMaps();
  
  // Add state to track elements for cleanup
  const [cleanupInfo, setCleanupInfo] = useState({ elements: [], listeners: [] });

  // Function to calculate distance between two coordinates using the Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

  // Function to filter centers by distance
  const filterCentersByDistance = (centers, userLat, userLng, maxDistance) => {
    if (!userLat || !userLng || !maxDistance) return centers;
    
    return centers.filter(center => {
      const centerLat = parseFloat(center.latitude) || parseFloat(center.location?.latitude) || 0;
      const centerLng = parseFloat(center.longitude) || parseFloat(center.location?.longitude) || 0;
      
      if (centerLat === 0 || centerLng === 0) return false;
      
      const distance = calculateDistance(userLat, userLng, centerLat, centerLng);
      // Store the calculated distance in the center object
      center.distance = distance;
      return distance <= parseFloat(maxDistance);
    });
  };

  // Ask for user location on component mount
  useEffect(() => {
    // Get user location immediately on component mount
    getUserLocation();
  }, []);
  
  // Get user location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported by your browser');
      return;
    }
    
    setLocationLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log("Successfully got user location:", latitude, longitude);
        setUserLocation({ latitude, longitude });
        
        // Reverse geocode to get address
        if (window.google && window.google.maps) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === 'OK' && results[0]) {
              // Extract city name from the address components
              let cityName = '';
              for (const component of results[0].address_components) {
                if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
                  cityName = component.long_name;
                  break;
                }
              }
              
              // Update location with the city name instead of coordinates
              setSearchParams(prev => ({ 
                ...prev, 
                location: cityName || results[0].formatted_address
              }));
              console.log("Location set to:", cityName || results[0].formatted_address);
            }
          });
        } else {
          // If Google Maps is not available, just use a generic label
          setSearchParams(prev => ({ 
            ...prev, 
            location: `Current Location` 
          }));
        }
        
        // Process boarding centers if they're already loaded
        if (boardingCenters.length > 0) {
          processLocationBasedResults(latitude, longitude, boardingCenters);
        }
        
        setLocationLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationLoading(false);
        
        // Don't show alert, just silently fail and let user search manually
        if (error.code === 1) {
          console.log("User denied geolocation permission");
        } else {
          console.log("Error getting location:", error.message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };
  
  // Helper function to process centers based on location
  const processLocationBasedResults = (latitude, longitude, centers) => {
    console.log("Processing centers with location data");
    const centersWithDistance = centers.map(center => {
      const centerLat = parseFloat(center.latitude) || parseFloat(center.location?.latitude) || 0;
      const centerLng = parseFloat(center.longitude) || parseFloat(center.location?.longitude) || 0;
      
      if (centerLat === 0 || centerLng === 0) {
        center.distance = Infinity;
      } else {
        center.distance = calculateDistance(latitude, longitude, centerLat, centerLng);
      }
      return center;
    });
    
    // Sort by distance
    centersWithDistance.sort((a, b) => a.distance - b.distance);
    
    // Filter out centers with invalid coordinates
    const filtered = centersWithDistance.filter(c => c.distance !== Infinity);
    
    console.log(`Found ${filtered.length} centers with valid coordinates`);
    setFilteredCenters(filtered);
  };
  
  useEffect(() => {
    const fetchBoardingCenters = async () => {
      try {
        // Only fetch approved centers
        const q = query(
          collection(db, 'petBoardingCenters'),
          where('status', '==', 'approved')
        );
        
        console.log("Fetching boarding centers");
        const snapshot = await getDocs(q);
        const centers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`Found ${centers.length} approved boarding centers`);
        setBoardingCenters(centers);
        
        // If user location is already available, filter and sort by distance
        if (userLocation) {
          processLocationBasedResults(userLocation.latitude, userLocation.longitude, centers);
        } else {
          setFilteredCenters(centers);
        }
      } catch (err) {
        console.error('Error fetching boarding centers:', err);
        setError('Failed to load boarding centers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBoardingCenters();
  }, [userLocation?.latitude, userLocation?.longitude]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams({
      ...searchParams,
      [name]: value
    });
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    
    // Base filtering (same as before)
    let filtered = boardingCenters.filter(center => {
      // Location filter (city or pincode)
      const locationMatch = 
        !searchParams.location || 
        center.city?.toLowerCase().includes(searchParams.location.toLowerCase()) || 
        center.pincode?.includes(searchParams.location);
      
      // Pet type filter
      const petTypeMatch = 
        !searchParams.petType || 
        (center.petTypesAccepted && center.petTypesAccepted[searchParams.petType]);
      
      // Pet size filter
      const petSizeMatch = 
        !searchParams.petSize || 
        (center.petSizeLimit && center.petSizeLimit.includes(searchParams.petSize));
      
      // Simple date availability (more complex logic would be needed for actual booking)
      let dateMatch = true;
      if (searchParams.dateFrom && searchParams.dateTo) {
        // This is a simplified check - in reality, you'd need to check against actual bookings
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const fromDate = new Date(searchParams.dateFrom);
        const toDate = new Date(searchParams.dateTo);
        
        // Check if the requested date range includes days when the center is closed
        for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = daysOfWeek[d.getDay()];
          if (center.operatingDays && !center.operatingDays[dayOfWeek]) {
            dateMatch = false;
            break;
          }
        }
      }
      
      return locationMatch && petTypeMatch && petSizeMatch && dateMatch;
    });
    
    // Apply distance filtering if user location is available
    if (userLocation && searchParams.radius) {
      filtered = filterCentersByDistance(
        filtered,
        userLocation.latitude,
        userLocation.longitude,
        parseFloat(searchParams.radius)
      );
      // Sort by distance
      filtered.sort((a, b) => a.distance - b.distance);
    }
    
    setFilteredCenters(filtered);
  };
  
  const handleCenterSelect = (center) => {
    setSelectedCenter(center);
  };
  
  const viewCenterDetails = (center) => {
    console.log('Viewing details for:', center.centerName);
    setSelectedCenter(center);
    setShowModal(true);
  };
  
  const closeDetails = () => {
    // Much simpler cleanup now
    setSelectedCenter(null);
    setShowModal(false);
  };

  // Helper function to get current page centers for a specific distance range
  const getCurrentPageCenters = (centers, page, itemsPerPage, distanceRange = null) => {
    if (!centers.length) return [];
    
    let filteredByDistance = centers;
    if (distanceRange) {
      const { min, max } = distanceRange;
      filteredByDistance = centers.filter(c => 
        c.distance > min && (max === Infinity ? true : c.distance <= max)
      );
    }
    
    // Calculate pagination indexes
    const indexOfLastCenter = page * itemsPerPage;
    const indexOfFirstCenter = indexOfLastCenter - itemsPerPage;
    
    // Slice the array for current page
    return filteredByDistance.slice(indexOfFirstCenter, indexOfLastCenter);
  };
  
  // Get total number of pages based on centers count
  const getTotalPages = (centers, itemsPerPage, distanceRange = null) => {
    if (!centers.length) return 0;
    
    let count = centers.length;
    if (distanceRange) {
      const { min, max } = distanceRange;
      count = centers.filter(c => 
        c.distance > min && (max === Infinity ? true : c.distance <= max)
      ).length;
    }
    
    return Math.ceil(count / itemsPerPage);
  };
  
  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Go to next page
  const nextPage = (totalPages) => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  // Go to previous page
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchParams, userLocation]);

  // Add booking functions
  const openBookingModal = () => {
    setShowBookingModal(true);
  };
  
  const closeBookingModal = () => {
    setShowBookingModal(false);
  };
  
  const handleBookingInputChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails({
      ...bookingDetails,
      [name]: value
    });
  };
  
  const calculateBookingDays = () => {
    if (!bookingDetails.dateFrom || !bookingDetails.dateTo) return 0;
    
    const fromDate = new Date(bookingDetails.dateFrom);
    const toDate = new Date(bookingDetails.dateTo);
    const diffTime = Math.abs(toDate - fromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end days
    
    return diffDays;
  };
  
  const submitBooking = (e) => {
    e.preventDefault();
    // Here you would integrate with your backend to save the booking
    
    // For now, just show an alert with the booking details
    const days = calculateBookingDays();
    const totalCost = selectedCenter.perDayCharge * days;
    
    alert(`Booking confirmed for ${selectedCenter.centerName}!\n\nDates: ${bookingDetails.dateFrom} to ${bookingDetails.dateTo}\nPet: ${bookingDetails.petType}, ${bookingDetails.petSize} size\nTotal cost: ₹${totalCost}`);
    
    // Close modals
    setShowBookingModal(false);
    closeDetails();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading boarding centers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Find Pet Boarding</h2>
        
        <form onSubmit={handleSearch} className="space-y-4 md:space-y-0 md:grid md:grid-cols-5 md:gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <div className="flex">
              <input
                type="text"
                name="location"
                value={searchParams.location}
                onChange={handleInputChange}
                placeholder="City, Pincode or Address"
                className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-primary focus:border-primary"
              />
              <button
                type="button"
                onClick={getUserLocation}
                className="px-3 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 flex items-center"
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pet Type</label>
            <select
              name="petType"
              value={searchParams.petType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            >
              <option value="">Any Type</option>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
              <option value="rabbit">Rabbit</option>
              <option value="bird">Bird</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pet Size</label>
            <select
              name="petSize"
              value={searchParams.petSize}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            >
              <option value="">Any Size</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Search
            </button>
          </div>
        </form>
      </div>
      
      {/* Location-based distance grouped display */}
      {userLocation && filteredCenters.length > 0 ? (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Pet boarding centers {searchParams.location ? `near ${searchParams.location}` : ''}
            </h2>
            <p className="text-sm text-gray-600">{filteredCenters.length} results found</p>
          </div>
          
          {/* Distance-based grouping */}
          <div className="space-y-8">
            {/* 0-5 km distance group */}
            {filteredCenters.filter(c => c.distance <= 5).length > 0 && (
              <div>
                <div className="border-b border-gray-300 pb-2 mb-4">
                  <h3 className="text-lg font-medium text-gray-800">
                    Displaying centers within 5 kms 
                    {searchParams.location ? ` from ${searchParams.location}` : ''}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {filteredCenters.filter(c => c.distance <= 5).length} centers found
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getCurrentPageCenters(
                    filteredCenters.filter(center => center.distance <= 5),
                    currentPage,
                    centersPerPage
                  ).map(center => (
                    <div 
                      key={center.id} 
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="h-48 bg-gray-300 relative">
                        {center.galleryImageURLs && center.galleryImageURLs.length > 0 ? (
                          <img 
                            src={center.galleryImageURLs[0]} 
                            alt={center.centerName} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <span className="text-gray-500">No image available</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">{center.centerName}</h4>
                        <p className="text-gray-600 text-sm mb-2">{center.city}, {center.pincode}</p>
                        
                        {/* Display distance if available */}
                        {center.distance !== undefined && (
                          <p className="text-sm text-blue-600 mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {center.distance.toFixed(1)} km away
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-sm text-gray-500">Accepts:</span>
                          {center.petTypesAccepted && Object.entries(center.petTypesAccepted)
                            .filter(([_, value]) => value)
                            .map(([petType]) => (
                              <span 
                                key={petType} 
                                className="px-2 py-1 bg-primary-light text-primary text-xs rounded-full"
                              >
                                {petType.charAt(0).toUpperCase() + petType.slice(1)}
                              </span>
                            ))
                          }
                        </div>
                        
                        <div className="flex justify-between items-center mt-4">
                          <span className="font-semibold text-gray-900">₹{center.perDayCharge}/day</span>
                          <button
                            onClick={() => viewCenterDetails(center)}
                            className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination for 0-5 km group */}
                {filteredCenters.filter(c => c.distance <= 5).length > centersPerPage && (
                  <div className="mt-6 flex justify-center">
                    <nav className="inline-flex rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => prevPage()}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 rounded-l-md border border-gray-300 bg-white text-sm font-medium
                          ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        Previous
                      </button>
                      
                      {[...Array(getTotalPages(filteredCenters.filter(c => c.distance <= 5), centersPerPage)).keys()].map(number => (
                        <button
                          key={number}
                          onClick={() => paginate(number + 1)}
                          className={`px-3 py-1 border border-gray-300 text-sm font-medium
                            ${currentPage === number + 1 
                              ? 'bg-primary text-white border-primary z-10' 
                              : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                          {number + 1}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => nextPage(getTotalPages(filteredCenters.filter(c => c.distance <= 5), centersPerPage))}
                        disabled={currentPage === getTotalPages(filteredCenters.filter(c => c.distance <= 5), centersPerPage)}
                        className={`px-3 py-1 rounded-r-md border border-gray-300 bg-white text-sm font-medium
                          ${currentPage === getTotalPages(filteredCenters.filter(c => c.distance <= 5), centersPerPage) 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            )}
            
            {/* 5-20 km distance group */}
            {filteredCenters.filter(c => c.distance > 5 && c.distance <= 20).length > 0 && (
              <div>
                <div className="border-b border-gray-300 pb-2 mb-4">
                  <h3 className="text-lg font-medium text-gray-800">
                    Displaying centers within 20 kms 
                    {searchParams.location ? ` from ${searchParams.location}` : ''}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {filteredCenters.filter(c => c.distance > 5 && c.distance <= 20).length} centers found
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCenters
                    .filter(center => center.distance > 5 && center.distance <= 20)
                    .map(center => (
                      <div 
                        key={center.id} 
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="h-48 bg-gray-300 relative">
                          {center.galleryImageURLs && center.galleryImageURLs.length > 0 ? (
                            <img 
                              src={center.galleryImageURLs[0]} 
                              alt={center.centerName} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <span className="text-gray-500">No image available</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">{center.centerName}</h4>
                          <p className="text-gray-600 text-sm mb-2">{center.city}, {center.pincode}</p>
                          
                          {/* Display distance if available */}
                          {center.distance !== undefined && (
                            <p className="text-sm text-blue-600 mb-2 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {center.distance.toFixed(1)} km away
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-2 mb-3">
                            <span className="text-sm text-gray-500">Accepts:</span>
                            {center.petTypesAccepted && Object.entries(center.petTypesAccepted)
                              .filter(([_, value]) => value)
                              .map(([petType]) => (
                                <span 
                                  key={petType} 
                                  className="px-2 py-1 bg-white text-white text-xs rounded-full"
                                >
                                  {petType.charAt(0).toUpperCase() + petType.slice(1)}
                                </span>
                              ))
                            }
                          </div>
                          
                          <div className="flex justify-between items-center mt-4">
                            <span className="font-semibold text-gray-900">₹{center.perDayCharge}/day</span>
                            <button
                              onClick={() => viewCenterDetails(center)}
                              className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            
            {/* 20-50 km distance group */}
            {filteredCenters.filter(c => c.distance > 20 && c.distance <= 50).length > 0 && (
              <div>
                <div className="border-b border-gray-300 pb-2 mb-4">
                  <h3 className="text-lg font-medium text-gray-800">
                    Displaying centers within 50 kms 
                    {searchParams.location ? ` from ${searchParams.location}` : ''}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {filteredCenters.filter(c => c.distance > 20 && c.distance <= 50).length} centers found
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCenters
                    .filter(center => center.distance > 20 && center.distance <= 50)
                    .map(center => (
                      <div 
                        key={center.id} 
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="h-48 bg-gray-300 relative">
                          {center.galleryImageURLs && center.galleryImageURLs.length > 0 ? (
                            <img 
                              src={center.galleryImageURLs[0]} 
                              alt={center.centerName} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <span className="text-gray-500">No image available</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">{center.centerName}</h4>
                          <p className="text-gray-600 text-sm mb-2">{center.city}, {center.pincode}</p>
                          
                          {/* Display distance if available */}
                          {center.distance !== undefined && (
                            <p className="text-sm text-blue-600 mb-2 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {center.distance.toFixed(1)} km away
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-2 mb-3">
                            <span className="text-sm text-gray-500">Accepts:</span>
                            {center.petTypesAccepted && Object.entries(center.petTypesAccepted)
                              .filter(([_, value]) => value)
                              .map(([petType]) => (
                                <span 
                                  key={petType} 
                                  className="px-2 py-1 bg-primary-light text-primary text-xs rounded-full"
                                >
                                  {petType.charAt(0).toUpperCase() + petType.slice(1)}
                                </span>
                              ))
                            }
                          </div>
                          
                          <div className="flex justify-between items-center mt-4">
                            <span className="font-semibold text-gray-900">₹{center.perDayCharge}/day</span>
                            <button
                              onClick={() => viewCenterDetails(center)}
                              className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            
            {/* 50+ km distance group */}
            {filteredCenters.filter(c => c.distance > 50).length > 0 && (
              <div>
                <div className="border-b border-gray-300 pb-2 mb-4">
                  <h3 className="text-lg font-medium text-gray-800">
                    Displaying centers beyond 50 kms 
                    {searchParams.location ? ` from ${searchParams.location}` : ''}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {filteredCenters.filter(c => c.distance > 50).length} centers found
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCenters
                    .filter(center => center.distance > 50)
                    .map(center => (
                      <div 
                        key={center.id} 
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="h-48 bg-gray-300 relative">
                          {center.galleryImageURLs && center.galleryImageURLs.length > 0 ? (
                            <img 
                              src={center.galleryImageURLs[0]} 
                              alt={center.centerName} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <span className="text-gray-500">No image available</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">{center.centerName}</h4>
                          <p className="text-gray-600 text-sm mb-2">{center.city}, {center.pincode}</p>
                          
                          {/* Display distance if available */}
                          {center.distance !== undefined && (
                            <p className="text-sm text-blue-600 mb-2 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {center.distance.toFixed(1)} km away
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-2 mb-3">
                            <span className="text-sm text-gray-500">Accepts:</span>
                            {center.petTypesAccepted && Object.entries(center.petTypesAccepted)
                              .filter(([_, value]) => value)
                              .map(([petType]) => (
                                <span 
                                  key={petType} 
                                  className="px-2 py-1 bg-primary-light text-primary text-xs rounded-full"
                                >
                                  {petType.charAt(0).toUpperCase() + petType.slice(1)}
                                </span>
                              ))
                            }
                          </div>
                          
                          <div className="flex justify-between items-center mt-4">
                            <span className="font-semibold text-gray-900">₹{center.perDayCharge}/day</span>
                            <button
                              onClick={() => viewCenterDetails(center)}
                              className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Results ({filteredCenters.length})</h3>
          
          {filteredCenters.length === 0 ? (
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <p className="text-gray-600">
                {userLocation ? "No boarding centers found within the selected radius." : "No boarding centers found matching your criteria."}
                {userLocation && " Try increasing the distance range."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getCurrentPageCenters(filteredCenters, currentPage, centersPerPage).map(center => (
                  <div 
                    key={center.id} 
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="h-48 bg-gray-300 relative">
                      {center.galleryImageURLs && center.galleryImageURLs.length > 0 ? (
                        <img 
                          src={center.galleryImageURLs[0]} 
                          alt={center.centerName} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <span className="text-gray-500">No image available</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{center.centerName}</h4>
                      <p className="text-gray-600 text-sm mb-2">{center.city}, {center.pincode}</p>
                      
                      {/* Display distance if available */}
                      {center.distance !== undefined && (
                        <p className="text-sm text-blue-600 mb-2 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {center.distance.toFixed(1)} km away
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-sm text-gray-500">Accepts:</span>
                        {center.petTypesAccepted && Object.entries(center.petTypesAccepted)
                          .filter(([_, value]) => value)
                          .map(([petType]) => (
                            <span 
                              key={petType} 
                              className="px-2 py-1 bg-primary-light text-primary text-xs rounded-full"
                            >
                              {petType.charAt(0).toUpperCase() + petType.slice(1)}
                            </span>
                          ))
                        }
                      </div>
                      
                      <div className="flex justify-between items-center mt-4">
                        <span className="font-semibold text-gray-900">₹{center.perDayCharge}/day</span>
                        <button
                          onClick={() => viewCenterDetails(center)}
                          className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {filteredCenters.length > centersPerPage && (
                <div className="mt-6 flex justify-center">
                  <nav className="inline-flex rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => prevPage()}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded-l-md border border-gray-300 bg-white text-sm font-medium
                        ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      Previous
                    </button>
                    
                    {[...Array(getTotalPages(filteredCenters, centersPerPage)).keys()].map(number => (
                      <button
                        key={number}
                        onClick={() => paginate(number + 1)}
                        className={`px-3 py-1 border border-gray-300 text-sm font-medium
                          ${currentPage === number + 1 
                            ? 'bg-primary text-white border-primary z-10' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                      >
                        {number + 1}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => nextPage(getTotalPages(filteredCenters, centersPerPage))}
                      disabled={currentPage === getTotalPages(filteredCenters, centersPerPage)}
                      className={`px-3 py-1 rounded-r-md border border-gray-300 bg-white text-sm font-medium
                        ${currentPage === getTotalPages(filteredCenters, centersPerPage) 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Center Details Modal */}
      {selectedCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              {/* Close button */}
              <button
                onClick={closeDetails}
                className="absolute right-4 top-4 bg-white rounded-full p-2 shadow-md z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Header with image */}
              <div className="h-64 bg-gray-200 relative">
                {selectedCenter.galleryImageURLs && selectedCenter.galleryImageURLs.length > 0 ? (
                  <img 
                    src={selectedCenter.galleryImageURLs[0]} 
                    alt={selectedCenter.centerName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <span className="text-gray-500">No image available</span>
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedCenter.centerName}</h2>
                    <p className="text-gray-600">{selectedCenter.address}, {selectedCenter.city}, {selectedCenter.pincode}</p>
                    {selectedCenter.distance !== undefined && (
                      <p className="text-blue-600 mt-1 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {selectedCenter.distance.toFixed(1)} kilometers from you
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">₹{selectedCenter.perDayCharge}</p>
                    <p className="text-sm text-gray-600">per day</p>
                  </div>
                </div>
                
                {selectedCenter.description && (
                  <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-semibold text-gray-700 mb-2">About This Center</h3>
                    <p className="text-gray-700">{selectedCenter.description}</p>
                  </div>
                )}
                
                <hr className="my-6" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Contact Information</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {selectedCenter.ownerName}
                      </li>
                      <li className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {selectedCenter.phoneNumber}
                      </li>
                      <li className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {selectedCenter.email}
                      </li>
                      {selectedCenter.website && (
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          <a href={selectedCenter.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {selectedCenter.website}
                          </a>
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Operating Hours</h3>
                    <ul className="space-y-1 text-gray-600">
                      {selectedCenter.operatingDays && Object.entries(selectedCenter.operatingDays).map(([day, isOpen]) => (
                        <li key={day} className="flex justify-between">
                          <span className="capitalize">{day}</span>
                          {isOpen ? (
                            <span>{selectedCenter.openingTime} - {selectedCenter.closingTime}</span>
                          ) : (
                            <span className="text-red-500">Closed</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* Map section */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Location</h3>
                  <DetailMap 
                    key={selectedCenter.id} 
                    center={selectedCenter} 
                    userLocation={userLocation}
                    isLoaded={isLoaded}
                    loadMap={loadMap}
                  />
                </div>
                
                <hr className="my-6" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Pet Details</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-start">
                        <span className="text-gray-700 font-medium mr-2">Accepts:</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedCenter.petTypesAccepted && Object.entries(selectedCenter.petTypesAccepted)
                            .filter(([_, value]) => value)
                            .map(([petType]) => (
                              <span 
                                key={petType} 
                                className="px-2 py-1 bg-primary-light text-primary text-xs rounded-full"
                              >
                                {petType.charAt(0).toUpperCase() + petType.slice(1)}
                              </span>
                            ))
                          }
                        </div>
                      </li>
                      <li>
                        <span className="text-gray-700 font-medium">Size Limit:</span>{' '}
                        {selectedCenter.petSizeLimit && selectedCenter.petSizeLimit.length > 0 
                          ? selectedCenter.petSizeLimit.map(size => size.charAt(0).toUpperCase() + size.slice(1)).join(', ')
                          : 'No limit'
                        }
                      </li>
                      <li>
                        <span className="text-gray-700 font-medium">Max Capacity:</span> {selectedCenter.capacity || 'Not specified'}
                      </li>
                      {selectedCenter.petAgeLimit && (
                        <li>
                          <span className="text-gray-700 font-medium">Age Limit:</span> {selectedCenter.petAgeLimit}
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Services Offered</h3>
                    <ul className="space-y-1 text-gray-600">
                      {selectedCenter.servicesOffered && Object.entries(selectedCenter.servicesOffered).map(([service, isOffered]) => (
                        isOffered && (
                          <li key={service} className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="capitalize">
                              {service === 'boarding' && 'Boarding'}
                              {service === 'food' && 'Food Included'}
                              {service === 'playArea' && 'Play Area / Walks'}
                              {service === 'grooming' && 'Grooming'}
                              {service === 'vetAssistance' && 'Veterinary Assistance'}
                              {service === 'liveUpdates' && 'Live Updates / CCTV Access'}
                            </span>
                          </li>
                        )
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={closeDetails}
                    className="mr-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={openBookingModal}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Booking Modal */}
      {selectedCenter && showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">Book {selectedCenter.centerName}</h3>
              <button onClick={closeBookingModal} className="text-gray-500 hover:text-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={submitBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  name="dateFrom"
                  required
                  value={bookingDetails.dateFrom}
                  onChange={handleBookingInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  name="dateTo"
                  required
                  value={bookingDetails.dateTo}
                  onChange={handleBookingInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min={bookingDetails.dateFrom || new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pet Type</label>
                <select
                  name="petType"
                  required
                  value={bookingDetails.petType}
                  onChange={handleBookingInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Pet Type</option>
                  {selectedCenter.petTypesAccepted && Object.entries(selectedCenter.petTypesAccepted)
                    .filter(([_, value]) => value)
                    .map(([petType]) => (
                      <option key={petType} value={petType}>
                        {petType.charAt(0).toUpperCase() + petType.slice(1)}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pet Size</label>
                <select
                  name="petSize"
                  required
                  value={bookingDetails.petSize}
                  onChange={handleBookingInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select Pet Size</option>
                  {selectedCenter.petSizeLimit && selectedCenter.petSizeLimit.map(size => (
                    <option key={size} value={size}>
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                <textarea
                  name="notes"
                  value={bookingDetails.notes}
                  onChange={handleBookingInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Any special requirements for your pet..."
                ></textarea>
              </div>
              
              {bookingDetails.dateFrom && bookingDetails.dateTo && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">
                    Booking for <strong>{calculateBookingDays()}</strong> days
                  </p>
                  <p className="text-sm text-gray-600">
                    Total cost: <span className="font-bold text-primary">
                      ₹{selectedCenter.perDayCharge * calculateBookingDays()}
                    </span>
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeBookingModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetBoardingSearch; 