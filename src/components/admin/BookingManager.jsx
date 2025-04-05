import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { app } from '../../firebase/config';

const BookingManager = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'confirmed', 'completed', 'cancelled'
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [messageType, setMessageType] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const db = getFirestore(app);
      let appointmentsQuery;
      
      if (filter === 'all') {
        appointmentsQuery = query(
          collection(db, 'appointments'),
          orderBy('appointmentDate', 'desc')
        );
      } else {
        appointmentsQuery = query(
          collection(db, 'appointments'),
          where('status', '==', filter),
          orderBy('appointmentDate', 'desc')
        );
      }
      
      const snapshot = await getDocs(appointmentsQuery);
      
      const appointmentsList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        appointmentsList.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to JavaScript Date objects
          appointmentDate: data.appointmentDate instanceof Timestamp ? 
            data.appointmentDate.toDate() : new Date(),
          createdAt: data.createdAt instanceof Timestamp ? 
            data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt instanceof Timestamp ? 
            data.updatedAt.toDate() : new Date()
        });
      });
      
      setAppointments(appointmentsList);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setMessage('Error loading appointments. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    if (!appointmentId) return;
    
    try {
      const db = getFirestore(app);
      const appointmentRef = doc(db, 'appointments', appointmentId);
      
      await updateDoc(appointmentRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      setMessage(`Appointment status updated to ${newStatus}.`);
      setMessageType('success');
      
      // Update local state
      setAppointments(prevAppointments => 
        prevAppointments.map(appointment => 
          appointment.id === appointmentId 
            ? { ...appointment, status: newStatus, updatedAt: new Date() } 
            : appointment
        )
      );
      
      // Close detail view if open
      if (selectedAppointment && selectedAppointment.id === appointmentId) {
        setSelectedAppointment({
          ...selectedAppointment,
          status: newStatus,
          updatedAt: new Date()
        });
      }
      
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setMessage('Error updating appointment status. Please try again.');
      setMessageType('error');
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (!appointmentId) return;
    
    if (!window.confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      return;
    }
    
    try {
      const db = getFirestore(app);
      await deleteDoc(doc(db, 'appointments', appointmentId));
      
      setMessage('Appointment successfully deleted.');
      setMessageType('success');
      
      // Update local state
      setAppointments(prevAppointments => 
        prevAppointments.filter(appointment => appointment.id !== appointmentId)
      );
      
      // Close detail view if open
      if (selectedAppointment && selectedAppointment.id === appointmentId) {
        setSelectedAppointment(null);
      }
      
    } catch (error) {
      console.error('Error deleting appointment:', error);
      setMessage('Error deleting appointment. Please try again.');
      setMessageType('error');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date, timeStr) => {
    if (!timeStr) return 'N/A';
    return timeStr;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Appointment Management</h2>
      
      {messageType && (
        <div className={`p-4 mb-6 rounded ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${filter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-4 py-2 rounded-md ${filter === 'confirmed' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
          >
            Confirmed
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-md ${filter === 'completed' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-md ${filter === 'cancelled' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
          >
            Cancelled
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-lg font-medium text-gray-700">
                {filter === 'all' ? 'All Appointments' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Appointments`}
              </h3>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : appointments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {appointments.map((appointment) => (
                      <tr 
                        key={appointment.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedAppointment(appointment)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatDate(appointment.appointmentDate)}</div>
                          <div className="text-sm text-gray-500">{formatTime(appointment.appointmentDate, appointment.startTime)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{appointment.patientName}</div>
                          <div className="text-sm text-gray-500">{appointment.patientEmail}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">Dr. {appointment.doctorName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                            {appointment.status?.charAt(0).toUpperCase() + appointment.status?.slice(1) || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newStatus = appointment.status === 'pending' ? 'confirmed' : 'completed';
                              handleUpdateStatus(appointment.id, newStatus);
                            }}
                            className="text-primary hover:text-primary-dark mr-3"
                          >
                            {appointment.status === 'pending' ? 'Confirm' : 
                             appointment.status === 'confirmed' ? 'Complete' : 'View'}
                          </button>
                          {appointment.status !== 'cancelled' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(appointment.id, 'cancelled');
                              }}
                              className="text-red-600 hover:text-red-800 mr-3"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAppointment(appointment.id);
                            }}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No {filter !== 'all' ? filter : ''} appointments found.
              </div>
            )}
          </div>
        </div>
        
        {selectedAppointment && (
          <div>
            <div className="bg-white shadow-md rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-700">
                  Appointment Details
                </h3>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedAppointment.status)}`}>
                    {selectedAppointment.status?.charAt(0).toUpperCase() + selectedAppointment.status?.slice(1) || 'Unknown'}
                  </span>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Appointment Time</h4>
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedAppointment.appointmentDate)}, 
                    {' '}{formatTime(selectedAppointment.appointmentDate, selectedAppointment.startTime)} - 
                    {' '}{formatTime(selectedAppointment.appointmentDate, selectedAppointment.endTime)}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Doctor</h4>
                  <p className="text-sm text-gray-600">Dr. {selectedAppointment.doctorName}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Patient Information</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm">{selectedAppointment.patientName}</span>
                    
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm">{selectedAppointment.patientEmail}</span>
                    
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm">{selectedAppointment.patientPhone}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Pet Information</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm">{selectedAppointment.petName || 'N/A'}</span>
                    
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm">{selectedAppointment.petType || 'N/A'}</span>
                    
                    <span className="text-sm text-gray-600">Breed:</span>
                    <span className="text-sm">{selectedAppointment.petBreed || 'N/A'}</span>
                    
                    <span className="text-sm text-gray-600">Age:</span>
                    <span className="text-sm">{selectedAppointment.petAge || 'N/A'}</span>
                  </div>
                </div>
                
                {selectedAppointment.reason && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Reason for Visit</h4>
                    <p className="text-sm text-gray-600">{selectedAppointment.reason}</p>
                  </div>
                )}
                
                {selectedAppointment.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Additional Notes</h4>
                    <p className="text-sm text-gray-600">{selectedAppointment.notes}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between">
                    <div className="space-x-2">
                      {selectedAppointment.status !== 'cancelled' && (
                        <>
                          {selectedAppointment.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(selectedAppointment.id, 'confirmed')}
                              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              Confirm
                            </button>
                          )}
                          
                          {selectedAppointment.status === 'confirmed' && (
                            <button
                              onClick={() => handleUpdateStatus(selectedAppointment.id, 'completed')}
                              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Mark Completed
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleUpdateStatus(selectedAppointment.id, 'cancelled')}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Cancel Appointment
                          </button>
                        </>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingManager; 