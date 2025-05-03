import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../../firebase/config';

const PrescriptionsList = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setLoading(true);
        const auth = getAuth(app);
        const user = auth.currentUser;
        
        if (!user) {
          setError('You need to be logged in to view prescriptions');
          setLoading(false);
          return;
        }
        
        const db = getFirestore(app);
        const prescriptionsQuery = query(
          collection(db, 'doctorPrescriptions'),
          where('patientId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(prescriptionsQuery);
        const prescriptionsList = [];
        querySnapshot.forEach((doc) => {
          prescriptionsList.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          });
        });
        
        setPrescriptions(prescriptionsList);
        setError('');
      } catch (err) {
        console.error('Error fetching prescriptions:', err);
        setError('Failed to load prescriptions. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrescriptions();
  }, []);
  
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }
  
  if (prescriptions.length === 0) {
    return (
      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-center">
        <p className="text-yellow-700">No prescriptions found.</p>
        <p className="text-sm text-yellow-600 mt-2">
          You don't have any prescriptions yet.
        </p>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Prescriptions</h2>
      
      <div className="space-y-4">
        {prescriptions.map((prescription) => (
          <div key={prescription.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-800">Prescription for {prescription.petName}</h3>
                <p className="text-gray-600">Date: {formatDate(prescription.createdAt)}</p>
              </div>
              <a 
                href={prescription.prescriptionURL} 
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                View Prescription
              </a>
            </div>
            
            <div className="border-t pt-3 mt-3">
              <p><span className="font-medium">Doctor:</span> {prescription.doctorName || 'Not specified'}</p>
              
              {prescription.medications && prescription.medications.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-medium mb-2">Medications:</h4>
                  <ul className="space-y-2">
                    {prescription.medications.map((med, index) => (
                      <li key={index} className="bg-gray-50 p-2 rounded">
                        <span className="font-medium">{med.name}</span> - {med.dosage}, {med.frequency} for {med.duration}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrescriptionsList; 