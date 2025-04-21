import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config.js';

const BoardingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({
    dateFrom: '',
    dateTo: '',
    petType: '',
    petSize: '',
    petName: '',
    notes: ''
  });
  const [totalDays, setTotalDays] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Fetch boarding center details
  useEffect(() => {
    const fetchBoardingCenter = async () => {
      try {
        setLoading(true);
        const centerRef = doc(db, 'petBoardingCenters', id);
        const centerSnap = await getDoc(centerRef);
        
        if (centerSnap.exists()) {
          const centerData = { id: centerSnap.id, ...centerSnap.data() };
          setCenter(centerData);
          
          // Pre-fill pet type and size if available in URL params
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.has('dateFrom')) {
            setBookingDetails(prev => ({ ...prev, dateFrom: urlParams.get('dateFrom') }));
          }
          if (urlParams.has('dateTo')) {
            setBookingDetails(prev => ({ ...prev, dateTo: urlParams.get('dateTo') }));
          }
          if (urlParams.has('petType')) {
            setBookingDetails(prev => ({ ...prev, petType: urlParams.get('petType') }));
          }
          if (urlParams.has('petSize')) {
            setBookingDetails(prev => ({ ...prev, petSize: urlParams.get('petSize') }));
          }
        } else {
          setError('Boarding center not found');
        }
      } catch (err) {
        console.error('Error fetching boarding center:', err);
        setError('Failed to load boarding center details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBoardingCenter();
      getUserLocation();
    }
    
    // Scroll to top on page load
    window.scrollTo(0, 0);
  }, [id]);

  // Get user's location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log('Error getting location:', error);
        }
      );
    }
  };

  // Calculate booking days and total cost when dates change
  useEffect(() => {
    calculateBookingCost();
  }, [bookingDetails.dateFrom, bookingDetails.dateTo, bookingDetails.petSize, center]);

  const calculateBookingCost = () => {
    if (!bookingDetails.dateFrom || !bookingDetails.dateTo || !center) {
      setTotalDays(0);
      setTotalCost(0);
      return;
    }

    const startDate = new Date(bookingDetails.dateFrom);
    const endDate = new Date(bookingDetails.dateTo);
    
    // Calculate days difference
    const timeDiff = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (days <= 0) {
      setTotalDays(0);
      setTotalCost(0);
      return;
    }
    
    setTotalDays(days);
    
    // Use the perDayCharge field for pricing
    const baseRate = center.perDayCharge || 0;
    setTotalCost(baseRate * days);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Navigate to booking confirmation page with details
    const params = new URLSearchParams({
      centerId: center.id,
      centerName: center.centerName,
      dateFrom: bookingDetails.dateFrom,
      dateTo: bookingDetails.dateTo,
      petType: bookingDetails.petType,
      petSize: bookingDetails.petSize,
      petName: bookingDetails.petName,
      notes: bookingDetails.notes,
      totalDays,
      totalCost
    });
    
    // In a real app you would save the booking to Firestore
    // For now, just show a confirmation alert
    alert('Booking request submitted successfully!');
    // navigate(`/booking-confirmation?${params.toString()}`);
  };

  const formatTime = (time) => {
    if (!time) return 'Not specified';
    
    try {
      const [hours, minutes] = time.split(':');
      const parsedHours = parseInt(hours, 10);
      const period = parsedHours >= 12 ? 'PM' : 'AM';
      const displayHours = parsedHours > 12 ? parsedHours - 12 : parsedHours === 0 ? 12 : parsedHours;
      return `${displayHours}:${minutes} ${period}`;
    } catch (err) {
      return time;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold mb-2">Loading</h3>
          <p className="text-gray-600">Please wait while we fetch the boarding center details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <svg className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">Boarding Center Not Found</h3>
          <p className="text-gray-600 mb-6">The boarding center you're looking for doesn't exist or may have been removed.</p>
          <Link
            to="/services/boarding"
            className="inline-block px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Browse All Boarding Centers
          </Link>
        </div>
      </div>
    );
  }

  if (!center) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Center Image */}
      <div className="relative h-64 md:h-80">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 to-primary/20 z-10"></div>
        <img 
          src={center.galleryImageURLs?.[0] || center.profilePictureURL || 'https://doggyvilleindia.in/wp-content/uploads/2024/09/how-to-choose-the-best-dog-boarding-facility-for-your-pet.jpg'} 
          alt={center.centerName} 
          className="w-full h-full object-cover"
        />
        {/*<div className="absolute top-0 left-0 w-full p-4 z-20">*/}
        {/*  <Link*/}
        {/*    to="/services/boarding"*/}
        {/*    className="inline-flex items-center px-3 py-1 bg-white/80 backdrop-blur-sm text-primary rounded-md hover:bg-white"*/}
        {/*  >*/}
        {/*    <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">*/}
        {/*      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />*/}
        {/*    </svg>*/}
        {/*    Back*/}
        {/*  </Link>*/}
        {/*</div>*/}
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Boarding Center Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex items-center mb-4">
                {center.profilePictureURL && (
                  <img 
                    src={center.profilePictureURL} 
                    alt={center.centerName} 
                    className="w-16 h-16 rounded-full mr-4 object-cover border-2 border-primary"
                  />
                )}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{center.centerName}</h1>
                  <p className="text-sm text-gray-500">Owned by {center.ownerName || 'Not specified'}</p>
                </div>
              </div>
              
              {/* Status badge */}
              <div className="mb-4">
                {center.isAvailable ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
                    Available for Booking
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <span className="w-2 h-2 mr-1 bg-red-500 rounded-full"></span>
                    Currently Unavailable
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-2 py-4 border-t border-b border-gray-200 mb-6">
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Price</p>
                  <p className="font-semibold text-lg">₹{center.perDayCharge || 0}/day</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Capacity</p>
                  <p className="font-medium">{center.capacity || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Hours</p>
                  <p className="font-medium">{formatTime(center.openingTime)} - {formatTime(center.closingTime)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Age Limit</p>
                  <p className="font-medium">{center.petAgeLimit || 'No limit'}</p>
                </div>
              </div>

              <h2 className="text-xl font-semibold mb-3">About</h2>
              <p className="text-gray-700 mb-6">
                {center.description || 'No description available for this boarding center.'}
              </p>
              
              {center.holidayNotice && (
                <div className="bg-yellow-50 p-4 rounded-md mb-6">
                  <h3 className="font-medium text-yellow-800 mb-1">Holiday Notice</h3>
                  <p className="text-yellow-700 text-sm">{center.holidayNotice}</p>
                </div>
              )}

              <h2 className="text-xl font-semibold mb-3">Pets Accepted</h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {center.petTypesAccepted && Object.entries(center.petTypesAccepted)
                  .filter(([_, accepted]) => accepted)
                  .map(([type]) => (
                    <span key={type} className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  ))
                }
                {(!center.petTypesAccepted || Object.values(center.petTypesAccepted).every(v => !v)) && (
                  <span className="text-gray-500">No pet types specified</span>
                )}
              </div>

              {center.petSizeLimit && center.petSizeLimit.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Accepted Pet Sizes</h3>
                  <div className="flex flex-wrap gap-2">
                    {center.petSizeLimit.map(size => (
                      <span key={size} className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <h2 className="text-xl font-semibold mb-3">Services Offered</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {center.servicesOffered && Object.entries(center.servicesOffered)
                  .filter(([_, offered]) => offered)
                  .map(([service]) => (
                    <div key={service} className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="capitalize">{service.replace(/([A-Z])/g, ' $1')}</span>
                    </div>
                  ))
                }
              </div>

              <h2 className="text-xl font-semibold mb-3">Requirements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <div className="flex items-center">
                  <svg className={`h-5 w-5 ${center.vaccinationRequired ? 'text-green-500' : 'text-red-500'} mr-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {center.vaccinationRequired 
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    }
                  </svg>
                  <span>Vaccination {center.vaccinationRequired ? 'Required' : 'Not Required'}</span>
                </div>
                <div className="flex items-center">
                  <svg className={`h-5 w-5 ${center.petFoodProvided ? 'text-green-500' : 'text-red-500'} mr-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {center.petFoodProvided 
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    }
                  </svg>
                  <span>Food {center.petFoodProvided ? 'Provided' : 'Not Provided'}</span>
                </div>
                <div className="flex items-center">
                  <svg className={`h-5 w-5 ${center.pickupDropAvailable ? 'text-green-500' : 'text-red-500'} mr-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {center.pickupDropAvailable 
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    }
                  </svg>
                  <span>Pickup/Drop {center.pickupDropAvailable ? 'Available' : 'Not Available'}</span>
                </div>
              </div>

              <h2 className="text-xl font-semibold mb-3">Location</h2>
              <div className="bg-gray-50 p-4 rounded-md mb-6">
                <p className="font-medium mb-2">
                  {center.address}, {center.city}, {center.pincode}
                </p>
                {center.latitude && center.longitude && (
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    View on Google Maps
                  </a>
                )}
              </div>

              <h2 className="text-xl font-semibold mb-3">Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {center.phoneNumber && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${center.phoneNumber}`} className="text-primary hover:underline">{center.phoneNumber}</a>
                  </div>
                )}
                {center.email && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${center.email}`} className="text-primary hover:underline">{center.email}</a>
                  </div>
                )}
                {center.website && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <a href={`https://${center.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{center.website}</a>
                  </div>
                )}
              </div>
            </div>

            {/* Photo Gallery */}
            {center.galleryImageURLs && center.galleryImageURLs.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Photo Gallery</h2>
                
                {/* Main Image */}
                <div className="relative mb-4 rounded-lg overflow-hidden bg-gray-100 h-64 md:h-80">
                  <img 
                    src={center.galleryImageURLs[activeImageIndex]}
                    alt={`${center.centerName} - Gallery ${activeImageIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Navigation arrows */}
                  {center.galleryImageURLs.length > 1 && (
                    <>
                      <button 
                        onClick={() => setActiveImageIndex(prev => (prev === 0 ? center.galleryImageURLs.length - 1 : prev - 1))}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => setActiveImageIndex(prev => (prev === center.galleryImageURLs.length - 1 ? 0 : prev + 1))}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                
                {/* Thumbnails */}
                <div className="grid grid-cols-5 gap-2">
                  {center.galleryImageURLs.map((image, index) => (
                    <img 
                      key={index}
                      src={image}
                      alt={`${center.centerName} - Thumbnail ${index + 1}`}
                      className={`w-full h-16 object-cover rounded-md cursor-pointer transition-all ${activeImageIndex === index ? 'border-2 border-primary ring-2 ring-primary ring-opacity-50' : 'border border-gray-200 opacity-70 hover:opacity-100'}`}
                      onClick={() => setActiveImageIndex(index)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4">Book This Center</h2>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                  <input
                    type="date"
                    id="dateFrom"
                    name="dateFrom"
                    value={bookingDetails.dateFrom}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                  <input
                    type="date"
                    id="dateTo"
                    name="dateTo"
                    value={bookingDetails.dateTo}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    min={bookingDetails.dateFrom || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                
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
                    {center.petTypesAccepted?.dog && <option value="dog">Dog</option>}
                    {center.petTypesAccepted?.cat && <option value="cat">Cat</option>}
                    {center.petTypesAccepted?.bird && <option value="bird">Bird</option>}
                    {center.petTypesAccepted?.rabbit && <option value="rabbit">Rabbit</option>}
                    {center.petTypesAccepted?.other && <option value="other">Other</option>}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Please confirm with the boarding center if they accommodate your specific pet type</p>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="petSize" className="block text-sm font-medium text-gray-700 mb-1">Pet Size</label>
                  <select
                    id="petSize"
                    name="petSize"
                    value={bookingDetails.petSize}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="">Select pet size</option>
                    {center.petSizeLimit?.includes('small') && <option value="small">Small (up to 10kg)</option>}
                    {center.petSizeLimit?.includes('medium') && <option value="medium">Medium (10-25kg)</option>}
                    {center.petSizeLimit?.includes('large') && <option value="large">Large (25kg+)</option>}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">For appropriate accommodation arrangement</p>
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
                
                <div className="mb-6">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={bookingDetails.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Any special needs, dietary requirements, etc."
                  ></textarea>
                </div>
                
                {totalDays > 0 && (
                  <div className="bg-gray-50 p-4 rounded-md mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700">Duration:</span>
                      <span className="font-medium">{totalDays} {totalDays === 1 ? 'day' : 'days'}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-gray-700">Total Cost:</span>
                      <span>₹{totalCost}</span>
                    </div>
                  </div>
                )}
                
                <button
                  type="submit"
                  className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Book Now
                </button>
              </form>
              
              <div className="mt-4 text-sm text-gray-500">
                <p>By booking, you agree to our terms and cancellation policy.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardingDetail; 