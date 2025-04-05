import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { app } from '../../../firebase/config';

const AppointmentsList = () => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('upcoming');
  const [doctorId, setDoctorId] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(null);

  useEffect(() => {
    // Get logged in doctor info
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth) {
      try {
        const admin = JSON.parse(adminAuth);
        if (admin && admin.username) {
          setDoctorId(admin.username);
        }
      } catch (error) {
        console.error('Error parsing admin auth:', error);
      }
    }
  }, []);

  // Define fetchAppointments with useCallback to avoid dependency loop
  const fetchAppointments = useCallback(async () => {
    if (!doctorId) return;
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      let appointmentsQuery;
      
      // Current date at beginning of day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Create query based on filter
      if (filter === 'all') {
        appointmentsQuery = query(
          collection(db, 'appointments'),
          where('doctorId', '==', doctorId)
        );
      } else if (filter === 'today') {
        // End of today
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        
        appointmentsQuery = query(
          collection(db, 'appointments'),
          where('doctorId', '==', doctorId),
          where('appointmentDate', '>=', Timestamp.fromDate(today)),
          where('appointmentDate', '<=', Timestamp.fromDate(endOfToday))
        );
      } else if (filter === 'upcoming') {
        appointmentsQuery = query(
          collection(db, 'appointments'),
          where('doctorId', '==', doctorId),
          where('appointmentDate', '>=', Timestamp.fromDate(today))
        );
      } else if (filter === 'past') {
        appointmentsQuery = query(
          collection(db, 'appointments'),
          where('doctorId', '==', doctorId),
          where('appointmentDate', '<', Timestamp.fromDate(today))
        );
      }
      
      const querySnapshot = await getDocs(appointmentsQuery);
      
      const appointmentsList = [];
      querySnapshot.forEach((doc) => {
        appointmentsList.push({
          id: doc.id,
          ...doc.data(),
          appointmentDate: doc.data().appointmentDate.toDate()
        });
      });
      
      // Sort appointments by date and time
      appointmentsList.sort((a, b) => {
        if (a.appointmentDate.getTime() !== b.appointmentDate.getTime()) {
          return a.appointmentDate - b.appointmentDate;
        }
        return a.startTime.localeCompare(b.startTime);
      });
      
      setAppointments(appointmentsList);
      setMessage('');
      setMessageType(null);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setMessage('Error loading appointments. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, [doctorId, filter]);

  useEffect(() => {
    if (doctorId) {
      fetchAppointments();
    }
  }, [doctorId, filter, fetchAppointments]);

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    setLoading(true);
    try {
      const db = getFirestore(app);
      const appointmentRef = doc(db, 'appointments', appointmentId);
      
      await updateDoc(appointmentRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      // Update the appointment in the local state
      setAppointments(appointments.map(appt => 
        appt.id === appointmentId ? { ...appt, status: newStatus } : appt
      ));
      
      setMessage(`Appointment status updated to ${newStatus}`);
      setMessageType('success');
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setMessage('Error updating appointment status. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (!doctorId) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <p>Not authorized. Please log in as a doctor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Appointments</h2>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1 rounded-md ${
              filter === 'upcoming'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`px-3 py-1 rounded-md ${
              filter === 'today'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-3 py-1 rounded-md ${
              filter === 'past'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Past
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
        </div>
      </div>
      
      {messageType && (
        <div className={`p-4 mb-6 rounded ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : appointments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatDate(appointment.appointmentDate)}</div>
                    <div className="text-sm text-gray-500">{appointment.startTime} - {appointment.endTime}</div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{appointment.patientName}</div>
                    <div className="text-sm text-gray-500">{appointment.patientPhone}</div>
                    <div className="text-sm text-gray-500">{appointment.patientEmail}</div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{appointment.petName || 'N/A'}</div>
                    <div className="text-sm text-gray-500">
                      {appointment.petType && `${appointment.petType}${appointment.petBreed ? ` - ${appointment.petBreed}` : ''}`}
                    </div>
                    <div className="text-sm text-gray-500">{appointment.petAge || ''}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-900">{appointment.reason || 'Not specified'}</div>
                    {appointment.notes && (
                      <div className="text-sm text-gray-500 max-w-xs truncate">{appointment.notes}</div>
                    )}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {appointment.status === 'pending' && (
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                        >
                          Confirm
                        </button>
                      )}
                      
                      {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                        <>
                          <button
                            onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                          >
                            Complete
                          </button>
                          
                          <button
                            onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                            className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-center">
          <p className="text-yellow-700">No appointments found.</p>
          <p className="text-sm text-yellow-600 mt-2">
            {filter === 'upcoming' && 'You have no upcoming appointments.'}
            {filter === 'today' && 'You have no appointments scheduled for today.'}
            {filter === 'past' && 'You have no past appointments.'}
            {filter === 'all' && 'No appointments found in the system.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AppointmentsList; 