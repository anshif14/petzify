import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { app } from '../../../firebase/config';
import PasswordInput from '../../common/PasswordInput';

const DoctorProfile = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [docId, setDocId] = useState('');
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
    }
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [changePassword, setChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

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
        setDocId(adminDoc.id);
        const adminData = adminDoc.data();
        
        // Check if profile info exists
        let profileInfo = adminData.profileInfo || {};
        
        // Set profile data
        setProfileData({
          name: adminData.name || '',
          email: adminData.email || '',
          phone: adminData.phone || '',
          specialization: profileInfo.specialization || '',
          experience: profileInfo.experience || '',
          qualifications: profileInfo.qualifications || '',
          about: profileInfo.about || '',
          consultationFee: profileInfo.consultationFee || '',
          workingDays: profileInfo.workingDays || {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false
          }
        });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!docId) {
      setErrorMessage('Doctor profile not found');
      return;
    }
    
    try {
      setUpdating(true);
      const db = getFirestore(app);
      const docRef = doc(db, 'admin', docId);
      
      // Get current document data
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        setErrorMessage('Doctor profile not found');
        setUpdating(false);
        return;
      }
      
      const currentData = docSnap.data();
      
      // Update profile data
      const updateData = {
        name: profileData.name,
        phone: profileData.phone,
        profileInfo: {
          specialization: profileData.specialization,
          experience: profileData.experience,
          qualifications: profileData.qualifications,
          about: profileData.about,
          consultationFee: profileData.consultationFee,
          workingDays: profileData.workingDays
        }
      };
      
      // If changing password, verify current password and update
      if (changePassword) {
        if (!validatePasswordChange()) {
          setUpdating(false);
          return;
        }
        
        // Verify current password
        if (currentData.password !== passwordData.currentPassword) {
          setErrorMessage('Current password is incorrect');
          setUpdating(false);
          return;
        }
        
        // Update password
        updateData.password = passwordData.newPassword;
      }
      
      await updateDoc(docRef, updateData);
      
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
            disabled={updating}
          >
            {updating ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DoctorProfile; 