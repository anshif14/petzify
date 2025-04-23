import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config.js';
import PasswordInput from '../../components/common/PasswordInput';

const PetBoardingAdmin = () => {
  const [boardingRequests, setBoardingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [updateStatus, setUpdateStatus] = useState({ loading: false, error: null });
  // Add states for WhatsApp sharing
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // New states for password creation dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [centerToApprove, setCenterToApprove] = useState(null);
  
  // Bookings related states
  const [bookings, setBookings] = useState([]);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [bookingUpdateLoading, setBookingUpdateLoading] = useState(false);

  useEffect(() => {
    const fetchBoardingRequests = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'petBoardingCenters'),
          where('status', '==', activeTab)
        );
        
        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setBoardingRequests(requests);
      } catch (err) {
        console.error('Error fetching boarding center requests:', err);
        setError('Failed to load requests. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (activeTab === 'pending' || activeTab === 'approved' || activeTab === 'rejected') {
      fetchBoardingRequests();
    } else if (activeTab === 'bookings') {
      fetchBookings();
    }
  }, [activeTab, updateStatus.loading]);

  // Function to handle when the Approve button is clicked
  const handleApprovalClick = (center) => {
    setCenterToApprove(center);
    setShowPasswordDialog(true);
    setPasswordData({
      password: '',
      confirmPassword: ''
    });
    setPasswordError('');
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      setUpdateStatus({ loading: true, error: null });
      
      const boardingRef = doc(db, 'petBoardingCenters', id);
      await updateDoc(boardingRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Close details panel if it's the selected center
      if (selectedCenter && selectedCenter.id === id) {
        setSelectedCenter(null);
      }
      
      setUpdateStatus({ loading: false, error: null });
    } catch (err) {
      console.error('Error updating status:', err);
      setUpdateStatus({ loading: false, error: 'Failed to update status. Please try again.' });
    }
  };

  const handleViewDetails = (center) => {
    setSelectedCenter(center);
  };

  const closeDetails = () => {
    setSelectedCenter(null);
  };

  // Function to generate WhatsApp share URL
  const shareToWhatsApp = () => {
    // Get the phone number without any non-numeric characters
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    
    if (!cleanedNumber || cleanedNumber.length < 10) {
      alert('Please enter a valid phone number');
      return;
    }
    
    // Format the center information for WhatsApp
    let petTypesText = '';
    if (selectedCenter.petTypesAccepted) {
      petTypesText = Object.entries(selectedCenter.petTypesAccepted)
        .filter(([_, value]) => value)
        .map(([type]) => type)
        .join(', ');
    }
    
    let servicesText = '';
    if (selectedCenter.servicesOffered) {
      servicesText = Object.entries(selectedCenter.servicesOffered)
        .filter(([_, value]) => value)
        .map(([service]) => service)
        .join(', ');
    }
    
    // Format operating days
    let operatingDaysText = '';
    if (selectedCenter.operatingDays) {
      operatingDaysText = Object.entries(selectedCenter.operatingDays)
        .filter(([_, isOpen]) => isOpen)
        .map(([day]) => day)
        .join(', ');
    }

    // Create Google Maps link using latitude and longitude
    const latitude = selectedCenter.latitude || selectedCenter.location?.latitude;
    const longitude = selectedCenter.longitude || selectedCenter.location?.longitude;
    
    let locationMapLink = '';
    if (latitude && longitude) {
      locationMapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    }

    // Format the message for WhatsApp with improved emojis
    const message = `
🏡 *Pet Boarding Center: ${selectedCenter.centerName}*

👤 *Owner:* ${selectedCenter.ownerName}  
📧 *Email:* ${selectedCenter.email}  
📞 *Contact:* ${selectedCenter.phoneNumber}  
💰 *Price:* ₹${selectedCenter.perDayCharge}/day  
📆 *Operating Days:* ${operatingDaysText}  

${selectedCenter.description ? `📝 *Description:* ${selectedCenter.description}\n\n` : ''}
🐕🐈 *Pet Types Accepted:* ${petTypesText}  
✅ *Services Offered:* ${servicesText}  

📍 *Address:* ${selectedCenter.address}, ${selectedCenter.city}, ${selectedCenter.pincode}
${locationMapLink ? `🗺️ *Map Location:* ${locationMapLink}\n` : ''}

📅 *Registration Date:* ${selectedCenter.createdAt ? new Date(selectedCenter.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}  
🏷️ *Status:* ${selectedCenter.status?.charAt(0).toUpperCase() + selectedCenter.status?.slice(1)}  

${selectedCenter.galleryImageURLs && selectedCenter.galleryImageURLs.length > 0 ? '🖼️ *Gallery Links:*' : ''}
${selectedCenter.galleryImageURLs ? selectedCenter.galleryImageURLs.slice(0, 3).map((url, i) => `${url}`).join('\n') : ''}
    `;
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Generate the WhatsApp share URL
    const whatsappURL = `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
    
    // Open in a new tab
    window.open(whatsappURL, '_blank');
    
    // Reset the phone number and close the dialog
    setPhoneNumber('');
    setShowPhoneDialog(false);
  };

  // Handle password form input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
    setPasswordError('');
  };

  // Function to create boarding admin account and approve the center
  const createBoardingAdmin = async () => {
    try {
      // Validate password
      if (!passwordData.password) {
        setPasswordError('Password is required');
        return;
      }
      
      if (passwordData.password.length < 6) {
        setPasswordError('Password must be at least 6 characters');
        return;
      }
      
      if (passwordData.password !== passwordData.confirmPassword) {
        setPasswordError('Passwords do not match');
        return;
      }
      
      setUpdateStatus({ loading: true, error: null });
      
      // 1. Create a new admin account with boarding_admin role
      const adminData = {
        name: centerToApprove.ownerName,
        username: `boarding_${centerToApprove.email.split('@')[0]}`,
        email: centerToApprove.email,
        password: passwordData.password,
        role: 'boarding_admin',
        boardingCenterId: centerToApprove.id,
        permissions: {
          canEditContacts: false,
          canManageMessages: true,
          canManageUsers: false,
          canEditProfile: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'admin'), adminData);
      
      // 2. Update the boarding center status to approved
      const boardingRef = doc(db, 'petBoardingCenters', centerToApprove.id);
      await updateDoc(boardingRef, {
        status: 'approved',
        updatedAt: new Date(),
        adminCreated: true
      });
      
      // Close details panel if it's the selected center
      if (selectedCenter && selectedCenter.id === centerToApprove.id) {
        setSelectedCenter(null);
      }
      
      // Reset state
      setShowPasswordDialog(false);
      setCenterToApprove(null);
      setPasswordData({
        password: '',
        confirmPassword: ''
      });
      
      setUpdateStatus({ loading: false, error: null });
    } catch (err) {
      console.error('Error creating boarding admin:', err);
      setPasswordError('Failed to create account. Please try again.');
      setUpdateStatus({ loading: false, error: 'Failed to create account. Please try again.' });
    }
  };

  // Fetch bookings from Firestore
  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      let bookingsQuery;
      if (activeTab === 'bookings') {
        // Fetch all bookings
        bookingsQuery = query(
          collection(db, 'petBoardingBookings'),
          orderBy('createdAt', 'desc')
        );
      }
      
      if (bookingsQuery) {
        const snapshot = await getDocs(bookingsQuery);
        const bookingsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.seconds * 1000) : new Date()
        }));
        
        setBookings(bookingsList);
        
        // Count pending bookings
        const pendingCount = bookingsList.filter(booking => booking.status === 'pending').length;
        setPendingBookingsCount(pendingCount);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle booking status change
  const handleBookingStatusChange = async (bookingId, newStatus) => {
    try {
      setBookingUpdateLoading(true);
      
      const bookingRef = doc(db, 'petBoardingBookings', bookingId);
      await updateDoc(bookingRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Refresh the bookings
      fetchBookings();
      
      setBookingUpdateLoading(false);
    } catch (err) {
      console.error('Error updating booking status:', err);
      setError('Failed to update booking status. Please try again.');
      setBookingUpdateLoading(false);
    }
  };
  
  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date instanceof Date ? date : new Date(date));
  };

  // Render the request list view
  const renderRequestsList = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {loading ? (
        <div className="p-6 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading requests...</p>
        </div>
      ) : error ? (
        <div className="p-6">
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      ) : boardingRequests.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-600">No {activeTab} boarding center requests found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {boardingRequests.map((center) => (
                <tr key={center.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{center.centerName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{center.ownerName}</div>
                    <div className="text-sm text-gray-500">{center.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{center.city}</div>
                    <div className="text-sm text-gray-500">{center.pincode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {center.createdAt ? new Date(center.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleViewDetails(center)}
                      className="text-primary hover:text-primary-dark mr-3"
                    >
                      View Details
                    </button>
                    
                    {activeTab === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleApprovalClick(center)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          disabled={updateStatus.loading}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleStatusChange(center.id, 'rejected')}
                          className="text-red-600 hover:text-red-900"
                          disabled={updateStatus.loading}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    
                    {activeTab === 'approved' && (
                      <button 
                        onClick={() => handleStatusChange(center.id, 'rejected')}
                        className="text-red-600 hover:text-red-900"
                        disabled={updateStatus.loading}
                      >
                        Deactivate
                      </button>
                    )}
                    
                    {activeTab === 'rejected' && (
                      <button 
                        onClick={() => handleStatusChange(center.id, 'approved')}
                        className="text-green-600 hover:text-green-900"
                        disabled={updateStatus.loading}
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render the detailed view of a center
  const renderCenterDetails = () => {
    if (!selectedCenter) return null;
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto">
        <div className="p-6">
          {/* Back button and header */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={closeDetails}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to list
            </button>
            
            <div className="flex space-x-3">
              {/* WhatsApp Share Button */}
              <button 
                onClick={() => setShowPhoneDialog(true)}
                className="px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 6.628 5.373 12 12 12 6.628 0 12-5.373 12-12 0-6.628-5.373-12-12-12zm.029 18.88a6.942 6.942 0 01-3.333-.855L4.586 19l.977-3.562a6.9 6.9 0 01-.933-3.457c0-3.825 3.116-6.937 6.937-6.937s6.937 3.112 6.937 6.937c.001 3.825-3.115 6.899-6.937 6.899z" fillRule="nonzero"/>
                </svg>
                Send to WhatsApp
              </button>
              
              {activeTab === 'pending' && (
                <>
                  <button 
                    onClick={() => handleApprovalClick(selectedCenter)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    disabled={updateStatus.loading}
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleStatusChange(selectedCenter.id, 'rejected')}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    disabled={updateStatus.loading}
                  >
                    Reject
                  </button>
                </>
              )}
              
              {activeTab === 'approved' && (
                <button 
                  onClick={() => handleStatusChange(selectedCenter.id, 'rejected')}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  disabled={updateStatus.loading}
                >
                  Deactivate
                </button>
              )}
              
              {activeTab === 'rejected' && (
                <button 
                  onClick={() => handleStatusChange(selectedCenter.id, 'approved')}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  disabled={updateStatus.loading}
                >
                  Reactivate
                </button>
              )}
            </div>
          </div>
          
          {/* Center main details */}
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="md:w-2/3">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedCenter.centerName}</h2>
              <p className="text-gray-600 mb-4">{selectedCenter.address}, {selectedCenter.city}, {selectedCenter.pincode}</p>
              
              {selectedCenter.description && (
                <div className="mb-4 bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                  <p className="text-gray-800">{selectedCenter.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-500">Owner</p>
                  <p className="font-medium text-gray-900">{selectedCenter.ownerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Contact</p>
                  <p className="font-medium text-gray-900">{selectedCenter.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{selectedCenter.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Price</p>
                  <p className="font-medium text-gray-900">₹{selectedCenter.perDayCharge}/day</p>
                </div>
              </div>
            </div>
            
            {/* Gallery preview */}
            {selectedCenter.galleryImageURLs && selectedCenter.galleryImageURLs.length > 0 && (
              <div className="md:w-1/3">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Gallery</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedCenter.galleryImageURLs.slice(0, 4).map((url, index) => (
                    <img 
                      key={index}
                      src={url}
                      alt={`Gallery ${index + 1}`}
                      className="h-32 w-full object-cover rounded"
                    />
                  ))}
                </div>
                {selectedCenter.galleryImageURLs.length > 4 && (
                  <p className="text-xs text-gray-500 mt-1">+{selectedCenter.galleryImageURLs.length - 4} more images</p>
                )}
              </div>
            )}
          </div>
          
          {/* Additional details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Pet Types Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Pet Types Accepted</h3>
              <div className="flex flex-wrap gap-2">
                {selectedCenter.petTypesAccepted && Object.entries(selectedCenter.petTypesAccepted)
                  .filter(([_, value]) => value)
                  .map(([type]) => (
                    <span key={type} className="px-3 py-1 bg-primary-light text-primary text-sm rounded-full capitalize">
                      {type}
                    </span>
                  ))}
              </div>
            </div>
            
            {/* Services Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Services Offered</h3>
              <div className="flex flex-wrap gap-2">
                {selectedCenter.servicesOffered && Object.entries(selectedCenter.servicesOffered)
                  .filter(([_, value]) => value)
                  .map(([service]) => (
                    <span key={service} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full capitalize">
                      {service}
                    </span>
                  ))}
              </div>
            </div>
            
            {/* Operating Days Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Operating Days</h3>
              <div className="grid grid-cols-7 gap-2 text-center">
                {Object.entries(selectedCenter.operatingDays || {}).map(([day, isOpen]) => (
                  <div key={day} className={`py-2 rounded ${isOpen ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'}`}>
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Additional Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Registration Date:</span> {' '}
                  {selectedCenter.createdAt ? new Date(selectedCenter.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Current Status:</span> {' '}
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedCenter.status === 'approved' ? 'bg-green-100 text-green-800' : 
                    selectedCenter.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedCenter.status?.charAt(0).toUpperCase() + selectedCenter.status?.slice(1)}
                  </span>
                </p>
                {selectedCenter.updatedAt && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Last Updated:</span> {' '}
                    {new Date(selectedCenter.updatedAt.seconds * 1000).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Full Gallery */}
          {selectedCenter.galleryImageURLs && selectedCenter.galleryImageURLs.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Full Gallery</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedCenter.galleryImageURLs.map((url, index) => (
                  <div key={index} className="aspect-square">
                    <img 
                      src={url}
                      alt={`Gallery ${index + 1}`}
                      className="h-full w-full object-cover rounded"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render bookings tab
  const renderBookingsTab = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {loading ? (
        <div className="p-6 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading bookings...</p>
        </div>
      ) : error ? (
        <div className="p-6">
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-600">No bookings found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">#{booking.id.slice(0, 8)}</div>
                    <div className="text-xs text-gray-500">{booking.createdAt.toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{booking.userName}</div>
                    <div className="text-xs text-gray-500">{booking.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.centerName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {formatDate(booking.dateFrom)} to {formatDate(booking.dateTo)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {booking.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleBookingStatusChange(booking.id, 'confirmed')}
                          className="text-green-600 hover:text-green-900 mr-3"
                          disabled={bookingUpdateLoading}
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => handleBookingStatusChange(booking.id, 'cancelled')}
                          className="text-red-600 hover:text-red-900"
                          disabled={bookingUpdateLoading}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    
                    {booking.status === 'confirmed' && (
                      <>
                        <button 
                          onClick={() => handleBookingStatusChange(booking.id, 'completed')}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          disabled={bookingUpdateLoading}
                        >
                          Complete
                        </button>
                        <button 
                          onClick={() => handleBookingStatusChange(booking.id, 'cancelled')}
                          className="text-red-600 hover:text-red-900"
                          disabled={bookingUpdateLoading}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <h2 className="text-xl font-medium text-gray-900 mb-4">Pet Boarding Centers Management</h2>
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="flex border-b space-x-8">
          <button
            className={`pb-2 ${
              activeTab === "pending"
                ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("pending")}
          >
            Pending
          </button>
          <button
            className={`pb-2 ${
              activeTab === "approved"
                ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("approved")}
          >
            Approved
          </button>
          <button
            className={`pb-2 ${
              activeTab === "rejected"
                ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("rejected")}
          >
            Rejected
          </button>
          <button
            className={`pb-2 ${
              activeTab === "bookings"
                ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("bookings")}
          >
            Bookings
          </button>
        </div>
      </div>
      
      {/* Main content */}
      {selectedCenter ? renderCenterDetails() : (
        activeTab === 'bookings' ? renderBookingsTab() : renderRequestsList()
      )}
      
      {/* Phone Number Dialog */}
      {showPhoneDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Enter WhatsApp Number</h3>
            <p className="text-gray-600 mb-4">Enter the phone number to share this boarding center information via WhatsApp.</p>
            
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g., +91 98765 43210"
              className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPhoneDialog(false);
                  setPhoneNumber('');
                }}
                className="px-4 py-2 text-gray-700 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={shareToWhatsApp}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Password Creation Dialog */}
      {showPasswordDialog && centerToApprove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Create Admin Account</h3>
            <p className="text-gray-600 mb-4">
              Create a password for the boarding center admin. This will allow them to log in and manage their center.
            </p>
            
            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {passwordError}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Center Name
              </label>
              <input
                type="text"
                value={centerToApprove.centerName}
                readOnly
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name
              </label>
              <input
                type="text"
                value={centerToApprove.ownerName}
                readOnly
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (Username)
              </label>
              <input
                type="text"
                value={centerToApprove.email}
                readOnly
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md"
              />
              <p className="mt-1 text-xs text-gray-500">This email will be used as the admin username</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Create Password
              </label>
              <PasswordInput
                id="password"
                name="password"
                value={passwordData.password}
                onChange={handlePasswordChange}
                required={true}
                placeholder="Enter a secure password"
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-gray-500">Password must be at least 6 characters</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required={true}
                placeholder="Confirm password"
                autoComplete="new-password"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPasswordDialog(false);
                  setCenterToApprove(null);
                  setPasswordData({
                    password: '',
                    confirmPassword: ''
                  });
                }}
                className="px-4 py-2 text-gray-700 rounded hover:bg-gray-100"
                disabled={updateStatus.loading}
              >
                Cancel
              </button>
              <button
                onClick={createBoardingAdmin}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                disabled={updateStatus.loading}
              >
                {updateStatus.loading ? 'Creating...' : 'Create & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetBoardingAdmin; 