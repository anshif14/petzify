import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config.js';
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
    description: '',
    
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
    console.log('Form submission triggered', formData);
    
    // Basic validation check
    if (formStep !== 5) {
      alert("Please complete all steps before submitting");
      return;
    }
    
    // Required fields check for last step
    if (!formData.perDayCharge) {
      alert("Please enter a per day charge");
      return;
    }
    
    setSubmitting(true);
    
    try {
      console.log('Preparing to upload images and submit data');
      
      // Array to store all upload promises
      const uploadPromises = [];
      let profilePictureURL = '';
      let idProofURL = '';
      const galleryImageURLs = [];
      
      // Upload profile picture if it exists
      if (formData.profilePicture) {
        const profilePictureRef = ref(storage, `boarding-centers/${Date.now()}_${formData.profilePicture.name}`);
        const profileUploadPromise = uploadBytes(profilePictureRef, formData.profilePicture)
          .then(snapshot => getDownloadURL(snapshot.ref))
          .then(url => {
            profilePictureURL = url;
            console.log('Profile picture uploaded:', url);
          });
        
        uploadPromises.push(profileUploadPromise);
      }
      
      // Upload ID proof if it exists
      if (formData.idProof) {
        const idProofRef = ref(storage, `boarding-centers/documents/${Date.now()}_${formData.idProof.name}`);
        const idProofUploadPromise = uploadBytes(idProofRef, formData.idProof)
          .then(snapshot => getDownloadURL(snapshot.ref))
          .then(url => {
            idProofURL = url;
            console.log('ID proof uploaded:', url);
          });
        
        uploadPromises.push(idProofUploadPromise);
      }
      
      // Upload gallery images if they exist
      if (formData.galleryImages && formData.galleryImages.length > 0) {
        const galleryUploadPromises = formData.galleryImages.map((image, index) => {
          const galleryRef = ref(storage, `boarding-centers/gallery/${Date.now()}_${index}_${image.name}`);
          return uploadBytes(galleryRef, image)
            .then(snapshot => getDownloadURL(snapshot.ref))
            .then(url => {
              galleryImageURLs.push(url);
              console.log(`Gallery image ${index + 1} uploaded:`, url);
            });
        });
        
        uploadPromises.push(...galleryUploadPromises);
      }
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      console.log('All uploads completed. Submitting to Firestore');
      
      // Prepare Firestore data with the uploaded URLs
      const firestoreData = {
        ...formData,
        // Replace File objects with URLs
        profilePicture: null,
        profilePictureURL: profilePictureURL,
        idProof: null,
        idProofURL: idProofURL,
        galleryImages: [],
        galleryImageURLs: galleryImageURLs,
        status: 'pending',
        createdAt: serverTimestamp(),
      };
      
      // Add document to Firestore
      const docRef = await addDoc(collection(db, 'petBoardingCenters'), firestoreData);
      
      console.log("Document written with ID: ", docRef.id);
      setSuccess(true);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Error during submission: ", error);
      alert(`Error submitting form: ${error.message}`);
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
              <textarea
                name="description"
                required
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                placeholder="Describe your boarding center, its unique features, and what makes it special for pet owners..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              ></textarea>
              <p className="mt-1 text-xs text-gray-500">Provide a detailed description of your facility, amenities, and what makes your services unique.</p>
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
        
        {/* Step 3: Availability & Services */}
        {formStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">📅 Availability & Services</h3>
            
            {/* Operating Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Operating Days*</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.keys(formData.operatingDays).map((day) => (
                  <div key={day} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`day-${day}`}
                      checked={formData.operatingDays[day]}
                      onChange={() => {
                        setFormData({
                          ...formData,
                          operatingDays: {
                            ...formData.operatingDays,
                            [day]: !formData.operatingDays[day]
                          }
                        });
                      }}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor={`day-${day}`} className="ml-2 block text-sm text-gray-700 capitalize">
                      {day}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Operating Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time*</label>
                <input
                  type="time"
                  name="openingTime"
                  required
                  value={formData.openingTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time*</label>
                <input
                  type="time"
                  name="closingTime"
                  required
                  value={formData.closingTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            
            {/* Holiday Notice */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Notice (optional)</label>
              <textarea
                name="holidayNotice"
                value={formData.holidayNotice}
                onChange={handleInputChange}
                placeholder="Specify any upcoming holidays or special closing days"
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              ></textarea>
            </div>
            
            <hr className="my-6" />
            
            <h4 className="text-lg font-medium text-gray-800">🐾 Pet Details</h4>
            
            {/* Pet Types Accepted */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pet Types Accepted*</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.keys(formData.petTypesAccepted).map((petType) => (
                  <div key={petType} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`pet-${petType}`}
                      checked={formData.petTypesAccepted[petType]}
                      onChange={() => {
                        setFormData({
                          ...formData,
                          petTypesAccepted: {
                            ...formData.petTypesAccepted,
                            [petType]: !formData.petTypesAccepted[petType]
                          }
                        });
                      }}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor={`pet-${petType}`} className="ml-2 block text-sm text-gray-700 capitalize">
                      {petType}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Pet Size Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pet Size Limit</label>
              <div className="flex flex-wrap gap-2">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      const updatedSizes = formData.petSizeLimit.includes(size)
                        ? formData.petSizeLimit.filter(s => s !== size)
                        : [...formData.petSizeLimit, size];
                      
                      setFormData({
                        ...formData,
                        petSizeLimit: updatedSizes
                      });
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      formData.petSizeLimit.includes(size)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">Select all sizes that you accept</p>
            </div>
            
            {/* Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                placeholder="How many pets can you accommodate at once?"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            {/* Pet Age Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pet Age Limit (optional)</label>
              <input
                type="text"
                name="petAgeLimit"
                value={formData.petAgeLimit}
                onChange={handleInputChange}
                placeholder="e.g. Minimum 3 months, Maximum 12 years"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            <hr className="my-6" />
            
            <h4 className="text-lg font-medium text-gray-800">🛎️ Services Offered</h4>
            
            {/* Services Offered */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Services</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.keys(formData.servicesOffered).map((service) => (
                  <div key={service} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`service-${service}`}
                      checked={formData.servicesOffered[service]}
                      onChange={() => {
                        setFormData({
                          ...formData,
                          servicesOffered: {
                            ...formData.servicesOffered,
                            [service]: !formData.servicesOffered[service]
                          }
                        });
                      }}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor={`service-${service}`} className="ml-2 block text-sm text-gray-700">
                      {service === 'boarding' && 'Boarding / Accommodation'}
                      {service === 'food' && 'Food Included'}
                      {service === 'playArea' && 'Play Area / Regular Walks'}
                      {service === 'grooming' && 'Grooming Services'}
                      {service === 'vetAssistance' && 'Veterinary Assistance'}
                      {service === 'liveUpdates' && 'Live Updates / CCTV Access'}
                    </label>
                  </div>
                ))}
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
        
        {/* Step 4: Pricing */}
        {formStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">💰 Pricing</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per Day Charge (₹)*</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="perDayCharge"
                  required
                  value={formData.perDayCharge}
                  onChange={handleInputChange}
                  min="0"
                  step="50"
                  placeholder="0"
                  className="focus:ring-primary focus:border-primary block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">per day</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500">Set a reasonable price that reflects the quality of your services</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discounts / Packages (optional)</label>
              <textarea
                name="discounts"
                value={formData.discounts}
                onChange={handleInputChange}
                rows="3"
                placeholder="Describe any special offers, packages, or discounts you provide (e.g. 10% off for stays longer than 5 days, package deals, etc.)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              ></textarea>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Pricing Tips</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Research competitors in your area to set competitive prices</li>
                      <li>Consider offering discounts for long-term stays</li>
                      <li>Be transparent about additional charges if any</li>
                    </ul>
                  </div>
                </div>
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
        
        {/* Step 5: Gallery & Final Details */}
        {formStep === 5 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800">📸 Gallery & Final Details</h3>
            
            {/* Gallery Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Photos of Your Facility</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="gallery-images" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none">
                      <span>Upload images</span>
                      <input 
                        id="gallery-images" 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="sr-only" 
                        onChange={(e) => {
                          const files = Array.from(e.target.files);
                          if (files.length > 0) {
                            const newImageURLs = files.map(file => URL.createObjectURL(file));
                            
                            setFormData({
                              ...formData,
                              galleryImages: [...formData.galleryImages, ...files],
                              galleryImageURLs: [...formData.galleryImageURLs, ...newImageURLs]
                            });
                          }
                        }}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB each
                  </p>
                </div>
              </div>
              {formData.galleryImageURLs.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {formData.galleryImageURLs.map((url, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={url} 
                        alt={`Gallery ${index + 1}`} 
                        className="h-24 w-full object-cover rounded-md border border-gray-300"
                      />
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md"
                        onClick={() => {
                          // Remove this image from the gallery
                          const newGalleryImages = [...formData.galleryImages];
                          const newGalleryImageURLs = [...formData.galleryImageURLs];
                          
                          newGalleryImages.splice(index, 1);
                          newGalleryImageURLs.splice(index, 1);
                          
                          setFormData({
                            ...formData,
                            galleryImages: newGalleryImages,
                            galleryImageURLs: newGalleryImageURLs
                          });
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <hr className="my-6" />
            
            <h4 className="text-lg font-medium text-gray-800">🔖 Additional Requirements</h4>
            
            {/* Additional Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="vaccinationRequired"
                  checked={formData.vaccinationRequired}
                  onChange={() => setFormData({
                    ...formData,
                    vaccinationRequired: !formData.vaccinationRequired
                  })}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="vaccinationRequired" className="ml-2 block text-sm text-gray-700">
                  Require vaccination proof for pets
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="petFoodProvided"
                  checked={formData.petFoodProvided}
                  onChange={() => setFormData({
                    ...formData,
                    petFoodProvided: !formData.petFoodProvided
                  })}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="petFoodProvided" className="ml-2 block text-sm text-gray-700">
                  Pet food provided
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pickupDropAvailable"
                  checked={formData.pickupDropAvailable}
                  onChange={() => setFormData({
                    ...formData,
                    pickupDropAvailable: !formData.pickupDropAvailable
                  })}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="pickupDropAvailable" className="ml-2 block text-sm text-gray-700">
                  Pickup/drop-off service available
                </label>
              </div>
            </div>
            
            {/* ID Proof & License */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Proof / Business License*</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleFileChange(e, 'idProof')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
              {formData.idProofURL && (
                <div className="mt-2 flex items-center">
                  <div className="p-1 border border-gray-300 rounded bg-gray-50">
                    <svg className="h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="ml-2 text-sm text-gray-700">Document uploaded</span>
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">Upload ID proof or business license for verification</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number (if applicable)</label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                placeholder="Enter your business license number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Your registration will be reviewed by our team before being approved. Make sure all information is accurate and complete. You'll receive a notification once your boarding center is approved.
                    </p>
                  </div>
                </div>
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
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Registration'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default PetBoardingRegistration; 