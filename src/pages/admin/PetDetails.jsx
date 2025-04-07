import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { app } from '../../firebase/config';

const PetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchPet = async () => {
      try {
        const db = getFirestore(app);
        const petDoc = await getDoc(doc(db, 'rehoming_pets', id));
        
        if (petDoc.exists()) {
          setPet({ id: petDoc.id, ...petDoc.data() });
        } else {
          setError('Pet not found');
        }
      } catch (err) {
        console.error('Error fetching pet:', err);
        setError('Failed to load pet details');
      } finally {
        setLoading(false);
      }
    };

    fetchPet();
  }, [id]);

  const updatePetStatus = async (newStatus) => {
    try {
      const db = getFirestore(app);
      const petRef = doc(db, 'rehoming_pets', id);
      await updateDoc(petRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      navigate('/admin/pet-parenting');
    } catch (err) {
      console.error('Error updating pet status:', err);
      setError('Failed to update pet status');
    }
  };

  const handleNextImage = () => {
    if (pet && pet.mediaFiles) {
      setCurrentImageIndex((prev) => 
        prev === pet.mediaFiles.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (pet && pet.mediaFiles) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? pet.mediaFiles.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {error}
        </div>
        <button
          onClick={() => navigate('/admin/pet-parenting')}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
        >
          Back to Pet Parenting
        </button>
      </div>
    );
  }

  if (!pet) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto bg-white">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/admin/pet-parenting')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Pet Parenting
        </button>
        {pet.status === 'pending' && (
          <div className="flex space-x-4">
            <button
              onClick={() => updatePetStatus('approved')}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Approve
            </button>
            <button
              onClick={() => updatePetStatus('rejected')}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Reject
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Images */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            {pet.mediaFiles && pet.mediaFiles.length > 0 ? (
              <>
                {pet.mediaFiles[currentImageIndex].type === 'image' ? (
                  <img
                    src={pet.mediaFiles[currentImageIndex].url}
                    alt={`${pet.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={pet.mediaFiles[currentImageIndex].url}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}
                
                {/* Navigation Arrows */}
                {pet.mediaFiles.length > 1 && (
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
          
          {/* Thumbnail Navigation */}
          {pet.mediaFiles && pet.mediaFiles.length > 1 && (
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
            <h2 className="text-2xl font-bold text-gray-900">{pet.name}</h2>
            
            {/* Pet Details in Instagram style */}
            <div className="mt-4 space-y-3">
              <div className="flex">
                <span className="font-semibold w-24 text-gray-900">Breed</span>
                <span className="text-gray-700">{pet.breed}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-24 text-gray-900">Type</span>
                <span className="text-gray-700">{pet.type}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-24 text-gray-900">Age</span>
                <span className="text-gray-700">{pet.age}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-24 text-gray-900">Gender</span>
                <span className="text-gray-700">{pet.gender}</span>
              </div>
              {pet.price && (
                <div className="flex">
                  <span className="font-semibold w-24 text-gray-900">Price</span>
                  <span className="text-gray-700">₹{pet.price}</span>
                </div>
              )}
              {pet.type === 'Dog' && pet.hasKCICertificate && (
                <div className="flex">
                  <span className="font-semibold w-24 text-gray-900">KCI</span>
                  <span className="text-gray-700">Certified</span>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-line">{pet.description}</p>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900 capitalize">{pet.status}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Submitted</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {new Date(pet.createdAt?.seconds * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          
          {/* Action buttons for pending pets */}
          {pet.status === 'pending' && (
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="flex space-x-4">
                <button
                  onClick={() => updatePetStatus('approved')}
                  className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-200 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Approve
                </button>
                <button
                  onClick={() => updatePetStatus('rejected')}
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PetDetails; 