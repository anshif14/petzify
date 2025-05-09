import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { toast } from 'react-toastify';

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const GroomingScheduleManager = ({ adminData }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState({
    Monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    Tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    Wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    Thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    Friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    Saturday: { isOpen: true, openTime: '10:00', closeTime: '16:00' },
    Sunday: { isOpen: false, openTime: '10:00', closeTime: '16:00' }
  });
  const [slotDuration, setSlotDuration] = useState(30); // in minutes
  const [maxBookingsPerSlot, setMaxBookingsPerSlot] = useState(2);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(14);
  
  useEffect(() => {
    if (adminData) {
      fetchScheduleSettings();
    }
  }, [adminData]);
  
  const fetchScheduleSettings = async () => {
    try {
      setLoading(true);
      
      if (!adminData || (!adminData.centerId && !adminData.groomingCenterId)) {
        toast.error('Cannot find grooming center ID');
        setLoading(false);
        return;
      }
      
      const centerId = adminData.centerId || adminData.groomingCenterId;
      const centerDoc = await getDoc(doc(db, 'groomingCenters', centerId));
      
      if (centerDoc.exists()) {
        const centerData = centerDoc.data();
        
        // Set schedule from database or use default
        if (centerData.schedule) {
          setSchedule(centerData.schedule);
        }
        
        // Set other booking parameters
        if (centerData.slotDuration) {
          setSlotDuration(centerData.slotDuration);
        }
        
        if (centerData.maxBookingsPerSlot) {
          setMaxBookingsPerSlot(centerData.maxBookingsPerSlot);
        }
        
        if (centerData.advanceBookingDays) {
          setAdvanceBookingDays(centerData.advanceBookingDays);
        }
      }
    } catch (error) {
      console.error('Error fetching schedule settings:', error);
      toast.error('Failed to load schedule settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDayToggle = (day) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen
      }
    }));
  };
  
  const handleTimeChange = (day, type, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: value
      }
    }));
  };
  
  const validateSchedule = () => {
    for (const day of DAYS) {
      const daySchedule = schedule[day];
      
      if (daySchedule.isOpen) {
        const openTime = daySchedule.openTime;
        const closeTime = daySchedule.closeTime;
        
        if (!openTime || !closeTime) {
          toast.error(`Please set both opening and closing times for ${day}`);
          return false;
        }
        
        if (openTime >= closeTime) {
          toast.error(`Opening time must be earlier than closing time for ${day}`);
          return false;
        }
      }
    }
    
    if (slotDuration <= 0 || slotDuration > 120) {
      toast.error('Slot duration must be between 1 and 120 minutes');
      return false;
    }
    
    if (maxBookingsPerSlot <= 0 || maxBookingsPerSlot > 10) {
      toast.error('Maximum bookings per slot must be between 1 and 10');
      return false;
    }
    
    if (advanceBookingDays <= 0 || advanceBookingDays > 90) {
      toast.error('Advance booking days must be between 1 and 90');
      return false;
    }
    
    return true;
  };
  
  const saveSchedule = async () => {
    if (!validateSchedule()) {
      return;
    }
    
    try {
      setSaving(true);
      
      const centerId = adminData.centerId || adminData.groomingCenterId;
      const centerRef = doc(db, 'groomingCenters', centerId);
      
      await updateDoc(centerRef, {
        schedule,
        slotDuration,
        maxBookingsPerSlot,
        advanceBookingDays,
        updatedAt: new Date()
      });
      
      toast.success('Schedule settings saved successfully');
    } catch (error) {
      console.error('Error saving schedule settings:', error);
      toast.error('Failed to save schedule settings');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Working Hours</h3>
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                  Day
                </th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                  Opening Time
                </th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                  Closing Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {DAYS.map(day => (
                <tr key={day}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                    {day}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500 text-center">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={schedule[day].isOpen}
                        onChange={() => handleDayToggle(day)}
                        className="form-checkbox h-5 w-5 text-primary rounded"
                      />
                      <span className="ml-2">{schedule[day].isOpen ? 'Open' : 'Closed'}</span>
                    </label>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500 text-center">
                    <select
                      value={schedule[day].openTime}
                      onChange={(e) => handleTimeChange(day, 'openTime', e.target.value)}
                      disabled={!schedule[day].isOpen}
                      className="rounded border-gray-300 text-sm py-1 px-2 focus:border-primary focus:ring-primary disabled:bg-gray-100"
                    >
                      {TIME_SLOTS.map(time => (
                        <option key={`open-${time}`} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500 text-center">
                    <select
                      value={schedule[day].closeTime}
                      onChange={(e) => handleTimeChange(day, 'closeTime', e.target.value)}
                      disabled={!schedule[day].isOpen}
                      className="rounded border-gray-300 text-sm py-1 px-2 focus:border-primary focus:ring-primary disabled:bg-gray-100"
                    >
                      {TIME_SLOTS.map(time => (
                        <option key={`close-${time}`} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appointment Slot Duration (minutes)
            </label>
            <select
              value={slotDuration}
              onChange={(e) => setSlotDuration(Number(e.target.value))}
              className="w-full rounded border-gray-300 py-2 px-3 focus:border-primary focus:ring-primary"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes (1 hour)</option>
              <option value="90">90 minutes (1.5 hours)</option>
              <option value="120">120 minutes (2 hours)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              This is the default minimum duration for appointment slots
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Bookings Per Slot
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={maxBookingsPerSlot}
              onChange={(e) => setMaxBookingsPerSlot(Number(e.target.value))}
              className="w-full rounded border-gray-300 py-2 px-3 focus:border-primary focus:ring-primary"
            />
            <p className="mt-1 text-xs text-gray-500">
              How many pets can be serviced simultaneously
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Advance Booking Days
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={advanceBookingDays}
              onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
              className="w-full rounded border-gray-300 py-2 px-3 focus:border-primary focus:ring-primary"
            />
            <p className="mt-1 text-xs text-gray-500">
              How many days in advance can customers book appointments
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end">
        <button
          onClick={saveSchedule}
          disabled={saving}
          className={`px-4 py-2 ${
            saving ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'
          } text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
        >
          {saving ? 'Saving...' : 'Save Schedule Settings'}
        </button>
      </div>
    </div>
  );
};

export default GroomingScheduleManager; 