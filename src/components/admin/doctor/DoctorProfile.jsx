import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '../../../firebase/config';
import PasswordInput from '../../common/PasswordInput';

const DoctorProfile = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [adminDocId, setAdminDocId] = useState('');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    experience: '',
    qualifications: '',
    about: '',
    consultationFee: '',
    workingDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    photoURL: '',
    certificates: [],
    degrees: [],
    designations: [],
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [changePassword, setChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [certificateFiles, setCertificateFiles] = useState([]);
  const [certificatePreviews, setCertificatePreviews] = useState([]);
  const [newDegree, setNewDegree] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCertificates, setUploadingCertificates] = useState(false);

  // Get doctor data from localStorage
  const doctorAuth = JSON.parse(localStorage.getItem('adminAuth') || '{}');
  const doctorUsername = doctorAuth.username || '';

  // Specialization options
  const specializations = [
    'General Veterinarian',
    'Surgery',
    'Dermatology',
    'Dentistry',
    'Cardiology',
    'Nutrition',
    'Behavior',
    'Emergency & Critical Care',
    'Oncology',
    'Neurology',
    'Other'
  ];

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      if (!doctorUsername) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const db = getFirestore(app);
        
        // Find doctor in admin collection
        const adminCollection = collection(db, 'admin');
        const adminQuery = query(adminCollection, where('username', '==', doctorUsername));
        const adminSnapshot = await getDocs(adminQuery);
        
        if (adminSnapshot.empty) {
          setErrorMessage('Doctor profile not found');
          setLoading(false);
          return;
        }
        
        // Get admin document
        const adminDoc = adminSnapshot.docs[0];
        setAdminDocId(adminDoc.id);
        const adminData = adminDoc.data();
        
        // Now check for doctordetails collection
        const doctorDetailsCollection = collection(db, 'doctordetails');
        const doctorDetailsQuery = query(doctorDetailsCollection, where('username', '==', doctorUsername));
        const doctorDetailsSnapshot = await getDocs(doctorDetailsQuery);
        
        let profileDetails = {};
        
        if (!doctorDetailsSnapshot.empty) {
          // If doctor details exist, get them
          profileDetails = doctorDetailsSnapshot.docs[0].data();
        }
        
        // Set profile data, merging from both collections
        setProfileData({
          name: adminData.name || '',
          email: adminData.email || '',
          phone: adminData.phone || '',
          specialization: profileDetails.specialization || '',
          experience: profileDetails.experience || '',
          qualifications: profileDetails.qualifications || '',
          about: profileDetails.about || '',
          consultationFee: profileDetails.consultationFee || '',
          workingDays: profileDetails.workingDays || {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false
          },
          photoURL: profileDetails.photoURL || '',
          certificates: profileDetails.certificates || [],
          degrees: profileDetails.degrees || [],
          designations: profileDetails.designations || [],
        });
        
        // Set photo preview if exists
        if (profileDetails.photoURL) {
          setPhotoPreview(profileDetails.photoURL);
        }
        
      } catch (error) {
        console.error('Error fetching doctor profile:', error);
        setErrorMessage('Failed to load doctor profile');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorProfile();
  }, [doctorUsername]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('workingDays.')) {
      const day = name.split('.')[1];
      setProfileData(prev => ({
        ...prev,
        workingDays: {
          ...prev.workingDays,
          [day]: checked
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePasswordChange = () => {
    if (!passwordData.currentPassword) {
      setErrorMessage('Current password is required');
      return false;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New password and confirmation do not match');
      return false;
    }
    
    if (passwordData.newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters');
      return false;
    }
    
    return true;
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.match('image.*')) {
      setErrorMessage("Please select an image file (png, jpeg, jpg)");
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Profile photo size should be less than 2MB");
      return;
    }
    
    setPhotoFile(file);
    
    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCertificateChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isImage = file.type.match('image.*');
      const isPdf = file.type === 'application/pdf';
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      
      if (!isImage && !isPdf) {
        setErrorMessage("Certificates must be image or PDF files");
        return false;
      }
      
      if (!isValidSize) {
        setErrorMessage("Certificate file size should be less than 5MB");
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    // Create previews for image files
    const newPreviews = [];
    validFiles.forEach(file => {
      if (file.type.match('image.*')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push({file, preview: reader.result, type: 'image'});
          if (newPreviews.length === validFiles.filter(f => f.type.match('image.*')).length) {
            setCertificatePreviews([...certificatePreviews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // For PDFs, just use a standard icon or text
        newPreviews.push({file, preview: null, type: 'pdf', name: file.name});
        if (newPreviews.length === validFiles.length) {
          setCertificatePreviews([...certificatePreviews, ...newPreviews]);
        }
      }
    });
    
    setCertificateFiles([...certificateFiles, ...validFiles]);
  };

  const handleRemoveCertificatePreview = (index) => {
    setCertificatePreviews(prev => {
      const newPreviews = [...prev];
      newPreviews.splice(index, 1);
      return newPreviews;
    });
    
    setCertificateFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleDeleteExistingCertificate = async (index) => {
    try {
      const certificateToDelete = profileData.certificates[index];
      
      // Delete from storage if it has a storagePath
      if (certificateToDelete.storagePath) {
        const storage = getStorage(app);
        const fileRef = ref(storage, certificateToDelete.storagePath);
        await deleteObject(fileRef);
      }
      
      // Remove from profileData
      setProfileData(prev => {
        const updatedCertificates = [...prev.certificates];
        updatedCertificates.splice(index, 1);
        return {
          ...prev,
          certificates: updatedCertificates
        };
      });
      
      setSuccessMessage('Certificate deleted successfully');
    } catch (error) {
      console.error('Error deleting certificate:', error);
      setErrorMessage('Failed to delete certificate');
    }
  };

  const handleAddDegree = () => {
    if (!newDegree.trim()) return;
    
    setProfileData(prev => ({
      ...prev,
      degrees: [...prev.degrees, newDegree.trim()]
    }));
    
    setNewDegree('');
  };

  const handleRemoveDegree = (index) => {
    setProfileData(prev => {
      const updatedDegrees = [...prev.degrees];
      updatedDegrees.splice(index, 1);
      return {
        ...prev,
        degrees: updatedDegrees
      };
    });
  };

  const handleAddDesignation = () => {
    if (!newDesignation.trim()) return;
    
    setProfileData(prev => ({
      ...prev,
      designations: [...prev.designations, newDesignation.trim()]
    }));
    
    setNewDesignation('');
  };

  const handleRemoveDesignation = (index) => {
    setProfileData(prev => {
      const updatedDesignations = [...prev.designations];
      updatedDesignations.splice(index, 1);
      return {
        ...prev,
        designations: updatedDesignations
      };
    });
  };

  const uploadPhoto = async () => {
    if (!photoFile) return profileData.photoURL;
    
    try {
      setUploadingPhoto(true);
      const storage = getStorage(app);
      const timestamp = new Date().getTime();
      const fileName = `doctors/${doctorUsername}/profile_${timestamp}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, photoFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      return { downloadURL, storagePath: fileName };
    } catch (error) {
      console.error("Error uploading photo:", error);
      throw error;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadCertificates = async () => {
    if (certificateFiles.length === 0) return profileData.certificates;
    
    try {
      setUploadingCertificates(true);
      const storage = getStorage(app);
      const timestamp = new Date().getTime();
      const uploadedCertificates = [...profileData.certificates];
      
      for (let i = 0; i < certificateFiles.length; i++) {
        const file = certificateFiles[i];
        const isImage = file.type.match('image.*');
        const fileName = `doctors/${doctorUsername}/certificates/${timestamp}_${i}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, fileName);
        
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        uploadedCertificates.push({
          url: downloadURL,
          storagePath: fileName,
          name: file.name,
          type: isImage ? 'image' : 'pdf'
        });
      }
      
      return uploadedCertificates;
    } catch (error) {
      console.error("Error uploading certificates:", error);
      throw error;
    } finally {
      setUploadingCertificates(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!adminDocId) {
      setErrorMessage('Doctor profile not found');
      return;
    }
    
    try {
      setUpdating(true);
      const db = getFirestore(app);
      
      // Get current admin document
      const adminDocRef = doc(db, 'admin', adminDocId);
      const adminDocSnap = await getDoc(adminDocRef);
      
      if (!adminDocSnap.exists()) {
        setErrorMessage('Doctor profile not found');
        setUpdating(false);
        return;
      }
      
      const adminData = adminDocSnap.data();
      
      // Upload photo if changed
      let photoData = { url: profileData.photoURL };
      if (photoFile) {
        try {
          photoData = await uploadPhoto();
        } catch (error) {
          setErrorMessage('Failed to upload profile photo');
          setUpdating(false);
          return;
        }
      }
      
      // Upload certificates if added
      let certificates = profileData.certificates;
      if (certificateFiles.length > 0) {
        try {
          certificates = await uploadCertificates();
          // Clear certificate files and previews after successful upload
          setCertificateFiles([]);
          setCertificatePreviews([]);
        } catch (error) {
          setErrorMessage('Failed to upload certificates');
          setUpdating(false);
          return;
        }
      }
      
      // Update doctor details in the doctordetails collection
      const doctorDetailsRef = doc(db, 'doctordetails', doctorUsername);
      
      await setDoc(doctorDetailsRef, {
        username: doctorUsername,
        name: profileData.name,
        specialization: profileData.specialization,
        experience: profileData.experience,
        qualifications: profileData.qualifications,
        about: profileData.about,
        consultationFee: profileData.consultationFee,
        workingDays: profileData.workingDays,
        photoURL: photoData.downloadURL || profileData.photoURL,
        photoStoragePath: photoData.storagePath,
        certificates: certificates,
        degrees: profileData.degrees,
        designations: profileData.designations,
        updatedAt: new Date()
      }, { merge: true });
      
      // Only update basic info in admin collection
      const adminUpdateData = {
        name: profileData.name,
        phone: profileData.phone,
      };
      
      // If changing password, verify current password and update
      if (changePassword) {
        if (!validatePasswordChange()) {
          setUpdating(false);
          return;
        }
        
        // Verify current password
        if (adminData.password !== passwordData.currentPassword) {
          setErrorMessage('Current password is incorrect');
          setUpdating(false);
          return;
        }
        
        // Update password only in admin collection
        adminUpdateData.password = passwordData.newPassword;
      }
      
      await updateDoc(adminDocRef, adminUpdateData);
      
      // Update localStorage with new name
      if (doctorAuth && doctorAuth.name !== profileData.name) {
        const updatedAuth = {
          ...doctorAuth,
          name: profileData.name
        };
        localStorage.setItem('adminAuth', JSON.stringify(updatedAuth));
      }
      
      setSuccessMessage('Profile updated successfully');
      
      // Reset password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setChangePassword(false);
      
      // Reset file state
      setPhotoFile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-primary mb-4">Doctor Profile</h3>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
        <h4 className="font-medium mb-1">Enhanced Profile Features Available!</h4>
        <p className="text-sm">
          You can now add more details to showcase your expertise to pet owners:
        </p>
        <ul className="list-disc list-inside text-sm ml-2 mt-1">
          <li>Upload your professional photo</li>
          <li>Add your degrees and designations</li>
          <li>Upload certificates and credentials as images or PDFs</li>
          <li>Complete your profile to help pet owners make informed decisions</li>
        </ul>
      </div>
      
      {errorMessage && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{errorMessage}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <p>{successMessage}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Profile Photo</h4>
          
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className="w-32 h-32 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center">
              {photoPreview ? (
                <img 
                  src={photoPreview} 
                  alt="Profile Preview" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="text-4xl text-gray-400">{profileData.name ? profileData.name.charAt(0).toUpperCase() : 'D'}</div>
              )}
            </div>
            
            <div className="flex flex-col items-start">
              <label className="inline-block bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors cursor-pointer mb-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                Choose Photo
              </label>
              <p className="text-sm text-gray-500">Recommended: Square image, max 2MB</p>
              {photoPreview && photoFile && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(profileData.photoURL || '');
                  }}
                  className="text-red-600 text-sm mt-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={profileData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-gray-100"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                name="phone"
                value={profileData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
              <select
                name="specialization"
                value={profileData.specialization}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Specialization</option>
                {specializations.map(specialization => (
                  <option key={specialization} value={specialization}>
                    {specialization}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Professional Details</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
              <input
                type="text"
                name="experience"
                value={profileData.experience}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee</label>
              <input
                type="text"
                name="consultationFee"
                value={profileData.consultationFee}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. $50"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Qualifications</label>
            <input
              type="text"
              name="qualifications"
              value={profileData.qualifications}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. DVM, PhD in Veterinary Medicine"
            />
          </div>
          
          {/* Degrees */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Degrees</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profileData.degrees.map((degree, index) => (
                <div key={index} className="bg-gray-100 rounded-full px-3 py-1 flex items-center gap-1">
                  <span>{degree}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDegree(index)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDegree}
                onChange={(e) => setNewDegree(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Add a degree (e.g. DVM, BVSC)"
              />
              <button
                type="button"
                onClick={handleAddDegree}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
              >
                Add
              </button>
            </div>
          </div>
          
          {/* Designations */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Designations/Roles</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profileData.designations.map((designation, index) => (
                <div key={index} className="bg-gray-100 rounded-full px-3 py-1 flex items-center gap-1">
                  <span>{designation}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDesignation(index)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Add a designation (e.g. Chief Veterinarian)"
              />
              <button
                type="button"
                onClick={handleAddDesignation}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
              >
                Add
              </button>
            </div>
          </div>
          
          {/* Certificates */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Certificates & Awards</label>
            
            {/* Existing certificates */}
            {profileData.certificates.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Current Certificates:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {profileData.certificates.map((cert, index) => (
                    <div key={index} className="border rounded-md p-2 relative">
                      {cert.type === 'image' ? (
                        <img 
                          src={cert.url} 
                          alt={`Certificate ${index + 1}`} 
                          className="w-full h-32 object-cover mb-1" 
                        />
                      ) : (
                        <div className="flex items-center justify-center h-32 bg-gray-100 mb-1">
                          <div className="text-center">
                            <span className="text-red-600 text-2xl">PDF</span>
                            <p className="text-xs text-gray-600 mt-1 truncate max-w-[90%]">{cert.name}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <a
                          href={cert.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-sm"
                        >
                          View
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingCertificate(index)}
                          className="text-red-600 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* New certificates preview */}
            {certificatePreviews.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">New Certificates to Upload:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {certificatePreviews.map((cert, index) => (
                    <div key={index} className="border rounded-md p-2 relative">
                      {cert.type === 'image' ? (
                        <img 
                          src={cert.preview} 
                          alt={`New Certificate ${index + 1}`} 
                          className="w-full h-32 object-cover mb-1" 
                        />
                      ) : (
                        <div className="flex items-center justify-center h-32 bg-gray-100 mb-1">
                          <div className="text-center">
                            <span className="text-red-600 text-2xl">PDF</span>
                            <p className="text-xs text-gray-600 mt-1 truncate max-w-[90%]">{cert.name}</p>
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveCertificatePreview(index)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <label className="inline-block bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors cursor-pointer mt-2">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleCertificateChange}
                multiple
                className="hidden"
              />
              Upload Certificates
            </label>
            <p className="text-xs text-gray-500 mt-1">Accept images and PDFs, max 5MB each</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">About</label>
            <textarea
              name="about"
              value={profileData.about}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Brief description about yourself and your practice"
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.keys(profileData.workingDays).map((day) => (
                <div key={day} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`day-${day}`}
                    name={`workingDays.${day}`}
                    checked={profileData.workingDays[day]}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor={`day-${day}`} className="ml-2 block text-sm text-gray-700 capitalize">
                    {day}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="change-password"
              checked={changePassword}
              onChange={() => setChangePassword(!changePassword)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="change-password" className="ml-2 block text-lg font-medium text-gray-700">
              Change Password
            </label>
          </div>
          
          {changePassword && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <PasswordInput
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required={changePassword}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required={changePassword}
                  placeholder="Enter new password (min 6 characters)"
                  autoComplete="new-password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required={changePassword}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-primary text-white py-2 px-6 rounded-md hover:bg-primary-dark transition-colors"
            disabled={updating || uploadingPhoto || uploadingCertificates}
          >
            {updating ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DoctorProfile; 