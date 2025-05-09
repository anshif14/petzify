import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useUser } from '../context/UserContext';
import LoadingScreen from '../components/common/LoadingScreen';
import { format } from 'date-fns';

const BookingConfirmation = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useUser();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get booking details from location state or fetch from database
  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        
        // First try to get data from location state
        if (location.state && location.state.bookingDetails) {
          setBooking({
            id,
            ...location.state.bookingDetails,
            totalCost: location.state.totalCost
          });
          setLoading(false);
          return;
        }
        
        // Otherwise fetch from database
        if (!id) {
          throw new Error('Booking ID not provided');
        }
        
        // Try grooming bookings first
        let bookingDoc = await getDoc(doc(db, 'groomingBookings', id));
        
        // If not found, try boarding bookings
        if (!bookingDoc.exists()) {
          bookingDoc = await getDoc(doc(db, 'petBoardingBookings', id));
        }
        
        // If still not found, try vet bookings
        if (!bookingDoc.exists()) {
          bookingDoc = await getDoc(doc(db, 'vetBookings', id));
        }
        
        if (!bookingDoc.exists()) {
          throw new Error('Booking not found');
        }
        
        const bookingData = bookingDoc.data();
        
        // Check if the booking belongs to the current user
        if (isAuthenticated() && currentUser.uid !== bookingData.userId) {
          throw new Error('You do not have permission to view this booking');
        }
        
        setBooking({
          id,
          ...bookingData
        });
        
      } catch (err) {
        console.error('Error fetching booking details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookingDetails();
  }, [id, location.state, currentUser, isAuthenticated]);
  
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    const dateObj = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return format(dateObj, 'PPP'); // "Apr 29, 2020"
  };
  
  const formatTime = (time) => {
    if (!time) return 'N/A';
    return time;
  };
  
  // Determine booking type
  const getBookingType = () => {
    if (!booking) return '';
    
    if (booking.selectedServices) {
      return 'grooming';
    } else if (booking.petSize) {
      return 'boarding';
    } else {
      return 'veterinary';
    }
  };
  
  // Handle navigation based on booking type
  const handleViewAllBookings = () => {
    navigate('/my-bookings');
  };
  
  if (loading) {
    return <LoadingScreen message="Loading booking confirmation..." />;
  }
  
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-medium text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">
            {error}
          </p>
          <Link to="/" className="inline-block bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }
  
  if (!booking) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-xl font-medium text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-4">
            We couldn't find the booking you're looking for.
          </p>
          <Link to="/" className="inline-block bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }
  
  const bookingType = getBookingType();
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b text-center">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-green-100 mb-4">
            <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h1>
          <p className="text-gray-600 mt-2">
            Your booking request has been submitted successfully.
          </p>
        </div>
        
        {/* Booking Details */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Booking Details</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Booking ID:</span>
              <span className="text-sm font-medium">{booking.id}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Service Type:</span>
              <span className="text-sm font-medium capitalize">{bookingType} Service</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Status:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Pending Confirmation
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Service Provider:</span>
              <span className="text-sm font-medium">{booking.centerName}</span>
            </div>
            {bookingType === 'grooming' && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Date:</span>
                  <span className="text-sm font-medium">{booking.date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Time:</span>
                  <span className="text-sm font-medium">{formatTime(booking.time)}</span>
                </div>
              </>
            )}
            {bookingType === 'boarding' && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Check-in Date:</span>
                  <span className="text-sm font-medium">{formatDate(booking.dateFrom)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Check-out Date:</span>
                  <span className="text-sm font-medium">{formatDate(booking.dateTo)}</span>
                </div>
              </>
            )}
          </div>
          
          {/* Pet Details */}
          <h3 className="text-md font-medium text-gray-900 mb-3">Pet Information</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Pet Name:</span>
              <span className="text-sm font-medium">{booking.petName}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Pet Type:</span>
              <span className="text-sm font-medium capitalize">{booking.petType}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Breed:</span>
              <span className="text-sm font-medium">{booking.petBreed || 'N/A'}</span>
            </div>
            {bookingType === 'grooming' && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Age:</span>
                  <span className="text-sm font-medium">{booking.petAge || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Weight:</span>
                  <span className="text-sm font-medium">{booking.petWeight ? `${booking.petWeight} kg` : 'N/A'}</span>
                </div>
              </>
            )}
            {bookingType === 'boarding' && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Size:</span>
                <span className="text-sm font-medium capitalize">{booking.petSize || 'N/A'}</span>
              </div>
            )}
          </div>
          
          {/* Service Details */}
          {bookingType === 'grooming' && booking.selectedServices && booking.selectedServices.length > 0 && (
            <>
              <h3 className="text-md font-medium text-gray-900 mb-3">Service Details</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                {booking.selectedPackage ? (
                  <div className="mb-2">
                    <span className="text-sm font-medium">Package: </span>
                    <span className="text-sm">{booking.selectedPackage}</span>
                  </div>
                ) : null}
                <div className="mb-2">
                  <span className="text-sm font-medium">Services: </span>
                  <ul className="list-disc pl-5 mt-1">
                    {booking.selectedServices.map((service, idx) => (
                      <li key={idx} className="text-sm">{service}</li>
                    ))}
                  </ul>
                </div>
                {booking.specialInstructions && (
                  <div>
                    <span className="text-sm font-medium">Special Instructions: </span>
                    <p className="text-sm mt-1">{booking.specialInstructions}</p>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Payment Details */}
          <h3 className="text-md font-medium text-gray-900 mb-3">Payment Details</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Amount:</span>
              <span className="text-lg font-semibold text-primary">₹{booking.totalCost}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Payment will be collected at the center</p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-6 flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={handleViewAllBookings}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded transition-colors"
          >
            View All Bookings
          </button>
          <Link to="/" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition-colors text-center">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation; 