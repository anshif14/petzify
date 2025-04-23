import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { app, db } from '../../firebase/config';

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingPetCount, setPendingPetCount] = useState(0);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [bookingUpdateLoading, setBookingUpdateLoading] = useState(false);
  
  // Fetch pending pet count
  const fetchPendingPetCount = async () => {
    try {
      const db = getFirestore(app);
      const q = query(
        collection(db, 'rehoming_pets'),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      setPendingPetCount(querySnapshot.size);
    } catch (error) {
      console.error('Error fetching pending pet count:', error);
    }
  };
  
  // Fetch pending bookings
  const fetchPendingBookings = async () => {
    try {
      const q = query(
        collection(db, 'petBoardingBookings'),
        where('status', '==', 'pending'),
        // Limit to recent 5 bookings for the dashboard overview
        // You can adjust this limit as needed
      );
      const querySnapshot = await getDocs(q);
      const bookings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.seconds * 1000) : new Date()
      }));
      
      setPendingBookings(bookings.slice(0, 3)); // Show only the first 3 in the dashboard
      setPendingBookingsCount(querySnapshot.size);
    } catch (error) {
      console.error('Error fetching pending bookings:', error);
    }
  };
  
  // Handle booking confirmation
  const handleConfirmBooking = async (bookingId) => {
    try {
      setBookingUpdateLoading(true);
      
      const bookingRef = doc(db, 'petBoardingBookings', bookingId);
      await updateDoc(bookingRef, {
        status: 'confirmed',
        updatedAt: Timestamp.now()
      });
      
      // Refresh the bookings
      fetchPendingBookings();
    } catch (error) {
      console.error('Error confirming booking:', error);
    } finally {
      setBookingUpdateLoading(false);
    }
  };
  
  // Fetch pending pet count and bookings on mount
  useEffect(() => {
    fetchPendingPetCount();
    fetchPendingBookings();
  }, []);
  
  // Navigate to the dashboard overview if no specific route is selected
  useEffect(() => {
    if (location.pathname === '/admin/dashboard') {
      navigate('/admin/dashboard');
    }
  }, [location, navigate]);
  
  // Check if a tab is active
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  // Format date
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white shadow-md">
          <nav className="p-2">
            <ul className="space-y-1">
              <li>
                <Link
                  to="/admin/dashboard"
                  className={`flex items-center px-4 py-3 ${
                    location.pathname === '/admin/dashboard'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/dashboard/users"
                  className={`flex items-center px-4 py-3 ${
                    isActive('/admin/dashboard/users')
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  User Management
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/dashboard/appointments"
                  className={`flex items-center px-4 py-3 ${
                    isActive('/admin/dashboard/appointments')
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Appointments
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/dashboard/contact"
                  className={`flex items-center px-4 py-3 ${
                    isActive('/admin/dashboard/contact')
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Information
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/dashboard/messages"
                  className={`flex items-center px-4 py-3 ${
                    isActive('/admin/dashboard/messages')
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Messages
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/dashboard/products"
                  className={`flex items-center px-4 py-3 ${
                    isActive('/admin/dashboard/products')
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Products
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/dashboard/content"
                  className={`flex items-center px-4 py-3 ${
                    isActive('/admin/dashboard/content')
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Content Management
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/pet-boarding"
                  className={`flex items-center px-4 py-3 ${
                    location.pathname.includes('/admin/pet-boarding') && !location.pathname.includes('/admin/boarding-bookings')
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Pet Boarding
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/boarding-bookings"
                  className={`flex items-center px-4 py-3 ${
                    location.pathname.includes('/admin/boarding-bookings')
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Boarding Bookings
                  {pendingBookingsCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {pendingBookingsCount}
                    </span>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/dashboard/pet-parenting"
                  className={`flex items-center px-4 py-3 ${
                    isActive('/admin/dashboard/pet-parenting')
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Pet Parenting
                  {pendingPetCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {pendingPetCount}
                    </span>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/dashboard/profile"
                  className={`flex items-center px-4 py-3 ${
                    isActive('/admin/dashboard/profile')
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Profile
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/logout"
                  className="flex items-center px-4 py-3 text-red-600 hover:bg-red-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-8">
          <Outlet />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Pet Boarding Management card */}
            <div 
              onClick={() => navigate('/admin/pet-boarding')}
              className="bg-white rounded-lg shadow hover:shadow-lg cursor-pointer transition-shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Pet Boarding Management</h3>
                <div className="rounded-full bg-blue-100 p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Manage pet boarding center registrations, approvals, and monitoring.
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Manage boarding centers</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Boarding Bookings Management card */}
            <div 
              onClick={() => navigate('/admin/boarding-bookings')}
              className="bg-white rounded-lg shadow hover:shadow-lg cursor-pointer transition-shadow p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Boarding Bookings</h3>
                <div className="rounded-full bg-green-100 p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Manage bookings for pet boarding centers. {pendingBookingsCount > 0 && <span className="font-semibold text-primary">{pendingBookingsCount} pending bookings require attention.</span>}
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Manage booking requests</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pending Booking Requests Section - Only show if there are pending bookings */}
          {pendingBookings.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Booking Requests</h3>
              <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingBookings.map(booking => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{booking.userName}</div>
                          <div className="text-xs text-gray-500">{booking.userEmail}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{booking.centerName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {formatDate(new Date(booking.dateFrom))} to {formatDate(new Date(booking.dateTo))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => handleConfirmBooking(booking.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition"
                            disabled={bookingUpdateLoading}
                          >
                            {bookingUpdateLoading ? 'Processing...' : 'Confirm'}
                          </button>
                          <button 
                            onClick={() => navigate(`/admin/boarding-bookings`)}
                            className="ml-2 text-primary hover:text-primary-dark text-sm"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pendingBookingsCount > 3 && (
                  <div className="px-6 py-3 bg-gray-50 text-right">
                    <Link to="/admin/boarding-bookings" className="text-primary hover:text-primary-dark text-sm font-medium">
                      View all {pendingBookingsCount} pending bookings →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;