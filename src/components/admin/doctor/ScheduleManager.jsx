import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, query, where, getDocs, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { app } from '../../../firebase/config';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const ScheduleManager = () => {
  const [date, setDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingSlot, setAddingSlot] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [slotDuration, setSlotDuration] = useState(30); // in minutes
  const [messageType, setMessageType] = useState(null); // 'success' or 'error'
  const [message, setMessage] = useState('');

  // Get doctor data from localStorage
  const doctorData = JSON.parse(localStorage.getItem('adminAuth') || '{}');
  const doctorId = doctorData.username || '';

  useEffect(() => {
    if (date) {
      fetchAvailableSlots();
    }
  }, [date]);

  const fetchAvailableSlots = async () => {
    if (!doctorId) return;
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      const selectedDate = new Date(date);
      
      // Set to beginning of day
      selectedDate.setHours(0, 0, 0, 0);
      
      // Set to end of day
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
      
      // Query Firestore for slots on the selected date
      const slotsQuery = query(
        collection(db, 'doctorSlots'),
        where('doctorId', '==', doctorId),
        where('date', '>=', Timestamp.fromDate(selectedDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
      );
      
      const querySnapshot = await getDocs(slotsQuery);
      
      const slots = [];
      querySnapshot.forEach((doc) => {
        slots.push({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate()
        });
      });
      
      // Sort slots by start time
      slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setMessage('Error loading availability slots');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    if (!startTime || !endTime || !slotDuration) return;
    
    const slots = [];
    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);
    
    let current = new Date(date);
    current.setHours(start[0], start[1], 0);
    
    const endDateTime = new Date(date);
    endDateTime.setHours(end[0], end[1], 0);
    
    while (current < endDateTime) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);
      
      if (slotEnd <= endDateTime) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          startTime: `${slotStart.getHours().toString().padStart(2, '0')}:${slotStart.getMinutes().toString().padStart(2, '0')}`,
          endTime: `${slotEnd.getHours().toString().padStart(2, '0')}:${slotEnd.getMinutes().toString().padStart(2, '0')}`
        });
      }
      
      // Move to next slot
      current.setMinutes(current.getMinutes() + slotDuration);
    }
    
    setTimeSlots(slots);
  };

  const handleAddSlots = async () => {
    if (timeSlots.length === 0) {
      setMessage('Please generate time slots first');
      setMessageType('error');
      return;
    }
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      
      // Add each slot to Firestore
      for (const slot of timeSlots) {
        await addDoc(collection(db, 'doctorSlots'), {
          doctorId,
          doctorName: doctorData.name,
          date: Timestamp.fromDate(new Date(date)),
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBooked: false,
          createdAt: Timestamp.now()
        });
      }
      
      setMessage(`Successfully added ${timeSlots.length} availability slots`);
      setMessageType('success');
      setTimeSlots([]);
      setAddingSlot(false);
      
      // Refresh available slots
      fetchAvailableSlots();
    } catch (error) {
      console.error('Error adding slots:', error);
      setMessage('Error adding availability slots');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!slotId) return;
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      await deleteDoc(doc(db, 'doctorSlots', slotId));
      
      setMessage('Slot removed successfully');
      setMessageType('success');
      
      // Refresh available slots
      fetchAvailableSlots();
    } catch (error) {
      console.error('Error deleting slot:', error);
      setMessage('Error removing slot');
      setMessageType('error');
    } finally {
      setLoading(false);
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

  return (
    <div>
      <h3 className="text-xl font-semibold text-primary mb-4">Manage Your Schedule</h3>
      
      {messageType && (
        <div className={`p-4 mb-4 rounded-md ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Select Date</h4>
          <div className="flex justify-center mb-4">
            <Calendar
              onChange={setDate}
              value={date}
              minDate={new Date()}
              className="border border-gray-200 rounded-lg shadow-sm"
            />
          </div>
          <div className="text-center">
            <p className="text-gray-700">Selected Date: <span className="font-semibold">{formatDate(date)}</span></p>
          </div>
        </div>
        
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Availability Slots</h4>
          
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {!addingSlot ? (
                <div>
                  {availableSlots.length > 0 ? (
                    <div className="space-y-2">
                      {availableSlots.map((slot) => (
                        <div key={slot.id} className="flex justify-between items-center bg-white p-3 rounded-md border border-gray-200">
                          <div>
                            <span className="font-medium">{slot.startTime} - {slot.endTime}</span>
                            <span className="ml-2 text-sm text-gray-500">
                              {slot.isBooked ? '(Booked)' : '(Available)'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            disabled={slot.isBooked || loading}
                            className={`text-sm px-2 py-1 rounded ${
                              slot.isBooked
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }`}
                          >
                            {slot.isBooked ? 'Booked' : 'Remove'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-md border border-gray-200 text-center">
                      <p className="text-gray-500">No availability slots for this date</p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setAddingSlot(true)}
                    className="mt-4 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors"
                  >
                    Add Availability
                  </button>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-md border border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3">Add New Availability</h5>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Slot Duration (minutes)</label>
                      <select
                        value={slotDuration}
                        onChange={(e) => setSlotDuration(Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>
                    </div>
                    
                    <div className="flex justify-between">
                      <button
                        onClick={generateTimeSlots}
                        className="bg-secondary text-white py-2 px-4 rounded-md hover:bg-secondary-dark transition-colors"
                      >
                        Generate Slots
                      </button>
                      
                      <div>
                        <button
                          onClick={() => {
                            setAddingSlot(false);
                            setTimeSlots([]);
                          }}
                          className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors mr-2"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddSlots}
                          disabled={timeSlots.length === 0 || loading}
                          className={`py-2 px-4 rounded-md ${
                            timeSlots.length === 0
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-primary text-white hover:bg-primary-dark'
                          } transition-colors`}
                        >
                          {loading ? 'Adding...' : 'Add Slots'}
                        </button>
                      </div>
                    </div>
                    
                    {timeSlots.length > 0 && (
                      <div>
                        <h6 className="font-medium text-gray-700 mb-2">Generated Time Slots:</h6>
                        <div className="max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-md">
                          {timeSlots.map((slot, index) => (
                            <div key={index} className="text-sm py-1 border-b border-gray-100 last:border-b-0">
                              {slot.startTime} - {slot.endTime}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleManager; 