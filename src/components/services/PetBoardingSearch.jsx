import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, query, where, getFirestore, orderBy, limit, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config.js';
import useGoogleMaps from '../../utils/useGoogleMaps';
import { Link, useNavigate } from 'react-router-dom';
import RatingDisplay from '../common/RatingDisplay';
import StarRating from '../common/StarRating';
import { getUserLocation, calculateDistance } from '../../utils/locationService';

// Create a separate Map component to isolate the Google Maps rendering
const DetailMap = ({ center, userLocation, isLoaded, loadMap, locationName }) => {
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
        <strong>Address:</strong> {locationName || `${center.address}, ${center.city}, ${center.pincode}`}
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
  const navigate = useNavigate();
  const [centersRatings, setCentersRatings] = useState({});
  const [centerReviews, setCenterReviews] = useState({});
  const [loadingReviews, setLoadingReviews] = useState(false);
  // Add state for storing location names
  const [locationNames, setLocationNames] = useState({});
  // Add state for tracking location status
  const [locationStatus, setLocationStatus] = useState('idle');

  // Function to get location name using Google Places API reverse geocoding
  const getLocationNameFromCoordinates = async (latitude, longitude, centerId) => {
    if (!latitude || !longitude || locationNames[centerId]) return;
    
    try {
      // Check if Google Maps is loaded
      if (!window.google || !window.google.maps) {
        await loadMap();
        
        // If still not loaded, return
        if (!window.google || !window.google.maps) {
          console.log('Google Maps API not loaded');
          return;
        }
      }
      
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
          
          // Update location names state
          setLocationNames(prev => ({
            ...prev,
            [centerId]: locationName
          }));
        }
      });
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
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

  // Fetch all boarding centers and their ratings
  const fetchBoardingCenters = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const db = getFirestore();
      const centersCollection = collection(db, 'petBoardingCenters');
      const centersSnapshot = await getDocs(centersCollection);
      
      let centers = [];
      centersSnapshot.forEach((doc) => {
        const data = doc.data();
        centers.push({
          id: doc.id,
          ...data,
          petTypes: Array.isArray(data.petTypes) ? data.petTypes : [],
          petSizes: Array.isArray(data.petSizes) ? data.petSizes : []
        });
      });
      
      setBoardingCenters(centers);
      setFilteredCenters(centers);
      
      // Fetch ratings for all centers
      await fetchCentersRatings(centers);
      
      // Request reverse geocoding for each center location
      centers.forEach(center => {
        const latitude = parseFloat(center.latitude) || parseFloat(center.location?.latitude) || 0;
        const longitude = parseFloat(center.longitude) || parseFloat(center.location?.longitude) || 0;
        
        if (latitude !== 0 && longitude !== 0) {
          getLocationNameFromCoordinates(latitude, longitude, center.id);
        }
      });
      
      return centers;
    } catch (err) {
      console.error("Error fetching boarding centers:", err);
      setError("Failed to load boarding centers. Please try again later.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Update this useEffect to use the new location service
  useEffect(() => {
    // Get location and then fetch boarding centers
    const loadData = async () => {
      setLocationStatus('loading');
      
      try {
        // Use the shared location service
        await getUserLocation({
          onLocationUpdate: (locationData) => {
            if (locationData) {
              setUserLocation({
                latitude: locationData.latitude,
                longitude: locationData.longitude
              });
              
              // Update the search parameters with the location name
              setSearchParams(prev => ({
                ...prev,
                location: locationData.locationName || "Current Location"
              }));
              
              // Fetch and filter boarding centers with this location
              fetchBoardingCenters().then(centers => {
                if (centers?.length > 0) {
                  const filtered = filterCentersByDistance(
                    centers,
                    locationData.latitude,
                    locationData.longitude,
                    parseFloat(searchParams.radius || 10)
                  );
                  filtered.sort((a, b) => a.distance - b.distance);
                  setFilteredCenters(filtered);
                }
              });
            }
          },
          onError: (error) => {
            console.error('Error getting location:', error);
            // Still fetch boarding centers even if location fails
            fetchBoardingCenters();
          },
          onStatusChange: (status) => {
            setLocationStatus(status);
          }
        });
      } catch (error) {
        console.error('Error in location service:', error);
        setLocationStatus('error');
        // Still fetch boarding centers even if location fails
        fetchBoardingCenters();
      }
    };
    
    loadData();
  }, []);
  
  // Fetch ratings for all boarding centers
  const fetchCentersRatings = async (centers) => {
    try {
      const db = getFirestore();
      const ratingsCollection = collection(db, 'boardingRatings');
      const ratingsSnapshot = await getDocs(ratingsCollection);
      
      // Group ratings by center ID
      const ratingsByCenter = {};
      const reviewsByCenter = {};
      
      ratingsSnapshot.forEach((doc) => {
        const data = doc.data();
        const centerId = data.centerId;
        
        if (!centerId) return;
        
        if (!ratingsByCenter[centerId]) {
          ratingsByCenter[centerId] = {
            ratings: [],
            sum: 0,
            count: 0
          };
          reviewsByCenter[centerId] = [];
        }
        
        ratingsByCenter[centerId].ratings.push(data.rating);
        ratingsByCenter[centerId].sum += data.rating;
        ratingsByCenter[centerId].count += 1;
        
        // Add review data
        reviewsByCenter[centerId].push({
          id: doc.id,
          userName: data.userName || 'Anonymous',
          rating: data.rating,
          comment: data.comment || '',
          imageUrl: data.imageUrl || null,
          date: data.ratedAt ? new Date(data.ratedAt.seconds * 1000) : new Date(),
          petName: data.petName,
          petType: data.petType
        });
      });
      
      // Calculate average ratings
      const centersWithRatings = {};
      
      Object.keys(ratingsByCenter).forEach(centerId => {
        const centerData = ratingsByCenter[centerId];
        centersWithRatings[centerId] = {
          avgRating: centerData.sum / centerData.count,
          count: centerData.count
        };
        
        // Sort reviews by date
        reviewsByCenter[centerId].sort((a, b) => b.date - a.date);
      });
      
      setCentersRatings(centersWithRatings);
      setCenterReviews(reviewsByCenter);
    } catch (err) {
      console.error("Error fetching center ratings:", err);
    }
  };

  // Fetch reviews for a specific center when opened in detail view
  const fetchCenterReviews = async (centerId) => {
    // If we already have reviews for this center, don't fetch again
    if (centerReviews[centerId] && centerReviews[centerId].length > 0) {
      return;
    }
    
    setLoadingReviews(true);
    try {
      const db = getFirestore();
      const q = query(
        collection(db, 'boardingRatings'),
        where('centerId', '==', centerId),
        orderBy('ratedAt', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const reviews = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        reviews.push({
          id: doc.id,
          userName: data.userName || 'Anonymous',
          rating: data.rating,
          comment: data.comment || '',
          imageUrl: data.imageUrl || null,
          date: data.ratedAt ? new Date(data.ratedAt.seconds * 1000) : new Date(),
          petName: data.petName,
          petType: data.petType
        });
      });
      
      setCenterReviews(prev => ({
        ...prev,
        [centerId]: reviews
      }));
    } catch (error) {
      console.error('Error fetching center reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

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
  
  // Replace modal opening with navigation to detail page
  const navigateToCenterDetail = (center) => {
    if (center && center.id) {
      // Add location name as a query parameter if available
      const params = new URLSearchParams();
      
      if (locationNames[center.id]) {
        params.append('locationName', locationNames[center.id]);
      }
      
      const queryString = params.toString();
      const url = `/services/boarding/${center.id}${queryString ? `?${queryString}` : ''}`;
      
      navigate(url);
    }
  };
  
  // Keep the viewCenterDetails for backward compatibility
  const viewCenterDetails = async (center) => {
    navigateToCenterDetail(center);
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

  // Replace the getUserLocation function with this simpler version that just calls the service
  const handleGetUserLocation = async () => {
    setLocationLoading(true);
    setLocationStatus('loading');
    
    try {
      await getUserLocation({
        // Force a fresh location check by disabling local storage and database
        useLocalStorage: false,
        onLocationUpdate: (locationData) => {
          if (locationData) {
            setUserLocation({
              latitude: locationData.latitude,
              longitude: locationData.longitude
            });
            
            // Update the search parameters with the location name
            setSearchParams(prev => ({
              ...prev,
              location: locationData.locationName || "Current Location"
            }));
            
            // Fetch and filter boarding centers with this location
            fetchBoardingCenters().then(centers => {
              if (centers?.length > 0) {
                const filtered = filterCentersByDistance(
                  centers,
                  locationData.latitude,
                  locationData.longitude,
                  parseFloat(searchParams.radius || 10)
                );
                filtered.sort((a, b) => a.distance - b.distance);
                setFilteredCenters(filtered);
              }
            });
          }
        },
        onError: (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please check your location permissions and try again.');
        },
        onStatusChange: (status) => {
          setLocationStatus(status);
        }
      });
    } catch (error) {
      console.error('Error in location service:', error);
    } finally {
      setLocationLoading(false);
    }
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
                onClick={handleGetUserLocation}
                className="px-3 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 flex items-center"
                disabled={locationLoading || locationStatus === 'loading' || locationStatus === 'getting-location' || locationStatus === 'getting-location-name' || locationStatus === 'saving-to-database'}
              >
                {locationLoading || locationStatus === 'loading' || locationStatus === 'getting-location' ? (
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : locationStatus === 'getting-location-name' ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Finding location name...</span>
                  </>
                ) : locationStatus === 'saving-to-database' ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
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
                      <div className="relative h-48">
                        <img 
                          src={center.galleryImageURLs?.[0] || "https://doggyvilleindia.in/wp-content/uploads/2024/09/how-to-choose-the-best-dog-boarding-facility-for-your-pet.jpg"} 
                          alt={center.centerName}
                          className="w-full h-full object-cover"
                        />
                        {center.distance && (
                          <div className="absolute top-2 right-2 bg-primary text-white text-sm px-2 py-1 rounded-md">
                            {center.distance.toFixed(1)} km away
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-medium text-gray-900">{center.centerName}</h3>
                          
                          {/* Display rating if available */}
                          {centersRatings[center.id] && (
                            <RatingDisplay 
                              rating={centersRatings[center.id].avgRating} 
                              reviewCount={centersRatings[center.id].count}
                              size="small"
                            />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-500 mt-1">
                          {locationNames[center.id] || center.city || 'Location not specified'}
                        </p>
                        
                        <p className="text-sm font-medium text-primary mt-2">
                          ₹{center.perDayCharge || center.pricePerDay || 0}/day
                        </p>
                        
                        <div className="mt-3">
                          {center.petTypes && center.petTypes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {center.petTypes.map(petType => (
                                <span
                                  key={petType}
                                  className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full"
                                >
                                  {petType}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <Link
                          to={`/services/boarding/${center.id}`}
                          className="mt-4 w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                        >
                          View Details
                        </Link>
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
                        <div className="relative h-48">
                          <img 
                            src={center.galleryImageURLs?.[0] || "https://doggyvilleindia.in/wp-content/uploads/2024/09/how-to-choose-the-best-dog-boarding-facility-for-your-pet.jpg"} 
                            alt={center.centerName}
                            className="w-full h-full object-cover"
                          />
                          {center.distance && (
                            <div className="absolute top-2 right-2 bg-primary text-white text-sm px-2 py-1 rounded-md">
                              {center.distance.toFixed(1)} km away
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <h3 className="text-lg font-medium text-gray-900">{center.centerName}</h3>
                            
                            {/* Display rating if available */}
                            {centersRatings[center.id] && (
                              <RatingDisplay 
                                rating={centersRatings[center.id].avgRating} 
                                reviewCount={centersRatings[center.id].count}
                                size="small"
                              />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-500 mt-1">
                            {locationNames[center.id] || center.city || 'Location not specified'}
                          </p>
                          
                          <p className="text-sm font-medium text-primary mt-2">
                            ₹{center.perDayCharge || center.pricePerDay || 0}/day
                          </p>
                          
                          <div className="mt-3">
                            {center.petTypes && center.petTypes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {center.petTypes.map(petType => (
                                  <span
                                    key={petType}
                                    className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full"
                                  >
                                    {petType}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <Link
                            to={`/services/boarding/${center.id}`}
                            className="mt-4 w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                          >
                            View Details
                          </Link>
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
                        <div className="relative h-48">
                          <img 
                            src={center.galleryImageURLs?.[0] || "https://doggyvilleindia.in/wp-content/uploads/2024/09/how-to-choose-the-best-dog-boarding-facility-for-your-pet.jpg"} 
                            alt={center.centerName}
                            className="w-full h-full object-cover"
                          />
                          {center.distance && (
                            <div className="absolute top-2 right-2 bg-primary text-white text-sm px-2 py-1 rounded-md">
                              {center.distance.toFixed(1)} km away
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <h3 className="text-lg font-medium text-gray-900">{center.centerName}</h3>
                            
                            {/* Display rating if available */}
                            {centersRatings[center.id] && (
                              <RatingDisplay 
                                rating={centersRatings[center.id].avgRating} 
                                reviewCount={centersRatings[center.id].count}
                                size="small"
                              />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-500 mt-1">
                            {locationNames[center.id] || center.city || 'Location not specified'}
                          </p>
                          
                          <p className="text-sm font-medium text-primary mt-2">
                            ₹{center.perDayCharge || center.pricePerDay || 0}/day
                          </p>
                          
                          <div className="mt-3">
                            {center.petTypes && center.petTypes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {center.petTypes.map(petType => (
                                  <span
                                    key={petType}
                                    className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full"
                                  >
                                    {petType}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <Link
                            to={`/services/boarding/${center.id}`}
                            className="mt-4 w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                          >
                            View Details
                          </Link>
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
                        <div className="relative h-48">
                          <img 
                            src={center.galleryImageURLs?.[0] || "https://doggyvilleindia.in/wp-content/uploads/2024/09/how-to-choose-the-best-dog-boarding-facility-for-your-pet.jpg"} 
                            alt={center.centerName}
                            className="w-full h-full object-cover"
                          />
                          {center.distance && (
                            <div className="absolute top-2 right-2 bg-primary text-white text-sm px-2 py-1 rounded-md">
                              {center.distance.toFixed(1)} km away
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <h3 className="text-lg font-medium text-gray-900">{center.centerName}</h3>
                            
                            {/* Display rating if available */}
                            {centersRatings[center.id] && (
                              <RatingDisplay 
                                rating={centersRatings[center.id].avgRating} 
                                reviewCount={centersRatings[center.id].count}
                                size="small"
                              />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-500 mt-1">
                            {locationNames[center.id] || center.city || 'Location not specified'}
                          </p>
                          
                          <p className="text-sm font-medium text-primary mt-2">
                            ₹{center.perDayCharge || center.pricePerDay || 0}/day
                          </p>
                          
                          <div className="mt-3">
                            {center.petTypes && center.petTypes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {center.petTypes.map(petType => (
                                  <span
                                    key={petType}
                                    className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full"
                                  >
                                    {petType}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <Link
                            to={`/services/boarding/${center.id}`}
                            className="mt-4 w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                          >
                            View Details
                          </Link>
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
                {getCurrentPageCenters(filteredCenters, currentPage, centersPerPage).map((center) => (
                  <div
                    key={center.id}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition duration-300"
                  >
                    <div className="h-48 overflow-hidden bg-gray-200 relative">
                      {center.galleryImageURLs && center.galleryImageURLs.length > 0 ? (
                        <img 
                          src={center.galleryImageURLs[0]} 
                          alt={center.centerName} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/400x300?text=No+Image";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <p className="text-gray-400">No image available</p>
                        </div>
                      )}
                      
                      {center.distance !== undefined && (
                        <div className="absolute top-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded-md text-sm font-medium text-gray-700">
                          {center.distance.toFixed(1)} km away
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-medium text-gray-900">{center.centerName}</h3>
                        
                        {/* Display rating if available */}
                        {centersRatings[center.id] && (
                          <RatingDisplay 
                            rating={centersRatings[center.id].avgRating} 
                            reviewCount={centersRatings[center.id].count}
                            size="small"
                          />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-1">
                        {locationNames[center.id] || center.city || 'Location not specified'}
                      </p>
                      
                      <p className="text-sm font-medium text-primary mt-2">
                        ₹{center.perDayCharge || center.pricePerDay || 0}/day
                      </p>
                      
                      <div className="mt-3">
                        {center.petTypes && center.petTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {center.petTypes.map(petType => (
                              <span
                                key={petType}
                                className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full"
                              >
                                {petType}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <Link
                        to={`/services/boarding/${center.id}`}
                        className="mt-4 w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                      >
                        View Details
                      </Link>
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
                        key={number + 1}
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
    </div>
  );
};

export default PetBoardingSearch; 