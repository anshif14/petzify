import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';
import AuthModal from '../auth/AuthModal';

const TransportationInquiry = ({ isOpen, onClose }) => {
  const { currentUser, isAuthenticated, authInitialized } = useUser();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
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
  
  const [showSuccess, setShowSuccess] = useState(false);

  // Function to fetch location details from pincode
  const fetchLocationDetails = async (pincode, type) => {
    if (pincode.length !== 6) return;

    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      
      if (data[0].Status === 'Success') {
        const location = data[0].PostOffice[0];
        setFormData(prev => ({
          ...prev,
          [`${type}Location`]: {
            district: location.District,
            state: location.State,
            area: location.Name
          }
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
      if (value.length === 6) {
        fetchLocationDetails(value, type);
      } else {
        setFormData(prev => ({ ...prev, [`${type}Location`]: null }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    
    setLoading(prev => ({ ...prev, submit: true }));
    
    try {
      // Get user data from auth context
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
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
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
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  {showSuccess ? (
                    <div className="text-center py-8">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="mt-3">
                        <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                          Thank You!
                        </Dialog.Title>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            Our executive will contact you shortly regarding your transportation inquiry.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                        <button
                          type="button"
                          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          onClick={onClose}
                        >
                          <span className="sr-only">Close</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                      <div>
                        <div className="mt-3 text-center sm:mt-0 sm:text-left">
                          <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                            Pet Transportation Inquiry
                          </Dialog.Title>
                          <div className="mt-4">
                            <form onSubmit={handleSubmit} className="space-y-4">
                              {/* Pet Details */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Pet Name</label>
                                <input
                                  type="text"
                                  required
                                  value={formData.petName}
                                  onChange={(e) => setFormData(prev => ({ ...prev, petName: e.target.value }))}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">Pet Type</label>
                                <select
                                  required
                                  value={formData.petType}
                                  onChange={(e) => setFormData(prev => ({ ...prev, petType: e.target.value }))}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                >
                                  <option value="">Select pet type</option>
                                  <option value="dog">Dog</option>
                                  <option value="cat">Cat</option>
                                  <option value="bird">Bird</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">Pet Weight (kg)</label>
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  step="0.1"
                                  value={formData.petWeight}
                                  onChange={(e) => setFormData(prev => ({ ...prev, petWeight: e.target.value }))}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                />
                              </div>

                              {/* Location Details */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700">From Pincode</label>
                                <input
                                  type="text"
                                  required
                                  value={formData.fromPincode}
                                  onChange={(e) => handlePincodeChange(e, 'fromPincode')}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                  placeholder="Enter 6-digit pincode"
                                />
                                {loading.fromPincode && <p className="mt-1 text-sm text-gray-500">Fetching location...</p>}
                                {formData.fromLocation && (
                                  <p className="mt-1 text-sm text-gray-600">
                                    {formData.fromLocation.area}, {formData.fromLocation.district}, {formData.fromLocation.state}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700">To Pincode</label>
                                <input
                                  type="text"
                                  required
                                  value={formData.toPincode}
                                  onChange={(e) => handlePincodeChange(e, 'toPincode')}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                                  placeholder="Enter 6-digit pincode"
                                />
                                {loading.toPincode && <p className="mt-1 text-sm text-gray-500">Fetching location...</p>}
                                {formData.toLocation && (
                                  <p className="mt-1 text-sm text-gray-600">
                                    {formData.toLocation.area}, {formData.toLocation.district}, {formData.toLocation.state}
                                  </p>
                                )}
                              </div>

                              <div className="mt-5 sm:mt-6">
                                <button
                                  type="submit"
                                  disabled={loading.submit}
                                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                                >
                                  {loading.submit ? 'Sending Inquiry...' : 'Send Inquiry'}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
      
      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
        onSuccess={() => {
          setShowAuthModal(false);
          // After successful login, you can either auto-submit the form or let user submit again
        }}
      />
    </>
  );
};

export default TransportationInquiry; 