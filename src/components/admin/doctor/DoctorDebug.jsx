import React, { useState } from 'react';
import { getFirestore, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { app } from '../../../firebase/config';
import { seedDoctorSlots, seedAppointments } from '../../../firebase/seedData';

const DoctorDebug = () => {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dbInfo, setDbInfo] = useState(null);
  const [showDbInfo, setShowDbInfo] = useState(false);

  const checkLogin = () => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (!adminAuth) {
      setMessage('No doctor is logged in. Please log in first.');
      setMessageType('error');
      return null;
    }

    try {
      const admin = JSON.parse(adminAuth);
      if (!admin.username) {
        setMessage('Invalid login information.');
        setMessageType('error');
        return null;
      }
      return admin;
    } catch (error) {
      setMessage('Error parsing login data.');
      setMessageType('error');
      return null;
    }
  };

  const handleSeedSlots = async () => {
    const admin = checkLogin();
    if (!admin) return;

    setLoading(true);
    try {
      const result = await seedDoctorSlots();
      if (result) {
        setMessage('Successfully added sample slots data.');
        setMessageType('success');
      } else {
        setMessage('Failed to add sample slots data.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error adding sample data:', error);
      setMessage('Error adding sample data: ' + error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedAppointments = async () => {
    const admin = checkLogin();
    if (!admin) return;

    setLoading(true);
    try {
      const result = await seedAppointments();
      if (result) {
        setMessage('Successfully added sample appointments data.');
        setMessageType('success');
      } else {
        setMessage('Failed to add sample appointments data.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error adding sample appointments:', error);
      setMessage('Error adding sample appointments: ' + error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const checkDatabaseStatus = async () => {
    const admin = checkLogin();
    if (!admin) return;

    setLoading(true);
    try {
      const db = getFirestore(app);
      const doctorId = admin.username;

      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Query slots
      const slotsQuery = query(
        collection(db, 'doctorSlots'),
        where('doctorId', '==', doctorId)
      );
      const slotsSnapshot = await getDocs(slotsQuery);
      
      // Query appointments
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('doctorId', '==', doctorId)
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);

      // Format results
      const info = {
        doctorId,
        totalSlots: slotsSnapshot.size,
        slots: [],
        totalAppointments: appointmentsSnapshot.size,
        appointments: []
      };

      // Get slots data
      slotsSnapshot.forEach(doc => {
        const data = doc.data();
        info.slots.push({
          id: doc.id,
          date: data.date.toDate().toLocaleDateString(),
          time: `${data.startTime} - ${data.endTime}`,
          isBooked: data.isBooked
        });
      });

      // Get appointments data
      appointmentsSnapshot.forEach(doc => {
        const data = doc.data();
        info.appointments.push({
          id: doc.id,
          date: data.appointmentDate.toDate().toLocaleDateString(),
          time: `${data.startTime} - ${data.endTime}`,
          patient: data.patientName,
          status: data.status
        });
      });

      setDbInfo(info);
      setShowDbInfo(true);
      setMessage('Database status fetched successfully.');
      setMessageType('success');
    } catch (error) {
      console.error('Error checking database status:', error);
      setMessage('Error checking database status: ' + error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Doctor Dashboard Debug</h2>
      
      {messageType && (
        <div className={`p-4 mb-6 rounded ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}
      
      <div className="flex flex-wrap gap-4 mb-6">
        <button 
          onClick={handleSeedSlots}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Add Sample Slots'}
        </button>
        
        <button 
          onClick={handleSeedAppointments}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Add Sample Appointments'}
        </button>
        
        <button 
          onClick={checkDatabaseStatus}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Check Database Status'}
        </button>
      </div>
      
      {showDbInfo && dbInfo && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Database Information</h3>
          <div className="bg-gray-50 p-4 rounded border">
            <p><strong>Doctor ID:</strong> {dbInfo.doctorId}</p>
            <p><strong>Total Slots:</strong> {dbInfo.totalSlots}</p>
            <p><strong>Total Appointments:</strong> {dbInfo.totalAppointments}</p>
            
            {dbInfo.slots.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Slots:</h4>
                <div className="max-h-60 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Time</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbInfo.slots.map((slot) => (
                        <tr key={slot.id} className="border-b">
                          <td className="p-2">{slot.date}</td>
                          <td className="p-2">{slot.time}</td>
                          <td className="p-2">{slot.isBooked ? 'Booked' : 'Available'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {dbInfo.appointments.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Appointments:</h4>
                <div className="max-h-60 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Time</th>
                        <th className="p-2 text-left">Patient</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbInfo.appointments.map((appointment) => (
                        <tr key={appointment.id} className="border-b">
                          <td className="p-2">{appointment.date}</td>
                          <td className="p-2">{appointment.time}</td>
                          <td className="p-2">{appointment.patient}</td>
                          <td className="p-2">{appointment.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDebug; 