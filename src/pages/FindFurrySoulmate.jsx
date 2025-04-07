import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, orderBy, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../firebase/config';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useNavigate, useSearchParams } from 'react-router-dom';

const FindFurrySoulmate = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [showAdoptionForm, setShowAdoptionForm] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [adoptionFormData, setAdoptionFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    experience: '',
    reason: '',
    mediaFiles: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [mediaPreview, setMediaPreview] = useState([]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    type: searchParams.get('type') || '',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: searchParams.get('sortOrder') || 'desc'
  });

  // Function to fetch approved pets with filters
  const fetchApprovedPets = async () => {
    try {
      setLoading(true);
      setError(null);
      const db = getFirestore(app);
      
      let q = query(
        collection(db, 'rehoming_pets'),
        where('status', '==', 'approved')
      );

      // Get all documents first
      const querySnapshot = await getDocs(q);
      let petsList = [];
      querySnapshot.forEach((doc) => {
        petsList.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Apply filters on the client side
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        petsList = petsList.filter(pet => 
          pet.name?.toLowerCase().includes(searchLower) ||
          pet.type?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.type) {
        petsList = petsList.filter(pet => pet.type === filters.type);
      }

      // Apply sorting
      petsList.sort((a, b) => {
        if (filters.sortBy === 'price') {
          const priceA = a.price || 0;
          const priceB = b.price || 0;
          return filters.sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
        } else if (filters.sortBy === 'createdAt') {
          return filters.sortOrder === 'asc' 
            ? new Date(a.createdAt) - new Date(b.createdAt)
            : new Date(b.createdAt) - new Date(a.createdAt);
        }
        return 0;
      });

      setPets(petsList);
    } catch (error) {
      console.error('Error fetching pets:', error);
      setError('We encountered an issue while fetching available pets. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedPets();
  }, [filters]);

  const handleFilterChange = (name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val) params.set(key, val);
    });
    setSearchParams(params);
  };

  const handlePetClick = (pet) => {
    navigate(`/pets/${pet.id}`);
  };

  const handleNextImage = () => {
    if (selectedPet?.mediaFiles?.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === selectedPet.mediaFiles.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (selectedPet?.mediaFiles?.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedPet.mediaFiles.length - 1 : prev - 1
      );
    }
  };

  // Function to handle adoption interest
  const handleAdoptInterest = () => {
    setShowAdoptionForm(true);
    window.scrollTo(0, 0);
  };

  // Function to handle adoption form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setAdoptionFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return (isImage || isVideo) && isValidSize;
    });

    // Create preview URLs
    const newPreviews = validFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'video'
    }));

    setMediaPreview(prev => [...prev, ...newPreviews]);
  };

  // Function to remove a preview
  const handleRemoveFile = (index) => {
    setMediaPreview(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].url);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  // Function to upload files to Firebase Storage
  const uploadFiles = async (files) => {
    const storage = getStorage(app);
    const uploadPromises = files.map(async (fileObj) => {
      const fileRef = ref(storage, `adoption_media/${Date.now()}_${fileObj.file.name}`);
      await uploadBytes(fileRef, fileObj.file);
      return getDownloadURL(fileRef);
    });

    return Promise.all(uploadPromises);
  };

  // Modified form submission function
  const handleAdoptionSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      // Upload media files first
      const mediaUrls = await uploadFiles(mediaPreview);
      
      const db = getFirestore(app);
      await addDoc(collection(db, 'adoption_requests'), {
        petId: selectedPet.id,
        petName: selectedPet.name,
        ...adoptionFormData,
        mediaUrls,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Reset form and previews
      setAdoptionFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        experience: '',
        reason: '',
        mediaFiles: []
      });
      setMediaPreview([]);

      setSuccessMessage('Thank you for your interest! We will contact you soon about the next steps.');
      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
      console.error('Error submitting adoption request:', error);
      setError('Failed to submit adoption request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Function to retry loading
  const handleRetry = () => {
    fetchApprovedPets();
  };

  // Get unique types for filter options
  const types = [...new Set(pets.map(pet => pet.type).filter(Boolean))];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        {selectedPet ? (
          <div className="py-12 px-4">
            <div className="max-w-7xl mx-auto">
              {/* Back button */}
              <button
                onClick={() => {
                  setSelectedPet(null);
                  setShowAdoptionForm(false);
                }}
                className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to All Pets
              </button>

              {/* Success Message */}
              {successMessage && (
                <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
                  {successMessage}
                </div>
              )}

              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* Left Column - Media Gallery */}
                  <div className="p-8">
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
                    {selectedPet.mediaFiles && selectedPet.mediaFiles.length > 1 && (
                      <div className="flex space-x-2 overflow-x-auto pb-2 mt-4">
                        {selectedPet.mediaFiles.map((file, index) => (
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

                  {/* Right Column - Pet Details */}
                  <div className="p-8 bg-white">
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedPet.name}</h2>
                        
                        {/* Pet Details in Instagram style */}
                        <div className="mt-4 space-y-3">
                          <div className="flex">
                            <span className="font-semibold w-24 text-gray-900">Breed</span>
                            <span className="text-gray-700">{selectedPet.breed}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold w-24 text-gray-900">Type</span>
                            <span className="text-gray-700">{selectedPet.type}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold w-24 text-gray-900">Age</span>
                            <span className="text-gray-700">{selectedPet.age}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold w-24 text-gray-900">Gender</span>
                            <span className="text-gray-700">{selectedPet.gender}</span>
                          </div>
                          {selectedPet.price && (
                            <div className="flex">
                              <span className="font-semibold w-24 text-gray-900">Price</span>
                              <span className="text-gray-700">₹{selectedPet.price}</span>
                            </div>
                          )}
                          {selectedPet.type === 'Dog' && selectedPet.hasKCICertificate && (
                            <div className="flex">
                              <span className="font-semibold w-24 text-gray-900">KCI</span>
                              <span className="text-gray-700">Certified</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                          <p className="text-gray-700 whitespace-pre-line">{selectedPet.description}</p>
                        </div>

                        <button
                          onClick={() => setShowAdoptionForm(true)}
                          className="mt-6 w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition duration-200 flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          Welcome Me Home
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Find Your Furry Soulmate</h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Discover and welcome a loving companion into your family. Each pet is waiting to bring joy and unconditional love to your home.
                </p>
              </div>

              {/* Search and Filters */}
              <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                <div className="flex items-center gap-4">
                  {/* Main Search - 60% width */}
                  <div className="w-[60%]">
                    <div className="relative">
                      <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        placeholder="Search pets by name or type..."
                        className="w-full h-10 pl-10 pr-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Type Filter */}
                  <div className="w-[20%]">
                    <select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      className="w-full h-10 px-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-600"
                    >
                      <option value="">All Pet Types</option>
                      {types.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Options */}
                  <div className="w-[20%] flex items-center gap-2">
                    <select
                      value={`${filters.sortBy}-${filters.sortOrder}`}
                      onChange={(e) => {
                        const [sortBy, sortOrder] = e.target.value.split('-');
                        handleFilterChange('sortBy', sortBy);
                        handleFilterChange('sortOrder', sortOrder);
                      }}
                      className="w-full h-10 px-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-600"
                    >
                      <option value="createdAt-desc">Newest First</option>
                      <option value="createdAt-asc">Oldest First</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                    </select>

                    {(filters.search || filters.type || filters.sortBy !== 'createdAt' || filters.sortOrder !== 'desc') && (
                      <button
                        onClick={() => {
                          setFilters({
                            search: '',
                            type: '',
                            sortBy: 'createdAt',
                            sortOrder: 'desc'
                          });
                          setSearchParams({});
                        }}
                        className="h-10 w-10 flex items-center justify-center text-primary hover:text-primary-dark"
                        title="Clear All"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Results */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  <p className="mt-4 text-gray-500">Finding your perfect match...</p>
                </div>
              ) : error ? (
                <div className="bg-white rounded-xl shadow-md p-8 text-center">
                  <div className="mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Oops! Something went wrong</h3>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <button
                      onClick={handleRetry}
                      className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Try Again
                    </button>
                  </div>
                </div>
              ) : pets.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-8 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-xl font-medium text-gray-700 mb-2">No pets found</h3>
                  <p className="text-gray-500">Try adjusting your filters or check back later for new pets.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pets.map(pet => (
                    <div 
                      key={pet.id} 
                      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300 cursor-pointer"
                      onClick={() => handlePetClick(pet)}
                    >
                      <div className="h-48 overflow-hidden">
                        {pet.mediaFiles && pet.mediaFiles.length > 0 ? (
                          pet.mediaFiles[0].type === 'image' ? (
                            <img 
                              src={pet.mediaFiles[0].url} 
                              alt={pet.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={pet.mediaFiles[0].url}
                              className="w-full h-full object-cover"
                              muted
                            />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">{pet.name}</h3>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                            Available
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="px-2 py-1 bg-primary-light text-primary text-xs rounded-full">{pet.type}</span>
                          {pet.breed && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{pet.breed}</span>}
                          {pet.age && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{pet.age}</span>}
                          {pet.gender && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{pet.gender}</span>}
                          {pet.price && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">₹{pet.price}</span>}
                        </div>
                        <p className="mt-3 text-gray-600 line-clamp-2">{pet.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default FindFurrySoulmate; 