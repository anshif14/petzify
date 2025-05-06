import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const GroomingAdmin = () => {
  const [groomingCenters, setGroomingCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedCenter, setSelectedCenter] = useState(null);
  
  useEffect(() => {
    fetchGroomingCenters();
  }, [activeTab]);
  
  const fetchGroomingCenters = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'groomingCenters'),
        where('status', '==', activeTab),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const centers = [];
      
      snapshot.forEach((doc) => {
        centers.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      
      setGroomingCenters(centers);
    } catch (error) {
      console.error('Error fetching grooming centers:', error);
      toast.error('Failed to load grooming centers');
    } finally {
      setLoading(false);
    }
  };
  
  const handleApprove = async (centerId) => {
    try {
      const centerRef = doc(db, 'groomingCenters', centerId);
      await updateDoc(centerRef, {
        status: 'approved',
        updatedAt: new Date()
      });
      
      toast.success('Grooming center approved successfully');
      
      // Send email notification to center owner
      await sendEmailNotification(
        groomingCenters.find(center => center.id === centerId),
        'approved'
      );
      
      // Remove from current list if we're on the pending tab
      if (activeTab === 'pending') {
        setGroomingCenters(prev => prev.filter(center => center.id !== centerId));
        if (selectedCenter?.id === centerId) {
          setSelectedCenter(null);
        }
      }
    } catch (error) {
      console.error('Error approving grooming center:', error);
      toast.error('Failed to approve grooming center');
    }
  };
  
  const handleReject = async (centerId) => {
    try {
      const centerRef = doc(db, 'groomingCenters', centerId);
      await updateDoc(centerRef, {
        status: 'rejected',
        updatedAt: new Date()
      });
      
      toast.success('Grooming center rejected');
      
      // Send email notification to center owner
      await sendEmailNotification(
        groomingCenters.find(center => center.id === centerId),
        'rejected'
      );
      
      // Remove from current list if we're on the pending tab
      if (activeTab === 'pending') {
        setGroomingCenters(prev => prev.filter(center => center.id !== centerId));
        if (selectedCenter?.id === centerId) {
          setSelectedCenter(null);
        }
      }
    } catch (error) {
      console.error('Error rejecting grooming center:', error);
      toast.error('Failed to reject grooming center');
    }
  };
  
  const handleDelete = async (centerId) => {
    if (window.confirm('Are you sure you want to permanently delete this grooming center? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'groomingCenters', centerId));
        
        toast.success('Grooming center deleted successfully');
        
        // Remove from current list
        setGroomingCenters(prev => prev.filter(center => center.id !== centerId));
        if (selectedCenter?.id === centerId) {
          setSelectedCenter(null);
        }
      } catch (error) {
        console.error('Error deleting grooming center:', error);
        toast.error('Failed to delete grooming center');
      }
    }
  };
  
  // Send email notification to center owner
  const sendEmailNotification = async (center, status) => {
    try {
      // Implementation would depend on your email system
      console.log(`Email notification would be sent to ${center.email} about ${status} status`);
      // In a real implementation, you might call an API or cloud function
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't fail the entire operation if just the email fails
    }
  };
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Grooming Centers Management</h1>
            <p className="text-gray-600 mt-2">Review, approve, and manage grooming service providers</p>
          </div>
          <Link to="/admin/services" className="text-primary hover:text-primary-dark flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Back to Services
          </Link>
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="flex border-b">
            <button
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'pending'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('pending')}
            >
              Pending Review
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'approved'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('approved')}
            >
              Approved
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'rejected'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('rejected')}
            >
              Rejected
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : groomingCenters.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No grooming centers to display</h3>
            <p className="text-gray-600">
              {activeTab === 'pending'
                ? 'There are no pending grooming center applications to review.'
                : activeTab === 'approved'
                ? 'No grooming centers have been approved yet.'
                : 'No grooming centers have been rejected.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List of Centers */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow-sm overflow-hidden h-min">
              <div className="p-4 border-b">
                <h2 className="text-lg font-medium text-gray-900">
                  {activeTab === 'pending' 
                    ? 'Pending Applications' 
                    : activeTab === 'approved' 
                      ? 'Approved Centers' 
                      : 'Rejected Applications'}
                </h2>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {groomingCenters.map(center => (
                  <div 
                    key={center.id} 
                    className={`border-b p-4 cursor-pointer hover:bg-gray-50 ${selectedCenter?.id === center.id ? 'bg-blue-50 border-l-4 border-l-primary' : ''}`}
                    onClick={() => setSelectedCenter(center)}
                  >
                    <div className="flex justify-between">
                      <h3 className="font-medium text-gray-900">{center.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        center.type === 'Mobile Grooming' 
                          ? 'bg-indigo-100 text-indigo-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {center.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">{center.email}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">
                        {formatDate(center.createdAt)}
                      </span>
                      {activeTab === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(center.id);
                            }}
                            className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(center.id);
                            }}
                            className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Center Details */}
            <div className="lg:col-span-2">
              {selectedCenter ? (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6 border-b">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <h2 className="text-2xl font-bold text-gray-900">{selectedCenter.name}</h2>
                          <span className={`ml-3 text-xs px-2 py-1 rounded-full ${
                            selectedCenter.type === 'Mobile Grooming' 
                              ? 'bg-indigo-100 text-indigo-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {selectedCenter.type}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">{selectedCenter.description}</p>
                      </div>
                      
                      {activeTab === 'pending' ? (
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleApprove(selectedCenter.id)}
                            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(selectedCenter.id)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDelete(selectedCenter.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    {/* Contact Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500 block">Email</span>
                          <span className="text-gray-900">{selectedCenter.email}</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500 block">Phone</span>
                          <span className="text-gray-900">{selectedCenter.phone}</span>
                        </div>
                        {selectedCenter.website && (
                          <div>
                            <span className="text-sm text-gray-500 block">Website</span>
                            <a 
                              href={selectedCenter.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {selectedCenter.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Location Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {selectedCenter.type === 'Grooming Center' ? 'Address' : 'Service Area'}
                      </h3>
                      {selectedCenter.type === 'Grooming Center' ? (
                        <div>
                          <p className="text-gray-900">{selectedCenter.address}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm text-gray-500 block">Base Location</span>
                            <span className="text-gray-900">{selectedCenter.baseLocation}</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500 block">Service Radius</span>
                            <span className="text-gray-900">{selectedCenter.serviceRadius} km</span>
                          </div>
                        </div>
                      )}
                      {selectedCenter.location && (
                        <div className="mt-4">
                          <span className="text-sm text-gray-500 block">Coordinates</span>
                          <span className="text-gray-900">
                            {selectedCenter.location.latitude}, {selectedCenter.location.longitude}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Services Offered */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Services Offered</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedCenter.services && selectedCenter.services.length > 0 ? (
                          selectedCenter.services.map(service => (
                            <span 
                              key={service} 
                              className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full"
                            >
                              {service}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-500">No services specified</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Submission Details */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Submission Details</h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500 block">Submitted By</span>
                          <span className="text-gray-900">{selectedCenter.submittedBy}</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500 block">Submitted On</span>
                          <span className="text-gray-900">{formatDate(selectedCenter.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Images */}
                  {selectedCenter.images && selectedCenter.images.length > 0 && (
                    <div className="p-6 border-t">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Images</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedCenter.images.map((image, index) => (
                          <div key={index} className="h-48 rounded-lg overflow-hidden">
                            <img 
                              src={image} 
                              alt={`${selectedCenter.name} - ${index + 1}`} 
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Operating Hours - For Grooming Centers */}
                  {selectedCenter.type === 'Grooming Center' && selectedCenter.operatingHours && (
                    <div className="p-6 border-t">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Operating Hours</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(selectedCenter.operatingHours).map(([day, hours]) => (
                              <tr key={day}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                                  {day}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {hours.closed ? (
                                    <span className="text-gray-500">Closed</span>
                                  ) : (
                                    <span>{hours.open} - {hours.close}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No center selected</h3>
                  <p className="text-gray-600">
                    Select a grooming center from the list to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroomingAdmin; 