import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config.js';
import useGoogleMaps from '../../utils/useGoogleMaps';

const PetBoardingSearch = () => {
  const [searchParams, setSearchParams] = useState({
    location: '',
    petType: '',
    petSize: '',
    dateFrom: '',
    dateTo: '',
  });
  
  const [boardingCenters, setBoardingCenters] = useState([]);
  const [filteredCenters, setFilteredCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const mapScriptId = 'google-maps-script';
  
  // Use our custom hook for Google Maps
  const { isLoaded, loadMap } = useGoogleMaps();
  
  // Add state to track elements for cleanup
  const [cleanupInfo, setCleanupInfo] = useState({ elements: [], listeners: [] });
  
  // Global reference to store map objects
  const mapObjectsRef = useRef({ marker: null, infoWindow: null, map: null });
  
  useEffect(() => {
    const fetchBoardingCenters = async () => {
      try {
        // Only fetch approved centers
        const q = query(
          collection(db, 'petBoardingCenters'),
          where('status', '==', 'approved')
        );
        
        const snapshot = await getDocs(q);
        const centers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setBoardingCenters(centers);
        setFilteredCenters(centers);
      } catch (err) {
        console.error('Error fetching boarding centers:', err);
        setError('Failed to load boarding centers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBoardingCenters();
  }, []);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams({
      ...searchParams,
      [name]: value
    });
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    
    // Filter the centers based on search params
    const filtered = boardingCenters.filter(center => {
      // Location filter (city or pincode)
      const locationMatch = 
        !searchParams.location || 
        center.city.toLowerCase().includes(searchParams.location.toLowerCase()) || 
        center.pincode.includes(searchParams.location);
      
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
    
    setFilteredCenters(filtered);
  };
  
  const handleCenterSelect = (center) => {
    setSelectedCenter(center);
  };
  
  const handleViewDetails = (center) => {
    // For now just select the center, but this could navigate to a details page
    setSelectedCenter(center);
  };
  
  const closeDetails = () => {
    setSelectedCenter(null);
  };

  const initializeDetailMap = () => {
    if (!selectedCenter || !selectedCenter.latitude || !selectedCenter.longitude) {
      console.log('No center selected or missing location data');
      return;
    }

    console.log('Initializing detail map for:', selectedCenter.centerName);
    console.log('Location data:', selectedCenter.latitude, selectedCenter.longitude);
    
    const mapContainer = document.getElementById('detailMapContainer');
    if (!mapContainer) {
      console.log('Map container element not found');
      return;
    }
    
    try {
      const center = { 
        lat: parseFloat(selectedCenter.latitude), 
        lng: parseFloat(selectedCenter.longitude) 
      };
      
      console.log('Map center:', center);
      
      const mapOptions = {
        center: center,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      };
      
      // Create a new map and save it to the ref
      const map = new window.google.maps.Map(mapContainer, mapOptions);
      mapObjectsRef.current.map = map;
      
      // Add a marker for the boarding center
      const marker = new window.google.maps.Marker({
        position: center,
        map: map,
        title: selectedCenter.centerName,
        animation: window.google.maps.Animation.DROP
      });
      
      mapObjectsRef.current.marker = marker;
      
      console.log('Map and marker created successfully');
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const loadDetailMap = useCallback(() => {
    if (!selectedCenter) return;
    
    const mapScriptId = 'google-maps-script';
    const existingScript = document.getElementById(mapScriptId);
    
    const handleScriptLoad = () => {
      initializeDetailMap();
      setMapLoaded(true);
    };

    if (existingScript) {
      // Script already exists, add a load event listener
      if (window.google && window.google.maps) {
        // Maps API already loaded
        initializeDetailMap();
        setMapLoaded(true);
      } else {
        // API script is there but not loaded yet
        existingScript.addEventListener('load', handleScriptLoad);
      }
    } else {
      // No script exists, create and append it
      const script = document.createElement('script');
      script.id = mapScriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDs_HDyac8lBXdLnAa8zbDjwf1v-2bFjpI&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.addEventListener('load', handleScriptLoad);
      document.head.appendChild(script);
    }
    
    // Cleanup function
    return () => {
      const script = document.getElementById(mapScriptId);
      if (script) {
        script.removeEventListener('load', handleScriptLoad);
      }
      
      // Clear any map listeners if map exists
      if (window.google && mapObjectsRef.current.map) {
        window.google.maps.event.clearInstanceListeners(mapObjectsRef.current.map);
      }
    };
  }, [selectedCenter]);

  // Function to view center details
  const viewCenterDetails = (center) => {
    setSelectedCenter(center);
    setShowModal(true);
  };

  // Load map when selected center changes and modal is shown
  useEffect(() => {
    let cleanup = null;
    if (selectedCenter && showModal) {
      cleanup = loadDetailMap();
    }
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [selectedCenter, showModal, loadDetailMap]);

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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={searchParams.location}
              onChange={handleInputChange}
              placeholder="City or Pincode"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            />
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              name="dateFrom"
              value={searchParams.dateFrom}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            />
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
      
      {/* Results */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Results ({filteredCenters.length})</h3>
        
        {filteredCenters.length === 0 ? (
          <div className="bg-gray-50 p-6 rounded-lg text-center">
            <p className="text-gray-600">No boarding centers found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCenters.map(center => (
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
        )}
      </div>
      
      {/* Detail Modal */}
      {showModal && selectedCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-90vh overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-indigo-700">{selectedCenter.centerName}</h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Center Details */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2 text-indigo-600">Location</h3>
                    <p className="text-gray-700 mb-1">{selectedCenter.address}</p>
                    <p className="text-gray-700">
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedCenter.latitude},${selectedCenter.longitude}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Get Directions
                      </a>
                    </p>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2 text-indigo-600">Contact</h3>
                    <p className="text-gray-700 mb-1">Phone: {selectedCenter.phoneNumber}</p>
                    <p className="text-gray-700">Email: {selectedCenter.email}</p>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2 text-indigo-600">Hours</h3>
                    <div className="grid grid-cols-2 gap-1">
                      {selectedCenter.operatingDays && Object.entries(selectedCenter.operatingDays).map(([day, isOpen]) => (
                        <p key={day} className="text-gray-700 flex justify-between">
                          <span className="capitalize">{day}:</span>
                          <span className={isOpen ? "text-green-600" : "text-red-500"}>
                            {isOpen ? 
                             `${selectedCenter.openingTime || '9:00'} - ${selectedCenter.closingTime || '18:00'}` : 
                             'Closed'}
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2 text-indigo-600">Pet Details</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCenter.petTypesAccepted && Object.entries(selectedCenter.petTypesAccepted)
                        .filter(([_, accepted]) => accepted)
                        .map(([type]) => (
                          <span key={type} className="bg-indigo-100 text-indigo-800 py-1 px-3 rounded-full text-sm capitalize">
                            {type}
                          </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2 text-indigo-600">Services</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCenter.servicesOffered && Object.entries(selectedCenter.servicesOffered)
                        .filter(([_, offered]) => offered)
                        .map(([service]) => (
                          <span key={service} className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-sm capitalize">
                            {service === 'vetAssistance' ? 'Vet Assistance' : 
                             service === 'liveUpdates' ? 'Live Updates' : 
                             service === 'playArea' ? 'Play Area' : service}
                          </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2 text-indigo-600">Charge</h3>
                    <p className="text-xl font-bold text-indigo-700">₹{selectedCenter.perDayCharge} <span className="text-sm font-normal text-gray-600">per day</span></p>
                  </div>
                </div>
                
                {/* Map Section */}
                <div>
                  <div 
                    id="detailMapContainer"
                    ref={mapContainerRef}
                    className="w-full h-96 rounded-lg shadow-md mb-4 relative bg-gray-100"
                  >
                    {!mapLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
                        <span className="ml-2 text-gray-600">Loading map...</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        window.open(`tel:${selectedCenter.phoneNumber}`);
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-medium transition duration-300"
                    >
                      Call Center
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetBoardingSearch; 