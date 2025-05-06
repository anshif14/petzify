import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { app } from '../../firebase/config';

const PetParentingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchPet = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const db = getFirestore(app);
        const petRef = doc(db, 'rehoming_pets', id);
        const petDoc = await getDoc(petRef);
        
        if (petDoc.exists()) {
          const petData = petDoc.data();
          
          // Minimal processing of required fields with defaults
          setPet({
            id: petDoc.id,
            ...petData,
            mediaFiles: (petData.mediaFiles || []).map(file => ({
              ...file,
              type: file.type || 'image'
            })),
            createdAt: petData.createdAt || { seconds: Date.now() / 1000 }
          });
        } else {
          setError('Pet not found. The request might have been deleted.');
        }
      } catch (err) {
        setError('Failed to load pet details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPet();
    } else {
      setError('Invalid pet ID');
      setLoading(false);
    }
  }, [id]);

  const updatePetStatus = async (newStatus) => {
    setUpdating(true);
    setError(null);
    
    try {
      const db = getFirestore(app);
      const petRef = doc(db, 'rehoming_pets', id);
      
      await updateDoc(petRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Update the local state
      setPet(prevPet => ({
        ...prevPet,
        status: newStatus,
        updatedAt: new Date()
      }));
      
      setTimeout(() => {
        navigate('/admin/pet-parenting');
      }, 1000);
    } catch (err) {
      setError('Failed to update pet status. Please try again.');
      setUpdating(false);
    }
  };

  const handleNextImage = () => {
    if (pet?.mediaFiles?.length > 0) {
      setCurrentImageIndex(prev => 
        prev === pet.mediaFiles.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (pet?.mediaFiles?.length > 0) {
      setCurrentImageIndex(prev => 
        prev === 0 ? pet.mediaFiles.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Loading pet details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
        <button
          onClick={() => navigate('/admin/pet-parenting')}
          className="px-4 py-2 bg-primary text-white rounded-md"
        >
          Back to Pet Parenting Requests
        </button>
      </div>
    );
  }

  if (!pet || !pet.id) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="mb-4 p-4 bg-yellow-100 text-yellow-700 rounded-md">
            Unable to load pet details. The data may be missing or incomplete.
          </div>
          <button
            onClick={() => navigate('/admin/pet-parenting')}
            className="px-4 py-2 bg-primary text-white rounded-md"
          >
            Back to Pet Parenting Requests
          </button>
        </div>
      </div>
    );
  }

  // Simplified date formatting
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      }
      if (typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleDateString();
      }
      return 'Unknown date';
    } catch {
      return 'Invalid date';
    }
  };

  // Pre-compute status style values to avoid redundant calculations
  const statusStyle = {
    backgroundColor: 
      pet.status === 'pending' ? '#FEF3C7' : 
      pet.status === 'approved' ? '#D1FAE5' : 
      '#FEE2E2',
    color: 
      pet.status === 'pending' ? '#92400E' : 
      pet.status === 'approved' ? '#065F46' : 
      '#B91C1C'
  };

  // Determine if media exists once
  const hasMedia = pet.mediaFiles && pet.mediaFiles.length > 0;
  const hasMultipleMedia = hasMedia && pet.mediaFiles.length > 1;
  const currentMedia = hasMedia ? pet.mediaFiles[currentImageIndex] : null;
  const isImage = currentMedia?.type === 'image';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate('/admin/pet-parenting')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Pet Parenting Requests
        </button>
        <div className="px-3 py-1 rounded-full text-sm font-medium capitalize" style={statusStyle}>
          {pet.status}
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              {hasMedia ? (
                <>
                  {isImage ? (
                    <img
                      src={currentMedia.url}
                      alt={`${pet.name} - Image ${currentImageIndex + 1}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = 'https://placehold.co/600x600?text=Image+Not+Available';
                      }}
                    />
                  ) : (
                    <video
                      src={currentMedia.url}
                      controls
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                      }}
                    />
                  )}
                  
                  {/* Navigation Arrows - Only show if multiple media */}
                  {hasMultipleMedia && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={handleNextImage}
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
            
            {/* Thumbnail Navigation - Only render if multiple media */}
            {hasMultipleMedia && (
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {pet.mediaFiles.map((file, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 ${
                      index === currentImageIndex ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null; 
                          e.target.src = 'https://placehold.co/200x200?text=Not+Available';
                        }}
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
              <h2 className="text-2xl font-bold text-gray-900">{pet.name || 'Unnamed Pet'}</h2>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1 bg-primary-light text-primary text-sm rounded-full">{pet.type || 'Unknown Type'}</span>
                {pet.breed && <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{pet.breed}</span>}
                {pet.age && <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{pet.age}</span>}
                {pet.gender && <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{pet.gender}</span>}
                {pet.price && <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">₹{pet.price}</span>}
                {pet.type === 'Dog' && pet.hasKCICertificate && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">KCI Certified</span>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-line">{pet.description || 'No description provided'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900 capitalize">{pet.status || 'Unknown'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Submitted</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatDate(pet.createdAt)}
                </p>
              </div>
            </div>
            
            {pet.status === 'pending' && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                <div className="flex space-x-4">
                  <button
                    onClick={() => updatePetStatus('approved')}
                    disabled={updating}
                    className={`flex-1 px-6 py-3 rounded-lg transition duration-200 flex items-center justify-center ${
                      updating 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {updating ? (
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
                    onClick={() => updatePetStatus('rejected')}
                    disabled={updating}
                    className={`flex-1 px-6 py-3 rounded-lg transition duration-200 flex items-center justify-center ${
                      updating 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    {updating ? (
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
  );
};

export default PetParentingDetails; 