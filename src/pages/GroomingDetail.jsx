import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useUser } from '../context/UserContext';
import { toast } from 'react-toastify';
import LoadingScreen from '../components/common/LoadingScreen';
import AuthModal from '../components/auth/AuthModal';
import { sendEmail } from '../utils/emailService';

const GroomingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useUser();
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [totalCost, setTotalCost] = useState(0);
  
  // Booking form state
  const [bookingDetails, setBookingDetails] = useState({
    date: '',
    time: '',
    petType: '',
    petName: '',
    petBreed: '',
    petAge: '',
    petWeight: '',
    selectedServices: [],
    specialInstructions: ''
  });

  // Fetch center details
  useEffect(() => {
    const fetchCenter = async () => {
      try {
        setLoading(true);
        const centerRef = doc(db, 'groomingCenters', id);
        const centerSnap = await getDoc(centerRef);
        
        if (centerSnap.exists()) {
          setCenter({
            id: centerSnap.id,
            ...centerSnap.data()
          });
        } else {
          setError('Grooming center not found');
        }
      } catch (err) {
        console.error('Error fetching grooming center:', err);
        setError('Failed to load grooming center details');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchCenter();
    }
  }, [id]);

  // Update price calculation when booking details change
  useEffect(() => {
    calculateBookingCost();
  }, [bookingDetails.selectedServices, center]);

  const calculateBookingCost = () => {
    if (!bookingDetails.selectedServices || !bookingDetails.selectedServices.length || !center) {
      setTotalCost(0);
      return;
    }
    
    let calculatedTotal = 0;
    
    // Calculate total cost for all selected services
    bookingDetails.selectedServices.forEach(serviceName => {
      // Find the selected service and its price
      const selectedService = center.services?.find(service => 
        (typeof service === 'string' ? service : service.name) === serviceName
      );
      
      if (selectedService && selectedService.price) {
        calculatedTotal += Number(selectedService.price);
      } else {
        // Default price if not specified
        calculatedTotal += 500;
      }
    });
    
    setTotalCost(calculatedTotal);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle checkbox change for services
  const handleServiceChange = (e) => {
    const { value, checked } = e.target;
    
    setBookingDetails(prev => {
      const updatedServices = checked 
        ? [...prev.selectedServices, value] // Add service
        : prev.selectedServices.filter(service => service !== value); // Remove service
      
      return {
        ...prev,
        selectedServices: updatedServices
      };
    });
  };

  // Handle successful authentication
  const handleAuthSuccess = () => {
    // Retrieve stored form data and proceed with booking
    const storedForm = localStorage.getItem('tempBookingForm');
    if (storedForm) {
      try {
        const parsedForm = JSON.parse(storedForm);
        setBookingDetails(prevForm => ({
          ...prevForm,
          date: parsedForm.date || prevForm.date,
          time: parsedForm.time || prevForm.time,
          petType: parsedForm.petType || prevForm.petType,
          petName: parsedForm.petName || prevForm.petName,
          petBreed: parsedForm.petBreed || prevForm.petBreed,
          petAge: parsedForm.petAge || prevForm.petAge,
          petWeight: parsedForm.petWeight || prevForm.petWeight,
          selectedServices: parsedForm.selectedServices || prevForm.selectedServices,
          specialInstructions: parsedForm.specialInstructions || prevForm.specialInstructions
        }));
        localStorage.removeItem('tempBookingForm');
        
        // Process booking after a short delay to ensure currentUser is available
        setTimeout(() => {
          processBooking();
        }, 1000);
      } catch (error) {
        console.error('Error parsing stored form data:', error);
        localStorage.removeItem('tempBookingForm');
      }
    }
  };

  // Update the handleSubmit function
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if at least one service is selected
    if (bookingDetails.selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }
    
    // Check if user is logged in
    if (!isAuthenticated()) {
      // Store form data temporarily and show auth modal
      localStorage.setItem('tempBookingForm', JSON.stringify(bookingDetails));
      setShowAuthModal(true);
      return;
    }
    
    // Continue with booking process
    await processBooking();
  };

  // Email notification function
  const sendEmailNotifications = async (bookingData, bookingId) => {
    try {
      // Email to customer
      await sendEmail({
        to: currentUser.email,
        subject: 'Your Pet Grooming Booking Confirmation',
        templateId: 'grooming-booking-confirmation',
        dynamic_template_data: {
          customerName: currentUser.fullName || currentUser.displayName || currentUser.name,
          bookingId,
          centerName: center.name,
          centerAddress: center.type === 'Grooming Center' ? center.address : 'Mobile Service',
          bookingDate: bookingData.date,
          bookingTime: bookingData.time,
          petName: bookingData.petName,
          petType: bookingData.petType,
          serviceType: bookingData.selectedServices.join(', '),
          totalCost,
          specialInstructions: bookingData.specialInstructions || 'None'
        }
      });
      
      // Email to grooming center
      if (center.email) {
        await sendEmail({
          to: center.email,
          subject: 'New Grooming Booking Request',
          templateId: 'grooming-center-booking-notification',
          dynamic_template_data: {
            centerName: center.name,
            customerName: currentUser.fullName || currentUser.displayName || currentUser.name,
            customerEmail: currentUser.email,
            customerPhone: currentUser.phone || 'Not provided',
            bookingId,
            bookingDate: bookingData.date,
            bookingTime: bookingData.time,
            petName: bookingData.petName,
            petType: bookingData.petType,
            serviceType: bookingData.selectedServices.join(', '),
            totalCost,
            specialInstructions: bookingData.specialInstructions || 'None'
          }
        });
      }
    } catch (error) {
      console.error('Error sending email notifications:', error);
      // Continue with booking process even if email fails
    }
  };

  // Add the processing booking function
  const processBooking = async () => {
    setSubmitting(true);
    try {
      // Create a booking document in Firestore
      const bookingData = {
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.fullName || currentUser?.displayName || currentUser?.name || 'Unknown User',
        userPhone: currentUser?.phone || '',
        centerId: center.id,
        centerName: center.name,
        centerEmail: center.email || '',
        centerAddress: center.type === 'Grooming Center' ? center.address : `Mobile service based in ${center.baseLocation}`,
        date: bookingDetails.date,
        time: bookingDetails.time,
        petType: bookingDetails.petType,
        petName: bookingDetails.petName,
        petBreed: bookingDetails.petBreed,
        petAge: bookingDetails.petAge,
        petWeight: bookingDetails.petWeight,
        selectedServices: bookingDetails.selectedServices,
        serviceType: bookingDetails.selectedServices.join(', '),
        specialInstructions: bookingDetails.specialInstructions || '',
        totalCost,
        status: 'pending',
        createdAt: serverTimestamp(),
        paymentStatus: 'pending'
      };
      
      console.log('Attempting to create booking with data:', bookingData);
      
      // Add booking to the grooming bookings collection
      const bookingsRef = collection(db, 'groomingBookings');
      const docRef = await addDoc(bookingsRef, bookingData);
      
      console.log('Booking created successfully with ID:', docRef.id);
      
      // Send email to the user and grooming center
      await sendEmailNotifications(bookingData, docRef.id);
      
      // Set booking ID and show success dialog
      setBookingId(docRef.id);
      setShowSuccessDialog(true);
      
      // Clear any stored pending booking
      localStorage.removeItem('tempBookingForm');
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading grooming center details..." />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-medium text-gray-900 mb-2">{error}</h2>
          <p className="text-gray-600 mb-4">
            The grooming center you're looking for could not be found.
          </p>
          <Link to="/services/grooming" className="inline-block bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors">
            Back to Grooming Services
          </Link>
        </div>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-xl font-medium text-gray-900 mb-2">Center Not Found</h2>
          <p className="text-gray-600 mb-4">
            We couldn't find the grooming center you're looking for.
          </p>
          <Link to="/services/grooming" className="inline-block bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors">
            Back to Grooming Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 w-full">
            <div className="p-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Booking Confirmed!</h3>
                <p className="text-gray-600 mb-4">
                  Your grooming appointment has been booked successfully. You'll receive a confirmation email shortly.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-700">Booking ID: <span className="font-medium">{bookingId}</span></p>
                </div>
                <button
                  onClick={() => {
                    setShowSuccessDialog(false);
                    navigate('/profile');
                  }}
                  className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-dark transition-colors"
                >
                  View My Bookings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={handleAuthSuccess}
          message="Please sign in or register to book a grooming appointment"
        />
      )}

      {/* Breadcrumbs */}
      <div className="mb-6">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link to="/" className="text-gray-500 hover:text-primary">Home</Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <Link to="/services" className="ml-1 text-gray-500 hover:text-primary md:ml-2">Services</Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <Link to="/services/grooming" className="ml-1 text-gray-500 hover:text-primary md:ml-2">Pet Grooming</Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <span className="ml-1 text-gray-500 md:ml-2 font-medium">{center.name}</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left column: Center details */}
        <div className="lg:w-2/3">
          {/* Center Header */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="h-64 bg-gray-300 relative">
              {center.images && center.images.length > 0 ? (
                <img 
                  src={center.images[0]} 
                  alt={center.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
                <div className="flex items-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    center.type === 'Mobile Grooming' 
                      ? 'bg-indigo-100 text-indigo-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {center.type}
                  </span>
                  <div className="flex items-center ml-4">
                    <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                    </svg>
                    <span className="ml-1 text-white">{center.rating || 4.5} ({center.reviewCount || 0})</span>
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-white mt-2">{center.name}</h1>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">{center.description}</p>
              
              {/* Location */}
              <div className="border-t pt-4">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Location</h2>
                {center.type === 'Grooming Center' ? (
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-gray-700">{center.address}</p>
                  </div>
                ) : (
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div>
                      <p className="text-gray-700">Mobile service based in {center.baseLocation}</p>
                      <p className="text-gray-600 text-sm">Service radius: {center.serviceRadius} km</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Contact Info */}
              <div className="border-t pt-4 mt-4">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-700">{center.email}</span>
                  </div>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-700">{center.phone}</span>
                  </div>
                </div>
                {center.website && (
                  <div className="flex items-center mt-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                    </svg>
                    <a href={center.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {center.website}
                    </a>
                  </div>
                )}
              </div>
              
              {/* Hours or Availability */}
              <div className="border-t pt-4 mt-4">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  {center.type === 'Grooming Center' ? 'Business Hours' : 'Availability'}
                </h2>
                {center.type === 'Grooming Center' && center.openHours ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monday:</span>
                      <span className="text-gray-700">{center.openHours.monday || 'Closed'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tuesday:</span>
                      <span className="text-gray-700">{center.openHours.tuesday || 'Closed'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Wednesday:</span>
                      <span className="text-gray-700">{center.openHours.wednesday || 'Closed'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thursday:</span>
                      <span className="text-gray-700">{center.openHours.thursday || 'Closed'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Friday:</span>
                      <span className="text-gray-700">{center.openHours.friday || 'Closed'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Saturday:</span>
                      <span className="text-gray-700">{center.openHours.saturday || 'Closed'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sunday:</span>
                      <span className="text-gray-700">{center.openHours.sunday || 'Closed'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700">{center.availability || 'Please contact for availability'}</p>
                )}
              </div>
              
              {/* Services Offered */}
              <div className="border-t pt-4 mt-4">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Services Offered</h2>
                <div className="flex flex-wrap gap-2">
                  {center.services && center.services.length > 0 ? (
                    center.services.map((service, index) => (
                      <span key={index} className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full">
                        {typeof service === 'string' ? service : service.name}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-600">No specific services listed</p>
                  )}
                </div>
              </div>

              {/* Facilities */}
              <div className="border-t pt-4 mt-4">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Facilities</h2>
                <div className="grid grid-cols-2 gap-4">
                  {center.facilities ? (
                    center.facilities.map((facility, index) => (
                      <div key={index} className="flex items-center">
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{facility}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2">
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Air-conditioned facility</span>
                      </div>
                      <div className="flex items-center mt-2">
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Professional grooming equipment</span>
                      </div>
                      <div className="flex items-center mt-2">
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">Waiting area for pet parents</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column: Booking form */}
        <div className="lg:w-1/3">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-medium text-gray-900">Book a Grooming Appointment</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {/* Date & Time */}
              <div className="mb-4">
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDetails.date}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={bookingDetails.time}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Please check center hours before selecting a time</p>
              </div>
              
              {/* Pet Details */}
              <div className="mb-4">
                <label htmlFor="petType" className="block text-sm font-medium text-gray-700 mb-1">Pet Type</label>
                <select
                  id="petType"
                  name="petType"
                  value={bookingDetails.petType}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select pet type</option>
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                  <option value="rabbit">Rabbit</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="petName" className="block text-sm font-medium text-gray-700 mb-1">Pet Name</label>
                <input
                  type="text"
                  id="petName"
                  name="petName"
                  value={bookingDetails.petName}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="petBreed" className="block text-sm font-medium text-gray-700 mb-1">Pet Breed</label>
                <input
                  type="text"
                  id="petBreed"
                  name="petBreed"
                  value={bookingDetails.petBreed}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="petAge" className="block text-sm font-medium text-gray-700 mb-1">Pet Age</label>
                <input
                  type="number"
                  id="petAge"
                  name="petAge"
                  min="0"
                  max="30"
                  value={bookingDetails.petAge}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="petWeight" className="block text-sm font-medium text-gray-700 mb-1">Pet Weight (kg)</label>
                <input
                  type="number"
                  id="petWeight"
                  name="petWeight"
                  min="0"
                  step="0.1"
                  value={bookingDetails.petWeight}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              
              {/* Service Type - Replace dropdown with checkboxes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
                <p className="text-xs text-gray-500 mb-2">Select one or more services</p>
                
                <div className="space-y-2">
                  {center.services && center.services.length > 0 ? (
                    center.services.map((service, index) => {
                      const serviceName = typeof service === 'string' ? service : service.name;
                      const servicePrice = typeof service === 'string' ? 'Price on request' : (service.price || 'Price on request');
                      
                      return (
                        <div key={index} className="flex items-start">
                          <input
                            type="checkbox"
                            id={`service-${index}`}
                            name={`service-${index}`}
                            value={serviceName}
                            checked={bookingDetails.selectedServices.includes(serviceName)}
                            onChange={handleServiceChange}
                            className="h-4 w-4 mt-1 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <label htmlFor={`service-${index}`} className="ml-2 block text-sm text-gray-700">
                            {serviceName} {servicePrice !== 'Price on request' && `(₹${servicePrice})`}
                          </label>
                        </div>
                      );
                    })
                  ) : (
                    <>
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="service-basic"
                          name="service-basic"
                          value="Basic Grooming"
                          checked={bookingDetails.selectedServices.includes('Basic Grooming')}
                          onChange={handleServiceChange}
                          className="h-4 w-4 mt-1 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor="service-basic" className="ml-2 block text-sm text-gray-700">
                          Basic Grooming
                        </label>
                      </div>
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="service-full"
                          name="service-full"
                          value="Full Grooming"
                          checked={bookingDetails.selectedServices.includes('Full Grooming')}
                          onChange={handleServiceChange}
                          className="h-4 w-4 mt-1 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor="service-full" className="ml-2 block text-sm text-gray-700">
                          Full Grooming
                        </label>
                      </div>
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="service-bath"
                          name="service-bath"
                          value="Bath & Brush"
                          checked={bookingDetails.selectedServices.includes('Bath & Brush')}
                          onChange={handleServiceChange}
                          className="h-4 w-4 mt-1 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor="service-bath" className="ml-2 block text-sm text-gray-700">
                          Bath & Brush
                        </label>
                      </div>
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="service-nail"
                          name="service-nail"
                          value="Nail Trimming"
                          checked={bookingDetails.selectedServices.includes('Nail Trimming')}
                          onChange={handleServiceChange}
                          className="h-4 w-4 mt-1 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor="service-nail" className="ml-2 block text-sm text-gray-700">
                          Nail Trimming
                        </label>
                      </div>
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="service-special"
                          name="service-special"
                          value="Special Treatment"
                          checked={bookingDetails.selectedServices.includes('Special Treatment')}
                          onChange={handleServiceChange}
                          className="h-4 w-4 mt-1 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor="service-special" className="ml-2 block text-sm text-gray-700">
                          Special Treatment
                        </label>
                      </div>
                    </>
                  )}
                </div>
                
                {bookingDetails.selectedServices.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Please select at least one service</p>
                )}
              </div>
              
              {/* Pricing Summary - Add this section after the service selection */}
              {bookingDetails.selectedServices.length > 0 && (
                <div className="mb-6 mt-4 bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Service Summary</h3>
                  <div className="space-y-2 mb-3">
                    {bookingDetails.selectedServices.map((service, index) => {
                      const serviceObj = center.services?.find(s => 
                        (typeof s === 'string' ? s : s.name) === service
                      );
                      const price = serviceObj && typeof serviceObj !== 'string' 
                        ? Number(serviceObj.price) || 500
                        : 500;
                      
                      return (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{service}</span>
                          <span>₹{price}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-medium">
                    <span>Total</span>
                    <span>₹{totalCost}</span>
                  </div>
                </div>
              )}
              
              {/* Special Instructions */}
              <div className="mb-6">
                <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                <textarea
                  id="specialInstructions"
                  name="specialInstructions"
                  value={bookingDetails.specialInstructions}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  placeholder="Any special requirements or information about your pet..."
                />
              </div>
              
              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-md mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Total</span>
                  <span className="text-xl font-semibold text-primary">₹{totalCost}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Payment will be collected at the center</p>
              </div>
              
              {/* Submit Button */}
              {isAuthenticated() ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-3 ${
                    submitting ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'
                  } text-white font-semibold rounded-md transition-colors`}
                >
                  {submitting ? 'Processing...' : 'Book Appointment'}
                </button>
              ) : (
                <div>
                  <button 
                    onClick={() => {
                      // Store booking details in local storage for auth modal
                      localStorage.setItem('tempBookingForm', JSON.stringify({
                        centerId: id,
                        centerName: center.name,
                        date: bookingDetails.date,
                        time: bookingDetails.time,
                        petType: bookingDetails.petType,
                        petName: bookingDetails.petName,
                        petBreed: bookingDetails.petBreed,
                        petAge: bookingDetails.petAge,
                        petWeight: bookingDetails.petWeight,
                        selectedServices: bookingDetails.selectedServices,
                        specialInstructions: bookingDetails.specialInstructions,
                        totalCost
                      }));
                      
                      // Show auth modal
                      setShowAuthModal(true);
                    }}
                    className="w-full py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-colors"
                  >
                    Sign in to Book
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroomingDetail; 