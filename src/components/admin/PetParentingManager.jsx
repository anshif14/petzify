import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { app } from '../../firebase/config';

const PetParentingManager = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // pending, approved, rejected
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pets based on status
  const fetchPets = async (status) => {
    setLoading(true);
    setError(null);
    try {
      const db = getFirestore(app);
      const q = query(
        collection(db, 'rehoming_pets'),
        where('status', '==', status)
      );
      const querySnapshot = await getDocs(q);
      const petsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPets(petsData);
      
      // Update pending count if fetching pending pets
      if (status === 'pending') {
        setPendingCount(petsData.length);
      }
    } catch (err) {
      console.error('Error fetching pets:', err);
      setError('Failed to load pets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update pet status
  const updatePetStatus = async (petId, newStatus) => {
    try {
      const db = getFirestore(app);
      const petRef = doc(db, 'rehoming_pets', petId);
      await updateDoc(petRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      // Refresh the list and update counts
      fetchPets(activeTab);
      if (activeTab === 'pending') {
        setPendingCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error updating pet status:', err);
      setError('Failed to update pet status. Please try again.');
    }
  };

  // Fetch pets when tab changes
  useEffect(() => {
    fetchPets(activeTab);
  }, [activeTab]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Pet Parenting Requests</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-md relative ${
              activeTab === 'pending'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'approved'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'rejected'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : pets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No {activeTab} pet requests found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map(pet => (
            <div key={pet.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {pet.imageUrl && (
                <img 
                  src={pet.imageUrl} 
                  alt={pet.name} 
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900">{pet.name}</h3>
                <p className="text-sm text-gray-500">{pet.breed} • {pet.age} years old</p>
                <p className="mt-2 text-gray-600">{pet.description}</p>
                
                <div className="mt-4 space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold">Contact:</span> {pet.contactInfo}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Submitted:</span>{' '}
                    {new Date(pet.createdAt?.seconds * 1000).toLocaleDateString()}
                  </p>
                </div>

                {activeTab === 'pending' && (
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => updatePetStatus(pet.id, 'approved')}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updatePetStatus(pet.id, 'rejected')}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PetParentingManager; 