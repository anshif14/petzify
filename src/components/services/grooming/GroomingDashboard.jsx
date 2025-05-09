import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, app } from '../../../firebase';
import { useUser } from '../../../context/UserContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { getFirestore } from 'firebase/firestore';

const GroomingDashboard = () => {
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [centerInfo, setCenterInfo] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [responseText, setResponseText] = useState('');
  const [respondingTo, setRespondingTo] = useState(null);
  
  // Profile update states
  const [profileForm, setProfileForm] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileUpdating, setProfileUpdating] = useState(false);
  
  // Services management states
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [newService, setNewService] = useState({ name: '', description: '', price: '' });
  const [newPackage, setNewPackage] = useState({ 
    name: '', 
    description: '', 
    price: '',
    services: [] 
  });
  const [editingService, setEditingService] = useState(null);
  const [editingPackage, setEditingPackage] = useState(null);
  const [addingService, setAddingService] = useState(false);
  const [addingPackage, setAddingPackage] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.email) {
      fetchGroomingCenter();
    }
  }, [currentUser]);

  useEffect(() => {
    if (centerInfo) {
      fetchBookingsAndReviews();
      
      // Populate profile form with center info
      setProfileForm({
        name: centerInfo.name || '',
        description: centerInfo.description || '',
        phone: centerInfo.phone || '',
        email: centerInfo.email || '',
        address: centerInfo.address || '',
        website: centerInfo.website || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Set services from center info
      if (centerInfo.services) {
        const formattedServices = centerInfo.services.map(service => {
          // Handle both string services and object services
          if (typeof service === 'string') {
            return {
              id: service.toLowerCase().replace(/\s+/g, '-'),
              name: service,
              price: '500', // Default price
              description: ''
            };
          } else {
            return service;
          }
        });
        setServices(formattedServices);
      }
      
      // Set packages from center info if available
      if (centerInfo.packages) {
        setPackages(centerInfo.packages);
      }
    }
  }, [centerInfo, activeTab]);

  const fetchGroomingCenter = async () => {
    try {
      const centersRef = collection(db, 'groomingCenters');
      const q = query(
        centersRef,
        where('email', '==', currentUser.email),
        where('status', '==', 'approved')
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const centerDoc = querySnapshot.docs[0];
        setCenterInfo({
          id: centerDoc.id,
          ...centerDoc.data()
        });
      } else {
        // No approved center found for this user
        setCenterInfo(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching grooming center:', error);
      toast.error('Failed to load your grooming center information');
      setLoading(false);
    }
  };

  const fetchBookingsAndReviews = async () => {
    setLoading(true);
    
    try {
      // Fetch bookings based on active tab
      const bookingsRef = collection(db, 'groomingBookings');
      let bookingsQuery;
      
      const now = new Date();
      
      if (activeTab === 'upcoming') {
        bookingsQuery = query(
          bookingsRef,
          where('centerId', '==', centerInfo.id),
          where('status', 'in', ['confirmed', 'pending']),
          where('appointmentDate', '>=', now)
        );
      } else if (activeTab === 'past') {
        bookingsQuery = query(
          bookingsRef,
          where('centerId', '==', centerInfo.id),
          where('appointmentDate', '<', now)
        );
      } else if (activeTab === 'cancelled') {
        bookingsQuery = query(
          bookingsRef,
          where('centerId', '==', centerInfo.id),
          where('status', '==', 'cancelled')
        );
      }
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = [];
      
      for (const bookingDoc of bookingsSnapshot.docs) {
        const bookingData = {
          id: bookingDoc.id,
          ...bookingDoc.data(),
          appointmentDate: bookingDoc.data().appointmentDate?.toDate() || null
        };
        
        // Fetch customer details
        if (bookingData.customerEmail) {
          try {
            const userRef = doc(db, 'users', bookingData.customerEmail);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              bookingData.customer = {
                name: userDoc.data().name || 'Customer',
                phone: userDoc.data().phone || '',
                profilePic: userDoc.data().profilePic || ''
              };
            }
          } catch (error) {
            console.error('Error fetching customer details:', error);
          }
        }
        
        bookingsData.push(bookingData);
      }
      
      setBookings(bookingsData);
      
      // Fetch reviews if on the reviews tab
      if (activeTab === 'reviews') {
        const reviewsRef = collection(db, 'groomingReviews');
        const reviewsQuery = query(
          reviewsRef,
          where('centerId', '==', centerInfo.id)
        );
        
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsData = [];
        
        for (const reviewDoc of reviewsSnapshot.docs) {
          const reviewData = {
            id: reviewDoc.id,
            ...reviewDoc.data(),
            createdAt: reviewDoc.data().createdAt?.toDate() || new Date()
          };
          
          // Fetch customer details for the review
          if (reviewData.customerEmail) {
            try {
              const userRef = doc(db, 'users', reviewData.customerEmail);
              const userDoc = await getDoc(userRef);
              
              if (userDoc.exists()) {
                reviewData.customer = {
                  name: userDoc.data().name || 'Customer',
                  profilePic: userDoc.data().profilePic || ''
                };
              }
            } catch (error) {
              console.error('Error fetching customer details for review:', error);
            }
          }
          
          reviewsData.push(reviewData);
        }
        
        // Sort reviews by date (newest first)
        reviewsData.sort((a, b) => b.createdAt - a.createdAt);
        setReviews(reviewsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      const bookingRef = doc(db, 'groomingBookings', bookingId);
      await updateDoc(bookingRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: newStatus } 
          : booking
      ));
      
      toast.success(`Booking ${newStatus} successfully`);
      
      // Send email notification to customer
      await sendBookingStatusNotification(
        bookings.find(b => b.id === bookingId),
        newStatus
      );
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const sendBookingStatusNotification = async (booking, status) => {
    // Implementation would depend on your email system
    console.log(`Email notification would be sent to ${booking.customerEmail} about ${status} status`);
    // In a real implementation, you might call an API or cloud function
  };

  const submitReviewResponse = async (reviewId) => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }
    
    try {
      const reviewRef = doc(db, 'groomingReviews', reviewId);
      await updateDoc(reviewRef, {
        ownerResponse: {
          text: responseText,
          createdAt: serverTimestamp()
        }
      });
      
      // Update local state
      setReviews(reviews.map(review => 
        review.id === reviewId 
          ? { 
              ...review, 
              ownerResponse: {
                text: responseText,
                createdAt: new Date()
              } 
            } 
          : review
      ));
      
      setResponseText('');
      setRespondingTo(null);
      
      toast.success('Response submitted successfully');
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return format(date, 'MMM dd, yyyy');
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    return format(date, 'hh:mm a');
  };

  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Update grooming center profile
  const updateProfile = async (e) => {
    e.preventDefault();
    setProfileUpdating(true);
    
    try {
      const db = getFirestore(app);
      const centerRef = doc(db, 'groomingCenters', centerInfo.id);
      
      // Data to update
      const updateData = {
        name: profileForm.name,
        description: profileForm.description,
        phone: profileForm.phone,
        email: profileForm.email,
        address: profileForm.address,
        website: profileForm.website,
        updatedAt: serverTimestamp()
      };
      
      // Check if password update is requested
      if (profileForm.newPassword) {
        // Validate current password (simplified example - in production, you would implement proper authentication)
        if (!profileForm.currentPassword) {
          toast.error('Please enter your current password');
          setProfileUpdating(false);
          return;
        }
        
        // Validate new password
        if (profileForm.newPassword.length < 6) {
          toast.error('New password must be at least 6 characters');
          setProfileUpdating(false);
          return;
        }
        
        // Validate password confirmation
        if (profileForm.newPassword !== profileForm.confirmPassword) {
          toast.error('New passwords do not match');
          setProfileUpdating(false);
          return;
        }
        
        // Update password (in a real app, you would need to validate the current password)
        // For simplicity, we're just updating the password without verification
        updateData.password = profileForm.newPassword;
      }
      
      // Update profile in Firestore
      await updateDoc(centerRef, updateData);
      
      // Update local state with new information
      setCenterInfo(prev => ({
        ...prev,
        ...updateData
      }));
      
      // Reset password fields
      setProfileForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setProfileUpdating(false);
    }
  };

  // Handle service form changes
  const handleServiceChange = (e) => {
    const { name, value } = e.target;
    setNewService(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle package form changes
  const handlePackageChange = (e) => {
    const { name, value } = e.target;
    setNewPackage(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Toggle service selection for package
  const toggleServiceForPackage = (serviceId) => {
    setNewPackage(prev => {
      if (prev.services.includes(serviceId)) {
        return {
          ...prev,
          services: prev.services.filter(id => id !== serviceId)
        };
      } else {
        return {
          ...prev,
          services: [...prev.services, serviceId]
        };
      }
    });
  };
  
  // Add new service
  const addService = async () => {
    if (!newService.name || !newService.price) {
      toast.error('Service name and price are required');
      return;
    }
    
    try {
      const db = getFirestore(app);
      const centerRef = doc(db, 'groomingCenters', centerInfo.id);
      
      // Create new service with ID
      const serviceId = newService.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      const serviceData = {
        id: serviceId,
        name: newService.name,
        description: newService.description || '',
        price: newService.price
      };
      
      // Add to services array
      const updatedServices = [...services, serviceData];
      
      // Update in Firestore
      await updateDoc(centerRef, {
        services: updatedServices,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setServices(updatedServices);
      setNewService({ name: '', description: '', price: '' });
      setAddingService(false);
      
      toast.success('Service added successfully');
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Failed to add service');
    }
  };
  
  // Update existing service
  const updateService = async (service) => {
    if (!service.name || !service.price) {
      toast.error('Service name and price are required');
      return;
    }
    
    try {
      const db = getFirestore(app);
      const centerRef = doc(db, 'groomingCenters', centerInfo.id);
      
      // Update service in array
      const updatedServices = services.map(s => 
        s.id === service.id ? service : s
      );
      
      // Update in Firestore
      await updateDoc(centerRef, {
        services: updatedServices,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setServices(updatedServices);
      setEditingService(null);
      
      toast.success('Service updated successfully');
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Failed to update service');
    }
  };
  
  // Remove service
  const removeService = async (serviceId) => {
    try {
      const db = getFirestore(app);
      const centerRef = doc(db, 'groomingCenters', centerInfo.id);
      
      // Remove from services array
      const updatedServices = services.filter(s => s.id !== serviceId);
      
      // Update in Firestore
      await updateDoc(centerRef, {
        services: updatedServices,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setServices(updatedServices);
      
      toast.success('Service removed successfully');
    } catch (error) {
      console.error('Error removing service:', error);
      toast.error('Failed to remove service');
    }
  };
  
  // Add new package
  const addPackage = async () => {
    if (!newPackage.name || !newPackage.price || newPackage.services.length === 0) {
      toast.error('Package name, price, and at least one service are required');
      return;
    }
    
    try {
      const db = getFirestore(app);
      const centerRef = doc(db, 'groomingCenters', centerInfo.id);
      
      // Create new package with ID
      const packageId = newPackage.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      const packageData = {
        id: packageId,
        name: newPackage.name,
        description: newPackage.description || '',
        price: newPackage.price,
        services: newPackage.services
      };
      
      // Add to packages array
      const updatedPackages = [...packages, packageData];
      
      // Update in Firestore
      await updateDoc(centerRef, {
        packages: updatedPackages,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setPackages(updatedPackages);
      setNewPackage({ name: '', description: '', price: '', services: [] });
      setAddingPackage(false);
      
      toast.success('Package added successfully');
    } catch (error) {
      console.error('Error adding package:', error);
      toast.error('Failed to add package');
    }
  };
  
  // Update existing package
  const updatePackage = async (pkg) => {
    if (!pkg.name || !pkg.price || pkg.services.length === 0) {
      toast.error('Package name, price, and at least one service are required');
      return;
    }
    
    try {
      const db = getFirestore(app);
      const centerRef = doc(db, 'groomingCenters', centerInfo.id);
      
      // Update package in array
      const updatedPackages = packages.map(p => 
        p.id === pkg.id ? pkg : p
      );
      
      // Update in Firestore
      await updateDoc(centerRef, {
        packages: updatedPackages,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setPackages(updatedPackages);
      setEditingPackage(null);
      
      toast.success('Package updated successfully');
    } catch (error) {
      console.error('Error updating package:', error);
      toast.error('Failed to update package');
    }
  };
  
  // Remove package
  const removePackage = async (packageId) => {
    try {
      const db = getFirestore(app);
      const centerRef = doc(db, 'groomingCenters', centerInfo.id);
      
      // Remove from packages array
      const updatedPackages = packages.filter(p => p.id !== packageId);
      
      // Update in Firestore
      await updateDoc(centerRef, {
        packages: updatedPackages,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setPackages(updatedPackages);
      
      toast.success('Package removed successfully');
    } catch (error) {
      console.error('Error removing package:', error);
      toast.error('Failed to remove package');
    }
  };

  if (loading && !centerInfo) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!centerInfo) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Approved Grooming Center Found</h3>
        <p className="text-gray-600 mb-4">
          You don't have an approved grooming center associated with your account.
        </p>
        <p className="text-gray-600">
          If you've already submitted a registration, please wait for admin approval. Otherwise, you can register your grooming center on the Pet Grooming page.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Center Header */}
      <div className="bg-gray-50 p-6 border-b">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{centerInfo.name}</h1>
            <p className="text-gray-600 mt-1">{centerInfo.type}</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <div className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
              Approved
            </div>
            <div className="flex items-center">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
              </svg>
              <span className="ml-1 font-medium text-gray-900">4.8</span>
              <span className="ml-1 text-gray-500">(24 reviews)</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs Navigation */}
      <div className="border-b">
        <div className="flex overflow-x-auto">
          <button
            className={`px-6 py-3 text-sm font-medium ${activeTab === 'upcoming' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Bookings
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium ${activeTab === 'past' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('past')}
          >
            Past Bookings
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium ${activeTab === 'cancelled' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium ${activeTab === 'reviews' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium ${activeTab === 'services' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('services')}
          >
            Services & Pricing
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium ${activeTab === 'profile' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      {loading ? (
        <div className="p-8 flex justify-center">
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : activeTab === 'reviews' ? (
        // Reviews Tab
        <div className="p-6">
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
              <p className="text-gray-600">
                You haven't received any reviews for your grooming center yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map(review => (
                <div key={review.id} className="border rounded-lg p-4">
                  <div className="flex items-start mb-4">
                    <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden mr-4">
                      {review.customer?.profilePic ? (
                        <img src={review.customer.profilePic} alt={review.customer?.name || 'Customer'} className="h-full w-full object-cover" />
                      ) : (
                        <svg className="h-full w-full text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{review.customer?.name || 'Customer'}</h4>
                          <div className="flex items-center mt-1">
                            {[...Array(5)].map((_, i) => (
                              <svg 
                                key={i} 
                                className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`} 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="ml-2 text-sm text-gray-500">
                              {format(review.createdAt, 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-500">
                          {review.serviceType || 'Grooming Service'}
                        </div>
                      </div>
                      <p className="mt-3 text-gray-700">{review.text}</p>
                      
                      {/* Owner Response */}
                      {review.ownerResponse ? (
                        <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mr-3">
                              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <h5 className="text-sm font-medium text-gray-900">Response from {centerInfo.name}</h5>
                                <span className="text-xs text-gray-500">
                                  {review.ownerResponse.createdAt && format(new Date(review.ownerResponse.createdAt), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-gray-700">{review.ownerResponse.text}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        respondingTo === review.id ? (
                          <div className="mt-4">
                            <textarea
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              placeholder="Write your response..."
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                            />
                            <div className="mt-2 flex justify-end space-x-3">
                              <button
                                onClick={() => {
                                  setRespondingTo(null);
                                  setResponseText('');
                                }}
                                className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => submitReviewResponse(review.id)}
                                className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
                              >
                                Submit Response
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRespondingTo(review.id)}
                            className="mt-3 text-sm text-primary hover:text-primary-dark font-medium"
                          >
                            Respond to this review
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'profile' ? (
        // Profile Management Tab
        <div className="p-6">
          <form onSubmit={updateProfile} className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Center Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Center Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profileForm.name}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileForm.email}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={profileForm.phone}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  Website (Optional)
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={profileForm.website}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={profileForm.address}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={profileForm.description}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password (Optional)</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={profileForm.currentPassword}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
                
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={profileForm.newPassword}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must be at least 6 characters
                  </p>
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={profileForm.confirmPassword}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className={`px-4 py-2 ${
                  profileUpdating
                    ? 'bg-gray-400'
                    : 'bg-primary hover:bg-primary-dark'
                } text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                disabled={profileUpdating}
              >
                {profileUpdating ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      ) : activeTab === 'services' ? (
        // Services & Pricing Management Tab
        <div className="p-6">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Services</h3>
              {!addingService && (
                <button
                  onClick={() => setAddingService(true)}
                  className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Add Service
                </button>
              )}
            </div>
            
            {/* Add Service Form */}
            {addingService && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Add New Service</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700 mb-1">
                      Service Name
                    </label>
                    <input
                      type="text"
                      id="serviceName"
                      name="name"
                      value={newService.name}
                      onChange={handleServiceChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="servicePrice" className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      id="servicePrice"
                      name="price"
                      value={newService.price}
                      onChange={handleServiceChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      required
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="serviceDescription" className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      id="serviceDescription"
                      name="description"
                      value={newService.description}
                      onChange={handleServiceChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAddingService(false)}
                    className="mr-3 px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addService}
                    className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    Add Service
                  </button>
                </div>
              </div>
            )}
            
            {/* Services List */}
            {services.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <h4 className="text-md font-medium text-gray-900 mb-2">No Services Added</h4>
                <p className="text-gray-600">
                  Add services to let your customers know what you offer.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {services.map(service => (
                      <tr key={service.id || service.name}>
                        {editingService && editingService.id === service.id ? (
                          // Edit mode
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="text"
                                value={editingService.name}
                                onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                required
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="text"
                                value={editingService.description}
                                onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                value={editingService.price}
                                onChange={(e) => setEditingService({ ...editingService, price: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                required
                                min="0"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => updateService(editingService)}
                                className="text-primary hover:text-primary-dark mr-3"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingService(null)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                            </td>
                          </>
                        ) : (
                          // View mode
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{service.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{service.description || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">₹{service.price}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => setEditingService(service)}
                                className="text-indigo-600 hover:text-indigo-900 mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => removeService(service.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Remove
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Packages Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Service Packages</h3>
              {!addingPackage && (
                <button
                  onClick={() => setAddingPackage(true)}
                  className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Add Package
                </button>
              )}
            </div>
            
            {/* Add Package Form */}
            {addingPackage && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Create New Package</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="packageName" className="block text-sm font-medium text-gray-700 mb-1">
                      Package Name
                    </label>
                    <input
                      type="text"
                      id="packageName"
                      name="name"
                      value={newPackage.name}
                      onChange={handlePackageChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="packagePrice" className="block text-sm font-medium text-gray-700 mb-1">
                      Package Price (₹)
                    </label>
                    <input
                      type="number"
                      id="packagePrice"
                      name="price"
                      value={newPackage.price}
                      onChange={handlePackageChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      required
                      min="0"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label htmlFor="packageDescription" className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      id="packageDescription"
                      name="description"
                      rows={2}
                      value={newPackage.description}
                      onChange={handlePackageChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Services for this Package
                  </label>
                  {services.length === 0 ? (
                    <p className="text-sm text-red-600">You need to add services before creating a package.</p>
                  ) : (
                    <div className="bg-white p-3 border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                      {services.map(service => (
                        <div key={service.id} className="flex items-center mb-2 last:mb-0">
                          <input
                            type="checkbox"
                            id={`service-${service.id}`}
                            checked={newPackage.services.includes(service.id)}
                            onChange={() => toggleServiceForPackage(service.id)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <label htmlFor={`service-${service.id}`} className="ml-2 block text-sm text-gray-900">
                            {service.name} - ₹{service.price}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAddingPackage(false)}
                    className="mr-3 px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addPackage}
                    className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
                    disabled={services.length === 0}
                  >
                    Create Package
                  </button>
                </div>
              </div>
            )}
            
            {/* Packages List */}
            {packages.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <h4 className="text-md font-medium text-gray-900 mb-2">No Packages Created</h4>
                <p className="text-gray-600">
                  Create service packages to offer bundled services at special prices.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map(pkg => (
                  <div key={pkg.id} className="bg-white rounded-lg shadow p-6 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <h4 className="text-lg font-medium text-gray-900">{pkg.name}</h4>
                      <div className="text-lg font-bold text-primary">₹{pkg.price}</div>
                    </div>
                    
                    {pkg.description && (
                      <p className="mt-2 text-sm text-gray-600">{pkg.description}</p>
                    )}
                    
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Included Services:</h5>
                      <ul className="space-y-1">
                        {pkg.services.map(serviceId => {
                          const service = services.find(s => s.id === serviceId);
                          return service ? (
                            <li key={serviceId} className="text-sm text-gray-600 flex items-center">
                              <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {service.name}
                            </li>
                          ) : null;
                        })}
                      </ul>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                      <button
                        onClick={() => setEditingPackage(pkg)}
                        className="text-indigo-600 hover:text-indigo-900 text-sm mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removePackage(pkg.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Bookings Tabs
        <div className="p-6">
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
              <p className="text-gray-600">
                {activeTab === 'upcoming' 
                  ? "You don't have any upcoming bookings."
                  : activeTab === 'past'
                  ? "You don't have any past bookings."
                  : "You don't have any cancelled bookings."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    {activeTab === 'upcoming' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map(booking => (
                    <tr key={booking.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            {booking.customer?.profilePic ? (
                              <img src={booking.customer.profilePic} alt={booking.customer?.name} className="h-full w-full object-cover" />
                            ) : (
                              <svg className="h-full w-full text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{booking.customer?.name || booking.customerName || 'Customer'}</div>
                            <div className="text-sm text-gray-500">{booking.customerEmail}</div>
                            {booking.customer?.phone && (
                              <div className="text-sm text-gray-500">{booking.customer.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{booking.serviceType || 'Grooming Service'}</div>
                        <div className="text-sm text-gray-500">{booking.petDetails?.name ? `Pet: ${booking.petDetails.name}` : ''}</div>
                        <div className="text-sm text-gray-500">{booking.petDetails?.breed ? `Breed: ${booking.petDetails.breed}` : ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(booking.appointmentDate)}</div>
                        <div className="text-sm text-gray-500">{formatTime(booking.appointmentDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                        </span>
                      </td>
                      {activeTab === 'upcoming' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-3">
                            {booking.status === 'pending' && (
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                className="text-green-600 hover:text-green-900"
                              >
                                Confirm
                              </button>
                            )}
                            {(booking.status === 'pending' || booking.status === 'confirmed') && (
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Cancel
                              </button>
                            )}
                            {booking.status === 'confirmed' && (
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'completed')}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Mark Complete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroomingDashboard; 