import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, orderBy, addDoc } from 'firebase/firestore';
import { app } from '../firebase/config';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const FindFurrySoulmate = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [showAdoptionForm, setShowAdoptionForm] = useState(false);
  const [adoptionFormData, setAdoptionFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    experience: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Function to fetch approved pets
  const fetchApprovedPets = async () => {
    try {
      setLoading(true);
      setError(null);
      const db = getFirestore(app);
      const q = query(
        collection(db, 'rehoming_pets'),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const petsList = [];
      querySnapshot.forEach((doc) => {
        petsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setPets(petsList);
    } catch (error) {
      console.error('Error fetching pets:', error);
      setError('We encountered an issue while fetching available pets. Please try again later or contact support if the problem persists.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch pets on component mount
  useEffect(() => {
    fetchApprovedPets();
  }, []);

  // Function to handle pet selection
  const handlePetClick = (pet) => {
    setSelectedPet(pet);
    setShowAdoptionForm(false);
    window.scrollTo(0, 0);
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

  // Function to handle adoption form submission
  const handleAdoptionSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const db = getFirestore(app);
      await addDoc(collection(db, 'adoption_requests'), {
        petId: selectedPet.id,
        petName: selectedPet.name,
        ...adoptionFormData,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Reset form
      setAdoptionFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        experience: '',
        reason: ''
      });

      // Show success message
      setSuccessMessage('Thank you for your interest! We will contact you soon about the next steps.');
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);

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
                  {/* Left Column - Pet Image and Basic Info */}
                  <div className="p-8">
                    <div className="aspect-w-4 aspect-h-3 mb-6">
                      {selectedPet.imageUrl ? (
                        <img 
                          src={selectedPet.imageUrl} 
                          alt={selectedPet.name} 
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-4">{selectedPet.name}</h1>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="px-3 py-1 bg-primary-light text-primary text-sm rounded-full">{selectedPet.type}</span>
                      {selectedPet.breed && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          {selectedPet.breed}
                        </span>
                      )}
                      {selectedPet.age && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          {selectedPet.age}
                        </span>
                      )}
                      {selectedPet.gender && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          {selectedPet.gender}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Pet Details or Adoption Form */}
                  <div className="p-8 bg-gray-50 border-l border-gray-200">
                    {showAdoptionForm ? (
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome {selectedPet.name} Home</h2>
                        <p className="text-gray-600 mb-6">Please tell us a bit about yourself and why you'd like to welcome {selectedPet.name} into your family.</p>

                        <form onSubmit={handleAdoptionSubmit} className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Your Name
                            </label>
                            <input
                              type="text"
                              name="name"
                              value={adoptionFormData.name}
                              onChange={handleFormChange}
                              required
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={adoptionFormData.email}
                              onChange={handleFormChange}
                              required
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              value={adoptionFormData.phone}
                              onChange={handleFormChange}
                              required
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Home Address
                            </label>
                            <textarea
                              name="address"
                              value={adoptionFormData.address}
                              onChange={handleFormChange}
                              required
                              rows="2"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            ></textarea>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Pet Care Experience
                            </label>
                            <textarea
                              name="experience"
                              value={adoptionFormData.experience}
                              onChange={handleFormChange}
                              required
                              rows="3"
                              placeholder="Tell us about your experience with pets..."
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            ></textarea>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Why would you like to welcome {selectedPet.name}?
                            </label>
                            <textarea
                              name="reason"
                              value={adoptionFormData.reason}
                              onChange={handleFormChange}
                              required
                              rows="3"
                              placeholder="Share why you'd be a great family for this pet..."
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            ></textarea>
                          </div>

                          <div className="flex justify-end pt-4">
                            <button
                              type="button"
                              onClick={() => setShowAdoptionForm(false)}
                              className="px-4 py-2 text-gray-700 hover:text-gray-900 mr-4"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={submitting}
                              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition duration-200 flex items-center disabled:opacity-50"
                            >
                              {submitting ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Submitting...
                                </>
                              ) : (
                                'Submit Application'
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div>
                        <div className="prose max-w-none mb-8">
                          <h2 className="text-xl font-semibold text-gray-900 mb-2">About {selectedPet.name}</h2>
                          <p className="text-gray-600">{selectedPet.description}</p>
                        </div>

                        <div className="border-t border-gray-200 pt-6 mb-8">
                          <h2 className="text-xl font-semibold text-gray-900 mb-2">Contact Information</h2>
                          <p className="text-gray-600">{selectedPet.contactInfo}</p>
                        </div>

                        <button
                          onClick={handleAdoptInterest}
                          className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition duration-200 flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          Welcome Me Home
                        </button>
                      </div>
                    )}
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
                  <div className="border-t border-gray-200 pt-6">
                    <p className="text-sm text-gray-500">
                      If this problem persists, please contact our support team at{' '}
                      <a href="mailto:support@petzify.com" className="text-primary hover:text-primary-dark">
                        support@petzify.com
                      </a>
                    </p>
                  </div>
                </div>
              ) : pets.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-8 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-xl font-medium text-gray-700 mb-2">No pets available at the moment</h3>
                  <p className="text-gray-500">Check back soon to find your perfect furry companion!</p>
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
                        {pet.imageUrl ? (
                          <img 
                            src={pet.imageUrl} 
                            alt={pet.name} 
                            className="w-full h-full object-cover"
                          />
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
                        </div>
                        <p className="mt-3 text-gray-600 line-clamp-2">{pet.description}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdoptInterest();
                          }}
                          className="mt-4 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition duration-200 flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          Welcome Me Home
                        </button>
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