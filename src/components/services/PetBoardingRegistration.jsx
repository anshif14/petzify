import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../firebase/config.js';
import useGoogleMaps from '../../utils/useGoogleMaps';
import { cleanupEventListeners } from '../../utils/mapLoader.js';

const PetBoardingRegistration = () => {
  const [formStep, setFormStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  // Reference to store map-related objects for cleanup
  const mapObjectsRef = useRef({ map: null });
  
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

  // Helper function to extract address components - moved outside useEffect to be globally accessible
  const extractAddressData = (place) => {
    const components = place.address_components;
    let city = '';
    let pincode = '';
    
    if (components) {
      for (const component of components) {
        const types = component.types;
        
        if (types.includes('locality') || types.includes('administrative_area_level_2')) {
          city = component.long_name;
        }
        
        if (types.includes('postal_code')) {
          pincode = component.long_name;
        }
      }
    }
    
    return { city, pincode };
  };

  // Load Google Maps when we reach the location step
  useEffect(() => {
    let map = null;
    let marker = null;
    let autocomplete = null;
    const MAP_API_KEY = 'AIzaSyDs_HDyac8lBXdLnAa8zbDjwf1v-2bFjpI';
    
    // Only load the map when we're on step 2
    if (formStep !== 2 || !mapRef.current) return;
    
    // Function to extract address components from Google Places result
    const extractAddressData = (place) => {
      let city = '';
      let pincode = '';
      
      if (place.address_components) {
        for (const component of place.address_components) {
          if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
            city = component.long_name;
          }
          
          if (component.types.includes('postal_code')) {
            pincode = component.long_name;
          }
        }
      }
      
      return { city, pincode };
    };

    // Load Google Maps script
    const loadGoogleMapsScript = () => {
      // Check if script is already loaded
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }
      
      // Create script element
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAP_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        initializeMap();
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps');
      };
      
      document.head.appendChild(script);
    };
    
    // Initialize map
    const initializeMap = () => {
      if (!window.google || !window.google.maps) return;
      
      // Default location (center of India)
      const defaultLocation = { lat: 20.5937, lng: 78.9629 };
      
      // Create map
      map = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: defaultLocation,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true
      });
      
      // Create marker
      marker = new window.google.maps.Marker({
        position: defaultLocation,
        map: map,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        title: 'Drag to set location'
      });
      
      markerRef.current = marker;
      
      // Add marker drag event
      marker.addListener('dragend', () => {
        const position = marker.getPosition();
        updateLocationFromPosition(position);
      });
      
      // Create autocomplete search box
      const input = document.createElement('input');
      input.placeholder = 'Search for a location';
      input.className = 'map-search-input';
      input.style.margin = '10px';
      input.style.width = '300px';
      input.style.padding = '8px 12px';
      input.style.borderRadius = '4px';
      input.style.border = '1px solid #ccc';
      input.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
      input.style.fontSize = '14px';
      
      map.controls[window.google.maps.ControlPosition.TOP_CENTER].push(input);
      
      // Initialize autocomplete
      autocomplete = new window.google.maps.places.Autocomplete(input);
      autocomplete.bindTo('bounds', map);
      autocompleteRef.current = autocomplete;
      
      // Handle place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (!place.geometry) return;
        
        // Center map on selected place
        if (place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport);
        } else {
          map.setCenter(place.geometry.location);
          map.setZoom(17);
        }
        
        // Update marker position
        marker.setPosition(place.geometry.location);
        
        // Update form data
        const addressData = extractAddressData(place);
        
        setFormData(prevData => ({
          ...prevData,
          address: place.formatted_address,
          city: addressData.city || prevData.city,
          pincode: addressData.pincode || prevData.pincode,
          latitude: place.geometry.location.lat().toString(),
          longitude: place.geometry.location.lng().toString()
        }));
      });
      
      // Add current location button
      const locationButton = document.createElement('button');
      locationButton.innerHTML = '<img src="https://maps.google.com/mapfiles/ms/icons/blue-dot.png" style="width:20px;height:20px;" alt="My Location" />';
      locationButton.style.marginLeft = '10px';
      locationButton.style.padding = '8px';
      locationButton.style.background = 'white';
      locationButton.style.borderRadius = '4px';
      locationButton.style.border = '1px solid #ccc';
      locationButton.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
      locationButton.style.cursor = 'pointer';
      locationButton.title = 'Use my current location';
      
      // Add click handler for locationButton
      locationButton.addEventListener('click', handleGetCurrentLocation);
      
      // Add location button next to search
      const searchBoxWrapper = document.createElement('div');
      searchBoxWrapper.style.display = 'flex';
      searchBoxWrapper.style.alignItems = 'center';
      searchBoxWrapper.appendChild(input);
      searchBoxWrapper.appendChild(locationButton);
      
      map.controls[window.google.maps.ControlPosition.TOP_CENTER].push(searchBoxWrapper);
    };
    
    // Update location from map marker position
    const updateLocationFromPosition = (position) => {
      // Update latitude/longitude in form
      setFormData(prevData => ({
        ...prevData,
        latitude: position.lat().toString(),
        longitude: position.lng().toString()
      }));
      
      // Reverse geocode to get address
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: position }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const addressData = extractAddressData(results[0]);
          
          setFormData(prevData => ({
            ...prevData,
            address: results[0].formatted_address,
            city: addressData.city || prevData.city,
            pincode: addressData.pincode || prevData.pincode
          }));
        }
      });
    };
    
    // Load the map
    loadGoogleMapsScript();
    
    // Cleanup function
    return () => {
      if (marker && window.google && window.google.maps) {
        window.google.maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
      }
      
      if (autocomplete && window.google && window.google.maps) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [formStep]);

  // Handle getting current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please enter your location manually.');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Update map and marker
        if (markerRef.current && window.google && window.google.maps) {
          const location = new window.google.maps.LatLng(lat, lng);
          const marker = markerRef.current;
          marker.setPosition(location);
          
          const map = marker.getMap();
          map.setCenter(location);
          map.setZoom(17);
          
          // Reverse geocode to get address
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const addressComponents = results[0].address_components;
              let city = '';
              let pincode = '';
              
              for (const component of addressComponents) {
                if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
                  city = component.long_name;
                }
                
                if (component.types.includes('postal_code')) {
                  pincode = component.long_name;
                }
              }
              
              setFormData(prevData => ({
                ...prevData,
                address: results[0].formatted_address,
                city: city || prevData.city,
                pincode: pincode || prevData.pincode,
                latitude: lat.toString(),
                longitude: lng.toString()
              }));
            }
          });
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your current location. Please enter it manually.');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
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
      // Add document to Firestore (simplified)
      const docRef = await addDoc(collection(db, 'petBoardingCenters'), {
        ...formData,
        createdAt: serverTimestamp(),
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
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Your address will update automatically when you select a location on the map"
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
                  Search for a location, use your current location, or drag the marker to set the exact spot
                </span>
              </div>
              <div 
                ref={mapRef} 
                className="w-full h-80 rounded-md border border-gray-300 bg-gray-100 shadow-inner"
                style={{ minHeight: '300px' }}
              ></div>
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
        
        {/* Placeholder for other steps */}
        {formStep > 2 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">
              {formStep === 3 && "📅 Availability & Services"}
              {formStep === 4 && "💰 Pricing"}
              {formStep === 5 && "📸 Gallery & Final Details"}
            </h3>
            
            <p className="text-gray-600">This step will be implemented later.</p>
            
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