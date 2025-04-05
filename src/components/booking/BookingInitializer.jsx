import React, { useState, useEffect } from 'react';
import { seedDoctors, seedAllDoctorSlots } from '../../firebase/seedDoctors';
import { useAlert } from '../../context/AlertContext';

const BookingInitializer = () => {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showSuccess, showError } = useAlert();

  useEffect(() => {
    const initializeBookingSystem = async () => {
      try {
        setLoading(true);
        
        // Check if we've already initialized (to avoid multiple initializations)
        const hasInitialized = localStorage.getItem('bookingInitialized');
        if (hasInitialized === 'true') {
          setInitialized(true);
          setLoading(false);
          return;
        }
        
        // Seed doctors
        const doctorResult = await seedDoctors();
        
        // Seed slots
        const slotResult = await seedAllDoctorSlots();
        
        if (doctorResult.success && slotResult.success) {
          // Mark as initialized
          localStorage.setItem('bookingInitialized', 'true');
          setInitialized(true);
          showSuccess('Booking system initialized successfully', 'Setup Complete');
        } else {
          setError('Error initializing booking system');
          showError('Error initializing booking system. Please try again later.', 'Setup Error');
        }
      } catch (err) {
        console.error('Error initializing booking system:', err);
        setError(err.message);
        showError('Error initializing booking system: ' + err.message, 'Setup Error');
      } finally {
        setLoading(false);
      }
    };
    
    initializeBookingSystem();
  }, [showSuccess, showError]);

  if (loading) {
    return (
      <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white bg-opacity-75 z-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-2 text-lg font-medium text-primary">Initializing booking system...</p>
          <p className="text-sm text-gray-500">This may take a moment...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error initializing booking system:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  // Render nothing if initialized successfully
  return null;
};

export default BookingInitializer; 