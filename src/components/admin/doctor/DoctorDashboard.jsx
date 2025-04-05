import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { app } from '../../../firebase/config';
import AppointmentsList from './AppointmentsList';
import DoctorProfile from './DoctorProfile';
import SlotManager from './SlotManager';
import DoctorDebug from './DoctorDebug';
import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
  const [activeTab, setActiveTab] = useState('appointments');
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    upcomingAppointments: 0,
    todayAppointments: 0,
    availableSlots: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Define fetchDoctorStats with useCallback to avoid issues
  const fetchDoctorStats = useCallback(async (doctorId) => {
    if (!doctorId) return;
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      
      // Current date at beginning of day
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      // Current date at end of day
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Query for all appointments
      const allAppointmentsQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', doctorId)
      );
      
      // Query for today's appointments
      const todayAppointmentsQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', doctorId),
        where('appointmentDate', '>=', Timestamp.fromDate(todayStart)),
        where('appointmentDate', '<=', Timestamp.fromDate(todayEnd))
      );
      
      // Query for upcoming appointments (including today)
      const upcomingAppointmentsQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', doctorId),
        where('appointmentDate', '>=', Timestamp.fromDate(todayStart))
      );
      
      // Query for available slots
      const availableSlotsQuery = query(
        collection(db, 'doctorSlots'),
        where('doctorId', '==', doctorId),
        where('isBooked', '==', false),
        where('date', '>=', Timestamp.fromDate(todayStart))
      );
      
      try {
        // Execute all queries
        const [
          allAppointmentsSnapshot, 
          todayAppointmentsSnapshot, 
          upcomingAppointmentsSnapshot, 
          availableSlotsSnapshot
        ] = await Promise.all([
          getDocs(allAppointmentsQuery),
          getDocs(todayAppointmentsQuery),
          getDocs(upcomingAppointmentsQuery),
          getDocs(availableSlotsQuery)
        ]);
        
        // Set stats
        setStats({
          totalAppointments: allAppointmentsSnapshot.size,
          todayAppointments: todayAppointmentsSnapshot.size,
          upcomingAppointments: upcomingAppointmentsSnapshot.size,
          availableSlots: availableSlotsSnapshot.size
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Default to zeros on error
        setStats({
          totalAppointments: 0,
          todayAppointments: 0,
          upcomingAppointments: 0,
          availableSlots: 0
        });
      }
    } catch (error) {
      console.error('Error fetching doctor stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get logged in doctor info
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth) {
      try {
        const admin = JSON.parse(adminAuth);
        if (admin && admin.username) {
          setDoctorInfo({
            username: admin.username,
            name: admin.name || admin.username
          });
          fetchDoctorStats(admin.username);
        }
      } catch (error) {
        console.error('Error parsing admin auth:', error);
      }
    }
  }, [fetchDoctorStats]);

  // Add logout function
  const handleLogout = () => {
    // Remove admin auth from localStorage
    localStorage.removeItem('adminAuth');
    // Redirect to login page
    navigate('/admin');
  };

  if (!doctorInfo) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="text-center text-red-600">
          <p>Not authorized. Please log in as a doctor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Welcome and Logout */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Doctor Dashboard</h1>
            <p className="text-gray-600">
              Welcome, Dr. {doctorInfo.name || doctorInfo.username}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-primary">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Appointments</p>
              <p className="text-2xl font-bold text-gray-800">
                {loading ? '...' : stats.totalAppointments}
              </p>
            </div>
            <div className="bg-primary-light p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-sm">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-800">
                {loading ? '...' : stats.todayAppointments}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-sm">Upcoming Appointments</p>
              <p className="text-2xl font-bold text-gray-800">
                {loading ? '...' : stats.upcomingAppointments}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-sm">Available Slots</p>
              <p className="text-2xl font-bold text-gray-800">
                {loading ? '...' : stats.availableSlots}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex border-b">
          <button
            className={`py-4 px-6 focus:outline-none ${
              activeTab === 'appointments'
                ? 'border-b-2 border-primary text-primary font-medium'
                : 'text-gray-600 hover:text-primary'
            }`}
            onClick={() => setActiveTab('appointments')}
          >
            Appointments
          </button>
          <button
            className={`py-4 px-6 focus:outline-none ${
              activeTab === 'slots'
                ? 'border-b-2 border-primary text-primary font-medium'
                : 'text-gray-600 hover:text-primary'
            }`}
            onClick={() => setActiveTab('slots')}
          >
            Availability
          </button>
          <button
            className={`py-4 px-6 focus:outline-none ${
              activeTab === 'debug'
                ? 'border-b-2 border-primary text-primary font-medium'
                : 'text-gray-600 hover:text-primary'
            }`}
            onClick={() => setActiveTab('debug')}
          >
            Debug
          </button>
        </div>
        
        <div className="p-4">
          {activeTab === 'appointments' && <AppointmentsList />}
          {activeTab === 'slots' && <SlotManager />}
          {activeTab === 'debug' && <DoctorDebug />}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard; 