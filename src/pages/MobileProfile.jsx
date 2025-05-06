import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '../firebase/config';
import { useUser } from '../context/UserContext';
import { useAlert } from '../context/AlertContext';
import MobileBottomNav from '../components/common/MobileBottomNav';
import AuthModal from '../components/auth/AuthModal';

const MobileProfile = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const { currentUser, isAuthenticated, authInitialized } = useUser();
  const { showSuccess, showError } = useAlert();
  const navigate = useNavigate();
  const [hasGroomingCenter, setHasGroomingCenter] = useState(false);

  // Profile data state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    location: '',
    bio: '',
  });

  // Order, bookings, pets, addresses data states
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [pets, setPets] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (authInitialized && !isAuthenticated()) {
      setShowAuthModal(true);
    }
  }, [authInitialized, isAuthenticated]);

  useEffect(() => {
    if (currentUser) {
      fetchUserData();
      checkGroomingCenter();
    }
  }, [currentUser]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      // Fetch profile data first
      if (activeTab === 'profile') {
        const userDoc = await getDoc(doc(db, 'users', currentUser.email));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfileData({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            avatar: userData.avatar || '',
            location: userData.city ? `${userData.city}, ${userData.state || ''}` : '',
            bio: userData.bio || 'Pet lover and proud parent',
          });
          setWalletBalance(userData.walletBalance || 0);
        }
      }
      
      // Fetch orders if needed
      if (activeTab === 'orders') {
        const ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', currentUser.email)
        );
        const orderSnapshot = await getDocs(ordersQuery);
        const ordersList = [];
        orderSnapshot.forEach((doc) => {
          ordersList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setOrders(ordersList);
      }
      
      // Fetch bookings if needed
      if (activeTab === 'bookings') {
        console.log("Fetching bookings for:", currentUser.email);
        
        // Try both 'appointments' and 'bookings' collections
        let bookingsList = [];
        
        // Try appointments collection first
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('userEmail', '==', currentUser.email)
        );
        const appointmentSnapshot = await getDocs(appointmentsQuery);
        console.log("Appointments results:", appointmentSnapshot.size);
        
        appointmentSnapshot.forEach((doc) => {
          bookingsList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // If no results, try bookings collection
        if (bookingsList.length === 0) {
          const bookingsQuery = query(
            collection(db, 'bookings'),
            where('userEmail', '==', currentUser.email)
          );
          const bookingSnapshot = await getDocs(bookingsQuery);
          console.log("Bookings results:", bookingSnapshot.size);
          
          bookingSnapshot.forEach((doc) => {
            bookingsList.push({
              id: doc.id,
              ...doc.data()
            });
          });
        }
        
        // If still no results, try with userId instead of userEmail
        if (bookingsList.length === 0) {
          const userIdQuery = query(
            collection(db, 'appointments'),
            where('userId', '==', currentUser.email)
          );
          const userIdSnapshot = await getDocs(userIdQuery);
          console.log("UserID appointments results:", userIdSnapshot.size);
          
          userIdSnapshot.forEach((doc) => {
            bookingsList.push({
              id: doc.id,
              ...doc.data()
            });
          });
        }
        
        // Add mock data for testing if no bookings found
        if (bookingsList.length === 0 && process.env.NODE_ENV !== 'production') {
          console.log("Adding mock booking data for testing");
          bookingsList = [
            {
              id: 'mock-booking-1',
              serviceType: 'Veterinary Checkup',
              appointmentDate: new Date().toISOString().split('T')[0],
              appointmentTime: '10:00 AM',
              status: 'confirmed',
              doctorName: 'Dr. Smith',
              petName: 'Max'
            }
          ];
        }
        
        console.log("Final bookings list:", bookingsList);
        setBookings(bookingsList);
      }
      
      // Fetch addresses if needed
      if (activeTab === 'addresses') {
        const addressesQuery = query(
          collection(db, 'addresses'),
          where('userId', '==', currentUser.email)
        );
        const addressSnapshot = await getDocs(addressesQuery);
        const addressesList = [];
        addressSnapshot.forEach((doc) => {
          addressesList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setAddresses(addressesList);
      }
      
      // Fetch pets if needed
      if (activeTab === 'pets') {
        const petsQuery = query(
          collection(db, 'pets'),
          where('ownerEmail', '==', currentUser.email)
        );
        const petsSnapshot = await getDocs(petsQuery);
        const petsList = [];
        petsSnapshot.forEach((doc) => {
          petsList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setPets(petsList);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const checkGroomingCenter = async () => {
    if (!currentUser || !currentUser.email) return;
    
    try {
      const db = getFirestore(app);
      const groomingCentersRef = collection(db, 'groomingCenters');
      
      const q = query(
        groomingCentersRef,
        where('email', '==', currentUser.email),
        where('status', '==', 'approved')
      );
      
      const querySnapshot = await getDocs(q);
      setHasGroomingCenter(!querySnapshot.empty);
    } catch (error) {
      console.error('Error checking grooming center:', error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  // Handle viewing order details
  const handleViewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatDate = (dateInput) => {
    if (!dateInput) return 'No date available';
    
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      
      // Handle Firestore timestamp object
      if (dateInput && typeof dateInput === 'object' && dateInput.toDate) {
        return dateInput.toDate().toLocaleDateString(undefined, options);
      }
      
      // Handle string date formats
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) {
        console.log("Invalid date input:", dateInput);
        return 'Invalid date';
      }
      
      return date.toLocaleDateString(undefined, options);
    } catch (error) {
      console.error("Error formatting date:", error, dateInput);
      return 'Date error';
    }
  };

  return (
    <div className="pb-16 bg-gray-50 min-h-screen">
      {/* Profile header */}
      <div className="bg-white pt-6 pb-8 px-4">
        <div className="flex items-center">
          <div className="w-20 h-20 rounded-full overflow-hidden mr-5 border-2 border-white shadow-lg">
            {profileData.avatar ? (
              <img src={profileData.avatar} alt={profileData.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary text-white text-2xl font-bold">
                {profileData.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profileData.name}</h1>
            {profileData.location && (
              <p className="text-sm text-gray-500 mt-1">{profileData.location}</p>
            )}
            {profileData.bio && (
              <p className="text-sm mt-2 text-gray-700">{profileData.bio}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="bg-white px-4 py-2 sticky top-0 z-10 shadow-sm">
        <div className="flex overflow-x-auto scrollbar-hide">
          <button
            onClick={() => handleTabChange('profile')}
            className={`flex-shrink-0 px-4 py-2 mr-2 rounded-full font-medium ${
              activeTab === 'profile' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => handleTabChange('addresses')}
            className={`flex-shrink-0 px-4 py-2 mr-2 rounded-full font-medium ${
              activeTab === 'addresses' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Addresses
          </button>
          <button
            onClick={() => handleTabChange('pets')}
            className={`flex-shrink-0 px-4 py-2 mr-2 rounded-full font-medium ${
              activeTab === 'pets' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            My Pets
          </button>
          <button
            onClick={() => handleTabChange('orders')}
            className={`flex-shrink-0 px-4 py-2 mr-2 rounded-full font-medium ${
              activeTab === 'orders' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => handleTabChange('bookings')}
            className={`flex-shrink-0 px-4 py-2 mr-2 rounded-full font-medium ${
              activeTab === 'bookings' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Bookings
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-medium">{profileData.name}</p>
                    </div>
                    <button className="text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Email Address</p>
                      <p className="font-medium">{profileData.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="font-medium">{profileData.phone || 'Not added yet'}</p>
                    </div>
                    <button className="text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{profileData.location || 'Not added yet'}</p>
                    </div>
                    <button className="text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="pt-4">
                    <button 
                      className="w-full bg-primary text-white rounded-lg py-3 font-medium flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                      </svg>
                      Update Profile Photo
                    </button>
                  </div>
                  
                  <div className="pt-2">
                    <button 
                      className="w-full border border-primary text-primary rounded-lg py-3 font-medium flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Change Password
                    </button>
                  </div>

                  {/* Business Dashboards Section */}
                  {(hasGroomingCenter) && (
                    <div className="mt-6 pt-6 border-t">
                      <h2 className="text-lg font-semibold mb-4">Your Business Dashboards</h2>
                      <div className="space-y-3">
                        {hasGroomingCenter && (
                          <Link to="/services/grooming/dashboard" className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Grooming Center Dashboard</p>
                              <p className="text-sm text-gray-600">Manage your grooming center bookings and reviews</p>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">My Addresses</h2>
                  <button className="text-primary text-sm font-medium flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add New
                  </button>
                </div>
                
                {addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="mt-2 text-gray-500">You haven't added any addresses yet</p>
                    <button className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">
                      Add Your First Address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map(address => (
                      <div key={address.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{address.name}</p>
                            {address.isDefault && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button className="text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button className="text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            {address.street}, {address.city}, {address.state} - {address.zipCode}
                          </p>
                          {address.phone && (
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Phone:</span> {address.phone}
                            </p>
                          )}
                        </div>
                        
                        {!address.isDefault && (
                          <button className="w-full mt-3 text-sm text-primary py-1 border border-primary rounded-lg">
                            Set as Default
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Pets Tab */}
            {activeTab === 'pets' && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">My Pets</h2>
                  <button className="text-primary text-sm font-medium flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Pet
                  </button>
                </div>
                
                {pets.length === 0 ? (
                  <div className="text-center py-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905 0 .905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    <p className="mt-2 text-gray-500">You haven't added any pets yet</p>
                    <button className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">
                      Add Your First Pet
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pets.map(pet => (
                      <div key={pet.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden mr-3">
                            {pet.image ? (
                              <img src={pet.image} alt={pet.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{pet.name}</p>
                            <p className="text-sm text-gray-600">
                              {pet.breed || 'Unknown breed'} • {pet.type || 'Pet'}
                            </p>
                            {pet.age && (
                              <p className="text-sm text-gray-500 mt-1">
                                Age: {pet.age} {pet.ageUnit || 'years'}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 flex space-x-2">
                          <button className="flex-1 text-primary text-sm font-medium py-1 border border-primary rounded-lg">
                            Edit Details
                          </button>
                          <button className="flex-1 text-primary-dark text-sm font-medium py-1 border border-primary-dark rounded-lg">
                            View Records
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-4">My Orders</h2>
                
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p className="mt-2 text-gray-500">You don't have any orders yet</p>
                    <button 
                      onClick={() => navigate('/products')}
                      className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
                    >
                      Shop Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map(order => (
                      <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                        {/* Order Header with ID and Status */}
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-gray-500">Order #{order.id}</p>
                            <p className="text-sm">{formatDate(order.date || order.createdAt)}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' : 
                            order.status === 'canceled' || order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {(order.status?.charAt(0).toUpperCase() + order.status?.slice(1)) || 'Processing'}
                          </span>
                        </div>
                        
                        {/* Order Items Preview */}
                        <div className="mt-3 border-t border-gray-100 pt-3">
                          {Array.isArray(order.items) && order.items.length > 0 ? (
                            <div>
                              <p className="text-xs text-gray-500 mb-2">ORDER ITEMS</p>
                              <div className="space-y-2 max-h-24 overflow-y-auto">
                                {order.items.slice(0, 2).map((item, index) => (
                                  <div key={index} className="flex items-center">
                                    <div className="h-10 w-10 bg-gray-200 rounded overflow-hidden mr-3 flex-shrink-0">
                                      {item.image ? (
                                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-gray-300">
                                          <span className="text-xs text-gray-500">No img</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{item.name}</p>
                                      <div className="flex justify-between">
                                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                        <p className="text-xs font-medium">${Number(item.price).toFixed(2)}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {order.items.length > 2 && (
                                  <p className="text-xs text-gray-500 text-center">+{order.items.length - 2} more items</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between">
                              <p className="text-sm font-medium">Total Items:</p>
                              <p className="text-sm text-gray-600">
                                {Array.isArray(order.items) 
                                  ? `${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}`
                                  : typeof order.items === 'number' 
                                    ? `${order.items} ${order.items === 1 ? 'item' : 'items'}`
                                    : 'Items in order'}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Order Price and Delivery Info */}
                        <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-500">TOTAL</p>
                            <p className="font-medium">${Number(order.total || order.subtotal || 0).toFixed(2)}</p>
                          </div>
                          {order.deliveryAddress && (
                            <div className="text-right">
                              <p className="text-xs text-gray-500">DELIVERY</p>
                              <p className="text-sm truncate max-w-[150px]">{
                                typeof order.deliveryAddress === 'string' 
                                  ? order.deliveryAddress 
                                  : order.deliveryAddress?.city || 'Address available'
                              }</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Payment Method - if available */}
                        {order.paymentMethod && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">PAYMENT</p>
                            <p className="text-sm">{order.paymentMethod}</p>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="mt-4 flex space-x-2">
                          <button 
                            className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center"
                            onClick={() => handleViewOrderDetails(order)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Order Details
                          </button>
                          {order.status === 'delivered' && (
                            <button className="flex-1 text-primary-dark text-sm font-medium py-2 border border-primary-dark rounded-lg flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Buy Again
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-4">My Bookings</h2>
                
                {console.log("Rendering bookings section, bookings:", bookings)}
                
                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-gray-500">You don't have any bookings yet</p>
                    <button 
                      onClick={() => navigate('/services')}
                      className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
                    >
                      Book a Service
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map(booking => (
                      <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{booking.serviceType || booking.service || 'Appointment'}</p>
                            <p className="text-sm text-gray-500">
                              {formatDate(booking.appointmentDate || booking.date || booking.createdAt)} {booking.appointmentTime || booking.time || ''}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                            booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            booking.status === 'cancelled' || booking.status === 'canceled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {(booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)) || 'Pending'}
                          </span>
                        </div>
                        
                        {booking.doctorName && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              Doctor: <span className="font-medium">{booking.doctorName}</span>
                            </p>
                          </div>
                        )}
                        
                        {booking.petName && (
                          <div className="mt-1">
                            <p className="text-sm text-gray-600">
                              Pet: <span className="font-medium">{booking.petName}</span>
                            </p>
                          </div>
                        )}
                        
                        <div className="mt-3 flex space-x-2">
                          <button 
                            className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center"
                            onClick={() => booking.id.startsWith('mock') ? null : navigate(`/bookings/${booking.id}`)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                          {(booking.status !== 'completed' && booking.status !== 'cancelled' && booking.status !== 'canceled') && (
                            <button className="flex-1 text-red-600 text-sm font-medium py-2 border border-red-600 rounded-lg flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <MobileBottomNav />
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
        onSuccess={handleAuthSuccess}
      />

      {/* Add the Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Order Details</h2>
                <button 
                  className="text-gray-500"
                  onClick={() => setShowOrderModal(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-4">
              {/* Order ID and Date */}
              <div className="mb-4">
                <p className="text-sm text-gray-500">Order #{selectedOrder.id}</p>
                <p className="text-sm">{formatDate(selectedOrder.date || selectedOrder.createdAt)}</p>
                <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
                  selectedOrder.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  selectedOrder.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  selectedOrder.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' : 
                  selectedOrder.status === 'canceled' || selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {(selectedOrder.status?.charAt(0).toUpperCase() + selectedOrder.status?.slice(1)) || 'Processing'}
                </span>
              </div>
              
              {/* Order Items */}
              <div className="border-t border-gray-100 pt-4 mb-4">
                <h3 className="text-sm font-semibold mb-2">ITEMS</h3>
                <div className="space-y-3">
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? 
                    selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex">
                        <div className="h-16 w-16 bg-gray-200 rounded overflow-hidden mr-3 flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gray-300">
                              <span className="text-xs text-gray-500">No img</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <div className="flex justify-between mt-1">
                            <p className="text-sm text-gray-500">Qty: {item.quantity || 1}</p>
                            <p className="text-sm font-medium">${Number(item.price).toFixed(2)}</p>
                          </div>
                          {item.options && (
                            <p className="text-xs text-gray-500 mt-1">{
                              typeof item.options === 'string' 
                                ? item.options 
                                : Object.entries(item.options)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(', ')
                            }</p>
                          )}
                        </div>
                      </div>
                    )) : (
                      <p className="text-gray-500 text-sm">No item details available</p>
                    )
                  }
                </div>
              </div>
              
              {/* Price Breakdown */}
              <div className="border-t border-gray-100 pt-4 mb-4">
                <h3 className="text-sm font-semibold mb-2">PRICE DETAILS</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-500">Subtotal</p>
                    <p className="text-sm">${Number(selectedOrder.subtotal || calculateSubtotal(selectedOrder.items) || 0).toFixed(2)}</p>
                  </div>
                  {selectedOrder.shipping !== undefined && (
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500">Shipping</p>
                      <p className="text-sm">${Number(selectedOrder.shipping || 0).toFixed(2)}</p>
                    </div>
                  )}
                  {selectedOrder.tax !== undefined && (
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500">Tax</p>
                      <p className="text-sm">${Number(selectedOrder.tax || 0).toFixed(2)}</p>
                    </div>
                  )}
                  {selectedOrder.discount !== undefined && (
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500">Discount</p>
                      <p className="text-sm text-green-600">-${Number(selectedOrder.discount || 0).toFixed(2)}</p>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-100 font-medium">
                    <p>Total</p>
                    <p>${Number(selectedOrder.total || selectedOrder.subtotal || calculateSubtotal(selectedOrder.items) || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              {/* Shipping Address */}
              {selectedOrder.deliveryAddress && (
                <div className="border-t border-gray-100 pt-4 mb-4">
                  <h3 className="text-sm font-semibold mb-2">SHIPPING ADDRESS</h3>
                  <div className="text-sm">
                    {typeof selectedOrder.deliveryAddress === 'string' ? (
                      <p>{selectedOrder.deliveryAddress}</p>
                    ) : (
                      <>
                        <p>{selectedOrder.deliveryAddress.name}</p>
                        <p>{selectedOrder.deliveryAddress.street}</p>
                        <p>{selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.state} {selectedOrder.deliveryAddress.zipCode}</p>
                        {selectedOrder.deliveryAddress.phone && <p>Phone: {selectedOrder.deliveryAddress.phone}</p>}
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Payment Information */}
              <div className="border-t border-gray-100 pt-4 mb-4">
                <h3 className="text-sm font-semibold mb-2">PAYMENT INFORMATION</h3>
                <div>
                  <p className="text-sm"><span className="text-gray-500">Method:</span> {selectedOrder.paymentMethod || 'Not specified'}</p>
                  {selectedOrder.paymentStatus && (
                    <p className="text-sm"><span className="text-gray-500">Status:</span> {selectedOrder.paymentStatus}</p>
                  )}
                  {selectedOrder.transactionId && (
                    <p className="text-sm"><span className="text-gray-500">Transaction ID:</span> {selectedOrder.transactionId}</p>
                  )}
                </div>
              </div>
              
              {/* Order Notes */}
              {selectedOrder.notes && (
                <div className="border-t border-gray-100 pt-4 mb-4">
                  <h3 className="text-sm font-semibold mb-2">NOTES</h3>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200">
              {selectedOrder.status === 'delivered' && (
                <button className="w-full bg-primary text-white rounded-lg py-2 text-sm font-medium">
                  Buy Again
                </button>
              )}
              {(selectedOrder.status === 'processing' || selectedOrder.status === 'pending') && (
                <button className="w-full text-red-600 border border-red-600 rounded-lg py-2 text-sm font-medium">
                  Cancel Order
                </button>
              )}
              <button 
                className="w-full mt-2 text-gray-500 py-2 text-sm font-medium"
                onClick={() => setShowOrderModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to calculate subtotal from items array
const calculateSubtotal = (items) => {
  if (!Array.isArray(items) || items.length === 0) return 0;
  
  return items.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 1;
    return total + (price * quantity);
  }, 0);
};

export default MobileProfile; 