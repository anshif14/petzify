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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Pet Boarding Centers Management</h1>
        
        {/* Tabs */}
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
        
        {/* Main content */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Requests list */}
          <div className={`${selectedCenter ? 'hidden md:block' : ''} md:w-2/3 bg-white rounded-lg shadow`}>
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
          
          {/* Center details */}
          {selectedCenter && (
            <div className={`md:w-1/3 bg-white rounded-lg shadow overflow-auto max-h-[calc(100vh-180px)]`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Center Details</h2>
                  <button 
                    onClick={closeDetails}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{selectedCenter.centerName}</h3>
                    <p className="text-gray-500">{selectedCenter.address}, {selectedCenter.city}, {selectedCenter.pincode}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-200 py-4">
                    <div>
                      <p className="text-sm text-gray-500">Owner</p>
                      <p className="font-medium">{selectedCenter.ownerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Contact</p>
                      <p className="font-medium">{selectedCenter.phoneNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedCenter.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="font-medium">₹{selectedCenter.perDayCharge}/day</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Pet Types Accepted</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCenter.petTypesAccepted && Object.entries(selectedCenter.petTypesAccepted)
                        .filter(([_, value]) => value)
                        .map(([type]) => (
                          <span key={type} className="px-2 py-1 bg-primary-light text-primary text-xs rounded-full capitalize">
                            {type}
                          </span>
                        ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Services Offered</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCenter.servicesOffered && Object.entries(selectedCenter.servicesOffered)
                        .filter(([_, value]) => value)
                        .map(([service]) => (
                          <span key={service} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full capitalize">
                            {service}
                          </span>
                        ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Operating Days</h4>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {Object.entries(selectedCenter.operatingDays || {}).map(([day, isOpen]) => (
                        <div key={day} className={`text-xs p-1 rounded ${isOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                          {day.slice(0, 3)}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {selectedCenter.galleryImageURLs && selectedCenter.galleryImageURLs.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Gallery</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedCenter.galleryImageURLs.slice(0, 4).map((url, index) => (
                          <img 
                            key={index}
                            src={url}
                            alt={`Gallery ${index + 1}`}
                            className="h-20 w-full object-cover rounded"
                          />
                        ))}
                      </div>
                      {selectedCenter.galleryImageURLs.length > 4 && (
                        <p className="text-xs text-gray-500 mt-1">+{selectedCenter.galleryImageURLs.length - 4} more images</p>
                      )}
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Actions</h4>
                    <div className="flex gap-2">
                      {activeTab === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleStatusChange(selectedCenter.id, 'approved')}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            disabled={updateStatus.loading}
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleStatusChange(selectedCenter.id, 'rejected')}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            disabled={updateStatus.loading}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      
                      {activeTab === 'approved' && (
                        <button 
                          onClick={() => handleStatusChange(selectedCenter.id, 'rejected')}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          disabled={updateStatus.loading}
                        >
                          Deactivate
                        </button>
                      )}
                      
                      {activeTab === 'rejected' && (
                        <button 
                          onClick={() => handleStatusChange(selectedCenter.id, 'approved')}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          disabled={updateStatus.loading}
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PetBoardingAdmin; 