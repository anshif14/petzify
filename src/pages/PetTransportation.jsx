import React, { useState, useEffect } from 'react';
// Add Firebase imports
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import AuthModal from '../components/auth/AuthModal';
import { useNavigate } from 'react-router-dom';

const PetTransportation = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, authInitialized } = useUser();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Check if user is authenticated when component loads
  useEffect(() => {
    if (authInitialized && !isAuthenticated()) {
      setShowAuthModal(true);
    }
  }, [authInitialized, isAuthenticated]);

  const [formData, setFormData] = useState({
    petName: '',
    petType: '',
    petWeight: '',
    fromPincode: '',
    toPincode: '',
    fromLocation: null,
    toLocation: null,
  });
  
  const [loading, setLoading] = useState({
    fromPincode: false,
    toPincode: false,
    submit: false
  });

  const [placeOptions, setPlaceOptions] = useState({
    fromPincode: [],
    toPincode: []
  });
  
  const [showSuccess, setShowSuccess] = useState(false);

  // Function to fetch location details from pincode
  const fetchLocationDetails = async (pincode, type) => {
    if (pincode.length !== 6) return;

    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      
      if (data[0].Status === 'Success') {
        const locations = data[0].PostOffice;
        setPlaceOptions(prev => ({
          ...prev,
          [type]: locations
        }));
      }
    } catch (error) {
      console.error('Error fetching pincode data:', error);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handlePincodeChange = (e, type) => {
    const { value } = e.target;
    if (value.length <= 6 && /^\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [type]: value }));
      setPlaceOptions(prev => ({ ...prev, [type]: [] }));
      setFormData(prev => ({ ...prev, [`${type}Location`]: null }));
      
      if (value.length === 6) {
        fetchLocationDetails(value, type);
      }
    }
  };

  const handleLocationSelect = (location, type) => {
    // Determine the correct state key based on pincode type
    const locationKey = type === 'fromPincode' ? 'fromLocation' : 'toLocation';
    
    // Update the location with selection data
    setFormData(prev => ({
      ...prev,
      [locationKey]: {
        district: location.District,
        state: location.State,
        area: location.Name
      }
    }));
    
    // Clear the place options to hide the dropdown
    setPlaceOptions(prev => ({ ...prev, [type]: [] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is authenticated before proceeding
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    
    setLoading(prev => ({ ...prev, submit: true }));
    
    try {
      // Get user information from authentication
      const userEmail = currentUser?.email || '';
      const userName = currentUser?.name || 'User';
      const userPhone = currentUser?.phone || '';
      
      // Prepare transportation data
      const transportationData = {
        petName: formData.petName,
        petType: formData.petType,
        petSize: formData.petWeight + " kg", // Convert weight to size with unit
        pickupAddress: formData.fromLocation ? 
          `${formData.fromLocation.area}, ${formData.fromLocation.district}, ${formData.fromLocation.state}` : 
          '',
        dropoffAddress: formData.toLocation ? 
          `${formData.toLocation.area}, ${formData.toLocation.district}, ${formData.toLocation.state}` : 
          '',
        pickupDate: serverTimestamp(),
        transportType: 'Standard', // Default value, can be enhanced with options
        customerName: userName,
        customerEmail: userEmail,
        customerPhone: userPhone,
        notes: "", // You can add a notes field to the form if needed
        createdAt: serverTimestamp(),
        status: 'Pending',
        emailSent: false
      };
      
      // Save to Firestore
      await addDoc(collection(db, 'petTransportation'), transportationData);
      
      // Show success message
      setLoading(prev => ({ ...prev, submit: false }));
      setShowSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        setShowSuccess(false);
        setFormData({
          petName: '',
          petType: '',
          petWeight: '',
          fromPincode: '',
          toPincode: '',
          fromLocation: null,
          toLocation: null,
        });
      }, 3000);
    } catch (error) {
      console.error('Error saving transportation data:', error);
      setLoading(prev => ({ ...prev, submit: false }));
      // Here you could add error handling UI
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-16 mb-12">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Pet Transportation Service</h1>
          <p className="text-xl max-w-2xl mx-auto">
            Safe and reliable transportation services for your pets to vet appointments, grooming sessions, or any destination.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          {showSuccess ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Thank You!</h2>
              <p className="text-gray-600 text-lg mb-8">
                Our executive will contact you shortly regarding your transportation inquiry.
              </p>
              <button
                onClick={() => setShowSuccess(false)}
                className="inline-flex justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
              >
                Book Another Transportation
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6 bg-primary text-white">
                <h2 className="text-2xl font-semibold">Transportation Inquiry Form</h2>
                <p className="mt-2 text-white">Fill in the details below to request pet transportation</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Pet Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pet Name</label>
                      <input
                        type="text"
                        required
                        value={formData.petName}
                        onChange={(e) => setFormData(prev => ({ ...prev, petName: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-12 px-4"
                        placeholder="Enter your pet's name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pet Type</label>
                      <select
                        required
                        value={formData.petType}
                        onChange={(e) => setFormData(prev => ({ ...prev, petType: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-12 px-4"
                      >
                        <option value="">Select pet type</option>
                        <option value="dog">Dog</option>
                        <option value="cat">Cat</option>
                        <option value="bird">Bird</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pet Weight (kg)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.1"
                        value={formData.petWeight}
                        onChange={(e) => setFormData(prev => ({ ...prev, petWeight: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-12 px-4"
                        placeholder="Enter pet's weight"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Location Details</h3>
                  <div className="space-y-6">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">From Pincode</label>
                      <div className="flex">
                        <input
                          type="text"
                          required
                          value={formData.fromPincode}
                          onChange={(e) => handlePincodeChange(e, 'fromPincode')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-12 px-4"
                          placeholder="Enter 6-digit pincode"
                        />
                        {formData.fromLocation && (
                          <div className="absolute right-3 top-11 text-green-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {loading.fromPincode && (
                        <p className="mt-2 text-sm text-gray-500">Fetching locations...</p>
                      )}
                      {formData.fromLocation && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-md flex items-center space-x-2 text-gray-700">
                          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <span className="text-sm font-medium block">{formData.fromLocation.area}</span>
                            <span className="text-xs text-gray-500">{formData.fromLocation.district}, {formData.fromLocation.state}</span>
                          </div>
                        </div>
                      )}
                      {placeOptions.fromPincode.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200">
                          <div className="sticky top-0 bg-gray-50 p-2 text-xs font-medium text-gray-500 border-b">
                            Select a location from the list below
                          </div>
                          {placeOptions.fromPincode.map((place, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-gray-100 focus:outline-none border-b border-gray-100"
                              onClick={() => handleLocationSelect(place, 'fromPincode')}
                            >
                              <p className="font-medium text-gray-900">{place.Name}</p>
                              <p className="text-sm text-gray-600">{place.District}, {place.State}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">To Pincode</label>
                      <div className="flex">
                        <input
                          type="text"
                          required
                          value={formData.toPincode}
                          onChange={(e) => handlePincodeChange(e, 'toPincode')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-12 px-4"
                          placeholder="Enter 6-digit pincode"
                        />
                        {formData.toLocation && (
                          <div className="absolute right-3 top-11 text-green-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {loading.toPincode && (
                        <p className="mt-2 text-sm text-gray-500">Fetching locations...</p>
                      )}
                      {formData.toLocation && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-md flex items-center space-x-2 text-gray-700">
                          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <span className="text-sm font-medium block">{formData.toLocation.area}</span>
                            <span className="text-xs text-gray-500">{formData.toLocation.district}, {formData.toLocation.state}</span>
                          </div>
                        </div>
                      )}
                      {placeOptions.toPincode.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200">
                          <div className="sticky top-0 bg-gray-50 p-2 text-xs font-medium text-gray-500 border-b">
                            Select a location from the list below
                          </div>
                          {placeOptions.toPincode.map((place, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-gray-100 focus:outline-none border-b border-gray-100"
                              onClick={() => handleLocationSelect(place, 'toPincode')}
                            >
                              <p className="font-medium text-gray-900">{place.Name}</p>
                              <p className="text-sm text-gray-600">{place.District}, {place.State}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading.submit}
                    className="w-full inline-flex justify-center rounded-md bg-primary px-4 py-4 text-base font-semibold text-white shadow-sm hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                  >
                    {loading.submit ? 'Sending Inquiry...' : 'Send Transportation Inquiry'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Additional Information */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-primary text-2xl mb-4">🚗</div>
              <h3 className="text-lg font-semibold mb-2">Safe Transport</h3>
              <p className="text-gray-600">Our vehicles are specially equipped to ensure your pet's comfort and safety during transit.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-primary text-2xl mb-4">👨‍✈️</div>
              <h3 className="text-lg font-semibold mb-2">Professional Drivers</h3>
              <p className="text-gray-600">Experienced and trained drivers who understand pet handling and care.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-primary text-2xl mb-4">📱</div>
              <h3 className="text-lg font-semibold mb-2">Real-time Updates</h3>
              <p className="text-gray-600">Get regular updates about your pet's journey and estimated arrival time.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
        onSuccess={() => {
          setShowAuthModal(false);
          // After successful login, the user can submit the form
        }}
      />
    </div>
  );
};

export default PetTransportation; 