import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useUser } from '../context/UserContext';
import { toast } from 'react-toastify';
import LoadingScreen from '../components/common/LoadingScreen';
import AuthModal from '../components/auth/AuthModal';
import { sendEmail } from '../utils/emailService';
import { format } from 'date-fns';

const GroomingBooking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, authInitialized } = useUser();
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  
  // Booking form state
  const [bookingDetails, setBookingDetails] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    petType: 'Dog',
    petName: '',
    petBreed: '',
    petAge: '',
    petWeight: '',
    selectedServices: [],
    selectedPackage: null,
    specialInstructions: ''
  });

  // Add new state for services and packages
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  
  // Check authentication status whenever currentUser changes
  useEffect(() => {
    // If user becomes authenticated and auth modal is showing, hide it
    if (isAuthenticated() && showAuthModal) {
      setShowAuthModal(false);
      
      // Retrieve any saved form data
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
        } catch (error) {
          console.error('Error parsing stored form data:', error);
          localStorage.removeItem('tempBookingForm');
        }
      }
    }
  }, [currentUser, isAuthenticated, showAuthModal]);

  // Fetch center details
  useEffect(() => {
    const fetchCenter = async () => {
      try {
        setLoading(true);
        const centerRef = doc(db, 'groomingCenters', id);
        const centerSnap = await getDoc(centerRef);
        
        if (centerSnap.exists()) {
          const centerData = centerSnap.data();
          setCenter({
            id: centerSnap.id,
            ...centerData
          });

          // Fetch center-specific services and packages
          fetchServicesAndPackages(centerSnap.id);
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

  // Add a function to fetch services and packages
  const fetchServicesAndPackages = async (centerId) => {
    try {
      // Fetch services
      const servicesQuery = query(
        collection(db, 'groomingServices'),
        where('centerId', '==', centerId)
      );
      
      const servicesSnapshot = await getDocs(servicesQuery);
      const servicesList = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setServices(servicesList);
      
      // Add services to center object for compatibility with existing code
      setCenter(prev => ({
        ...prev,
        services: servicesList
      }));
      
      // Fetch packages
      const packagesQuery = query(
        collection(db, 'groomingPackages'),
        where('centerId', '==', centerId)
      );
      
      const packagesSnapshot = await getDocs(packagesQuery);
      const packagesList = packagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setPackages(packagesList);
      
      // If no services found, use default services
      if (servicesList.length === 0) {
        const defaultServices = [
          { name: "Basic Grooming", price: 800, description: "Basic grooming service" },
          { name: "Full Grooming", price: 1200, description: "Complete grooming service" },
          { name: "Bath & Brush", price: 600, description: "Bath and brush service" },
          { name: "Nail Trimming", price: 400, description: "Professional nail trimming" },
          { name: "Special Treatment", price: 1000, description: "Special treatment service" }
        ];
        
        setServices(defaultServices);
        setCenter(prev => ({
          ...prev,
          services: defaultServices
        }));
      }
    } catch (error) {
      console.error('Error fetching services and packages:', error);
    }
  };

  // Update price calculation when booking details change
  useEffect(() => {
    calculateBookingCost();
  }, [bookingDetails.selectedServices, bookingDetails.selectedPackage, services, packages]);

  const calculateBookingCost = () => {
    if (bookingDetails.selectedPackage) {
      // If a package is selected, use its price
      const selectedPackage = packages.find(pkg => pkg.id === bookingDetails.selectedPackage);
      if (selectedPackage) {
        setTotalCost(selectedPackage.price);
        return;
      }
    }
    
    // Otherwise calculate based on individual services
    if (!bookingDetails.selectedServices || !bookingDetails.selectedServices.length) {
      setTotalCost(0);
      return;
    }
    
    let calculatedTotal = 0;
    
    // Calculate total cost for all selected services
    bookingDetails.selectedServices.forEach(serviceName => {
      // Find the selected service and its price
      const selectedService = services.find(service => service.name === serviceName);
      
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
      
      // Check if the current selection no longer matches any package
      let packageStillValid = false;
      let updatedPackage = prev.selectedPackage;
      
      if (prev.selectedPackage) {
        const selectedPackage = packages.find(pkg => pkg.id === prev.selectedPackage);
        if (selectedPackage) {
          const packageServiceNames = selectedPackage.services.map(s => s.name);
          // Check if updated services exactly match package services (no more, no less)
          const servicesMatch = 
            packageServiceNames.length === updatedServices.length && 
            packageServiceNames.every(s => updatedServices.includes(s));
          
          if (!servicesMatch) {
            updatedPackage = null;
          } else {
            packageStillValid = true;
          }
        }
      }
      
      return {
        ...prev,
        selectedServices: updatedServices,
        selectedPackage: updatedPackage
      };
    });
  };

  // Handle successful authentication
  const handleAuthSuccess = () => {
    console.log('Auth success called, user authenticated:', isAuthenticated());
    // Form data retrieval is now handled in the useEffect above
    
    // If we're now authenticated and have form data filled out, process the booking
    if (isAuthenticated() && bookingDetails.selectedServices.length > 0) {
      // Slight delay to ensure everything is updated
      setTimeout(() => {
        processBooking();
      }, 500);
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

  // Add a new function to handle package selection
  const handlePackageSelection = (packageId) => {
    const selectedPackage = packages.find(pkg => pkg.id === packageId);
    
    if (selectedPackage) {
      // Get the services included in this package
      const packageServices = selectedPackage.services.map(service => service.name);
      
      setBookingDetails(prev => ({
        ...prev,
        selectedPackage: packageId,
        // Replace any previously selected services with the package services
        selectedServices: packageServices
      }));
    } else {
      // If no package selected, clear the selected package but keep services
      setBookingDetails(prev => ({
        ...prev,
        selectedPackage: null
      }));
    }
  };

  // Add the processing booking function
  const processBooking = async () => {
    setSubmitting(true);
    try {
      // Double check authentication
      if (!isAuthenticated()) {
        console.log('Not authenticated in processBooking:', { 
          isAuthenticated: isAuthenticated(), 
          currentUser 
        });
        toast.error('Please sign in to book an appointment');
        setShowAuthModal(true);
        setSubmitting(false);
        return;
      }

      // Ensure we have a valid user object
      if (!currentUser || !currentUser.email) {
        console.error('Current user is missing required fields:', currentUser);
        toast.error('User information is incomplete. Please sign out and sign in again.');
        setSubmitting(false);
        return;
      }

      // Create the booking data object
      const bookingData = {
        userId: currentUser.id || currentUser.email, // Use email as fallback for userId
        userName: currentUser.displayName || currentUser.name || '',
        userEmail: currentUser.email,
        userPhone: currentUser.phone || '',
        centerId: center.id,
        centerName: center.name,
        date: bookingDetails.date,
        time: bookingDetails.time,
        petType: bookingDetails.petType,
        petName: bookingDetails.petName,
        petBreed: bookingDetails.petBreed,
        petAge: bookingDetails.petAge,
        petWeight: bookingDetails.petWeight,
        selectedServices: bookingDetails.selectedServices,
        selectedPackage: bookingDetails.selectedPackage || null,
        specialInstructions: bookingDetails.specialInstructions,
        totalCost,
        status: 'pending',
        createdAt: serverTimestamp()
      };
      
      // Add to bookings collection
      const bookingRef = await addDoc(collection(db, 'groomingBookings'), bookingData);
      
      // Send confirmation emails
      await sendEmailNotifications(bookingData, bookingRef.id);
      
      // Show success message
      toast.success('Booking submitted successfully!');
      
      // Navigate to confirmation page or dashboard
      navigate(`/booking-confirmation/${bookingRef.id}`, { 
        state: { 
          bookingDetails: bookingData,
          totalCost 
        } 
      });
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to submit booking. Please try again.');
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
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Grooming Center Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{center?.name}</h1>
              {center?.address && (
                <p className="text-gray-600 mt-1">{center.address}</p>
              )}
            </div>
            <Link 
              to={`/services/grooming/${id}`}
              className="mt-2 sm:mt-0 text-primary hover:text-primary-dark transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Center Details
            </Link>
          </div>
        </div>

        {/* Booking Form */}
        <div className="p-0">
          <form onSubmit={handleSubmit} className="p-6">
            {/* Date & Time */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Appointment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
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
                
                <div>
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
              </div>
            </div>
            
            {/* Pet Details */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pet Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
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
                
                <div>
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

                <div>
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

                <div>
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

                <div>
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
              </div>
            </div>
            
            {/* Service Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Services</h3>
              <p className="text-sm text-gray-600 mb-4">Choose individual services or select a package below</p>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <h4 className="font-medium text-gray-800 mb-2">Individual Services</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {services && services.length > 0 ? (
                    services.map((service, index) => (
                      <div key={service.id || index} className="flex items-start p-2 border border-gray-200 rounded bg-white">
                        <input
                          type="checkbox"
                          id={`service-${service.id || index}`}
                          name={`service-${service.id || index}`}
                          value={service.name}
                          checked={bookingDetails.selectedServices.includes(service.name)}
                          onChange={handleServiceChange}
                          className="h-4 w-4 mt-1 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor={`service-${service.id || index}`} className="ml-2 block">
                          <span className="block text-sm font-medium text-gray-700">{service.name}</span>
                          {service.price && <span className="block text-sm text-gray-600">₹{service.price}</span>}
                          {service.description && <span className="block text-xs text-gray-500 mt-1">{service.description}</span>}
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center p-4">
                      <p className="text-gray-500">No services available</p>
                    </div>
                  )}
                </div>
                
                {bookingDetails.selectedServices.length === 0 && (
                  <p className="text-xs text-red-500 mt-3">Please select at least one service</p>
                )}
              </div>
              
              {/* Packages Section */}
              {packages && packages.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2">Service Packages</h4>
                  <p className="text-xs text-gray-500 mb-3">Select a package for special pricing</p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {packages.map((pkg) => (
                      <div 
                        key={pkg.id} 
                        className={`border rounded-lg p-4 cursor-pointer ${
                          bookingDetails.selectedPackage === pkg.id 
                            ? 'border-primary bg-primary bg-opacity-5' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                        onClick={() => handlePackageSelection(pkg.id)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{pkg.name}</h4>
                          <div className="text-primary font-semibold">₹{pkg.price}</div>
                        </div>
                        
                        {pkg.description && (
                          <p className="text-sm text-gray-600 mb-2">{pkg.description}</p>
                        )}
                        
                        <div className="text-sm text-gray-500">
                          <p className="mb-1">Includes:</p>
                          <ul className="pl-4 list-disc">
                            {pkg.services.map((service, idx) => (
                              <li key={idx}>{service.name}</li>
                            ))}
                          </ul>
                        </div>
                        
                        {pkg.discountPercentage > 0 && (
                          <div className="mt-2 text-sm text-green-600 font-medium">
                            Save {pkg.discountPercentage}% off individual prices
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Special Instructions */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Special Instructions</h3>
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
            
            {/* Pricing Summary */}
            {bookingDetails.selectedServices.length > 0 && (
              <div className="mb-6 bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Booking Summary</h3>
                <div className="space-y-2 mb-3">
                  {bookingDetails.selectedPackage ? (
                    <>
                      {/* Show package name and price */}
                      {(() => {
                        const selectedPackage = packages.find(pkg => pkg.id === bookingDetails.selectedPackage);
                        return (
                          <div className="flex justify-between text-sm font-medium">
                            <span>{selectedPackage.name} Package</span>
                            <span>₹{selectedPackage.price}</span>
                          </div>
                        );
                      })()}
                      
                      {/* Show services included in package */}
                      <div className="pt-1 pb-2">
                        <p className="text-xs text-gray-500 mb-1">Includes:</p>
                        {bookingDetails.selectedServices.map((serviceName, index) => (
                          <div key={index} className="flex justify-between text-xs text-gray-500">
                            <span>{serviceName}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Show savings */}
                      {(() => {
                        const selectedPackage = packages.find(pkg => pkg.id === bookingDetails.selectedPackage);
                        return (
                          <div className="flex justify-between text-xs text-green-600 font-medium pt-1 border-t border-gray-200">
                            <span>Your savings</span>
                            <span>₹{selectedPackage.originalValue - selectedPackage.price}</span>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    // Show individual services
                    bookingDetails.selectedServices.map((serviceName, index) => {
                      const serviceObj = services.find(s => s.name === serviceName);
                      const price = serviceObj?.price || 500;
                      
                      return (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{serviceName}</span>
                          <span>₹{price}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-medium">
                  <span>Total</span>
                  <span className="text-primary">₹{totalCost}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Payment will be collected at the center</p>
              </div>
            )}
            
            {/* Submit Button */}
            <div className="mt-6">
              {isAuthenticated() ? (
                <button 
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-3 ${submitting ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'} text-white font-semibold rounded-md transition-colors`}
                >
                  {submitting ? 'Processing...' : 'Book Appointment'}
                </button>
              ) : (
                <div>
                  <button 
                    type="button"
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
            </div>
          </form>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
        onSuccess={handleAuthSuccess}
        message="Please sign in to complete your booking"
      />
    </div>
  );
};

export default GroomingBooking; 