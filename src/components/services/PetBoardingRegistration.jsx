import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../firebase/config.js';
import useGoogleMaps from '../../utils/useGoogleMaps';
import { cleanupEventListeners } from '../../utils/mapLoader';

const PetBoardingRegistration = () => {
  const [formStep, setFormStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geolocationError, setGeolocationError] = useState(null);
  const [placesLoaded, setPlacesLoaded] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const mapScriptId = 'google-maps-script';
  
  const [formData, setFormData] = useState({
    // Boarding Center Info
    centerName: '',
    ownerName: '',
    phoneNumber: '',
    email: '',
    profilePicture: null,
    profilePictureURL: '',
    website: '',
    
    // Location
    address: '',
    city: '',
    pincode: '',
    latitude: '',
    longitude: '',
    
    // Availability & Timings
    operatingDays: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    },
    openingTime: '',
    closingTime: '',
    holidayNotice: '',
    
    // Pet-related Details
    petTypesAccepted: {
      dog: false,
      cat: false,
      rabbit: false,
      bird: false,
      other: false
    },
    petSizeLimit: [],
    capacity: '',
    petAgeLimit: '',
    
    // Services Offered
    servicesOffered: {
      boarding: false,
      food: false,
      playArea: false,
      grooming: false,
      vetAssistance: false,
      liveUpdates: false
    },
    
    // Pricing
    perDayCharge: '',
    discounts: '',
    
    // Gallery
    galleryImages: [],
    galleryImageURLs: [],
    
    // Other Preferences
    vaccinationRequired: false,
    petFoodProvided: false,
    pickupDropAvailable: false,
    idProof: null,
    idProofURL: '',
    licenseNumber: '',
    
    // Status for admin approval
    status: 'pending',
    createdAt: null
  });

  // Use our custom hook for Google Maps
  const { isLoaded, loadError, loadMap } = useGoogleMaps(['places']);
  
  // Helper function to extract address components from geocoding results
  const extractAddressData = (place) => {
    let city = '';
    let pincode = '';
    
    if (place.address_components) {
      for (const component of place.address_components) {
        const componentType = component.types[0];
        
        switch (componentType) {
          case 'locality':
            city = component.long_name;
            break;
          case 'administrative_area_level_2':
            // If city is not found in locality, use district as fallback
            if (!city) city = component.long_name;
            break;
          case 'postal_code':
            pincode = component.long_name;
            break;
        }
      }
    }
    
    return { city, pincode };
  };

  // Function to load the Google Maps script
  const loadGoogleMapsScript = () => {
    // Check if script already exists
    const existingScript = document.getElementById(mapScriptId);
    
    if (window.google && window.google.maps) {
      // Google Maps API is already loaded
      setMapLoaded(true);
      if (window.google.maps.places) {
        setPlacesLoaded(true);
        initializeMap();
      }
    } else if (existingScript) {
      // Script exists but may not be loaded yet
      if (existingScript.getAttribute('data-loaded') === 'true') {
        setMapLoaded(true);
        if (window.google.maps.places) {
          setPlacesLoaded(true);
          initializeMap();
        }
      } else {
        // Add load listener if not already loaded
        const loadHandler = () => {
          existingScript.setAttribute('data-loaded', 'true');
          setMapLoaded(true);
          if (window.google.maps.places) {
            setPlacesLoaded(true);
            initializeMap();
          }
        };
        existingScript.addEventListener('load', loadHandler);
        // Store the handler to clean up later
        existingScript.loadHandler = loadHandler;
      }
    } else {
      // Script doesn't exist, create and append it
      const script = document.createElement('script');
      script.id = mapScriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDs_HDyac8lBXdLnAa8zbDjwf1v-2bFjpI&libraries=places`;
      script.async = true;
      script.defer = true;
      
      const loadHandler = () => {
        script.setAttribute('data-loaded', 'true');
        setMapLoaded(true);
        if (window.google.maps.places) {
          setPlacesLoaded(true);
          initializeMap();
        }
      };
      
      script.addEventListener('load', loadHandler);
      // Store the handler to clean up later
      script.loadHandler = loadHandler;
      
      document.head.appendChild(script);
    }
  };

  // Function to initialize the map
  const initializeMap = () => {
    if (!mapContainerRef.current || !window.google || !window.google.maps) return;
    
    try {
      // Default location (India center)
      const defaultLocation = { lat: 20.5937, lng: 78.9629 };
      
      // Get location from form data if available
      const locationFromForm = formData.latitude && formData.longitude
        ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }
        : defaultLocation;
      
      // Create map instance
      const mapOptions = {
        center: locationFromForm,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      };
      
      const mapInstance = new window.google.maps.Map(mapContainerRef.current, mapOptions);
      mapInstanceRef.current = mapInstance;
      
      // Add marker for the selected location
      const marker = new window.google.maps.Marker({
        position: locationFromForm,
        map: mapInstance,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
      });
      markerRef.current = marker;
      
      // Update form data when marker is dragged
      marker.addListener('dragend', () => {
        const position = marker.getPosition();
        const lat = position.lat();
        const lng = position.lng();
        
        // Update form data with new coordinates
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        
        // Reverse geocode to get address
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setFormData(prev => ({
              ...prev,
              address: results[0].formatted_address
            }));
          }
        });
      });
      
      // Initialize Places autocomplete for address input
      if (window.google.maps.places) {
        const options = {
          componentRestrictions: { country: 'in' },
          fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        };
        
        const addressInput = document.getElementById('address');
        if (addressInput) {
          const autocomplete = new window.google.maps.places.Autocomplete(addressInput, options);
          autocompleteRef.current = autocomplete;
          
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            
            if (!place.geometry || !place.geometry.location) {
              console.log('No details available for the place');
              return;
            }
            
            // Update map and marker
            mapInstance.setCenter(place.geometry.location);
            marker.setPosition(place.geometry.location);
            
            // Update form data
            setFormData(prev => ({
              ...prev,
              address: place.formatted_address,
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng()
            }));
          });
        }
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  // Load Google Maps when component mounts
  useEffect(() => {
    loadGoogleMapsScript();
    
    // Clean up function
    return () => {
      // Don't remove the script, just remove event listeners
      const script = document.getElementById(mapScriptId);
      if (script && script.loadHandler) {
        script.removeEventListener('load', script.loadHandler);
      }
      
      // Clean up any Google Maps listeners
      if (markerRef.current && window.google && window.google.maps) {
        window.google.maps.event.clearInstanceListeners(markerRef.current);
      }
      
      if (autocompleteRef.current && window.google && window.google.maps) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  // Updated current location handler
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Update map and marker if loaded
          if (mapLoaded && markerRef.current) {
            const location = new window.google.maps.LatLng(lat, lng);
            markerRef.current.setPosition(location);
            const map = markerRef.current.getMap();
            map.setCenter(location);
            map.setZoom(17); // Zoom in when using current location
            
            // Update form data based on the marker position
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location }, (results, status) => {
              if (status === 'OK' && results[0]) {
                // Set the complete form data at once to avoid multiple re-renders
                const addressData = extractAddressData(results[0]);
                
                setFormData(prevData => ({
                  ...prevData,
                  address: results[0].formatted_address,
                  city: addressData.city || prevData.city,
                  pincode: addressData.pincode || prevData.pincode,
                  latitude: lat.toString(),
                  longitude: lng.toString()
                }));
              }
            });
          } else {
            // Just update coordinates if map is not loaded yet
            setFormData(prevData => ({
              ...prevData,
              latitude: lat.toString(),
              longitude: lng.toString()
            }));
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location. Please enter it manually.');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      alert('Geolocation is not supported by your browser. Please enter your location manually.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleCheckboxChange = (category, item) => {
    setFormData({
      ...formData,
      [category]: {
        ...formData[category],
        [item]: !formData[category][item]
      }
    });
  };

  const handleMultiSelectChange = (item) => {
    const updatedSizes = [...formData.petSizeLimit];
    
    if (updatedSizes.includes(item)) {
      const index = updatedSizes.indexOf(item);
      updatedSizes.splice(index, 1);
    } else {
      updatedSizes.push(item);
    }
    
    setFormData({
      ...formData,
      petSizeLimit: updatedSizes
    });
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        [field]: file,
        [`${field}URL`]: URL.createObjectURL(file)
      });
    }
  };

  const handleGalleryImages = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newImageURLs = files.map(file => URL.createObjectURL(file));
      
      setFormData({
        ...formData,
        galleryImages: [...formData.galleryImages, ...files],
        galleryImageURLs: [...formData.galleryImageURLs, ...newImageURLs]
      });
    }
  };

  const nextStep = () => {
    setFormStep(formStep + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setFormStep(formStep - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Upload image files and get URLs here
      // For demo, we'll skip the actual uploading
      
      // Add document to Firestore
      const docRef = await addDoc(collection(db, 'petBoardingCenters'), {
        ...formData,
        createdAt: serverTimestamp(),
        profilePictureURL: "https://example.com/placeholder.jpg", // Replace with actual upload
        idProofURL: "https://example.com/placeholder.jpg", // Replace with actual upload
        galleryImageURLs: ["https://example.com/placeholder1.jpg", "https://example.com/placeholder2.jpg"], // Replace with actual uploads
      });
      
      console.log("Document written with ID: ", docRef.id);
      setSuccess(true);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Error adding document: ", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md my-10">
        <div className="text-center py-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-6">
            <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Registration Submitted!</h2>
          <p className="text-lg text-gray-600 mb-8">
            Thank you for registering your pet boarding service. Our team will review your submission and get back to you shortly.
          </p>
          <button
            onClick={() => window.location.href = '/services'}
            className="inline-flex justify-center rounded-md bg-primary px-4 py-2 text-md font-semibold text-white hover:bg-primary-dark"
          >
            Return to Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md my-10">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Pet Boarding Center Registration</h2>
      
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 flex items-center justify-center rounded-full ${formStep >= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                {step}
              </div>
              <span className="text-xs mt-2 text-gray-600">
                {step === 1 && "Basic Info"}
                {step === 2 && "Location"}
                {step === 3 && "Services"}
                {step === 4 && "Pricing"}
                {step === 5 && "Gallery"}
              </span>
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 h-2 rounded-full">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(formStep / 5) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* Step 1: Basic Info */}
        {formStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">🏢 Boarding Center Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Center Name*</label>
              <input
                type="text"
                name="centerName"
                required
                value={formData.centerName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name*</label>
              <input
                type="text"
                name="ownerName"
                required
                value={formData.ownerName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number*</label>
              <input
                type="tel"
                name="phoneNumber"
                required
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address*</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture / Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'profilePicture')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
              {formData.profilePictureURL && (
                <div className="mt-2">
                  <img 
                    src={formData.profilePictureURL} 
                    alt="Profile Preview" 
                    className="h-20 w-20 object-cover rounded-md"
                  />
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website / Social Media Links (optional)</label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="https://"
              />
            </div>
            
            <div className="flex justify-end mt-8">
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Step 2: Location */}
        {formStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">📍 Location</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Address*</label>
              <div className="relative">
                <textarea
                  id="boardingAddress"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Your address will update automatically when you select a location on the map"
                  readOnly
                ></textarea>
                <div className="mt-1 text-sm text-gray-500">
                  Use the map below to select your location or search for an address
                </div>
              </div>
            </div>
            
            {/* Map container */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Your Location
              </label>
              <div className="mb-2 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-gray-600">
                  You can search for a location, use your current location, or drag the marker to set the exact spot
                </span>
              </div>
              
              {geolocationError ? (
                <div className="bg-red-50 p-6 rounded-md text-center">
                  <div className="text-red-600 text-sm mb-3">{geolocationError}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setGeolocationError(null);
                      loadMap(true).then(() => {
                        console.log("Retrying map initialization");
                      });
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry Loading Map
                  </button>
                </div>
              ) : (
                <div 
                  ref={mapContainerRef} 
                  className="w-full h-80 rounded-md border border-gray-300 bg-gray-100 shadow-inner"
                  style={{ minHeight: '300px' }}
                >
                  {!mapLoaded && (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
                      <span className="text-gray-600 text-center">Loading map...</span>
                      <span className="text-gray-500 text-sm mt-2">This may take a few moments</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City / District*</label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode / Postal Code*</label>
                <input
                  type="text"
                  name="pincode"
                  required
                  value={formData.pincode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary bg-gray-50"
                  placeholder="Auto-fetched"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary bg-gray-50"
                  placeholder="Auto-fetched"
                  readOnly
                />
              </div>
            </div>
            
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Additional steps will be implemented in the other files */}
        
        {/* This is just a placeholder for testing navigation */}
        {formStep > 2 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">
              {formStep === 3 && "📅 Availability & Services"}
              {formStep === 4 && "💰 Pricing"}
              {formStep === 5 && "📸 Gallery & Final Details"}
            </h3>
            
            <p className="text-gray-600">This step will be implemented in separate files.</p>
            
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Previous
              </button>
              {formStep < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Registration'}
                </button>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default PetBoardingRegistration; 