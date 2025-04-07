import React, { useState, useRef, useEffect } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { app } from '../firebase/config';
import { useUser } from '../context/UserContext';
import { useAlert } from '../context/AlertContext';
import AuthModal from '../components/auth/AuthModal';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useNavigate } from 'react-router-dom';

const PetRehoming = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submittedPet, setSubmittedPet] = useState(null);
  const fileInputRef = useRef(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { currentUser, isAuthenticated, authInitialized } = useUser();
  const { showSuccess, showError } = useAlert();
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    breed: '',
    age: '',
    gender: '',
    description: '',
    price: '',
    hasKCICertificate: false,
    mediaFiles: [],
    status: 'pending'
  });
  const [mediaPreview, setMediaPreview] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Pet types options
  const petTypes = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Guinea Pig', 'Reptile', 'Other'];

  useEffect(() => {
    if (authInitialized && !isAuthenticated()) {
      setShowAuthModal(true);
    }
  }, [authInitialized, isAuthenticated]);

  useEffect(() => {
    if (currentUser) {
      fetchPets();
    }
  }, [currentUser]);

  // Function to check media limits
  const checkMediaLimits = (files) => {
    const currentImages = mediaPreview.filter(file => file.type === 'image').length;
    const currentVideos = mediaPreview.filter(file => file.type === 'video').length;
    
    const newImages = files.filter(file => file.type.startsWith('image/')).length;
    const newVideos = files.filter(file => file.type.startsWith('video/')).length;

    if (currentImages + newImages > 5) {
      setError('Maximum 5 images allowed');
      return false;
    }
    if (currentVideos + newVideos > 2) {
      setError('Maximum 2 videos allowed');
      return false;
    }
    return true;
  };

  // Function to handle file selection
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    setError('');

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return (isImage || isVideo) && isValidSize;
    });

    if (!checkMediaLimits(validFiles)) {
      return;
    }

    // Create preview URLs
    const newPreviews = validFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'video',
      name: file.name
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
    setError('');
  };

  // Function to upload files to Firebase Storage
  const uploadFiles = async (files) => {
    const storage = getStorage(app);
    const uploadPromises = files.map(async (fileObj) => {
      const fileRef = ref(storage, `pets/${currentUser.email}/${Date.now()}_${fileObj.file.name}`);
      await uploadBytes(fileRef, fileObj.file);
      const url = await getDownloadURL(fileRef);
      return {
        url,
        type: fileObj.type,
        name: fileObj.file.name
      };
    });

    return Promise.all(uploadPromises);
  };

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    if (mediaPreview.length === 0) {
      setError('Please add at least one image or video');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Upload all media files
      const mediaUrls = await uploadFiles(mediaPreview);
      
      const db = getFirestore(app);
      const docRef = await addDoc(collection(db, 'rehoming_pets'), {
        ...formData,
        mediaFiles: mediaUrls,
        userId: currentUser.email,
        createdAt: new Date().toISOString()
      });
      
      // Set the submitted pet with the ID
      const submittedPetWithId = {
        id: docRef.id,
        ...formData,
        mediaFiles: mediaUrls,
        userId: currentUser.email
      };
      setSubmittedPet(submittedPetWithId);
      
      // Hide the form and show the submitted pet details
      setShowForm(false);
      
      // Reset form and media previews
      setFormData({
        name: '',
        type: '',
        breed: '',
        age: '',
        gender: '',
        description: '',
        price: '',
        hasKCICertificate: false,
        mediaFiles: [],
        status: 'pending'
      });
      setMediaPreview([]);
      
      // Refresh the pets list
      fetchPets();
      
      showSuccess('Pet added successfully! Waiting for admin approval.');
    } catch (error) {
      console.error('Error adding pet:', error);
      setError('Failed to add pet. Please try again.');
      showError('Failed to add pet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch pets
  const fetchPets = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      const q = query(
        collection(db, 'rehoming_pets'),
        where('userId', '==', currentUser.email),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const petsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPets(petsData);
    } catch (err) {
      console.error('Error fetching pets:', err);
      setError('Failed to load pets. Please try again.');
      showError('Failed to load pets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    fetchPets();
  };

  // Function to get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Pet Rehoming</h1>
            {isAuthenticated() ? (
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition duration-200 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Pet Details
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition duration-200 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Sign In to Add Pet
              </button>
            )}
          </div>
          
          {/* Add Pet Form */}
          {showForm && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Add a Pet for Rehoming</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Media Upload Section */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pet Photos and Videos
                    </label>
                    <p className="text-sm text-gray-500 mb-2">
                      Add up to 5 images and 2 videos (Max 10MB each)
                    </p>
                    {error && (
                      <p className="text-sm text-red-600 mb-2">{error}</p>
                    )}
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition duration-200 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        Add Media
                      </button>
                      <div className="text-sm text-gray-500">
                        {mediaPreview.filter(f => f.type === 'image').length}/5 images,{' '}
                        {mediaPreview.filter(f => f.type === 'video').length}/2 videos
                      </div>
                    </div>
                  </div>

                  {/* Media Previews */}
                  {mediaPreview.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                      {mediaPreview.map((file, index) => (
                        <div key={index} className="relative rounded-lg overflow-hidden bg-gray-100">
                          {file.type === 'image' ? (
                            <img
                              src={file.url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-32 object-cover"
                            />
                          ) : (
                            <video
                              src={file.url}
                              className="w-full h-32 object-cover"
                              controls
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                            {file.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pet Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pet Type
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                    >
                      <option value="">Select Type</option>
                      {petTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Breed
                    </label>
                    <input
                      type="text"
                      name="breed"
                      value={formData.breed}
                      onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Age
                    </label>
                    <input
                      type="text"
                      name="age"
                      value={formData.age}
                      onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                      placeholder="e.g., 2 years, 6 months"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="Enter pet price"
                      required
                      min="0"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                    />
                  </div>
                </div>

                {formData.type === 'Dog' && (
                  <div className="mt-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        name="hasKCICertificate"
                        checked={formData.hasKCICertificate}
                        onChange={(e) => setFormData(prev => ({ ...prev, hasKCICertificate: e.target.checked }))}
                        className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Has KCI Certificate
                      </span>
                    </label>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows="4"
                    required
                    placeholder="Tell us about your pet's personality, habits, and why you're looking to rehome them"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                  ></textarea>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || uploading}
                    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition duration-200 disabled:opacity-50 flex items-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Submit for Approval'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Pets List */}
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Your Pets for Rehoming</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : pets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <p className="text-gray-500">No pets added yet. Add your first pet for rehoming!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pets.map((pet) => (
                <div key={pet.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Pet Media */}
                  <div className="relative h-48 bg-gray-100">
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
                          controls
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pet.status)}`}>
                        {pet.status.charAt(0).toUpperCase() + pet.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Pet Details */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{pet.name}</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Type:</span> {pet.type}
                      </div>
                      <div>
                        <span className="font-medium">Breed:</span> {pet.breed || 'Not specified'}
                      </div>
                      <div>
                        <span className="font-medium">Age:</span> {pet.age || 'Not specified'}
                      </div>
                      <div>
                        <span className="font-medium">Gender:</span> {pet.gender || 'Not specified'}
                      </div>
                      <div>
                        <span className="font-medium">Price:</span> ₹{pet.price}
                      </div>
                      {pet.type === 'Dog' && (
                        <div>
                          <span className="font-medium">KCI:</span> {pet.hasKCICertificate ? 'Yes' : 'No'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          if (!isAuthenticated()) {
            navigate('/');
          }
        }}
        initialMode="login"
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};

export default PetRehoming; 