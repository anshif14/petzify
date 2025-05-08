import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { toast } from 'react-toastify';
import './GroomingAdminDashboard.css';

const GroomingAdminDashboard = ({ adminData }) => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  useEffect(() => {
    console.log("Admin data received:", adminData);
    fetchAllGroomingBookings();
  }, [adminData]);
  
  const fetchAllGroomingBookings = async () => {
    try {
      setLoading(true);
      console.log("Fetching all grooming bookings");
      
      const bookingsRef = collection(db, 'groomingBookings');
      let bookingsQuery;
      
      // If admin has centerId, filter by it, otherwise fetch all bookings
      if (adminData && adminData.centerId) {
        console.log("Filtering by centerId:", adminData.centerId);
        bookingsQuery = query(
          bookingsRef,
          where('centerId', '==', adminData.centerId),
          orderBy('createdAt', 'desc')
        );
      } else {
        // For testing/development, fetch all bookings
        console.log("No centerId found, fetching all bookings");
        bookingsQuery = query(
          bookingsRef,
          orderBy('createdAt', 'desc')
        );
      }
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      console.log("Bookings found:", bookingsSnapshot.size);
      
      const bookingsList = [];
      
      // Process each booking
      for (const bookingDoc of bookingsSnapshot.docs) {
        const bookingData = bookingDoc.data();
        console.log("Booking data:", bookingData);
        
        // Fetch user data for each booking
        let userData = {};
        if (bookingData.userId) {
          const userRef = doc(db, 'users', bookingData.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            userData = userSnap.data();
          }
        }
        
        // Create a booking date from the date string if it exists
        let bookingDate = null;
        if (bookingData.date) {
          bookingDate = new Date(bookingData.date);
        }
        
        // Add to bookings list
        bookingsList.push({
          id: bookingDoc.id,
          ...bookingData,
          user: userData,
          pet: {
            name: bookingData.petName || 'N/A',
            breed: bookingData.petBreed || 'Unknown',
            age: bookingData.petAge || 'N/A',
            weight: bookingData.petWeight || 'N/A',
            type: bookingData.petType || 'N/A'
          },
          bookingDate: bookingDate,
          createdAt: bookingData.createdAt?.toDate ? 
            bookingData.createdAt.toDate() : 
            (bookingData.createdAt instanceof Date ? bookingData.createdAt : new Date())
        });
      }
      
      setBookings(bookingsList);
      setFilteredBookings(bookingsList);
      
    } catch (error) {
      console.error('Error fetching grooming bookings:', error);
      toast.error('Failed to load bookings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Apply filters when bookings, status filter, search term, or dates change
    const filtered = bookings.filter(booking => {
      // Status filter - use paymentStatus if status doesn't exist
      const bookingStatus = booking.status || booking.paymentStatus;
      if (statusFilter !== 'all' && bookingStatus !== statusFilter) {
        return false;
      }
      
      // Date range filter
      if (startDate && endDate && booking.bookingDate) {
        const bookingDate = booking.bookingDate;
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Set end date to end of day
        end.setHours(23, 59, 59, 999);
        
        if (bookingDate < start || bookingDate > end) {
          return false;
        }
      }
      
      // Search term filter (checks various fields)
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        return (
          (booking.user?.displayName || '').toLowerCase().includes(searchTermLower) ||
          (booking.user?.email || '').toLowerCase().includes(searchTermLower) ||
          (booking.user?.phone || '').includes(searchTerm) ||
          (booking.pet?.name || '').toLowerCase().includes(searchTermLower) ||
          (booking.pet?.breed || '').toLowerCase().includes(searchTermLower) ||
          (booking.notes || '').toLowerCase().includes(searchTermLower) ||
          (booking.id || '').toLowerCase().includes(searchTermLower)
        );
      }
      
      return true;
    });
    
    setFilteredBookings(filtered);
  }, [bookings, statusFilter, searchTerm, startDate, endDate]);
  
  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      console.log(`Updating booking ${bookingId} to status: ${newStatus}`);
      
      const bookingRef = doc(db, 'groomingBookings', bookingId);
      
      // Get current document to check field names
      const bookingSnapshot = await getDoc(bookingRef);
      if (!bookingSnapshot.exists()) {
        console.error('Booking document does not exist');
        toast.error('Booking not found. Please refresh and try again.');
        return;
      }
      
      const bookingData = bookingSnapshot.data();
      console.log('Current booking data:', bookingData);
      
      // Determine which field to update based on what exists in the document
      const updateData = {};
      
      // If the document has a status field, update it
      if ('status' in bookingData) {
        updateData.status = newStatus;
      }
      
      // If the document has a paymentStatus field, update it
      if ('paymentStatus' in bookingData) {
        updateData.paymentStatus = newStatus;
      }
      
      // If neither field exists, use both to be safe
      if (Object.keys(updateData).length === 0) {
        updateData.status = newStatus;
        updateData.paymentStatus = newStatus;
      }
      
      // Always update the updatedAt timestamp
      updateData.updatedAt = new Date();
      
      console.log('Updating with data:', updateData);
      
      // Perform the update
      await updateDoc(bookingRef, updateData);
      console.log('Update successful');
      
      // Update local state
      setBookings(prev => prev.map(booking => {
        if (booking.id === bookingId) {
          return { 
            ...booking, 
            status: updateData.status || booking.status,
            paymentStatus: updateData.paymentStatus || booking.paymentStatus
          };
        }
        return booking;
      }));
      
      toast.success(`Booking ${newStatus} successfully`);
      
      // Close detail modal if it's open
      if (showDetailModal) {
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error(`Failed to update booking status: ${error.message}. Please try again.`);
    }
  };
  
  const openDetailModal = (booking) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
  };
  
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedBooking(null);
  };
  
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(date).toLocaleDateString('en-US', options);
  };
  
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'arrived':
        return 'bg-indigo-100 text-indigo-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const clearFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };
  
  const refreshBookings = () => {
    fetchAllGroomingBookings();
  };
  
  return (
    <div className="grooming-admin-dashboard">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Grooming Bookings</h1>
        <button
          onClick={refreshBookings}
          className="px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark"
        >
          Refresh
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="all">All Bookings</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="arrived">Arrived</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search customer, pet, etc."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
      
      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-2 text-gray-500">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">No bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pet
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {booking.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {booking.customerName || 'N/A'}<br />
                      <span className="text-xs">{booking.centerEmail || 'No email'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {booking.pet?.name || booking.petName || 'N/A'}<br />
                      <span className="text-xs">{booking.pet?.breed || booking.petBreed || 'Unknown breed'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {booking.serviceType || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {booking.date || formatDate(booking.bookingDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`status-badge ${getStatusBadgeClass(booking.status || booking.paymentStatus)}`}>
                        {(booking.status || booking.paymentStatus || 'Unknown').charAt(0).toUpperCase() + 
                         (booking.status || booking.paymentStatus || 'Unknown').slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        onClick={() => openDetailModal(booking)}
                        className="text-primary hover:text-primary-dark mr-2"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Booking Detail Modal */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Booking Details</h2>
                <button onClick={closeDetailModal} className="text-gray-500 hover:text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Booking Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Booking Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">ID:</span> {selectedBooking.id}</p>
                    <p><span className="font-medium">Service:</span> {selectedBooking.serviceType || 'N/A'}</p>
                    <p><span className="font-medium">Date:</span> {selectedBooking.date || formatDate(selectedBooking.bookingDate)}</p>
                    <p><span className="font-medium">Status:</span> <span className={`status-badge ${getStatusBadgeClass(selectedBooking.status || selectedBooking.paymentStatus)}`}>
                      {(selectedBooking.status || selectedBooking.paymentStatus || 'Unknown').charAt(0).toUpperCase() + 
                       (selectedBooking.status || selectedBooking.paymentStatus || 'Unknown').slice(1)}
                    </span></p>
                    <p><span className="font-medium">Created:</span> {formatDate(selectedBooking.createdAt)}</p>
                    <p><span className="font-medium">Center:</span> {selectedBooking.centerName || 'N/A'}</p>
                    <p><span className="font-medium">Notes:</span> {selectedBooking.notes || 'No notes'}</p>
                  </div>
                </div>
                
                {/* Customer & Pet Details */}
                <div>
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> {selectedBooking.customerName || 'N/A'}</p>
                      <p><span className="font-medium">Email:</span> {selectedBooking.centerEmail || 'N/A'}</p>
                      <p><span className="font-medium">Phone:</span> {selectedBooking.phone || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">Pet Information</h3>
                    <div className="flex">
                      <div className="space-y-2 w-full">
                        <p><span className="font-medium">Name:</span> {selectedBooking.pet?.name || selectedBooking.petName || 'N/A'}</p>
                        <p><span className="font-medium">Breed:</span> {selectedBooking.pet?.breed || selectedBooking.petBreed || 'N/A'}</p>
                        <p><span className="font-medium">Age:</span> {selectedBooking.pet?.age || selectedBooking.petAge || 'N/A'}</p>
                        <p><span className="font-medium">Weight:</span> {selectedBooking.pet?.weight || selectedBooking.petWeight || 'N/A'}</p>
                        <p><span className="font-medium">Type:</span> {selectedBooking.pet?.type || selectedBooking.petType || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="mt-6 border-t pt-4 flex justify-end space-x-3">
                {(selectedBooking.status === 'pending' || selectedBooking.paymentStatus === 'pending') && (
                  <>
                    <button 
                      onClick={() => handleStatusChange(selectedBooking.id, 'confirmed')}
                      className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                    >
                      Confirm Booking
                    </button>
                    <button 
                      onClick={() => handleStatusChange(selectedBooking.id, 'cancelled')}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Cancel Booking
                    </button>
                  </>
                )}
                
                {(selectedBooking.status === 'confirmed' || selectedBooking.paymentStatus === 'confirmed') && (
                  <>
                    <button 
                      onClick={() => handleStatusChange(selectedBooking.id, 'arrived')}
                      className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
                    >
                      Mark as Arrived
                    </button>
                    <button 
                      onClick={() => handleStatusChange(selectedBooking.id, 'cancelled')}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Cancel Booking
                    </button>
                  </>
                )}
                
                {(selectedBooking.status === 'arrived' || selectedBooking.paymentStatus === 'arrived') && (
                  <>
                    <button 
                      onClick={() => handleStatusChange(selectedBooking.id, 'completed')}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Mark as Completed
                    </button>
                    <button 
                      onClick={() => handleStatusChange(selectedBooking.id, 'cancelled')}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Cancel Booking
                    </button>
                  </>
                )}
                
                <button 
                  onClick={closeDetailModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroomingAdminDashboard; 