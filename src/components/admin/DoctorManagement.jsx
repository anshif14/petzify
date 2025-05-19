import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { app } from '../../firebase/config';

// Helper function to format dates in a human-readable format
const formatDate = (dateValue) => {
  try {
    // Handle Firestore timestamps
    if (dateValue && typeof dateValue.toDate === 'function') {
      return new Date(dateValue.toDate()).toLocaleString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } 
    // Handle JavaScript Date objects
    else if (dateValue instanceof Date) {
      return dateValue.toLocaleString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } 
    // Handle ISO string dates
    else if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return new Date(dateValue).toLocaleString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    }
    // Return the original value for anything else
    return String(dateValue);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(dateValue);
  }
};

const DoctorManagement = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState(null);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      const doctorsCollection = collection(db, 'doctordetails');
      const doctorsSnapshot = await getDocs(doctorsCollection);
      
      const doctorsData = doctorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDoctors(doctorsData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to load doctors. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
  };

  const deleteDoctor = async (doctorId) => {
    if (window.confirm('Are you sure you want to delete this doctor? This action cannot be undone.')) {
      try {
        setIsDeleting(true);
        const db = getFirestore(app);
        
        // Delete the doctor from Firestore
        await deleteDoc(doc(db, 'doctordetails', doctorId));
        
        // Update the local state
        setDoctors(doctors.filter(doctor => doctor.id !== doctorId));
        
        // If the deleted doctor was selected, clear selection
        if (selectedDoctor && selectedDoctor.id === doctorId) {
          setSelectedDoctor(null);
        }
        
        setDeleteMessage({ type: 'success', text: 'Doctor deleted successfully!' });
        setTimeout(() => setDeleteMessage(null), 3000);
      } catch (err) {
        console.error('Error deleting doctor:', err);
        setDeleteMessage({ type: 'error', text: 'Failed to delete doctor. Please try again.' });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Doctor Management</h2>
      
      {deleteMessage && (
        <div className={`mb-4 p-3 rounded-md ${deleteMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {deleteMessage.text}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-primary text-white">
            <h3 className="text-lg font-semibold">Doctors List</h3>
          </div>
          <div className="p-4 max-h-[600px] overflow-y-auto">
            {doctors.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {doctors.map((doctor) => (
                  <li key={doctor.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleDoctorSelect(doctor)}
                        className={`flex-grow text-left p-2 rounded-md hover:bg-gray-100 ${
                          selectedDoctor?.id === doctor.id ? 'bg-gray-100' : ''
                        }`}
                      >
                        <div className="flex items-center">
                          {doctor.photoURL ? (
                            <img 
                              src={doctor.photoURL}
                              alt={doctor.name} 
                              className="w-10 h-10 rounded-full mr-3 object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                              <span className="text-gray-600">
                                {doctor.name ? doctor.name.charAt(0) : 'D'}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{doctor.name || 'Dr. ' + doctor.id}</p>
                            <p className="text-sm text-gray-500">{doctor.specialization || 'Veterinarian'}</p>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => deleteDoctor(doctor.id)}
                        disabled={isDeleting}
                        className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete doctor"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No doctors found.</p>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden md:col-span-2">
          {selectedDoctor ? (
            <div>
              <div className="p-4 bg-primary text-white">
                <h3 className="text-lg font-semibold">Doctor Details</h3>
              </div>
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center mb-6">
                  <div className="mb-4 md:mb-0 md:mr-6">
                    {selectedDoctor.photoURL ? (
                      <img 
                        src={selectedDoctor.photoURL}
                        alt={selectedDoctor.name} 
                        className="w-32 h-32 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-lg bg-gray-300 flex items-center justify-center">
                        <span className="text-3xl text-gray-600">
                          {selectedDoctor.name ? selectedDoctor.name.charAt(0) : 'D'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold">{selectedDoctor.name || 'Dr. ' + selectedDoctor.id}</h4>
                    <p className="text-gray-600">{selectedDoctor.specialization || 'Veterinarian'}</p>
                    <div className="mt-2 flex items-center">
                      <span className="text-yellow-500 mr-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </span>
                      <span className="font-medium">{selectedDoctor.rating || '5.0'} Rating</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h5 className="text-sm text-gray-500 mb-1">Experience</h5>
                    <p>{selectedDoctor.experience ? `${selectedDoctor.experience} years` : 'Not specified'}</p>
                  </div>
                  <div>
                    <h5 className="text-sm text-gray-500 mb-1">Consultation Fee</h5>
                    <p>{selectedDoctor.consultationFee ? `₹${selectedDoctor.consultationFee}` : 'Not specified'}</p>
                  </div>
                  <div>
                    <h5 className="text-sm text-gray-500 mb-1">Email</h5>
                    <p>{selectedDoctor.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <h5 className="text-sm text-gray-500 mb-1">Phone</h5>
                    <p>{selectedDoctor.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <h5 className="text-sm text-gray-500 mb-1">Address</h5>
                    <p>{selectedDoctor.address || 'Not provided'}</p>
                  </div>
                  <div>
                    <h5 className="text-sm text-gray-500 mb-1">Availability</h5>
                    <p>{selectedDoctor.availability || 'Not specified'}</p>
                  </div>
                </div>
                
                {selectedDoctor.about && (
                  <div className="mb-6">
                    <h5 className="text-sm text-gray-500 mb-1">About</h5>
                    <p className="text-gray-700">{selectedDoctor.about}</p>
                  </div>
                )}
                
                {selectedDoctor.certificates && selectedDoctor.certificates.length > 0 && (
                  <div className="mb-6">
                    <h5 className="text-lg font-semibold mb-3">Certificates</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedDoctor.certificates.map((certificate, index) => (
                        <div key={index} className="border rounded-lg overflow-hidden">
                          {certificate.url ? (
                            <a href={certificate.url} target="_blank" rel="noopener noreferrer">
                              <img 
                                src={certificate.url} 
                                alt={certificate.name || 'Certificate'} 
                                className="w-full h-40 object-cover"
                              />
                            </a>
                          ) : (
                            <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500">No image</span>
                            </div>
                          )}
                          <div className="p-3">
                            <h5 className="font-medium">{certificate.name || `Certificate ${index + 1}`}</h5>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedDoctor.degrees && selectedDoctor.degrees.length > 0 && (
                  <div className="mb-6">
                    <h5 className="text-lg font-semibold mb-2">Degrees</h5>
                    <ul className="list-disc pl-5">
                      {selectedDoctor.degrees.map((degree, index) => (
                        <li key={index} className="mb-1">{degree}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {selectedDoctor.designations && selectedDoctor.designations.length > 0 && (
                  <div>
                    <h5 className="text-lg font-semibold mb-2">Designations</h5>
                    <ul className="list-disc pl-5">
                      {selectedDoctor.designations.map((designation, index) => (
                        <li key={index} className="mb-1">{designation}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 flex items-center justify-center h-full">
              <p className="text-gray-500">Select a doctor to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorManagement; 