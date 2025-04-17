import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config.js';

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
    
    fetchBoardingRequests();
  }, [activeTab, updateStatus.loading]);

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
                          onClick={() => handleStatusChange(center.id, 'approved')}
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
                    onClick={() => handleStatusChange(selectedCenter.id, 'approved')}
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

  return (
    <div className="p-6">
      <h2 className="text-xl font-medium text-gray-900 mb-4">Pet Boarding Centers Management</h2>
      
      {/* Tabs - Only show when no center is selected */}
      {!selectedCenter && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`${
                activeTab === 'pending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab('pending')}
            >
              Pending Review ({activeTab === 'pending' ? boardingRequests.length : '...'})
            </button>
            <button
              className={`${
                activeTab === 'approved'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab('approved')}
            >
              Approved
            </button>
            <button
              className={`${
                activeTab === 'rejected'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab('rejected')}
            >
              Rejected
            </button>
          </nav>
        </div>
      )}
      
      {/* Main content */}
      {selectedCenter ? renderCenterDetails() : renderRequestsList()}
      
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
    </div>
  );
};

export default PetBoardingAdmin; 