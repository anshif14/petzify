import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, query, where, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { app } from '../../firebase/config';
import { useAlert } from '../../context/AlertContext';

const RehomingEnquiriesAdmin = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userGroupedEnquiries, setUserGroupedEnquiries] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const { showSuccess, showError } = useAlert();

  // Fetch all enquiries
  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      const q = query(
        collection(db, 'petRehomingEnquires'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const enquiriesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        read: doc.data().read || false
      }));
      
      setEnquiries(enquiriesList);
      
      // Group enquiries by user
      const groupedByUser = enquiriesList.reduce((acc, enquiry) => {
        const userId = enquiry.userId;
        if (!acc[userId]) {
          acc[userId] = {
            userId,
            name: enquiry.petDetails?.sellerDetails?.name || 'Unknown',
            email: userId,
            enquiries: [],
            unreadCount: 0
          };
        }
        
        acc[userId].enquiries.push(enquiry);
        if (!enquiry.read) {
          acc[userId].unreadCount += 1;
        }
        
        return acc;
      }, {});
      
      setUserGroupedEnquiries(groupedByUser);
      
      // If we have enquiries and no user is selected, select the first one
      if (enquiriesList.length > 0 && !selectedUserId) {
        const firstUserId = Object.keys(groupedByUser)[0];
        setSelectedUserId(firstUserId);
        if (groupedByUser[firstUserId]?.enquiries.length > 0) {
          setSelectedEnquiry(groupedByUser[firstUserId].enquiries[0]);
        }
      }
      
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      showError('Failed to load enquiries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Mark an enquiry as read
  const markAsRead = async (enquiryId) => {
    try {
      const db = getFirestore(app);
      const enquiryRef = doc(db, 'petRehomingEnquires', enquiryId);
      
      await updateDoc(enquiryRef, {
        read: true,
        readAt: Timestamp.now()
      });
      
      // Update local state
      setEnquiries(prev => 
        prev.map(enq => 
          enq.id === enquiryId 
            ? { ...enq, read: true, readAt: new Date() } 
            : enq
        )
      );
      
      // Update grouped state
      setUserGroupedEnquiries(prev => {
        const updatedGroups = { ...prev };
        
        Object.keys(updatedGroups).forEach(userId => {
          updatedGroups[userId].enquiries = updatedGroups[userId].enquiries.map(enq => 
            enq.id === enquiryId 
              ? { ...enq, read: true, readAt: new Date() } 
              : enq
          );
          
          // Recalculate unread count
          updatedGroups[userId].unreadCount = updatedGroups[userId].enquiries.filter(e => !e.read).length;
        });
        
        return updatedGroups;
      });
      
      showSuccess('Marked as read');
    } catch (error) {
      console.error('Error marking enquiry as read:', error);
      showError('Failed to update enquiry status. Please try again.');
    }
  };

  // Select a user and their first enquiry
  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    const userEnquiries = userGroupedEnquiries[userId]?.enquiries || [];
    if (userEnquiries.length > 0) {
      setSelectedEnquiry(userEnquiries[0]);
      if (!userEnquiries[0].read) {
        markAsRead(userEnquiries[0].id);
      }
    } else {
      setSelectedEnquiry(null);
    }
  };

  // Select an enquiry and mark as read if needed
  const handleEnquirySelect = (enquiry) => {
    setSelectedEnquiry(enquiry);
    if (!enquiry.read) {
      markAsRead(enquiry.id);
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date 
      ? timestamp 
      : new Date(timestamp);
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Load enquiries when component mounts
  useEffect(() => {
    fetchEnquiries();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Pet Rehoming Enquiries</h1>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : Object.keys(userGroupedEnquiries).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No enquiries found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-4">
              {/* Users sidebar */}
              <div className="md:col-span-1 border-r border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800">Users</h2>
                </div>
                <div className="overflow-y-auto max-h-[600px]">
                  {Object.values(userGroupedEnquiries).map(user => (
                    <div 
                      key={user.userId}
                      className={`p-4 border-b border-gray-100 flex items-center cursor-pointer hover:bg-gray-50 ${
                        selectedUserId === user.userId ? 'bg-primary-light' : ''
                      }`}
                      onClick={() => handleUserSelect(user.userId)}
                    >
                      <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center mr-3">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{user.name || 'Unknown'}</h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      {user.unreadCount > 0 && (
                        <div className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                          {user.unreadCount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Enquiries list */}
              <div className="md:col-span-3">
                {selectedUserId && userGroupedEnquiries[selectedUserId] ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 h-full">
                    {/* Enquiry list */}
                    <div className="md:col-span-1 border-r border-gray-200 overflow-y-auto max-h-[600px]">
                      <div className="p-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800">Enquiries</h2>
                      </div>
                      {userGroupedEnquiries[selectedUserId].enquiries.map(enquiry => (
                        <div 
                          key={enquiry.id}
                          className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                            selectedEnquiry?.id === enquiry.id ? 'bg-primary-light' : ''
                          } ${!enquiry.read ? 'font-semibold' : ''}`}
                          onClick={() => handleEnquirySelect(enquiry)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-gray-900">
                              {enquiry.petDetails?.name || 'Pet Enquiry'}
                              {!enquiry.read && (
                                <span className="inline-block ml-2 w-2 h-2 bg-primary rounded-full"></span>
                              )}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {formatDate(enquiry.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {enquiry.message}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Enquiry details */}
                    <div className="md:col-span-2 p-6">
                      {selectedEnquiry ? (
                        <div>
                          <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">
                              {selectedEnquiry.petDetails?.name || 'Pet Enquiry Details'}
                            </h2>
                            <span className="text-sm text-gray-500">
                              {formatDate(selectedEnquiry.createdAt)}
                            </span>
                          </div>
                          
                          {/* Pet details */}
                          <div className="bg-gray-50 p-4 rounded-lg mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Pet Information</h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-500">Type</p>
                                <p className="font-medium">{selectedEnquiry.petDetails?.type || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Breed</p>
                                <p className="font-medium">{selectedEnquiry.petDetails?.breed || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Age</p>
                                <p className="font-medium">{selectedEnquiry.petDetails?.age || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Gender</p>
                                <p className="font-medium">{selectedEnquiry.petDetails?.gender || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Price</p>
                                <p className="font-medium">₹{selectedEnquiry.petDetails?.price || 'N/A'}</p>
                              </div>
                              {selectedEnquiry.petDetails?.hasKCICertificate && (
                                <div>
                                  <p className="text-sm text-gray-500">KCI Certificate</p>
                                  <p className="font-medium">Yes</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Pet images */}
                            {selectedEnquiry.petDetails?.mediaFiles && selectedEnquiry.petDetails.mediaFiles.length > 0 && (
                              <div>
                                <p className="text-sm text-gray-500 mb-2">Images</p>
                                <div className="flex space-x-2 overflow-x-auto pb-2">
                                  {selectedEnquiry.petDetails.mediaFiles.map((file, index) => (
                                    file.type === 'image' ? (
                                      <img 
                                        key={index}
                                        src={file.url} 
                                        alt={`Pet ${index+1}`}
                                        className="h-20 w-20 object-cover rounded-md" 
                                      />
                                    ) : null
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Owner details */}
                          <div className="bg-blue-50 p-4 rounded-lg mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Pet Owner Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-500">Name</p>
                                <p className="font-medium">{selectedEnquiry.petDetails?.sellerDetails?.name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium">{selectedEnquiry.ownerUserId || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Phone</p>
                                <p className="font-medium">{selectedEnquiry.petDetails?.sellerDetails?.phone || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Location</p>
                                <p className="font-medium">
                                  {selectedEnquiry.petDetails?.sellerDetails?.location?.displayName || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Enquiry message */}
                          <div className="mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Enquiry Message</h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="whitespace-pre-line">{selectedEnquiry.message}</p>
                            </div>
                          </div>
                          
                          {/* Enquirer info */}
                          <div className="bg-green-50 p-4 rounded-lg">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Enquirer Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium">{selectedEnquiry.userId || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Status</p>
                                <p className="font-medium capitalize">{selectedEnquiry.status || 'pending'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-gray-500">Select an enquiry to view details</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500">Select a user to view their enquiries</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RehomingEnquiriesAdmin; 