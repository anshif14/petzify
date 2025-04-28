import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';
import { app } from '../firebase/config';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useUser } from '../context/UserContext';
import { useAlert } from '../context/AlertContext';
import AuthModal from '../components/auth/AuthModal';
import PageLoader from '../components/common/PageLoader';
import StarRating from '../components/common/StarRating';
import ReviewForm from '../components/common/ReviewForm';

const UserBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [boardingBookings, setBoardingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState({});
  const { currentUser, isAuthenticated, authInitialized, loading: authLoading } = useUser();
  const { showError, showSuccess } = useAlert();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  // Memoize fetchUserBookings to avoid ESLint warning
  const fetchUserBookings = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      
      // Fetch vet appointments
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', currentUser.email),
        orderBy('appointmentDate', 'desc')
      );
      
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointmentsList = [];
      
      appointmentsSnapshot.forEach((doc) => {
        appointmentsList.push({
          id: doc.id,
          type: 'vet',
          ...doc.data(),
          appointmentDate: doc.data().appointmentDate?.toDate?.() || new Date()
        });
      });
      
      // Fetch pet boarding bookings
      const boardingQuery = query(
        collection(db, 'petBoardingBookings'),
        where('userEmail', '==', currentUser.email),
        orderBy('createdAt', 'desc')
      );
      
      const boardingSnapshot = await getDocs(boardingQuery);
      const boardingList = [];
      
      boardingSnapshot.forEach((doc) => {
        const data = doc.data();
        boardingList.push({
          id: doc.id,
          type: 'boarding',
          appointmentDate: new Date(data.dateFrom),
          petName: data.petName,
          petType: data.petType,
          reason: `Pet Boarding: ${data.dateFrom} to ${data.dateTo}`,
          centerName: data.centerName,
          status: data.status,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          ...data
        });
      });
      
      // Combine and sort all bookings by date
      const allBookings = [...appointmentsList, ...boardingList].sort((a, b) => 
        b.appointmentDate - a.appointmentDate
      );
      
      setBookings(allBookings);
      console.log(`Loaded ${appointmentsList.length} appointments and ${boardingList.length} boarding bookings`);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      showError('Could not load your bookings. Please try again later.', 'Error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, showError]);

  useEffect(() => {
    // Only check authentication after it's been initialized
    if (!authInitialized) return;
    
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    
    fetchUserBookings();
  }, [isAuthenticated, fetchUserBookings, authInitialized]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    // Convert 24-hour format to 12-hour format with AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase() || 'pending') {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isPastAppointment = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const handleAuthSuccess = () => {
    // Fetch bookings after successful authentication
    showSuccess('Successfully signed in!', 'Welcome');
    setTimeout(() => {
      fetchUserBookings();
    }, 500);
  };

  const getBookingTypeIcon = (petType, bookingType) => {
    // If it's a boarding appointment, use a house icon
    if (bookingType === 'boarding') {
      return '🏠';
    }
    
    // Otherwise use pet type icons for vet appointments
    switch (petType?.toLowerCase()) {
      case 'dog':
        return '🐕';
      case 'cat':
        return '🐈';
      case 'bird':
        return '🐦';
      case 'rabbit':
        return '🐇';
      case 'hamster':
        return '🐹';
      case 'reptile':
        return '🦎';
      default:
        return '🐾';
    }
  };

  // Check if appointment can be cancelled
  const canCancelAppointment = (booking) => {
    // Cannot cancel if it's in the past
    if (isPastAppointment(booking.appointmentDate)) return false;
    
    // Can only cancel pending or confirmed appointments
    const status = booking.status?.toLowerCase() || '';
    return status === 'pending' || status === 'confirmed';
  };

  // Handle appointment cancellation
  const handleCancelAppointment = async (booking) => {
    if (!booking.id || cancelLoading) return;
    
    if (!window.confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) {
      return;
    }

    setCancelLoading(true);
    try {
      const db = getFirestore(app);
      
      // Check if this is a regular appointment or a boarding booking
      if (booking.type === 'vet') {
        const appointmentRef = doc(db, 'appointments', booking.id);
        
        // Update appointment status to cancelled
        await updateDoc(appointmentRef, {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelledBy: 'customer'
        });
      } else if (booking.type === 'boarding') {
        const boardingRef = doc(db, 'petBoardingBookings', booking.id);
        
        // Update boarding booking status to cancelled
        await updateDoc(boardingRef, {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelledBy: 'customer'
        });
      }
      
      showSuccess('Appointment has been cancelled successfully', 'Appointment Cancelled');
      
      // Update the bookings list
      setBookings(prevBookings => 
        prevBookings.map(b => 
          b.id === booking.id 
            ? {...b, status: 'cancelled', cancelledAt: new Date().toISOString()} 
            : b
        )
      );
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      showError('Could not cancel your appointment. Please try again later.', 'Error');
    } finally {
      setCancelLoading(false);
    }
  };

  // Toggle the review form visibility for a specific booking
  const toggleReviewForm = (bookingId) => {
    setShowReviewForm(prev => ({
      ...prev,
      [bookingId]: !prev[bookingId]
    }));
  };

  // Handle submitting a rating for a booking
  const handleSubmitRating = async (booking, reviewData) => {
    if (!booking.id || ratingLoading) return;
    
    setRatingLoading(true);
    try {
      const db = getFirestore(app);
      
      // Only allow rating for boarding bookings
      if (booking.type !== 'boarding') {
        showError('Only boarding bookings can be rated', 'Error');
        return;
      }
      
      // Create or update the rating document
      const ratingRef = doc(db, 'boardingRatings', booking.id);
      await setDoc(ratingRef, {
        bookingId: booking.id,
        centerId: booking.centerId,
        centerName: booking.centerName,
        rating: reviewData.rating,
        comment: reviewData.reviewText || '',
        imageUrl: reviewData.imageUrl || null,
        userEmail: currentUser.email,
        userName: currentUser.displayName || 'User',
        ratedAt: new Date(),
        petName: booking.petName,
        petType: booking.petType,
        bookingDate: booking.dateFrom
      });
      
      // Update the booking with rating info
      const boardingRef = doc(db, 'petBoardingBookings', booking.id);
      await updateDoc(boardingRef, {
        rating: reviewData.rating,
        review: reviewData.reviewText || '',
        reviewImageUrl: reviewData.imageUrl || null,
        ratedAt: new Date()
      });
      
      // Update local state to show rating
      setBookings(prevBookings => 
        prevBookings.map(b => 
          b.id === booking.id 
            ? {
                ...b, 
                rating: reviewData.rating, 
                review: reviewData.reviewText || '',
                reviewImageUrl: reviewData.imageUrl || null,
                ratedAt: new Date()
              } 
            : b
        )
      );
      
      // Hide the review form
      setShowReviewForm(prev => ({
        ...prev,
        [booking.id]: false
      }));
      
      showSuccess('Thank you for your review!', 'Review Submitted');
    } catch (error) {
      console.error('Error submitting review:', error);
      showError('Could not submit your review. Please try again later.', 'Error');
    } finally {
      setRatingLoading(false);
    }
  };

  // Show loading spinner if auth is still initializing
  if (authLoading || !authInitialized) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">My Appointments</h1>
          
          {!isAuthenticated() ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h2 className="text-xl font-medium text-gray-700 mb-4">Please Sign In</h2>
              <p className="text-gray-500 mb-6">
                You need to be signed in to view your appointments
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="inline-block bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
              >
                Sign In
              </button>
            </div>
          ) : loading ? (
            <div className="bg-white rounded-lg shadow p-6">
              <PageLoader message="Loading your appointments..." />
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <h2 className="text-xl font-medium text-gray-700 mb-4">No Appointments Found</h2>
              <p className="text-gray-500 mb-6">
                You haven't booked any appointments yet.
              </p>
              <button
                onClick={() => navigate('/book-appointment')}
                className="inline-block bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
              >
                Book an Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Your Scheduled Appointments</h2>
                <p className="text-sm text-gray-500">
                  View and manage all your veterinary and boarding appointments
                </p>
              </div>
              
              {/* Upcoming Appointments */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Upcoming Appointments</h3>
                </div>
                
                <ul className="divide-y divide-gray-200">
                  {bookings
                    .filter(booking => !isPastAppointment(booking.appointmentDate))
                    .map(booking => (
                      <li key={booking.id} className="px-6 py-5">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div className="mb-4 md:mb-0">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-light flex items-center justify-center text-primary text-lg font-bold">
                                {getBookingTypeIcon(booking.petType, booking.type)}
                              </div>
                              <div className="ml-4">
                                <h4 className="text-lg font-medium text-gray-900">
                                  {booking.type === 'vet' 
                                    ? `Dr. ${booking.doctorName || 'Unknown'}` 
                                    : booking.centerName || 'Boarding Center'}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  For {booking.petName || 'Pet'} ({booking.petType || 'Not specified'})
                                  {booking.type === 'boarding' && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      Boarding
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="md:text-right flex flex-col md:items-end">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(booking.appointmentDate)}
                            </div>
                            {booking.type === 'vet' ? (
                              <div className="text-sm text-gray-500">
                                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                Check-out: {formatDate(new Date(booking.dateTo))}
                              </div>
                            )}
                            <div className="mt-2">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                                  booking.status
                                )}`}
                              >
                                {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'Pending'}
                              </span>
                            </div>
                            
                            {canCancelAppointment(booking) && (
                              <button 
                                onClick={() => handleCancelAppointment(booking)}
                                disabled={cancelLoading}
                                className="mt-2 text-sm text-red-600 hover:text-red-800 transition-colors font-medium focus:outline-none"
                              >
                                {cancelLoading ? 'Cancelling...' : 'Cancel Appointment'}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {booking.reason && (
                          <div className="mt-4 text-sm text-gray-700">
                            <span className="font-medium">Reason:</span> {booking.reason}
                          </div>
                        )}
                        
                        {booking.status === 'cancelled' && (
                          <div className="mt-3 pt-2 text-sm text-red-600">
                            This appointment was cancelled {booking.cancelledAt ? `on ${new Date(booking.cancelledAt).toLocaleString()}` : ''}
                          </div>
                        )}
                      </li>
                    ))}
                    
                  {bookings.filter(booking => !isPastAppointment(booking.appointmentDate)).length === 0 && (
                    <li className="px-6 py-8 text-center text-gray-500">
                      No upcoming appointments
                    </li>
                  )}
                </ul>
              </div>
              
              {/* Past Appointments */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Past Appointments</h3>
                </div>
                
                <ul className="divide-y divide-gray-200">
                  {bookings
                    .filter(booking => isPastAppointment(booking.appointmentDate))
                    .map(booking => (
                      <li key={booking.id} className="px-6 py-5 opacity-75">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div className="mb-4 md:mb-0">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-lg font-bold">
                                {getBookingTypeIcon(booking.petType, booking.type)}
                              </div>
                              <div className="ml-4">
                                <h4 className="text-lg font-medium text-gray-900">
                                  {booking.type === 'vet' 
                                    ? `Dr. ${booking.doctorName || 'Unknown'}` 
                                    : booking.centerName || 'Boarding Center'}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  For {booking.petName || 'Pet'} ({booking.petType || 'Not specified'})
                                  {booking.type === 'boarding' && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      Boarding
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="md:text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(booking.appointmentDate)}
                            </div>
                            {booking.type === 'vet' ? (
                              <div className="text-sm text-gray-500">
                                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                Check-out: {formatDate(new Date(booking.dateTo))}
                              </div>
                            )}
                            <div className="mt-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                booking.status?.toLowerCase() === 'cancelled' 
                                  ? getStatusBadgeClass('cancelled') 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {booking.status?.toLowerCase() === 'cancelled' 
                                  ? 'Cancelled' 
                                  : 'Past'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {booking.status === 'cancelled' && (
                          <div className="mt-3 pt-2 text-sm text-red-600">
                            This appointment was cancelled {booking.cancelledAt ? `on ${new Date(booking.cancelledAt).toLocaleString()}` : ''}
                          </div>
                        )}

                        {/* Rating section for completed boarding bookings */}
                        {booking.type === 'boarding' && 
                         booking.status?.toLowerCase() !== 'cancelled' && (
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            {booking.rating ? (
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-sm font-medium text-gray-700">Your Review:</p>
                                  <button
                                    onClick={() => toggleReviewForm(booking.id)}
                                    className="text-sm text-primary hover:text-primary-dark"
                                  >
                                    {showReviewForm[booking.id] ? 'Cancel' : 'Edit Review'}
                                  </button>
                                </div>
                                
                                {!showReviewForm[booking.id] && (
                                  <div>
                                    <StarRating initialRating={booking.rating} disabled={true} />
                                    
                                    {booking.review && (
                                      <p className="mt-2 text-sm text-gray-700">
                                        "{booking.review}"
                                      </p>
                                    )}
                                    
                                    {booking.reviewImageUrl && (
                                      <div className="mt-2">
                                        <img 
                                          src={booking.reviewImageUrl} 
                                          alt="Review" 
                                          className="review-image" 
                                        />
                                      </div>
                                    )}
                                    
                                    <p className="text-xs text-gray-500 mt-2">
                                      Reviewed on {booking.ratedAt ? new Date(booking.ratedAt).toLocaleDateString() : 'Unknown'}
                                    </p>
                                  </div>
                                )}
                                
                                {showReviewForm[booking.id] && (
                                  <ReviewForm
                                    initialRating={booking.rating}
                                    onSubmit={(reviewData) => handleSubmitRating(booking, reviewData)}
                                    loading={ratingLoading}
                                    bookingId={booking.id}
                                    centerName={booking.centerName || 'this boarding center'}
                                  />
                                )}
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                  Share your experience with this boarding center
                                </p>
                                
                                <button
                                  onClick={() => toggleReviewForm(booking.id)}
                                  className="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-primary-dark"
                                >
                                  Write a Review
                                </button>
                                
                                {showReviewForm[booking.id] && (
                                  <div className="mt-3">
                                    <ReviewForm
                                      initialRating={0}
                                      onSubmit={(reviewData) => handleSubmitRating(booking, reviewData)}
                                      loading={ratingLoading}
                                      bookingId={booking.id}
                                      centerName={booking.centerName || 'this boarding center'}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                    
                  {bookings.filter(booking => isPastAppointment(booking.appointmentDate)).length === 0 && (
                    <li className="px-6 py-8 text-center text-gray-500">
                      No past appointments
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          if (!isAuthenticated()) {
            navigate('/');
          }
        }}
        initialMode="login"
        onSuccess={handleAuthSuccess}
      />
      

    </>
  );
};

export default UserBookings; 