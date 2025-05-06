import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, orderBy, limit, startAfter } from 'firebase/firestore';
import { app } from '../../firebase/config';

const PetParentingManager = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // pending, approved, rejected
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedPet, setSelectedPet] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const batchSize = 10; // Number of documents to fetch per batch
  const navigate = useNavigate();

  // Fetch pets based on status
  const fetchPets = async (status, clear = true) => {
    if (clear) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const db = getFirestore(app);
      console.log('Firestore instance created');
      
      let q;
      
      if (!clear && lastDoc) {
        // Pagination query - get the next batch
        q = query(
          collection(db, 'rehoming_pets'),
          where('status', '==', status),
          orderBy('createdAt', 'desc'),
          limit(batchSize),
          // Start after the last document we fetched
          startAfter(lastDoc)
        );
      } else {
        // Initial query
        q = query(
          collection(db, 'rehoming_pets'),
          where('status', '==', status),
          orderBy('createdAt', 'desc'),
          limit(batchSize)
        );
      }
      
      console.log('Query created:', q);
      
      const querySnapshot = await getDocs(q);
      console.log('Query snapshot received:', querySnapshot.size, 'documents');
      
      if (querySnapshot.empty) {
        // No more documents to fetch
        setHasMore(false);
      } else {
        // Update the last document reference for pagination
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        
        const petsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('Pets data processed:', petsData.length, 'pets');
        
        if (clear) {
          setPets(petsData);
        } else {
          // Append new pets to existing list
          setPets(prevPets => [...prevPets, ...petsData]);
        }
        
        // Update pending count if fetching pending pets
        if (status === 'pending' && clear) {
          // Get the total count of pending pets
          try {
            const countQuery = query(
              collection(db, 'rehoming_pets'),
              where('status', '==', 'pending')
            );
            const countSnapshot = await getDocs(countQuery);
            setPendingCount(countSnapshot.size);
          } catch (err) {
            console.error('Error getting pending count:', err);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching pets:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      setError('Failed to load pets. Please try again.');
    } finally {
      if (clear) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  // Load more pets
  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchPets(activeTab, false);
    }
  };

  // Update pet status
  const updatePetStatus = async (petId, newStatus) => {
    const statusMessage = newStatus === 'approved' ? 'Approving' : 'Rejecting';
    setLoading(true);
    setError(null);
    
    try {
      const db = getFirestore(app);
      const petRef = doc(db, 'rehoming_pets', petId);
      
      // Update the pet in Firestore
      await updateDoc(petRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      console.log(`Successfully updated pet ${petId} to ${newStatus}`);
      
      // Update local state instead of re-fetching all pets
      if (activeTab === 'pending') {
        // Remove pet from current list
        setPets(currentPets => currentPets.filter(pet => pet.id !== petId));
        
        // Update pending count
        setPendingCount(prev => Math.max(0, prev - 1));
      }
      
      // Close the detail view after updating status
      setSelectedPet(null);
    } catch (err) {
      console.error('Error updating pet status:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      setError(`Failed to ${statusMessage.toLowerCase()} pet. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pets when tab changes
  useEffect(() => {
    console.log('Component mounted, fetching pets...');
    fetchPets(activeTab);
  }, [activeTab]);

  // Handle next/previous image navigation
  const handleNextImage = () => {
    if (selectedPet && selectedPet.mediaFiles) {
      setCurrentImageIndex((prev) => 
        prev === selectedPet.mediaFiles.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (selectedPet && selectedPet.mediaFiles) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedPet.mediaFiles.length - 1 : prev - 1
      );
    }
  };

  // Handle selecting a pet for detail view
  const handleSelectPet = (pet) => {
    navigate(`/admin/pet-parenting/${pet.id}`);
  };

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
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pets.map(pet => (
              <div 
                key={pet.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div 
                  className="relative h-48 overflow-hidden cursor-pointer"
                  onClick={() => handleSelectPet(pet)}
                >
                  {pet.mediaFiles && pet.mediaFiles.length > 0 ? (
                    <div className="relative h-full">
                      <img 
                        src={pet.mediaFiles[0].url} 
                        alt={pet.name} 
                        className="w-full h-full object-cover"
                      />
                      {pet.mediaFiles.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
                          +{pet.mediaFiles.length - 1} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="cursor-pointer" onClick={() => handleSelectPet(pet)}>
                    <h3 className="text-lg font-semibold text-gray-900">{pet.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-1 bg-primary-light text-primary text-xs rounded-full">{pet.type}</span>
                      {pet.breed && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{pet.breed}</span>}
                      {pet.age && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{pet.age}</span>}
                      {pet.gender && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{pet.gender}</span>}
                      {pet.price && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">₹{pet.price}</span>}
                      {pet.type === 'Dog' && pet.hasKCICertificate && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">KCI Certified</span>
                      )}
                    </div>
                    <p className="mt-3 text-gray-600 line-clamp-3">{pet.description}</p>
                    
                    <div className="mt-4 space-y-2">
                      <p className="text-sm">
                        <span className="font-semibold">Submitted:</span>{' '}
                        {new Date(pet.createdAt?.seconds * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Add action buttons for pending pets */}
                  {activeTab === 'pending' && (
                    <div className="mt-4 flex space-x-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updatePetStatus(pet.id, 'approved');
                        }}
                        disabled={loading}
                        className="flex-1 px-3 py-2 rounded text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updatePetStatus(pet.id, 'rejected');
                        }}
                        disabled={loading}
                        className="flex-1 px-3 py-2 rounded text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className={`px-4 py-2 rounded-md transition-colors ${
                  loadingMore 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-primary text-white hover:bg-primary-dark'
                }`}
              >
                {loadingMore ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Loading...
                  </div>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detailed View Modal */}
      {selectedPet && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden my-8">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Pet Details</h3>
              <button
                onClick={() => setSelectedPet(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column - Images */}
              <div className="space-y-4">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {selectedPet.mediaFiles && selectedPet.mediaFiles.length > 0 ? (
                    <>
                      {selectedPet.mediaFiles[currentImageIndex].type === 'image' ? (
                        <img
                          src={selectedPet.mediaFiles[currentImageIndex].url}
                          alt={`${selectedPet.name} - Image ${currentImageIndex + 1}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <video
                          src={selectedPet.mediaFiles[currentImageIndex].url}
                          controls
                          className="w-full h-full object-contain"
                        />
                      )}
                      
                      {/* Navigation Arrows */}
                      {selectedPet.mediaFiles.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrevImage();
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextImage();
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Thumbnail Navigation */}
                {selectedPet.mediaFiles && selectedPet.mediaFiles.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {selectedPet.mediaFiles.map((file, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(index);
                        }}
                        className={`relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 ${
                          index === currentImageIndex ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        {file.type === 'image' ? (
                          <img
                            src={file.url}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Right Column - Details */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPet.name}</h2>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-3 py-1 bg-primary-light text-primary text-sm rounded-full">{selectedPet.type}</span>
                    {selectedPet.breed && <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{selectedPet.breed}</span>}
                    {selectedPet.age && <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{selectedPet.age}</span>}
                    {selectedPet.gender && <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{selectedPet.gender}</span>}
                    {selectedPet.price && <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">₹{selectedPet.price}</span>}
                    {selectedPet.type === 'Dog' && selectedPet.hasKCICertificate && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">KCI Certified</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-line">{selectedPet.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <p className="mt-1 text-lg font-semibold text-gray-900 capitalize">{selectedPet.status}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Submitted</h3>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {new Date(selectedPet.createdAt?.seconds * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {activeTab === 'pending' && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => updatePetStatus(selectedPet.id, 'approved')}
                        disabled={loading}
                        className={`flex-1 px-6 py-3 rounded-lg transition duration-200 flex items-center justify-center ${
                          loading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => updatePetStatus(selectedPet.id, 'rejected')}
                        disabled={loading}
                        className={`flex-1 px-6 py-3 rounded-lg transition duration-200 flex items-center justify-center ${
                          loading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Reject
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetParentingManager; 