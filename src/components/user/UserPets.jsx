import React, { useState, useEffect, useRef } from 'react';
import { getFirestore, collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '../../firebase/config';
import { useUser } from '../../context/UserContext';
import { useAlert } from '../../context/AlertContext';

const UserPets = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPet, setEditingPet] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [showMedicalInfo, setShowMedicalInfo] = useState(false);
  const [activeTab, setActiveTab] = useState('vaccinations');
  const [showAddPetForm, setShowAddPetForm] = useState(false);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const { currentUser } = useUser();
  const { showSuccess, showError } = useAlert();
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    breed: '',
    birthDate: '',
    gender: '',
    weight: '',
    color: '',
    microchipNumber: '',
    notes: '',
    imageUrl: ''
  });
  
  const [medicalFormData, setMedicalFormData] = useState({
    type: '',
    date: '',
    name: '',
    provider: '',
    notes: '',
    documentUrl: '',
    nextDueDate: ''
  });

  // Pet types options
  const petTypes = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Guinea Pig', 'Reptile', 'Other'];
  
  // Medical record types
  const vaccinationTypes = ['Rabies', 'Distemper', 'Parvovirus', 'Bordetella', 'Leptospirosis', 'Feline Leukemia', 'FVRCP', 'Other'];
  const medicationTypes = ['Antibiotics', 'Pain Relief', 'Anti-inflammatory', 'Heartworm', 'Flea/Tick', 'Allergy', 'Diabetes', 'Other'];
  const certificateTypes = ['Health Certificate', 'Travel Certificate', 'Breeding Certificate', 'Microchip Certificate', 'Insurance', 'Other'];

  useEffect(() => {
    let isMounted = true;
    
    if (currentUser) {
      console.log('UserPets: Fetching pets for user:', currentUser.email);
      fetchUserPets(isMounted);
    } else {
      console.log('UserPets: No current user available');
      if (isMounted) setLoading(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const fetchUserPets = async (isMounted = true) => {
    try {
      if (isMounted) setLoading(true);
      console.log('Fetching pets from Firebase...');
      const db = getFirestore(app);
      
      if (!currentUser || !currentUser.email) {
        console.error('No user email available for fetching pets');
        if (isMounted) setLoading(false);
        return;
      }

      const petsQuery = query(
        collection(db, 'pets'),
        where('userId', '==', currentUser.email)
      );
      
      console.log('Running pets query with userId:', currentUser.email);
      const querySnapshot = await getDocs(petsQuery);
      
      const petsList = [];
      querySnapshot.forEach((doc) => {
        petsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`Found ${petsList.length} pets for user`);
      if (isMounted) setPets(petsList);
    } catch (error) {
      console.error('Error fetching pets:', error);
      if (isMounted) showError('Failed to load pets');
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadImage(file);
    }
  };

  const uploadImage = async (file) => {
    try {
      setUploading(true);
      const storage = getStorage(app);
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
      const storageRef = ref(storage, `pet-images/${currentUser.email}/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setFormData(prev => ({
        ...prev,
        imageUrl: downloadURL
      }));
      
      showSuccess('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      showError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      const petData = {
        ...formData,
        userId: currentUser.email,
        updatedAt: new Date().toISOString()
      };

      if (editingPet) {
        // Update existing pet
        await updateDoc(doc(db, 'pets', editingPet.id), petData);
        showSuccess('Pet updated successfully');
      } else {
        // Add new pet
        petData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'pets'), petData);
        showSuccess('Pet added successfully');
      }

      // Reset form and refresh pets list
      setFormData({
        name: '',
        type: '',
        breed: '',
        birthDate: '',
        gender: '',
        weight: '',
        color: '',
        microchipNumber: '',
        notes: '',
        imageUrl: ''
      });
      setEditingPet(null);
      setShowAddPetForm(false);
      fetchUserPets();
    } catch (error) {
      console.error('Error saving pet:', error);
      showError('Failed to save pet');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name || '',
      type: pet.type || '',
      breed: pet.breed || '',
      birthDate: pet.birthDate || '',
      gender: pet.gender || '',
      weight: pet.weight || '',
      color: pet.color || '',
      microchipNumber: pet.microchipNumber || '',
      notes: pet.notes || '',
      imageUrl: pet.imageUrl || ''
    });
  };

  const handleDelete = async (petId) => {
    if (window.confirm('Are you sure you want to delete this pet?')) {
      try {
        setLoading(true);
        const db = getFirestore(app);
        
        // Get the pet to check if it has an image
        const petToDelete = pets.find(pet => pet.id === petId);
        
        // Delete the image from storage if it exists
        if (petToDelete && petToDelete.imageUrl) {
          try {
            const storage = getStorage(app);
            const imageRef = ref(storage, petToDelete.imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('Error deleting image:', error);
            // Continue with pet deletion even if image deletion fails
          }
        }
        
        // Delete the pet document
        await deleteDoc(doc(db, 'pets', petId));
        showSuccess('Pet deleted successfully');
        fetchUserPets();
      } catch (error) {
        console.error('Error deleting pet:', error);
        showError('Failed to delete pet');
      } finally {
        setLoading(false);
      }
    }
  };

  const cancelEdit = () => {
    setEditingPet(null);
    setFormData({
      name: '',
      type: '',
      breed: '',
      birthDate: '',
      gender: '',
      weight: '',
      color: '',
      microchipNumber: '',
      notes: '',
      imageUrl: ''
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Add new medical record handling
  const handleMedicalFormChange = (e) => {
    const { name, value } = e.target;
    setMedicalFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadDocument(file);
    }
  };

  const uploadDocument = async (file) => {
    if (!selectedPet) return;

    try {
      setUploadingDocument(true);
      const storage = getStorage(app);
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
      const storageRef = ref(storage, `pet-documents/${currentUser.email}/${selectedPet.id}/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setMedicalFormData(prev => ({
        ...prev,
        documentUrl: downloadURL
      }));
      
      showSuccess('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading document:', error);
      showError('Failed to upload document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const saveMedicalRecord = async (e) => {
    e.preventDefault();
    if (!selectedPet) return;

    try {
      setLoading(true);
      const db = getFirestore(app);
      
      const recordData = {
        ...medicalFormData,
        petId: selectedPet.id,
        userId: currentUser.email,
        recordType: activeTab, // 'vaccinations', 'medications', or 'certificates'
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, `petMedicalRecords`), recordData);
      
      // Reset form
      setMedicalFormData({
        type: '',
        date: '',
        name: '',
        provider: '',
        notes: '',
        documentUrl: '',
        nextDueDate: ''
      });
      
      // Refresh the pet's medical records
      fetchPetMedicalRecords(selectedPet.id);
      
      showSuccess(`${activeTab.slice(0, -1)} record added successfully`);
    } catch (error) {
      console.error('Error saving medical record:', error);
      showError('Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  const viewPetMedicalInfo = async (pet) => {
    setSelectedPet(pet);
    setShowMedicalInfo(true);
    await fetchPetMedicalRecords(pet.id);
  };

  const [medicalRecords, setMedicalRecords] = useState({
    vaccinations: [],
    medications: [],
    certificates: []
  });

  const fetchPetMedicalRecords = async (petId) => {
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      // Get all medical records for this pet
      const recordsQuery = query(
        collection(db, 'petMedicalRecords'),
        where('petId', '==', petId)
      );
      
      const querySnapshot = await getDocs(recordsQuery);
      
      const records = {
        vaccinations: [],
        medications: [],
        certificates: []
      };
      
      querySnapshot.forEach((doc) => {
        const data = {
          id: doc.id,
          ...doc.data()
        };
        
        if (data.recordType === 'vaccinations') {
          records.vaccinations.push(data);
        } else if (data.recordType === 'medications') {
          records.medications.push(data);
        } else if (data.recordType === 'certificates') {
          records.certificates.push(data);
        }
      });
      
      // Sort records by date (newest first)
      ['vaccinations', 'medications', 'certificates'].forEach(type => {
        records[type].sort((a, b) => new Date(b.date) - new Date(a.date));
      });
      
      setMedicalRecords(records);
    } catch (error) {
      console.error('Error fetching medical records:', error);
      showError('Failed to load medical records');
    } finally {
      setLoading(false);
    }
  };

  const deleteMedicalRecord = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    
    try {
      setLoading(true);
      const db = getFirestore(app);
      
      // Get the record to check if it has a document
      const recordRef = doc(db, 'petMedicalRecords', recordId);
      const recordSnap = await getDoc(recordRef);
      
      if (recordSnap.exists() && recordSnap.data().documentUrl) {
        // Delete the document from storage
        try {
          const storage = getStorage(app);
          const docRef = ref(storage, recordSnap.data().documentUrl);
          await deleteObject(docRef);
        } catch (error) {
          console.error('Error deleting document file:', error);
          // Continue with record deletion even if file deletion fails
        }
      }
      
      // Delete the record
      await deleteDoc(recordRef);
      
      // Refresh records
      if (selectedPet) {
        fetchPetMedicalRecords(selectedPet.id);
      }
      
      showSuccess('Record deleted successfully');
    } catch (error) {
      console.error('Error deleting record:', error);
      showError('Failed to delete record');
    } finally {
      setLoading(false);
    }
  };

  const closeMedicalInfo = () => {
    setShowMedicalInfo(false);
    setSelectedPet(null);
    setActiveTab('vaccinations');
  };

  const triggerDocumentInput = () => {
    documentInputRef.current.click();
  };

  const toggleAddPetForm = () => {
    setShowAddPetForm(!showAddPetForm);
    if (editingPet && !showAddPetForm) {
      // Keep editing if toggling on with an editing pet
    } else {
      // Reset form when closing
      cancelEdit();
    }
    
    // Scroll to top when opening form
    if (!showAddPetForm) {
      window.scrollTo(0, 0);
    }
  };

  // Add Your First Pet button functionality
  const handleAddFirstPet = () => {
    setShowAddPetForm(true);
    window.scrollTo(0, 0);
  };

  const renderPetCards = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pets.map((pet) => (
          <div key={pet.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300">
            <div className="h-48 bg-gray-200 overflow-hidden">
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
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      handleEdit(pet);
                      setShowAddPetForm(true);
                    }}
                    className="text-primary hover:text-primary-dark"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(pet.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Type:</span> {pet.type}</p>
                {pet.breed && <p><span className="font-medium">Breed:</span> {pet.breed}</p>}
                {pet.birthDate && <p><span className="font-medium">Birth Date:</span> {new Date(pet.birthDate).toLocaleDateString()}</p>}
                {pet.gender && <p><span className="font-medium">Gender:</span> {pet.gender}</p>}
                {pet.weight && <p><span className="font-medium">Weight:</span> {pet.weight} kg</p>}
                {pet.color && <p><span className="font-medium">Color:</span> {pet.color}</p>}
                {pet.microchipNumber && <p><span className="font-medium">Microchip:</span> {pet.microchipNumber}</p>}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => viewPetMedicalInfo(pet)}
                  className="w-full py-2 bg-white text-primary font-medium rounded-lg flex items-center justify-center hover:bg-gray-50 border border-primary transition-colors duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Medical Records
                </button>

                {/* Future Features Section */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Coming Soon:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-gray-50 rounded-md text-gray-400 text-xs flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Diet Tracking
                    </div>
                    <div className="p-2 bg-gray-50 rounded-md text-gray-400 text-xs flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Exercise Logs
                    </div>
                    <div className="p-2 bg-gray-50 rounded-md text-gray-400 text-xs flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Mental Stimulation
                    </div>
                    <div className="p-2 bg-gray-50 rounded-md text-gray-400 text-xs flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Reminders
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Add/Edit Pet Form - Moved to top with fixed styling for visibility */}
      {showAddPetForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white md:bg-black md:bg-opacity-50 flex items-start justify-center">
          <div className="relative w-full max-w-3xl mx-auto md:mt-10 bg-white md:rounded-xl shadow-lg">
            <div className="sticky top-0 z-10 bg-white p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">{editingPet ? 'Edit Pet' : 'Add New Pet'}</h2>
              <button 
                onClick={toggleAddPetForm}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 60px)' }}>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pet Image Upload */}
                  <div className="col-span-2 flex flex-col items-center mb-4">
                    <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-gray-200 mb-4">
                      {formData.imageUrl ? (
                        <img 
                          src={formData.imageUrl} 
                          alt="Pet" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <button 
                        type="button"
                        onClick={triggerFileInput}
                        className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-md hover:bg-primary-dark transition duration-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleImageChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button 
                      type="button"
                      onClick={triggerFileInput}
                      className="text-primary hover:text-primary-dark font-medium flex items-center"
                    >
                      {uploading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          {formData.imageUrl ? 'Change Image' : 'Upload Image'}
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pet Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
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
                      onChange={handleChange}
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
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Birth Date
                    </label>
                    <input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
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
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      step="0.1"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Microchip Number
                    </label>
                    <input
                      type="text"
                      name="microchipNumber"
                      value={formData.microchipNumber}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows="3"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
                    ></textarea>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  {editingPet && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-200"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading || uploading}
                    className={`px-6 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-primary-dark transition duration-200 ${(loading || uploading) ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Saving...' : (editingPet ? 'Update Pet' : 'Add Pet')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Pets List Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Your Pets</h2>
          <button 
            onClick={toggleAddPetForm}
            className="px-4 py-2 bg-primary text-white rounded-lg flex items-center"
          >
            {showAddPetForm ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add New Pet
              </>
            )}
          </button>
        </div>
        
        {loading && !showMedicalInfo ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-500">Loading pets...</p>
          </div>
        ) : pets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-700 mb-2">No pets added yet</h3>
            <p className="text-gray-500 mb-4">Add your first pet using the button below</p>
            <button 
              onClick={handleAddFirstPet}
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium text-lg shadow-md hover:bg-primary-dark transition-colors duration-200"
            >
              Add Your First Pet
            </button>
          </div>
        ) : (
          renderPetCards()
        )}
      </div>
      
      {/* Pet Medical Info Modal */}
      {showMedicalInfo && selectedPet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedPet.name}'s Medical Records
                </h2>
                <button 
                  onClick={closeMedicalInfo}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  className={`py-2 px-4 font-medium ${activeTab === 'vaccinations' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('vaccinations')}
                >
                  Vaccinations
                </button>
                <button
                  className={`py-2 px-4 font-medium ${activeTab === 'medications' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('medications')}
                >
                  Medications
                </button>
                <button
                  className={`py-2 px-4 font-medium ${activeTab === 'certificates' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('certificates')}
                >
                  Certificates
                </button>
              </div>
              
              {/* Display Documents First */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">
                  {activeTab === 'vaccinations' ? 'Vaccination' : activeTab === 'medications' ? 'Medication' : 'Certificate'} Records
                </h3>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                    <p className="mt-2 text-gray-500">Loading records...</p>
                  </div>
                ) : medicalRecords[activeTab].length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">No records found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {medicalRecords[activeTab].map(record => (
                      <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between">
                          <div>
                            <h4 className="font-medium text-gray-800">
                              {record.type}: {record.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Date: {new Date(record.date).toLocaleDateString()}
                              {record.nextDueDate && ` • Next Due: ${new Date(record.nextDueDate).toLocaleDateString()}`}
                            </p>
                            {record.provider && <p className="text-sm text-gray-600">Provider: {record.provider}</p>}
                          </div>
                          <button
                            onClick={() => deleteMedicalRecord(record.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        {record.notes && (
                          <p className="text-sm text-gray-700 mt-2">
                            {record.notes}
                          </p>
                        )}
                        {record.documentUrl && (
                          <div className="mt-3">
                            <a
                              href={record.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary hover:text-primary-dark"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Document
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Add New Record Form */}
              <div className="bg-white border border-gray-200 p-4 rounded-lg mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Add New {activeTab === 'vaccinations' ? 'Vaccination' : activeTab === 'medications' ? 'Medication' : 'Certificate'}
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      name="type"
                      value={medicalFormData.type}
                      onChange={handleMedicalFormChange}
                      required
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Type</option>
                      {activeTab === 'vaccinations' && vaccinationTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                      {activeTab === 'medications' && medicationTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                      {activeTab === 'certificates' && certificateTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {activeTab === 'vaccinations' ? 'Vaccination' : activeTab === 'medications' ? 'Medication' : 'Certificate'} Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={medicalFormData.name}
                      onChange={handleMedicalFormChange}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={medicalFormData.date}
                      onChange={handleMedicalFormChange}
                      required
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  {(activeTab === 'vaccinations' || activeTab === 'medications') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Next Due Date
                      </label>
                      <input
                        type="date"
                        name="nextDueDate"
                        value={medicalFormData.nextDueDate}
                        onChange={handleMedicalFormChange}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provider / Clinic
                    </label>
                    <input
                      type="text"
                      name="provider"
                      value={medicalFormData.provider}
                      onChange={handleMedicalFormChange}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <div className={`${(activeTab === 'vaccinations' || activeTab === 'medications') ? 'md:col-span-1' : 'md:col-span-2'}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={medicalFormData.notes}
                      onChange={handleMedicalFormChange}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      rows="2"
                    ></textarea>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Document
                    </label>
                    <div className="flex items-center">
                      <input 
                        type="file"
                        ref={documentInputRef}
                        onChange={handleDocumentUpload}
                        className="hidden"
                      />
                      <button 
                        type="button"
                        onClick={triggerDocumentInput}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {uploadingDocument ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Upload Document
                          </>
                        )}
                      </button>
                      {medicalFormData.documentUrl && (
                        <span className="ml-2 text-sm text-green-600 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Document Uploaded
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center"
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
                      <>Add Record</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPets; 