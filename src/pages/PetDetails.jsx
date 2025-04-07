import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../firebase/config';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const PetDetails = () => {
  const { petId } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchPet = async () => {
      try {
        setLoading(true);
        const db = getFirestore(app);
        const petDoc = await getDoc(doc(db, 'rehoming_pets', petId));
        
        if (!petDoc.exists()) {
          setError('Pet not found');
          return;
        }

        setPet({ id: petDoc.id, ...petDoc.data() });
      } catch (error) {
        console.error('Error fetching pet:', error);
        setError('Failed to load pet details');
      } finally {
        setLoading(false);
      }
    };

    if (petId) {
      fetchPet();
    }
  }, [petId]);

  const handleNextImage = () => {
    if (pet?.mediaFiles?.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === pet.mediaFiles.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (pet?.mediaFiles?.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? pet.mediaFiles.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500">Loading pet details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-900 mb-2">{error}</h3>
            <p className="text-gray-500 mb-6">The pet you're looking for might have been removed or is no longer available.</p>
            <button
              onClick={() => navigate('/find-furry-soulmate')}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to All Pets
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!pet) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4">
        {/* Back button */}
        <button
          onClick={() => navigate('/find-furry-soulmate')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to All Pets
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Media Gallery */}
          <div>
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
              <div className="flex space-x-2 overflow-x-auto pb-2 mt-4">
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

          {/* Pet Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{pet.name}</h1>
              
              {/* Pet Details in Instagram style */}
              <div className="mt-6 space-y-3">
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

              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">{pet.description}</p>
              </div>

              <button
                onClick={() => navigate(`/find-furry-soulmate?adopt=${pet.id}`)}
                className="mt-8 w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition duration-200 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                Welcome Me Home
              </button>

              {/* Share Button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  // You might want to add a toast notification here
                }}
                className="mt-4 w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-200 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetDetails; 