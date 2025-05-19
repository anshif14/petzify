import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, doc, getDoc, deleteDoc, query, where } from 'firebase/firestore';
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

const PetDetails = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [ownerDetails, setOwnerDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState(null);

  const fetchPets = async () => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      // Fetch from regular pets collection
      const petsCollection = collection(db, 'pets');
      const petsSnapshot = await getDocs(petsCollection);
      
      const regularPets = petsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        petType: 'regular'
      }));
      
      // Also fetch from rehomePets collection for adoption pets
      const rehomePetsCollection = collection(db, 'rehomePets');
      const rehomePetsSnapshot = await getDocs(rehomePetsCollection);
      
      const adoptionPets = rehomePetsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        petType: 'adoption'
      }));
      
      // Combine both types of pets
      const allPets = [...regularPets, ...adoptionPets];
      
      setPets(allPets);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching pets:', err);
      setError('Failed to load pets. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  const handlePetSelect = async (pet) => {
    setSelectedPet(pet);
    
    // If pet has userId, fetch owner details
    if (pet.userId) {
      try {
        const db = getFirestore(app);
        // First try getting user document where the id matches the userId
        // This handles cases where userId is the actual document ID
        let ownerSnap = await getDoc(doc(db, 'users', pet.userId));
        
        // If not found, try querying where the email field matches the userId
        // This handles cases where userId is an email address
        if (!ownerSnap.exists()) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', pet.userId));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            ownerSnap = querySnapshot.docs[0];
          }
        }
        
        if (ownerSnap.exists()) {
          setOwnerDetails({
            id: ownerSnap.id,
            ...ownerSnap.data()
          });
        } else {
          setOwnerDetails(null);
        }
      } catch (err) {
        console.error('Error fetching owner details:', err);
        setOwnerDetails(null);
      }
    } else if (pet.ownerId) {
      // Fallback to ownerId if userId is not present (for backward compatibility)
      try {
        const db = getFirestore(app);
        const ownerRef = doc(db, 'users', pet.ownerId);
        const ownerSnap = await getDoc(ownerRef);
        
        if (ownerSnap.exists()) {
          setOwnerDetails({
            id: ownerSnap.id,
            ...ownerSnap.data()
          });
        } else {
          setOwnerDetails(null);
        }
      } catch (err) {
        console.error('Error fetching owner details:', err);
        setOwnerDetails(null);
      }
    } else {
      setOwnerDetails(null);
    }
  };

  const deletePet = async (pet) => {
    if (window.confirm('Are you sure you want to delete this pet? This action cannot be undone.')) {
      try {
        setIsDeleting(true);
        const db = getFirestore(app);
        
        // Determine which collection to delete from based on pet type
        const collectionName = pet.petType === 'adoption' ? 'rehomePets' : 'pets';
        
        // Delete the pet from Firestore
        await deleteDoc(doc(db, collectionName, pet.id));
        
        // Update the local state
        setPets(pets.filter(p => !(p.id === pet.id && p.petType === pet.petType)));
        
        // If the deleted pet was selected, clear selection
        if (selectedPet && selectedPet.id === pet.id && selectedPet.petType === pet.petType) {
          setSelectedPet(null);
          setOwnerDetails(null);
        }
        
        setDeleteMessage({ type: 'success', text: 'Pet deleted successfully!' });
        setTimeout(() => setDeleteMessage(null), 3000);
      } catch (err) {
        console.error('Error deleting pet:', err);
        setDeleteMessage({ type: 'error', text: 'Failed to delete pet. Please try again.' });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Filter pets based on search term and type filter
  const filteredPets = pets.filter(pet => {
    const matchesSearch = 
      pet.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      pet.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterType === 'all' || 
      (filterType === 'adoption' && pet.petType === 'adoption') ||
      (filterType === 'regular' && pet.petType === 'regular');
    
    return matchesSearch && matchesFilter;
  });

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
      <h2 className="text-2xl font-bold mb-6">Pet Details</h2>
      
      {deleteMessage && (
        <div className={`mb-4 p-3 rounded-md ${deleteMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {deleteMessage.text}
        </div>
      )}
      
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by pet name, breed, or type..."
            className="w-full p-2 border border-gray-300 rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select 
            className="w-full p-2 border border-gray-300 rounded-md"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Pets</option>
            <option value="regular">Regular Pets</option>
            <option value="adoption">Adoption Pets</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-primary text-white">
            <h3 className="text-lg font-semibold">Pets List</h3>
            <p className="text-sm">{filteredPets.length} pets found</p>
          </div>
          <div className="p-4 max-h-[600px] overflow-y-auto">
            {filteredPets.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {filteredPets.map((pet) => (
                  <li key={`${pet.petType}-${pet.id}`} className="py-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handlePetSelect(pet)}
                        className={`flex-grow text-left p-2 rounded-md hover:bg-gray-100 ${
                          selectedPet?.id === pet.id && selectedPet?.petType === pet.petType ? 'bg-gray-100' : ''
                        }`}
                      >
                        <div className="flex items-center">
                          {pet.imageUrl ? (
                            <img 
                              src={pet.imageUrl}
                              alt={pet.imageUrl}
                              className="w-12 h-12 rounded-md mr-3 object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-gray-300 flex items-center justify-center mr-3">
                              <span className="text-gray-600">🐾</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{pet.name || 'Unnamed Pet'}</p>
                            <p className="text-sm text-gray-500">
                              {pet.breed || 'Unknown breed'}{pet.type ? `, ${pet.type}` : ''}
                            </p>
                            {pet.petType === 'adoption' && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                For Adoption
                              </span>
                            )}
                            {pet.status && (
                              <span className={`inline-block mt-1 ml-1 px-2 py-0.5 ${
                                pet.status === 'approved' ? 'bg-green-100 text-green-800' :
                                pet.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              } text-xs rounded-full`}>
                                {pet.status.charAt(0).toUpperCase() + pet.status.slice(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => deletePet(pet)}
                        disabled={isDeleting}
                        className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete pet"
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
              <p className="text-gray-500">No pets found matching your criteria.</p>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden md:col-span-2">
          {selectedPet ? (
            <div>
              <div className="p-4 bg-primary text-white">
                <h3 className="text-lg font-semibold">Pet Details</h3>
              </div>
              <div className="p-6">
                <div className="flex flex-col md:flex-row mb-6">
                  <div className="mb-4 md:mb-0 md:mr-6 md:w-1/3">
                    {selectedPet.imageUrl ? (
                      <img 
                        src={selectedPet.imageUrl}
                        alt={selectedPet.name} 
                        className="w-full rounded-lg object-cover"
                        style={{ maxHeight: '250px' }}
                      />
                    ) : (
                      <div className="w-full h-64 rounded-lg bg-gray-300 flex items-center justify-center">
                        <span className="text-3xl text-gray-600">🐾</span>
                      </div>
                    )}
                  </div>
                  <div className="md:w-2/3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xl font-semibold mb-2">{selectedPet.name || 'Unnamed Pet'}</h4>
                      {selectedPet.petType === 'adoption' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                          For Adoption
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h5 className="text-sm text-gray-500 mb-1">Type</h5>
                        <p>{selectedPet.type || 'Not specified'}</p>
                      </div>
                      <div>
                        <h5 className="text-sm text-gray-500 mb-1">Breed</h5>
                        <p>{selectedPet.breed || 'Not specified'}</p>
                      </div>
                      <div>
                        <h5 className="text-sm text-gray-500 mb-1">Age</h5>
                        <p>{selectedPet.age ? `${selectedPet.age} years` : 'Not specified'}</p>
                      </div>
                      <div>
                        <h5 className="text-sm text-gray-500 mb-1">Gender</h5>
                        <p>{selectedPet.gender || 'Not specified'}</p>
                      </div>
                      <div>
                        <h5 className="text-sm text-gray-500 mb-1">Color</h5>
                        <p>{selectedPet.color || 'Not specified'}</p>
                      </div>
                      <div>
                        <h5 className="text-sm text-gray-500 mb-1">Weight</h5>
                        <p>{selectedPet.weight ? `${selectedPet.weight} kg` : 'Not specified'}</p>
                      </div>
                      
                      {selectedPet.status && (
                        <div>
                          <h5 className="text-sm text-gray-500 mb-1">Status</h5>
                          <p className={`${
                            selectedPet.status === 'approved' ? 'text-green-600' :
                            selectedPet.status === 'pending' ? 'text-yellow-600' :
                            'text-red-600'
                          } font-medium`}>
                            {selectedPet.status.charAt(0).toUpperCase() + selectedPet.status.slice(1)}
                          </p>
                        </div>
                      )}
                      
                      {selectedPet.petType === 'adoption' && selectedPet.price && (
                        <div>
                          <h5 className="text-sm text-gray-500 mb-1">Adoption Price</h5>
                          <p>${selectedPet.price}</p>
                        </div>
                      )}
                    </div>
                    
                    {selectedPet.description && (
                      <div className="mb-4">
                        <h5 className="text-sm text-gray-500 mb-1">Description</h5>
                        <p className="text-gray-700">{selectedPet.description}</p>
                      </div>
                    )}
                    
                    {selectedPet.medicalHistory && (
                      <div className="mb-4">
                        <h5 className="text-sm text-gray-500 mb-1">Medical History</h5>
                        <p className="text-gray-700">{selectedPet.medicalHistory}</p>
                      </div>
                    )}
                    
                    {selectedPet.vaccinations && selectedPet.vaccinations.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm text-gray-500 mb-1">Vaccinations</h5>
                        <ul className="list-disc pl-5">
                          {selectedPet.vaccinations.map((vaccine, index) => (
                            <li key={index} className="mb-1">{vaccine}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                {ownerDetails && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-lg font-semibold mb-3">Owner Information</h4>
                    <div className="flex items-center mb-4">
                      {ownerDetails.avatar ? (
                        <img 
                          src={ownerDetails.avatar} 
                          alt={ownerDetails.name} 
                          className="w-12 h-12 rounded-full mr-4 object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center mr-4">
                          <span className="text-gray-600">
                            {ownerDetails.name ? ownerDetails.name.charAt(0) : '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <h5 className="font-medium">{ownerDetails.name || 'Unnamed Owner'}</h5>
                        <p className="text-sm text-gray-500">{ownerDetails.email}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm text-gray-500 mb-1">Phone</h5>
                        <p>{ownerDetails.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <h5 className="text-sm text-gray-500 mb-1">Location</h5>
                        <p>{ownerDetails.location?.displayName || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 flex items-center justify-center h-full">
              <p className="text-gray-500">Select a pet to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PetDetails; 