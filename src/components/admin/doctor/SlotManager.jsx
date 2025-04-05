import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { app } from '../../../firebase/config';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const SlotManager = () => {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [doctorId, setDoctorId] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [newSlot, setNewSlot] = useState({ startTime: '09:00', endTime: '10:00' });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(null);

  // Generate time options in 15-minute increments
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 8; hour < 21; hour++) { // 8 AM to 8 PM
      for (let minute = 0; minute < 60; minute += 15) {
        const hourStr = hour.toString().padStart(2, '0');
        const minuteStr = minute.toString().padStart(2, '0');
        options.push(`${hourStr}:${minuteStr}`);
      }
    }
    options.push('21:00'); // Add 9 PM as the last option
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Define fetchSlots with useCallback to avoid dependency loop
  const fetchSlots = useCallback(async () => {
    if (!doctorId) return;
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      const selectedDateCopy = new Date(selectedDate);
      
      // Set to beginning of day
      selectedDateCopy.setHours(0, 0, 0, 0);
      
      // Set to end of day
      const endDate = new Date(selectedDateCopy);
      endDate.setHours(23, 59, 59, 999);
      
      // Query Firestore for slots on the selected date
      const slotsQuery = query(
        collection(db, 'doctorSlots'),
        where('doctorId', '==', doctorId),
        where('date', '>=', Timestamp.fromDate(selectedDateCopy)),
        where('date', '<=', Timestamp.fromDate(endDate))
      );
      
      const querySnapshot = await getDocs(slotsQuery);
      
      const slotsList = [];
      querySnapshot.forEach((doc) => {
        slotsList.push({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate()
        });
      });
      
      // Sort slots by start time
      slotsList.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      setSlots(slotsList);
      setMessage('');
      setMessageType(null);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setMessage('Error loading slots. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, [doctorId, selectedDate]);

  useEffect(() => {
    // Get logged in doctor info
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth) {
      try {
        const admin = JSON.parse(adminAuth);
        if (admin && admin.username) {
          setDoctorId(admin.username);
          setDoctorName(admin.name || admin.username);
        }
      } catch (error) {
        console.error('Error parsing admin auth:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Fetch slots for the selected date when doctorId is available
    if (doctorId) {
      fetchSlots();
    }
  }, [doctorId, selectedDate, fetchSlots]);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSlot({
      ...newSlot,
      [name]: value
    });
  };

  const validateTimeSlot = () => {
    const { startTime, endTime } = newSlot;
    
    // Check if end time is after start time
    if (startTime >= endTime) {
      setMessage('End time must be after start time');
      setMessageType('error');
      return false;
    }
    
    // Check for overlapping slots
    for (const slot of slots) {
      if (
        (startTime >= slot.startTime && startTime < slot.endTime) ||
        (endTime > slot.startTime && endTime <= slot.endTime) ||
        (startTime <= slot.startTime && endTime >= slot.endTime)
      ) {
        setMessage('This time slot overlaps with an existing slot');
        setMessageType('error');
        return false;
      }
    }
    
    return true;
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    
    if (!validateTimeSlot()) {
      return;
    }
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      
      // Create a date object with the selected date but reset time
      const slotDate = new Date(selectedDate);
      slotDate.setHours(0, 0, 0, 0);
      
      // Add new slot
      await addDoc(collection(db, 'doctorSlots'), {
        doctorId,
        doctorName,
        date: Timestamp.fromDate(slotDate),
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        isBooked: false,
        createdAt: Timestamp.now()
      });
      
      // Refresh slots
      await fetchSlots();
      
      setMessage('Slot added successfully');
      setMessageType('success');
    } catch (error) {
      console.error('Error adding slot:', error);
      setMessage('Error adding slot. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId, isBooked) => {
    if (isBooked) {
      setMessage('Cannot delete a booked slot');
      setMessageType('error');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this slot?')) {
      setLoading(true);
      try {
        const db = getFirestore(app);
        await deleteDoc(doc(db, 'doctorSlots', slotId));
        
        // Refresh slots
        await fetchSlots();
        
        setMessage('Slot deleted successfully');
        setMessageType('success');
      } catch (error) {
        console.error('Error deleting slot:', error);
        setMessage('Error deleting slot. Please try again.');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!doctorId) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="text-center text-red-600">
          <p>Not authorized. Please log in as a doctor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Manage Your Availability</h2>
      
      {messageType && (
        <div className={`p-4 mb-6 rounded ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Select Date</h3>
          <div className="mb-6">
            <Calendar
              onChange={handleDateChange}
              value={selectedDate}
              minDate={new Date()}
              className="border rounded-lg shadow-sm"
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Add New Slot</h3>
            <form onSubmit={handleAddSlot} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <select
                    name="startTime"
                    value={newSlot.startTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {timeOptions.map((time) => (
                      <option key={`start-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <select
                    name="endTime"
                    value={newSlot.endTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {timeOptions.map((time) => (
                      <option key={`end-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                >
                  {loading ? 'Adding...' : 'Add Availability Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            Available Slots for {formatDate(selectedDate)}
          </h3>
          
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : slots.length > 0 ? (
            <div className="space-y-3">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`p-4 rounded-lg border ${
                    slot.isBooked ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                  } flex justify-between items-center`}
                >
                  <div>
                    <p className="font-medium">{slot.startTime} - {slot.endTime}</p>
                    <p className={`text-sm ${slot.isBooked ? 'text-blue-600' : 'text-gray-500'}`}>
                      {slot.isBooked ? 'Booked' : 'Available'}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteSlot(slot.id, slot.isBooked)}
                    disabled={slot.isBooked}
                    className={`p-2 rounded-full ${
                      slot.isBooked
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-center">
              <p className="text-yellow-700">No slots available for this date.</p>
              <p className="text-sm text-yellow-600 mt-2">Add availability slots to allow patients to book appointments.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlotManager; 