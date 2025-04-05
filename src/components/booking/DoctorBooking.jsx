import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { app } from '../../firebase/config';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const DoctorBooking = () => {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [step, setStep] = useState(1); // 1: Select Doctor, 2: Select Date/Slot, 3: Fill Form, 4: Confirmation
  const [bookingForm, setBookingForm] = useState({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    petName: '',
    petType: '',
    petBreed: '',
    petAge: '',
    reason: '',
    notes: ''
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(null);

  // Pet types options
  const petTypes = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Guinea Pig', 'Reptile', 'Other'];

  useEffect(() => {
    // Fetch all doctors
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const db = getFirestore(app);
        
        // Query for users with doctor role
        const doctorsQuery = query(
          collection(db, 'admin'),
          where('role', '==', 'doctor')
        );
        
        const querySnapshot = await getDocs(doctorsQuery);
        
        const doctorsList = [];
        querySnapshot.forEach((doc) => {
          const doctorData = doc.data();
          doctorsList.push({
            id: doc.id,
            username: doctorData.username,
            name: doctorData.name,
            specialization: doctorData.profileInfo?.specialization || 'General Veterinarian',
            experience: doctorData.profileInfo?.experience || '',
            about: doctorData.profileInfo?.about || '',
            consultationFee: doctorData.profileInfo?.consultationFee || '',
            workingDays: doctorData.profileInfo?.workingDays || {
              monday: true,
              tuesday: true,
              wednesday: true,
              thursday: true,
              friday: true,
              saturday: false,
              sunday: false
            }
          });
        });
        
        setDoctors(doctorsList);
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setMessage('Error loading doctors. Please try again.');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDoctors();
  }, []);

  useEffect(() => {
    // Fetch available slots when doctor and date are selected
    if (selectedDoctor && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const fetchAvailableSlots = async () => {
    if (!selectedDoctor) return;
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      const selectedDateCopy = new Date(selectedDate);
      
      // Set to beginning of day
      selectedDateCopy.setHours(0, 0, 0, 0);
      
      // Set to end of day
      const endDate = new Date(selectedDateCopy);
      endDate.setHours(23, 59, 59, 999);
      
      // Query Firestore for available slots on the selected date
      const slotsQuery = query(
        collection(db, 'doctorSlots'),
        where('doctorId', '==', selectedDoctor.username),
        where('date', '>=', Timestamp.fromDate(selectedDateCopy)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        where('isBooked', '==', false)
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
      setMessage('Error loading available slots');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    setStep(2);
    setSelectedSlot(null);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingForm({
      ...bookingForm,
      [name]: value
    });
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDoctor || !selectedSlot) {
      setMessage('Please select a doctor and time slot');
      setMessageType('error');
      return;
    }
    
    // Basic validation
    if (!bookingForm.patientName || !bookingForm.patientEmail || !bookingForm.patientPhone) {
      setMessage('Please fill in all required fields');
      setMessageType('error');
      return;
    }
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      
      // Check if slot is still available
      const slotRef = doc(db, 'doctorSlots', selectedSlot.id);
      const slotDoc = await getDoc(slotRef);
      
      if (!slotDoc.exists() || slotDoc.data().isBooked) {
        setMessage('Sorry, this slot is no longer available. Please select another time.');
        setMessageType('error');
        setLoading(false);
        fetchAvailableSlots(); // Refresh available slots
        return;
      }
      
      // Create appointment
      const appointmentRef = await addDoc(collection(db, 'appointments'), {
        doctorId: selectedDoctor.username,
        doctorName: selectedDoctor.name,
        slotId: selectedSlot.id,
        patientName: bookingForm.patientName,
        patientEmail: bookingForm.patientEmail,
        patientPhone: bookingForm.patientPhone,
        petName: bookingForm.petName,
        petType: bookingForm.petType,
        petBreed: bookingForm.petBreed,
        petAge: bookingForm.petAge,
        reason: bookingForm.reason,
        notes: bookingForm.notes,
        appointmentDate: Timestamp.fromDate(selectedSlot.date),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      // Update slot to booked
      await updateDoc(slotRef, {
        isBooked: true
      });
      
      // Move to confirmation step
      setStep(4);
    } catch (error) {
      console.error('Error booking appointment:', error);
      setMessage('Error booking appointment. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const resetBooking = () => {
    setSelectedDoctor(null);
    setSelectedDate(new Date());
    setSelectedSlot(null);
    setStep(1);
    setBookingForm({
      patientName: '',
      patientEmail: '',
      patientPhone: '',
      petName: '',
      petType: '',
      petBreed: '',
      petAge: '',
      reason: '',
      notes: ''
    });
    setMessage('');
    setMessageType(null);
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

  if (loading && doctors.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-2 text-primary">Loading doctors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-primary text-white">
            <h2 className="text-xl font-semibold">Book an Appointment with a Veterinarian</h2>
            <p className="mt-1 max-w-2xl text-sm">Schedule a visit for your pet</p>
          </div>
          
          {/* Progress Steps */}
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-center mb-8">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                1
              </div>
              <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                2
              </div>
              <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                3
              </div>
              <div className={`flex-1 h-1 mx-2 ${step >= 4 ? 'bg-primary' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 4 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                4
              </div>
            </div>
            
            <div className="text-center mb-6">
              <p className="text-gray-700 font-medium">
                {step === 1 && 'Select Doctor'}
                {step === 2 && 'Choose Date & Time'}
                {step === 3 && 'Fill Your Details'}
                {step === 4 && 'Confirmation'}
              </p>
            </div>
            
            {messageType && (
              <div className={`p-4 mb-4 rounded-md ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {message}
              </div>
            )}
            
            {/* Step 1: Select Doctor */}
            {step === 1 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select a Veterinarian</h3>
                
                {doctors.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No doctors available at the moment.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {doctors.map((doctor) => (
                      <div 
                        key={doctor.username} 
                        className="border border-gray-200 rounded-lg p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleDoctorSelect(doctor)}
                      >
                        <div className="flex flex-col md:flex-row md:items-center">
                          <div className="md:w-1/4 mb-4 md:mb-0">
                            <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center text-primary text-2xl font-bold mx-auto">
                              {doctor.name.charAt(0)}
                            </div>
                          </div>
                          <div className="md:w-3/4">
                            <h4 className="text-lg font-medium text-gray-900">Dr. {doctor.name}</h4>
                            <p className="text-primary">{doctor.specialization}</p>
                            {doctor.experience && (
                              <p className="text-sm text-gray-600 mt-1">Experience: {doctor.experience} years</p>
                            )}
                            {doctor.about && (
                              <p className="text-sm text-gray-600 mt-2">{doctor.about}</p>
                            )}
                            {doctor.consultationFee && (
                              <p className="text-sm text-gray-600 mt-2">Consultation Fee: {doctor.consultationFee}</p>
                            )}
                            <div className="mt-2">
                              <p className="text-xs text-gray-500">Working Days:</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(doctor.workingDays).map(([day, isWorking]) => (
                                  <span 
                                    key={day} 
                                    className={`text-xs px-2 py-1 rounded capitalize ${
                                      isWorking 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-gray-100 text-gray-400 line-through'
                                    }`}
                                  >
                                    {day}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Step 2: Select Date and Time */}
            {step === 2 && selectedDoctor && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Date & Time</h3>
                
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/2">
                    <p className="text-gray-700 mb-2">Selected Doctor: <span className="font-medium">Dr. {selectedDoctor.name}</span></p>
                    <div className="flex justify-center mb-4">
                      <Calendar
                        onChange={handleDateChange}
                        value={selectedDate}
                        minDate={new Date()}
                        className="border border-gray-200 rounded-lg shadow-sm"
                      />
                    </div>
                    <p className="text-sm text-center text-gray-600">Selected: {formatDate(selectedDate)}</p>
                  </div>
                  
                  <div className="md:w-1/2">
                    <p className="text-gray-700 mb-2">Available Time Slots:</p>
                    
                    {loading ? (
                      <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      availableSlots.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot.id}
                              onClick={() => handleSlotSelect(slot)}
                              className={`p-2 border rounded-md text-center hover:border-primary transition-colors ${
                                selectedSlot && selectedSlot.id === slot.id
                                  ? 'bg-primary text-white'
                                  : 'bg-white text-gray-700'
                              }`}
                            >
                              {slot.startTime} - {slot.endTime}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                          <p className="text-yellow-800">No available slots for this date.</p>
                          <p className="text-sm text-yellow-600 mt-1">Please select another date or doctor.</p>
                        </div>
                      )
                    )}
                    
                    <div className="mt-6 flex justify-between">
                      <button
                        onClick={() => setStep(1)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        Back
                      </button>
                      
                      <button
                        onClick={() => setStep(3)}
                        disabled={!selectedSlot}
                        className={`px-4 py-2 rounded-md ${
                          selectedSlot
                            ? 'bg-primary text-white hover:bg-primary-dark'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        } transition-colors`}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 3: Fill Patient Information */}
            {step === 3 && selectedDoctor && selectedSlot && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Enter Your Details</h3>
                
                <div className="mb-4">
                  <p className="text-gray-700">Selected Doctor: <span className="font-medium">Dr. {selectedDoctor.name}</span></p>
                  <p className="text-gray-700">Appointment Date: <span className="font-medium">{formatDate(selectedDate)}</span></p>
                  <p className="text-gray-700">Appointment Time: <span className="font-medium">{selectedSlot.startTime} - {selectedSlot.endTime}</span></p>
                </div>
                
                <form onSubmit={handleBookingSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                      <input
                        type="text"
                        name="patientName"
                        value={bookingForm.patientName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="patientEmail"
                        value={bookingForm.patientEmail}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        name="patientPhone"
                        value={bookingForm.patientPhone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pet's Name</label>
                      <input
                        type="text"
                        name="petName"
                        value={bookingForm.petName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pet Type</label>
                      <select
                        name="petType"
                        value={bookingForm.petType}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select Pet Type</option>
                        {petTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pet Breed</label>
                      <input
                        type="text"
                        name="petBreed"
                        value={bookingForm.petBreed}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pet Age</label>
                      <input
                        type="text"
                        name="petAge"
                        value={bookingForm.petAge}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g. 2 years"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit</label>
                      <input
                        type="text"
                        name="reason"
                        value={bookingForm.reason}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g. Annual check-up, Vaccination, etc."
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                      <textarea
                        name="notes"
                        value={bookingForm.notes}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Any additional information the doctor should know"
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Back
                    </button>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                    >
                      {loading ? 'Booking...' : 'Confirm Booking'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-500 mx-auto mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                
                <h3 className="text-2xl font-medium text-gray-900 mb-2">Appointment Booked!</h3>
                <p className="text-gray-600 mb-8">
                  Your appointment with Dr. {selectedDoctor.name} on {formatDate(selectedDate)} at {selectedSlot.startTime} has been booked successfully.
                </p>
                
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-left mb-8 max-w-md mx-auto">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600">Patient:</div>
                    <div className="font-medium">{bookingForm.patientName}</div>
                    
                    <div className="text-gray-600">Pet:</div>
                    <div className="font-medium">{bookingForm.petName || 'N/A'}</div>
                    
                    <div className="text-gray-600">Doctor:</div>
                    <div className="font-medium">Dr. {selectedDoctor.name}</div>
                    
                    <div className="text-gray-600">Date:</div>
                    <div className="font-medium">{formatDate(selectedDate)}</div>
                    
                    <div className="text-gray-600">Time:</div>
                    <div className="font-medium">{selectedSlot.startTime} - {selectedSlot.endTime}</div>
                    
                    <div className="text-gray-600">Status:</div>
                    <div className="text-yellow-600 font-medium">Pending Confirmation</div>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-6">
                  An email confirmation has been sent to <span className="font-medium">{bookingForm.patientEmail}</span>. Please contact us if you need to make any changes.
                </p>
                
                <button
                  onClick={resetBooking}
                  className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                >
                  Book Another Appointment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorBooking; 